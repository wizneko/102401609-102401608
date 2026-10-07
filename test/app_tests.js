const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const Utils = require('../js/utils.js');
const source = fs.readFileSync(path.join(__dirname, '../js/app.js'), 'utf8');
const validFile = { name: 'card.png', type: 'image/png', size: 100 };

function setup() {
  const fields = {};
  const readers = [];
  const images = [];
  const toasts = [];
  const saved = [];
  function element(id) {
    if (!fields[id]) {
      const classes = new Set(id === 'myPostsModal' ? ['hidden'] : []);
      fields[id] = {
        value: '', src: '', innerText: '', disabled: false,
        classList: {
          add: name => classes.add(name), remove: name => classes.delete(name),
          contains: name => classes.has(name)
        },
        removeAttribute(name) { this[name] = ''; }, reset() {}
      };
    }
    return fields[id];
  }
  const values = {
    formTitle: '测试校园卡', formCategory: '校园卡/证件', formLocation: '图书馆',
    formDate: Utils.formatLocalDate(), formDesc: '测试描述',
    formContactType: '微信', formContactVal: 'test_contact'
  };
  Object.entries(values).forEach(([id, value]) => { element(id).value = value; });
  const data = {
    addItem(payload) {
      const item = { ...payload, id: saved.length + 1 };
      saved.push(item);
      return item;
    },
    importItems() { return { success: true, count: 0 }; }
  };
  class Reader {
    constructor() { this.readyState = 0; readers.push(this); }
    readAsDataURL(file) { this.file = file; this.readyState = 1; }
    readAsText(file) { this.file = file; this.readyState = 1; }
    abort() { this.readyState = 2; if (this.onabort) this.onabort(); }
    finish(result = 'data:image/png;base64,VALID') {
      this.readyState = 2;
      this.onload({ target: { result } });
    }
  }
  class Picture {
    constructor() { this.naturalWidth = 10; this.naturalHeight = 10; images.push(this); }
  }
  const context = vm.createContext({
    document: { getElementById: element, querySelector: () => ({ value: 'lost' }), addEventListener() {} },
    Utils, DataManager: data, FileReader: Reader, Image: Picture, confirm: () => true
  });
  vm.runInContext(source + '\nthis.app = App;', context);
  const app = context.app;
  app.showToast = (message, type) => toasts.push({ message, type });
  app.setTypeFilter = () => {};
  app.uploadedImageBase64 = 'old-image';
  element('imagePreview').src = 'old-image';
  const input = { files: [validFile], value: 'card.png' };
  const submit = () => app.handlePublishSubmit({ preventDefault() {} });
  return { app, data, fields, element, input, readers, images, toasts, saved, submit, context };
}

const cases = [
  ['invalid file preserves old image', h => {
    h.input.files = [{ name: 'bad.svg', type: 'image/svg+xml', size: 100 }];
    h.app.handleImageUpload(h.input);
    assert.equal(h.readers.length, 0);
    assert.equal(h.app.uploadedImageBase64, 'old-image');
    assert.equal(h.input.value, '');
    assert.equal(h.toasts[0].type, 'error');
  }],
  ['oversized file is never read', h => {
    h.input.files = [{ ...validFile, size: 2 * 1024 * 1024 + 1 }];
    h.app.handleImageUpload(h.input);
    assert.equal(h.readers.length, 0);
    assert.equal(h.app.isImageLoading, false);
  }],
  ['preview changes only after image decoding', h => {
    h.app.handleImageUpload(h.input);
    assert.equal(h.element('publishSubmitButton').disabled, true);
    h.readers[0].finish();
    assert.equal(h.app.uploadedImageBase64, 'old-image');
    assert.equal(h.element('publishSubmitButton').disabled, true);
    h.images[0].onload();
    assert.equal(h.app.uploadedImageBase64, 'data:image/png;base64,VALID');
    assert.equal(h.element('publishSubmitButton').disabled, false);
  }],
  ['reader error preserves old image and enables retry', h => {
    h.app.handleImageUpload(h.input);
    h.readers[0].onerror();
    assert.equal(h.app.uploadedImageBase64, 'old-image');
    assert.equal(h.element('imagePreview').src, 'old-image');
    assert.equal(h.element('publishSubmitButton').disabled, false);
    assert.equal(h.toasts[0].type, 'error');
  }],
  ['decode error and zero dimensions are rejected', h => {
    h.app.handleImageUpload(h.input);
    h.readers[0].finish();
    h.images[0].onerror();
    h.app.handleImageUpload(h.input);
    h.readers[1].finish();
    h.images[1].naturalWidth = 0;
    h.images[1].onload();
    assert.equal(h.app.uploadedImageBase64, 'old-image');
    assert.equal(h.app.isImageLoading, false);
  }],
  ['older file read cannot replace a newer selection', h => {
    h.app.handleImageUpload(h.input);
    h.app.handleImageUpload(h.input);
    h.readers[0].finish('data:image/png;base64,OLD');
    assert.equal(h.images.length, 0);
    h.readers[1].finish('data:image/png;base64,NEW');
    h.images[0].onload();
    assert.equal(h.app.uploadedImageBase64, 'data:image/png;base64,NEW');
  }],
  ['removing an image cancels a pending decode', h => {
    h.app.handleImageUpload(h.input);
    h.readers[0].finish();
    h.app.removeUploadedImage();
    h.images[0].onload();
    assert.equal(h.app.uploadedImageBase64, '');
    assert.equal(h.element('imagePreview').src, '');
    assert.equal(h.element('imagePreviewBox').classList.contains('hidden'), true);
  }],
  ['closing the form prevents a late preview update', h => {
    h.app.handleImageUpload(h.input);
    h.readers[0].finish();
    h.app.closePublishModal();
    h.images[0].onload();
    assert.equal(h.app.uploadedImageBase64, '');
    assert.equal(h.element('publishModal').classList.contains('hidden'), true);
  }],
  ['synchronous reader failure releases loading state', h => {
    h.app.handleImageUpload(h.input);
    const prototype = Object.getPrototypeOf(h.readers[0]);
    prototype.readAsDataURL = () => { throw new Error('Cannot read'); };
    h.app.handleImageUpload(h.input);
    assert.equal(h.app.isImageLoading, false);
    assert.equal(h.element('publishSubmitButton').disabled, false);
  }],
  ['submitting during image reading does not save', h => {
    h.app.handleImageUpload(h.input);
    h.submit();
    assert.equal(h.saved.length, 0);
  }],
  ['two queued submissions create one record', h => {
    h.submit();
    h.submit();
    assert.equal(h.saved.length, 1);
    assert.equal(h.app.isSubmitting, false);
  }],
  ['failed save preserves input and permits retry', h => {
    const add = h.data.addItem;
    h.data.addItem = () => null;
    h.submit();
    assert.equal(h.app.isSubmitting, false);
    assert.equal(h.element('publishSubmitButton').disabled, false);
    assert.equal(h.element('formTitle').value, '测试校园卡');
    assert.equal(h.element('publishModal').classList.contains('hidden'), false);
    h.data.addItem = add;
    h.submit();
    assert.equal(h.saved.length, 1);
  }],
  ['unexpected save error releases the submission lock', h => {
    h.data.addItem = () => { throw new Error('Unexpected save error'); };
    assert.throws(h.submit, /Unexpected save error/);
    assert.equal(h.app.isSubmitting, false);
    assert.equal(h.element('publishSubmitButton').disabled, false);
  }],
  ['reentrant submission is blocked while saving', h => {
    const add = h.data.addItem;
    let calls = 0;
    h.data.addItem = payload => {
      calls++;
      assert.equal(h.element('publishSubmitButton').disabled, true);
      h.submit();
      return add(payload);
    };
    h.submit();
    assert.equal(calls, 1);
    assert.equal(h.saved.length, 1);
  }],
  ['invalid import never asks to replace existing data', h => {
    h.context.confirm = () => { throw new Error('Invalid backup must not confirm'); };
    h.input.files = [{ name: 'bad.json', size: 100 }];
    h.app.handleImportData(h.input);
    h.readers[0].finish('{}');
    assert.equal(h.toasts[0].type, 'error');
    assert.equal(h.app.isImporting, false);
    assert.equal(h.element('importBackupButton').disabled, false);
  }],
  ['cancelling import does not call storage', h => {
    h.context.confirm = () => false;
    h.data.importItems = () => { throw new Error('Cancelled import must not write'); };
    h.input.files = [{ name: 'empty.json', size: 2 }];
    h.app.handleImportData(h.input);
    h.readers[0].finish('[]');
    assert.equal(h.toasts.length, 0);
    assert.equal(h.app.isImporting, false);
  }],
  ['import reader error permits retry', h => {
    h.input.files = [{ name: 'backup.json', size: 100 }];
    h.app.handleImportData(h.input);
    h.readers[0].onerror();
    assert.equal(h.toasts[0].type, 'error');
    assert.equal(h.input.value, '');
    assert.equal(h.element('importBackupButton').disabled, false);
  }],
  ['import save failure does not refresh the list', h => {
    h.data.importItems = () => ({ success: false, message: '存储失败' });
    h.app.refresh = () => { throw new Error('Failed import must not refresh'); };
    h.input.files = [{ name: 'empty.json', size: 2 }];
    h.app.handleImportData(h.input);
    h.readers[0].finish('[]');
    assert.equal(h.toasts[0].message, '存储失败');
    assert.equal(h.toasts[0].type, 'error');
  }],
  ['confirmed valid import writes once and refreshes', h => {
    let writes = 0;
    let refreshes = 0;
    h.data.importItems = () => { writes++; return { success: true, count: 0 }; };
    h.app.refresh = () => { refreshes++; };
    h.input.files = [{ name: 'empty.json', size: 2 }];
    h.app.handleImportData(h.input);
    h.app.handleImportData(h.input);
    assert.equal(h.readers.length, 1);
    h.readers[0].finish('[]');
    assert.equal(writes, 1);
    assert.equal(refreshes, 1);
    assert.equal(h.toasts[0].type, 'success');
    assert.equal(h.app.isImporting, false);
  }],
  ['confirmed import closes publish and my posts modals', h => {
    let publishClosed = false;
    let myPostsClosed = false;
    h.app.returnToMyPosts = true;
    h.app.closePublishModal = () => { publishClosed = true; };
    h.app.closeMyPostsModal = () => { myPostsClosed = true; };
    h.input.files = [{ name: 'empty.json', size: 2 }];
    h.app.handleImportData(h.input);
    h.readers[0].finish('[]');
    assert.equal(publishClosed, true);
    assert.equal(myPostsClosed, true);
    assert.equal(h.app.returnToMyPosts, false);
  }]
];

let failed = 0;
for (const [name, run] of cases) {
  try {
    run(setup());
    console.log('PASS ' + name);
  } catch (error) {
    failed++;
    console.error('FAIL ' + name + ': ' + error.message);
  }
}
console.log(`${cases.length - failed}/${cases.length} application checks passed`);
process.exitCode = failed ? 1 : 0;
