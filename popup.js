const API = {
  // 谷歌的 favicon api 需要翻墙
  // iconServerUrl: 'http://www.google.com/s2/favicons?domain='
  iconServerUrl: 'http://beneficial-rose-seahorse.faviconkit.com/'
}

const container = document.querySelector('.container')

window.onload = function() {
  // 从浏览器获取书签数据
  chrome.bookmarks.getTree(function (bookmarkArray) {
    
    // 「书签栏」列表
    const bookmarks1 = bookmarkArray[0].children[0].children

    // 「其他书签」列表
    const bookmarks2 = bookmarkArray[0].children[1].children

    // 默认展开列表
    const bookmarks = bookmarks1.concat(bookmarks2)

    bookmarks.forEach(item => {
      item.depth = 1
    })

    renderList(bookmarks, container)
  })
}

/**
 * 渲染书签列表
 * @param { array } arr 列表数据
 * @param { string } el 容器元素
 */
const renderList = (arr, el) => {
  // 创建一个面板
  const panel = document.createElement('div')
  panel.className = "panel"
  // 面板里包含一个列表
  const list = document.createElement('div')
  list.className = 'list'
  arr.forEach((item) => {
    let div
    if (item.url) { // 该项为书签
      div = renderBookmark(item)
    } else { // 该项为文件夹
      div = renderFolder(item)
    }
    list.appendChild(div)
  })
  panel.appendChild(list)
  el.appendChild(panel)
}

/**
 * 渲染单个书签
 * @param { object } bookmark 书签
 */
const renderBookmark = (bookmark) => {
  const div = document.createElement('div')
  div.className = 'item bookmark'
  div.id = bookmark.id
  div.title = bookmark.title

  const a = document.createElement('a')
  a.href = bookmark.url

  const img = document.createElement('img')
  img.className = "item__icon"
  img.src = getIcon(getUrlHost(bookmark.url))
  // 图标图片加载成功
  img.onload = () => {
    // 移除背景颜色
    div.querySelector('.item__icon').style.background = 'none'
  }
  img.onerror = () => {
    // img.src = '../img/icon.png'
  }

  const span = document.createElement('span')
  span.className = 'item__text'
  span.innerText = bookmark.title

  a.appendChild(img)
  a.appendChild(span)

  div.appendChild(a)

  div.onclick = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabList) => {
      chrome.tabs.update(tabList[0].id, {url: bookmark.url})
      window.close()
    })
  }

  return div
}

/**
 * 渲染单个文件夹
 * @param { object } folder 文件夹
 */
const renderFolder = (folder) => {
  folder.children.forEach(item => {
    item.depth = folder.depth + 1
  })
  const div = document.createElement('div')
  div.className = 'item bookmark'
  div.id = folder.id
  div.title = folder.title

  div.className = 'item folder'

  const subDiv = document.createElement('div')

  const img = document.createElement('img')
  img.className = "item__icon"
  img.src = '../img/icon_folder.png'

  const span = document.createElement('span')
  span.className = 'item__text'
  span.innerText = folder.title

  subDiv.appendChild(img)
  subDiv.appendChild(span)

  div.appendChild(subDiv)

  div.addEventListener('click', () => {
    for (let i = container.children.length - 1; i >= 0; i--) {
      if (i >= folder.depth) {
        container.children[i].parentElement.removeChild(container.children[i])
      }
    }
    renderList(folder.children, container)
  }, false)

  let timer

  div.addEventListener('mouseover', () => {
    // 设置延迟，防止误触发
    timer = setTimeout(() => {
      for (let i = container.children.length - 1; i >= 0; i--) {
        if (i >= folder.depth) {
          container.children[i].parentElement.removeChild(container.children[i])
        }
      }
      renderList(folder.children, container)
    }, 300)
  }, false)

  div.addEventListener('mouseout', () => {
    clearTimeout(timer)
  })

  return div
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
