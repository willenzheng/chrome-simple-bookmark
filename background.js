// 监听窗口失去焦点，动态切换toolbar图标，以达到跟chrome原生图标一样的效果
chrome.windows.onFocusChanged.addListener(function (windowId) {
  chrome.tabs.query({}).then(tabs => {
    // 使用倒序遍历，提高响应速度
    for (let i = tabs.length - 1; i >= 0; i--) {
      if (tabs[i].windowId === windowId) {
        // chrome.action.setIcon({
        //   tabId: tabs[i].id,
        //   path: "img/icon_bookmark.png"
        // })
      } else {
        // chrome.action.setIcon({
        //   tabId: tabs[i].id,
        //   path: "img/icon_bookmark_gray.png"
        // })
      }
    }
  })
})