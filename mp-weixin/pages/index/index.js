// 文件路径: /qdu-nav/mp-weixin/pages/index/index.js
const { APP_GROUPS } = require('../../data/apps.js');
const { openWeb, SITE_URL } = require('../../utils/api.js');

Page({
  data: { groups: APP_GROUPS },
  open(e) {
    const a = e.currentTarget.dataset.app;
    if (a.native && a.tab) { wx.switchTab({ url: a.tab }); return; }
    openWeb(SITE_URL + a.url, a.title);
  },
});
