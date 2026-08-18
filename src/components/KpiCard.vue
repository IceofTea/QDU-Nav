<script setup>
/**
 * KPI 概览卡：图标 + 大数字 + 标签（+ 可选副行）
 * 供数据洞察 / 贴吧舆情 / 本站舆情 的指标卡复用。
 * value 为数字时使用 CountUp 滚动动画，字符串（如「—」/ 校区名）直接展示。
 */
import CountUp from './CountUp.vue'

defineProps({
  icon: { type: String, default: '' },
  value: { type: [Number, String], default: 0 },
  label: { type: String, default: '' },
  sub: { type: String, default: '' }
})
</script>

<template>
  <div class="panel kpi-card" style="margin:0;text-align:center;">
    <div v-if="icon" class="kpi-icon">{{ icon }}</div>
    <div class="kpi-num">
      <CountUp v-if="typeof value === 'number'" :value="value" />
      <template v-else>{{ value }}</template>
    </div>
    <div class="kpi-label">{{ label }}</div>
    <div v-if="sub" class="kpi-sub">{{ sub }}</div>
  </div>
</template>

<style scoped>
.kpi-icon { font-size: 24px; }
.kpi-num { font-size: 22px; font-weight: 800; margin: 4px 0 2px; color: var(--primary); font-variant-numeric: tabular-nums; }
.kpi-label { font-size: 12px; color: var(--text-sub); }
.kpi-sub { font-size: 12px; color: var(--text-sub); margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
</style>