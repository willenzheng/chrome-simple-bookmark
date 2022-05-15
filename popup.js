const API = {
  iconServerUrl: 'http://www.google.com/s2/favicons?domain='
}

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
      a.href = item.url

      const img = document.createElement('img')
      img.className = "item__icon"
      img.src = getIcon(getUrlHost(item.url))
      img.onerror = () => {
        img.src = '../img/icon.png'
      }

      const span = document.createElement('span')
      span.className = 'item__text'
      span.innerText = item.title

      a.appendChild(img)
      a.appendChild(span)

      div.appendChild(a)

      div.onclick = () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabList) => {
          chrome.tabs.update(tabList[0].id, {url: item.url})
          window.close()
        })
      }
    } else { // 该项为文件夹
      div.className = 'item folder'

      const subDiv = document.createElement('div')

      const img = document.createElement('img')
      img.className = "item__icon"
      img.src = '../img/icon_folder.png'

      const span = document.createElement('span')
      span.className = 'item__text'
      span.innerText = item.title

      subDiv.appendChild(img)
      subDiv.appendChild(span)

      div.appendChild(subDiv)

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

/**
 * 
 * @param {string} url 原url
 * @returns { string } 通过url获取到的域名
 */
const getUrlHost = (url) => {
  const domain = url.split('/')
  return domain[2]
}

/**
 * 获取网站的图标
 * @param { string } host 网站域名
 * @returns { string } 图标链接
 */
const getIcon = (host) => {
  return API.iconServerUrl + host
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
        }, 300)
      }, false)

      folderItem.addEventListener('mouseout', () => {
        clearTimeout(timer)
      })
    })
  })
}

