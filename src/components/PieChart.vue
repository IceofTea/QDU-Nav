<script setup>
/** 圆饼图组件（SVG 扇区，无第三方依赖）
 *  - 扇区按占比着色（白色描边分隔），鼠标移动到饼块上显示详情
 *  - 图例：色点 + 名称 + 数值 + 占比（默认显示），点击图例触发 select
 *  - 中心显示合计；数据为空时提示
 *  props: segments [{ name, icon, v }], total, valuePrefix, legendValue, centerValue */
import { ref, computed } from 'vue'

const props = defineProps({
  segments: { type: Array, default: () => [] },
  total: { type: Number, default: 0 },
  valuePrefix: { type: String, default: '' },
  legendValue: { type: Boolean, default: true },
  centerValue: { type: Boolean, default: true }
})
const emit = defineEmits(['select'])

const PALETTE = ['#e76f51', '#f4a261', '#2a9d8f', '#e9c46a', '#9b5de5', '#f15bb5', '#00bbf9', '#00f5d4', '#b5838d', '#6d597a', '#355070', '#606c38', '#dda15e', '#bc6c25', '#8e9aaf', '#c9ada7', '#7f4f24', '#ef476f']

const CX = 110
const CY = 110
const R = 92
const sum = computed(() => props.total || props.segments.reduce((s, x) => s + x.v, 0))
const segs = computed(() => {
  let acc = 0
  return props.segments.map((s, i) => {
    const from = sum.value ? (acc / sum.value) * 360 : 0
    acc += s.v
    const to = sum.value ? (acc / sum.value) * 360 : 0
    return { ...s, color: PALETTE[i % PALETTE.length], from, to, pct: sum.value ? Math.round((s.v / sum.value) * 100) : 0 }
  })
})
function arcPath(a0, a1) {
  const rad = (d) => ((d - 90) * Math.PI) / 180
  const x0 = CX + R * Math.cos(rad(a0))
  const y0 = CY + R * Math.sin(rad(a0))
  const x1 = CX + R * Math.cos(rad(a1))
  const y1 = CY + R * Math.sin(rad(a1))
  const large = a1 - a0 > 180 ? 1 : 0
  return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${R} ${R} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)} L ${CX} ${CY} Z`
}
const hover = ref(-1)
const tip = computed(() => (hover.value >= 0 && segs.value[hover.value] ? segs.value[hover.value] : null))
const fmt = (n) => (n % 1 === 0 ? String(n) : n.toFixed(2))
</script>

<template>
  <div class="pie-box">
    <template v-if="segs.length && sum > 0">
      <div class="pie-wrap">
        <svg :viewBox="`0 0 220 220`" class="pie-svg">
          <path v-for="(s, i) in segs" :key="s.name" :d="arcPath(s.from, s.to)" :fill="s.color" class="slice" :class="{ hi: hover === i }" @mouseenter="hover = i" @mouseleave="hover = -1" />
          <circle :cx="CX" :cy="CY" r="56" fill="var(--card)" />
          <text :x="CX" :y="CY - 4" text-anchor="middle" class="pie-label">{{ centerValue ? '合计' : '总计' }}</text>
          <text :x="CX" :y="CY + 16" text-anchor="middle" class="pie-center">{{ centerValue ? valuePrefix + fmt(sum) : '—' }}</text>
        </svg>
        <div v-if="tip" class="pie-tip">
          <b>{{ tip.icon }} {{ tip.name }}</b>
          <span>{{ valuePrefix }}{{ fmt(tip.v) }} · {{ tip.pct }}%</span>
        </div>
      </div>
      <div class="pie-legend">
        <button v-for="(s, i) in segs" :key="s.name" class="pie-item" @click="emit('select', s.name)" @mouseenter="hover = i" @mouseleave="hover = -1">
          <i class="dot" :style="{ background: s.color }"></i>
          <span class="pi-name">{{ s.icon }} {{ s.name }}</span>
          <b class="pi-val">{{ valuePrefix }}{{ fmt(s.v) }} · {{ s.pct }}%</b>
        </button>
      </div>
    </template>
    <p v-else class="muted" style="text-align:center;padding:16px 4px;font-size:12px;">暂无分布数据</p>
  </div>
</template>

<style scoped>
.pie-box { display: flex; flex-direction: column; align-items: center; gap: 10px; width: 100%; max-width: 680px; margin: 0 auto; }
.pie-wrap { position: relative; width: 100%; max-width: 230px; flex: none; }
.pie-svg { width: 100%; height: auto; display: block; }
.slice { cursor: pointer; stroke: var(--card); stroke-width: 2; transition: opacity 0.15s, transform 0.15s; transform-box: fill-box; transform-origin: center; }
.slice.hi { opacity: 0.85; transform: scale(1.05); }
.pie-label { font-size: 11px; fill: var(--text-sub); }
.pie-center { font-size: 15px; font-weight: 800; fill: var(--text); }
.pie-tip {
  position: absolute;
  left: 50%;
  bottom: 0;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  padding: 5px 12px;
  border-radius: 10px;
  background: rgba(17, 24, 39, 0.9);
  color: #fff;
  font-size: 12px;
  white-space: nowrap;
  pointer-events: none;
}
.pie-tip span { font-weight: 700; opacity: 0.9; }
.pie-legend { width: 100%; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 2px 12px; max-height: 220px; overflow-y: auto; align-content: start; }
.pie-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 3px 8px;
  border: none;
  background: none;
  border-radius: 8px;
  font-family: inherit;
  font-size: 12px;
  color: var(--text);
  cursor: pointer;
  text-align: left;
  min-width: 0;
}
.pie-item:hover { background: var(--primary-soft); }
.dot { width: 10px; height: 10px; border-radius: 3px; flex: none; }
.pi-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pi-val { color: var(--text-sub); font-size: 11px; white-space: nowrap; }
@media (min-width: 520px) {
  .pie-box { flex-direction: row; align-items: center; gap: 18px; }
  .pie-wrap { max-width: 220px; }
  .pie-legend { max-height: 240px; }
}
</style>