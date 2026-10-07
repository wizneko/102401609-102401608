/**
 * app.js - 校园失物招领 Web 端核心交互控制器
 */

const App = {
  // 当前查询状态
  filters: {
    keyword: '',
    type: 'all',       // all, lost, found
    category: 'all',   // 全部分类
    location: 'all',   // 全部大区
    status: 'all'      // all, open, solved
  },

  currentDetailItem: null,
  uploadedImageBase64: '',
  editingItemId: null,
  returnToMyPosts: false,
  imageReadRequest: 0,
  imageReader: null,
  isImageLoading: false,
  isSubmitting: false,
  isImporting: false,

  /**
   * 应用初始化
   */
  init() {
    // 默认发布日期设为今天
    const today = Utils.formatLocalDate();
    const dateInput = document.getElementById('formDate');
    if (dateInput) {
      dateInput.value = today;
      dateInput.max = today;
    }

    // 点击页面其他区域自动收起测试工具下拉
    document.addEventListener('click', (e) => {
      const dropdown = document.getElementById('testDropdown');
      if (dropdown && !dropdown.contains(e.target) && !e.target.closest('button[onclick*="toggleTestingDropdown"]')) {
        dropdown.classList.add('hidden');
      }
    });

    // 渲染网格与初始状态
    this.refresh();
  },

  /**
   * 刷新界面列表与统计计数
   */
  refresh() {
    const allItems = DataManager.getItems();
    this.renderGrid(allItems);
    this.updateHeaderStats(allItems);
  },

  /**
   * 渲染物品卡片瀑布流网格
   */
  renderGrid(allItems) {
    const grid = document.getElementById('itemsGrid');
    const emptyState = document.getElementById('emptyState');
    const displayCount = document.getElementById('displayCount');

    // 多条件联合筛选
    const filtered = Utils.filterItems(allItems, this.filters);

    if (displayCount) displayCount.innerText = filtered.length;

    if (filtered.length === 0) {
      grid.innerHTML = '';
      emptyState.classList.remove('hidden');
      return;
    }

    emptyState.classList.add('hidden');
    grid.innerHTML = filtered.map(item => this.createCardHtml(item)).join('');
  },

  /**
   * 构建单张物品卡片 HTML
   */
  createCardHtml(item) {
    const isSolved = item.status === 'solved';
    const isLost = item.type === 'lost';

    // 状态与类型徽章
    let statusBadgeHtml = '';
    if (isSolved) {
      statusBadgeHtml = `<span class="badge-solved text-[11px] px-2.5 py-0.5 rounded-full font-medium flex items-center gap-1"><i class="fa-solid fa-check text-[10px]"></i>已解决</span>`;
    } else if (isLost) {
      statusBadgeHtml = `<span class="badge-lost text-[11px] px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>寻找中</span>`;
    } else {
      statusBadgeHtml = `<span class="badge-found text-[11px] px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>招领中</span>`;
    }

    const typeBadge = isLost
      ? `<span class="bg-rose-50 text-rose-600 text-[10px] font-bold px-2 py-0.5 rounded-md border border-rose-200">寻物</span>`
      : `<span class="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-md border border-emerald-200">招领</span>`;

    // 关键词高亮
    const highlightedTitle = Utils.highlightKeyword(item.title, this.filters.keyword);
    const highlightedLocation = Utils.highlightKeyword(item.location, this.filters.keyword);

    // 相对时间展示
    const timeText = Utils.timeAgo(item.timestamp || item.date);

    // 默认或预设实物图片
    const imgSrc = item.img || 'assets/water-bottle.svg';

    return `
      <div onclick="App.openDetail(${item.id})" class="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-sm card-hover flex flex-col justify-between cursor-pointer space-y-3">
        <!-- 卡片主体上部 -->
        <div class="space-y-3">
          <!-- 图片与顶部状态条 -->
          <div class="relative h-44 rounded-2xl overflow-hidden bg-slate-100 img-placeholder">
            <img src="${imgSrc}" loading="lazy" alt="${Utils.escapeHtml(item.title)}" class="w-full h-full object-cover">
            <div class="absolute top-3 left-3 flex items-center gap-1.5">
              ${typeBadge}
              <span class="bg-black/50 text-white backdrop-blur-md text-[10px] px-2 py-0.5 rounded-md font-medium">${Utils.escapeHtml(item.category)}</span>
            </div>
            <div class="absolute top-3 right-3">
              ${statusBadgeHtml}
            </div>
          </div>

          <!-- 标题与地点 -->
          <div>
            <h3 class="font-bold text-sm text-slate-800 line-clamp-1 hover:text-emerald-700 transition" title="${Utils.escapeHtml(item.title)}">
              ${highlightedTitle}
            </h3>
            <div class="text-xs text-slate-500 mt-1.5 flex items-center gap-1 line-clamp-1">
              <i class="fa-solid fa-location-dot text-rose-500 text-[11px] shrink-0"></i>
              <span class="truncate">${highlightedLocation}</span>
            </div>
          </div>
        </div>

        <!-- 卡片底部信息 -->
        <div class="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
          <div class="flex items-center gap-1.5 truncate">
            <i class="fa-regular fa-clock text-[11px]"></i>
            <span>${timeText}</span>
          </div>

          <div class="flex items-center gap-2">
            ${item.isMine && !isSolved ? `
              <button onclick="event.stopPropagation(); App.markItemSolved(${item.id})" class="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg font-semibold text-[11px] transition">
                <i class="fa-solid fa-check mr-0.5"></i>设为解决
              </button>
            ` : ''}
            <span class="text-emerald-600 font-semibold flex items-center hover:translate-x-0.5 transition text-[11px]">
              查看详情 <i class="fa-solid fa-chevron-right text-[9px] ml-0.5"></i>
            </span>
          </div>
        </div>
      </div>
    `;
  },

  /**
   * 搜索框实时输入响应
   */
  onSearchInput(val) {
    this.filters.keyword = val;
    const clearBtn = document.getElementById('clearSearchBtn');
    if (clearBtn) {
      if (val.trim()) {
        clearBtn.classList.remove('hidden');
      } else {
        clearBtn.classList.add('hidden');
      }
    }
    this.refresh();
  },

  /**
   * 清空搜索框
   */
  clearSearch() {
    const input = document.getElementById('searchInput');
    if (input) input.value = '';
    this.onSearchInput('');
  },

  /**
   * 快捷搜索标签
   */
  quickSearch(word) {
    const input = document.getElementById('searchInput');
    if (input) input.value = word;
    this.onSearchInput(word);
    input.focus();
  },

  /**
   * 主类型筛选切换（全部 / 寻物 / 招领）
   */
  setTypeFilter(type) {
    this.filters.type = type;
    const tabAll = document.getElementById('tabTypeAll');
    const tabLost = document.getElementById('tabTypeLost');
    const tabFound = document.getElementById('tabTypeFound');

    [tabAll, tabLost, tabFound].forEach(btn => {
      btn.className = 'px-3.5 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 transition flex items-center gap-1 font-medium';
    });

    if (type === 'all') {
      tabAll.className = 'px-3.5 py-1.5 rounded-lg bg-white text-emerald-700 shadow-sm font-semibold transition';
    } else if (type === 'lost') {
      tabLost.className = 'px-3.5 py-1.5 rounded-lg bg-white text-rose-600 shadow-sm font-semibold transition flex items-center gap-1';
    } else if (type === 'found') {
      tabFound.className = 'px-3.5 py-1.5 rounded-lg bg-white text-emerald-700 shadow-sm font-semibold transition flex items-center gap-1';
    }

    this.refresh();
  },

  onCategoryChange(cat) {
    this.filters.category = cat;
    this.refresh();
  },

  onLocationChange(loc) {
    this.filters.location = loc;
    this.refresh();
  },

  onStatusChange(st) {
    this.filters.status = st;
    this.refresh();
  },

  /**
   * 重置全部筛选条件
   */
  resetFilters() {
    this.filters = {
      keyword: '',
      type: 'all',
      category: 'all',
      location: 'all',
      status: 'all'
    };
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = '';
    const clearBtn = document.getElementById('clearSearchBtn');
    if (clearBtn) clearBtn.classList.add('hidden');

    const selectCat = document.getElementById('selectCategory');
    if (selectCat) selectCat.value = 'all';

    const selectLoc = document.getElementById('selectLocation');
    if (selectLoc) selectLoc.value = 'all';

    const selectSt = document.getElementById('selectStatus');
    if (selectSt) selectSt.value = 'all';

    this.setTypeFilter('all');
    this.showToast('已重置全部搜索与筛选条件', 'info');
  },

  /**
   * 打开物品详情模态弹窗
   */
  openDetail(id) {
    const item = DataManager.getItemById(id);
    if (!item) return;

    this.currentDetailItem = item;

    document.getElementById('detailTitle').innerText = item.title;
    document.getElementById('detailImg').src = item.img || 'assets/water-bottle.svg';
    document.getElementById('detailCategoryBadge').innerText = item.category;
    document.getElementById('detailLocation').innerText = item.location;
    document.getElementById('detailDate').innerText = item.date;
    document.getElementById('detailTimeAgo').innerText = Utils.timeAgo(item.timestamp || item.date);
    document.getElementById('detailDesc').innerText = item.desc || '发布人未填写详细补充描述。';
    document.getElementById('detailContactType').innerText = item.contactType;
    document.getElementById('detailContactVal').innerText = item.contactVal;
    document.getElementById('detailPublisher').innerText = '发布者：' + (item.publisherName || '校内同学');

    // 类型徽章
    const typeBadge = document.getElementById('detailTypeBadge');
    if (item.type === 'lost') {
      typeBadge.innerText = '寻物启事 (找失物)';
      typeBadge.className = 'px-3 py-1 rounded-full text-xs font-bold text-white bg-rose-600 shadow';
    } else {
      typeBadge.innerText = '失物招领 (找失主)';
      typeBadge.className = 'px-3 py-1 rounded-full text-xs font-bold text-white bg-emerald-600 shadow';
    }

    // 状态徽章与状态文本
    const statusBadge = document.getElementById('detailStatusBadge');
    const statusText = document.getElementById('detailStatusText');
    if (item.status === 'solved') {
      statusBadge.innerText = '已解决 (结贴)';
      statusBadge.className = 'px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-200 text-slate-700 shadow';
      statusText.innerText = '已成功找回 / 已归还原主（信息已结贴）';
      statusText.className = 'font-bold text-slate-500';
    } else {
      statusBadge.innerText = '进行中';
      statusBadge.className = 'px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 shadow';
      statusText.innerText = item.type === 'lost' ? '寻找中（尚未找回）' : '招领中（等待失主认领）';
      statusText.className = 'font-bold text-emerald-600';
    }

    // 动态底部按钮区域
    const footer = document.getElementById('detailActionFooter');
    if (item.isMine) {
      if (item.status === 'solved') {
        footer.innerHTML = `
          <button disabled class="flex-1 py-2.5 bg-slate-100 text-slate-400 font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-not-allowed">
            <i class="fa-solid fa-circle-check"></i> 该条信息已标记完成
          </button>
          <button onclick="App.handleDeleteItem(${item.id})" class="px-3.5 py-2.5 border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-xl font-semibold text-xs transition">
            删除
          </button>
        `;
      } else {
        footer.innerHTML = `
          <button onclick="App.markItemSolved(${item.id})" class="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-semibold rounded-xl text-xs shadow-md shadow-emerald-200 transition flex items-center justify-center gap-1.5">
            <i class="fa-solid fa-check-double"></i> 我已找回/归还（标记为解决）
          </button>
          <button onclick="App.handleDeleteItem(${item.id})" class="px-3.5 py-2.5 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl font-semibold text-xs transition">
            删除记录
          </button>
        `;
      }
    } else {
      footer.innerHTML = `
        <button onclick="App.copyCurrentContact()" class="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-semibold rounded-xl text-xs shadow-md shadow-emerald-200 transition flex items-center justify-center gap-1.5">
          <i class="fa-regular fa-copy"></i> 复制发布人联系方式 (${item.contactType})
        </button>
        <button onclick="App.shareItem(${item.id})" class="px-4 py-2.5 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl font-semibold text-xs transition flex items-center gap-1.5">
          <i class="fa-solid fa-share-nodes"></i> 分享
        </button>
      `;
    }

    document.getElementById('detailModal').classList.remove('hidden');
  },

  closeDetailModal() {
    document.getElementById('detailModal').classList.add('hidden');
    this.currentDetailItem = null;
  },

  /**
   * 复制当前详情页联系方式
   */
  copyCurrentContact() {
    if (!this.currentDetailItem) return;
    const val = this.currentDetailItem.contactVal;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(val).then(() => {
        this.showToast(`已成功复制${this.currentDetailItem.contactType}：${val}`, 'success');
      }).catch(() => {
        this.fallbackCopy(val);
      });
    } else {
      this.fallbackCopy(val);
    }
  },

  fallbackCopy(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      this.showToast(`已复制：${text}`, 'success');
    } catch (e) {
      this.showToast(`请手动复制：${text}`, 'info');
    }
    document.body.removeChild(textarea);
  },

  shareItem(id) {
    const shareText = `【校园失物招领】${this.currentDetailItem ? this.currentDetailItem.title : '发现一件失物/招领'}`;
    this.fallbackCopy(shareText + ' - 请在校园失物招领平台查看详情！');
  },

  /**
   * 标记物品状态为解决
   */
  markItemSolved(id) {
    const success = DataManager.updateItemStatus(id, 'solved');
    if (!success) {
      this.showToast('标记失败，记录可能已失效或浏览器无法保存数据', 'error');
      return;
    }
    if (success) {
      this.showToast('🎉 已成功将该信息标记为“已解决/已归还”！', 'success');
      this.refresh();
      // 如果当前正开着详情模态框，同步刷新详情
      if (this.currentDetailItem && this.currentDetailItem.id === id) {
        this.openDetail(id);
      }
      // 如果正开着我的发布，同步刷新
      if (!document.getElementById('myPostsModal').classList.contains('hidden')) {
        this.renderMyPosts();
      }
    }
  },

  handleDeleteItem(id) {
    if (confirm('确定要删除这条发布记录吗？')) {
      if (!DataManager.deleteItem(id)) {
        this.showToast('删除失败，记录可能已失效或浏览器无法保存数据', 'error');
        return;
      }
      this.showToast('已删除该条记录', 'info');
      this.closeDetailModal();
      this.refresh();
      if (!document.getElementById('myPostsModal').classList.contains('hidden')) {
        this.renderMyPosts();
      }
    }
  },

  /**
   * 打开与关闭发布模态框
   */
  openPublishModal(editingItemId = null) {
    document.getElementById('publishForm').reset();
    this.removeUploadedImage();
    this.onFormTypeChange('lost');
    document.getElementById('formDate').value = Utils.formatLocalDate();
    document.getElementById('formDate').max = Utils.formatLocalDate();
    this.editingItemId = editingItemId;
    const editingItem = editingItemId ? DataManager.getItemById(editingItemId) : null;
    if (editingItemId && (!editingItem || !editingItem.isMine)) {
      this.showToast('只能编辑自己发布的信息', 'info');
      this.editingItemId = null;
      return;
    }

    document.getElementById('publishModal').classList.remove('hidden');
    document.getElementById('formErrorNotice').classList.add('hidden');

    const title = document.getElementById('publishModalTitle');
    if (title) title.innerText = editingItem ? '编辑失物 / 招领信息' : '发布失物 / 招领信息';
    this.updatePublishButton();

    if (editingItem) {
      const typeRadio = document.querySelector(`input[name="formType"][value="${editingItem.type}"]`);
      if (typeRadio) typeRadio.checked = true;
      document.getElementById('formTitle').value = editingItem.title || '';
      document.getElementById('formCategory').value = editingItem.category || '其他物品';
      document.getElementById('formDate').value = editingItem.date || '';
      document.getElementById('formLocation').value = editingItem.location || '';
      document.getElementById('formDesc').value = editingItem.desc || '';
      document.getElementById('formContactType').value = editingItem.contactType || '微信';
      document.getElementById('formContactVal').value = editingItem.contactVal || '';
      this.uploadedImageBase64 = editingItem.img || '';
      if (editingItem.img) {
        document.getElementById('imagePreview').src = editingItem.img;
        document.getElementById('imagePreviewBox').classList.remove('hidden');
      }
      this.onFormTypeChange(editingItem.type);
    }
  },

  closePublishModal() {
    const returnToMyPosts = this.returnToMyPosts;
    this.returnToMyPosts = false;
    document.getElementById('publishModal').classList.add('hidden');
    document.getElementById('publishForm').reset();
    this.removeUploadedImage();
    this.editingItemId = null;
    this.isSubmitting = false;
    this.updatePublishButton();
    const title = document.getElementById('publishModalTitle');
    const submitLabel = document.getElementById('publishSubmitLabel');
    if (title) title.innerText = '发布失物 / 招领信息';
    if (submitLabel) submitLabel.innerText = '确认发布';
    const today = Utils.formatLocalDate();
    document.getElementById('formDate').value = today;
    document.getElementById('formDate').max = today;
    this.onFormTypeChange('lost');
    if (returnToMyPosts) this.openMyPostsModal();
  },

  onFormTypeChange(type) {
    const locLabel = document.getElementById('formLocationLabel');
    const dateLabel = document.getElementById('formDateLabel');
    if (type === 'lost') {
      locLabel.innerHTML = '遗失地点 <span class="text-rose-500">*</span>';
      dateLabel.innerHTML = '遗失日期 <span class="text-rose-500">*</span>';
    } else {
      locLabel.innerHTML = '拾获地点 <span class="text-rose-500">*</span>';
      dateLabel.innerHTML = '拾获日期 <span class="text-rose-500">*</span>';
    }
  },

  /**
   * 处理本地实物图片上传并转 Base64 存储
   */
  handleImageUpload(input) {
    this.cancelImageRead();
    const file = input.files && input.files[0];
    if (!file) return;
    const validation = Utils.validateImageFile(file);
    if (!validation.isValid) {
      input.value = '';
      this.showToast(validation.message, 'error');
      return;
    }

    const request = this.imageReadRequest;
    this.isImageLoading = true;
    this.updatePublishButton();
    const fail = () => {
      if (request !== this.imageReadRequest) return;
      this.imageReadRequest++;
      this.imageReader = null;
      this.isImageLoading = false;
      input.value = '';
      this.updatePublishButton();
      this.showToast('图片读取失败或内容损坏，请重新选择；原图片未更改', 'error');
    };
    try {
      const reader = new FileReader();
      this.imageReader = reader;
      reader.onerror = fail;
      reader.onabort = fail;
      reader.onload = (e) => {
        if (request !== this.imageReadRequest) return;
        const result = e.target.result;
        if (typeof result !== 'string' || !result.startsWith('data:image/')) {
          fail();
          return;
        }
        try {
          const image = new Image();
          image.onerror = fail;
          image.onload = () => {
            if (request !== this.imageReadRequest) return;
            if (!image.naturalWidth || !image.naturalHeight) { fail(); return; }
            this.uploadedImageBase64 = result;
            document.getElementById('imagePreview').src = result;
            document.getElementById('imagePreviewBox').classList.remove('hidden');
            this.imageReadRequest++;
            this.imageReader = null;
            this.isImageLoading = false;
            this.updatePublishButton();
          };
          image.src = result;
        } catch (error) {
          fail();
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      fail();
    }
  },

  cancelImageRead() {
    this.imageReadRequest++;
    const reader = this.imageReader;
    this.imageReader = null;
    this.isImageLoading = false;
    if (reader && reader.readyState === 1) reader.abort();
    this.updatePublishButton();
  },

  updatePublishButton() {
    const button = document.getElementById('publishSubmitButton');
    const label = document.getElementById('publishSubmitLabel');
    if (button) button.disabled = this.isSubmitting || this.isImageLoading;
    if (label) label.innerText = this.isSubmitting ? '正在保存…' :
      this.isImageLoading ? '正在读取图片…' : this.editingItemId ? '保存修改' : '确认发布';
  },

  removeUploadedImage() {
    this.cancelImageRead();
    this.uploadedImageBase64 = '';
    const preview = document.getElementById('imagePreview');
    if (preview) preview.removeAttribute('src');
    const fileInput = document.getElementById('formImageFile');
    if (fileInput) fileInput.value = '';
    const box = document.getElementById('imagePreviewBox');
    if (box) box.classList.add('hidden');
  },

  /**
   * 发布表单提交处理
   */
  handlePublishSubmit(e) {
    e.preventDefault();
    if (this.isSubmitting || this.isImageLoading ||
        document.getElementById('publishModal').classList.contains('hidden')) return;

    const typeRadio = document.querySelector('input[name="formType"]:checked');
    const type = typeRadio ? typeRadio.value : 'lost';

    const title = document.getElementById('formTitle').value;
    const category = document.getElementById('formCategory').value;
    const location = document.getElementById('formLocation').value;
    const date = document.getElementById('formDate').value;
    const desc = document.getElementById('formDesc').value;
    const contactType = document.getElementById('formContactType').value;
    const contactVal = document.getElementById('formContactVal').value;

    const itemPayload = {
      type,
      title,
      category,
      location,
      date,
      desc,
      contactType,
      contactVal,
      img: this.uploadedImageBase64
    };

    // 白盒严格校验
    const validation = Utils.validateItem(itemPayload);
    const errorNotice = document.getElementById('formErrorNotice');

    if (!validation.isValid) {
      errorNotice.innerHTML = `<strong>提交失败：</strong><ul class="list-disc pl-4 mt-1">${validation.errors.map(err => `<li>${err}</li>`).join('')}</ul>`;
      errorNotice.classList.remove('hidden');
      return;
    }

    errorNotice.classList.add('hidden');
    this.isSubmitting = true;
    this.updatePublishButton();
    try {
      const wasEditing = Boolean(this.editingItemId);
      let updatedItem;
      if (wasEditing) {
        const updated = DataManager.updateItem(this.editingItemId, itemPayload);
        if (!updated) {
          this.showToast('保存失败，请稍后重试', 'error');
          return;
        }
        updatedItem = DataManager.getItemById(this.editingItemId);
        this.showToast('修改成功，信息已更新', 'success');
      } else {
        itemPayload.img = itemPayload.img || this.getDefaultImageForCategory(category);
        itemPayload.publisherName = '我发布的';
        updatedItem = DataManager.addItem(itemPayload);
        if (!updatedItem) {
          this.showToast('发布失败，浏览器存储空间可能不足，请减少图片大小后重试', 'error');
          return;
        }
        this.showToast('🎉 发布成功！已在首页最上方置顶显示', 'success');
      }

      this.closePublishModal();

      // 切换到对应 Tab 并刷新
      this.setTypeFilter(updatedItem.type);
      if (wasEditing && this.currentDetailItem && this.currentDetailItem.id === updatedItem.id) {
        this.openDetail(updatedItem.id);
      }
      if (!document.getElementById('myPostsModal').classList.contains('hidden')) {
        this.renderMyPosts();
      }
    } finally {
      this.isSubmitting = false;
      this.updatePublishButton();
    }
  },

  /**
   * 根据物品分类指派高质量示例占位图
   */
  getDefaultImageForCategory(category) {
    const map = {
      '校园卡/证件': 'assets/student-card.svg',
      '数码电子': 'assets/airpods.svg',
      '书籍文具': 'assets/math-book.svg',
      '生活钥匙': 'assets/keys.svg',
      '其他物品': 'assets/water-bottle.svg'
    };
    return map[category] || map['其他物品'];
  },

  /**
   * 我的发布管理模态框
   */
  openMyPostsModal() {
    this.renderMyPosts();
    document.getElementById('myPostsModal').classList.remove('hidden');
  },

  openEditModal(id) {
    const item = DataManager.getItemById(id);
    if (!item || !item.isMine) {
      this.showToast('只能编辑自己发布的信息', 'info');
      return;
    }
    this.closeMyPostsModal();
    this.returnToMyPosts = true;
    this.openPublishModal(id);
  },

  closeMyPostsModal() {
    document.getElementById('myPostsModal').classList.add('hidden');
  },

  renderMyPosts() {
    const all = DataManager.getItems();
    const myItems = all.filter(it => it.isMine);

    document.getElementById('myTotalCount').innerText = myItems.length;
    document.getElementById('myOpenCount').innerText = myItems.filter(it => it.status === 'open').length;
    document.getElementById('mySolvedCount').innerText = myItems.filter(it => it.status === 'solved').length;

    const list = document.getElementById('myPostsList');
    if (myItems.length === 0) {
      list.innerHTML = `
        <div class="text-center py-8 text-slate-400">
          <p>您当前还没有发布过失物招领信息</p>
        </div>
      `;
      return;
    }

    list.innerHTML = myItems.map(item => `
      <div class="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3">
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <span class="text-[10px] font-bold px-1.5 py-0.5 rounded ${item.type === 'lost' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}">
              ${item.type === 'lost' ? '寻物' : '招领'}
            </span>
            <h4 class="font-bold text-xs text-slate-800 truncate">${Utils.escapeHtml(item.title)}</h4>
            <span class="text-[10px] px-2 py-0.2 rounded-full ${item.status === 'solved' ? 'bg-slate-200 text-slate-600' : 'bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold'}">
              ${item.status === 'solved' ? '已结贴' : '进行中'}
            </span>
          </div>
          <div class="text-[11px] text-slate-400 mt-1 flex items-center gap-2">
            <span>${Utils.escapeHtml(item.location)}</span>
            <span>·</span>
            <span>${Utils.timeAgo(item.timestamp || item.date)}</span>
          </div>
        </div>

        <div class="flex items-center gap-1.5 shrink-0">
          <button onclick="App.openDetail(${item.id})" class="px-2.5 py-1 text-slate-600 hover:text-emerald-700 font-semibold hover:bg-white rounded-lg transition">
            查看
          </button>
          <button onclick="App.openEditModal(${item.id})" class="px-2.5 py-1 text-blue-600 hover:text-blue-700 hover:bg-white rounded-lg transition font-semibold">
            编辑
          </button>
          ${item.status !== 'solved' ? `
            <button onclick="App.markItemSolved(${item.id})" class="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold transition text-xs shadow-sm">
              标记已解决
            </button>
          ` : ''}
          <button onclick="App.handleDeleteItem(${item.id})" class="px-2 py-1 text-slate-400 hover:text-rose-600 rounded-lg transition" title="删除">
            <i class="fa-regular fa-trash-can"></i>
          </button>
        </div>
      </div>
    `).join('');
  },

  updateHeaderStats(allItems) {
    const myCount = allItems.filter(it => it.isMine).length;
    const headerBadge = document.getElementById('headerMyCount');
    if (headerBadge) headerBadge.innerText = myCount;
  },

  toggleTestingDropdown() {
    const dropdown = document.getElementById('testDropdown');
    if (dropdown) dropdown.classList.toggle('hidden');
  },

  handleResetData() {
    if (confirm('确定要将数据重置为初始的福州大学精选校园测试数据吗？已发布的数据将被清空重置。')) {
      if (!DataManager.resetToDefault()) {
        this.showToast('重置失败，浏览器无法保存数据，原记录未更改', 'error');
        return;
      }
      this.refresh();
      this.showToast('✅ 已恢复为初始预设测试数据！', 'success');
      this.toggleTestingDropdown();
    }
  },

  handleExportData() {
    const all = DataManager.getItems();
    const jsonStr = Utils.exportToJson(all);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `campus_lost_found_backup_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    this.showToast('已导出当前数据为 JSON 文件！', 'success');
    this.toggleTestingDropdown();
  },

  handleImportData(input) {
    if (this.isImporting) return;
    const file = input.files && input.files[0];
    if (!file) return;
    if (!/\.json$/i.test(file.name) || file.size <= 0 || file.size > 10 * 1024 * 1024) {
      input.value = '';
      this.showToast('请选择非空且不超过 10MB 的 JSON 备份文件', 'error');
      return;
    }
    this.isImporting = true;
    const button = document.getElementById('importBackupButton');
    if (button) button.disabled = true;
    const finish = () => {
      this.isImporting = false;
      input.value = '';
      if (button) button.disabled = false;
    };
    try {
      const reader = new FileReader();
      reader.onerror = reader.onabort = () => {
        this.showToast('备份文件读取失败，请重新选择；原数据未更改', 'error');
        finish();
      };
      reader.onload = event => {
        try {
          const text = event.target.result;
          const validation = Utils.parseImportData(text);
          if (!validation.success) {
            this.showToast(validation.message, 'error');
            return;
          }
          if (!confirm(`备份包含 ${validation.data.length} 条记录，导入将替换当前浏览器中的全部记录。建议先导出备份。确定导入吗？`)) return;
          const result = DataManager.importItems(text);
          if (!result.success) {
            this.showToast(result.message, 'error');
            return;
          }
          // 清理可能由“编辑我的发布”留下的返回标记，避免关闭发布框时重新打开旧弹窗。
          this.returnToMyPosts = false;
          this.closePublishModal();
          this.closeDetailModal();
          this.closeMyPostsModal();
          this.refresh();
          document.getElementById('testDropdown').classList.add('hidden');
          this.showToast(`已导入 ${result.count} 条记录`, 'success');
        } catch (error) {
          this.showToast('导入处理失败，请重新选择备份并检查当前数据', 'error');
        } finally {
          finish();
        }
      };
      reader.readAsText(file, 'UTF-8');
    } catch (error) {
      this.showToast('备份文件读取失败，请重新选择；原数据未更改', 'error');
      finish();
    }
  },

  /**
   * 全局 Toast 提示
   */
  showToast(msg, type = 'success') {
    const toast = document.getElementById('toast');
    const icon = document.getElementById('toastIcon');
    const text = document.getElementById('toastMsg');

    text.innerText = msg;

    if (type === 'success') {
      icon.className = 'fa-solid fa-circle-check text-emerald-400 text-sm';
    } else if (type === 'info') {
      icon.className = 'fa-solid fa-circle-info text-blue-400 text-sm';
    } else {
      icon.className = 'fa-solid fa-triangle-exclamation text-amber-400 text-sm';
    }

    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 2200);
  }
};

// 页面加载完成后启动
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
