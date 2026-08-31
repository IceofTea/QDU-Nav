<script setup>
import { ref, computed, onMounted } from 'vue'
import { canteens, canteenStats } from '../data/canteens'
import { apiFetch } from '../api/index'
import { useI18n } from '../i18n'

const { t, lang } = useI18n()

const emit = defineEmits(['back'])
const campus = ref('all')
const live = ref(null)
const loading = ref(true)
const openFood = ref(null)

const dayNames = computed(() => lang.value === 'en' ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] : ['周日', '周一', '周二', '周三', '周四', '周五', '周六'])
const now = new Date()
const today = computed(() => dayNames.value[now.getDay()])
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
  if (campus.value === 'all') return canteens
  return canteens.filter((c) => c.campus === campus.value)
})

function seatsOf(c) {
  return c.seats ? String(c.seats) : '—'
}
function peopleOf() {
  return '--'
}

// 实时营业状态判定（据官方营业时间，分钟制：6:30-8:30 / 10:30-13:00 / 16:30-18:30）
function basicOpen() {
  const h = now.getHours()
  const m = now.getMinutes()
  const t = h * 60 + m
  return (t >= 390 && t <= 510) || (t >= 630 && t <= 780) || (t >= 990 && t <= 1110)
}
const isFlavorOpen = computed(() => {
  // 风味档口 6:30-21:30 连续供餐
  const t = now.getHours() * 60 + now.getMinutes()
  return t >= 390 && t <= 1290
})
const mealTag = computed(() => {
  const h = now.getHours()
  if (h < 6) return { t: t('canteen.notOpen'), open: false }
  if (h < 9) return { t: t('canteen.breakfast'), open: true }
  if (h < 10) return { t: t('canteen.offHours'), open: false }
  if (h < 13.5) return { t: t('canteen.lunch'), open: true }
  if (h < 16.5) return { t: t('canteen.offHours'), open: false }
  if (h < 19) return { t: t('canteen.dinner'), open: true }
  if (h < 21.5) return { t: t('canteen.flavorOpen'), open: true }
  return { t: t('canteen.closed'), open: false }
})
const openCount = computed(() => list.value.filter((c) => (c.type === 'basic' ? basicOpen() : isFlavorOpen.value)).length)

function toggleFood(name) {
  openFood.value = openFood.value === name ? null : name
}
</script>

<template>
  <div>
    <div class="view-top">
      <button class="back-btn" @click="emit('back')">← {{ t('common.back').slice(2) }}</button>
      <div class="view-title">{{ t('canteen.title') }}</div>
      <div class="view-sub">{{ t('canteen.subFull') }}</div>
    </div>

    <div class="panel">
      <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
        <span class="status-dot" :class="mealTag.open ? 'on' : 'off'"></span>
        <div style="flex: 1; min-width: 160px;">
          <div style="font-weight: 800; font-size: 16px;">{{ mealTag.t }} · {{ today }} {{ hm }}</div>
          <div class="muted" style="font-size: 12px; margin-top: 2px;">
            {{ t('canteen.currentOpen') }} {{ openCount }} {{ t('canteen.of') }} {{ list.length }}
          </div>
        </div>
        <div class="stat-pill">
          <b>{{ canteenStats.total }}</b>
          <span>{{ t('canteen.officialCanteen') }}</span>
        </div>
        <div class="stat-pill">
          <b>{{ canteenStats.basic }}</b>
          <span>{{ t('canteen.basicWindow') }}</span>
        </div>
        <div class="stat-pill">
          <b>{{ canteenStats.flavor }}</b>
          <span>{{ t('canteen.flavorStall') }}</span>
        </div>
      </div>
      <div class="hour-row">
        <span class="hour-tag basic">{{ t('canteen.basicHours') }} {{ canteenStats.basicHours }}</span>
        <span class="hour-tag flavor">{{ t('canteen.flavorHours') }} {{ canteenStats.flavorHours }}</span>
      </div>
      <div class="muted" style="font-size: 11px; margin-top: 6px">
        {{ t('canteen.hotline') }} {{ canteenStats.hotline }} · {{ t('canteen.dataSource') }}
      </div>
    </div>

    <div class="seg" style="margin: 12px 0">
      <button class="seg-btn" :class="{ active: campus === 'all' }" @click="campus = 'all'">{{ t('canteen.all') }}</button>
      <button class="seg-btn" :class="{ active: campus === '浮山校区' }" @click="campus = '浮山校区'">{{ t('canteen.fushan') }}</button>
      <button class="seg-btn" :class="{ active: campus === '金家岭校区' }" @click="campus = '金家岭校区'">{{ t('canteen.jinjialing') }}</button>
      <button class="seg-btn" :class="{ active: campus === '松山校区' }" @click="campus = '松山校区'">{{ t('canteen.songshan') }}</button>
    </div>

    <div v-if="loading" class="skeleton-list">
      <div v-for="i in 4" :key="i" class="skeleton-row"><div class="skeleton" style="width: 90%; height: 56px"></div></div>
    </div>
    <div v-else class="panel">
      <div class="muted" style="font-size: 12px; margin-bottom: 8px">
        {{ t('canteen.seatNote') }}
      </div>
      <div v-for="c in list" :key="c.name" class="canteen-row">
        <button class="canteen-main" @click="toggleFood(c.name)">
          <span style="font-weight: 800; font-size: 14px; white-space: nowrap">{{ c.name }}</span>
          <span class="type-tag" :class="c.type">{{ c.type === 'basic' ? t('canteen.basicWindow') : t('canteen.flavorStall') }}</span>
          <span v-if="c.note" class="tag" style="background:var(--soft-yellow); color: #e65100">{{ c.note }}</span>
          <span class="canteen-area">{{ c.area }} · {{ c.dept }}</span>
          <span class="canteen-toggle">{{ openFood === c.name ? t('canteen.collapseFood') : t('canteen.expandFood') }}</span>
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
      <div v-if="live && live.updatedAt" class="muted" style="font-size: 11px; margin-top: 8px">{{ t('canteen.lastUpdate') }}{{ live.updatedAt }}</div>
    </div>

    <div class="source-bar" style="margin-top: 14px">
      <span>{{ t('canteen.sourceNote') }}</span>
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
.hour-tag.basic { background: var(--soft-blue); color: var(--primary); }
.hour-tag.flavor { background: var(--soft-yellow); color: #e65100; }
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
.type-tag.basic { background: var(--soft-blue); color: var(--primary); }
.type-tag.flavor { background: var(--soft-yellow); color: #e65100; }
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