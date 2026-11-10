<!-- 文件路径: /qdu-nav/app-uniapp/pages/services/services.vue -->
<template>
  <view class="page safe-bottom">
    <view v-for="g in groups" :key="g.name" class="card">
      <view class="g-title">{{ g.icon }} {{ g.name }}</view>
      <view v-for="s in g.sites" :key="s.name" class="site" @click="open(s)">
        <view class="s-body">
          <view class="row">
            <text class="s-name">{{ s.name }}</text>
            <text class="badge" v-if="s.featured">常用</text>
          </view>
          <text class="s-desc">{{ s.desc }}</text>
          <text class="s-url">{{ s.url }}</text>
        </view>
        <text class="s-arrow">›</text>
      </view>
    </view>
    <view class="foot mut">点击复制链接后浏览器打开</view>
  </view>
</template>

<script setup>
import { OFFICIAL_GROUPS } from '../../data/apps.js';
import { openWeb } from '../../utils/api.js';

const groups = OFFICIAL_GROUPS;
function open(s) { openWeb(s.url, s.name); }
</script>

<style>
.g-title { font-size: 30rpx; font-weight: 600; margin-bottom: 10rpx; }
.site { display: flex; align-items: center; padding: 20rpx 0; border-top: 1rpx solid #f0f1f5; }
.site:active { opacity: .6; }
.s-body { flex: 1; }
.row { display: flex; align-items: center; }
.s-name { font-size: 28rpx; font-weight: 500; }
.badge { font-size: 18rpx; color: #b45309; background: #fef3c7; border-radius: 999rpx; padding: 2rpx 12rpx; margin-left: 10rpx; }
.s-desc { display: block; font-size: 22rpx; color: #8a8f99; margin-top: 4rpx; }
.s-url { display: block; font-size: 20rpx; color: #1b66c9; margin-top: 2rpx; }
.s-arrow { color: #c0c4cc; font-size: 36rpx; }
.foot { text-align: center; padding: 30rpx; }
</style>
