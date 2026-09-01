<script setup>
/** 生活费模拟：在青岛一个月多少生活费合适
 *  ① 预算估算：按「伙食/社交/购物」或「家庭收入」粗估区间；
 *  ② 预算分配器：输入月预算，拖动各项占比实时算金额，可保存方案到本机；
 *  ③ 账单校准：读取本机记账记录自动算出真实月均支出与构成，与参考区间对比。
 *  区间与建议参考知乎 / 小红书 / 贴吧常见在校生生活成本科普讨论整理，仅供参考；
 *  全部计算在浏览器本地完成，不上传任何数据。 */
import { ref, computed, watch, onMounted } from 'vue'
import BarRow from '../components/BarRow.vue'
import { useI18n } from '../i18n'

const { t, lang } = useI18n()

const emit = defineEmits(['back'])

const tab = ref('estimate')

/* ---- ① 预算估算 ---- */
const estSub = ref('simple')
const meal = ref(2) // 伙食：1 食堂为主 / 2 偶尔外卖 / 3 常点外卖
const social = ref(2) // 社交：1 少 / 2 一般 / 3 活跃
const shop = ref(2) // 购物：1 低 / 2 中 / 3 高
const score = computed(() => meal.value + social.value + shop.value)
const simpleRange = computed(() => {
  if (score.value <= 4) return { lo: 1100, hi: 1500, name: '简朴型', nameEn: 'Frugal', tip: '食堂为主、少社交，够用还能攒下一点', tipEn: 'Mainly cafeteria, minimal socializing, enough to save a bit' }
  if (score.value <= 6) return { lo: 1400, hi: 1900, name: '标准型', nameEn: 'Standard', tip: '日常舒适，偶尔改善伙食，大多数同学的档位', tipEn: 'Comfortable daily life, occasional treats, the most common tier' }
  if (score.value <= 8) return { lo: 1800, hi: 2400, name: '舒适型', nameEn: 'Comfortable', tip: '外卖社交比较自由，注意别月初光月末吃土', tipEn: 'Freedom with dining out and socializing, watch your budget' }
  return { lo: 2300, hi: 3000, name: '高配型', nameEn: 'Premium', tip: '生活品质优先，理性消费，别让账单支配人生', tipEn: 'Quality of life first, spend wisely, don\'t let bills rule you' }
})

const fam = ref(2)
const famLevels = [
  { label: '6000 元以下', labelEn: 'Under ¥6,000', lo: 1000, hi: 1400 },
  { label: '6000 – 10000 元', labelEn: '¥6,000 – ¥10,000', lo: 1200, hi: 1700 },
  { label: '10000 – 15000 元', labelEn: '¥10,000 – ¥15,000', lo: 1500, hi: 2000 },
  { label: '15000 – 25000 元', labelEn: '¥15,000 – ¥25,000', lo: 1800, hi: 2500 },
  { label: '25000 元以上', labelEn: 'Over ¥25,000', lo: 2200, hi: 3000 }
]
const mid = computed(() => Math.round((famLevels[fam.value].lo + famLevels[fam.value].hi) / 2))
const fineBudget = computed(() => {
  const m = mid.value
  return [
    { name: '🍚 食堂伙食', nameEn: '🍚 Cafeteria', pct: 45, v: Math.round(m * 0.45) },
    { name: '🍕 外卖 / 聚餐', nameEn: '🍕 Delivery / Dining', pct: 10, v: Math.round(m * 0.1) },
    { name: '🍎 水果零食', nameEn: '🍎 Snacks', pct: 8, v: Math.round(m * 0.08) },
    { name: '🚌 交通出行', nameEn: '🚌 Transport', pct: 5, v: Math.round(m * 0.05) },
    { name: '🧴 日用品 + 话费', nameEn: '🧴 Daily + Phone', pct: 10, v: Math.round(m * 0.1) },
    { name: '📚 学习资料', nameEn: '📚 Study', pct: 5, v: Math.round(m * 0.05) },
    { name: '🎮 娱乐社交', nameEn: '🎮 Entertainment', pct: 10, v: Math.round(m * 0.1) },
    { name: '👕 衣帽鞋', nameEn: '👕 Clothing', pct: 7, v: Math.round(m * 0.07) },
    { name: '🛟 备用金', nameEn: '🛟 Reserve', pct: 5, v: Math.round(m * 0.05) }
  ]
})

/* ---- ② 预算分配器 ---- */
const PLAN_STORAGE = 'qdu_budget_plan'
const planMsg = ref('')
const ALLOC_CATS = [
  { key: 'food', label: '🍚 伙食', labelEn: '🍚 Food', def: 45, min: 20, max: 70 },
  { key: 'party', label: '🍻 聚餐', labelEn: '🍻 Dining', def: 8, min: 0, max: 30 },
  { key: 'transport', label: '🚌 交通', labelEn: '🚌 Transport', def: 5, min: 0, max: 20 },
  { key: 'fruit', label: '🍎 水果零食', labelEn: '🍎 Snacks', def: 8, min: 0, max: 20 },
  { key: 'study', label: '📚 学习资料', labelEn: '📚 Study', def: 5, min: 0, max: 20 },
  { key: 'cloth', label: '👕 衣物鞋帽', labelEn: '👕 Clothing', def: 6, min: 0, max: 25 },
  { key: 'daily', label: '🧴 日用品', labelEn: '🧴 Daily', def: 7, min: 0, max: 20 },
  { key: 'phone', label: '📱 话费网费', labelEn: '📱 Phone', def: 6, min: 0, max: 15 },
  { key: 'fun', label: '🎮 娱乐', labelEn: '🎮 Fun', def: 5, min: 0, max: 20 },
  { key: 'save', label: '🛟 备用金', labelEn: '🛟 Reserve', def: 5, min: 0, max: 25 }
]
const alloc = ref(ALLOC_CATS.map((a) => ({ ...a, pct: a.def })))
const budgetTotal = ref(1600)
const PRESETS = [
  { name: '😌 极简省', nameEn: '😌 Minimal', pct: { food: 55, party: 3, transport: 4, fruit: 5, study: 4, cloth: 3, daily: 5, phone: 5, fun: 2, save: 14 } },
  { name: '😄 标准', nameEn: '😄 Standard', pct: { food: 45, party: 8, transport: 5, fruit: 8, study: 5, cloth: 6, daily: 7, phone: 6, fun: 5, save: 5 } },
  { name: '😎 舒适', nameEn: '😎 Comfortable', pct: { food: 36, party: 12, transport: 5, fruit: 10, study: 6, cloth: 8, daily: 8, phone: 6, fun: 8, save: 1 } }
]
function applyPreset(p) {
  alloc.value = alloc.value.map((a) => ({ ...a, pct: p.pct[a.key] }))
  planMsg.value = ''
}
const allocSum = computed(() => alloc.value.reduce((s, a) => s + a.pct, 0))
const allocAmt = (a) => Math.round(budgetTotal.value * a.pct / 100)
const allocSpent = computed(() => alloc.value.reduce((s, a) => s + allocAmt(a), 0))
const allocRemain = computed(() => budgetTotal.value - allocSpent.value)
const allocStatus = computed(() => {
  const diff = allocSum.value - 100
  if (diff > 0.01) return { cls: 'over', text: lang.value === 'en' ? `Over 100% (+${Math.round(diff)}%). Cut something.` : `占比已超过 100%（+${Math.round(diff)}%），某项该砍一砍` }
  if (diff < -0.01) return { cls: 'low', text: lang.value === 'en' ? `${Math.round(-diff)}% under. Remainder is reserve.` : `占比还差 ${Math.round(-diff)}%，剩下算机动余量` }
  return { cls: 'ok', text: lang.value === 'en' ? 'Exactly 100%. Complete.' : '占比正好 100%，分配完整' }
})
function savePlan() {
  localStorage.setItem(PLAN_STORAGE, JSON.stringify({ total: budgetTotal.value, pct: alloc.value.map((a) => a.pct) }))
  planMsg.value = lang.value === 'en' ? '✅ Budget plan saved locally (clearing cache will lose it)' : '✅ 预算方案已保存到本机浏览器（清缓存会丢失）'
}

/* ---- ③ 真实账单校准 ---- */
const REC_STORAGE = 'qdu_budget_records'
const calib = ref(null)
const calibMsg = ref('')
const calibConclusion = ref('')
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
const REF = [
  { key: 'food', label: '伙食费', labelEn: 'Food', lo: 800, hi: 1500 },
  { key: 'party', label: '聚餐费', labelEn: 'Dining', lo: 200, hi: 600 },
  { key: 'transport', label: '交通费', labelEn: 'Transport', lo: 60, hi: 250 },
  { key: 'fruit', label: '水果零食', labelEn: 'Snacks', lo: 80, hi: 300 },
  { key: 'study', label: '学习资料', labelEn: 'Study', lo: 20, hi: 150 },
  { key: 'cloth', label: '衣物鞋帽', labelEn: 'Clothes', lo: 0, hi: 300 },
  { key: 'daily', label: '日常用品', labelEn: 'Daily', lo: 50, hi: 200 },
  { key: 'phone', label: '电话费', labelEn: 'Phone', lo: 50, hi: 150 },
  { key: 'fun', label: '娱乐游戏', labelEn: 'Entertainment', lo: 0, hi: 300 }
]
const REF_LO = 1100
const REF_HI = 1900

function refreshCalib() {
  let records = []
  try { records = JSON.parse(localStorage.getItem(REC_STORAGE)) || [] } catch { records = [] }
  calib.value = null
  calibMsg.value = ''
  calibConclusion.value = ''
  if (!Array.isArray(records) || !records.length) {
    calibMsg.value = lang.value === 'en' ? 'No records yet: go back to "Budget Tracker" to add some, or import WeChat / Alipay bills first.' : '还没有记账数据：先回「生活费计数器」记几笔，或直接导入微信 / 支付宝账单，再来这里校准。'
    return
  }
  const exp = records.filter((r) => r.type === 'expense')
  if (!exp.length) {
    calibMsg.value = lang.value === 'en' ? 'Found records but no expense entries. Cannot calibrate expense budget.' : '已找到记账数据，但没有支出记录，无法校准支出预算。'
    return
  }
  const byMonth = {}
  for (const r of exp) {
    const mk = (r.date || '').slice(0, 7)
    if (!mk) continue
    if (!byMonth[mk]) byMonth[mk] = []
    byMonth[mk].push(r)
  }
  const months = Object.keys(byMonth).sort().slice(-3)
  if (!months.length) {
    calibMsg.value = lang.value === 'en' ? 'Records missing dates. Cannot calibrate by month.' : '记账记录缺少日期，无法按月校准。'
    return
  }
  const avgTotal = months.reduce((s, mk) => s + byMonth[mk].reduce((x, r) => x + r.amount, 0), 0) / months.length
  const catSum = {}
  for (const mk of months) {
    const seen = {}
    for (const r of byMonth[mk]) seen[r.cat] = (seen[r.cat] || 0) + r.amount
    for (const [c, v] of Object.entries(seen)) catSum[c] = (catSum[c] || 0) + v / months.length
  }
  const list = Object.entries(catSum)
    .map(([c, v]) => ({ cat: c, label: expLabel(c), v: Math.round(v * 100) / 100 }))
    .sort((a, b) => b.v - a.v)
  calib.value = {
    months: months.map((m) => lang.value === 'en' ? m.slice(2) + '/mo' : m.slice(2) + '月'),
    avgTotal: Math.round(avgTotal * 100) / 100,
    list,
    max: Math.max(1, ...list.map((i) => i.v))
  }
  const overRate = Math.round((avgTotal / REF_HI - 1) * 100)
  if (lang.value === 'en') {
    if (avgTotal < REF_LO) calibConclusion.value = `Your monthly spending ¥${calib.value.avgTotal} is below the typical range ¥${REF_LO}. You're very frugal (or missing some records). Remember to eat well!`
    else if (avgTotal <= REF_HI) calibConclusion.value = `Your monthly spending ¥${calib.value.avgTotal} falls within the typical range ¥${REF_LO} ~ ${REF_HI}, similar to most students. Healthy rhythm.`
    else calibConclusion.value = `Your monthly spending ¥${calib.value.avgTotal} exceeds the typical range upper limit ¥${REF_HI} by ~${overRate}%. Check which category is heaviest and cut there first.`
  } else {
    if (avgTotal < REF_LO) calibConclusion.value = `你的月均支出 ¥${calib.value.avgTotal} 低于常见区间下限 ¥${REF_LO}，说明生活很省（或账单没记全），注意营养均衡。`
    else if (avgTotal <= REF_HI) calibConclusion.value = `你的月均支出 ¥${calib.value.avgTotal} 落在常见区间 ¥${REF_LO} ~ ${REF_HI} 内，与多数同学相当，节奏健康。`
    else calibConclusion.value = `你的月均支出 ¥${calib.value.avgTotal} 比常见区间上限 ¥${REF_HI} 高出约 ${overRate}%，看看下方哪一项最重，优先从那入手。`
  }
}

function applyRealAlloc() {
  if (!calib.value) return
  const total = calib.value.avgTotal
  const map = {}
  for (const i of calib.value.list) map[i.cat] = i.v
  alloc.value = alloc.value.map((a) => {
    const v = map[a.key] || 0
    return { ...a, pct: total ? Math.round(v / total * 100) : a.def }
  })
  budgetTotal.value = Math.round(total)
  planMsg.value = lang.value === 'en' ? 'Filled with real bill proportions. Feel free to fine-tune.' : '已按真实账单的平均占比填入分配器，可再微调。'
  tab.value = 'alloc'
}

watch(tab, (t) => { if (t === 'calib') refreshCalib() })
onMounted(() => {
  try {
    const p = JSON.parse(localStorage.getItem(PLAN_STORAGE))
    if (p && Number.isFinite(p.total) && Array.isArray(p.pct) && p.pct.length === alloc.value.length) {
      budgetTotal.value = Math.round(p.total)
      alloc.value = alloc.value.map((a, i) => ({ ...a, pct: Number(p.pct[i]) || 0 }))
    }
  } catch { /* 首次使用，用默认档位 */ }
  if (tab.value === 'calib') refreshCalib()
})

const SAVE_TIPS = [
  '🍚 食堂是性价比之王：一份套餐 10-15 元，比外卖省一半，还能避开「满减凑单」套路',
  '🚲 出行用公交 / 共享单车月卡，少打车；校园卡地铁学生优惠别浪费',
  '🛒 日用品趁双 11 / 618 囤，用京东校园价、淘宝学生认证、拼多多百亿补贴比价',
  '📖 教材先问学长学姐二手 / 图书馆借，打印用学校打印室比外面便宜得多',
  '💳 各种会员按需开，视频 / 音乐会员可以拼车或学生价，别一开开一排',
  '⏸ 冲动消费冷静期 24 小时：想买的东西先加入购物车，第二天还想再下单',
  '📝 坚持记账（本应用就能用），月底看「支出构成」，超支项一目了然'
]
const SAVE_TIPS_EN = [
  '🍚 Cafeteria is the best value: a set meal costs ¥10-15, half the price of delivery, and avoids "bundle deals"',
  '🚲 Use bus / bike-sharing monthly passes, avoid taxis; don\'t waste your student metro discount',
  '🛒 Stock up on daily items during 11.11 / 6.18 sales, compare prices across JD, Taobao, Pinduoduo',
  '📖 Check seniors for second-hand textbooks / borrow from library, campus printing is much cheaper',
  '💳 Subscribe to services as needed, share video / music accounts or get student plans, don\'t overdo it',
  '⏸ 24-hour cool-down for impulse buys: add to cart first, if you still want it tomorrow, then buy',
  '📝 Keep track of expenses (this app works), check "expense breakdown" at month-end to see overspending'
]

const PARTTIME = [
  { name: '校内勤工俭学', nameEn: 'Campus Work-Study', tip: '图书馆 / 食堂 / 行政助管，时薪 15-20，安全稳定还能自习', tipEn: 'Library / Cafeteria / Admin assistant, ¥15-20/hr, safe and stable', tag: '最稳妥', tagEn: 'Safest' },
  { name: '家教', nameEn: 'Tutoring', tip: '青岛家教行情约 60-150 元/小时，一次 2 小时够一周水果', tipEn: 'Tutoring pays ¥60-150/hr in Qingdao, 2 hours covers a week of fruit', tag: '性价比高', tagEn: 'Best value' },
  { name: '助研 / 实验室助理', nameEn: 'Research Assistant', tip: '跟导师做项目，既能积累经验又有补贴，还能写进简历', tipEn: 'Work with professors, gain experience, earn stipend, boost resume', tag: '涨履历', tagEn: 'Resume boost' },
  { name: '咖啡店 / 餐饮兼职', nameEn: 'Cafe / Restaurant', tip: '时薪 15-25，缺点占时间，适合周末', tipEn: '¥15-25/hr, takes time, good for weekends', tag: '灵活', tagEn: 'Flexible' },
  { name: '假期实习 / 竞赛拿奖', nameEn: 'Internships / Competitions', tip: '寒暑假实习 + 奖学金（优秀奖学金 1000/600/400·学期），一次顶半年生活费', tipEn: 'Holiday internships + scholarships (¥1000/600/400 per semester), one award covers half a year', tag: '收益大', tagEn: 'High return' }
]

const QD_PRICES = [
  { icon: '🍚', name: '食堂一餐', nameEn: 'Cafeteria meal', v: '8 ~ 15 元' },
  { icon: '🍱', name: '外卖一餐', nameEn: 'Delivery meal', v: '18 ~ 30 元' },
  { icon: '🥤', name: '奶茶 / 咖啡', nameEn: 'Milk tea / Coffee', v: '10 ~ 20 元' },
  { icon: '🍎', name: '水果（一周）', nameEn: 'Fruit (weekly)', v: '20 ~ 40 元' },
  { icon: '🚌', name: '公交 / 地铁一次', nameEn: 'Bus / Metro ride', v: '1 ~ 4 元' },
  { icon: '🧴', name: '日用品月均', nameEn: 'Daily items (monthly)', v: '30 ~ 60 元' },
  { icon: '💇', name: '理发一次', nameEn: 'Haircut', v: '20 ~ 45 元' },
  { icon: '📖', name: '教材（二手一本）', nameEn: 'Textbook (used)', v: '10 ~ 30 元' }
]
const SEM_RHYTHM = [
  { t: '开学季（9月 / 3月）', tEn: 'Semester Start (Sep / Mar)', tip: '教材、日用品、宿舍水电网集中支出，当月生活费通常要高 10~20%', tipEn: 'Textbooks, supplies, dorm utilities spike. Budget usually 10-20% higher', cls: 'up' },
  { t: '学期中（平稳期）', tEn: 'Mid-Semester (Stable)', tip: '食堂为主、节奏最稳，是最适合定预算、坚持记账的阶段', tipEn: 'Mainly cafeteria, most stable period. Best time to set budgets and track', cls: 'flat' },
  { t: '期末周（1月 / 6月）', tEn: 'Finals (Jan / Jun)', tip: '打印、资料、宵夜奶茶增多，结余紧的话提前预留应急金', tipEn: 'Printing, study materials, late-night snacks increase. Set aside emergency fund', cls: 'warn' },
  { t: '假期（寒暑假）', tEn: 'Break (Winter / Summer)', tip: '回家 / 留校支出结构变化很大，生活费建议单独做计划', tipEn: 'Spending patterns change drastically whether going home or staying. Plan separately', cls: 'low' }
]
const FUN_TIPS = [
  '🥤 一杯奶茶 ≈ 一顿食堂，月底算算「奶茶成就」就知道钱去哪了',
  '🧾 收到生活费先固定存 10%：毕业时可能就是一笔不小的启动金',
  '📉 月底看专业版「收支日历」：哪天是「赤字日」，下个月就避开它',
  '🛒 大额刚需（数码/衣物）等开学季、双11、618 促销，能省 20%+',
  '🎓 奖学金/助学金到账别一次性花完，拆成 3 个月生活费更稳'
]
const FUN_TIPS_EN = [
  '🥤 One milk tea ≈ one cafeteria meal. Check your "tea achievement" at month-end to see where money went',
  '🧾 Save 10% of your allowance immediately: it could be a nice nest egg by graduation',
  '📉 Check the Pro "income/expense calendar" at month-end: find "deficit days" and avoid them next month',
  '🛒 For big purchases (tech/clothes), wait for semester start, 11.11, or 6.18 sales — save 20%+',
  '🎓 Don\'t spend scholarship / aid all at once. Split into 3 months for a steadier budget'
]
const mealOpts = computed(() => lang.value === 'en' ? ['Cafeteria mainly', 'Occasional delivery', 'Frequent delivery'] : ['食堂为主', '偶尔外卖', '常点外卖'])
const socialOpts = computed(() => lang.value === 'en' ? ['Introvert', 'Moderate', 'Social butterfly'] : ['独行侠', '一般', '社交达人'])
const shopOpts = computed(() => lang.value === 'en' ? ['Low', 'Medium', 'High'] : ['低', '中', '高'])
const allocList = computed(() => alloc.value.map(a => ({ ...a, label: lang.value === 'en' ? (ALLOC_CATS.find(c => c.key === a.key)?.labelEn || a.label) : a.label })))
const presetList = computed(() => PRESETS.map(p => ({ ...p, name: lang.value === 'en' ? p.nameEn : p.name })))
const refList = computed(() => REF.map(r => ({ ...r, label: lang.value === 'en' ? r.labelEn : r.label })))
const priceList = computed(() => QD_PRICES.map(p => ({ ...p, name: lang.value === 'en' ? p.nameEn : p.name })))
const rhythmList = computed(() => SEM_RHYTHM.map(s => ({ ...s, t: lang.value === 'en' ? s.tEn : s.t, tip: lang.value === 'en' ? s.tipEn : s.tip })))
const saveTipsList = computed(() => lang.value === 'en' ? SAVE_TIPS_EN : SAVE_TIPS)
const funTipsList = computed(() => lang.value === 'en' ? FUN_TIPS_EN : FUN_TIPS)
const parttimeList = computed(() => PARTTIME.map(p => ({ ...p, name: lang.value === 'en' ? p.nameEn : p.name, tip: lang.value === 'en' ? p.tipEn : p.tip, tag: lang.value === 'en' ? p.tagEn : p.tag })))
</script>

<template>
  <div class="view-top">
    <button class="back-btn" @click="emit('back')">{{ t('budgetSim.backToBudget') }}</button>
    <div class="view-title">{{ t('budgetSim.title') }}</div>
    <div class="view-sub">{{ t('budgetSim.sub') }}</div>
  </div>

  <div class="panel">
    <div class="seg">
      <button class="seg-btn" :class="{ active: tab === 'estimate' }" @click="tab = 'estimate'">{{ t('budgetSim.tabEstimate') }}</button>
      <button class="seg-btn" :class="{ active: tab === 'alloc' }" @click="tab = 'alloc'">{{ t('budgetSim.tabAlloc') }}</button>
      <button class="seg-btn" :class="{ active: tab === 'calib' }" @click="tab = 'calib'">{{ t('budgetSim.tabCalib') }}</button>
      <button class="seg-btn" :class="{ active: tab === 'life' }" @click="tab = 'life'">{{ t('budgetSim.tabLife') }}</button>
    </div>
  </div>

  <template v-if="tab === 'estimate'">
    <div class="panel">
      <div class="seg">
        <button class="seg-btn" :class="{ active: estSub === 'simple' }" @click="estSub = 'simple'">{{ t('budgetSim.subSimple') }}</button>
        <button class="seg-btn" :class="{ active: estSub === 'fine' }" @click="estSub = 'fine'">{{ t('budgetSim.subFine') }}</button>
      </div>

      <template v-if="estSub === 'simple'">
        <div class="sim-group">
          <div class="sim-label">{{ t('budgetSim.mealLabel') }}</div>
          <div class="sim-opts">
            <button v-for="(o, i) in mealOpts" :key="o" class="tab" :class="{ active: meal === i + 1 }" @click="meal = i + 1">{{ o }}</button>
          </div>
        </div>
        <div class="sim-group">
          <div class="sim-label">{{ t('budgetSim.socialLabel') }}</div>
          <div class="sim-opts">
            <button v-for="(o, i) in socialOpts" :key="o" class="tab" :class="{ active: social === i + 1 }" @click="social = i + 1">{{ o }}</button>
          </div>
        </div>
        <div class="sim-group">
          <div class="sim-label">{{ t('budgetSim.shopLabel') }}</div>
          <div class="sim-opts">
            <button v-for="(o, i) in shopOpts" :key="o" class="tab" :class="{ active: shop === i + 1 }" @click="shop = i + 1">{{ o }}</button>
          </div>
        </div>

        <div class="sim-result">
          <div class="sim-result-label">{{ lang === 'en' ? simpleRange.nameEn : simpleRange.name }} · {{ lang === 'en' ? 'Recommended monthly budget' : '推荐月生活费' }}</div>
          <div class="sim-result-num">¥{{ simpleRange.lo }} ~ {{ simpleRange.hi }}</div>
          <div class="muted" style="font-size:12px;">{{ lang === 'en' ? simpleRange.tipEn : simpleRange.tip }}</div>
        </div>
      </template>

      <template v-else>
        <div class="sim-group">
          <div class="sim-label">{{ t('budgetSim.familyLabel') }}</div>
          <div class="sim-opts" style="flex-wrap:wrap;">
            <button v-for="(f, i) in famLevels" :key="f.label" class="tab" :class="{ active: fam === i }" @click="fam = i">{{ lang === 'en' ? f.labelEn : f.label }}</button>
          </div>
        </div>

        <div class="sim-result">
          <div class="sim-result-label">{{ t('budgetSim.recommendLabel') }}</div>
          <div class="sim-result-num">¥{{ famLevels[fam].lo }} ~ {{ famLevels[fam].hi }}</div>
          <div class="muted" style="font-size:12px;">{{ t('budgetSim.recommendNote') }}</div>
        </div>

        <div class="section-title" style="margin:18px 0 10px;"><span class="bar"></span>{{ t('budgetSim.budgetDetailTitle').replace('{n}', mid) }}</div>
        <div v-for="b in fineBudget" :key="b.name" style="margin-bottom:8px;">
          <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:2px;">
            <span>{{ lang === 'en' ? b.nameEn : b.name }}</span><span class="muted">¥{{ b.v }} · {{ b.pct }}%</span>
          </div>
          <div style="background:var(--bar);border-radius:8px;overflow:hidden;">
            <div style="height:12px;background:linear-gradient(90deg,#0d9488,#2dd4bf);border-radius:8px;" :style="{ width: b.pct * 2 + '%' }"></div>
          </div>
        </div>
      </template>
    </div>

    <div class="panel">
      <div class="section-title" style="margin:0 0 10px;"><span class="bar"></span>{{ t('budgetSim.saveTipsTitle') }}</div>
      <ul style="margin:0;padding-left:18px;font-size:13px;line-height:2;color:var(--text);">
        <li v-for="s in saveTipsList" :key="s">{{ s }}</li>
      </ul>
    </div>

    <div class="panel">
      <div class="section-title" style="margin:0 0 10px;"><span class="bar"></span>{{ t('budgetSim.parttimeTitle') }}</div>
      <div v-for="p in parttimeList" :key="p.name" class="pt-row">
        <span class="pt-tag">{{ p.tag }}</span>
        <div>
          <div class="pt-name">{{ p.name }}</div>
          <div class="muted" style="font-size:12px;">{{ p.tip }}</div>
        </div>
      </div>
    </div>
  </template>

  <template v-else-if="tab === 'alloc'">
    <div class="panel">
      <div class="section-title" style="margin:0 0 10px;"><span class="bar"></span>{{ t('budgetSim.allocTitle') }}</div>
      <div class="budget-total-row">
        <span>¥</span>
        <input v-model.number="budgetTotal" type="number" inputmode="numeric" class="input" min="200" max="99999" style="flex:1;font-size:20px;font-weight:800;" />
      </div>
      <div class="preset-row">
        <span class="muted" style="font-size:11px;">{{ t('budgetSim.allocPreset') }}</span>
        <button v-for="p in presetList" :key="p.name" class="tab" @click="applyPreset(p)">{{ p.name }}</button>
      </div>
    </div>

    <div class="panel">
      <div class="section-title" style="margin:0 0 4px;"><span class="bar"></span>{{ t('budgetSim.allocSliderTitle') }}</div>
      <p class="muted" style="font-size:11px;margin-bottom:8px;">{{ t('budgetSim.allocSliderNote') }}</p>
      <div v-for="a in allocList" :key="a.key" class="alloc-row">
        <div class="alloc-head">
          <span class="alloc-label">{{ a.label }}</span>
          <span class="alloc-val"><b>{{ a.pct }}%</b> · ¥{{ allocAmt(a) }}</span>
        </div>
        <div class="alloc-track">
          <div class="alloc-bar" :style="{ width: a.pct + '%' }"></div>
        </div>
        <input v-model.number="a.pct" type="range" :min="a.min" :max="a.max" step="1" class="alloc-slider" />
      </div>

      <div class="alloc-sum" :class="allocStatus.cls">
        <div>{{ lang === 'en' ? 'Allocated' : '已分配' }} <b>{{ allocSum }}%</b>（¥{{ allocSpent }}） / {{ lang === 'en' ? 'Budget' : '预算' }} ¥{{ budgetTotal }}</div>
        <div>{{ lang === 'en' ? 'Remaining' : '结余' }} <b :class="allocRemain >= 0 ? '' : 'over'">¥{{ allocRemain }}</b></div>
        <div class="muted" style="font-size:11px;">{{ allocStatus.text }}</div>
      </div>
      <button class="btn accent big" style="margin-top:12px;width:100%;" @click="savePlan">{{ t('budgetSim.allocSave') }}</button>
      <div v-if="planMsg" class="alloc-msg">{{ planMsg }}</div>
    </div>
  </template>

  <template v-else-if="tab === 'calib'">
    <div class="panel">
      <div class="section-title" style="margin:0 0 10px;"><span class="bar"></span>{{ t('budgetSim.calibTitle') }}</div>
      <div v-if="!calib" class="calib-empty">
        {{ calibMsg }}
        <div v-if="!calibMsg" class="muted" style="font-size:12px;">{{ t('budgetSim.calibReading') }}</div>
      </div>
      <template v-else>
        <div class="sim-result">
          <div class="sim-result-label">{{ t('budgetSim.calibMonths').replace('{n}', calib.months.length) }}</div>
          <div class="sim-result-num">¥{{ calib.avgTotal }}<span style="font-size:14px;">{{ t('budgetSim.calibMonthUnit') }}</span></div>
          <div class="muted" style="font-size:12px;">{{ t('budgetSim.calibMonthsList') }}{{ calib.months.join('、') }}</div>
        </div>

        <div class="section-title" style="margin:16px 0 10px;"><span class="bar"></span>{{ t('budgetSim.calibExpTitle') }}</div>
        <BarRow v-for="i in calib.list" :key="i.cat" :label="expLabel(i.cat)" :value="i.v" :max="calib.max" :text="'¥' + i.v" color="linear-gradient(90deg,#0d9488,#2dd4bf)" />

        <div class="calib-conclusion">{{ calibConclusion }}</div>

        <button class="btn accent big" style="margin-top:12px;width:100%;" @click="applyRealAlloc">{{ t('budgetSim.calibApply') }}</button>
      </template>
    </div>

    <div class="panel">
      <div class="section-title" style="margin:0 0 10px;"><span class="bar"></span>{{ t('budgetSim.calibRefTitle') }}</div>
      <div v-for="r in refList" :key="r.key" class="ref-row">
        <span>{{ r.label }}</span>
        <span class="muted">¥{{ r.lo }} ~ {{ r.hi }}</span>
      </div>
      <p class="muted" style="font-size:11px;margin-top:8px;">
        {{ t('budgetSim.calibRefNote') }}
      </p>
    </div>
  </template>

  <template v-else>
    <div class="panel">
      <div class="section-title" style="margin:0 0 10px;"><span class="bar"></span>{{ t('budgetSim.lifePriceTitle') }}</div>
      <div class="price-grid">
        <div v-for="p in priceList" :key="p.name" class="price-item">
          <span class="price-icon">{{ p.icon }}</span>
          <div class="price-main">
            <div class="price-name">{{ p.name }}</div>
            <b class="price-val">{{ p.v }}</b>
          </div>
        </div>
      </div>
      <p class="muted" style="font-size:11px;margin-top:8px;">{{ t('budgetSim.lifePriceNote') }}</p>
    </div>

    <div class="panel">
      <div class="section-title" style="margin:0 0 10px;"><span class="bar"></span>{{ t('budgetSim.lifeRhythmTitle') }}</div>
      <div v-for="s in rhythmList" :key="s.t" class="rhythm-row">
        <span class="rhythm-tag" :class="s.cls">{{ s.t }}</span>
        <span class="muted" style="font-size:12px;">{{ s.tip }}</span>
      </div>
    </div>

    <div class="panel">
      <div class="section-title" style="margin:0 0 10px;"><span class="bar"></span>{{ t('budgetSim.lifeTipsTitle') }}</div>
      <ul class="tip-list">
        <li v-for="tip in funTipsList" :key="tip">{{ tip }}</li>
      </ul>
    </div>
  </template>

  <p class="muted" style="font-size:12px;text-align:center;padding:4px 0 8px;">
    {{ t('budgetSim.lifePrivacyNote') }}
  </p>
</template>

<style scoped>
.sim-group { margin-bottom: 16px; }
.sim-label { font-size: 13px; font-weight: 700; margin-bottom: 8px; }
.sim-opts { display: flex; gap: 8px; }
.sim-opts .tab { flex: 1; }
.sim-result {
  margin-top: 6px;
  padding: 16px;
  border-radius: 14px;
  background: linear-gradient(135deg, #0f3d33, #155e54);
  color: #fff;
  text-align: center;
}
.sim-result-label { font-size: 12px; opacity: 0.85; }
.sim-result-num { font-size: 30px; font-weight: 800; margin: 6px 0; }
.sim-result .muted { color: rgba(255, 255, 255, 0.8); }
.pt-row { display: flex; gap: 10px; padding: 9px 0; border-bottom: 1px dashed var(--border); }
.pt-row:last-child { border-bottom: none; }
.pt-tag {
  flex: 0 0 auto;
  align-self: flex-start;
  font-size: 11px;
  font-weight: 700;
  color: #0f766e;
  background: var(--soft-green);
  border-radius: 8px;
  padding: 2px 8px;
}
.pt-name { font-size: 13px; font-weight: 700; }

.budget-total-row { display: flex; align-items: center; gap: 8px; }
.preset-row { display: flex; align-items: center; gap: 6px; margin-top: 10px; flex-wrap: wrap; }
.preset-row .tab { flex: 0 0 auto; }
.alloc-row { margin-bottom: 12px; }
.alloc-head { display: flex; justify-content: space-between; align-items: baseline; font-size: 12px; margin-bottom: 3px; }
.alloc-label { font-weight: 600; }
.alloc-val { color: var(--text-sub); }
.alloc-val b { color: var(--primary); }
.alloc-track { height: 8px; background: var(--bar); border-radius: 6px; overflow: hidden; margin-bottom: 4px; }
.alloc-bar { height: 100%; border-radius: 6px; background: linear-gradient(90deg, #0d9488, #2dd4bf); }
.alloc-slider { width: 100%; accent-color: #0d9488; }
.alloc-sum {
  margin-top: 14px;
  padding: 12px;
  border-radius: 12px;
  background: var(--primary-soft);
  border: 1px dashed var(--primary);
  font-size: 13px;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.alloc-sum .over { color: var(--soft-red-text); }
.alloc-msg {
  margin-top: 10px;
  font-size: 12px;
  padding: 10px;
  background: var(--soft-green);
  border: 1px solid var(--soft-green-border);
  border-radius: 10px;
  color: var(--soft-green-text);
}
.calib-empty {
  padding: 16px 4px;
  font-size: 13px;
  color: var(--text-sub);
  line-height: 1.8;
}
.calib-conclusion {
  margin-top: 14px;
  padding: 12px;
  border-radius: 12px;
  background: var(--soft-green);
  border: 1px solid var(--soft-green-border);
  color: var(--soft-green-text);
  font-size: 13px;
  line-height: 1.7;
}
.ref-row { display: flex; justify-content: space-between; font-size: 13px; padding: 6px 0; border-bottom: 1px dashed var(--border); }
.price-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.price-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 10px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--card);
}
.price-icon { font-size: 20px; }
.price-main { display: flex; flex-direction: column; min-width: 0; }
.price-name { font-size: 12px; color: var(--text-sub); }
.price-val { font-size: 13px; }
.rhythm-row { display: flex; align-items: flex-start; gap: 8px; padding: 7px 0; border-bottom: 1px dashed var(--border); }
.rhythm-row:last-child { border-bottom: none; }
.rhythm-tag { flex: 0 0 auto; font-size: 11px; font-weight: 700; border-radius: 8px; padding: 2px 8px; }
.rhythm-tag.up { color: #b45309; background: rgba(245, 158, 11, 0.14); }
.rhythm-tag.flat { color: #0f766e; background: rgba(13, 148, 136, 0.14); }
.rhythm-tag.warn { color: #b63a46; background: rgba(182, 58, 70, 0.14); }
.rhythm-tag.low { color: #6b7280; background: rgba(107, 114, 128, 0.14); }
.tip-list { margin: 0; padding-left: 18px; font-size: 13px; line-height: 2; color: var(--text); }
</style>