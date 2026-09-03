<script setup>
/** 生活费 · 专业版：多维图表（条形/圆饼可切换）+ 商户聚合 + 明细筛选 + 导出分析
 *  全部计算在本机浏览器完成；图表带索引，点击即筛选下方明细；
 *  日期范围自由选择（默认当前月份往前 12 个月），不受进入前所在月份限制。 */
import { ref, computed, watch, nextTick } from 'vue'
import BarRow from '../components/BarRow.vue'
import PieChart from '../components/PieChart.vue'
import LineChart from '../components/LineChart.vue'
import { cleanMerchant } from '../utils/billImport.js'
import { exportXlsx } from '../utils/xlsxExport.js'
import { useI18n } from '../i18n'

const { t, lang } = useI18n()

const props = defineProps({
  records: { type: Array, default: () => [] },
  month: { type: String, default: '' }
})
const emit = defineEmits(['back', 'update:month', 'remove'])

const EXP_LABEL = {
  food: '伙食费', party: '聚餐费', transport: '交通费', fruit: '水果零食', study: '学习资料',
  cloth: '衣物鞋帽', medical: '医疗保健', daily: '日常用品', phone: '电话费', fun: '娱乐游戏',
  beauty: '美容美发', digital: '数码家电', sport: '运动户外', virtual: '网络虚拟',
  housing: '房屋住宿', transfer: '转账支出', trouble: '闯祸费', other: '其它'
}
const EXP_LABEL_EN = {
  food: 'Food', party: 'Dining', transport: 'Transport', fruit: 'Snacks', study: 'Study',
  cloth: 'Clothes', medical: 'Medical', daily: 'Daily', phone: 'Phone', fun: 'Entertainment',
  beauty: 'Beauty', digital: 'Digital', sport: 'Sport', virtual: 'Virtual',
  housing: 'Housing', transfer: 'Transfer', trouble: 'Trouble', other: 'Other'
}
const expLabel = (key) => lang.value === 'en' ? (EXP_LABEL_EN[key] || key) : (EXP_LABEL[key] || key)
const EXP_ICON = {
  food: '🍚', party: '🍻', transport: '🚌', fruit: '🍎', study: '📚', cloth: '👕', medical: '💊',
  daily: '🧴', phone: '📱', fun: '🎮', beauty: '💇', digital: '📱', sport: '🏃', virtual: '🎭',
  housing: '🏠', transfer: '💸', trouble: '💥', other: '📦'
}
const INC_LABEL = {
  allowance: '生活费', scholarship: '奖学金', parttime: '兼职', prize: '红包/奖金',
  resale: '闲置转卖', refund: '退款', invest: '理财收益', transfer: '转账收入', other: '其它收入'
}
const INC_LABEL_EN = {
  allowance: 'Allowance', scholarship: 'Scholarship', parttime: 'Part-time', prize: 'Bonus',
  resale: 'Resale', refund: 'Refund', invest: 'Investment', transfer: 'Transfer In', other: 'Other Income'
}
const incLabel = (key) => lang.value === 'en' ? (INC_LABEL_EN[key] || key) : (INC_LABEL[key] || key)
const INC_ICON = {
  allowance: '💰', scholarship: '🏅', parttime: '💼', prize: '🎁', resale: '🏷️', refund: '↩️',
  invest: '📈', transfer: '💌', other: '📥'
}
const fmt = (n) => (n % 1 === 0 ? String(n) : n.toFixed(2))
const sum = (list, type) => Math.round(list.filter((r) => r.type === type).reduce((s, r) => s + r.amount, 0) * 100) / 100
const isExp = (r) => r.type === 'expense'

/* ---- 日期范围：默认当前月份往前 12 个月，可自由选择 ---- */
function curMonthStr(off) {
  const d = new Date()
  const dt = new Date(d.getFullYear(), d.getMonth() + off, 1)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`
}
function monthOffset(base, off) {
  const [y, m] = base.split('-').map(Number)
  const dt = new Date(y, m - 1 + off, 1)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`
}
const rangeEnd = ref(curMonthStr(0))
const rangeStart = ref(curMonthStr(-11))
const RANGE_PRESETS = [
  { label: '近3月', labelEn: 'Last 3 mo', n: -2 },
  { label: '近6月', labelEn: 'Last 6 mo', n: -5 },
  { label: '近12月', labelEn: 'Last 12 mo', n: -11 },
  { label: '近2年', labelEn: 'Last 2 yr', n: -23 },
  { label: '近3年', labelEn: 'Last 3 yr', n: -35 }
]
function presetRange(n) {
  rangeStart.value = curMonthStr(n)
  rangeEnd.value = curMonthStr(0)
}

/* ---- KPI ---- */
const totalInc = computed(() => sum(props.records, 'income'))
const totalExp = computed(() => sum(props.records, 'expense'))
const totalBal = computed(() => Math.round((totalInc.value - totalExp.value) * 100) / 100)
const refundTotal = computed(() => Math.round(props.records.filter((r) => r.refunded).reduce((s, r) => s + r.amount, 0) * 100) / 100)
const refundCount = computed(() => props.records.filter((r) => r.refunded).length)

/* ---- 区间内月度收支 ---- */
const inRange = computed(() => props.records.filter((r) => {
  const mk = (r.date || '').slice(0, 7)
  return mk && mk >= rangeStart.value && mk <= rangeEnd.value
}))
function monthList() {
  const [y1, m1] = rangeStart.value.split('-').map(Number)
  const [y2, m2] = rangeEnd.value.split('-').map(Number)
  const out = []
  let y = y1, m = m1
  while (y < y2 || (y === y2 && m <= m2)) {
    out.push(`${y}-${String(m).padStart(2, '0')}`)
    m++
    if (m > 12) { m = 1; y++ }
  }
  return out
}
const monthly = computed(() => monthList().map((key) => {
  const list = props.records.filter((r) => r.date.startsWith(key))
  return {
    key,
    label: key.slice(5) + (lang.value === 'en' ? '' : '月'),
    inc: sum(list, 'income'),
    exp: sum(list, 'expense'),
    bal: Math.round((sum(list, 'income') - sum(list, 'expense')) * 100) / 100
  }
}))
const maxMonthly = computed(() => Math.max(1, ...monthly.value.map((m) => Math.max(m.inc, m.exp))))
const rangeChartType = ref('bar') // 区间收支：bar 柱状 / line 折线
/* 结余趋势（区间内每月结余，折线） */
const balanceTrend = computed(() => {
  const line = monthly.value.map((m) => m.bal)
  return { labels: monthly.value.map((m) => m.label), series: [{ label: lang.value === 'en' ? 'Balance' : '结余', color: '#0d9488', data: line }] }
})

/* ---- 收支日历：日 / 周 / 月 / 年 视图，按当日盈亏着色 ---- */
const calMode = ref('day')
const now = new Date()
const calCursor = ref({ y: now.getFullYear(), m: now.getMonth() + 1 })
const dayBal = (d) => {
  const key = `${calCursor.value.y}-${String(calCursor.value.m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  const list = props.records.filter((r) => r.date === key)
  return Math.round((sum(list, 'income') - sum(list, 'expense')) * 100) / 100
}
const calGrid = computed(() => {
  const { y, m } = calCursor.value
  const firstDow = new Date(y, m - 1, 1).getDay()
  const dim = new Date(y, m, 0).getDate()
  const cells = []
  for (let i = 0; i < firstDow; i++) cells.push({ d: 0 })
  for (let d = 1; d <= dim; d++) cells.push({ d, bal: dayBal(d) })
  return cells
})
const calWeekStart = (i) => {
  const d = new Date()
  d.setDate(d.getDate() - i * 7)
  const s = new Date(d)
  s.setDate(s.getDate() - 6)
  return s
}
const fmtYmd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const balInRange = (s, e) => {
  const list = props.records.filter((r) => r.date >= s && r.date <= e)
  return Math.round((sum(list, 'income') - sum(list, 'expense')) * 100) / 100
}
const weekAgg = computed(() => {
  const out = []
  for (let w = 5; w >= 0; w--) {
    const start = calWeekStart(w)
    const end = new Date(start)
    end.setDate(start.getDate() + 6)
    out.push({ label: `${start.getMonth() + 1}/${start.getDate()}~${end.getMonth() + 1}/${end.getDate()}`, s: fmtYmd(start), e: fmtYmd(end), bal: balInRange(fmtYmd(start), fmtYmd(end)) })
  }
  return out
})
const monthAgg = computed(() => {
  const out = []
  for (let off = -11; off <= 0; off++) {
    const key = monthOffset(curMonthStr(0), off)
    const list = props.records.filter((r) => r.date.startsWith(key))
    out.push({ label: key.slice(5) + '月', key, bal: Math.round((sum(list, 'income') - sum(list, 'expense')) * 100) / 100 })
  }
  return out
})
const yearAgg = computed(() => {
  const yNow = now.getFullYear()
  const out = []
  for (let y = yNow - 4; y <= yNow; y++) {
    const list = props.records.filter((r) => r.date.startsWith(String(y)))
    out.push({ label: String(y), key: String(y), bal: Math.round((sum(list, 'income') - sum(list, 'expense')) * 100) / 100 })
  }
  return out
})
const calFilter = ref('') // 日历点击联动明细：day:key | week:s|e | month:key | year:key
function calSelDay(d) {
  if (!d) return
  calFilter.value = `day:${calCursor.value.y}-${String(calCursor.value.m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
}
function calSelRange(type, s, e) {
  calFilter.value = type === 'week' ? `week:${s}|${e}` : `${type}:${s}`
  window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
}

/* ---- 分类聚合 ---- */
const catAgg = computed(() => {
  const map = {}
  for (const r of inRange.value) {
    if (!isExp(r)) continue
    map[r.cat] = (map[r.cat] || 0) + r.amount
  }
  return Object.entries(map).map(([key, v]) => ({
    key,
    icon: EXP_ICON[key] || '📦',
    name: expLabel(key),
    v: Math.round(v * 100) / 100
  })).sort((a, b) => b.v - a.v)
})
const incAgg = computed(() => {
  const map = {}
  for (const r of inRange.value) {
    if (r.type !== 'income' || r.cat === 'refund') continue
    map[r.cat] = (map[r.cat] || 0) + r.amount
  }
  return Object.entries(map).map(([key, v]) => ({ key, icon: INC_ICON[key] || '📥', name: incLabel(key), v: Math.round(v * 100) / 100 })).sort((a, b) => b.v - a.v)
})
const maxCat = computed(() => Math.max(1, ...catAgg.value.map((c) => c.v)))
const maxInc = computed(() => Math.max(1, ...incAgg.value.map((c) => c.v)))

/* ---- 商户聚合 ---- */
const merchantAgg = computed(() => {
  const map = {}
  for (const r of inRange.value) {
    if (!isExp(r)) continue
    const m = cleanMerchant(r.merchant) || (lang.value === 'en' ? 'Other' : '其他')
    map[m] = (map[m] || 0) + r.amount
  }
  return Object.entries(map).map(([name, v]) => ({ name, icon: '🏪', v: Math.round(v * 100) / 100 })).sort((a, b) => b.v - a.v)
})
const maxMerchant = computed(() => Math.max(1, ...merchantAgg.value.map((m) => m.v)))
const merchantIncAgg = computed(() => {
  const map = {}
  for (const r of inRange.value) {
    if (r.type !== 'income') continue
    const m = cleanMerchant(r.merchant) || (lang.value === 'en' ? 'Other' : '其他')
    map[m] = (map[m] || 0) + r.amount
  }
  return Object.entries(map).map(([name, v]) => ({ name, icon: '🏪', v: Math.round(v * 100) / 100 })).sort((a, b) => b.v - a.v)
})
const maxMerInc = computed(() => Math.max(1, ...merchantIncAgg.value.map((m) => m.v)))

/* ---- 图表类型：条形 / 圆饼 ---- */
const expChartType = ref('bar')
const merChartType = ref('bar')
const incChartType = ref('bar')
const merIncChartType = ref('bar')

/* ---- 明细：日期范围 + 分类 / 商户筛选 + 排序（可升降）+ 10 条分页 ---- */
const proSort = ref('date')
const proDir = ref('desc')
const catFilterP = ref('all')
const merchantFilterP = ref('')
const incFilter = ref('')
const typeFilterP = ref('all')
const proPage = ref(1)
const PAGE = 10
const filtered = computed(() => {
  let list = props.records
  if (rangeStart.value && rangeEnd.value) {
    list = list.filter((r) => {
      const mk = (r.date || '').slice(0, 7)
      return mk && mk >= rangeStart.value && mk <= rangeEnd.value
    })
  }
  if (typeFilterP.value !== 'all') list = list.filter((r) => r.type === typeFilterP.value)
  if (catFilterP.value !== 'all') list = list.filter((r) => isExp(r) && r.cat === catFilterP.value)
  if (incFilter.value) list = list.filter((r) => r.type === 'income' && r.cat === incFilter.value)
  if (merchantFilterP.value) list = list.filter((r) => cleanMerchant(r.merchant) === merchantFilterP.value)
  if (calFilter.value) {
    if (calFilter.value.startsWith('day:')) list = list.filter((r) => r.date === calFilter.value.slice(4))
    else if (calFilter.value.startsWith('week:')) {
      const [s, e] = calFilter.value.slice(5).split('|')
      list = list.filter((r) => r.date >= s && r.date <= e)
    } else if (calFilter.value.startsWith('month:')) list = list.filter((r) => r.date.startsWith(calFilter.value.slice(6)))
    else if (calFilter.value.startsWith('year:')) list = list.filter((r) => r.date.startsWith(calFilter.value.slice(5)))
  }
  const arr = [...list]
  if (proSort.value === 'amount') arr.sort((a, b) => (proDir.value === 'asc' ? a.amount - b.amount : b.amount - a.amount) || (a.date < b.date ? 1 : -1))
  else if (proSort.value === 'cat') arr.sort((a, b) => expLabel(a.cat).localeCompare(expLabel(b.cat)) || (a.date < b.date ? 1 : -1))
  else arr.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.id - a.id))
  return arr
})
const filteredPage = computed(() => {
  const s = (proPage.value - 1) * PAGE
  return filtered.value.slice(s, s + PAGE)
})
const filteredCount = computed(() => Math.max(1, Math.ceil(filtered.value.length / PAGE)))
watch([rangeStart, rangeEnd, typeFilterP, catFilterP, incFilter, merchantFilterP, proSort], () => { proPage.value = 1 })
function switchProSort(k) {
  if (k === 'amount' && proSort.value === 'amount') proDir.value = proDir.value === 'desc' ? 'asc' : 'desc'
  proSort.value = k
  proPage.value = 1
}
function scrollToDetail() {
  nextTick(() => {
    const el = document.querySelector('.pro-detail')
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
}
function selectExpCat(label) {
  const found = catAgg.value.find((c) => c.name === label)
  if (found) { catFilterP.value = found.key; merchantFilterP.value = ''; incFilter.value = ''; proPage.value = 1; scrollToDetail() }
}
function selectIncCat(label) {
  const found = incAgg.value.find((c) => c.name === label)
  if (found) { incFilter.value = found.key; catFilterP.value = 'all'; merchantFilterP.value = ''; proPage.value = 1; scrollToDetail() }
}
function selectMerchant(name) {
  merchantFilterP.value = merchantFilterP.value === name ? '' : name
  catFilterP.value = 'all'
  incFilter.value = ''
  proPage.value = 1
  scrollToDetail()
}

/* ---- 导出分析文件（CSV，Excel 可直接打开）---- */
function exportCsv() {
  exportXlsx({
    fileName: lang.value === 'en' ? `Budget_${rangeStart.value}_${rangeEnd.value}.xlsx` : `生活费分析_${rangeStart.value}_${rangeEnd.value}.xlsx`,
    inc: totalInc.value,
    exp: totalExp.value,
    bal: totalBal.value,
    refundTotal: refundTotal.value,
    catExp: catAgg.value.map((c) => ({ name: c.name, v: c.v })),
    catInc: incAgg.value.map((c) => ({ name: c.name, v: c.v })),
    merExp: merchantAgg.value.slice(0, 30).map((m) => ({ name: m.name, v: m.v })),
    merInc: merchantIncAgg.value.slice(0, 30).map((m) => ({ name: m.name, v: m.v })),
    rows: filtered.value.map((r) => ({
      date: r.date,
      type: r.type,
      cat: isExp(r) ? expLabel(r.cat) : incLabel(r.cat),
      merchant: r.merchant || '',
      amount: r.amount,
      note: r.note || ''
    }))
  })
}
</script>

<template>
  <div class="view-top">
    <button class="back-btn" @click="emit('back')">{{ t('budgetPro.backToBudget') }}</button>
    <div class="view-title">{{ t('budgetPro.title') }}</div>
    <div class="view-sub">{{ t('budgetPro.sub') }}</div>
  </div>

  <div class="panel">
    <div class="kpi-row">
      <div class="kpi"><span>{{ t('budgetPro.totalIncome') }}</span><b class="in">+¥{{ fmt(totalInc) }}</b></div>
      <div class="kpi"><span>{{ t('budgetPro.totalExpense') }}</span><b class="out">-¥{{ fmt(totalExp) }}</b></div>
      <div class="kpi"><span>{{ t('budgetPro.balanceLabel') }}</span><b :class="totalBal >= 0 ? 'in' : 'out'">{{ totalBal >= 0 ? '+' : '' }}¥{{ fmt(totalBal) }}</b></div>
      <div class="kpi"><span>{{ t('budgetPro.refundOffset') }}</span><b>{{ refundCount }} {{ t('budgetPro.refundUnit') }} ¥{{ fmt(refundTotal) }}</b></div>
    </div>
  </div>

  <div class="panel">
    <div class="section-head" style="align-items:center;margin:0 0 10px;">
      <h3 class="section-title" style="margin:0;"><span class="bar"></span>{{ t('budgetPro.rangeTitle') }}</h3>
      <div class="chart-type">
        <button class="tab" :class="{ active: rangeChartType === 'bar' }" @click="rangeChartType = 'bar'">{{ t('budgetPro.chartBar') }}</button>
        <button class="tab" :class="{ active: rangeChartType === 'line' }" @click="rangeChartType = 'line'">{{ t('budgetPro.chartLine') }}</button>
      </div>
    </div>
    <div class="range-row">
      <div class="range-inputs">
        <input v-model="rangeStart" type="month" class="input" />
        <span class="muted">{{ t('budgetPro.rangeTo') }}</span>
        <input v-model="rangeEnd" type="month" class="input" />
      </div>
      <div class="range-presets">
        <button v-for="p in RANGE_PRESETS" :key="p.label" class="tab" @click="presetRange(p.n)">{{ lang === 'en' ? p.labelEn : p.label }}</button>
      </div>
    </div>
    <div v-if="rangeChartType === 'bar'" class="bar-chart">
      <div v-for="m in monthly" :key="m.key" class="bc-col" :class="{ cur: m.key === month }" @click="emit('update:month', m.key); emit('back')">
        <div class="bc-labels">
          <span v-if="m.inc" class="bc-inc">+{{ fmt(m.inc) }}</span>
          <span v-if="m.exp" class="bc-exp">-{{ fmt(m.exp) }}</span>
        </div>
        <div class="bc-bars">
          <i class="bc-inc-bar" :style="{ height: Math.max(3, Math.round(m.inc / maxMonthly * 88)) + '%' }"></i>
          <i class="bc-exp-bar" :style="{ height: Math.max(3, Math.round(m.exp / maxMonthly * 88)) + '%' }"></i>
        </div>
        <span class="bc-label">{{ m.label }}</span>
      </div>
    </div>
    <LineChart v-else :series="[
      { label: lang.value === 'en' ? 'Income' : '收入', color: '#0d9488', data: monthly.map((m) => m.inc) },
      { label: lang.value === 'en' ? 'Expense' : '支出', color: '#b63a46', data: monthly.map((m) => m.exp) }
    ]" :labels="monthly.map((m) => m.label)" :height="160" value-prefix="¥" :max-width="760" />
    <p class="muted" style="font-size:11px;margin-top:8px;">{{ t('budgetPro.rangeClickNote') }}</p>
  </div>

  <div class="pro-duo">
  <div class="panel">
    <div class="section-title" style="margin:0 0 10px;"><span class="bar"></span>{{ t('budgetPro.balanceTrendTitle') }}</div>
    <LineChart :series="balanceTrend.series" :labels="balanceTrend.labels" :height="150" value-prefix="¥" />
    <p class="muted" style="font-size:11px;margin-top:6px;">{{ t('budgetPro.balanceTrendNote') }}</p>
  </div>

  <div class="panel">
    <div class="section-head" style="align-items:center;margin:0 0 10px;">
      <h3 class="section-title" style="margin:0;"><span class="bar"></span>{{ t('budgetPro.calendarTitle') }}</h3>
      <div class="chart-type">
        <button v-for="m in [{ k: 'day', t: t('budgetPro.calendarDay') }, { k: 'week', t: t('budgetPro.calendarWeek') }, { k: 'month', t: t('budgetPro.calendarMonth') }, { k: 'year', t: t('budgetPro.calendarYear') }]" :key="m.k" class="tab" :class="{ active: calMode === m.k }" @click="calMode = m.k">{{ m.t }}</button>
      </div>
    </div>

    <template v-if="calMode === 'day'">
      <div class="cal-nav">
        <button class="btn ghost small" @click="calCursor = { y: calCursor.y, m: calCursor.m === 1 ? 12 : calCursor.m - 1 }; if (calCursor.m === 12) calCursor.y--">‹ {{ lang === 'en' ? 'Prev' : '上月' }}</button>
        <span class="cal-title">{{ calCursor.y }}{{ lang === 'en' ? '/' : '年' }}{{ calCursor.m }}{{ lang === 'en' ? '' : '月' }}</span>
        <button class="btn ghost small" @click="calCursor = { y: calCursor.y, m: calCursor.m === 12 ? 1 : calCursor.m + 1 }; if (calCursor.m === 1) calCursor.y++">{{ lang === 'en' ? 'Next' : '下月' }} ›</button>
      </div>
      <div class="cal-grid">
        <span v-for="w in (lang === 'en' ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] : ['日', '一', '二', '三', '四', '五', '六'])" :key="w" class="cal-wd">{{ w }}</span>
        <button v-for="(c, i) in calGrid" :key="i" class="cal-cell" :class="{ empty: !c.d, pos: c.d && c.bal > 0, neg: c.d && c.bal < 0 }" @click="calSelDay(c.d)">
          <template v-if="c.d">
            <span class="cal-d">{{ c.d }}</span>
            <span class="cal-bal">{{ c.bal > 0 ? '+' + fmt(c.bal) : c.bal < 0 ? '-' + fmt(Math.abs(c.bal)) : '' }}</span>
          </template>
        </button>
      </div>
    </template>

    <template v-else-if="calMode === 'week'">
      <div class="cal-week-grid">
        <button v-for="w in weekAgg" :key="w.label" class="cal-week" :class="w.bal > 0 ? 'pos' : w.bal < 0 ? 'neg' : ''" @click="calSelRange('week', w.s, w.e)">
          <span class="cal-week-label">{{ w.label }}</span>
          <b class="cal-week-val">{{ w.bal >= 0 ? '+' : '' }}{{ fmt(w.bal) }}</b>
        </button>
      </div>
    </template>

    <template v-else-if="calMode === 'month'">
      <div class="cal-grid2">
        <button v-for="m in monthAgg" :key="m.key" class="cal-tile" :class="m.bal > 0 ? 'pos' : m.bal < 0 ? 'neg' : ''" @click="calSelRange('month', m.key)">
          <span>{{ m.label }}</span>
          <b>{{ m.bal > 0 ? '+' : '' }}{{ fmt(m.bal) }}</b>
        </button>
      </div>
    </template>

    <template v-else>
      <div class="cal-grid2">
        <button v-for="y in yearAgg" :key="y.key" class="cal-tile" :class="y.bal > 0 ? 'pos' : y.bal < 0 ? 'neg' : ''" @click="calSelRange('year', y.key)">
          <span>{{ y.label }}{{ lang === 'en' ? '' : ' 年' }}</span>
          <b>{{ y.bal > 0 ? '+' : '' }}{{ fmt(y.bal) }}</b>
        </button>
      </div>
    </template>
    <p class="muted" style="font-size:11px;margin-top:8px;">{{ t('budgetPro.calendarNote') }}</p>
  </div>
  </div>

  <div class="g2">
  <div class="panel">
    <div class="section-head" style="align-items:center;margin:0 0 10px;">
      <h3 class="section-title" style="margin:0;"><span class="bar"></span>{{ t('budgetPro.expCatTitle') }}</h3>
      <div class="chart-type">
        <button class="tab" :class="{ active: expChartType === 'bar' }" @click="expChartType = 'bar'">▥ {{ lang === 'en' ? 'Bar' : '条形' }}</button>
        <button class="tab" :class="{ active: expChartType === 'pie' }" @click="expChartType = 'pie'">◔ {{ lang === 'en' ? 'Pie' : '圆饼' }}</button>
      </div>
    </div>
    <div v-if="!catAgg.length" class="muted" style="text-align:center;padding:10px;">{{ t('budgetPro.noData') }}</div>
    <template v-else>
      <div v-if="expChartType === 'bar'" class="chart-rows">
        <button v-for="c in catAgg" :key="c.key" class="chart-row" @click="selectExpCat(c.name)">
          <BarRow :label="c.icon + ' ' + c.name" :value="c.v" :max="maxCat" :text="'¥' + fmt(c.v) + ' · ' + Math.round(c.v / Math.max(1, catAgg.reduce((s, x) => s + x.v, 0)) * 100) + '%'" color="linear-gradient(90deg,#b63a46,#e76f51)" />
        </button>
      </div>
      <PieChart v-else :segments="catAgg" :total="catAgg.reduce((s, x) => s + x.v, 0)" value-prefix="¥" @select="selectExpCat" />
    </template>
  </div>

  <div class="panel">
    <div class="section-head" style="align-items:center;margin:0 0 10px;">
      <h3 class="section-title" style="margin:0;"><span class="bar"></span>{{ t('budgetPro.incCatTitle') }}</h3>
      <div class="chart-type">
        <button class="tab" :class="{ active: incChartType === 'bar' }" @click="incChartType = 'bar'">▥ {{ lang === 'en' ? 'Bar' : '条形' }}</button>
        <button class="tab" :class="{ active: incChartType === 'pie' }" @click="incChartType = 'pie'">◔ {{ lang === 'en' ? 'Pie' : '圆饼' }}</button>
      </div>
    </div>
    <div v-if="!incAgg.length" class="muted" style="text-align:center;padding:10px;">{{ t('budgetPro.noData') }}</div>
    <template v-else>
      <div v-if="incChartType === 'bar'" class="chart-rows">
        <button v-for="c in incAgg" :key="c.key" class="chart-row" @click="selectIncCat(c.name)">
          <BarRow :label="c.icon + ' ' + c.name" :value="c.v" :max="maxInc" :text="'¥' + fmt(c.v) + ' · ' + Math.round(c.v / Math.max(1, incAgg.reduce((s, x) => s + x.v, 0)) * 100) + '%'" color="linear-gradient(90deg,#0d9488,#2dd4bf)" />
        </button>
      </div>
      <PieChart v-else :segments="incAgg" :total="incAgg.reduce((s, x) => s + x.v, 0)" value-prefix="¥" @select="selectIncCat" />
    </template>
  </div>
  </div>

  <div class="g2">
  <div class="panel">
    <div class="section-head" style="align-items:center;margin:0 0 10px;">
      <h3 class="section-title" style="margin:0;"><span class="bar"></span>{{ t('budgetPro.merExpTitle') }}</h3>
      <div class="chart-type">
        <button class="tab" :class="{ active: merChartType === 'bar' }" @click="merChartType = 'bar'">▥ {{ lang === 'en' ? 'Bar' : '条形' }}</button>
        <button class="tab" :class="{ active: merChartType === 'pie' }" @click="merChartType = 'pie'">◔ {{ lang === 'en' ? 'Pie' : '圆饼' }}</button>
      </div>
    </div>
    <div v-if="!merchantAgg.length" class="muted" style="text-align:center;padding:10px;">{{ t('budgetPro.noData') }}</div>
    <template v-else>
      <div v-if="merChartType === 'bar'" class="chart-rows">
        <button v-for="m in merchantAgg.slice(0, 15)" :key="m.name" class="chart-row" @click="selectMerchant(m.name)">
          <BarRow :label="'🏪 ' + m.name" :value="m.v" :max="maxMerchant" :text="'¥' + fmt(m.v)" color="linear-gradient(90deg,#0d9488,#2dd4bf)" />
        </button>
      </div>
      <PieChart v-else :segments="merchantAgg.slice(0, 15)" :total="merchantAgg.slice(0, 15).reduce((s, x) => s + x.v, 0)" value-prefix="¥" @select="selectMerchant" />
    </template>
  </div>

  <div class="panel">
    <div class="section-head" style="align-items:center;margin:0 0 10px;">
      <h3 class="section-title" style="margin:0;"><span class="bar"></span>{{ t('budgetPro.merIncTitle') }}</h3>
      <div class="chart-type">
        <button class="tab" :class="{ active: merIncChartType === 'bar' }" @click="merIncChartType = 'bar'">▥ {{ lang === 'en' ? 'Bar' : '条形' }}</button>
        <button class="tab" :class="{ active: merIncChartType === 'pie' }" @click="merIncChartType = 'pie'">◔ {{ lang === 'en' ? 'Pie' : '圆饼' }}</button>
      </div>
    </div>
    <div v-if="!merchantIncAgg.length" class="muted" style="text-align:center;padding:10px;">{{ t('budgetPro.noData') }}</div>
    <template v-else>
      <div v-if="merIncChartType === 'bar'" class="chart-rows">
        <button v-for="m in merchantIncAgg.slice(0, 15)" :key="m.name" class="chart-row" @click="selectMerchant(m.name)">
          <BarRow :label="'🏪 ' + m.name" :value="m.v" :max="maxMerInc" :text="'¥' + fmt(m.v)" color="linear-gradient(90deg,#2563eb,#60a5fa)" />
        </button>
      </div>
      <PieChart v-else :segments="merchantIncAgg.slice(0, 15)" :total="merchantIncAgg.slice(0, 15).reduce((s, x) => s + x.v, 0)" value-prefix="¥" @select="selectMerchant" />
    </template>
  </div>
  </div>

  <div class="panel pro-detail">
    <div class="section-head" style="align-items:center;margin:0 0 8px;">
      <h3 class="section-title" style="margin:0;">{{ t('budgetPro.detailTitle') }}</h3>
      <button class="btn ghost small" @click="exportCsv">{{ t('budgetPro.exportBtn') }}</button>
    </div>
    <div class="sort-row">
      <button class="tab" :class="{ active: typeFilterP === 'all' }" @click="typeFilterP = 'all'; catFilterP = 'all'; incFilter = ''">{{ t('budgetPro.typeAll') }}</button>
      <button class="tab" :class="{ active: typeFilterP === 'expense' }" @click="typeFilterP = 'expense'; catFilterP = 'all'; incFilter = ''">{{ t('budgetPro.typeExpense') }}</button>
      <button class="tab" :class="{ active: typeFilterP === 'income' }" @click="typeFilterP = 'income'; incFilter = ''">{{ t('budgetPro.typeIncome') }}</button>
      <span class="sep">|</span>
      <button class="tab" :class="{ active: proSort === 'date' }" @click="switchProSort('date')">{{ t('budgetPro.sortByDate') }}</button>
      <button class="tab" :class="{ active: proSort === 'amount' }" @click="switchProSort('amount')">{{ t('budgetPro.sortByAmount') }}{{ proSort === 'amount' ? (proDir === 'asc' ? ' ↑' : ' ↓') : '' }}</button>
      <button class="tab" :class="{ active: proSort === 'cat' }" @click="switchProSort('cat')">{{ t('budgetPro.sortByCat') }}</button>
      <span class="muted" style="font-size:10px;margin-left:auto;">{{ filtered.length }} {{ lang === 'en' ? 'entries' : '笔' }}</span>
    </div>
    <div v-if="proSort === 'cat'" class="cat-chips">
      <button v-if="typeFilterP !== 'income'" class="chip" :class="{ active: catFilterP === 'all' }" @click="catFilterP = 'all'">{{ lang === 'en' ? 'All Expenses' : '全部支出' }}</button>
      <button v-for="c in catAgg" :key="c.key" class="chip" :class="{ active: catFilterP === c.key }" @click="catFilterP = c.key">{{ c.icon }}{{ c.name }}</button>
      <template v-if="typeFilterP === 'income'">
        <button class="chip" :class="{ active: incFilter === '' }" @click="incFilter = ''">{{ lang === 'en' ? 'All Income' : '全部收入' }}</button>
        <button v-for="c in incAgg" :key="c.key" class="chip" :class="{ active: incFilter === c.key }" @click="incFilter = c.key">{{ c.icon }}{{ c.name }}</button>
      </template>
    </div>
    <div v-if="catFilterP !== 'all' || merchantFilterP || incFilter" class="pro-filter-tip">
      {{ t('budgetPro.filteredBy') }}<b>{{ incFilter ? incLabel(incFilter) : catFilterP !== 'all' ? expLabel(catFilterP) : merchantFilterP }}</b>
      <button class="btn ghost small" @click="catFilterP = 'all'; merchantFilterP = ''; incFilter = ''">✕ {{ t('budgetPro.clearFilter') }}</button>
    </div>
    <div v-if="!filtered.length" class="muted" style="text-align:center;padding:16px;">{{ t('budgetPro.noRecord') }}</div>
    <div v-else class="rec-list">
      <div v-for="r in filteredPage" :key="r.id" class="rec-row">
        <span class="rec-icon">{{ isExp(r) ? (EXP_ICON[r.cat] || '📦') : (INC_ICON[r.cat] || '💵') }}</span>
        <span class="rec-main">
          <span class="rec-name">{{ (isExp(r) ? expLabel(r.cat) : incLabel(r.cat)) || r.cat }}<em v-if="r.merchant"> · {{ r.merchant }}</em><em v-if="r.refunded"> ↩︎{{ lang === 'en' ? 'Refunded' : '已退款' }}</em><em v-if="r.note && r.note !== r.merchant"> · {{ r.note }}</em></span>
          <span class="muted" style="font-size:11px;">{{ r.date }}</span>
        </span>
        <span class="rec-amt" :class="isExp(r) ? 'out' : 'in'">{{ isExp(r) ? '-' : '+' }}¥{{ fmt(r.amount) }}</span>
        <button class="rec-del" @click="emit('remove', r.id)" :title="t('budget.delete')">✕</button>
      </div>
    </div>
    <div v-if="filteredCount > 1" class="pager">
      <button class="btn ghost small" :disabled="proPage <= 1" @click="proPage--">‹ {{ lang === 'en' ? 'Prev' : '上页' }}</button>
      <div class="pager-jump">
        <input v-model.number="proPage" type="number" class="input page-input" min="1" :max="filteredCount" />
        <span>/ {{ filteredCount }}</span>
      </div>
      <button class="btn ghost small" :disabled="proPage >= filteredCount" @click="proPage++">{{ lang === 'en' ? 'Next' : '下页' }} ›</button>
    </div>
  </div>

  <p class="muted" style="font-size:12px;text-align:center;padding:4px 0 10px;">
    {{ t('budgetPro.proPrivacyNote') }}
  </p>
</template>

<style scoped>
.kpi-row { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.kpi {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px;
  border-radius: 12px;
  background: var(--primary-soft);
}
.kpi span { font-size: 11px; color: var(--text-sub); }
.kpi b { font-size: 16px; }
.kpi b.in { color: #0f766e; }
.kpi b.out { color: #b63a46; }

.range-row { display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px; }
.range-inputs { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.range-inputs .input { width: 128px; font-size: 13px; }
.range-presets { display: flex; gap: 6px; flex-wrap: wrap; }
.range-presets .tab { flex: 0 0 auto; font-size: 12px; }

.bar-chart { display: flex; gap: 6px; height: 168px; overflow-x: auto; padding-bottom: 2px; }
.bc-col {
  flex: 0 0 46px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  gap: 3px;
  border-radius: 8px;
  padding: 4px 2px;
  cursor: pointer;
}
.bc-col.cur { background: var(--primary-soft); }
.bc-labels { display: flex; flex-direction: column; align-items: center; gap: 1px; font-size: 9px; min-height: 28px; }
.bc-inc { color: #0f766e; white-space: nowrap; }
.bc-exp { color: #b63a46; white-space: nowrap; }
.bc-bars { display: flex; align-items: flex-end; gap: 3px; height: 100px; width: 100%; justify-content: center; }
.bc-bars i { width: 12px; border-radius: 4px 4px 0 0; }
.bc-inc-bar { background: linear-gradient(180deg, #2dd4bf, #0d9488); }
.bc-exp-bar { background: linear-gradient(180deg, #e76f51, #b63a46); }
.bc-label { font-size: 10px; color: var(--text-sub); }

.chart-rows { display: flex; flex-direction: column; }
.chart-row {
  border: none;
  background: none;
  padding: 0;
  text-align: left;
  cursor: pointer;
  border-radius: 8px;
}
.chart-row:hover { background: var(--primary-soft); }
.chart-type { display: flex; gap: 6px; }
.chart-type .tab { font-size: 11px; }

.sort-row { display: flex; align-items: center; gap: 6px; margin-bottom: 10px; flex-wrap: wrap; }
.sort-row .tab { flex: 0 0 auto; font-size: 12px; }
.sep { color: var(--text-light); font-size: 12px; }
.cat-chips { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 10px; }
.cat-chips .chip {
  border: 1px solid var(--border);
  background: var(--card);
  border-radius: 999px;
  padding: 3px 10px;
  font-size: 11px;
  font-family: inherit;
  color: var(--text-sub);
  cursor: pointer;
}
.cat-chips .chip.active { border-color: var(--primary); color: var(--primary); background: var(--primary-soft); font-weight: 700; }

.pro-filter-tip {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  padding: 8px 10px;
  background: var(--soft-green);
  border: 1px solid var(--soft-green-border);
  border-radius: 10px;
  color: var(--soft-green-text);
  font-size: 12px;
  flex-wrap: wrap;
}
.rec-list { display: flex; flex-direction: column; }
.rec-row { display: flex; align-items: center; gap: 10px; padding: 9px 0; border-bottom: 1px solid var(--border); }
.rec-row:last-child { border-bottom: none; }
.rec-icon { font-size: 18px; }
.rec-main { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.rec-name { font-size: 13px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rec-name em { font-style: normal; color: var(--text-sub); font-weight: 400; }
.rec-amt { font-size: 14px; font-weight: 800; }
.rec-amt.in { color: #0f766e; }
.rec-amt.out { color: #b63a46; }
.rec-del { border: none; background: none; color: var(--text-light); font-size: 14px; cursor: pointer; padding: 4px; }
.rec-del:hover { color: var(--primary); }
.pager { display: flex; align-items: center; justify-content: center; gap: 12px; margin-top: 10px; }
.pager-info { font-size: 12px; color: var(--text-sub); font-weight: 700; }

/* 宽屏下「结余趋势 + 收支日历」并排，移动端单列 */
.pro-duo { display: grid; gap: 14px; }
@media (min-width: 920px) {
  .pro-duo { grid-template-columns: 1fr 1fr; align-items: start; }
}
/* 分类 / 商户 收入支出并排 */
.g2 { display: grid; gap: 14px; margin-bottom: 14px; }
@media (min-width: 860px) {
  .g2 { grid-template-columns: 1fr 1fr; align-items: start; }
}

/* 收支日历 */
.cal-nav { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
.cal-title { font-size: 14px; font-weight: 800; }
.cal-grid { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 3px; }
.cal-wd { text-align: center; font-size: 10px; color: var(--text-sub); padding: 2px 0; }
.cal-cell {
  aspect-ratio: 1 / 1;
  width: 100%;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--card);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1px;
  font-family: inherit;
  cursor: pointer;
  padding: 1px;
  overflow: hidden;
}
.cal-cell.empty { visibility: hidden; }
.cal-cell.pos { border-color: rgba(13, 148, 136, 0.45); background: rgba(13, 148, 136, 0.12); }
.cal-cell.neg { border-color: rgba(182, 58, 70, 0.45); background: rgba(182, 58, 70, 0.12); }
.cal-d { font-size: 11px; font-weight: 700; color: var(--text); }
.cal-bal { font-size: 8px; color: var(--text-sub); white-space: nowrap; }
.cal-cell.pos .cal-bal { color: #0f766e; font-weight: 700; }
.cal-cell.neg .cal-bal { color: #b63a46; font-weight: 700; }
.cal-week-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
.cal-week {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 10px 6px;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: var(--card);
  font-family: inherit;
  cursor: pointer;
  font-size: 11px;
  color: var(--text);
}
.cal-week-label { color: var(--text-sub); }
.cal-week-val { font-size: 14px; }
.cal-week.pos { border-color: rgba(13, 148, 136, 0.5); background: rgba(13, 148, 136, 0.12); }
.cal-week.pos .cal-week-val { color: #0f766e; }
.cal-week.neg { border-color: rgba(182, 58, 70, 0.5); background: rgba(182, 58, 70, 0.12); }
.cal-week.neg .cal-week-val { color: #b63a46; }
.cal-grid2 { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
.cal-tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 10px 6px;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: var(--card);
  font-family: inherit;
  cursor: pointer;
  font-size: 12px;
  color: var(--text);
}
.cal-tile b { font-size: 13px; }
.cal-tile.pos { border-color: rgba(13, 148, 136, 0.5); background: rgba(13, 148, 136, 0.12); color: #0f766e; }
.cal-tile.neg { border-color: rgba(182, 58, 70, 0.5); background: rgba(182, 58, 70, 0.12); color: #b63a46; }
.pager-jump { display: flex; align-items: center; gap: 4px; font-size: 12px; color: var(--text-sub); }
.page-input { width: 48px; text-align: center; font-size: 13px; }

@media (max-width: 480px) {
  .kpi-row { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .range-inputs .input { width: 108px; }
}
</style>