const container = document.querySelector('.container')
const panel = document.createElement('div')
panel.className = "panel"
container.appendChild(panel)

/**
 * 创建书签树
 * @param { array } arr 原数据
 * @param { string } el 容器元素
 */
const createTree = (arr, el) => {
  arr.forEach((item) => {
    const div = document.createElement('div')
    div.className = 'item bookmark'
    div.id = item.id
    div.title = item.title
    if (item.url) { // 该项为书签
      const a = document.createElement('a')
      a.innerText = item.title
      a.href = item.url
      div.appendChild(a)
      div.onclick = () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabList) => {
          chrome.tabs.update(tabList[0].id, {url: item.url})
        })
      }
    } else { // 该项为文件夹
      div.innerText = item.title
      div.className = 'item folder'
      // 创建新panel
      const panel = document.createElement('div')
      panel.className = 'panel'
      panel.setAttribute('data-parent-id', item.id)
      panel.style.display = 'none'
      container.appendChild(panel)
      createTree(item.children, panel)
    }
    el.appendChild(div)
  })
}

// 文件夹面板列表（不包括默认的第一个）
let panelList = []

/**
 * 切换面板
 * @param { HTMLElement } trigger 触发的元素
 */
const togglePanel = (trigger) => {
  const parentId = trigger.parentElement.getAttribute('data-parent-id')
  if (parentId === null) { // 点击的元素所属的面板是第一个
    panelList.forEach(item => {
      item.style.display = 'none'
    })
    panelList = []
  } else { // 点击的元素所属的面板不是第一个
    let index = 0
    for (let i = 0; i < panelList.length; i++) {
      const panelId = panelList[i].getAttribute('data-parent-id')
      if (panelId === parentId) {
        index = i
        break
      }
    }
    const popList = panelList.splice(index + 1)
    popList.forEach(popItem => {
      popItem.style.display = 'none'
    })
  }
  const panel = document.querySelector(`div[data-parent-id='${trigger.id}']`)
  if (panel) {
    panelList.push(panel)
  } 
  if (panelList.length > 0) {
    panelList.forEach(item => {
      item.style.display = 'block'
    })
  }
}

window.onload = function() {
  chrome.bookmarks.getTree(function (bookmarkArray) {
    console.log('%c [ bookmarkArray ]-82', 'font-size:13px; background:pink; color:#bf2c9f;', bookmarkArray)
    createTree(bookmarkArray[0].children[0].children, panel)
    createTree(bookmarkArray[0].children[1].children, panel)
    const folderArr = document.querySelectorAll('.item')
    folderArr.forEach((folderItem) => {
      folderItem.addEventListener('click', () => {
        togglePanel(folderItem)
      }, false)

      let timer

      folderItem.addEventListener('mouseover', () => {
        // 设置延迟，防止误触发
        timer = setTimeout(() => {
          togglePanel(folderItem)
        }, 500)
      }, false)

      folderItem.addEventListener('mouseout', () => {
        clearTimeout(timer)
      })
    })
  })
}

