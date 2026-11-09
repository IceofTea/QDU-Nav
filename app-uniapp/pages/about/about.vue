<!-- 文件路径: /qdu-nav/app-uniapp/pages/about/about.vue -->
<template>
  <view class="page safe-bottom">
    <view class="card center">
      <view class="logo">🧭</view>
      <view class="name">青大导航</view>
      <view class="mut">v1.0.0 · 青岛大学校园服务速查</view>
    </view>

    <view class="card">
      <view class="row-item" @click="copySite">
        <text>🌐 打开网页版（复制链接）</text>
        <text class="mut">iceoftea.github.io/QDU-Nav</text>
      </view>
      <view class="row-item" @click="copyWiki">
        <text>📚 青大 Wiki</text>
        <text class="mut">iceoftea.github.io/QDU-Wiki</text>
      </view>
    </view>

    <view class="card">
      <view class="sec-title">说明</view>
      <view class="mut li">· 全量功能请用网页版（课表/空教室/绩点/食堂等35+应用）</view>
      <view class="mut li">· 官方链接均指向 qdu.edu.cn 官方站点</view>
      <view class="mut li">· 本应用不收集任何个人信息</view>
    </view>

    <view class="card">
      <view class="sec-title">iOS 打包说明（HBuilderX 云打包）</view>
      <view class="mut li">1. HBuilderX 打开本目录 → manifest.json 填 appid 与 iOS 证书</view>
      <view class="mut li">2. 发行 → 原生App-云打包 → iOS(ipa)</view>
      <view class="mut li">3. 爱思助手/AltStore/TestFlight 安装</view>
    </view>
  </view>
</template>

<script setup>
import { openWeb, SITE_URL } from '../../utils/api.js';
function copySite() { openWeb(SITE_URL, '青大导航网页版'); }
function copyWiki() { openWeb('https://iceoftea.github.io/QDU-Wiki/', '青大 Wiki'); }
</script>

<style>
.center { display: flex; flex-direction: column; align-items: center; padding: 40rpx 0; }
.logo { font-size: 72rpx; }
.name { font-size: 34rpx; font-weight: 700; margin-top: 12rpx; }
.row-item { display: flex; align-items: center; justify-content: space-between; padding: 26rpx 0; border-bottom: 1rpx solid #f0f1f5; }
.row-item:last-child { border-bottom: none; }
.row-item:active { opacity: .6; }
.sec-title { font-weight: 600; margin-bottom: 12rpx; }
.li { line-height: 1.8; }
</style>
