let allBookmarks = [];
// 支持多选标签，selectedTags=[] 表示全部书签
let selectedTags = [];
let currentPage = 1;
let searchQuery = '';
const PAGE_SIZE = 12;
const UNTAGGED_TAG = '__untagged__';

// 当前已有标签集合，用于输入提示
let uniqueTags = [];

// 编辑相关
let editingBookmark = null;
let currentTheme = 'light';

function applyTheme(theme) {
  currentTheme = theme;
  document.body.setAttribute('data-theme', theme);
  const toggle = document.getElementById('theme-toggle');
  if (toggle) {
    toggle.textContent = theme === 'dark' ? '☀️ 亮色模式' : '🌙 深色模式';
    toggle.setAttribute('aria-label', theme === 'dark' ? '切换到亮色模式' : '切换到深色模式');
  }
  localStorage.setItem('bookmark-theme', theme);
}

function toggleTheme() {
  applyTheme(currentTheme === 'dark' ? 'light' : 'dark');
}

function bindThemeToggle() {
  const toggle = document.getElementById('theme-toggle');
  if (toggle) {
    toggle.addEventListener('click', toggleTheme);
  }
}

/**
 * 初始化插件
 */
async function init() {
  try {
    const savedTheme = localStorage.getItem('bookmark-theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme(savedTheme || (prefersDark ? 'dark' : 'light'));

    const tree = await chrome.bookmarks.getTree();
    allBookmarks = flattenBookmarks(tree);
    
    renderTags();
    renderBookmarks();
    
    // 绑定搜索事件
    document.getElementById('search-input').addEventListener('input', onSearchChange);

    // 绑定主题切换事件
    bindThemeToggle();
    
    // 绑定编辑模态框事件
    bindEditModalEvents();
    
    // 绑定书签卡片事件（只绑定一次）
    if (!window._bookmarkEventsBinding) {
      bindBookmarkCardEvents();
      window._bookmarkEventsBinding = true;
    }
    
  } catch (error) {
    console.error('初始化失败:', error);
  }
}

/**
 * 绑定编辑模态框事件
 */
function bindEditModalEvents() {
  const modal = document.getElementById('edit-modal');
  const cancelBtn = document.getElementById('edit-cancel');
  const saveBtn = document.getElementById('edit-save');
  const input = document.getElementById('edit-input');
  
  cancelBtn.onclick = closeEditModal;
  saveBtn.onclick = saveBookmarkName;
  
  // ESC 键关闭模态框
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('active')) {
      closeEditModal();
    }
  });
  
  // 点击模态框外部关闭
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeEditModal();
    }
  });
  
  // Enter 键保存
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      saveBookmarkName();
    }
  });
}

/**
 * 打开编辑模态框
 */
function openEditModal(bookmark) {
  editingBookmark = bookmark;
  const input = document.getElementById('edit-input');
  input.value = bookmark.title;
  document.getElementById('edit-modal').classList.add('active');
  input.focus();
  input.select();
}

/**
 * 关闭编辑模态框
 */
function closeEditModal() {
  document.getElementById('edit-modal').classList.remove('active');
  editingBookmark = null;
}

/**
 * 保存书签名称
 */
async function saveBookmarkName() {
  if (!editingBookmark) return;
  
  const newName = document.getElementById('edit-input').value.trim();
  
  if (!newName) {
    alert('书签名称不能为空');
    return;
  }
  
  if (newName === editingBookmark.title) {
    closeEditModal();
    return;
  }
  
  try {
    // 更新书签名称到浏览器
    await chrome.bookmarks.update(editingBookmark.id, { title: newName });
    
    // 关闭模态框
    closeEditModal();
    
    // 重新初始化（自动触发 onChanged 监听器，但为了保险再调用一次）
    await init();
  } catch (error) {
    console.error('保存书签失败:', error);
    alert('保存书签失败: ' + error.message);
  }
}

/**
 * 递归展开所有书签并解析标签
 * 标签格式：在书签标题后添加 #标签名
 */
function flattenBookmarks(nodes) {
  let items = [];
  for (let node of nodes) {
    // 只处理有URL的节点（实际书签）
    if (node.url) {
      // 从标题中提取 #标签，支持紧贴书写如 #a#b
      // 正则匹配 "#" 后面不是空白与"#"的连续字符
      const tags = node.title.match(/#([^#\s]+)/g) || [];
      items.push({
        ...node,
        cleanTitle: node.title.replace(/#([^#\s]+)/g, '').trim(),
        tags: tags.map(t => t.substring(1)) // 移除 #
      });
    }
    // 递归处理子节点
    if (node.children) {
      items = items.concat(flattenBookmarks(node.children));
    }
  }
  return items;
}

/**
 * 获取过滤后的书签列表
 */
function getFilteredBookmarks() {
  let filtered = allBookmarks;
  
  // 按标签过滤（多选）
  if (selectedTags.length > 0) {
    if (selectedTags.includes(UNTAGGED_TAG)) {
      filtered = filtered.filter(bm => bm.tags.length === 0);
    } else {
      // 若选择多个标签，取交集：书签必须包含所有选中标签
      filtered = filtered.filter(bm =>
        selectedTags.every(tag => bm.tags.includes(tag))
      );
    }
  }
  
  // 按搜索词过滤
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(bm => 
      bm.cleanTitle.toLowerCase().includes(q) ||
      bm.tags.some(tag => tag.toLowerCase().includes(q)) ||
      bm.url.toLowerCase().includes(q)
    );
  }
  
  return filtered;
}

/**
 * 渲染左侧标签栏
 */
function renderTags() {
  const tagCounts = {};
  
  // 统计每个标签的书签数
  allBookmarks.forEach(bm => {
    bm.tags.forEach(tag => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });
  });

  const tagList = document.getElementById('tag-list');
  
  // 清空现有标签
  const existingTags = tagList.querySelectorAll('.tag-item:not([data-tag="all"])');
  existingTags.forEach(el => el.remove());
  
  // 创建或更新"全部书签"项
  let allTag = tagList.querySelector('[data-tag="all"]');
  if (!allTag) {
    allTag = document.createElement('li');
    allTag.className = 'tag-item';
    allTag.dataset.tag = 'all';
    allTag.addEventListener('click', (e) => {
      toggleTagSelection('all', allTag, e);
    });
    tagList.insertBefore(allTag, tagList.firstChild);
  }
  
  // 更新全部书签计数和激活状态
  allTag.innerHTML = `<span>全部书签</span><small>${allBookmarks.length}</small>`;
  if (selectedTags.length === 0) {
    allTag.classList.add('active');
  } else {
    allTag.classList.remove('active');
  }

  // 无标签书签项
  const untaggedCount = allBookmarks.filter(bm => bm.tags.length === 0).length;
  let untaggedTag = tagList.querySelector(`[data-tag="${UNTAGGED_TAG}"]`);
  if (!untaggedTag) {
    untaggedTag = document.createElement('li');
    untaggedTag.className = 'tag-item';
    untaggedTag.dataset.tag = UNTAGGED_TAG;
    untaggedTag.addEventListener('click', (e) => {
      toggleTagSelection(UNTAGGED_TAG, untaggedTag, e);
    });
    tagList.insertBefore(untaggedTag, tagList.children[1] || null);
  }
  untaggedTag.innerHTML = `<span>无标签</span><small>${untaggedCount}</small>`;
  if (selectedTags.includes(UNTAGGED_TAG)) {
    untaggedTag.classList.add('active');
  } else {
    untaggedTag.classList.remove('active');
  }
  
  // 按字母顺序添加标签
  Object.keys(tagCounts)
    .sort()
    .forEach(tag => {
      const li = document.createElement('li');
      li.className = 'tag-item';
      li.dataset.tag = tag;
      li.innerHTML = `<span>#${tag}</span><small>${tagCounts[tag]}</small>`;
      li.onclick = (e) => toggleTagSelection(tag, li, e);
      li.oncontextmenu = (e) => {
        e.preventDefault();
        showTagContextMenu(tag, e.clientX, e.clientY);
      };
      if (selectedTags.includes(tag)) {
        li.classList.add('active');
      }
      tagList.appendChild(li);
    });
  
  // 更新标签数量显示（包含“无标签”项）
  document.getElementById('tag-count').textContent = Object.keys(tagCounts).length + 1;
  
  // 更新 suggestions 列表
  uniqueTags = Object.keys(tagCounts).sort();
  renderTagSuggestions();
}

/**
 * 选中标签
 */
/**
 * 切换标签选中状态或清空全部
 */
function toggleTagSelection(tag, element, event) {
  const allTagEl = document.querySelector('.tag-item[data-tag="all"]');
  const multiSelect = event && (event.ctrlKey || event.metaKey);

  if (tag === 'all') {
    // 选中全部书签
    selectedTags = [];
    document.querySelectorAll('.tag-item').forEach(el => el.classList.remove('active'));
    if (allTagEl) allTagEl.classList.add('active');
  } else {
    if (multiSelect) {
      if (allTagEl) allTagEl.classList.remove('active');
      const idx = selectedTags.indexOf(tag);
      if (idx === -1) {
        selectedTags.push(tag);
        element.classList.add('active');
      } else {
        selectedTags.splice(idx, 1);
        element.classList.remove('active');
      }
      if (selectedTags.length === 0 && allTagEl) {
        allTagEl.classList.add('active');
      }
    } else {
      selectedTags = [tag];
      document.querySelectorAll('.tag-item').forEach(el => el.classList.remove('active'));
      if (element) element.classList.add('active');
      if (allTagEl) allTagEl.classList.remove('active');
    }
  }

  currentPage = 1;
  searchQuery = '';
  document.getElementById('search-input').value = '';
  renderBookmarks();
}

/**
 * 搜索输入变化
 */
function onSearchChange(e) {
  searchQuery = e.target.value;
  currentPage = 1;
  renderBookmarks();
}

/**
 * 渲染右侧书签列表（带分页）
 */
function renderBookmarks() {
  const filtered = getFilteredBookmarks();
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageData = filtered.slice(start, start + PAGE_SIZE);

  // 更新标题
  if (searchQuery.trim()) {
    document.getElementById('content-title').textContent = `搜索结果: "${searchQuery}"`;
  } else if (selectedTags.length === 0) {
    document.getElementById('content-title').textContent = '全部书签';
  } else {
    document.getElementById('content-title').textContent = `标签: ${selectedTags.map(t => t === UNTAGGED_TAG ? '无标签' : `#${t}`).join(', ')}`;
  }
  
  // 更新结果计数
  document.getElementById('result-count').textContent = `${filtered.length} 个书签`;
  
  const container = document.getElementById('bookmark-list');
  const emptyState = document.getElementById('empty-state');
  
  if (pageData.length === 0) {
    container.style.display = 'none';
    emptyState.style.display = 'flex';
    document.getElementById('pagination').innerHTML = '';
    return;
  }
  
  container.style.display = 'grid';
  emptyState.style.display = 'none';
  
  container.innerHTML = pageData.map(bm => `
    <div class="bm-card">
      <a href="${escapeHtml(bm.url)}" class="bm-title" target="_self" title="${escapeHtml(bm.cleanTitle)}">${escapeHtml(bm.cleanTitle)}</a>
      <div class="bm-tags">
        ${bm.tags.map(t => `<span class="tag-pill" data-tag="${escapeHtml(t)}" data-bmid="${bm.id}" role="button" title="点击筛选此标签">#${escapeHtml(t)}<span class="tag-remove" title="删除标签">×</span></span>`).join('')}
        <input type="text" class="tag-input" placeholder="+标签" list="tag-suggestions" data-bookmark-id="${bm.id}">
      </div>
      <div class="bm-url" title="${escapeHtml(bm.url)}">${escapeHtml(bm.url)}</div>
    </div>
  `).join('');

  renderPagination(filtered.length);
}

/**
 * 从标签丸中选择标签
 */
function selectTagFromPill(tag, event) {
  event.preventDefault();
  event.stopPropagation();
  
  // 找到对应的标签元素
  const tagElement = document.querySelector(`.tag-item[data-tag="${tag}"]`);
  if (tagElement) {
    toggleTagSelection(tag, tagElement);
  }
}

/**
 * render datalist options for tag suggestions
 */
function renderTagSuggestions() {
  const list = document.getElementById('tag-suggestions');
  if (!list) return;
  list.innerHTML = uniqueTags.map(t => `<option value="${t}">`).join('');
}

/**
 * 为书签卡片中的交互元素绑定事件处理器（事件委托）
 */
function bindBookmarkCardEvents() {
  const container = document.getElementById('bookmark-list');
  if (!container) return;

  // 委托处理书签标题点击事件
  container.addEventListener('click', (e) => {
    const titleLink = e.target.closest('.bm-title');
    if (titleLink) {
      e.preventDefault();
      const url = titleLink.getAttribute('href');
      if (url) {
        window.location.assign(url);
      }
    }
  });

  // 委托处理 tag-pill 点击事件
  container.addEventListener('click', (e) => {
    if (e.target.classList.contains('tag-pill')) {
      const tag = e.target.dataset.tag;
      const tagElement = document.querySelector(`.tag-item[data-tag="${CSS.escape(tag)}"]`);
      if (tagElement) {
        e.preventDefault();
        e.stopPropagation();
        toggleTagSelection(tag, tagElement);
      }
    }
  });

  // 卡片右键菜单展示
  container.addEventListener('contextmenu', (e) => {
    const card = e.target.closest('.bm-card');
    if (card) {
      e.preventDefault();
      const urlEl = card.querySelector('.bm-url');
      const url = urlEl ? urlEl.textContent : '';
      showCardContextMenu(url, e.clientX, e.clientY);
    }
  });

  // 委托处理 tag-input 键盘事件
  container.addEventListener('keydown', (e) => {
    if (e.target.classList.contains('tag-input')) {
      const bookmarkId = e.target.dataset.bookmarkId;
      tagInputKey(e, bookmarkId);
    }
  });

  // 委托处理 tag-input 失焦保存
  container.addEventListener('focusout', (e) => {
    if (e.target.classList.contains('tag-input')) {
      const input = e.target;
      const bookmarkId = input.dataset.bookmarkId;
      saveTagInputOnBlur(input, bookmarkId);
    }
  });

  // 委托处理标签删除点击
  container.addEventListener('click', (e) => {
    if (e.target.classList.contains('tag-remove')) {
      e.stopPropagation();
      const pill = e.target.closest('.tag-pill');
      const tag = pill.dataset.tag;
      const bmid = pill.dataset.bmid;
      removeTagFromBookmark(bmid, tag);
    }
  });
}

/**
 * 在输入框中按键
 */
function tagInputKey(e, bookmarkId) {
  const input = e.target;

  // Tab: 阻止默认跳转，尝试补全，然后在 keyup 时触发添加
  if (e.key === 'Tab') {
    e.preventDefault();
    const val = input.value.trim();
    if (val) {
      const match = uniqueTags.find(t =>
        t.toLowerCase().startsWith(val.toLowerCase())
      );
      if (match) {
        input.value = match;
      }
    }
    return;
  }

  // Enter: 先预防默认（避免换行/提交），实际添加在稍后执行以确保
  // datalist 选择或其他 auto-fill 已经更新了 input.value.
  if (e.key === 'Enter') {
    e.preventDefault();
    setTimeout(() => {
      saveTagInputOnBlur(input, bookmarkId);
    }, 0);
  }
}

function saveTagInputOnBlur(input, bookmarkId) {
  const val = input.value.trim();
  if (!val) return;
  addTagToBookmark(bookmarkId, val);
  input.value = '';
}

/**
 * 显示标签右键菜单
 */
function showTagContextMenu(tag, x, y) {
  // 移除已存在的菜单
  const existing = document.querySelector('.tag-context-menu');
  if (existing) existing.remove();

  const menu = document.createElement('div');
  menu.className = 'tag-context-menu';
  menu.style.left = x + 'px';
  menu.style.top = y + 'px';

  const renameItem = document.createElement('div');
  renameItem.className = 'tag-context-menu-item';
  renameItem.textContent = '重命名';
  renameItem.onclick = () => {
    menu.remove();
    renameTag(tag);
  };

  const deleteItem = document.createElement('div');
  deleteItem.className = 'tag-context-menu-item danger';
  deleteItem.textContent = '删除';
  deleteItem.onclick = () => {
    menu.remove();
    deleteTag(tag);
  };

  menu.appendChild(renameItem);
  menu.appendChild(deleteItem);
  document.body.appendChild(menu);

  // 点击其他地方关闭菜单
  const closeMenu = () => {
    menu.remove();
    document.removeEventListener('click', closeMenu);
  };
  setTimeout(() => {
    document.addEventListener('click', closeMenu);
  }, 0);
}

/**
 * 显示书签卡片右键菜单（显示网址）
 */
function showCardContextMenu(url, x, y) {
  const existing = document.querySelector('.card-context-menu');
  if (existing) existing.remove();

  const menu = document.createElement('div');
  menu.className = 'card-context-menu';
  menu.style.left = x + 'px';
  menu.style.top = y + 'px';

  const item = document.createElement('div');
  item.className = 'card-context-menu-item';
  item.textContent = url || '(无网址)';
  menu.appendChild(item);
  document.body.appendChild(menu);

  const closeMenu = () => {
    menu.remove();
    document.removeEventListener('click', closeMenu);
  };
  setTimeout(() => {
    document.addEventListener('click', closeMenu);
  }, 0);
}

/**
 * 重命名标签
 */
async function renameTag(oldTag) {
  const newTag = prompt(`重命名标签：\n旧标签: #${oldTag}`, oldTag);
  if (!newTag || newTag === oldTag) return;
  if (!newTag.trim()) {
    alert('标签名不能为空');
    return;
  }

  const trimmedTag = newTag.trim();
  
  // 找到所有包含该标签的书签
  const bookmarksToUpdate = allBookmarks.filter(bm => bm.tags.includes(oldTag));
  
  try {
    for (const bm of bookmarksToUpdate) {
      const newTags = bm.tags.map(t => t === oldTag ? trimmedTag : t);
      const newTitle = bm.cleanTitle + (newTags.length > 0 ? ' ' + newTags.map(t => `#${t}`).join(' ') : '');
      await chrome.bookmarks.update(bm.id, { title: newTitle });
    }
    // 重新初始化以刷新UI
    await init();
  } catch (err) {
    console.error('重命名标签失败', err);
    alert('重命名标签失败: ' + err.message);
  }
}

/**
 * 删除标签
 */
async function deleteTag(tag) {
  if (!confirm(`确认删除标签 #${tag} 吗？\n这会从所有书签中移除该标签，但不会删除书签本身。`)) {
    return;
  }

  // 找到所有包含该标签的书签
  const bookmarksToUpdate = allBookmarks.filter(bm => bm.tags.includes(tag));
  
  try {
    for (const bm of bookmarksToUpdate) {
      const newTags = bm.tags.filter(t => t !== tag);
      const newTitle = bm.cleanTitle + (newTags.length > 0 ? ' ' + newTags.map(t => `#${t}`).join(' ') : '');
      await chrome.bookmarks.update(bm.id, { title: newTitle });
    }
    // 重新初始化以刷新UI
    await init();
  } catch (err) {
    console.error('删除标签失败', err);
    alert('删除标签失败: ' + err.message);
  }
}

/**
 * 为指定书签新增标签并同步到浏览器
 */
async function addTagToBookmark(id, tag) {
  tag = tag.replace(/^#+/, ''); // 去掉额外的#
  const bm = allBookmarks.find(b => b.id === id);
  if (!bm) return;
  if (bm.tags.includes(tag)) return;

  const newTitle = `${bm.title.trim()} #${tag}`;
  try {
    await chrome.bookmarks.update(id, { title: newTitle });
    bm.title = newTitle;
    bm.tags.push(tag);
    bm.cleanTitle = bm.title.replace(/#([^#\s]+)/g, '').trim();
    if (!uniqueTags.includes(tag)) {
      uniqueTags.push(tag);
      uniqueTags.sort();
    }
    renderTags();
    renderBookmarks();
  } catch (err) {
    console.error('添加标签失败', err);
  }
}

/**
 * 从指定书签移除标签并同步
 */
async function removeTagFromBookmark(id, tag) {
  const bm = allBookmarks.find(b => b.id === id);
  if (!bm) return;
  if (!bm.tags.includes(tag)) return;

  const newTags = bm.tags.filter(t => t !== tag);
  const newTitle = bm.cleanTitle + (newTags.length > 0 ? ' ' + newTags.map(t => `#${t}`).join(' ') : '');
  try {
    await chrome.bookmarks.update(id, { title: newTitle });
    // update local copy
    bm.title = newTitle;
    bm.tags = newTags;
    bm.cleanTitle = bm.title.replace(/#([^#\s]+)/g, '').trim();
    renderTags();
    renderBookmarks();
  } catch (err) {
    console.error('删除书签标签失败', err);
  }
}

/**
 * 渲染分页控件
 */
function renderPagination(total) {
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const pagEl = document.getElementById('pagination');
  pagEl.innerHTML = '';
  
  if (totalPages <= 1) {
    return;
  }
  
  // 上一页按钮
  if (currentPage > 1) {
    const prevBtn = document.createElement('button');
    prevBtn.textContent = '← 上一页';
    prevBtn.onclick = () => {
      currentPage--;
      renderBookmarks();
      window.scrollTo(0, 0);
    };
    pagEl.appendChild(prevBtn);
  }
  
  // 页码按钮
  const maxButtons = 7;
  let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
  let endPage = Math.min(totalPages, startPage + maxButtons - 1);
  
  if (endPage - startPage < maxButtons - 1) {
    startPage = Math.max(1, endPage - maxButtons + 1);
  }
  
  if (startPage > 1) {
    const firstBtn = document.createElement('button');
    firstBtn.textContent = '1';
    firstBtn.onclick = () => {
      currentPage = 1;
      renderBookmarks();
      window.scrollTo(0, 0);
    };
    pagEl.appendChild(firstBtn);
    
    if (startPage > 2) {
      const dots = document.createElement('span');
      dots.textContent = '...';
      dots.style.padding = '8px 4px';
      pagEl.appendChild(dots);
    }
  }
  
  for (let i = startPage; i <= endPage; i++) {
    const btn = document.createElement('button');
    btn.textContent = i;
    if (i === currentPage) {
      btn.className = 'active';
    }
    btn.onclick = () => {
      currentPage = i;
      renderBookmarks();
      window.scrollTo(0, 0);
    };
    pagEl.appendChild(btn);
  }
  
  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      const dots = document.createElement('span');
      dots.textContent = '...';
      dots.style.padding = '8px 4px';
      pagEl.appendChild(dots);
    }
    
    const lastBtn = document.createElement('button');
    lastBtn.textContent = totalPages;
    lastBtn.onclick = () => {
      currentPage = totalPages;
      renderBookmarks();
      window.scrollTo(0, 0);
    };
    pagEl.appendChild(lastBtn);
  }
  
  // 下一页按钮
  if (currentPage < totalPages) {
    const nextBtn = document.createElement('button');
    nextBtn.textContent = '下一页 →';
    nextBtn.onclick = () => {
      currentPage++;
      renderBookmarks();
      window.scrollTo(0, 0);
    };
    pagEl.appendChild(nextBtn);
  }
}

/**
 * HTML转义函数，防止XSS
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// 监听书签变化，实时更新
chrome.bookmarks.onChanged.addListener((id, changes) => {
  init();
});

chrome.bookmarks.onCreated.addListener((id, bookmark) => {
  init();
});

chrome.bookmarks.onRemoved.addListener((id, removeInfo) => {
  init();
});

// 初始化应用
init();