# ✅ 功能验证清单

使用此清单确保所有功能都正常工作。

## 📋 需求功能验证

### ✅ 1. 新标签页显示插件主页
- [ ] 打开新标签页（Ctrl+T），看到插件主页
- [ ] 页面顶部显示「📌 标签书签管理器」标题
- [ ] 搜索框可见且可输入

**验证脚本**:
```javascript
// 在浏览器开发者工具中运行
console.log('插件已加载:', document.title);
console.log('Header 存在:', !!document.querySelector('header'));
```

---

### ✅ 2. 返显当前浏览器的所有书签
- [ ] 右侧显示书签列表
- [ ] 书签数量 > 0
- [ ] 每个书签显示标题、标签、URL

**验证脚本**:
```javascript
console.log('书签数量:', document.querySelectorAll('.bm-card').length);
console.log('第一个书签:', document.querySelector('.bm-title')?.textContent);
```

---

### ✅ 3. 插件主页分栏显示
- [ ] 左侧有标签栏
- [ ] 右侧有书签内容区
- [ ] 两栏明确分离

**验证步骤**:
1. 打开开发者工具 (F12)
2. 查看元素检查器
3. 确保存在 `.sidebar` 和 `.content-area` 元素

```html
<!-- 应该能看到这样的结构 -->
<div class="main-container">
  <aside class="sidebar"> ... </aside>
  <main class="content-area"> ... </main>
</div>
```

---

### ✅ 4. 点击标签筛选书签
**测试步骤**:

1. **准备测试书签**
   - 创建书签：`Google #搜索`
   - 创建书签：`GitHub #开发`
   - 创建书签：`MDN #开发 #文档`

2. **测试筛选**
   - [ ] 左侧显示标签：`全部书签`, `#搜索`, `#开发`, `#文档`
   - [ ] 点击「#开发」，只显示包含该标签的书签
   - [ ] 点击「#搜索」，只显示搜索相关的书签
   - [ ] 点击「全部书签」，显示所有书签

3. **验证结果**
   ```javascript
   // 在控制台检查筛选后的书签
   console.log('当前显示的书签:', document.querySelectorAll('.bm-card').length);
   ```

---

### ✅ 5. 书签列表分页显示
**测试步骤**:

1. **确保有足够书签**（> 12个）
2. **验证分页按钮**
   - [ ] 底部出现分页控件
   - [ ] 显示「上一页」、页码、「下一页」按钮
   - [ ] 第一页时「上一页」按钮禁用

3. **测试分页**
   - [ ] 点击页码按钮，正确切换页面
   - [ ] 点击「下一页」，显示第2页书签
   - [ ] 点击「上一页」，返回第1页
   - [ ] 每页显示12个书签（或更少，如果总数不足）

4. **验证脚本**
   ```javascript
   // 检查分页
   const cards = document.querySelectorAll('.bm-card');
   console.log('当前页显示:', cards.length, '个书签');
   console.log('分页按钮:', document.querySelectorAll('.pagination button').length);
   ```

---

### ✅ 6. 给书签添加标签
**测试步骤**:

1. **编辑书签添加标签**
   - 打开 Chrome 书签管理器 (Ctrl+Shift+B)
   - 右键编辑某个书签
   - 在名称后添加：` #标签1 #标签2`
   - 保存

2. **验证标签显示**
   - [ ] 刷新新标签页（Ctrl+Shift+R）
   - [ ] 该书签现在显示标签丸
   - [ ] 标签列表中出现新标签

3. **测试多标签**
   - 编辑书签为：`Google #搜索 #工具 #常用`
   - [ ] 书签卡片显示3个标签丸
   - [ ] 所有标签都可点击筛选

---

### ✅ 7. 从书签名字提取标签
**验证方式**:

1. **检查标签提取逻辑**
   ```javascript
   // 在控制台运行
   const title = 'Google #搜索 #工具';
   const tags = title.match(/#(\S+)/g) || [];
   const cleanTitle = title.replace(/#\S+/g, '').trim();
   console.log('提取的标签:', tags); // ['#搜索', '#工具']
   console.log('清理后的标题:', cleanTitle); // 'Google'
   ```

2. **可视化验证**
   - [ ] 书签卡片显示清理后的标题（不包含#号）
   - [ ] 下方显示对应的标签丸
   - [ ] 标签栏中列出所有找到的标签

---

## 🎁 增强功能验证

### ✅ 搜索功能
**测试步骤**:

1. 在顶部搜索框输入：`GitHub`
   - [ ] 只显示标题中包含「GitHub」的书签

2. 输入：`#开发`
   - [ ] 只显示有「#开发」标签的书签

3. 输入：`google.com`
   - [ ] 只显示URL中包含该关键字的书签

4. 测试实时搜索
   - [ ] 每输入一个字符，结果立即更新
   - [ ] 点击标签后，搜索框清空

---

### ✅ 实时更新监听
**测试步骤**:

1. 打开两个标签页
   - 标签1：新标签页（插件主页）
   - 标签2：Chrome 书签管理器

2. 在标签2中修改书签：
   - [ ] 标签1 中的内容自动更新（无需刷新）
   - [ ] 新标签立即显示或消失

---

### ✅ UI 和交互
**测试清单**:

- [ ] 页面响应式，窗口调整大小时布局正确
- [ ] 颜色和排版美观，符合 Material Design
- [ ] 书签卡片悬停时有阴影效果
- [ ] 所有按钮都可点击且有悬停反馈
- [ ] 文本不会溢出或重叠

---

## 🔧 浏览器控制台检查

打开开发者工具 (F12)，查看是否有错误：

```javascript
// 运行这些检查
console.log('✅ 初始化完成');

// 检查全局变量
console.log('allBookmarks 长度:', allBookmarks.length);
console.log('当前标签:', currentTag);
console.log('当前页码:', currentPage);

// 检查DOM
console.log('标签项数:', document.querySelectorAll('.tag-item').length);
console.log('书签卡片数:', document.querySelectorAll('.bm-card').length);

// 检查API权限
chrome.bookmarks.getTree((tree) => {
  console.log('✅ Bookmarks API 可用');
  console.log('顶级书签数:', tree.length);
});
```

---

## 📱 跨浏览器/设备测试

- [ ] 桌面 Chrome（推荐宽度 1920px）
- [ ] 笔记本 Chrome（推荐宽度 1366px）
- [ ] 平板模式（推荐宽度 768px）
- [ ] 不同的 Chrome 主题

---

## 🐛 常见问题排查

### 问题：看不到书签
```javascript
// 检查是否加载成功
if (allBookmarks.length === 0) {
  console.warn('❌ 没有加载到书签');
  console.log('检查权限是否已授予');
}
```

### 问题：标签没有显示
```javascript
// 检查标签提取
const testBookmark = {title: 'Test #tag1 #tag2'};
const tags = testBookmark.title.match(/#(\S+)/g);
console.log('提取结果:', tags); // 应该是 ['#tag1', '#tag2']
```

### 问题：分页不工作
```javascript
// 检查分页变量
console.log('PAGE_SIZE:', PAGE_SIZE);
console.log('总书签数:', allBookmarks.length);
console.log('总页数:', Math.ceil(allBookmarks.length / PAGE_SIZE));
```

---

## 📝 测试记录模板

复制此模板记录你的测试：

```
测试日期: ____年____月____日
测试者: __________

需求 1 (新标签页): ☐ 通过 ☐ 失败 ☐ 部分通过
需求 2 (显示书签): ☐ 通过 ☐ 失败 ☐ 部分通过
需求 3 (分栏显示): ☐ 通过 ☐ 失败 ☐ 部分通过
需求 4 (标签筛选): ☐ 通过 ☐ 失败 ☐ 部分通过
需求 5 (分页显示): ☐ 通过 ☐ 失败 ☐ 部分通过
需求 6 (添加标签): ☐ 通过 ☐ 失败 ☐ 部分通过
需求 7 (提取标签): ☐ 通过 ☐ 失败 ☐ 部分通过

搜索功能: ☐ 通过 ☐ 失败
实时更新: ☐ 通过 ☐ 失败
UI 美观度: ☐ 优秀 ☐ 良好 ☐ 需改进

问题/建议:
1. 
2. 
3. 

总体评分: __/10
```

---

## ✨ 全部通过标准

所有项目都勾选 ✅ 时，插件即可投入使用！

🎉 **祝测试顺利！**
