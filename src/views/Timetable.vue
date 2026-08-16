<script setup>
import { ref, computed, onMounted } from 'vue'
import { apiFetch } from '../api/index'
import { loadSnap } from '../api/localCourse'

const emit = defineEmits(['back'])

const tab = ref('class')
const kw = ref('')
const meta = ref(null)
const snap = ref(null)
const loading = ref(true)
const opened = ref(null)

const dayNames = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
const ROW = 46
const PERIOD = 12
const normRoom = (r) => (r || '').replace(/[（(]智慧[)）]/g, '').trim()

onMounted(async () => {
  snap.value = await loadSnap()
  meta.value = await apiFetch('/courseTable')
  loading.value = false
})

const semester = computed(() => snap.value?.courseTable?.semester || meta.value?.semester || '')

const classes = computed(() => [...new Set((snap.value?.rows || []).map((r) => r.cls).filter(Boolean))])
const rooms = computed(() => [...new Set((snap.value?.rows || []).map((r) => r.r && normRoom(r.r)).filter(Boolean))].sort())
const teachers = computed(() => [...new Set((snap.value?.rows || []).map((r) => r.t).filter(Boolean))])

const sourceName = computed(() => (tab.value === 'class' ? '班级' : tab.value === 'room' ? '教室' : '教师'))

const result = computed(() => {
  const k = kw.value.trim()
  if (!k) return []
  const max = 60
  if (tab.value === 'class') return classes.value.filter((c) => c.includes(k)).slice(0, max)
  if (tab.value === 'room') return rooms.value.filter((r) => r.includes(k)).slice(0, max)
  return teachers.value.filter((t) => t.includes(k)).slice(0, max)
})

function coursesOf(obj) {
  const rows = snap.value?.rows || []
  if (tab.value === 'class') return rows.filter((r) => r.cls === obj)
  if (tab.value === 'room') return rows.filter((r) => normRoom(r.r) === obj)
  return rows.filter((r) => r.t === obj)
}

function open(obj) {
  const list = coursesOf(obj)
  const days = {}
  for (const co of list) {
    if (!days[co.d]) days[co.d] = []
    days[co.d].push(co)
  }
  opened.value = { name: obj, mode: tab.value, count: list.length, days }
}

function subOf(co) {
  if (opened.value.mode === 'room') return `${co.cls} · ${co.t}`
  if (opened.value.mode === 'teacher') return `${co.cls} · ${co.r}`
  return co.r || co.cls
}

const dayCourses = (d) => (opened.value?.days?.[d] || []).slice().sort((a, b) => a.s - b.s)

const posStyle = (co) => ({
  left: 'calc(40px + (100% - 40px) * ' + (co.d - 1) + ' / 7)',
  top: (co.s - 1) * ROW + 'px',
  height: (co.e - co.s + 1) * ROW - 3 + 'px'
})

// 官方课程总表
const courses = ref(null)
const coursesLoading = ref(true)
const fmtTime = (iso) => new Date(iso).toLocaleString('zh-CN', { hour12: false })
async function loadCourses(force) {
  coursesLoading.value = true
  courses.value = await apiFetch('/courses' + (force ? '?force=1' : ''))
  coursesLoading.value = false
}
onMounted(loadCourses)
</script>

<template>
  <div class="view-top">
    <button class="back-btn" @click="emit('back')">← 返回首页</button>
    <div class="view-title">课程表</div>
    <div class="view-sub">真实课表 · 据教务处{{ semester }}《课程总表》解析，共 {{ snap?.rows?.length || 0 }} 条排课</div>
  </div>

  <div v-if="loading" class="skeleton-list">
    <div v-for="i in 4" :key="i" class="skeleton-row"><div class="skeleton" style="width: 90%; height: 48px"></div></div>
  </div>

  <template v-else-if="opened">
    <div class="view-top" style="padding-top:0;">
      <button class="back-btn" @click="opened = null">← 返回查询</button>
      <div class="view-title">{{ opened.name }}</div>
      <div class="view-sub">{{ sourceName }}课表 · {{ semester }} · 共 {{ opened.count }} 门</div>
    </div>
    <div class="panel">
      <div class="week-grid">
        <div class="wg-head-row">
          <div class="wg-head wg-time-col">节次</div>
          <div v-for="d in dayNames" :key="d" class="wg-head">{{ d }}</div>
        </div>
        <div class="wg-body">
          <div v-for="p in PERIOD" :key="p" class="wg-time" :style="{ top: (p - 1) * ROW + 'px' }">
            {{ p }}
          </div>
          <div v-for="(d, i) in dayNames" :key="d">
            <div v-for="co in dayCourses(i + 1)" :key="co.c + co.s + co.r" class="wg-cell" :style="posStyle(co)">
              <b>{{ co.c }}</b>
              <div class="wg-sub">{{ subOf(co) }}</div>
              <div class="wg-sub muted">第{{ co.w }}周</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </template>

  <template v-else>
    <div class="panel" style="margin-bottom:16px;">
      <div class="source-bar" style="flex-wrap:wrap;">
        <i class="dot live"></i>
        {{ semester }} · {{ classes.length }} 个班级 · {{ rooms.length }} 间教室 · {{ teachers.length }} 位教师
        <span class="sep">·</span>
        <span>数据更新于 {{ snap?.updatedAt ? fmtTime(snap.updatedAt) : '—' }}</span>
      </div>
      <div class="tab-row" style="margin-top:10px;">
        <button class="tab" :class="{ active: tab === 'class' }" @click="tab = 'class'">班级课表</button>
        <button class="tab" :class="{ active: tab === 'room' }" @click="tab = 'room'">教室课表</button>
        <button class="tab" :class="{ active: tab === 'teacher' }" @click="tab = 'teacher'">教师课表</button>
      </div>
      <div class="input-row" style="margin-top:12px;">
        <input class="input" v-model="kw" :placeholder="'搜索' + sourceName + '（中文）'" @keyup.enter="result[0] && open(result[0])" />
      </div>
      <div class="muted" style="font-size:12px;margin-top:6px;">
        输入关键字即时匹配，点击结果查看周课表。例如班级「23高材」、教室「博学楼307」、教师姓名。
      </div>
    </div>

    <div class="panel" v-if="kw.trim()">
      <div class="muted" style="font-size:12px;margin-bottom:8px;">「{{ kw.trim() }}」匹配 {{ result.length }} 个{{ sourceName }}</div>
      <div class="cal-list">
        <button v-for="r in result" :key="r" class="cal-item" style="width:100%;text-align:left;cursor:pointer;border:none;background:none;font-family:inherit;" @click="open(r)">
          <span class="cal-title">{{ r }}</span>
          <span class="cal-go">查看课表 ›</span>
        </button>
        <div v-if="!result.length" class="muted" style="padding:16px;text-align:center;">未找到匹配的{{ sourceName }}，换个关键字试试</div>
      </div>
    </div>
  </template>

  <div class="panel" style="margin-bottom:16px;display:flex;align-items:center;gap:14px;flex-wrap:wrap;">
    <div style="flex:1;min-width:200px;">
      <div style="font-weight:700;">📖 教务系统 · 个人课表</div>
      <div class="muted" style="font-size:12px;margin-top:2px;">个人课表需登录教务系统查询（需统一身份认证，无法免登录对接）。</div>
    </div>
    <a class="btn" href="https://xjw.qdu.edu.cn/jsxsd" target="_blank" rel="noopener" style="text-decoration:none;">前往新教务综合系统 ↗</a>
  </div>

  <div class="panel" style="margin-bottom:16px;">
    <div style="display:flex;align-items:center;gap:10px;">
      <div style="flex:1;font-weight:700;">📄 官方课程总表（教务处公开数据）</div>
      <button class="refresh-btn" :disabled="coursesLoading" @click="loadCourses(true)">🔄 刷新</button>
    </div>
    <div class="source-bar" style="margin-top:6px;">
      <i class="dot" :class="courses?.cached ? 'off' : 'live'"></i>
      来源 jwc.qdu.edu.cn
      <span v-if="courses" class="sep">·</span>
      <span v-if="courses">抓取于 {{ fmtTime(courses.fetchedAt) }}</span>
    </div>
    <div v-if="coursesLoading" class="skeleton-list" style="margin-top:8px;">
      <div v-for="i in 3" :key="i" class="skeleton-row"><div class="skeleton" style="width:60%;height:16px"></div></div>
    </div>
    <div v-else-if="courses" class="cal-list" style="margin-top:8px;">
      <a v-for="c in courses.items" :key="c.url" class="cal-item" :href="c.url" target="_blank" rel="noopener">
        <span class="cal-title">{{ c.title }}</span>
        <span class="cal-date">{{ c.date }}</span>
        <span class="cal-go">官方页 ↗</span>
      </a>
    </div>
    <div v-else class="muted" style="padding:14px;text-align:center;">官方课程总表暂不可用，请稍后重试</div>
  </div>
</template>

<style scoped>
.week-grid { position: relative; }
.wg-head-row { display: grid; grid-template-columns: 40px repeat(7, 1fr); }
.wg-head { text-align: center; font-size: 12px; font-weight: 700; padding: 4px 0; box-sizing: border-box; }
.wg-body {
  position: relative;
  height: 552px;
  border-top: 1px solid var(--border);
}
.wg-time {
  position: absolute;
  left: 0;
  width: 40px;
  font-size: 11px;
  color: var(--text-light);
  text-align: center;
}
.wg-cell {
  position: absolute;
  width: calc((100% - 40px) / 7 - 6px);
  box-sizing: border-box;
  background: #eef4fd;
  border-left: 3px solid #1b66c9;
  border-radius: 8px;
  padding: 4px 5px;
  overflow: hidden;
  font-size: 11px;
  line-height: 1.4;
}
.wg-sub { font-size: 10px; color: var(--text-light); }
</style>