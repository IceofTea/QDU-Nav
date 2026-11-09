// 文件路径: /qdu-nav/mp-weixin/utils/api.js
const SITE_URL = 'https://iceoftea.github.io/QDU-Nav';

function get(url, timeout = 12000) {
  return new Promise((resolve, reject) => {
    wx.request({
      url, timeout, method: 'GET',
      success: r => (r.statusCode === 200 ? resolve(r.data) : reject(new Error('HTTP ' + r.statusCode))),
      fail: reject,
    });
  });
}

/** 复制链接并提示（小程序内不可直接打开外部网页，需 web-view 业务域名） */
function openWeb(url, title) {
  wx.setClipboardData({
    data: url,
    success: () => wx.showModal({
      title: title || '网页链接',
      content: '链接已复制：\n' + url + '\n\n请在浏览器中打开。',
      showCancel: false,
    }),
  });
}

module.exports = { SITE_URL, get, openWeb };
