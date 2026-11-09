// 文件路径: /qdu-nav/mp-weixin/pages/services/services.js
const { OFFICIAL_GROUPS } = require('../../data/apps.js');
const { openWeb } = require('../../utils/api.js');

Page({
  data: { groups: OFFICIAL_GROUPS },
  onShareAppMessage() { return { title: '青大导航 · 官方服务直达', path: '/pages/services/services' }; },
  open(e) {
    const s = e.currentTarget.dataset.s;
    openWeb(s.url, s.name);
  },
});
