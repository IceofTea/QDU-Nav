<script setup>
import { ref, computed, onMounted } from 'vue'
import { buildings, campusFilters, searchRooms } from '../data/classrooms'
import { apiFetch } from '../api/index'

const emit = defineEmits(['back'])
const view = ref('main')
const keyword = ref('')
const campus = ref('全部')
const expanded = ref(null)

const dayNames = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
const emptyDay = ref(1)
const emptyPeriod = ref(1)
const emptyKw = ref('')
const emptyLoading = ref(false)
const emptyResult = ref(null)
const courseTable = ref(null)

// 教室占用
const roomSched = ref(null)
const roomSchedLoading = ref(false)

onMounted(async () => {
  courseTable.value = await apiFetch('/courseTable')
})

async function goEmpty() {
  emptyLoading.value = true
  const r = await apiFetch(
    '/emptyRooms?day=' + emptyDay.value + '&period=' + emptyPeriod.value + '&kw=' + encodeURIComponent(emptyKw.value.trim())
  )
  emptyLoading.value = false
  if (r && Array.isArray(r.rooms)) {
    emptyResult.value = r
    roomSched.value = null
    view.value = 'empty'
    window.scrollTo(0, 0)
  }
}

async function selectRoom(room) {
  roomSchedLoading.value = true
  roomSched.value = await apiFetch('/roomSchedule?room=' + encodeURIComponent(room))
  roomSchedLoading.value = false
  window.scrollTo(0, 0)
}

const buildOfRoom = (room) => {
  const b = buildings.find((x) => room.startsWith(x.name))
  return b ? b.name : room.split(/\d/)[0] || room
}

const emptyGroups = computed(() => {
  if (!emptyResult.value) return []
  const g = {}
  for (const r of emptyResult.value.rooms) {
    const b = buildOfRoom(r)
    if (!g[b]) g[b] = []
    g[b].push(r)
  }
  return Object.entries(g).sort((a, b2) => a[0].localeCompare(b2[0], 'zh'))
})

const list = computed(() => {
  let r = searchRooms(keyword.value)
  if (campus.value !== '全部') r = r.filter((b) => b.campus === campus.value)
  return r
})

function toggle(b) {
  expanded.value = expanded.value === b.name ? null : b.name
}

function fallbackRoute(b) {
  return ['到达青岛大学' + (b.zone ? b.zone + '·' : '') + b.name + '后，参考楼内各层教室分布（见「楼层教室」），或使用下方高德地图定位获取实时导航。']
}
</script>

<template>
  <div class="view-top">
    <button class="back-btn" @click="view === 'empty' ? (view = 'main') : emit('back')">← {{ view === 'empty' ? '返回教室导航' : '返回首页' }}</button>
    <div class="view-title">{{ view === 'empty' ? '空教室查询结果' : '教室导航' }}</div>
    <div class="view-sub">{{ view === 'empty' ? '点击教室可查看其一周占用安排' : '空教室实时查询 · 教室检索与导航指引' }}</div>
  </div>

  <template v-if="view === 'empty'">
    <div class="panel" style="margin-bottom:16px;">
      <div style="display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;">
        <div style="font-weight:700;font-size:15px;">{{ dayNames[emptyResult.day - 1] }} · 第 {{ emptyResult.period }} 节</div>
        <div class="muted" style="font-size:13px;">空闲教室 {{ emptyResult.emptyCount }} / {{ emptyResult.total }} 间</div>
      </div>
      <div class="muted" style="font-size:12px;margin-top:4px;">数据源：{{ courseTable?.semester || '教务处' }}课程总表解析，点击教室查看一周占用</div>
    </div>

    <div v-if="roomSchedLoading" class="panel" style="margin-bottom:16px;"><div class="skeleton" style="height:60px"></div></div>
    <div v-else-if="roomSched" class="panel" style="margin-bottom:16px;">
      <div style="display:flex;align-items:center;gap:10px;">
        <div style="flex:1;font-weight:700;">🗓️ {{ roomSched.room }} 一周占用 <span class="muted" style="font-size:12px;font-weight:400;">（{{ roomSched.semester }} · {{ roomSched.count }} 节课）</span></div>
        <button class="refresh-btn" @click="roomSched = null">收起</button>
      </div>
      <div class="cal-list" style="margin-top:8px;">
        <div v-for="(x, i) in roomSched.schedule" :key="i" class="cal-item">
          <span class="cal-title">{{ x.c }}</span>
          <span class="cal-date">{{ dayNames[x.d - 1] }} 第{{ x.s }}-{{ x.e }}节 · 第{{ x.w }}周</span>
          <span class="cal-go">{{ x.cls }} · {{ x.t }}</span>
        </div>
        <div v-if="!roomSched.count" class="muted" style="padding:12px;text-align:center;">该教室本学期暂无排课</div>
      </div>
    </div>

    <div class="panel">
      <div v-for="[g, rooms] in emptyGroups" :key="g" style="margin-bottom:16px;">
        <div style="font-weight:700;margin-bottom:8px;">🏫 {{ g }} <span class="muted" style="font-size:12px;font-weight:400;">{{ rooms.length }} 间</span></div>
        <div class="tags">
          <button v-for="r in rooms" :key="r" class="tag tag-btn" @click="selectRoom(r)">{{ r }}</button>
        </div>
      </div>
      <div v-if="!emptyGroups.length" class="muted" style="padding:20px;text-align:center;">该时段没有空闲教室</div>
    </div>
  </template>

  <template v-else>
    <div class="panel" style="margin-bottom:16px;">
      <div style="font-weight:700;margin-bottom:10px;">🪑 空教室查询
        <span v-if="courseTable" class="muted" style="font-size:12px;font-weight:400;">（{{ courseTable.semester }} · 解析自教务处课程总表，{{ courseTable.rooms }} 间教室）</span>
      </div>
      <div class="input-row">
        <select class="input" v-model="emptyDay">
          <option v-for="(d, i) in dayNames" :key="i" :value="i + 1">{{ d }}</option>
        </select>
        <select class="input" v-model="emptyPeriod">
          <option v-for="p in 12" :key="p" :value="p">第 {{ p }} 节</option>
        </select>
        <input class="input" v-model="emptyKw" placeholder="楼宇过滤，如：博学楼" />
        <button class="btn" :disabled="emptyLoading" @click="goEmpty">{{ emptyLoading ? '查询中…' : '查空教室' }}</button>
      </div>
    </div>

    <div class="panel">
      <div class="search-bar">
        <span class="search-icon">🔍</span>
        <input v-model="keyword" class="search-input" placeholder="搜索教学楼、教室号，如：博学 / 307" />
      </div>

      <div class="chips">
        <button v-for="c in campusFilters" :key="c" class="chip" :class="{ active: campus === c }" @click="campus = c">
          {{ c }}
        </button>
      </div>

      <div class="bldg-list">
        <div v-for="b in list" :key="b.campus + b.name" class="bldg-card">
          <button class="bldg-head" @click="toggle(b)">
            <span class="bldg-icon">🏫</span>
            <span class="bldg-main">
              <span class="bldg-name">{{ b.name }}</span>
              <span class="bldg-meta">{{ b.campus }} · {{ b.zone || '主校区' }} · {{ b.floors.reduce((n, f) => n + f.rooms.length, 0) }} 间</span>
              <span class="bldg-desc">{{ b.desc }}</span>
            </span>
            <span class="bldg-arrow">{{ expanded === b.name ? '▾' : '▸' }}</span>
          </button>

          <div v-if="expanded === b.name" class="bldg-detail">
            <div style="margin-bottom:10px;display:flex;gap:8px;flex-wrap:wrap;">
              <a class="btn" :href="b.mapUrl" target="_blank" rel="noopener" style="text-decoration:none;font-size:13px;padding:7px 14px;">🗺️ 高德地图定位 ↗</a>
            </div>
            <div class="route-box">
              <div class="detail-title">🚶 导航指引</div>
              <ol class="route-steps">
                <li v-for="(s, i) in (b.route.length ? b.route : fallbackRoute(b))" :key="i">{{ s }}</li>
              </ol>
            </div>
            <div class="detail-box" v-if="b.nearby.length">
              <div class="detail-title">📍 周边地标</div>
              <div class="tags">
                <span v-for="n in b.nearby" :key="n" class="tag">{{ n }}</span>
              </div>
            </div>
            <div class="detail-box">
              <div class="detail-title">🪟 楼层教室</div>
              <div v-for="f in b.floors" :key="f.floor" class="floor-row">
                <span class="floor-tag">{{ f.floor }}</span>
                <span class="floor-rooms"><i v-for="n in f.rooms" :key="n" class="room-chip">{{ n }}</i></span>
              </div>
            </div>
          </div>
        </div>

        <div v-if="!list.length" class="empty">没有找到匹配的教室，换个关键词试试</div>
      </div>

      <div class="muted" style="margin-top:14px;font-size:12px;line-height:1.7;">
        楼宇与教室分布据教务处课程总表与官方渠道整理，请以校园实地标识为准。
      </div>
    </div>
  </template>
</template>

<style scoped>
.floor-row { display: flex; align-items: flex-start; gap: 8px; margin-bottom: 6px; }
.floor-tag { flex: 0 0 56px; font-size: 12px; font-weight: 700; color: var(--primary); }
.floor-rooms { display: flex; flex-wrap: wrap; gap: 4px; flex: 1; min-width: 0; }
.room-chip { font-style: normal; font-size: 11px; padding: 1px 6px; border-radius: 6px; background: var(--soft-gray, #eef3fb); color: var(--text-sub); white-space: nowrap; }
</style>