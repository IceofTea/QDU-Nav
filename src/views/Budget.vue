<script setup>
/** 生活费计数器：随手记账 + 微信/支付宝账单导入 + 奖学金快捷勾选
 *  数据仅存本机浏览器 localStorage（qdu_budget_records），不上传任何数据 */
import { ref, computed, watch } from 'vue'
import BudgetSim from './BudgetSim.vue'
import BarRow from '../components/BarRow.vue'
import { parseBillFile } from '../utils/billImport.js'

const emit = defineEmits(['back'])

/** 子视图：main 计数器 / sim 生活费模拟 */
const subView = ref('main')

const CATS = {
  expense: [
    { key: 'food', icon: '🍚', label: '伙食费', hint: '食堂 · 外卖 · 小卖部' },
    { key: 'party', icon: '🍻', label: '聚餐费', hint: '团建 · 约饭 · 奶茶局' },
    { key: 'transport', icon: '🚌', label: '交通费', hint: '公交 · 打车 · 共享电车' },
    { key: 'fruit', icon: '🍎', label: '水果零食', hint: '水果 · 酸奶 · 零食' },
    { key: 'study', icon: '📚', label: '学习资料', hint: '教材 · 打印 · 报名费' },
    { key: 'cloth', icon: '👕', label: '衣物鞋帽', hint: '衣服 · 鞋 · 配饰' },
    { key: 'medical', icon: '💊', label: '医疗保健', hint: '药品 · 挂号 · 体检' },
    { key: 'daily', icon: '🧴', label: '日常用品', hint: '洗发水 · 纸巾 · 洗衣液' },
    { key: 'phone', icon: '📱', label: '电话费', hint: '话费 · 流量 · 校园网' },
    { key: 'fun', icon: '🎮', label: '娱乐游戏', hint: '游戏 · 电影 · 门票' },
    { key: 'beauty', icon: '💇', label: '美容美发', hint: '理发 · 美甲 · 护肤' },
    { key: 'digital', icon: '📱', label: '数码家电', hint: '手机 · 耳机 · 家电' },
    { key: 'sport', icon: '🏃', label: '运动户外', hint: '健身 · 球类 · 户外' },
    { key: 'virtual', icon: '🎭', label: '网络虚拟', hint: '游戏充值 · 会员 · 虚拟商品' },
    { key: 'housing', icon: '🏠', label: '房屋住宿', hint: '房租 · 水电 · 宿舍' },
    { key: 'transfer', icon: '💸', label: '转账支出', hint: '微信/支付宝转给他人' },
    { key: 'trouble', icon: '💥', label: '闯祸费', hint: '赔了舍友的碗 / 打碎东西' },
    { key: 'other', icon: '📦', label: '其它支出', hint: '说不清的一笔' }
  ],
  income: [
    { key: 'allowance', icon: '💰', label: '生活费', hint: '爸妈打款' },
    { key: 'scholarship', icon: '🏅', label: '奖学金', hint: '知识就是金钱' },
    { key: 'parttime', icon: '💼', label: '兼职', hint: '搬砖收入' },
    { key: 'prize', icon: '🎁', label: '红包/奖金', hint: '意外之财' },
    { key: 'resale', icon: '🏷️', label: '闲置转卖', hint: '断舍离变现' },
    { key: 'refund', icon: '↩️', label: '退款', hint: '买贵了退回来' },
    { key: 'invest', icon: '📈', label: '理财收益', hint: '余额宝 · 利息' },
    { key: 'transfer', icon: '💌', label: '转账收入', hint: '好友转账 · 收款' },
    { key: 'other', icon: '📥', label: '其它收入', hint: '天降横财' }
  ]
}

/** 青大常见奖学金 / 助学金 / 竞赛奖励预设（金额参照青岛大学本科生奖助文件：
 *  优秀奖学金 1000/600/400 ·每学期；国家助学金三档 2300/3300/4300 ·每学年；
 *  竞赛奖励参照《博学奖学金评审办法》；实际发放以学校最新通知为准） */
const SCHOLARS = [
  { name: '国家奖学金', amount: 8000 },
  { name: '国家励志奖学金', amount: 5000 },
  { name: '省政府奖学金', amount: 6000 },
  { name: '优秀奖学金（一等）', amount: 1000 },
  { name: '优秀奖学金（二等）', amount: 600 },
  { name: '优秀奖学金（三等）', amount: 400 },
  { name: '国家助学金（一档）', amount: 2300 },
  { name: '国家助学金（二档）', amount: 3300 },
  { name: '国家助学金（三档）', amount: 4300 },
  { name: '竞赛奖学金（挑战杯·国特）', amount: 30000 },
  { name: '竞赛奖学金（A类·国一）', amount: 5000 },
  { name: '博学奖学金（发明专利）', amount: 5000 }
]

/** 导入账单时按商品名关键词猜测类别（与 utils/billImport.js 的 KEYWORDS 一致） */
const REF = [
  { key: 'food', label: '伙食费', lo: 800, hi: 1500 },
  { key: 'party', label: '聚餐费', lo: 200, hi: 600 },
  { key: 'transport', label: '交通费', lo: 60, hi: 250 },
  { key: 'fruit', label: '水果零食', lo: 80, hi: 300 },
  { key: 'study', label: '学习资料', lo: 20, hi: 150 },
  { key: 'cloth', label: '衣物鞋帽', lo: 0, hi: 300 },
  { key: 'daily', label: '日常用品', lo: 50, hi: 200 },
  { key: 'phone', label: '电话费', lo: 50, hi: 150 },
  { key: 'fun', label: '娱乐游戏', lo: 0, hi: 300 },
  { key: 'beauty', label: '美容美发', lo: 0, hi: 150 },
  { key: 'digital', label: '数码家电', lo: 0, hi: 200 },
  { key: 'sport', label: '运动户外', lo: 0, hi: 150 },
  { key: 'virtual', label: '网络虚拟', lo: 0, hi: 150 },
  { key: 'housing', label: '房屋住宿', lo: 0, hi: 800 },
  { key: 'transfer', label: '转账支出', lo: 0, hi: 300 },
  { key: 'trouble', label: '闯祸备用金', lo: 0, hi: 500 }
]

const STORAGE = 'qdu_budget_records'

function today() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function curMonth() {
  return today().slice(0, 7)
}
function monthOffset(base, off) {
  const [y, m] = base.split('-').map(Number)
  const d = new Date(y, m - 1 + off, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
function load() {
  try {
    const d = JSON.parse(localStorage.getItem(STORAGE))
    return Array.isArray(d) ? d : []
  } catch { return [] }
}
function fmt(n) {
  return n % 1 === 0 ? String(n) : n.toFixed(2)
}

const records = ref(load())
watch(records, () => localStorage.setItem(STORAGE, JSON.stringify(records.value)), { deep: true })

/** 生成不重复的本地记录 id */
const newId = () => Date.now() + Math.random()

const mode = ref('expense')
const cat = ref('food')
const amount = ref('')
const note = ref('')
const date = ref(today())
const month = ref(curMonth())
const showRef = ref(false)
const importMsg = ref('')

const cats = computed(() => CATS[mode.value])
const catInfo = (type, key) => (CATS[type] || []).find((c) => c.key === key)

function pickCat(key) {
  cat.value = key
}

/** 编辑 / 纠错：载入一条记录到表单，保存后原地更新 */
const editing = ref(null)
function editStart(r) {
  editing.value = r.id
  mode.value = r.type
  cat.value = r.cat
  amount.value = String(r.amount)
  note.value = r.note
  date.value = r.date
  window.scrollTo({ top: 0, behavior: 'smooth' })
}
function save() {
  const amt = Number(amount.value)
  if (!amt || amt <= 0) return
  if (comboEgg()) return
  let saved = null
  if (editing.value) {
    const rec = records.value.find((r) => r.id === editing.value)
    if (rec) {
      rec.type = mode.value
      rec.cat = cat.value
      rec.amount = Math.round(amt * 100) / 100
      rec.note = note.value.trim()
      rec.date = date.value || today()
      saved = rec
    }
    editing.value = null
  } else {
    saved = {
      id: newId(),
      type: mode.value,
      cat: cat.value,
      amount: Math.round(amt * 100) / 100,
      note: note.value.trim(),
      date: date.value || today()
    }
    records.value.unshift(saved)
  }
  amount.value = ''
  note.value = ''
  if (amt === 404) showToast('收支未找到，但你的努力已经找到方向了！', 3200)
  else triggerEggs(saved)
}
function cancelEdit() {
  editing.value = null
  amount.value = ''
  note.value = ''
}

function remove(id) {
  records.value = records.value.filter((r) => r.id !== id)
  if (editing.value === id) editing.value = null
}

/* ================= 隐藏彩蛋（不影响正常情绪反馈，详见 AGENTS.md） ================= */
/** 轻提示：彩蛋文案短暂弹出，自动消失 */
const toast = ref(null)
let toastTimer = null
function showToast(text, ms = 2400) {
  toast.value = { text, key: Date.now() }
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toast.value = null }, ms)
}
/** 彩蛋去重：同一彩蛋 24 小时内只触发一次，避免反复失去惊喜感 */
const EGG_KEY = 'qdu_eggs'
function eggOnce(key) {
  try {
    const eggs = JSON.parse(localStorage.getItem(EGG_KEY)) || {}
    const now = Date.now()
    if (eggs[key] && now - eggs[key] < 86400000) return false
    eggs[key] = now
    localStorage.setItem(EGG_KEY, JSON.stringify(eggs))
    return true
  } catch { return true }
}

/** 连击彩蛋：金额 2 + 备注「1+1=」时，快速点「记入」10 次 → 彩蛋；连击期间吞掉重复保存 */
let comboState = { count: 0, last: 0 }
function comboEgg() {
  if (Number(amount.value) !== 2 || note.value.trim() !== '1+1=') { comboState.count = 0; return false }
  const now = Date.now()
  if (now - comboState.last < 450) comboState.count++
  else comboState.count = 1
  comboState.last = now
  if (comboState.count >= 10) {
    comboState.count = 0
    if (eggOnce('egg_combo')) showToast('开发者觉得你很闲，送你个彩蛋')
    return true
  }
  return comboState.count > 1
}

/** 保存后按金额 / 类别 / 当月结余触发彩蛋 */
function triggerEggs(r) {
  const bal = balance.value
  if (r.cat === 'other' && r.type === 'expense' && Math.abs(r.amount - 9876547210.33) < 0.01) {
    if (eggOnce('egg_bili')) showToast('你买b站手办了？', 3200)
    return
  }
  if (r.cat === 'prize' && r.type === 'income' && r.amount === 500000) {
    if (eggOnce('egg_spy')) showToast('你抓到间谍了🫨？')
    return
  }
  if (r.type === 'expense' && r.cat === 'party' && r.amount > 100) {
    if (eggOnce('egg_party')) showToast('呦，吃了顿漂亮饭😋')
    return
  }
  if (r.type === 'expense' && r.cat === 'trouble') {
    const tiers = [
      [50, '给谁暖壶踢倒了😄？'],
      [100, '碎碎平安😁'],
      [500, '还不如充三国杀呢😡'],
      [1000, '😨'],
      [10000, '你给人车撞了？'],
      [100000, '咱有坐牢的风险吗😰']
    ]
    const hit = tiers.find(([hi]) => r.amount <= hi)
    if (eggOnce('egg_trouble')) showToast(hit ? hit[1] : '吹牛逼呢😅')
    return
  }
  if (r.type === 'income' && r.cat === 'allowance' && r.amount > 10000 && bal > 100000) {
    if (eggOnce('egg_brag')) showToast('吹牛逼呢😅')
    return
  }
  if (bal > 100000) {
    if (eggOnce('egg_brag')) showToast('吹牛逼呢😅')
    return
  }
  if (bal < -1000000) {
    if (eggOnce('egg_bankrupt')) showToast('百万负翁，吹牛逼呢😅')
    return
  }
  if (bal < -100000) {
    if (eggOnce('egg_twin')) showToast('你给双子楼炸了😰？')
  }
}

/** 隐藏皮肤：连续点「收入/支出」5 次或长按 3 秒解锁「赛博账本」 */
const cyberOn = ref(localStorage.getItem('qdu_cyber') === '1')
let segHits = 0
let segTimer = null
let holdTimer = null
function unlockCyber() {
  if (cyberOn.value) return
  cyberOn.value = true
  localStorage.setItem('qdu_cyber', '1')
  showToast('⚡ 解锁隐藏皮肤：赛博账本', 3000)
}
function segTap() {
  segHits++
  clearTimeout(segTimer)
  segTimer = setTimeout(() => { segHits = 0 }, 1300)
  if (segHits >= 5) unlockCyber()
}
function holdStart() {
  clearTimeout(holdTimer)
  holdTimer = setTimeout(unlockCyber, 3000)
}
function holdEnd() { clearTimeout(holdTimer) }

/** 像素雨：快速点「生活费模拟」按钮 3 次触发 */
const pxRain = ref([])
let pxHits = 0
let pxLast = 0
let pxSeq = 0
const PX_COLORS = ['#f43f5e', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7', '#ec4899']
function simTap() {
  const now = Date.now()
  if (now - pxLast < 450) pxHits++
  else pxHits = 1
  pxLast = now
  if (pxHits >= 3) {
    pxHits = 0
    pxSeq++
    const arr = []
    for (let i = 0; i < 90; i++) {
      arr.push({
        id: `${pxSeq}-${i}`,
        left: Math.random() * 100,
        delay: Math.random() * 0.6,
        dur: 1.4 + Math.random() * 1.2,
        size: 5 + Math.random() * 7,
        color: PX_COLORS[Math.floor(Math.random() * PX_COLORS.length)]
      })
    }
    pxRain.value = arr
    setTimeout(() => { pxRain.value = [] }, 3400)
  }
}

/** 节日配色：春节 ±3 天 / 愚人节 / 校庆 5-14，结算按钮变色 */
const SPRING_FEST = {
  2024: '02-10', 2025: '01-29', 2026: '02-17', 2027: '02-06', 2028: '01-26',
  2029: '02-13', 2030: '02-03', 2031: '01-23', 2032: '02-11', 2033: '01-31'
}
function festivalNow() {
  const d = new Date()
  const y = d.getFullYear()
  const md = `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  if (md === '04-01') return 'festival-april'
  if (md === '05-14') return 'festival-qdu'
  const sf = SPRING_FEST[y] || SPRING_FEST[y - 1]
  if (sf && Math.abs((new Date(`${y}-${sf}`) - d) / 86400000) <= 3) return 'festival-spring'
  return ''
}
const festival = ref(festivalNow())

/** 隐藏成就：奶茶消费累计 20 笔解锁 */
const milkTeaCount = computed(() =>
  records.value.filter((r) => r.type === 'expense' && r.cat === 'food' && (r.note || '').includes('奶茶')).length
)
const milkTeaUnlocked = ref(localStorage.getItem('qdu_ach_tea') === '1')
watch(milkTeaCount, (n) => {
  if (n >= 20 && !milkTeaUnlocked.value) {
    milkTeaUnlocked.value = true
    localStorage.setItem('qdu_ach_tea', '1')
    showToast('🥤 成就解锁：奶茶品鉴师（累计 20 杯）', 3200)
  }
})

function sum(list, type) {
  return Math.round(list.filter((r) => r.type === type).reduce((s, r) => s + r.amount, 0) * 100) / 100
}

/** 选中奖学金预设：自动带出金额与备注 */
function pickScholar(s) {
  if (Number(amount.value) && Number(amount.value) !== s.amount && !window.confirm(`当前金额为 ¥${fmt(Number(amount.value))}，要替换为 ¥${fmt(s.amount)} 吗？`)) return
  amount.value = String(s.amount)
  note.value = s.name
}

/** 导入微信 / 支付宝账单文件（csv/xlsx 均支持，全部在浏览器本地解析） */
async function billImport(file) {
  importMsg.value = ''
  if (!file) return
  const res = await parseBillFile(file)
  if (!res.ok) {
    importMsg.value = res.msg
    return
  }
  const { added, skipped, brand, source } = res
  if (!added.length) {
    importMsg.value = `未找到可导入的收支记录（跳过中性交易/无效记录 ${skipped.neutral + skipped.closed} 笔）。请确认账单文件为微信「用于个人对账」或支付宝「交易明细」导出。`
    return
  }
  const withId = added.map((r) => ({ id: newId() + Math.random(), ...r }))
  records.value = withId.concat(records.value)
  const brandName = brand === 'alipay' ? '支付宝' : '微信'
  const typeName = source === 'xlsx' ? 'Excel(xlsx)' : '表格'
  const skipMsg = skipped.neutral + skipped.closed ? `已按规则跳过不计收支/失败记录 ${skipped.neutral + skipped.closed} 笔；` : ''
  importMsg.value = `✅ 已识别为${brandName}账单（${typeName}）并导入 ${added.length} 笔：支出 ¥${fmt(sum(added, 'expense'))} / 收入 ¥${fmt(sum(added, 'income'))}。${skipMsg}支出已按交易分类与商品名自动归类，可在明细中修改。`
}

const monthRecords = computed(() => records.value.filter((r) => r.date.startsWith(month.value)))
const income = computed(() => sum(monthRecords.value, 'income'))
const expense = computed(() => sum(monthRecords.value, 'expense'))
const balance = computed(() => Math.round((income.value - expense.value) * 100) / 100)

/** 生活费（固定收入）视角：本月生活费到账额 / 生活费结余 */
const allowance = computed(() =>
  Math.round(monthRecords.value.filter((r) => r.type === 'income' && r.cat === 'allowance').reduce((s, r) => s + r.amount, 0) * 100) / 100
)
const budgetBalance = computed(() => Math.round((allowance.value - expense.value) * 100) / 100)
const allowanceUsed = computed(() =>
  allowance.value > 0 ? Math.round((expense.value / allowance.value) * 100) : 0
)

const prevMonthKey = computed(() => monthOffset(month.value, -1))
const prevExpense = computed(() =>
  Math.round(records.value.filter((r) => r.type === 'expense' && r.date.startsWith(prevMonthKey.value)).reduce((s, r) => s + r.amount, 0) * 100) / 100
)
const prevDiff = computed(() => Math.round((expense.value - prevExpense.value) * 100) / 100)

const catStats = computed(() => {
  const map = {}
  for (const r of monthRecords.value) {
    if (r.type !== 'expense') continue
    const info = catInfo('expense', r.cat)
    const key = info ? info.label : r.cat
    map[key] = (map[key] || 0) + r.amount
  }
  return Object.entries(map)
    .map(([name, v]) => ({ name, v: Math.round(v * 100) / 100 }))
    .sort((a, b) => b.v - a.v)
})
const maxCat = computed(() => Math.max(1, ...catStats.value.map((c) => c.v)))

const trend = computed(() => {
  const arr = []
  for (let off = -5; off <= 0; off++) {
    const key = monthOffset(month.value, off)
    arr.push({
      key,
      label: key.slice(5) + '月',
      v: Math.round(records.value.filter((r) => r.type === 'expense' && r.date.startsWith(key)).reduce((s, r) => s + r.amount, 0) * 100) / 100
    })
  }
  return arr
})
const maxTrend = computed(() => Math.max(1, ...trend.value.map((t) => t.v)))

const sorted = computed(() =>
  [...monthRecords.value].sort((a, b) => (a.date < b.date ? 1 : -1)))

function balanceMsg() {
  if (!monthRecords.value.length) return '本月还没记一笔，先「记一笔」开始吧'
  if (allowance.value > 0) {
    if (expense.value === 0) return `生活费已到账 ¥${fmt(allowance.value)}，本月刚开始，稳住 ✊`
    if (budgetBalance.value < 0) return `生活费已花超 ¥${fmt(Math.abs(budgetBalance.value))} 元，别让下月生活费提前消失 😱`
    const used = allowanceUsed.value
    if (used > 90) return `生活费已用 ${used}%（剩 ¥${fmt(budgetBalance.value)}），食堂走起 🍚`
    if (used > 65) return `生活费已用 ${used}%（剩 ¥${fmt(budgetBalance.value)}），下半月悠着点 ⚠️`
    return `生活费已用 ${used}%（剩 ¥${fmt(budgetBalance.value)}），节奏不错 🎉`
  }
  if (balance.value < 0) {
    const over = Math.abs(balance.value)
    if (over > 500) return '已超支 ' + fmt(over) + ' 元！得认真记账了，别让下月生活费提前消失 😱'
    if (over > 200) return '本月超支 ' + fmt(over) + ' 元，接下来省着点，靠食堂续命 🥲'
    return '轻微超支 ' + fmt(over) + ' 元，还有机会抢救 🫠'
  }
  if (income.value === 0) return '光花不挣，奖学金 / 兼职该提上日程了 😏'
  const rate = balance.value / income.value
  if (rate >= 0.5) return '结余过半，理财小能手就是你 🤑'
  if (rate >= 0.25) return '收支健康，继续保持 🎉'
  return '结余不多，月底前记得悠着点 ⚠️'
}

function clearAll() {
  if (window.confirm('确定清空全部记账记录？此操作不可恢复。')) {
    records.value = []
  }
}

const monthLabel = computed(() => {
  const [y, m] = month.value.split('-').map(Number)
  return `${y}年${m}月`
})
</script>

<template>
  <BudgetSim v-if="subView === 'sim'" @back="subView = 'main'" />

  <template v-else>
  <div class="budget-root" :class="{ cyber: cyberOn }">
  <div class="view-top">
    <button class="back-btn" @click="emit('back')">← 返回首页</button>
    <div class="view-title">生活费计数器</div>
    <div class="view-sub">随手记一笔，月底少流一滴泪 · 奖学金、兼职收入也能入账</div>
    <button class="btn ghost small" style="margin-top:10px;" @click="subView = 'sim'; simTap()">📊 生活费模拟 · 估算 / 预算分配器 / 账单校准 ›</button>
  </div>

  <div class="panel">
    <div class="month-nav">
      <button class="btn ghost small" @click="month = monthOffset(month, -1)">← 上月</button>
      <div class="month-title">{{ monthLabel }}</div>
      <button class="btn ghost small" @click="month = monthOffset(month, 1)">下月 →</button>
    </div>
    <div class="balance-banner" :class="{ negative: balance < 0 }">
      <div class="balance-label">本月结余</div>
      <div class="balance-num"><span class="balance-sym">¥</span>{{ fmt(Math.abs(balance)) }}</div>
      <div class="balance-hint">{{ balanceMsg() }}</div>
      <div v-if="allowance" class="balance-live">
        生活费 ¥{{ fmt(allowance) }} · 已用 {{ allowanceUsed }}%（剩 ¥{{ fmt(Math.max(0, budgetBalance)) }}）
        <div class="balance-live-bar"><i :style="{ width: Math.min(100, allowanceUsed) + '%' }"></i></div>
      </div>
      <div v-if="prevDiff" class="balance-cmp" :class="prevDiff > 0 ? 'up' : 'down'">
        {{ prevDiff > 0 ? '▲' : '▼' }} 支出较上月 {{ prevDiff > 0 ? '+' : '' }}{{ fmt(prevDiff) }} 元
      </div>
      <div class="balance-row">
        <div class="balance-item income"><span>收入</span><b>+¥{{ fmt(income) }}</b></div>
        <div class="balance-item expense"><span>支出</span><b>-¥{{ fmt(expense) }}</b></div>
        <div class="balance-item"><span>笔数</span><b>{{ monthRecords.length }}</b></div>
      </div>
    </div>
  </div>

  <div class="panel">
    <div class="section-title" style="margin:0 0 12px;"><span class="bar"></span>{{ editing ? '✏️ 修改记录' : '记一笔' }}</div>
    <button v-if="editing" class="btn ghost small" style="margin-bottom:10px;" @click="cancelEdit">← 取消修改</button>
    <div class="seg">
      <button
        class="seg-btn"
        :class="{ active: mode === 'expense' }"
        @click="mode = 'expense'; cat = 'food'; segTap()"
        @mousedown="holdStart"
        @mouseup="holdEnd"
        @mouseleave="holdEnd"
        @touchstart="holdStart"
        @touchend="holdEnd"
      >💸 支出</button>
      <button
        class="seg-btn"
        :class="{ active: mode === 'income' }"
        @click="mode = 'income'; cat = 'allowance'; segTap()"
        @mousedown="holdStart"
        @mouseup="holdEnd"
        @mouseleave="holdEnd"
        @touchstart="holdStart"
        @touchend="holdEnd"
      >💵 收入</button>
    </div>
    <div class="cat-grid">
      <button
        v-for="c in cats"
        :key="c.key"
        class="cat-btn"
        :class="{ active: cat === c.key }"
        @click="pickCat(c.key)"
      >
        <span class="cat-icon">{{ c.icon }}</span>
        <span class="cat-name">{{ c.label }}</span>
        <span class="cat-hint">{{ c.hint }}</span>
      </button>
    </div>
    <template v-if="mode === 'income' && cat === 'scholarship'">
      <div class="scholar-box">
        <div class="scholar-label">🏅 奖学金 / 助学金预设（点击自动带出金额）</div>
        <div class="muted" style="font-size:11px;margin:2px 0 8px;">优秀奖学金 1000/600/400 ·每学期；国家助学金三档 2300/3300/4300 ·每学年；竞赛奖励参照博学奖学金办法。以学校最新通知为准。</div>
        <div class="scholar-grid">
          <button v-for="s in SCHOLARS" :key="s.name" class="scholar-chip" @click="pickScholar(s)">
            {{ s.name }} <b>¥{{ s.amount }}</b>
          </button>
        </div>
      </div>
    </template>
    <div class="input-row" style="margin-top:14px;">
      <input v-model="amount" class="input amount-input" type="number" inputmode="decimal" placeholder="金额，如 12.5" @keyup.enter="save" />
      <input v-model="date" class="input date-input" type="date" />
    </div>
    <input v-model="note" class="input" style="margin-top:10px;" placeholder="备注（可选），如：食堂麻辣香锅" @keyup.enter="save" />
    <button class="btn accent big" style="margin-top:12px;width:100%;" :class="festival ? 'festival-on ' + festival : ''" :disabled="!(Number(amount) > 0)" @click="save">
      {{ editing ? '✓ 保存修改' : '＋ 记入' + (mode === 'expense' ? '支出' : '收入') }}
    </button>
    <button v-if="editing" class="btn ghost big" style="margin-top:8px;width:100%;" @click="cancelEdit">取消</button>
  </div>

  <div class="panel">
    <div class="section-title" style="margin:0 0 10px;"><span class="bar"></span>📥 导入微信 / 支付宝账单</div>
    <p class="muted" style="font-size:12px;margin-bottom:10px;">
      直接选择从微信 / 支付宝下载的账单文件即可自动识别：微信「支付 → 钱包 → 账单 → 常见问题 → 下载账单 → 用于个人对账」或支付宝「我的 → 账单 → 右上角 ⋯ → 开具交易流水证明 / 导出」，下载的 CSV 或 Excel(xlsx) 都能识别。金额按「收/支」自动记入，支出按交易分类与商品名自动归类。
    </p>
    <input id="csv-file" type="file" accept=".csv,.xlsx,text/csv" style="display:none;" @change="billImport($event.target.files[0])" />
    <label for="csv-file" class="btn ghost" style="cursor:pointer;display:inline-flex;align-items:center;gap:6px;">📄 选择账单文件（CSV / Excel）</label>
    <div v-if="importMsg" class="import-msg">{{ importMsg }}</div>
    <div class="privacy-note">
      🔒 隐私说明：本站为纯静态网页（无后端服务器），账单文件只在你自己的浏览器里本地解析，<b>不会上传到任何服务器</b>，也不会被任何服务方获取；导入的记账记录仅保存在本机浏览器 localStorage，可安心试用。清除浏览器数据会一并清空记录。
    </div>
  </div>

  <div class="panel">
    <button class="ref-toggle" @click="showRef = !showRef">
      📚 社区参考区间（元/月）
      <span>{{ showRef ? '收起 ▴' : '展开 ▾' }}</span>
    </button>
    <div v-if="showRef" class="ref-list">
      <div v-for="r in REF" :key="r.key" class="ref-row">
        <span>{{ r.label }}</span>
        <span class="muted">¥{{ r.lo }} ~ {{ r.hi }}</span>
      </div>
      <p class="muted" style="font-size:11px;margin-top:8px;">
        参考知乎 / 小红书 / 贴吧等社区常见讨论整理，个体差异大，仅供参考
      </p>
    </div>
  </div>

  <div class="panel">
    <div class="section-title" style="margin:0 0 12px;"><span class="bar"></span>本月支出构成</div>
    <div v-if="catStats.length" class="cat-stat">
      <BarRow v-for="c in catStats" :key="c.name" :label="c.name" :value="c.v" :max="maxCat" :text="'¥' + fmt(c.v)" color="linear-gradient(90deg,#b63a46,#e76f51)" />
    </div>
    <div v-else class="muted" style="text-align:center;padding:10px;">本月还没有支出</div>
  </div>

  <div class="panel">
    <div class="section-title" style="margin:0 0 12px;"><span class="bar"></span>近 6 月支出趋势</div>
    <div class="trend-wrap">
      <div v-for="t in trend" :key="t.key" class="trend-col">
        <div class="trend-val">{{ t.v ? '¥' + fmt(t.v) : '' }}</div>
        <div class="trend-bar"><i :style="{ height: Math.max(4, Math.round(t.v / maxTrend * 100)) + '%' }"></i></div>
        <div class="trend-label">{{ t.label }}</div>
      </div>
    </div>
  </div>

  <div class="panel">
    <div class="section-head" style="align-items:center;margin:0 0 10px;">
      <h3 class="section-title" style="margin:0;">明细（{{ monthRecords.length }}）</h3>
      <button v-if="records.length" class="btn ghost small" @click="clearAll">清空全部</button>
    </div>
    <div v-if="!sorted.length" class="muted" style="text-align:center;padding:16px;">本月还没有记录</div>
    <div v-else class="rec-list">
      <div v-for="r in sorted" :key="r.id" class="rec-row">
        <span class="rec-icon">{{ (catInfo(r.type, r.cat) || {}).icon || '📌' }}</span>
        <span class="rec-main">
          <span class="rec-name">{{ (catInfo(r.type, r.cat) || {}).label || r.cat }}<em v-if="r.note"> · {{ r.note }}</em></span>
          <span class="muted" style="font-size:11px;">{{ r.date }}</span>
        </span>
        <span class="rec-amt" :class="r.type === 'income' ? 'in' : 'out'">{{ r.type === 'income' ? '+' : '-' }}¥{{ fmt(r.amount) }}</span>
        <button class="rec-del" @click="editStart(r)" title="编辑">✎</button>
        <button class="rec-del" @click="remove(r.id)" title="删除">✕</button>
      </div>
    </div>
    <p class="muted" style="font-size:11px;margin-top:10px;">记录保存在本机浏览器（localStorage），不会上传任何数据。</p>
    <div v-if="milkTeaUnlocked" class="ach-badge">🥤 隐藏成就：奶茶品鉴师（已解锁）· 累计 {{ milkTeaCount }} 杯</div>
  </div>
  </div>

  <transition name="egg-fade">
    <div v-if="toast" :key="toast.key" class="egg-toast">{{ toast.text }}</div>
  </transition>

  <div v-if="pxRain.length" class="px-rain">
    <span v-for="p in pxRain" :key="p.id" class="px-drop" :style="{ left: p.left + '%', width: p.size + 'px', height: p.size + 'px', background: p.color, animationDelay: p.delay + 's', animationDuration: p.dur + 's' }"></span>
  </div>
  </template>
</template>

<style scoped>
.month-nav { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 12px; }
.month-title { font-size: 15px; font-weight: 800; }
.balance-banner {
  background: linear-gradient(135deg, #0f3d33, #155e54);
  border-radius: var(--radius);
  color: #fff;
  padding: 18px 20px;
}
.balance-banner.negative { background: linear-gradient(135deg, #7a2530, #b63a46); }
.balance-label { font-size: 12px; opacity: 0.85; }
.balance-num { font-size: 38px; font-weight: 800; line-height: 1.15; margin: 4px 0; }
.balance-sym { font-size: 20px; font-weight: 700; opacity: 0.9; }
.balance-hint { font-size: 12px; opacity: 0.9; margin-bottom: 4px; }
.balance-live { font-size: 12px; opacity: 0.9; margin-bottom: 6px; }
.balance-live-bar { height: 6px; border-radius: 4px; background: rgba(255,255,255,0.18); overflow: hidden; margin-top: 5px; max-width: 260px; }
.balance-live-bar i { display: block; height: 100%; border-radius: 4px; background: linear-gradient(90deg,#f59e0b,#fbbf24); }
.balance-cmp { font-size: 11px; opacity: 0.9; margin-bottom: 10px; }
.balance-cmp.up { color: #ffb3a0; }
.balance-cmp.down { color: #7ee2c4; }
.balance-row { display: flex; gap: 16px; flex-wrap: wrap; }
.balance-item { font-size: 12px; display: flex; flex-direction: column; gap: 2px; }
.balance-item b { font-size: 15px; }
.balance-item.income b { color: #7ee2c4; }
.balance-item.expense b { color: #ffb3a0; }
.cat-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.cat-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 10px;
  border: 1px solid var(--border);
  background: var(--card);
  border-radius: 12px;
  cursor: pointer;
  font-family: inherit;
  text-align: left;
}
.cat-btn.active { border-color: var(--primary); background: var(--primary-soft); box-shadow: 0 0 0 1px var(--primary); }
.cat-icon { font-size: 17px; }
.cat-name { font-size: 13px; font-weight: 700; }
.cat-hint {
  font-size: 10px;
  color: var(--text-sub);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.cat-btn.active .cat-hint {
  white-space: normal;
  overflow: visible;
  text-overflow: clip;
}
.amount-input { font-size: 18px; font-weight: 700; flex: 1; min-width: 120px; }
.date-input { width: 150px; }
.btn.big { padding: 12px; font-size: 15px; }
.scholar-box { margin-top: 12px; padding: 12px; background: var(--primary-soft); border: 1px dashed var(--primary); border-radius: 12px; }
.scholar-label { font-size: 12px; font-weight: 700; color: var(--primary-dark); margin-bottom: 8px; }
.scholar-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; }
.scholar-chip {
  border: 1px solid var(--border);
  background: var(--card);
  border-radius: 10px;
  padding: 7px 9px;
  font-family: inherit;
  font-size: 12px;
  cursor: pointer;
  text-align: left;
  display: flex;
  justify-content: space-between;
  gap: 6px;
}
.scholar-chip b { color: var(--primary); }
.import-msg {
  margin-top: 10px;
  font-size: 12px;
  padding: 10px;
  background: var(--soft-green);
  border: 1px solid var(--soft-green-border);
  border-radius: 10px;
  color: var(--soft-green-text);
}
.privacy-note {
  margin-top: 10px;
  font-size: 11px;
  line-height: 1.7;
  padding: 10px;
  background: var(--primary-soft);
  border: 1px dashed var(--primary);
  border-radius: 10px;
  color: var(--text-sub);
}
.ref-toggle {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border: none;
  background: none;
  font-family: inherit;
  font-size: 14px;
  font-weight: 700;
  color: var(--text);
  cursor: pointer;
  padding: 2px 0;
}
.ref-row { display: flex; justify-content: space-between; font-size: 13px; padding: 6px 0; border-bottom: 1px dashed var(--border); }
.trend-wrap { display: flex; align-items: flex-end; gap: 10px; height: 130px; }
.trend-col { flex: 1; display: flex; flex-direction: column; align-items: center; height: 100%; justify-content: flex-end; gap: 4px; }
.trend-val { font-size: 10px; color: var(--text-sub); min-height: 14px; white-space: nowrap; }
.trend-bar {
  width: 100%;
  max-width: 34px;
  height: 90px;
  display: flex;
  align-items: flex-end;
  background: var(--bar);
  border-radius: 7px;
  overflow: hidden;
}
.trend-bar i { width: 100%; background: linear-gradient(180deg, #3b82f6, #1b66c9); border-radius: 7px; }
.trend-label { font-size: 11px; color: var(--text-sub); }
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
.rec-del {
  border: none; background: none; color: var(--text-light); font-size: 14px; cursor: pointer; padding: 4px;
}
.rec-del:hover { color: var(--primary); }

/* ================= 隐藏彩蛋样式 ================= */
.egg-toast {
  position: fixed;
  left: 50%;
  top: 46%;
  transform: translateX(-50%);
  z-index: 300;
  max-width: 82vw;
  padding: 14px 22px;
  border-radius: 16px;
  background: rgba(17, 24, 39, 0.92);
  color: #fff;
  font-size: 17px;
  font-weight: 800;
  letter-spacing: 1px;
  text-align: center;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.35);
  pointer-events: none;
  white-space: nowrap;
}
.egg-fade-enter-active, .egg-fade-leave-active { transition: opacity 0.3s, transform 0.3s; }
.egg-fade-enter-from, .egg-fade-leave-to { opacity: 0; transform: translateX(-50%) scale(0.85); }

.px-rain {
  position: fixed;
  inset: 0;
  z-index: 290;
  pointer-events: none;
  overflow: hidden;
}
.px-drop {
  position: absolute;
  top: -20px;
  border-radius: 2px;
  animation-name: px-fall;
  animation-timing-function: linear;
  animation-iteration-count: infinite;
  opacity: 0.9;
}
@keyframes px-fall {
  0% { transform: translateY(-10px) rotate(0deg); opacity: 0; }
  8% { opacity: 0.95; }
  100% { transform: translateY(110vh) rotate(360deg); opacity: 0.85; }
}

.ach-badge {
  margin-top: 10px;
  padding: 9px 12px;
  border-radius: 12px;
  background: linear-gradient(135deg, #7c3aed, #4f46e5);
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  text-align: center;
}

/* 赛博账本隐藏皮肤：霓虹渐变 + 等宽数字 */
.budget-root.cyber .balance-banner {
  background: linear-gradient(135deg, #0f172a, #312e81 55%, #0f766e);
  border: 1px solid rgba(34, 211, 238, 0.6);
  box-shadow: 0 0 24px rgba(34, 211, 238, 0.25), inset 0 0 40px rgba(168, 85, 247, 0.15);
}
.budget-root.cyber .balance-num,
.budget-root.cyber .balance-live,
.budget-root.cyber .rec-amt {
  font-family: 'Consolas', 'Courier New', monospace;
  text-shadow: 0 0 8px rgba(34, 211, 238, 0.75);
}
.budget-root.cyber .balance-num { color: #67e8f9; }
.budget-root.cyber .balance-live-bar i { background: linear-gradient(90deg, #22d3ee, #a855f7); }
.budget-root.cyber .balance-banner.negative {
  background: linear-gradient(135deg, #1c1917, #7f1d1d 55%, #831843);
  border-color: rgba(244, 63, 94, 0.6);
}
.budget-root.cyber .panel { border-color: rgba(34, 211, 238, 0.25); }

/* 节日结算按钮配色 */
.btn.festival-on.festival-spring {
  background: linear-gradient(135deg, #dc2626, #f59e0b) !important;
  box-shadow: 0 6px 22px rgba(220, 38, 38, 0.4);
  animation: fest-pulse 1.6s ease-in-out infinite;
}
.btn.festival-on.festival-april {
  background: linear-gradient(135deg, #ec4899, #8b5cf6, #22d3ee, #f59e0b) !important;
  background-size: 300% 300%;
  animation: fest-rainbow 4s ease infinite;
}
.btn.festival-on.festival-qdu {
  background: linear-gradient(135deg, #0f3d33, #155e54, #1b66c9) !important;
  box-shadow: 0 6px 22px rgba(21, 94, 84, 0.45);
}
@keyframes fest-pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.02); } }
@keyframes fest-rainbow { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
</style>