# 青大导航 · iOS App（uni-app）

> uni-app 源码，HBuilderX 云打包 iOS。与 `mp-weixin/` 完全独立。

## 功能

- 首页：35+ 应用网格分组展示，未内置功能复制网页版链接
- 服务：官方链接组（办事大厅/邮箱/教务处/图书馆/Wiki/贴吧）
- 我的：网页版入口 + 打包说明

## iOS 打包

1. HBuilderX 打开本目录 → `manifest.json` 填 DCloud appid + iOS 证书（p12/描述文件）
2. 发行 → 原生App-云打包 → iOS(ipa)
3. 爱思助手 / AltStore / TestFlight 安装；需 `static/icon.png`（1024²）

无 `#ifdef`、无小程序语法；`uni.request`/`uni.setClipboardData` 跨端 API。
