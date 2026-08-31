<script setup>
import { ref, computed, onMounted } from 'vue'
import { buildings, campusFilters, searchRooms } from '../data/classrooms'
import { apiFetch } from '../api/index'
import { useI18n } from '../i18n'

const { t, lang } = useI18n()

const emit = defineEmits(['back'])
const view = ref('main')
const keyword = ref('')
const campus = ref('全部')
const expanded = ref(null)

const dayNames = computed(() => [t('common.mon'), t('common.tue'), t('common.wed'), t('common.thu'), t('common.fri'), t('common.sat'), t('common.sun')])
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
  const loc = b.zone ? b.zone + '·' : ''
  return [t('classroomNav.routeHint').replace('{name}', loc + b.name)]
}
</script>

<template>
  <div class="view-top">
    <button class="back-btn" @click="view === 'empty' ? (view = 'main') : emit('back')">← {{ view === 'empty' ? t('classroomNav.backToNav') : t('classroomNav.backHome') }}</button>
    <div class="view-title">{{ view === 'empty' ? t('classroomNav.emptyResultTitle') : t('classroomNav.title') }}</div>
    <div class="view-sub">{{ view === 'empty' ? t('classroomNav.emptyResultSub') : t('classroomNav.mainSub') }}</div>
  </div>

  <template v-if="view === 'empty'">
    <div class="panel" style="margin-bottom:16px;">
      <div style="display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;">
        <div style="font-weight:700;font-size:15px;">{{ dayNames[emptyResult.day - 1] }} · {{ t('classroomNav.periodLabel') }}{{ emptyResult.period }}{{ t('classroomNav.periodSuffix') }}</div>
        <div class="muted" style="font-size:13px;">{{ t('classroomNav.freeCount') }} {{ emptyResult.emptyCount }} / {{ emptyResult.total }} {{ t('classroomNav.totalRooms') }}</div>
      </div>
      <div class="muted" style="font-size:12px;margin-top:4px;">{{ t('classroomNav.dataSource') }}{{ courseTable?.semester || 'Academic Affairs' }}{{ t('classroomNav.dataSourceFrom') }}</div>
    </div>

    <div v-if="roomSchedLoading" class="panel" style="margin-bottom:16px;"><div class="skeleton" style="height:60px"></div></div>
    <div v-else-if="roomSched" class="panel" style="margin-bottom:16px;">
      <div style="display:flex;align-items:center;gap:10px;">
        <div style="flex:1;font-weight:700;">🗓️ {{ roomSched.room }} {{ t('classroomNav.weekSchedule') }} <span class="muted" style="font-size:12px;font-weight:400;">（{{ roomSched.semester }} · {{ roomSched.count }} {{ t('classroomNav.periodCount') }}）</span></div>
        <button class="refresh-btn" @click="roomSched = null">{{ t('classroomNav.collapse') }}</button>
      </div>
      <div class="cal-list" style="margin-top:8px;">
        <div v-for="(x, i) in roomSched.schedule" :key="i" class="cal-item">
          <span class="cal-title">{{ x.c }}</span>
          <span class="cal-date">{{ dayNames[x.d - 1] }} {{ t('classroomNav.periodLabel') }}{{ x.s }}-{{ x.e }}{{ t('classroomNav.periodSuffix') }} · {{ t('classroomNav.periodLabel') }}{{ x.w }}{{ t('classroomNav.weekSuffix') }}</span>
          <span class="cal-go">{{ x.cls }} · {{ x.t }}</span>
        </div>
        <div v-if="!roomSched.count" class="muted" style="padding:12px;text-align:center;">{{ t('classroomNav.noSchedule') }}</div>
      </div>
    </div>

    <div class="panel">
      <div v-for="[g, rooms] in emptyGroups" :key="g" style="margin-bottom:16px;">
        <div style="font-weight:700;margin-bottom:8px;">🏫 {{ g }} <span class="muted" style="font-size:12px;font-weight:400;">{{ rooms.length }} {{ t('classroomNav.roomCount') }}</span></div>
        <div class="tags">
          <button v-for="r in rooms" :key="r" class="tag tag-btn" @click="selectRoom(r)">{{ r }}</button>
        </div>
      </div>
        <div v-if="!emptyGroups.length" class="muted" style="padding:20px;text-align:center;">{{ t('classroomNav.noEmptyRoom') }}</div>
    </div>
  </template>

  <template v-else>
    <div class="panel" style="margin-bottom:16px;">
      <div style="font-weight:700;margin-bottom:10px;">{{ t('classroomNav.queryTitle') }}
        <span v-if="courseTable" class="muted" style="font-size:12px;font-weight:400;">（{{ courseTable.semester }} · {{ t('classroomNav.semesterFrom') }}，{{ courseTable.rooms }} {{ t('classroomNav.roomCount') }}）</span>
      </div>
      <div class="input-row">
        <select class="input" v-model="emptyDay">
          <option v-for="(d, i) in dayNames" :key="i" :value="i + 1">{{ d }}</option>
        </select>
        <select class="input" v-model="emptyPeriod">
          <option v-for="p in 12" :key="p" :value="p">{{ t('classroomNav.periodLabel') }} {{ p }} {{ t('classroomNav.periodSuffix') }}</option>
        </select>
        <input class="input" v-model="emptyKw" :placeholder="t('classroomNav.buildingPlaceholder')" />
        <button class="btn" :disabled="emptyLoading" @click="goEmpty">{{ emptyLoading ? t('classroomNav.querySearching') : t('classroomNav.queryEmpty') }}</button>
      </div>
    </div>

    <div class="panel">
      <div class="search-bar">
        <span class="search-icon">🔍</span>
        <input v-model="keyword" class="search-input" :placeholder="t('classroomNav.searchPlaceholder')" />
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
              <span class="bldg-meta">{{ b.campus }} · {{ b.zone || t('classroomNav.mainZone') }} · {{ b.floors.reduce((n, f) => n + f.rooms.length, 0) }} {{ t('classroomNav.roomCount2') }}</span>
              <span class="bldg-desc">{{ b.desc }}</span>
            </span>
            <span class="bldg-arrow">{{ expanded === b.name ? '▾' : '▸' }}</span>
          </button>

          <div v-if="expanded === b.name" class="bldg-detail">
            <div style="margin-bottom:10px;display:flex;gap:8px;flex-wrap:wrap;">
              <a class="btn" :href="b.mapUrl" target="_blank" rel="noopener" style="text-decoration:none;font-size:13px;padding:7px 14px;">{{ t('classroomNav.mapLink') }}</a>
            </div>
            <div class="route-box">
              <div class="detail-title">{{ t('classroomNav.navGuide') }}</div>
              <ol class="route-steps">
                <li v-for="(s, i) in (b.route.length ? b.route : fallbackRoute(b))" :key="i">{{ s }}</li>
              </ol>
            </div>
            <div class="detail-box" v-if="b.nearby.length">
              <div class="detail-title">{{ t('classroomNav.nearbyLandmark') }}</div>
              <div class="tags">
                <span v-for="n in b.nearby" :key="n" class="tag">{{ n }}</span>
              </div>
            </div>
            <div class="detail-box">
              <div class="detail-title">{{ t('classroomNav.floorRooms') }}</div>
              <div v-for="f in b.floors" :key="f.floor" class="floor-row">
                <span class="floor-tag">{{ f.floor }}</span>
                <span class="floor-rooms"><i v-for="n in f.rooms" :key="n" class="room-chip">{{ n }}</i></span>
              </div>
            </div>
          </div>
        </div>

        <div v-if="!list.length" class="empty">{{ t('classroomNav.noMatch') }}</div>
      </div>

      <div class="muted" style="margin-top:14px;font-size:12px;line-height:1.7;">
        {{ t('classroomNav.disclaimer') }}
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