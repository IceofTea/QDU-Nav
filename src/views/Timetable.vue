<script setup>
/** 课程表：班级/教室/教师课表查询 + 官方课程总表入口
 *  数据来自本地快照（loadSnap），网关可用时用网关补充元信息 */
import { ref, computed, watch, onMounted } from 'vue'
import { apiFetch } from '../api/index'
import { loadSnap } from '../api/localCourse'
import { loadTimetableMeta, loadTermRows } from '../api/termTimetable'
import { normRoom, clsSplit, profOf, parseWeeks } from '../utils/course'
import { fmtTime } from '../utils/format'

const emit = defineEmits(['back'])

const tab = ref('class')
const kw = ref('')
const meta = ref(null)
const snap = ref(null)
const termRows = ref([])
const loading = ref(true)
const opened = ref(null)
const term = ref('')
const weekFilter = ref('')

const dayNames = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
const PERIOD = 12

onMounted(async () => {
  const mm = await loadTimetableMeta()
  if (mm && mm.semesters && mm.semesters.length) {
    snap.value = mm
    const cur = mm.semesters.find((s) => s.semester === mm.currentSemester) || mm.semesters[0]
    term.value = cur.semester
    const t = await loadTermRows(cur.file)
    termRows.value = t.rows || []
  } else {
    const d = await loadSnap()
    snap.value = d
    termRows.value = d?.rows || []
    term.value = d?.courseTable?.semester || ''
  }
  loading.value = false
})

const semester = computed(() => snap.value?.courseTable?.semester || meta.value?.semester || '')

const semesters = computed(() => {
  const s = snap.value?.courseTables?.map((t) => t.semester) || []
  return s.length ? s : [semester.value]
})

const curRows = computed(() => {
  const rows = termRows.value || []
  const t = term.value
  if (!t || t === semester.value) return rows.filter((r) => r.term === semester.value)
  return rows.filter((r) => r.term === t)
})

const rooms = computed(() => [...new Set(curRows.value.map((r) => r.r && normRoom(r.r)).filter(Boolean))].sort())
const teachers = computed(() => [...new Set(curRows.value.map((r) => r.t).filter(Boolean))])

const sourceName = computed(() => (tab.value === 'class' ? '班级' : tab.value === 'room' ? '教室' : '教师'))

const singleClasses = computed(() => {
  const set = new Set()
  for (const r of curRows.value) clsSplit(r.cls).forEach((c) => set.add(c))
  return [...set].sort((a, b) => {
    const y = (s) => Number((s.match(/^2\d/) || [0])[0])
    return y(b) - y(a) || a.localeCompare(b, 'zh')
  })
})
const years = computed(() => [...new Set(singleClasses.value.map((c) => (c.match(/^2\d/) || [])[0]).filter(Boolean))].sort().reverse())
const profs = computed(() => {
  const m = {}
  for (const c of singleClasses.value) {
    const p = profOf(c)
    if (p) m[p] = (m[p] || 0) + 1
  }
  return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([p]) => p)
})
const gradeFilter = ref('')
const profFilter = ref('')

const result = computed(() => {
  const k = kw.value.trim()
  if (tab.value === 'class') {
    let list = singleClasses.value
    if (gradeFilter.value) list = list.filter((c) => c.startsWith(gradeFilter.value))
    if (profFilter.value) list = list.filter((c) => profOf(c) === profFilter.value)
    if (k) {
      const pre = list.filter((c) => c.startsWith(k))
      list = pre.length ? pre : list.filter((c) => c.includes(k))
    }
    return list
  }
  const src = tab.value === 'room' ? rooms.value : teachers.value
  return k ? src.filter((x) => x.includes(k)) : src
})

const resultItems = computed(() => result.value.map((name) => ({ name, count: countOf(name) })))

const PAGE_SIZE = 10
const page = ref(1)
const expandAll = ref(false)
const pageCount = computed(() => Math.max(1, Math.ceil(resultItems.value.length / PAGE_SIZE)))
const shown = computed(() =>
  expandAll.value
    ? resultItems.value
    : resultItems.value.slice((page.value - 1) * PAGE_SIZE, page.value * PAGE_SIZE)
)
function toggleExpand() {
  expandAll.value = !expandAll.value
}
watch([kw, gradeFilter, profFilter, tab, term], () => {
  page.value = 1
  expandAll.value = false
})

function switchTab(t) {
  tab.value = t
  gradeFilter.value = ''
  profFilter.value = ''
  page.value = 1
  expandAll.value = false
}

async function switchTerm(t) {
  term.value = t
  kw.value = ''
  gradeFilter.value = ''
  profFilter.value = ''
  opened.value = null
  page.value = 1
  expandAll.value = false
  const mm = snap.value
  const cur = mm?.semesters?.find((s) => s.semester === t)
  if (cur) {
    const d = await loadTermRows(cur.file)
    termRows.value = d.rows || []
  }
}

function countOf(obj) {
  const rows = curRows.value
  if (tab.value === 'class') return rows.filter((r) => clsSplit(r.cls).includes(obj)).length
  if (tab.value === 'room') return rows.filter((r) => normRoom(r.r) === obj).length
  return rows.filter((r) => r.t === obj).length
}

function coursesOf(obj) {
  const rows = curRows.value
  if (tab.value === 'class') return rows.filter((r) => clsSplit(r.cls).includes(obj))
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
  weekFilter.value = ''
}

const weekOptions = computed(() => {
  if (!opened.value) return []
  const s = new Set()
  for (const d of Object.values(opened.value.days)) for (const co of d) parseWeeks(co.w).forEach((n) => s.add(n))
  return [...s].sort((a, b) => a - b)
})

function subOf(co) {
  if (opened.value.mode === 'room') return `${co.cls} · ${co.t}`
  if (opened.value.mode === 'teacher') return `${co.cls} · ${co.r}`
  return co.r || co.cls
}

const dayCourses = (d) =>
  (opened.value?.days?.[d] || [])
    .slice()
    .filter((co) => !weekFilter.value || parseWeeks(co.w).has(+weekFilter.value))
    .sort((a, b) => a.s - b.s)

const posStyle = (co) => ({
  left: 'calc(var(--tc,40px) + (100% - var(--tc,40px)) * ' + (co.d - 1) + ' / 7)',
  top: 'calc(var(--row,46px) * ' + (co.s - 1) + ')',
  height: 'calc(var(--row,46px) * ' + (co.e - co.s + 1) + ' - 3px)'
})

// 官方课程总表
const courses = ref(null)
const coursesLoading = ref(true)
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
      <div class="view-sub">真实课表 · {{ term || semester }}《课程总表》，{{ curRows.length }} 条排课（含 {{ semesters.length }} 个学期并集）</div>
    </div>

  <div v-if="loading" class="skeleton-list">
    <div v-for="i in 4" :key="i" class="skeleton-row"><div class="skeleton" style="width: 90%; height: 48px"></div></div>
  </div>

  <template v-else-if="opened">
    <div class="view-top" style="padding-top:0;">
      <button class="back-btn" @click="opened = null">← 返回查询</button>
      <div class="view-title">{{ opened.name }}</div>
      <div class="view-sub">{{ sourceName }}课表 · {{ term || semester }} · 共 {{ opened.count }} 门</div>
    </div>
    <div class="panel" style="margin-bottom:12px;">
      <div class="muted" style="font-size:12px;margin-bottom:6px;">按周次筛选（默认显示全部周次）</div>
      <div class="tab-row" style="flex-wrap:wrap;gap:6px;">
        <button class="tab" :class="{ active: weekFilter === '' }" @click="weekFilter = ''">全部</button>
        <button v-for="w in weekOptions" :key="w" class="tab" :class="{ active: weekFilter === String(w) }" @click="weekFilter = String(w)">第{{ w }}周</button>
      </div>
    </div>
    <div class="panel">
      <div class="week-grid">
        <div class="wg-head-row">
          <div class="wg-head wg-time-col">节次</div>
          <div v-for="d in dayNames" :key="d" class="wg-head">{{ d }}</div>
        </div>
        <div class="wg-body">
          <div v-for="p in PERIOD" :key="p" class="wg-time" :style="{ top: 'calc(var(--row,46px) * ' + (p - 1) + ')' }">
            {{ p }}
          </div>
          <div v-for="(d, i) in dayNames" :key="d">
            <div v-for="co in dayCourses(i + 1)" :key="co.c + co.s + co.r" class="wg-cell" :style="posStyle(co)">
              <b>{{ co.c }}</b>
              <div class="wg-sub">{{ subOf(co) }}</div>
              <div class="wg-sub muted">{{ co.campus && co.campus !== '未标注' ? co.campus + ' · ' : '' }}第{{ co.w }}周</div>
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
        {{ term || semester }} · {{ singleClasses.length }} 个班级 · {{ rooms.length }} 间教室 · {{ teachers.length }} 位教师
        <span class="sep">·</span>
        <span>数据更新于 {{ snap?.updatedAt ? fmtTime(snap.updatedAt) : '—' }}</span>
      </div>
      <div v-if="semesters.length > 1" class="tab-row" style="margin-top:10px;">
        <button v-for="t in semesters" :key="t" class="tab" :class="{ active: term === t }" @click="switchTerm(t)">{{ t }}</button>
      </div>
      <div class="tab-row" style="margin-top:10px;">
        <button class="tab" :class="{ active: tab === 'class' }" @click="switchTab('class')">班级课表</button>
        <button class="tab" :class="{ active: tab === 'room' }" @click="switchTab('room')">教室课表</button>
        <button class="tab" :class="{ active: tab === 'teacher' }" @click="switchTab('teacher')">教师课表</button>
      </div>
      <div class="input-row" style="margin-top:12px;">
        <input class="input" v-model="kw" :placeholder="'搜索' + sourceName + '（中文）'" @keyup.enter="resultItems[0] && open(resultItems[0].name)" />
      </div>
      <div class="muted" style="font-size:12px;margin-top:6px;">
        可直接点选下方{{ sourceName }}，或用关键字搜索。例如班级「23高材」、教室「博学楼307」。
      </div>
      <template v-if="tab === 'class'">
        <div class="tab-row" style="flex-wrap:wrap;gap:6px;margin-top:10px;">
          <button class="tab" :class="{ active: gradeFilter === '' }" @click="gradeFilter = ''">全部年级</button>
          <button v-for="y in years" :key="y" class="tab" :class="{ active: gradeFilter === y }" @click="gradeFilter = y">{{ y }}级</button>
        </div>
        <div class="tab-row" style="flex-wrap:wrap;gap:6px;margin-top:8px;">
          <button class="tab" :class="{ active: profFilter === '' }" @click="profFilter = ''">全部专业</button>
          <button v-for="p in profs" :key="p" class="tab" :class="{ active: profFilter === p }" @click="profFilter = p">{{ p }}</button>
        </div>
      </template>
    </div>

    <div class="panel">
      <div class="muted" style="font-size:12px;margin-bottom:8px;">
        共 {{ resultItems.length }} 个{{ sourceName }}（{{ tab === 'class' ? '默认按年级排序，含合班课拆分' : '按名称排序' }}），点击查看周课表{{ resultItems.length > PAGE_SIZE ? ' · 每页 ' + PAGE_SIZE + ' 条' : '' }}
      </div>
      <div class="cal-list">
        <button v-for="it in shown" :key="it.name" class="cal-item" style="width:100%;text-align:left;cursor:pointer;border:none;background:none;font-family:inherit;" @click="open(it.name)">
          <span class="cal-title">{{ it.name }}</span>
          <span class="cal-count">{{ it.count }} 门课</span>
          <span class="cal-go">查看课表 ›</span>
        </button>
        <div v-if="!resultItems.length" class="muted" style="padding:16px;text-align:center;">没有匹配的{{ sourceName }}，换个关键字或筛选试试</div>
      </div>
      <div v-if="resultItems.length > PAGE_SIZE" class="pager">
        <button class="tab" :class="{ disabled: page <= 1 || expandAll }" @click="page = Math.max(1, page - 1)">‹ 上一页</button>
        <button
          v-for="p in pageCount"
          :key="p"
          class="tab"
          :class="{ active: page === p && !expandAll }"
          @click="page = p"
        >{{ p }}</button>
        <button class="tab" :class="{ disabled: page >= pageCount || expandAll }" @click="page = Math.min(pageCount, page + 1)">下一页 ›</button>
        <button class="tab accent" :class="{ active: expandAll }" @click="toggleExpand">{{ expandAll ? '收起分页' : '展开全部' }}</button>
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
.pager {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 12px;
  align-items: center;
}
.pager .tab.disabled {
  opacity: 0.45;
  pointer-events: none;
}
.week-grid { position: relative; --row: 46px; --tc: 40px; }
.wg-head-row { display: grid; grid-template-columns: var(--tc,40px) repeat(7, 1fr); }
.wg-head { text-align: center; font-size: 12px; font-weight: 700; padding: 4px 0; box-sizing: border-box; }
.wg-body {
  position: relative;
  height: calc(var(--row,46px) * 12);
  border-top: 1px solid var(--border);
}
.wg-time {
  position: absolute;
  left: 0;
  width: var(--tc,40px);
  font-size: 11px;
  color: var(--text-light);
  text-align: center;
}
.wg-cell {
  position: absolute;
  width: calc((100% - var(--tc,40px)) / 7 - 5px);
  box-sizing: border-box;
  background: #eef4fd;
  border-left: 3px solid #1b66c9;
  border-radius: 6px;
  padding: 3px 5px;
  overflow: hidden;
  font-size: 11px;
  line-height: 1.35;
}
.wg-cell b { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.wg-sub { font-size: 10px; color: var(--text-light); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
@media (max-width: 640px) {
  .week-grid { --row: 40px; --tc: 30px; }
  .wg-head { font-size: 10px; padding: 3px 0; }
  .wg-cell { font-size: 9px; padding: 2px 3px; border-left-width: 2px; border-radius: 4px; }
  .wg-sub { font-size: 8px; }
  .wg-time { font-size: 10px; }
}
</style>