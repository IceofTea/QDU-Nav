<script setup>
/** 数据洞察：课程大数据统计页
 *  数据来自 crawler/analysis.py 生成的 course_stats.json。
 *  统计维度：学期趋势 / 热门教室 / 热门教师 / 热门课程 / 周节次分布 /
 *            课程性质分布 / 校区分布 / 学院开课分布。
 *  条形行 / KPI 卡 / 洞察面板均使用公共组件（BarRow / KpiCard / InsightPanel）。 */
import { ref, computed, onMounted } from 'vue'
import { getCourseStats, EMPTY_STATS } from '../api/courseStats'
import CountUp from '../components/CountUp.vue'
import KpiCard from '../components/KpiCard.vue'
import BarRow from '../components/BarRow.vue'
import InsightPanel from '../components/InsightPanel.vue'
import { useI18n } from '../i18n'
import { setNavContext } from '../stores/navContext'

const { t, lang } = useI18n()

const emit = defineEmits(['back', 'open'])

const stats = ref(EMPTY_STATS)
const loading = ref(true)

const maxRoom = ref(1)
const maxTeacher = ref(1)
const maxCourse = ref(1)
const maxDay = ref(1)
const maxTerm = ref(1)
const maxKind = ref(1)
const maxCampus = ref(1)
const maxCol = ref(1)

onMounted(async () => {
  stats.value = await getCourseStats()
  const s = stats.value
  maxRoom.value = s.hotRooms.reduce((m, r) => Math.max(m, r.periods), 1)
  maxTeacher.value = s.hotTeachers.reduce((m, r) => Math.max(m, r.periods), 1)
  maxCourse.value = s.topCourses.reduce((m, r) => Math.max(m, r.sections), 1)
  maxDay.value = s.dayDist.reduce((m, r) => Math.max(m, r.count), 1)
  maxTerm.value = s.terms.reduce((m, r) => Math.max(m, r.count), 1)
  maxKind.value = labeledDist(s.kindDist).reduce((m, r) => Math.max(m, r.count), 1)
  maxCampus.value = labeledDist(s.campusDist).reduce((m, r) => Math.max(m, r.count), 1)
  maxCol.value = labeledDist(s.colDist).reduce((m, r) => Math.max(m, r.count), 1)
  loading.value = false
})

/** 课程性质/校区/学院等「附带列」是否已随抓取写入（旧快照可能全部为「未标注」） */
const hasDist = computed(() =>
  stats.value.kindDist.some((k) => k.name !== '未标注') &&
  stats.value.campusDist.some((k) => k.name !== '未标注')
)

const DAY_MAP = { '周一': 'Mon', '周二': 'Tue', '周三': 'Wed', '周四': 'Thu', '周五': 'Fri', '周六': 'Sat', '周日': 'Sun' }
const CAMPUS_MAP = { '浮山校区': 'Fushan', '金家岭校区': 'Jinjialing', '松山校区': 'Songshan', '未标注': 'Unlabeled' }
const LABEL_MAP = { '专业课': 'Major', '美育课': 'Aesthetic', '实践环节': 'Practical', '通识课': 'General', '公共课': 'Public', '选修课': 'Elective' }
const translateLabel = (name) => lang.value === 'en' ? (DAY_MAP[name] || CAMPUS_MAP[name] || LABEL_MAP[name] || name) : name

const total = computed(() => stats.value.periods || 1)
const share = (v) => Math.round((v / total.value) * 1000) / 10

/** 过滤「未标注」项：历史快照无附带列时不应展示 100% 未标注的无效分布 */
const labeledDist = (arr) => (arr || []).filter((k) => k.name !== '未标注')

/** 分布占比基于该分布自身的「已标注样本数」计算，避免未标注拉低真实占比 */
const distShare = (arr) => {
  const tot = labeledDist(arr).reduce((s, k) => s + k.count, 0)
  return (v) => (tot ? Math.round((v / tot) * 1000) / 10 : 0)
}

/** 概览 KPI */
const topCampus = computed(() => stats.value.campusDist[0] || null)
const topDay = computed(() => stats.value.dayDist[0] || null)
const colCount = computed(() => labeledDist(stats.value.colDist).length)
const maxPeriod = computed(() => stats.value.periodDist.reduce((m, r) => Math.max(m, r.count), 1))
const periodLabel = (start) => lang.value === 'en' ? `Period ${start}–${start + 1}` : `第 ${start}–${start + 1} 节`
const translatedName = (name) => lang.value === 'en' ? (CAMPUS_MAP[name] || name) : name

/** 自动生成的文字洞察（数据驱动，无统计时自动降级为空） */
const insights = computed(() => {
  const list = []
  if (topCampus.value) {
    const pct = distShare(stats.value.campusDist)(topCampus.value.count)
    list.push(lang.value === 'en' ? `Most courses at ${translatedName(topCampus.value.name)}, ${pct}% of labeled schedule` : `开课最集中在 ${topCampus.value.name}，占已标注排课的 ${pct}%`)
  }
  if (topDay.value) {
    list.push(lang.value === 'en' ? `${translateLabel(topDay.value.day)} is the busiest day (${topDay.value.count} periods) — library/study rooms will be tighter` : `${topDay.value.day}是全校排课最满的一天（${topDay.value.count} 节），图书馆/自习室会更紧张`)
  }
  const busy = stats.value.periodDist.reduce((a, b) => (b.count > a.count ? b : a), stats.value.periodDist[0] || null)
  if (busy) {
    list.push(lang.value === 'en' ? `${periodLabel(busy.start)} is the daily peak (${busy.count} periods) — avoid these slots for empty room searches` : `每天 ${periodLabel(busy.start)} 是排课高峰（${busy.count} 节次），想要抢空教室可以避开这些时段`)
  }
  if (stats.value.terms.length >= 2) {
    const [latest, prev] = stats.value.terms
    const d = latest.count - prev.count
    list.push(lang.value === 'en'
      ? (d >= 0 ? `Enrollment scale up ${d} sections vs last semester — slightly more competition` : `Enrollment scale down ${-d} sections vs last semester`)
      : (d >= 0 ? `本学期开课规模比上学期增加 ${d} 段，选课竞争略升` : `本学期开课规模比上学期减少 ${-d} 段`))
  }
  return list
})
</script>

<template>
  <div class="view-top">
    <button class="back-btn" @click="emit('back')">← {{ t('common.back').slice(2) }}</button>
    <div class="view-title">{{ t('courseStats.title') }}</div>
    <div class="view-sub">{{ t('courseStats.subFull', { n: stats.terms.length || 7 }) }}<CountUp :value="stats.periods" />{{ t('courseStats.subFull2') }}</div>
  </div>

  <div v-if="loading" class="muted" style="text-align:center;padding:40px;">{{ t('courseStats.loading') }}</div>
  <div v-else-if="!stats.periods" class="muted" style="text-align:center;padding:40px;">{{ t('courseStats.noStats') }}</div>

  <template v-else>
    <div v-if="!hasDist" class="panel" style="margin-bottom:16px;background: var(--notice-bg);border-color:var(--notice-border);">
      <div style="font-size:13px;font-weight:700;color:var(--notice-text);">{{ t('courseStats.distNote') }}</div>
      <p class="muted" style="font-size:12px;margin:6px 0 0;">{{ t('courseStats.distNoteDesc') }}</p>
    </div>

    <div class="kpi-grid">
      <KpiCard :value="stats.campusDist.length" :label="t('courseStats.kpiCampus')" :sub="t('courseStats.kpiCampusSub')" />
      <KpiCard :value="topCampus ? translatedName(topCampus.name) : '—'" :label="t('courseStats.kpiBusiest')" :sub="topCampus ? topCampus.count + (lang === 'en' ? ' entries · ' : ' 条 · ') + share(topCampus.count) + '%' : '—'" />
      <KpiCard :value="topDay ? translateLabel(topDay.day) : '—'" :label="t('courseStats.kpiBusiestDay')" :sub="topDay ? topDay.count + (lang === 'en' ? ' periods' : ' 节') : '—'" />
      <KpiCard :value="colCount" :label="t('courseStats.kpiCollege')" :sub="(lang === 'en' ? 'Busiest: ' : '开课最忙的是「') + ((labeledDist(stats.colDist)[0] || {}).name || '—') + (lang === 'en' ? '' : '」')" />
    </div>

    <InsightPanel :items="insights" />

    <div class="panel" style="margin-bottom:16px;">
      <div class="section-title" style="margin:0 0 12px;"><span class="bar"></span>{{ t('courseStats.termTrendTitle', { n: stats.terms.length }) }}</div>
      <BarRow v-for="t in stats.terms" :key="t.semester" :label="t.semester" :value="t.count" :max="maxTerm" :text="String(t.count)" color="linear-gradient(90deg,#1b66c9,#3b82f6)" />
      <p class="muted" style="font-size:12px;margin-top:8px;">{{ t('courseStats.termTrendNote') }}</p>
    </div>

    <div class="panel-grid">
      <div class="panel">
        <div class="section-title" style="margin:0 0 12px;"><span class="bar"></span>{{ t('courseStats.hotRoomTitle') }}</div>
        <BarRow v-for="r in stats.hotRooms" :key="r.name" :label="r.name" :value="r.periods" :max="maxRoom" :text="r.periods + (lang === 'en' ? ' periods · ' : ' 节次 · ') + share(r.periods) + '%'" color="linear-gradient(90deg,#0f766e,#14b8a6)" @click="setNavContext({ room: r.name }); emit('open', 'classroomNav')" style="cursor:pointer;" />
        <p class="muted" style="font-size:12px;margin-top:8px;">{{ t('courseStats.hotRoomNote') }}</p>
      </div>

      <div class="panel">
        <div class="section-title" style="margin:0 0 12px;"><span class="bar"></span>{{ t('courseStats.hotTeacherTitle') }}</div>
        <BarRow v-for="r in stats.hotTeachers" :key="r.name" :label="r.name" :value="r.periods" :max="maxTeacher" :text="r.periods + (lang === 'en' ? ' periods' : ' 节次')" color="linear-gradient(90deg,#b63a46,#e76f51)" />
        <p class="muted" style="font-size:12px;margin-top:8px;">{{ t('courseStats.hotTeacherNote') }}</p>
      </div>
    </div>

    <div class="panel-grid">
      <div class="panel">
        <div class="section-title" style="margin:0 0 12px;"><span class="bar"></span>{{ t('courseStats.hotCourseTitle') }}</div>
        <BarRow v-for="r in stats.topCourses" :key="r.name" :label="r.name" :value="r.sections" :max="maxCourse" :text="r.sections + (lang === 'en' ? ' sections' : ' 段')" color="linear-gradient(90deg,#7c3aed,#a78bfa)" />
        <p class="muted" style="font-size:12px;margin-top:8px;">{{ t('courseStats.hotCourseNote') }}</p>
      </div>

      <div class="panel">
        <div class="section-title" style="margin:0 0 12px;"><span class="bar"></span>{{ t('courseStats.weekDistTitle') }}</div>
        <BarRow v-for="r in stats.dayDist" :key="r.day" :label="translateLabel(r.day)" :value="r.count" :max="maxDay" :text="r.count + (lang === 'en' ? ' periods' : ' 节')" color="linear-gradient(90deg,#d97706,#f59e0b)" />
        <p class="muted" style="font-size:12px;margin-top:8px;">{{ t('courseStats.weekDistNote') }}</p>
      </div>

      <div v-if="stats.periodDist.length" class="panel">
        <div class="section-title" style="margin:0 0 12px;"><span class="bar"></span>{{ t('courseStats.periodDistTitle') }}</div>
        <BarRow v-for="r in stats.periodDist" :key="r.start" :label="periodLabel(r.start)" :value="r.count" :max="maxPeriod" :text="r.count + (lang === 'en' ? ' periods · ' : ' 节 · ') + share(r.count) + '%'" color="linear-gradient(90deg,#4d7c0f,#84cc16)" />
        <p class="muted" style="font-size:12px;margin-top:8px;">{{ t('courseStats.periodDistNote') }}</p>
      </div>
    </div>

    <div class="panel-grid">
      <div v-if="labeledDist(stats.kindDist).length" class="panel">
        <div class="section-title" style="margin:0 0 12px;"><span class="bar"></span>{{ t('courseStats.kindDistTitle') }}</div>
        <BarRow v-for="k in labeledDist(stats.kindDist)" :key="k.name" :label="translateLabel(k.name)" :value="k.count" :max="maxKind" :text="k.count + (lang === 'en' ? ' entries · ' : ' 条 · ') + distShare(stats.kindDist)(k.count) + '%'" color="linear-gradient(90deg,#0d9488,#2dd4bf)" />
        <p class="muted" style="font-size:12px;margin-top:8px;">{{ t('courseStats.kindDistNote') }}</p>
      </div>

      <div v-if="labeledDist(stats.campusDist).length" class="panel">
        <div class="section-title" style="margin:0 0 12px;"><span class="bar"></span>{{ t('courseStats.campusDistTitle') }}</div>
        <BarRow v-for="k in labeledDist(stats.campusDist)" :key="k.name" :label="translatedName(k.name)" :value="k.count" :max="maxCampus" :text="k.count + (lang === 'en' ? ' entries · ' : ' 条 · ') + distShare(stats.campusDist)(k.count) + '%'" color="linear-gradient(90deg,#2563eb,#60a5fa)" />
        <p class="muted" style="font-size:12px;margin-top:8px;">{{ t('courseStats.campusDistNote') }}</p>
      </div>
    </div>

    <div v-if="labeledDist(stats.colDist).length" class="panel" style="margin-bottom:16px;">
      <div class="section-title" style="margin:0 0 12px;"><span class="bar"></span>{{ t('courseStats.colDistTitle') }}</div>
      <BarRow v-for="k in labeledDist(stats.colDist)" :key="k.name" :label="k.name" :value="k.count" :max="maxCol" :text="k.count + (lang === 'en' ? ' entries · ' : ' 条 · ') + distShare(stats.colDist)(k.count) + '%'" color="linear-gradient(90deg,#be185d,#ec4899)" />
      <p class="muted" style="font-size:12px;margin-top:8px;">{{ t('courseStats.colDistNote') }}</p>
    </div>

    <div class="muted" style="font-size:12px;text-align:center;padding-bottom:6px;">{{ t('courseStats.sourceNote') }}</div>
  </template>
</template>

<style scoped>
.kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin-bottom: 16px; }
.panel-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 16px; margin-bottom: 16px; }
</style>