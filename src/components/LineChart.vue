<script setup>
/** 折线图组件（SVG，无第三方依赖）：多系列折线 + 可选面积填充
 *  props: series [{ label, color, data: [v...] }], labels(横轴), height
 *  鼠标悬浮或点击可查看各节点具体数据；窄屏限宽居中。 */
import { ref, computed } from 'vue'

const props = defineProps({
  series: { type: Array, default: () => [] },
  labels: { type: Array, default: () => [] },
  height: { type: Number, default: 150 }
})
const W = 300
const pad = 10
const maxV = computed(() => Math.max(1, ...props.series.flatMap((s) => s.data.map((v) => Math.abs(v)))))
const scale = (v) => (props.height - pad * 2) * Math.abs(v) / maxV.value
function xAt(i) {
  const n = props.series[0] ? props.series[0].data.length : 0
  return n < 2 ? W / 2 : i * (W / (n - 1))
}
function yAt(v) {
  return props.height - pad - scale(v)
}
function points(data) {
  if (data.length < 2) return ''
  return data.map((v, i) => `${xAt(i).toFixed(1)},${yAt(v).toFixed(1)}`).join(' ')
}
function areaPoints(data) {
  if (data.length < 2) return ''
  return `0,${props.height} ${points(data)} ${W},${props.height}`
}
const showLabels = computed(() => props.labels.length > 4)

/* 交互：悬浮/点击查看节点数据 */
const hoverIdx = ref(-1)
const pinned = ref(-1)
const totalN = computed(() => (props.series[0] ? props.series[0].data.length : 0))
function updateIdx(e) {
  const rect = e.currentTarget.getBoundingClientRect()
  const x = (e.clientX - rect.left) / rect.width * W
  const idx = Math.round(x / W * (totalN.value - 1))
  hoverIdx.value = Math.max(0, Math.min(totalN.value - 1, idx))
}
const shown = computed(() => (pinned.value >= 0 ? pinned.value : hoverIdx.value))
const tip = computed(() => {
  const i = shown.value
  if (i < 0 || !props.series.length) return null
  return {
    label: props.labels[i] != null ? props.labels[i] : '',
    rows: props.series.map((s) => ({ label: s.label, color: s.color, v: s.data[i] != null ? s.data[i] : 0 }))
  }
})
const fmt = (n) => (n % 1 === 0 ? String(n) : n.toFixed(2))
</script>

<template>
  <div class="line-chart">
    <svg :viewBox="`0 0 ${W} ${height}`" preserveAspectRatio="none" class="line-svg" @mousemove="updateIdx" @mouseleave="hoverIdx = -1" @click="pinned = shown >= 0 ? shown : -1">
      <line v-for="g in [0.25, 0.5, 0.75]" :key="g" :x1="0" :x2="W" :y1="height - (height - pad * 2) * g" :y2="height - (height - pad * 2) * g" class="gridline" />
      <template v-for="s in series" :key="s.label">
        <polygon v-if="s.fill !== false" :points="areaPoints(s.data)" :fill="s.color" opacity="0.12" />
        <polyline :points="points(s.data)" :stroke="s.color" stroke-width="2" fill="none" stroke-linejoin="round" stroke-linecap="round" />
        <circle
          v-for="(v, i) in s.data"
          :key="i"
          :cx="xAt(i)"
          :cy="yAt(v)"
          r="3"
          :fill="s.color"
          class="pt"
          :class="{ hi: shown === i }"
        />
      </template>
    </svg>
    <div v-if="tip" class="line-tip">
      <b>{{ tip.label }}</b>
      <div v-for="t in tip.rows" :key="t.label" class="tip-row">
        <i :style="{ background: t.color }"></i>
        {{ t.label }} ¥{{ fmt(t.v) }}
      </div>
    </div>
    <div v-if="series.length" class="line-legend">
      <span v-for="s in series" :key="s.label" class="lg-item"><i :style="{ background: s.color }"></i>{{ s.label }}</span>
    </div>
    <div v-if="showLabels" class="line-x">
      <span v-for="(l, i) in labels" :key="i" :class="{ first: i === 0, last: i === labels.length - 1 }">{{ l }}</span>
    </div>
  </div>
</template>

<style scoped>
.line-chart { width: 100%; max-width: 620px; margin: 0 auto; }
.line-svg { width: 100%; height: auto; display: block; cursor: crosshair; }
.gridline { stroke: var(--border); stroke-width: 1; stroke-dasharray: 3 3; }
.pt { opacity: 0; transition: opacity 0.15s, r 0.15s; }
.pt.hi { opacity: 1; r: 4.5; }
.line-tip {
  margin-top: 6px;
  padding: 8px 10px;
  border-radius: 10px;
  background: var(--primary-soft);
  border: 1px solid var(--border);
  font-size: 12px;
  color: var(--text);
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.tip-row { display: flex; align-items: center; gap: 6px; font-weight: 700; }
.tip-row i { width: 10px; height: 3px; border-radius: 2px; }
.line-legend { display: flex; gap: 12px; margin-top: 6px; font-size: 11px; color: var(--text-sub); flex-wrap: wrap; justify-content: center; }
.lg-item { display: flex; align-items: center; gap: 4px; }
.lg-item i { width: 10px; height: 3px; border-radius: 2px; display: inline-block; }
.line-x { display: flex; justify-content: space-between; font-size: 9px; color: var(--text-sub); margin-top: 2px; }
.line-x span { flex: 1; }
.line-x span.first { text-align: left; }
.line-x span.last { text-align: right; }
</style>