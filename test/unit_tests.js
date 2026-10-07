/**
 * unit_tests.js - 校园失物招领单元测试用例集
 * 覆盖表单校验、多维检索、发布管理与存储异常。
 */

const UnitTests = [
  {
    name: '测试用例 1: 正常寻物启事数据格式完整校验通过',
    category: '输入校验 (validateItem)',
    description: '验证当提供合规的寻物信息（标题、分类、地点、有效日期、微信联系方式）时，校验器返回 isValid=true 且错误列表为空。',
    testFn(assert) {
      const validItem = {
        type: 'lost',
        title: '黑色雨伞',
        category: '生活钥匙',
        location: '西三教学楼201教室',
        date: '2026-10-02',
        contactType: '微信',
        contactVal: 'fzu_student_test'
      };
      const result = Utils.validateItem(validItem);
      assert.isTrue(result.isValid, '正常数据应该通过校验');
      assert.strictEqual(result.errors.length, 0, '错误列表应为空');
    }
  },

  {
    name: '测试用例 2: 物品名称为空或仅含空白符边界拦截',
    category: '边界值测试 (validateItem)',
    description: '针对测试人员输入空字符串或全空格标题的刁难测试，应被正确拦截。',
    testFn(assert) {
      const emptyTitleItem = {
        type: 'lost',
        title: '    ',
        category: '数码电子',
        location: '图书馆西区',
        date: '2026-10-02',
        contactType: '微信',
        contactVal: 'test_id'
      };
      const result = Utils.validateItem(emptyTitleItem);
      assert.isFalse(result.isValid, '全空白标题应无法通过校验');
      assert.isTrue(result.errors.some(e => e.includes('物品名称不能为空')), '应包含名称为空的错误信息');
    }
  },

  {
    name: '测试用例 3: 物品名称超长边界（超过40字）拦截',
    category: '边界值测试 (validateItem)',
    description: '测试人员故意粘贴超长字符串（45个字符），系统应拦截并提示超长，防止数据库溢出或破坏UI。',
    testFn(assert) {
      const longTitle = '这是一段故意构造的超级长长长长长长长长长长长长长长长长长长长长长长长长长长的物品名称测试字符串';
      const item = {
        type: 'found',
        title: longTitle,
        category: '校园卡/证件',
        location: '一区食堂',
        date: '2026-10-02',
        contactType: '微信',
        contactVal: 'test_id'
      };
      const result = Utils.validateItem(item);
      assert.isFalse(result.isValid, '超过40字的标题应拦截');
      assert.isTrue(result.errors.some(e => e.includes('不能超过40个字符')), '应提示长度超限');
    }
  },

  {
    name: '测试用例 4: 手机号码格式异常拦截（防乱填纯字母/非11位）',
    category: '数据类型合规测试 (validateItem)',
    description: '当选择联系方式为“手机号”时，输入格式错误（如包含字母或少于11位），必须提示手机号不合规。',
    testFn(assert) {
      const invalidPhoneItem = {
        type: 'lost',
        title: '丢失高数课本',
        category: '书籍文具',
        location: '文科楼',
        date: '2026-10-02',
        contactType: '手机号',
        contactVal: '1388888abcd' // 包含非数字
      };
      const result = Utils.validateItem(invalidPhoneItem);
      assert.isFalse(result.isValid, '包含字母的手机号应校验失败');
      assert.isTrue(result.errors.some(e => e.includes('手机号码格式不正确')), '应指出手机号码不合法');
    }
  },

  {
    name: '测试用例 5: QQ 号码非纯数字与长度边界测试',
    category: '数据类型合规测试 (validateItem)',
    description: 'QQ 号必须为 5~12 位数字，测试人员输入过短账号（如 123）时应被正确捕获。',
    testFn(assert) {
      const shortQQItem = {
        type: 'found',
        title: '捡到钥匙',
        category: '生活钥匙',
        location: '风雨操场',
        date: '2026-10-02',
        contactType: 'QQ',
        contactVal: '123' // 过短
      };
      const result = Utils.validateItem(shortQQItem);
      assert.isFalse(result.isValid, '过短 QQ 应校验失败');
      assert.isTrue(result.errors.some(e => e.includes('5~12位纯数字')), '应提示QQ号长度规则');
    }
  },

  {
    name: '测试用例 6: 关键词模糊匹配检索（大小写不敏感与去空格）',
    category: '检索功能测试 (filterItems)',
    description: '测试当输入大写或带空格的关键词时，例如 “ airpods ”，能否精准匹配到包含“AirPods Pro”的耳机条目。',
    testFn(assert) {
      const mockList = [
        { id: 1, title: '遗落AirPods Pro耳机', desc: '黄色保护壳', location: '图书馆', type: 'lost', category: '数码电子', status: 'open' },
        { id: 2, title: '捡到学生卡', desc: '计算机学院', location: '一区食堂', type: 'found', category: '校园卡/证件', status: 'open' },
        { id: 3, title: '黑色折叠雨伞', desc: '小熊挂件', location: '西三教室', type: 'found', category: '生活钥匙', status: 'solved' }
      ];
      const matched = Utils.filterItems(mockList, { keyword: '  airpods  ' });
      assert.strictEqual(matched.length, 1, '应精准匹配到 1 条结果');
      assert.strictEqual(matched[0].id, 1, '匹配到的物品 ID 应为 1');
    }
  },

  {
    name: '测试用例 7: 多维度组合筛选（类型+分类+状态复合条件）',
    category: '逻辑组合测试 (filterItems)',
    description: '同时筛选：type=found(招领) + category=生活钥匙 + status=solved(已结贴)，验证复合条件逻辑“与”关系的准确性。',
    testFn(assert) {
      const mockList = [
        { id: 1, title: '捡到钥匙A', type: 'found', category: '生活钥匙', status: 'solved', location: '操场' },
        { id: 2, title: '捡到钥匙B', type: 'found', category: '生活钥匙', status: 'open', location: '食堂' },
        { id: 3, title: '丢失钥匙C', type: 'lost', category: '生活钥匙', status: 'solved', location: '教学楼' },
        { id: 4, title: '捡到学生卡', type: 'found', category: '校园卡/证件', status: 'solved', location: '图书馆' }
      ];
      const matched = Utils.filterItems(mockList, {
        type: 'found',
        category: '生活钥匙',
        status: 'solved'
      });
      assert.strictEqual(matched.length, 1, '仅有一条完全满足三项复合条件');
      assert.strictEqual(matched[0].id, 1, '匹配的目标 ID 应为 1');
    }
  },

  {
    name: '测试用例 8: 状态流转持久化（open -> solved 结贴状态更新）',
    category: '业务状态流转测试 (DataManager)',
    description: '测试失物归还后将信息更新为“solved”，验证状态流转是否成功持久化写入。',
    testFn(assert) {
      const testItem = {
        title: '待认领水杯',
        type: 'found',
        category: '其他物品',
        location: '田径场',
        date: '2026-10-02',
        contactType: '微信',
        contactVal: 'tester'
      };
      const created = DataManager.addItem(testItem);
      assert.strictEqual(created.status, 'open', '初始状态应为 open (进行中)');

      // 执行状态更新为已解决
      const updateSuccess = DataManager.updateItemStatus(created.id, 'solved');
      assert.isTrue(updateSuccess, '更新状态应返回成功');

      const reloaded = DataManager.getItemById(created.id);
      assert.strictEqual(reloaded.status, 'solved', '重新加载的数据状态应为 solved');

      // 清理测试数据
      DataManager.deleteItem(created.id);
    }
  },

  {
    name: '测试用例 9: 搜索高亮 XSS 注入防护（测试人员恶意脚本刁难）',
    category: '安全防护测试 (highlightKeyword & escapeHtml)',
    description: '测试人员故意在文本中注入 `<script>alert(1)</script>` 等危险标签时，高亮函数必须先做 HTML 实体转义，防止跨站脚本漏洞。',
    testFn(assert) {
      const maliciousText = '<script>alert("hack")</script>测试失物';
      const highlighted = Utils.highlightKeyword(maliciousText, '测试');
      assert.isFalse(highlighted.includes('<script>'), '不得包含未转义的 <script> 标签');
      assert.isTrue(highlighted.includes('&lt;script&gt;'), '危险字符必须被转义为安全 HTML 实体');
      assert.isTrue(highlighted.includes('<mark'), '目标关键词应被安全 mark 标签包裹');
    }
  },

  {
    name: '测试用例 10: 损坏 JSON 数据导入解析容错测试',
    category: '鲁棒性与异常恢复测试 (parseImportData)',
    description: '模拟测试人员导入破损或非法格式的 JSON 字符串，系统必须安全捕获异常，返回 success=false，而非直接崩溃白屏。',
    testFn(assert) {
      const corruptedJson = '{"version": "1.0", "data": [非法截断数据...';
      const result = Utils.parseImportData(corruptedJson);
      assert.isFalse(result.success, '损坏的 JSON 应该解析失败');
      assert.isTrue(result.message.includes('JSON 解析失败'), '应给出友好的错误原因提示');
    }
  },

  {
    name: '测试用例 11: 编辑自己的发布信息并保留业务状态',
    category: '发布管理测试 (DataManager.updateItem)',
    description: '验证编辑操作能够更新标题和地点，同时保留原有 ID、已解决状态和发布时间。',
    testFn(assert) {
      const created = DataManager.addItem({
        type: 'found',
        title: '待编辑的水杯',
        category: '其他物品',
        location: '旧地点',
        date: '2026-10-02',
        contactType: '微信',
        contactVal: 'editor_test'
      });
      DataManager.updateItemStatus(created.id, 'solved');
      const before = DataManager.getItemById(created.id);
      const updated = DataManager.updateItem(created.id, {
        title: '修改后的水杯',
        location: '新地点'
      });
      const after = DataManager.getItemById(created.id);

      assert.isTrue(updated, '自己的信息应当允许编辑');
      assert.strictEqual(after.id, before.id, '编辑不能改变信息 ID');
      assert.strictEqual(after.title, '修改后的水杯', '标题应更新');
      assert.strictEqual(after.location, '新地点', '地点应更新');
      assert.strictEqual(after.status, 'solved', '编辑不能重置已解决状态');
      assert.strictEqual(after.timestamp, before.timestamp, '编辑不能改变发布时间');
      assert.strictEqual(after.publisherName, before.publisherName, '编辑不能改变发布者');
      assert.strictEqual(after.resolvedTime, before.resolvedTime, '编辑不能改变结贴时间');
      DataManager.deleteItem(created.id);
    }
  },

  {
    name: '测试用例 12: 非本人信息禁止编辑',
    category: '权限边界测试 (DataManager.updateItem)',
    description: '验证非本人发布的信息不能通过数据管理层被修改。',
    testFn(assert) {
      const original = DataManager.getItemById(1002);
      const changed = DataManager.updateItem(1002, { title: '不应被修改' });
      const current = DataManager.getItemById(1002);
      assert.isFalse(Boolean(original && original.isMine), '测试数据应属于其他用户');
      assert.isFalse(changed, '非本人信息不应允许编辑');
      assert.strictEqual(current.title, original.title, '非本人信息标题应保持不变');
    }
  },

  {
    name: '测试用例 13: 编辑后的联系方式仍需通过格式校验',
    category: '编辑校验测试 (validateItem)',
    description: '验证编辑联系方式时仍执行与首次发布相同的手机号格式校验。',
    testFn(assert) {
      const result = Utils.validateItem({
        type: 'lost',
        title: '修改后的课本',
        category: '书籍文具',
        location: '图书馆',
        date: '2026-10-02',
        contactType: '手机号',
        contactVal: '123'
      });
      assert.isFalse(result.isValid, '非法手机号不能保存编辑结果');
      assert.isTrue(result.errors.some(e => e.includes('手机号码格式不正确')), '应返回手机号格式错误');
    }
  },
  {
    name: '测试用例 14: 非法编辑内容不会覆盖已保存的数据',
    category: '编辑校验测试 (DataManager.updateItem)',
    description: '空白标题、空白地点和错误手机号均应保存失败，原记录保持不变。',
    testFn(assert) {
      const before = DataManager.getItemById(1001);
      const invalidUpdates = [
        { title: '   ' }, { location: '   ' },
        { contactType: '手机号', contactVal: '123' }
      ];
      invalidUpdates.forEach(updates => {
        assert.isFalse(DataManager.updateItem(1001, updates), '非法内容应拒绝保存');
        assert.strictEqual(JSON.stringify(DataManager.getItemById(1001)), JSON.stringify(before), '原记录不能被覆盖');
      });
    }
  },
  {
    name: '测试用例 15: 不存在的记录不能编辑',
    category: '编辑异常测试 (DataManager.updateItem)',
    description: '记录不存在或已删除时返回失败，不创建新记录。',
    testFn(assert) {
      const before = JSON.stringify(DataManager.getItems());
      assert.isFalse(DataManager.updateItem('missing-item', { title: '不存在的物品' }));
      assert.strictEqual(JSON.stringify(DataManager.getItems()), before);
    }
  },
  {
    name: '测试用例 16: 图片移除和内部字段保护',
    category: '编辑字段测试 (DataManager.updateItem)',
    description: '允许移除原图片，但修改 ID、状态、发布时间、发布者或归属标记不会生效。',
    testFn(assert) {
      const before = DataManager.getItemById(1001);
      assert.isTrue(DataManager.updateItem(1001, {
        img: '', id: 'changed', status: 'solved', timestamp: 0,
        publisherName: 'other', isMine: false
      }));
      const after = DataManager.getItemById(1001);
      assert.strictEqual(after.img, '');
      ['id', 'status', 'timestamp', 'publisherName', 'isMine'].forEach(field => {
        assert.strictEqual(after[field], before[field], field + '应保持不变');
      });
    }
  },
  {
    name: '测试用例 17: 存储失败时不误报编辑成功',
    category: '存储异常测试 (DataManager.updateItem)',
    description: '模拟本地缓存写入失败，更新方法必须返回失败并保持原记录。',
    testFn(assert) {
      const before = JSON.stringify(DataManager.getItemById(1001));
      const saveItems = DataManager.saveItems;
      DataManager.saveItems = () => false;
      try {
        assert.isFalse(DataManager.updateItem(1001, { title: '存储失败的修改' }));
        assert.strictEqual(JSON.stringify(DataManager.getItemById(1001)), before);
      } finally {
        DataManager.saveItems = saveItems;
      }
    }
  },
  {
    name: '测试用例 18: 发布时存储空间不足不返回成功',
    category: '存储异常测试 (addItem)',
    description: '模拟浏览器拒绝写入，发布返回 null，已有列表保持不变。',
    testFn(assert, storage) {
      const before = JSON.stringify(DataManager.getItems());
      storage.setItem = () => { throw new Error('QuotaExceededError'); };
      const created = DataManager.addItem({ ...initialMockData[0], title: '新发布的校园卡' });
      assert.strictEqual(created, null);
      assert.strictEqual(JSON.stringify(DataManager.getItems()), before);
    }
  },
  {
    name: '测试用例 19: 结贴保存失败时保留原状态',
    category: '存储异常测试 (updateItemStatus)',
    description: '状态写入失败时返回 false，不能将未保存的结贴显示为成功。',
    testFn(assert, storage) {
      const before = JSON.stringify(DataManager.getItemById(1001));
      storage.setItem = () => { throw new Error('Storage unavailable'); };
      assert.isFalse(DataManager.updateItemStatus(1001, 'solved'));
      assert.strictEqual(JSON.stringify(DataManager.getItemById(1001)), before);
    }
  },
  {
    name: '测试用例 20: 删除保存失败时保留原记录',
    category: '存储异常测试 (deleteItem)',
    description: '模拟删除时写入失败，返回 false 且记录仍然可以查询。',
    testFn(assert, storage) {
      const before = JSON.stringify(DataManager.getItems());
      storage.setItem = () => { throw new Error('Storage unavailable'); };
      assert.isFalse(DataManager.deleteItem(1001));
      assert.strictEqual(JSON.stringify(DataManager.getItems()), before);
    }
  },
  {
    name: '测试用例 21: 重置失败不会清空已有数据',
    category: '存储异常测试 (resetToDefault)',
    description: '修改记录后模拟重置写入失败，原有修改应保留。',
    testFn(assert, storage) {
      assert.isTrue(DataManager.updateItem(1001, { title: '自己修改的校园卡' }));
      const before = JSON.stringify(DataManager.getItems());
      storage.setItem = () => { throw new Error('Storage unavailable'); };
      assert.strictEqual(DataManager.resetToDefault(), null);
      assert.strictEqual(JSON.stringify(DataManager.getItems()), before);
    }
  },
  {
    name: '测试用例 22: 已保存的空列表不会恢复示例数据',
    category: '持久化边界测试 (getItems)',
    description: '空数组也是合法数据，连续读取和刷新后应保持为空。',
    testFn(assert) {
      assert.isTrue(DataManager.saveItems([]));
      assert.strictEqual(DataManager.getItems().length, 0);
      assert.strictEqual(DataManager.getItems().length, 0);
    }
  },
  {
    name: '测试用例 23: 非本人记录不能删除或结贴',
    category: '权限边界测试 (deleteItem & updateItemStatus)',
    description: '即使直接调用数据层，非本人记录也不允许被删除或修改状态。',
    testFn(assert) {
      const before = JSON.stringify(DataManager.getItems());
      assert.isFalse(DataManager.deleteItem(1002));
      assert.isFalse(DataManager.updateItemStatus(1002, 'solved'));
      assert.strictEqual(JSON.stringify(DataManager.getItems()), before);
    }
  },
  {
    name: '测试用例 24: 不存在的记录和非法状态不能修改',
    category: '状态边界测试 (updateItemStatus)',
    description: '拦截不存在的 ID 与预设范围之外的状态值。',
    testFn(assert) {
      const before = JSON.stringify(DataManager.getItems());
      assert.isFalse(DataManager.updateItemStatus('missing-item', 'solved'));
      assert.isFalse(DataManager.deleteItem('missing-item'));
      assert.isFalse(DataManager.updateItemStatus(1001, 'invalid-status'));
      assert.strictEqual(JSON.stringify(DataManager.getItems()), before);
    }
  },
  {
    name: '测试用例 25: 删除最后一条记录后读取仍然为空',
    category: '删除流程测试 (deleteItem & getItems)',
    description: '列表只剩本人记录时，删除成功后不能重新出现示例数据。',
    testFn(assert) {
      assert.isTrue(DataManager.saveItems([{ ...initialMockData[0] }]));
      assert.isTrue(DataManager.deleteItem(1001));
      assert.strictEqual(DataManager.getItems().length, 0);
      assert.strictEqual(DataManager.getItemById(1001), null);
    }
  },
  {
    name: '测试用例 26: 初始化返回数据与示例数据相互独立',
    category: '初始化测试 (getItems)',
    description: '首次运行且存储不可写时，修改返回对象也不会污染原始示例。',
    testFn(assert, storage) {
      const originalTitle = initialMockData[0].title;
      storage.getItem = () => null;
      storage.setItem = () => { throw new Error('Storage unavailable'); };
      DataManager.getItems()[0].title = '临时修改';
      assert.strictEqual(initialMockData[0].title, originalTitle);
      assert.strictEqual(DataManager.getItems()[0].title, originalTitle);
    }
  },
  {
    name: '测试用例 27: 重复结贴不改变首次完成时间',
    category: '状态流转测试 (updateItemStatus)',
    description: '重复标记保留原结贴时间，恢复进行中时清除结贴时间。',
    testFn(assert) {
      const items = DataManager.getItems();
      items[0].status = 'solved';
      items[0].resolvedTime = '2026-10-02T10:00:00.000Z';
      assert.isTrue(DataManager.saveItems(items));
      assert.isTrue(DataManager.updateItemStatus(1001, 'solved'));
      assert.strictEqual(DataManager.getItemById(1001).resolvedTime, items[0].resolvedTime);
      assert.isTrue(DataManager.updateItemStatus(1001, 'open'));
      assert.strictEqual(DataManager.getItemById(1001).resolvedTime, undefined);
    }
  },
  {
    name: '测试用例 28: 特殊字符能高亮且保持完整转义',
    category: '搜索高亮测试 (highlightKeyword)',
    description: '分别搜索 &、尖括号和引号，匹配部分应完整转义，不拆开 HTML 实体。',
    testFn(assert) {
      const text = `卡套 & <标签> "蓝色" '钥匙'`;
      ['&', '<', '>', '"', "'"].forEach(keyword => {
        const html = Utils.highlightKeyword(text, keyword);
        assert.isTrue(html.includes('>' + Utils.escapeHtml(keyword) + '</mark>'));
        assert.strictEqual(html.replace(/<mark[^>]*>|<\/mark>/g, ''), Utils.escapeHtml(text));
      });
    }
  },
  {
    name: '测试用例 29: 不能匹配转义产生的实体名称',
    category: '搜索高亮测试 (highlightKeyword)',
    description: '原文只有 & 和尖括号时，amp、lt 等实体名称不应被当作原文关键词。',
    testFn(assert) {
      ['amp', 'lt', 'gt', 'quot', '039'].forEach(keyword => {
        const text = `& < > " '`;
        assert.strictEqual(Utils.highlightKeyword(text, keyword), Utils.escapeHtml(text));
      });
    }
  },
  {
    name: '测试用例 30: 正则符号按普通关键词匹配',
    category: '搜索高亮测试 (highlightKeyword)',
    description: '加号、括号、反斜杠等符号只能匹配本身，不能改变搜索规则。',
    testFn(assert) {
      ['C++', '[钥匙]', '(课本)', 'a.b', '$&', '\\', '*', '?'].forEach(keyword => {
        const text = '前缀 ' + keyword + ' 后缀';
        const html = Utils.highlightKeyword(text, keyword);
        assert.isTrue(html.includes('>' + Utils.escapeHtml(keyword) + '</mark>'));
        assert.strictEqual(html.replace(/<mark[^>]*>|<\/mark>/g, ''), Utils.escapeHtml(text));
      });
    }
  },
  {
    name: '测试用例 31: 忽略大小写并高亮全部匹配',
    category: '搜索高亮测试 (highlightKeyword)',
    description: '关键词首尾空格被去除，重复匹配保留原文大小写；空关键词只转义。',
    testFn(assert) {
      const html = Utils.highlightKeyword('AirPods airpods AIRPODS', ' airpods ');
      assert.strictEqual((html.match(/<mark /g) || []).length, 3);
      assert.strictEqual(html.replace(/<mark[^>]*>|<\/mark>/g, ''), 'AirPods airpods AIRPODS');
      assert.strictEqual(Utils.highlightKeyword('<卡套>&', '   '), '&lt;卡套&gt;&amp;');
    }
  },
  {
    name: '测试用例 32: 匹配整段标签时仍不生成可执行标签',
    category: '搜索安全测试 (highlightKeyword)',
    description: '搜索 <script> 等完整标签时，只高亮转义后的文字，不插入原始标签。',
    testFn(assert) {
      const text = '<script>alert("test")</script>';
      const html = Utils.highlightKeyword(text, '<script>');
      assert.isFalse(html.includes('<script>'));
      assert.isTrue(html.includes('>&lt;script&gt;</mark>'));
      assert.strictEqual(html.replace(/<mark[^>]*>|<\/mark>/g, ''), Utils.escapeHtml(text));
    }
  },
  {
    name: '测试用例 33: 合法日期与闰年二月通过校验',
    category: '日期校验测试 (validateItem)',
    description: '验证正常月末、闰年二月及能被 400 整除的世纪年份。',
    testFn(assert) {
      const today = new Date(2026, 9, 7, 12);
      ['2026-09-30', '2026-01-31', '2024-02-29', '2000-02-29', '0001-01-01'].forEach(date => {
        assert.isTrue(Utils.validateItem({ ...initialMockData[0], date }, today).isValid, date);
      });
    }
  },
  {
    name: '测试用例 34: 不存在的日期不能自动进位通过',
    category: '日期边界测试 (validateItem)',
    description: '拦截二月三十日、非闰年二月二十九日、大小月及月份越界。',
    testFn(assert) {
      const today = new Date(2026, 9, 7, 12);
      ['2026-02-30', '2025-02-29', '1900-02-29', '2026-04-31', '2026-00-01', '2026-13-01', '2026-01-00', '2026-01-32', '0000-01-01'].forEach(date => {
        const result = Utils.validateItem({ ...initialMockData[0], date }, today);
        assert.isFalse(result.isValid, date);
        assert.isTrue(result.errors.some(error => error.includes('有效的日期')), date);
      });
    }
  },
  {
    name: '测试用例 35: 日期必须使用完整年月日格式',
    category: '日期格式测试 (validateItem)',
    description: '拒绝空值、非字符串、斜杠日期和时间戳，只接受 YYYY-MM-DD。',
    testFn(assert) {
      const today = new Date(2026, 9, 7, 12);
      ['', null, undefined, 20261007, {}, '2026/10/07', '2026-1-1', '2026-10-07T00:00:00Z', ' 2026-10-07 '].forEach(date => {
        assert.isFalse(Utils.validateItem({ ...initialMockData[0], date }, today).isValid, String(date));
      });
    }
  },
  {
    name: '测试用例 36: 当天可发布，未来日期不能发布',
    category: '日期业务测试 (validateItem)',
    description: '用固定参考日期验证昨天、今天和明天，并覆盖寻物与招领两种类型。',
    testFn(assert) {
      const today = new Date(2026, 9, 7, 0, 5);
      ['lost', 'found'].forEach(type => {
        ['2026-10-06', '2026-10-07'].forEach(date => {
          assert.isTrue(Utils.validateItem({ ...initialMockData[0], type, date }, today).isValid);
        });
        const result = Utils.validateItem({ ...initialMockData[0], type, date: '2026-10-08' }, today);
        assert.isFalse(result.isValid);
        assert.isTrue(result.errors.some(error => error.includes('不能晚于今天')));
      });
    }
  },
  {
    name: '测试用例 37: 默认日期按本地日历计算',
    category: '时区边界测试 (formatLocalDate)',
    description: '验证本地凌晨与深夜、年末与次年，不使用 UTC 截断日期。',
    testFn(assert) {
      assert.strictEqual(Utils.formatLocalDate(new Date(2026, 9, 7, 0, 5)), '2026-10-07');
      assert.strictEqual(Utils.formatLocalDate(new Date(2026, 11, 31, 23, 55)), '2026-12-31');
      assert.strictEqual(Utils.formatLocalDate(new Date(2027, 0, 1, 0, 5)), '2027-01-01');
    }
  },
  {
    name: '测试用例 38: 编辑时非法日期不覆盖原记录',
    category: '编辑日期测试 (DataManager.updateItem)',
    description: '编辑日期也走统一校验，错误日期或未来日期均不能覆盖已保存的信息。',
    testFn(assert) {
      const before = JSON.stringify(DataManager.getItemById(1001));
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      ['2025-02-29', '2026-04-31', Utils.formatLocalDate(tomorrow)].forEach(date => {
        assert.isFalse(DataManager.updateItem(1001, { date }));
        assert.strictEqual(JSON.stringify(DataManager.getItemById(1001)), before);
      });
    }
  },
  {
    name: '测试用例 39: 图片类型与扩展名一致',
    category: '图片校验测试 (validateImageFile)',
    description: '支持 PNG、JPG、JPEG、WEBP，拒绝其他类型和不匹配的扩展名。',
    testFn(assert) {
      [['card.png', 'image/png'], ['card.jpg', 'image/jpeg'], ['card.jpeg', 'image/jpeg'], ['card.webp', 'image/webp']]
        .forEach(([name, type]) => assert.isTrue(Utils.validateImageFile({ name, type, size: 100 }).isValid));
      [['card.svg', 'image/svg+xml'], ['script.png', 'text/html'], ['card.exe', 'image/png'], ['card.jpg', 'image/png']]
        .forEach(([name, type]) => assert.isFalse(Utils.validateImageFile({ name, type, size: 100 }).isValid));
    }
  },
  {
    name: '测试用例 40: 图片大小不能超过 2MB',
    category: '图片边界测试 (validateImageFile)',
    description: '接受非空且不超过 2MB 的文件，拒绝空文件、超限文件和非法大小。',
    testFn(assert) {
      const file = { name: 'card.jpg', type: 'image/jpeg' };
      [1, 2 * 1024 * 1024].forEach(size => assert.isTrue(Utils.validateImageFile({ ...file, size }).isValid));
      [0, -1, NaN, Infinity, '100', 2 * 1024 * 1024 + 1].forEach(size => assert.isFalse(Utils.validateImageFile({ ...file, size }).isValid));
    }
  },
  {
    name: '测试用例 41: 图片字段缺失时安全拒绝',
    category: '图片异常测试 (validateImageFile)',
    description: '拒绝空值、缺少 MIME 或名称的文件，不进入读取流程。',
    testFn(assert) {
      [null, undefined, {}, { name: 'card.jpg' }, { type: 'image/jpeg', size: 100 }, { name: 1, type: 'image/png', size: 100 }]
        .forEach(file => assert.isFalse(Utils.validateImageFile(file).isValid));
    }
  },
  {
    name: '测试用例 42: 图片扩展名忽略大小写',
    category: '图片兼容性测试 (validateImageFile)',
    description: '大写 JPEG、PNG、WEBP 后缀和小写后缀保持相同规则。',
    testFn(assert) {
      [['CARD.JPEG', 'image/jpeg'], ['CARD.PNG', 'image/png'], ['CARD.WEBP', 'image/webp']]
        .forEach(([name, type]) => assert.isTrue(Utils.validateImageFile({ name, type, size: 100 }).isValid));
    }
  },
  {
    name: '测试用例 43: 同一毫秒创建记录时 ID 不重复',
    category: '发布边界测试 (DataManager.addItem)',
    description: '连续发布使用相同时间戳时避让已有 ID，保留真实发布时间。',
    testFn(assert) {
      const originalNow = Date.now;
      Date.now = () => 1700000000000;
      try {
        const first = DataManager.addItem({ ...initialMockData[0], title: '同毫秒记录一' });
        const second = DataManager.addItem({ ...initialMockData[0], title: '同毫秒记录二' });
        assert.isFalse(first.id === second.id);
        assert.strictEqual(DataManager.getItemById(first.id).title, '同毫秒记录一');
        assert.strictEqual(DataManager.getItemById(second.id).title, '同毫秒记录二');
        assert.strictEqual(first.timestamp, second.timestamp);
      } finally {
        Date.now = originalNow;
      }
    }
  },
  {
    name: '测试用例 44: 导出的完整备份可以重新解析',
    category: '导入校验测试 (parseImportData)',
    description: '系统导出的 1.0 版本备份应能通过校验，并还原白名单字段。',
    testFn(assert) {
      const result = Utils.parseImportData(Utils.exportToJson([initialMockData[0]]));
      assert.isTrue(result.success);
      assert.strictEqual(result.data.length, 1);
      assert.strictEqual(result.data[0].id, initialMockData[0].id);
      assert.strictEqual(result.data[0].title, initialMockData[0].title);
    }
  },
  {
    name: '测试用例 45: 导入备份必须满足版本和数量声明',
    category: '导入格式测试 (parseImportData)',
    description: '缺少 data、版本不支持或 count 与实际数量不一致时拒绝导入。',
    testFn(assert) {
      [
        {},
        { version: '2.0', count: 1, data: [initialMockData[0]] },
        { version: '1.0', count: 2, data: [initialMockData[0]] },
        { version: '1.0', count: 1, data: initialMockData[0] }
      ].forEach(value => assert.isFalse(Utils.parseImportData(JSON.stringify(value)).success));
    }
  },
  {
    name: '测试用例 46: 导入记录的必填字段必须存在',
    category: '导入字段测试 (parseImportData)',
    description: '缺少标题、日期、联系方式等关键字段时，不能写入不完整记录。',
    testFn(assert) {
      ['title', 'type', 'category', 'location', 'date', 'contactType', 'contactVal'].forEach(field => {
        const item = { ...initialMockData[0] };
        delete item[field];
        assert.isFalse(Utils.parseImportData(JSON.stringify([item])).success, field);
      });
    }
  },
  {
    name: '测试用例 47: 导入记录的 ID 和状态必须合法',
    category: '导入边界测试 (parseImportData)',
    description: '重复 ID、非正整数 ID、非法状态和错误本人标记均被拒绝。',
    testFn(assert) {
      const invalidItems = [
        [{ ...initialMockData[0], id: 0 }],
        [{ ...initialMockData[0], id: 1 }, { ...initialMockData[0], id: 1 }],
        [{ ...initialMockData[0], status: 'deleted' }],
        [{ ...initialMockData[0], isMine: 'yes' }]
      ];
      invalidItems.forEach(items => assert.isFalse(Utils.parseImportData(JSON.stringify(items)).success));
    }
  },
  {
    name: '测试用例 48: 导入图片地址必须安全且大小受限',
    category: '导入安全测试 (parseImportData)',
    description: '拒绝脚本协议、带凭据 URL、过长地址和无效 Base64，避免导入后污染页面。',
    testFn(assert) {
      const invalidImages = [
        'javascript:alert(1)', 'https://user:pass@example.com/a.png',
        'data:image/svg+xml;base64,PHN2Zy8+', 'data:image/png;base64,not-base64'
      ];
      invalidImages.forEach(img => {
        assert.isFalse(Utils.parseImportData(JSON.stringify([{ ...initialMockData[0], img }])).success);
      });
      assert.isTrue(Utils.parseImportData(JSON.stringify([{ ...initialMockData[0], img: 'https://example.com/card.png' }])).success);
      assert.isTrue(Utils.parseImportData(JSON.stringify([{ ...initialMockData[0], img: 'assets/student-card.svg' }])).success);
      assert.isFalse(Utils.parseImportData(JSON.stringify([{ ...initialMockData[0], img: '../secret.svg' }])).success);
    }
  },
  {
    name: '测试用例 49: 导入文本长度和记录数量受限',
    category: '导入容量测试 (parseImportData)',
    description: '超过单字段长度、超过 1000 条或超过 10MB 的备份直接拒绝。',
    testFn(assert) {
      assert.isFalse(Utils.parseImportData(JSON.stringify([{ ...initialMockData[0], desc: 'a'.repeat(5001) }])).success);
      const many = Array.from({ length: 1001 }, (_, index) => ({ ...initialMockData[0], id: index + 1 }));
      assert.isFalse(Utils.parseImportData(JSON.stringify(many)).success);
      assert.isFalse(Utils.parseImportData(' '.repeat(10 * 1024 * 1024 + 1)).success);
    }
  },
  {
    name: '测试用例 50: 导入数据会过滤未知字段',
    category: '导入兼容测试 (parseImportData)',
    description: '保留系统需要的字段，忽略备份中额外的未知属性。',
    testFn(assert) {
      const result = Utils.parseImportData(JSON.stringify([{ ...initialMockData[0], unknown: '<script>' }]));
      assert.isTrue(result.success);
      assert.strictEqual(Object.prototype.hasOwnProperty.call(result.data[0], 'unknown'), false);
      assert.strictEqual(result.data[0].desc, initialMockData[0].desc);
    }
  },
  {
    name: '测试用例 51: 导入保存失败时不误报成功',
    category: '导入存储测试 (DataManager.importItems)',
    description: '模拟 LocalStorage 写入失败，导入返回失败且已有数据不被覆盖。',
    testFn(assert) {
      const before = JSON.stringify(DataManager.getItems());
      const saveItems = DataManager.saveItems;
      DataManager.saveItems = () => false;
      try {
        const result = DataManager.importItems(Utils.exportToJson([initialMockData[0]]));
        assert.isFalse(result.success);
        assert.strictEqual(JSON.stringify(DataManager.getItems()), before);
      } finally {
        DataManager.saveItems = saveItems;
      }
    }
  },
  {
    name: '测试用例 52: 异常顶层和非记录元素被拒绝',
    category: '导入结构测试 (parseImportData)',
    description: '拒绝 null、标量、缺字段对象和数组中的非记录项，返回具体记录编号。',
    testFn(assert) {
      ['null', '1', 'true', '"text"', '{}', '{"data":null}', '[null]', '[[]]', '[1]'].forEach(text => {
        assert.isFalse(Utils.parseImportData(text).success);
      });
      const result = Utils.parseImportData(JSON.stringify([initialMockData[0], { title: '缺字段' }]));
      assert.isTrue(result.message.includes('第 2 条记录'));
    }
  },
  {
    name: '测试用例 53: 导入任何一条非法记录均不写入',
    category: '导入事务测试 (DataManager.importItems)',
    description: '列表含合法和非法记录时不能部分写入，旧列表完整保留。',
    testFn(assert) {
      const before = JSON.stringify(DataManager.getItems());
      const variants = [{ title: 123 }, { date: '2025-02-29' }, { contactType: '<img>' },
        { timestamp: -1 }, { desc: {} }, { resolvedTime: 'wrong' }, { img: 'https://example.com/" onerror="test' }];
      variants.forEach(updates => {
        const result = DataManager.importItems(JSON.stringify([initialMockData[0], { ...initialMockData[1], ...updates }]));
        assert.isFalse(result.success);
        assert.strictEqual(JSON.stringify(DataManager.getItems()), before);
      });
    }
  },
  {
    name: '测试用例 54: 合法备份一次替换并支持空列表',
    category: '导入恢复测试 (DataManager.importItems)',
    description: '可恢复记录数组或带 BOM 的导出备份，空数组也是合法的备份。',
    testFn(assert) {
      assert.isTrue(DataManager.importItems('\uFEFF' + Utils.exportToJson([initialMockData[0]])).success);
      assert.strictEqual(DataManager.getItems().length, 1);
      assert.strictEqual(DataManager.getItemById(1001).isMine, true);
      const result = DataManager.importItems('[]');
      assert.isTrue(result.success);
      assert.strictEqual(result.count, 0);
      assert.strictEqual(DataManager.getItems().length, 0);
    }
  },
  {
    name: '测试用例 55: 内嵌图片长度边界不导致解析异常',
    category: '导入图片边界测试 (parseImportData)',
    description: '测试合法 Base64、空内容、错误填充和大内容，拒绝超过 2MB 的内嵌图片。',
    testFn(assert) {
      const parseImage = img => Utils.parseImportData(JSON.stringify([{ ...initialMockData[0], img }]));
      assert.isTrue(parseImage('data:image/png;base64,iVBORw0KGgoA' + 'A'.repeat(1024 * 1024)).success);
      assert.isTrue(parseImage('data:image/jpeg;base64,/9j/4AAQ').success);
      assert.isTrue(parseImage('data:image/webp;base64,UklGRgAAAABXRUJQ').success);
      ['data:image/png;base64,', 'data:image/png;base64,A===', 'data:image/png;base64,AAA',
        'data:image/png;base64,AAAA', 'data:image/png;base64,' + 'A'.repeat(3 * 1024 * 1024),
        'data:image/png;base64,/9j/4AAQ'].forEach(img => assert.isFalse(parseImage(img).success));
    }
  },
  {
    name: '测试用例 56: 旧版示例图自动迁移且不修改用户图片',
    category: '本地数据迁移测试 (DataManager.getItems)',
    description: '旧示例图片替换为本地对应物品图，用户上传的 Base64 图片保持不变。',
    testFn(assert, storage) {
      const oldItems = initialMockData.map(item => ({ ...item }));
      oldItems[0].img = 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=500&q=80';
      oldItems[1].img = 'data:image/png;base64,user-image';
      storage.setItem('CAMPUS_LOST_FOUND_ITEMS_V2', JSON.stringify(oldItems));
      const items = DataManager.getItems();
      assert.strictEqual(items[0].img, 'assets/student-card.svg');
      assert.strictEqual(items[1].img, 'data:image/png;base64,user-image');
      assert.strictEqual(JSON.parse(storage.getItem('CAMPUS_LOST_FOUND_ITEMS_V2'))[0].img, 'assets/student-card.svg');
    }
  }
];

if (typeof module !== 'undefined' && module.exports) {
  module.exports = UnitTests;
}
