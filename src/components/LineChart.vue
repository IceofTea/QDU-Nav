<script setup>
/** 折线图组件（SVG，无第三方依赖）：多系列折线 + 可选面积填充
 *  props: series [{ label, color, data: [v...] }], labels(横轴), height */
import { computed } from 'vue'

const props = defineProps({
  series: { type: Array, default: () => [] },
  labels: { type: Array, default: () => [] },
  height: { type: Number, default: 150 }
})
const W = 300
const pad = 10
const maxV = computed(() => Math.max(1, ...props.series.flatMap((s) => s.data.map((v) => Math.abs(v)))))
const scale = (v) => (props.height - pad * 2) * Math.abs(v) / maxV.value
function points(data) {
  if (data.length < 2) return ''
  const step = W / (data.length - 1)
  return data.map((v, i) => `${(i * step).toFixed(1)},${(props.height - pad - scale(v)).toFixed(1)}`).join(' ')
}
function areaPoints(data) {
  if (data.length < 2) return ''
  const step = W / (data.length - 1)
  const line = data.map((v, i) => `${(i * step).toFixed(1)},${(props.height - pad - scale(v)).toFixed(1)}`).join(' ')
  return `0,${props.height} ${line} ${W},${props.height}`
}
const showLabels = computed(() => props.labels.length > 4)
</script>

<template>
  <div class="line-chart">
    <svg :viewBox="`0 0 ${W} ${height}`" preserveAspectRatio="none" class="line-svg">
      <line v-for="g in [0.25, 0.5, 0.75]" :key="g" :x1="0" :x2="W" :y1="height - (height - pad * 2) * g" :y2="height - (height - pad * 2) * g" class="gridline" />
      <template v-for="s in series" :key="s.label">
        <polygon v-if="s.fill !== false" :points="areaPoints(s.data)" :fill="s.color" opacity="0.12" />
        <polyline :points="points(s.data)" :stroke="s.color" stroke-width="2" fill="none" stroke-linejoin="round" stroke-linecap="round" />
      </template>
    </svg>
    <div v-if="series.length" class="line-legend">
      <span v-for="s in series" :key="s.label" class="lg-item"><i :style="{ background: s.color }"></i>{{ s.label }}</span>
    </div>
    <div v-if="showLabels" class="line-x">
      <span v-for="(l, i) in labels" :key="i" :class="{ first: i === 0, last: i === labels.length - 1 }">{{ l }}</span>
    </div>
  </div>
</template>

<style scoped>
.line-chart { width: 100%; }
.line-svg { width: 100%; height: auto; display: block; }
.gridline { stroke: var(--border); stroke-width: 1; stroke-dasharray: 3 3; }
.line-legend { display: flex; gap: 12px; margin-top: 4px; font-size: 11px; color: var(--text-sub); flex-wrap: wrap; }
.lg-item { display: flex; align-items: center; gap: 4px; }
.lg-item i { width: 10px; height: 3px; border-radius: 2px; display: inline-block; }
.line-x { display: flex; justify-content: space-between; font-size: 9px; color: var(--text-sub); margin-top: 2px; }
.line-x span { flex: 1; }
.line-x span.first { text-align: left; }
.line-x span.last { text-align: right; }
</style>