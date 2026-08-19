<script setup>
/** 圆饼图组件：conic-gradient 实现，无第三方依赖
 *  props: segments [{ name, icon, v }], total（合计，缺省自动求和）
 *  emit:  select(name) 点击图例项 */
import { computed } from 'vue'

const props = defineProps({
  segments: { type: Array, default: () => [] },
  total: { type: Number, default: 0 }
})
const emit = defineEmits(['select'])

const PALETTE = ['#e76f51', '#f4a261', '#2a9d8f', '#e9c46a', '#9b5de5', '#f15bb5', '#00bbf9', '#00f5d4', '#b5838d', '#6d597a', '#355070', '#606c38', '#dda15e', '#bc6c25', '#8e9aaf', '#c9ada7', '#7f4f24', '#ef476f']

const sum = computed(() => props.total || props.segments.reduce((s, x) => s + x.v, 0))
const segs = computed(() => {
  let acc = 0
  return props.segments.map((s, i) => {
    const from = acc
    acc += s.v
    return {
      ...s,
      color: PALETTE[i % PALETTE.length],
      from,
      to: acc,
      pct: sum.value ? Math.round(s.v / sum.value * 100) : 0
    }
  })
})
const bg = computed(() => {
  if (!segs.value.length) return 'conic-gradient(#e5e7eb 0 100%)'
  return `conic-gradient(${segs.value.map((s) => `${s.color} ${Math.round(s.from / sum.value * 100)}% ${Math.round(s.to / sum.value * 100)}%`).join(',')})`
})
const fmt = (n) => (n % 1 === 0 ? String(n) : n.toFixed(2))
</script>

<template>
  <div class="pie-box">
    <div class="pie" :style="{ background: bg }">
      <div class="pie-hole">
        <b>{{ fmt(sum) }}</b>
        <span>合计</span>
      </div>
    </div>
    <div class="pie-legend">
      <button v-for="s in segs" :key="s.name" class="pie-item" @click="emit('select', s.name)">
        <i class="dot" :style="{ background: s.color }"></i>
        <span class="pi-name">{{ s.icon }} {{ s.name }}</span>
        <b class="pi-val">¥{{ fmt(s.v) }} · {{ s.pct }}%</b>
      </button>
    </div>
  </div>
</template>

<style scoped>
.pie-box { display: flex; flex-direction: column; align-items: center; gap: 14px; }
.pie {
  width: 150px;
  height: 150px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: none;
}
.pie-hole {
  width: 66px;
  height: 66px;
  border-radius: 50%;
  background: var(--card);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  color: var(--text-sub);
}
.pie-hole b { font-size: 13px; color: var(--text); }
.pie-legend { width: 100%; display: flex; flex-direction: column; gap: 6px; max-height: 210px; overflow-y: auto; }
.pie-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 8px;
  border: none;
  background: none;
  border-radius: 8px;
  font-family: inherit;
  font-size: 12px;
  color: var(--text);
  cursor: pointer;
  text-align: left;
}
.pie-item:hover { background: var(--primary-soft); }
.dot { width: 10px; height: 10px; border-radius: 3px; flex: none; }
.pi-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pi-val { color: var(--text-sub); font-size: 11px; white-space: nowrap; }
</style>