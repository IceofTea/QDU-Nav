// 文件路径: /qdu-nav/mp-weixin/pages/about/about.js
const { openWeb, SITE_URL } = require('../../utils/api.js');

Page({
  copySite() { openWeb(SITE_URL, '青大导航网页版'); },
  copyWiki() { openWeb('https://iceoftea.github.io/QDU-Wiki/', '青大 Wiki'); },
});
