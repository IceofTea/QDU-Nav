<!-- 文件路径: /qdu-nav/app-uniapp/pages/index/index.vue -->
<template>
  <view class="page safe-bottom">
    <view class="hero">
      <view class="hero-title">青大导航</view>
      <view class="hero-sub">青岛大学 · 校园服务速查</view>
    </view>

    <view v-for="g in groups" :key="g.group" class="card">
      <view class="g-title">{{ g.group }}</view>
      <view class="grid">
        <view v-for="a in g.apps" :key="a.id" class="cell" @click="open(a)">
          <view class="ic" :style="{ background: a.color + '18', color: a.color }">{{ a.icon }}</view>
          <text class="t">{{ a.title }}</text>
          <text class="d" v-if="a.desc">{{ a.desc }}</text>
        </view>
      </view>
    </view>

    <view class="foot mut">本端内置功能直接打开，其余复制网页版链接后浏览器访问</view>
  </view>
</template>

<script setup>
import { APP_GROUPS } from '../../data/apps.js';
import { openWeb, SITE_URL } from '../../utils/api.js';

const groups = APP_GROUPS;
function open(a) {
  if (a.native && a.tab) { uni.switchTab({ url: a.tab }); return; }
  openWeb(SITE_URL + a.url, a.title);
}
</script>

<style>
.hero { background: linear-gradient(135deg, #1b66c9, #3b82f6); color: #fff; padding: 48rpx 32rpx 36rpx; }
.hero-title { font-size: 44rpx; font-weight: 700; }
.hero-sub { opacity: .85; margin-top: 8rpx; font-size: 26rpx; }
.g-title { font-size: 30rpx; font-weight: 600; margin-bottom: 18rpx; }
.grid { display: flex; flex-wrap: wrap; }
.cell { width: 33.33%; padding: 18rpx 8rpx; box-sizing: border-box; display: flex; flex-direction: column; align-items: center; }
.cell:active { opacity: .6; }
.ic { width: 88rpx; height: 88rpx; border-radius: 24rpx; display: flex; align-items: center; justify-content: center; font-size: 44rpx; }
.t { margin-top: 12rpx; font-size: 26rpx; font-weight: 500; }
.d { font-size: 20rpx; color: #8a8f99; margin-top: 4rpx; }
.foot { text-align: center; padding: 30rpx 40rpx; }
</style>
