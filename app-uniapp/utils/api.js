// 文件路径: /qdu-nav/app-uniapp/utils/api.js
// 青大导航 App 数据接口
export const SITE_URL = 'https://iceoftea.github.io/QDU-Nav';

/** 通用 GET（uni.request 封装）；失败 reject */
export function get(url, timeout = 12000) {
  return new Promise((resolve, reject) => {
    uni.request({
      url, timeout, method: 'GET',
      success: r => (r.statusCode === 200 ? resolve(r.data) : reject(new Error('HTTP ' + r.statusCode))),
      fail: reject,
    });
  });
}

/** 复制链接并在 App 内提示（MP 内不可直接打开外部网页） */
export function openWeb(url, title) {
  uni.setClipboardData({
    data: url,
    success: () => uni.showModal({
      title: title || '网页链接',
      content: '链接已复制：\n' + url + '\n\n请在浏览器中打开。',
      showCancel: false,
    }),
  });
}
