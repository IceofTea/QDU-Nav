<script setup>
/** 折线图组件（SVG + ResizeObserver，无第三方依赖）
 *  - 固定显示高度（height px），宽度随容器自适应（viewBox 动态跟随，文字/数据点不变形）
 *  - 带 Y 轴数值刻度、网格线、X 轴月份标签（自动抽稀）
 *  - 鼠标悬浮实时跟随显示「水平辅助线 + 数据点高亮 + 数值提示」
 *  props: series [{ label, color, data }], labels, height, unit, valuePrefix, maxWidth(px, 0=不限) */
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  series: { type: Array, default: () => [] },
  labels: { type: Array, default: () => [] },
  height: { type: Number, default: 160 },
  unit: { type: String, default: '' },
  valuePrefix: { type: String, default: '' },
  maxWidth: { type: Number, default: 0 }
})
const padL = 42
const padR = 12
const padT = 14
const padB = 24

const boxRef = ref(null)
const vw = ref(360)
let ro = null
onMounted(() => {
  const el = boxRef.value
  if (!el) return
  const update = () => { vw.value = Math.max(120, el.clientWidth || 360) }
  update()
  ro = new ResizeObserver(update)
  ro.observe(el)
})
onBeforeUnmount(() => { if (ro) ro.disconnect() })

const plotW = computed(() => vw.value - padL - padR)
const plotH = computed(() => props.height - padT - padB)
const totalN = computed(() => (props.series[0] ? props.series[0].data.length : 0))
const dataMin = computed(() => Math.min(0, ...props.series.flatMap((s) => s.data.map((v) => Number(v) || 0))))
const dataMax = computed(() => Math.max(1, ...props.series.flatMap((s) => s.data.map((v) => Number(v) || 0))))
const hasNeg = computed(() => dataMin.value < 0)
const span = computed(() => dataMax.value - dataMin.value || 1)
const xAt = (i) => (totalN.value < 2 ? padL + plotW.value / 2 : padL + (i * plotW.value) / (totalN.value - 1))
const yAt = (v) =>
  hasNeg.value ? padT + (1 - (v - dataMin.value) / span.value) * plotH.value : padT + plotH.value - ((v || 0) / dataMax.value) * plotH.value
const zeroY = computed(() => yAt(0))
const points = (data) => (data.length < 2 ? '' : data.map((v, i) => `${xAt(i).toFixed(1)},${yAt(v).toFixed(1)}`).join(' '))
const areaPoints = (data) => {
  if (data.length < 2) return ''
  const bottom = hasNeg.value ? zeroY.value : props.height
  return `0,${bottom} ${points(data)} ${vw.value},${bottom}`
}

const ticks = computed(() => {
  if (hasNeg.value) return Array.from({ length: 5 }, (_, i) => Math.round((dataMin.value + (span.value * i) / 4) * 100) / 100)
  return Array.from({ length: 5 }, (_, i) => Math.round((dataMax.value * i) / 4 * 100) / 100)
})
const fmtVal = (v) => {
  const n = Math.round(v * 100) / 100
  if (n >= 100000) return (n / 10000).toFixed(1) + '万'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k'
  return String(n % 1 === 0 ? n : n.toFixed(1))
}
const fmt = (n) => (n % 1 === 0 ? String(n) : n.toFixed(2))

/* 交互：鼠标悬浮实时跟随，移动即更新 */
const hoverIdx = ref(-1)
function updateIdx(e) {
  const rect = e.currentTarget.getBoundingClientRect()
  if (!rect.width) return
  const x = ((e.clientX - rect.left) / rect.width) * vw.value
  const idx = Math.round(((x - padL) / plotW.value) * (totalN.value - 1))
  hoverIdx.value = Math.max(0, Math.min(totalN.value - 1, idx))
}
const tip = computed(() => {
  const i = hoverIdx.value
  if (i < 0 || !props.series.length) return null
  return {
    label: props.labels[i] != null ? props.labels[i] : '',
    rows: props.series.map((s) => ({ label: s.label, color: s.color, v: s.data[i] != null ? s.data[i] : 0 }))
  }
})
const xLabels = computed(() => {
  const n = totalN.value
  if (n <= 8) return props.labels.map((l, i) => ({ i, l }))
  const step = Math.ceil(n / 6)
  return props.labels.map((l, i) => ({ i, l, skip: i % step !== 0 }))
})
</script>

<template>
  <div class="line-chart" :style="maxWidth ? { maxWidth: maxWidth + 'px' } : {}" ref="boxRef">
    <svg :viewBox="`0 0 ${vw} ${height}`" class="line-svg" :style="{ height: height + 'px' }" @mousemove="updateIdx" @mouseleave="hoverIdx = -1">
      <template v-for="(t, i) in ticks" :key="'g' + i">
        <line :x1="padL" :x2="padL + plotW" :y1="yAt(t)" :y2="yAt(t)" class="gridline" :class="{ axis: i === 0 || (hasNeg && t === 0) }" />
        <text :x="padL - 6" :y="yAt(t) + 3" class="y-lab">{{ fmtVal(t) }}</text>
      </template>
      <!-- 负半轴与正半轴背景分界 -->
      <rect v-if="hasNeg" :x="padL" :y="zeroY" :width="plotW" :height="plotH - (zeroY - padT)" class="neg-bg" />
      <template v-for="s in series" :key="s.label">
        <polygon v-if="s.fill !== false" :points="areaPoints(s.data)" :fill="s.color" opacity="0.1" />
        <polyline :points="points(s.data)" :stroke="s.color" stroke-width="2.5" fill="none" stroke-linejoin="round" stroke-linecap="round" />
        <circle v-for="(v, k) in s.data" :key="k" :cx="xAt(k)" :cy="yAt(v)" r="3.5" :fill="s.color" class="pt" :class="{ hi: hoverIdx === k }" />
      </template>
      <template v-if="hoverIdx >= 0">
        <line :x1="padL" :x2="padL + plotW" :y1="yAt(series[0].data[hoverIdx] != null ? series[0].data[hoverIdx] : 0)" :y2="yAt(series[0].data[hoverIdx] != null ? series[0].data[hoverIdx] : 0)" class="hline" />
        <circle v-for="s in series" :key="'c' + s.label" :cx="xAt(hoverIdx)" :cy="yAt(s.data[hoverIdx] != null ? s.data[hoverIdx] : 0)" r="4.5" fill="#fff" :stroke="s.color" stroke-width="2.5" />
      </template>
      <text v-for="xl in xLabels" :key="'x' + xl.i" :x="xAt(xl.i)" :y="height - 6" class="x-lab" :class="{ skip: xl.skip, first: xl.i === 0, last: xl.i === totalN - 1 }">{{ xl.l }}</text>
    </svg>

    <div v-if="tip" class="line-tip">
      <b>{{ tip.label }}</b>
      <div v-for="t in tip.rows" :key="t.label" class="tip-row">
        <i :style="{ background: t.color }"></i>
        {{ t.label }} {{ unit }}{{ valuePrefix }}{{ fmt(t.v) }}
      </div>
    </div>
    <div v-if="series.length" class="line-legend">
      <span v-for="s in series" :key="s.label" class="lg-item"><i :style="{ background: s.color }"></i>{{ s.label }}</span>
    </div>
  </div>
</template>

<style scoped>
.line-chart { width: 100%; margin: 0 auto; }
.line-svg { width: 100%; display: block; cursor: crosshair; }
.gridline { stroke: var(--border); stroke-width: 1; stroke-dasharray: 3 3; }
.gridline.axis { stroke-dasharray: none; stroke: var(--text-light); }
.neg-bg { fill: rgba(182, 58, 70, 0.05); }
.hline { stroke: var(--text-light); stroke-width: 1; stroke-dasharray: 4 3; }
.y-lab { font-size: 10px; fill: var(--text-sub); text-anchor: end; }
.x-lab { font-size: 10px; fill: var(--text-sub); text-anchor: middle; }
.x-lab.first { text-anchor: start; }
.x-lab.last { text-anchor: end; }
.x-lab.skip { opacity: 0; }
.pt { opacity: 0; transition: opacity 0.12s; }
.pt.hi { opacity: 1; }
.line-tip {
  margin: 6px auto 0;
  max-width: 92%;
  padding: 8px 12px;
  border-radius: 10px;
  background: var(--primary-soft);
  border: 1px solid var(--border);
  font-size: 12px;
  color: var(--text);
  display: flex;
  flex-direction: column;
  gap: 3px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.06);
}
.tip-row { display: flex; align-items: center; gap: 6px; font-weight: 700; }
.tip-row i { width: 10px; height: 3px; border-radius: 2px; }
.line-legend { display: flex; gap: 12px; margin-top: 6px; font-size: 11px; color: var(--text-sub); flex-wrap: wrap; justify-content: center; }
.lg-item { display: flex; align-items: center; gap: 4px; }
.lg-item i { width: 10px; height: 3px; border-radius: 2px; display: inline-block; }
</style>