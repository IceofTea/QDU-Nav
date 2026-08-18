<script setup>
/**
 * 横向条形图行（两行式：标签+数值在上、渐变条在下）
 * 供数据洞察 / 生活费支出构成等统计面板复用，消除各页重复的内联样式。
 * props：
 *   label 左侧名称；value 数值；max 最大值（决定条宽比例）；
 *   text  右侧展示文本（缺省显示 value）；color 渐变条 CSS 值。
 */
defineProps({
  label: { type: String, default: '' },
  value: { type: Number, default: 0 },
  max: { type: Number, default: 1 },
  text: { type: String, default: '' },
  color: { type: String, default: 'linear-gradient(90deg, #1b66c9, #3b82f6)' }
})
</script>

<template>
  <div class="bar-row">
    <div class="br-head">
      <span class="br-label">{{ label }}</span>
      <span class="br-val">{{ text || value }}</span>
    </div>
    <div class="br-track"><i :style="{ width: Math.min(100, Math.round((value / max) * 100)) + '%', background: color }"></i></div>
  </div>
</template>

<style scoped>
.bar-row { margin-bottom: 8px; }
.br-head { display: flex; justify-content: space-between; align-items: baseline; font-size: 12px; margin-bottom: 2px; }
.br-label { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.br-val { flex: none; color: var(--text-sub); }
.br-track { height: 12px; background: var(--bar); border-radius: 8px; overflow: hidden; }
.br-track i { display: block; height: 100%; border-radius: 8px; }
</style>