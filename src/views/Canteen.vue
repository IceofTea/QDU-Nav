<script setup>
import { ref, computed, onMounted } from 'vue'
import { canteens, canteenStats } from '../data/canteens'
import { apiFetch } from '../api/index'

const emit = defineEmits(['back'])
const campus = ref('全部')
const live = ref(null)
const loading = ref(true)
const openFood = ref(null)

const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
const now = new Date()
const today = dayNames[now.getDay()]
const hm = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0')

onMounted(async () => {
  try {
    live.value = await apiFetch('/canteen')
  } catch (e) {
    live.value = null
  }
  loading.value = false
})

const list = computed(() => {
  if (campus.value === '全部') return canteens
  return canteens.filter((c) => c.campus === campus.value)
})

function seatsOf(c) {
  return c.seats ? String(c.seats) : '—'
}
function peopleOf() {
  return '--'
}

// 实时营业状态判定（据官方营业时间）
function basicOpen() {
  const h = now.getHours()
  const m = now.getMinutes()
  const t = h * 60 + m
  return (t >= 390 && t <= 510) || (t >= 630 && t <= 780) || (t >= 990 && t <= 1110)
}
const isFlavorOpen = computed(() => {
  const t = now.getHours() * 60 + now.getMinutes()
  return t >= 390 && t <= 1290
})
const mealTag = computed(() => {
  const h = now.getHours()
  if (h < 6) return { t: '未营业', open: false }
  if (h < 9) return { t: '早餐时段', open: true }
  if (h < 10) return { t: '非供餐时段', open: false }
  if (h < 13.5) return { t: '午餐时段', open: true }
  if (h < 16.5) return { t: '非供餐时段', open: false }
  if (h < 19) return { t: '晚餐时段', open: true }
  if (h < 21.5) return { t: '风味持续供餐', open: true }
  return { t: '已过供餐时段', open: false }
})
const openCount = computed(() => list.value.filter((c) => (c.type === 'basic' ? basicOpen() : isFlavorOpen.value)).length)

function toggleFood(name) {
  openFood.value = openFood.value === name ? null : name
}
</script>

<template>
  <div>
    <div class="view-top">
      <button class="back-btn" @click="emit('back')">← 返回首页</button>
      <div class="view-title">食堂空座率</div>
      <div class="view-sub">官方食堂名单 · 营业时间实时判定 · 空座监测接入中</div>
    </div>

    <div class="panel">
      <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
        <span class="status-dot" :class="mealTag.open ? 'on' : 'off'"></span>
        <div style="flex: 1; min-width: 160px;">
          <div style="font-weight: 800; font-size: 16px;">{{ mealTag.t }} · {{ today }} {{ hm }}</div>
          <div class="muted" style="font-size: 12px; margin-top: 2px;">
            当前在营餐厅 {{ openCount }} / {{ list.length }} 家
          </div>
        </div>
        <div class="stat-pill">
          <b>{{ canteenStats.total }}</b>
          <span>官方食堂</span>
        </div>
        <div class="stat-pill">
          <b>{{ canteenStats.basic }}</b>
          <span>大众窗口</span>
        </div>
        <div class="stat-pill">
          <b>{{ canteenStats.flavor }}</b>
          <span>风味档口</span>
        </div>
      </div>
      <div class="hour-row">
        <span class="hour-tag basic">大众窗口 {{ canteenStats.basicHours }}</span>
        <span class="hour-tag flavor">风味档口 {{ canteenStats.flavorHours }}</span>
      </div>
      <div class="muted" style="font-size: 11px; margin-top: 6px">
        服务热线 {{ canteenStats.hotline }} · 数据来源：青岛大学后勤管理处
      </div>
    </div>

    <div class="seg" style="margin: 12px 0">
      <button class="seg-btn" :class="{ active: campus === '全部' }" @click="campus = '全部'">全部</button>
      <button class="seg-btn" :class="{ active: campus === '浮山校区' }" @click="campus = '浮山校区'">浮山</button>
      <button class="seg-btn" :class="{ active: campus === '金家岭校区' }" @click="campus = '金家岭校区'">金家岭</button>
      <button class="seg-btn" :class="{ active: campus === '松山校区' }" @click="campus = '松山校区'">松山</button>
    </div>

    <div v-if="loading" class="skeleton-list">
      <div v-for="i in 4" :key="i" class="skeleton-row"><div class="skeleton" style="width: 90%; height: 56px"></div></div>
    </div>
    <div v-else class="panel">
      <div class="muted" style="font-size: 12px; margin-bottom: 8px">
        每行为「在座人数 / 座位数（*今日堂食次数）」格式，在座人数待摄像头接入后实时刷新，座位数为官方公布规模
      </div>
      <div v-for="c in list" :key="c.name" class="canteen-row">
        <button class="canteen-main" @click="toggleFood(c.name)">
          <span style="font-weight: 800; font-size: 14px; white-space: nowrap">{{ c.name }}</span>
          <span class="type-tag" :class="c.type">{{ c.type === 'basic' ? '大众窗口' : '风味档口' }}</span>
          <span v-if="c.note" class="tag" style="background: #fff3e0; color: #e65100">{{ c.note }}</span>
          <span class="canteen-area">{{ c.area }} · {{ c.dept }}</span>
          <span class="canteen-toggle">{{ openFood === c.name ? '收起 ▴' : '特色档口 ▾' }}</span>
        </button>
        <div class="canteen-metric">
          <span class="metric-people">{{ peopleOf() }}</span>
          <span class="metric-slash">/</span>
          <span class="metric-seats">{{ seatsOf(c) }}</span>
          <span class="metric-count">（*--）</span>
        </div>
        <div v-if="openFood === c.name" class="food-list">
          <span v-for="f in c.foods" :key="f" class="food-chip">{{ f }}</span>
        </div>
      </div>
      <div v-if="live && live.updatedAt" class="muted" style="font-size: 11px; margin-top: 8px">最近更新：{{ live.updatedAt }}</div>
    </div>

    <div class="source-bar" style="margin-top: 14px">
      <span>📋 食堂名单与营业时间：后勤管理处「饮食服务」 · 特色档口/招牌菜：后勤采购公告与公开报道 · 空座人数：待接入</span>
    </div>
  </div>
</template>

<style scoped>
.status-dot { width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0; }
.status-dot.on { background: #22c55e; box-shadow: 0 0 0 4px rgba(34, 197, 94, 0.15); }
.status-dot.off { background: #d1d5db; }
.stat-pill {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 56px;
  padding: 6px 8px;
  border-radius: 10px;
  background: var(--bg);
}
.stat-pill b { font-size: 18px; color: var(--primary); }
.stat-pill span { font-size: 10px; color: var(--text-light); }
.hour-row { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 10px; }
.hour-tag { font-size: 11px; padding: 4px 10px; border-radius: 999px; }
.hour-tag.basic { background: #eef4fd; color: #1b66c9; }
.hour-tag.flavor { background: #fff3e0; color: #e65100; }
.canteen-row { border-bottom: 1px solid var(--border); padding: 9px 2px; }
.canteen-row:last-child { border-bottom: none; }
.canteen-main {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  width: 100%;
  border: none;
  background: none;
  cursor: pointer;
  font-family: inherit;
  text-align: left;
}
.canteen-area { font-size: 11px; color: var(--text-light); }
.canteen-toggle { margin-left: auto; font-size: 11px; color: var(--primary); }
.type-tag { font-size: 10px; padding: 2px 8px; border-radius: 999px; }
.type-tag.basic { background: #eef4fd; color: #1b66c9; }
.type-tag.flavor { background: #fff3e0; color: #e65100; }
.canteen-metric {
  margin-top: 6px;
  font-variant-numeric: tabular-nums;
  font-size: 14px;
  display: flex;
  align-items: baseline;
  gap: 3px;
}
.metric-people { font-weight: 800; font-size: 16px; color: var(--primary); }
.metric-slash { color: var(--text-light); }
.metric-seats { color: var(--text-light); }
.metric-count { color: var(--text-light); font-size: 11px; }
.food-list { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
.food-chip {
  font-size: 11px;
  padding: 3px 10px;
  border-radius: 999px;
  background: var(--bg);
  border: 1px solid var(--border);
  color: var(--text);
}
</style>