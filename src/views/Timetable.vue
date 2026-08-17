<script setup>
/** 课程表：班级/教室/教师课表查询 + 官方课程总表入口
 *  数据来自本地快照（loadSnap），网关可用时用网关补充元信息 */
import { ref, shallowRef, computed, watch, onMounted } from 'vue'
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
/** 当前学期排课（shallowRef：数据只读，避免 Vue 深度代理 5k+ 元素数组拖慢遍历） */
const termRows = shallowRef([])
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

/** termRows 始终是「当前选中学期」的 rows（onMounted/switchTerm 已按学期载入），直接返回省去重复 filter */
const curRows = computed(() => termRows.value)

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

const resultItems = computed(() => result.value.map((name) => ({ name, count: counts.value.get(name) || 0 })))

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

/** 智能页码：页数多时折叠为 首 1 2 3 … 末几页 */
const pageNos = computed(() => {
  const total = pageCount.value
  if (expandAll.value || total <= 7) {
    return expandAll.value ? [] : Array.from({ length: total }, (_, i) => i + 1)
  }
  const cur = page.value
  const nums = [...new Set([1, 2, total - 1, total, cur - 1, cur, cur + 1])]
    .filter((p) => p >= 1 && p <= total)
    .sort((a, b) => a - b)
  const out = []
  let prev = 0
  for (const p of nums) {
    if (p - prev > 1) out.push('…')
    out.push(p)
    prev = p
  }
  return out
})
const jumpPage = ref('')
function goPage(n) {
  const num = Math.floor(Number(n))
  if (!Number.isFinite(num)) return
  page.value = Math.max(1, Math.min(pageCount.value, num))
  jumpPage.value = ''
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

/** 各班级/教室/教师的一次性计数表（遍历一次 curRows 建 Map，供 resultItems O(1) 查询） */
const counts = computed(() => {
  const rows = curRows.value
  const m = new Map()
  const mode = tab.value
  if (mode === 'class') {
    for (const r of rows) {
      for (const c of clsSplit(r.cls)) m.set(c, (m.get(c) || 0) + 1)
    }
  } else if (mode === 'room') {
    for (const r of rows) {
      const k = normRoom(r.r)
      if (k) m.set(k, (m.get(k) || 0) + 1)
    }
  } else {
    for (const r of rows) if (r.t) m.set(r.t, (m.get(r.t) || 0) + 1)
  }
  return m
})

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
  return [co.t, co.r].filter(Boolean).join(' · ') || co.cls
}

/** 周课表视图：网格 / 列表；点击课程弹出详情 */
const viewMode = ref('grid')
const detail = ref(null)
function showCourse(co) {
  detail.value = co
}
const dayLabel = (d) => dayNames[d - 1] || ('周' + d)

const dayCourses = (d) => {
  const list = (opened.value?.days?.[d] || [])
    .slice()
    .filter((co) => !weekFilter.value || parseWeeks(co.w).has(+weekFilter.value))
    .sort((a, b) => a.s - b.s || (a.c < b.c ? -1 : a.c > b.c ? 1 : 0))
  // 同一课程·同一节次多位教师（分段授课，如大学英语读写译 4 位老师）合并为一条
  const map = new Map()
  for (const co of list) {
    const k = co.c + '|' + co.s + '|' + co.e
    if (!map.has(k)) map.set(k, { ...co, tList: [], wList: [] })
    const g = map.get(k)
    if (!g.tList.includes(co.t)) g.tList.push(co.t)
    if (!g.wList.includes(co.w)) g.wList.push(co.w)
  }
  return [...map.values()].map((g) => ({ ...g, t: g.tList.join('、'), w: g.wList.join('、') }))
}

/** 合班备注：该课面向哪些班（与当前查看对象不同或含范围时提示） */
function clsNote(co) {
  const raw = co.cls
  if (!raw) return ''
  if (opened.value?.mode !== 'class') return raw
  if (raw === opened.value.name) return ''
  return '合班 ' + raw
}

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
      <div class="tab-row" style="flex-wrap:wrap;gap:6px;margin-top:10px;">
        <button class="tab" :class="{ active: viewMode === 'grid' }" @click="viewMode = 'grid'">📅 周视图</button>
        <button class="tab" :class="{ active: viewMode === 'list' }" @click="viewMode = 'list'">📋 列表视图</button>
        <span class="muted" style="font-size:12px;margin-left:auto;">手机建议用列表视图，点课程看详情</span>
      </div>
    </div>
    <div class="panel">
      <div v-if="viewMode === 'grid'" class="week-grid">
        <div class="wg-head-row">
          <div class="wg-head wg-time-col">节次</div>
          <div v-for="d in dayNames" :key="d" class="wg-head">{{ d }}</div>
        </div>
        <div class="wg-body">
          <div v-for="p in PERIOD" :key="p" class="wg-time" :style="{ top: 'calc(var(--row,46px) * ' + (p - 1) + ')' }">
            {{ p }}
          </div>
          <div v-for="(d, i) in dayNames" :key="d">
            <div v-for="co in dayCourses(i + 1)" :key="co.c + co.s + co.r" class="wg-cell" :style="posStyle(co)" @click="showCourse(co)">
              <b>{{ co.c }}</b>
              <div class="wg-sub">{{ subOf(co) }}</div>
              <div class="wg-sub muted">{{ co.campus && co.campus !== '未标注' ? co.campus + ' · ' : '' }}第{{ co.w }}周</div>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="wg-list">
        <div v-for="(d, i) in dayNames" :key="d" class="wg-list-day">
          <div v-if="dayCourses(i + 1).length" class="wg-list-dayname">{{ d }}</div>
          <button v-for="co in dayCourses(i + 1)" :key="co.c + co.s + co.r" class="wg-list-item" @click="showCourse(co)">
            <span class="wg-li-time">{{ co.s }}–{{ co.e }} 节</span>
            <span class="wg-li-main">
              <b>{{ co.c }}</b>
              <span class="wg-li-sub">{{ subOf(co) }}</span>
              <span v-if="clsNote(co)" class="wg-li-cls">📌 {{ clsNote(co) }}</span>
            </span>
            <span class="wg-li-go">›</span>
          </button>
        </div>
        <p v-if="!Object.values(opened.days).flat().length" class="muted" style="padding:14px;text-align:center;">该学期暂无排课</p>
      </div>
    </div>

    <div v-if="detail" class="overlay" @click.self="detail = null">
      <div class="overlay-card course-detail">
        <div class="course-detail-head">
          <div class="course-detail-title">{{ detail.c }}</div>
          <button class="overlay-close" @click="detail = null">✕</button>
        </div>
        <div class="course-detail-row"><span>教师</span><b>{{ detail.t || '—' }}</b></div>
        <div class="course-detail-row"><span>教室</span><b>{{ detail.r || '—' }}</b></div>
        <div class="course-detail-row"><span>班级</span><b>{{ detail.cls || '—' }}</b></div>
        <div class="course-detail-row"><span>时间</span><b>{{ dayLabel(detail.d) }} · 第 {{ detail.s }}–{{ detail.e }} 节</b></div>
        <div class="course-detail-row"><span>周次</span><b>第 {{ detail.w }} 周</b></div>
        <div v-if="detail.campus && detail.campus !== '未标注'" class="course-detail-row"><span>校区</span><b>{{ detail.campus }}</b></div>
        <div v-if="detail.cat" class="course-detail-row"><span>类别</span><b>{{ detail.cat }}</b></div>
        <div v-if="detail.credit" class="course-detail-row"><span>学分</span><b>{{ detail.credit }}</b></div>
        <button class="btn accent" style="width:100%;margin-top:14px;" @click="detail = null">知道了</button>
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
        <button class="tab" :class="{ disabled: page <= 1 || expandAll }" @click="goPage(1)">«</button>
        <button class="tab" :class="{ disabled: page <= 1 || expandAll }" @click="goPage(page - 1)">‹ 上一页</button>
        <template v-for="(p, i) in pageNos" :key="i">
          <span v-if="p === '…'" class="pager-ellipsis">…</span>
          <button v-else class="tab" :class="{ active: page === p && !expandAll }" @click="goPage(p)">{{ p }}</button>
        </template>
        <button class="tab" :class="{ disabled: page >= pageCount || expandAll }" @click="goPage(page + 1)">下一页 ›</button>
        <button class="tab" :class="{ disabled: page >= pageCount || expandAll }" @click="goPage(pageCount)">»</button>
        <span class="pager-jump">
          <input class="input" v-model="jumpPage" type="number" min="1" :max="pageCount" placeholder="页" :disabled="expandAll" @keyup.enter="goPage(jumpPage)" />
          <button class="tab" @click="goPage(jumpPage)">跳转</button>
        </span>
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
.pager-ellipsis {
  color: var(--muted);
  font-size: 13px;
  padding: 0 2px;
  user-select: none;
}
.pager-jump {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.pager-jump .input {
  width: 52px;
  padding: 5px 8px;
  text-align: center;
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
  cursor: pointer;
}
.wg-cell b { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.wg-sub { font-size: 10px; color: var(--text-light); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* 列表视图 */
.wg-list { display: flex; flex-direction: column; gap: 12px; }
.wg-list-day { display: flex; flex-direction: column; gap: 6px; }
.wg-list-dayname { font-size: 13px; font-weight: 800; color: var(--primary); margin-top: 4px; }
.wg-list-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  text-align: left;
  border: 1px solid var(--border);
  border-left: 3px solid #1b66c9;
  border-radius: 10px;
  background: #fafcff;
  padding: 10px 12px;
  font-family: inherit;
  cursor: pointer;
  transition: 0.15s;
}
.wg-list-item:active { background: var(--primary-soft); }
.wg-li-time { flex: 0 0 58px; font-size: 12px; font-weight: 700; color: var(--primary); }
.wg-li-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.wg-li-main b { font-size: 14px; color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.wg-li-sub { font-size: 12px; color: var(--text-sub); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.wg-li-cls { font-size: 11px; color: #92400e; background: #fff8e6; border-radius: 6px; padding: 1px 6px; align-self: flex-start; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 100%; }
.wg-li-go { color: var(--text-light); font-size: 16px; }

/* 课程详情弹窗 */
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  z-index: 60;
}
.overlay-card {
  background: #fff;
  border-radius: 16px;
  padding: 18px;
  width: 100%;
  max-width: 420px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.25);
}
.course-detail-head { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
.course-detail-title { font-size: 16px; font-weight: 800; flex: 1; }
.overlay-close { border: none; background: none; font-size: 16px; cursor: pointer; color: var(--muted); }
.course-detail-row { display: flex; gap: 10px; padding: 8px 0; border-bottom: 1px dashed var(--border); font-size: 13px; }
.course-detail-row span { flex: 0 0 52px; color: var(--text-sub); }
.course-detail-row b { flex: 1; color: var(--text); font-weight: 600; word-break: break-all; }
@media (max-width: 640px) {
  /* 手机端：隐藏节次时间列，7 天均分一屏，无需左右拖拽；每卡只显示课程名，点卡片看详情 */
  .week-grid { --row: 30px; --tc: 0px; }
  .wg-head-row { grid-template-columns: repeat(7, 1fr); }
  .wg-time-col, .wg-time { display: none; }
  .wg-head { font-size: 10px; padding: 3px 0; }
  .wg-cell {
    font-size: 9px;
    padding: 2px 3px;
    border-left-width: 2px;
    border-radius: 4px;
    line-height: 1.25;
  }
  .wg-cell b {
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
    white-space: normal;
    word-break: break-all;
  }
  .wg-sub, .wg-sub.muted { display: none; }
}
</style>