<script setup>
import { ref, computed, onMounted } from 'vue'
import { buildings, campusFilters, searchRooms } from '../data/classrooms'
import { apiFetch } from '../api/index'

const emit = defineEmits(['back'])
const keyword = ref('')
const campus = ref('全部')
const expanded = ref(null)

const dayNames = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
const emptyDay = ref(1)
const emptyPeriod = ref(1)
const emptyKw = ref('')
const emptyLoading = ref(false)
const emptyResult = ref(null)
const roomSched = ref(null)
const roomSchedLoading = ref(false)
const courseTable = ref(null)

async function loadEmpty() {
  emptyLoading.value = true
  emptyResult.value = await apiFetch(
    '/emptyRooms?day=' + emptyDay.value + '&period=' + emptyPeriod.value + '&kw=' + encodeURIComponent(emptyKw.value.trim())
  )
  emptyLoading.value = false
}

async function selectRoom(room) {
  roomSchedLoading.value = true
  roomSched.value = await apiFetch('/roomSchedule?room=' + encodeURIComponent(room))
  roomSchedLoading.value = false
}

onMounted(async () => {
  courseTable.value = await apiFetch('/courseTable')
  loadEmpty()
})

const list = computed(() => {
  let r = searchRooms(keyword.value)
  if (campus.value !== '全部') r = r.filter((b) => b.campus === campus.value)
  return r
})

function toggle(b) {
  expanded.value = expanded.value === b.name ? null : b.name
}
</script>

<template>
  <div class="view-top">
    <button class="back-btn" @click="emit('back')">← 返回首页</button>
    <div class="view-title">教室导航</div>
    <div class="view-sub">空教室实时查询 · 教室导航 · 数据为社区整理，请以校园实地指示为准</div>
  </div>

  <div class="panel" style="margin-bottom:16px;">
    <div style="font-weight:700;margin-bottom:10px;">🪑 空教室实时查询
      <span v-if="courseTable" class="muted" style="font-size:12px;font-weight:400;">（{{ courseTable.semester }} · 教务处课程总表解析，{{ courseTable.rooms }} 间教室）</span>
    </div>
    <div class="input-row">
      <select class="input" v-model="emptyDay">
        <option v-for="(d, i) in dayNames" :key="i" :value="i + 1">{{ d }}</option>
      </select>
      <select class="input" v-model="emptyPeriod">
        <option v-for="p in 12" :key="p" :value="p">第 {{ p }} 节</option>
      </select>
      <input class="input" v-model="emptyKw" placeholder="楼宇过滤，如：博学楼" />
      <button class="btn" :disabled="emptyLoading" @click="loadEmpty">{{ emptyLoading ? '查询中…' : '查空教室' }}</button>
    </div>
    <div v-if="emptyLoading" class="skeleton-list" style="margin-top:12px;">
      <div v-for="i in 3" :key="i" class="skeleton-row"><div class="skeleton" style="width:70%;height:15px"></div></div>
    </div>
    <div v-else-if="emptyResult" style="margin-top:12px;">
      <div class="muted" style="font-size:12px;margin-bottom:8px;">
        {{ dayNames[emptyResult.day - 1] }} 第 {{ emptyResult.period }} 节空闲教室：{{ emptyResult.emptyCount }}/{{ emptyResult.total }}
      </div>
      <div class="tags">
        <button v-for="r in emptyResult.rooms" :key="r" class="tag tag-btn" @click="selectRoom(r)">{{ r }}</button>
      </div>
      <div v-if="!emptyResult.rooms.length" class="muted" style="font-size:12px;">该时段没有空闲教室</div>
    </div>
  </div>

  <div v-if="roomSchedLoading" class="panel" style="margin-bottom:16px;"><div class="skeleton" style="height:40px"></div></div>
  <div v-else-if="roomSched" class="panel" style="margin-bottom:16px;">
    <div style="font-weight:700;margin-bottom:8px;">🗓️ {{ roomSched.room }} 一周占用
      <span class="muted" style="font-size:12px;font-weight:400;">（{{ roomSched.semester }} · {{ roomSched.count }} 节课）</span>
    </div>
    <div class="cal-list">
      <div v-for="(x, i) in roomSched.schedule" :key="i" class="cal-item">
        <span class="cal-title">{{ x.c }}</span>
        <span class="cal-date">{{ dayNames[x.d - 1] }} 第{{ x.s }}-{{ x.e }}节 · 第{{ x.w }}周</span>
        <span class="cal-go">{{ x.cls }} · {{ x.t }}</span>
      </div>
      <div v-if="!roomSched.count" class="muted" style="padding:12px;text-align:center;">该教室本学期暂无排课</div>
    </div>
  </div>

  <div class="panel">
    <div class="search-bar">
      <span class="search-icon">🔍</span>
      <input v-model="keyword" class="search-input" placeholder="搜索教学楼、教室号，如：博文 / 310" />
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
            <div class="detail-title">🚶 分步路线</div>
            <ol class="route-steps">
              <li v-for="(s, i) in b.route" :key="i">{{ s }}</li>
            </ol>
          </div>
          <div class="detail-box">
            <div class="detail-title">📍 周边地标</div>
            <div class="tags">
              <span v-for="n in b.nearby" :key="n" class="tag">{{ n }}</span>
            </div>
          </div>
          <div class="detail-box">
            <div class="detail-title">🪟 楼层教室</div>
            <div v-for="f in b.floors" :key="f.floor" class="floor-row">
              <span class="floor-tag">{{ f.floor }}</span>
              <span class="floor-rooms">{{ f.rooms.join(' · ') }}</span>
            </div>
          </div>
        </div>
      </div>

      <div v-if="!list.length" class="empty">没有找到匹配的教室，换个关键词试试</div>
    </div>

    <div class="muted" style="margin-top:14px;font-size:12px;line-height:1.7;">
      楼宇名称参考智慧校园公告与官方渠道，教室分布为社区整理，请以校园实地标识为准。
    </div>
  </div>
</template>