<script setup>
import { ref, computed, onMounted } from 'vue'
import { canteens, canteenStats } from '../data/canteens'
import { apiFetch } from '../api/index'

const emit = defineEmits(['back'])
const campus = ref('全部')
const live = ref(null)
const loading = ref(true)

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
function peopleOf(c) {
  const live = 0
  return live ? String(live) : '--'
}
</script>

<template>
  <div>
    <div class="view-top">
      <button class="back-btn" @click="emit('back')">← 返回首页</button>
      <div class="view-title">食堂空座率</div>
      <div class="view-sub">实时查看各食堂当前就餐人数与空座情况</div>
    </div>

    <div class="panel">
      <div style="display: flex; justify-content: space-between; gap: 8px">
        <div class="stat-grid" style="flex: 1">
          <div class="stat-card">
            <div class="stat-num">{{ canteenStats.total }}</div>
            <div class="stat-label">现有食堂</div>
          </div>
          <div class="stat-card">
            <div class="stat-num">{{ canteenStats.basic }}<span style="font-size:11px">/{{ canteenStats.flavor }}</span></div>
            <div class="stat-label">基本伙/风味</div>
          </div>
        </div>
        <div style="font-size: 11px; color: var(--text-light); text-align: right">
          <div>🕙 {{ today }} {{ hm }}</div>
          <div v-if="live && live.status" style="color: var(--warn)">{{ live.status }}</div>
        </div>
      </div>
      <div class="muted" style="font-size: 12px; margin-top: 8px">
        基本伙：{{ canteenStats.basicHours }}<br />风味：{{ canteenStats.flavorHours }}
      </div>
      <div style="font-size: 11px; color: var(--text-light); margin-top: 6px">
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
      <div class="muted" style="font-size: 12px; margin-bottom: 8px">以下人数为「当前在座人数」，座位数由食堂规模估算，空座数据待摄像头接入后实时刷新</div>
      <div v-for="c in list" :key="c.name" class="canteen-row">
        <div style="display: flex; align-items: center; gap: 8px; min-width: 0">
          <span style="font-weight: 700; font-size: 14px; white-space: nowrap">{{ c.name }}</span>
          <span v-if="c.note" class="tag" style="background: #fff3e0; color: #e65100">{{ c.note }}</span>
        </div>
        <div style="font-size: 12px; color: var(--text-light)">{{ c.area }} · {{ c.dept }}</div>
        <div class="canteen-metric" style="margin-left: auto">
          <span class="metric-people">{{ peopleOf(c) }}</span>
          <span style="color: var(--text-light); font-size: 11px">/ {{ seatsOf(c) }}</span>
          <span style="color: var(--text-light); font-size: 11px">（*{{ c.seats ? '--' : '—' }}）</span>
        </div>
      </div>
      <div v-if="live && live.updatedAt" class="muted" style="font-size: 11px; margin-top: 8px">最近更新：{{ live.updatedAt }}</div>
    </div>

    <div class="source-bar" style="margin-top: 14px">
      <span>📋 数据源：青岛大学后勤管理处「饮食服务」 · 食堂名单与营业时间为官方信息，空座人数待接入</span>
    </div>
  </div>
</template>

<style scoped>
.canteen-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 2px;
  border-bottom: 1px solid var(--border);
  flex-wrap: wrap;
}
.canteen-row:last-child { border-bottom: none; }
.canteen-metric {
  font-variant-numeric: tabular-nums;
  font-size: 14px;
  white-space: nowrap;
}
.metric-people {
  font-weight: 800;
  font-size: 15px;
  color: var(--primary);
}
</style>
