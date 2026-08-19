<script setup>
/** 生活费计数器：随手记账 + 微信/支付宝账单导入 + 奖学金快捷勾选
 *  数据仅存本机浏览器 localStorage（qdu_budget_records），不上传任何数据 */
import { ref, computed, watch } from 'vue'
import BudgetSim from './BudgetSim.vue'
import BudgetPro from './BudgetPro.vue'
import BarRow from '../components/BarRow.vue'
import { parseBillFile } from '../utils/billImport.js'

const emit = defineEmits(['back'])

/** 子视图：main 计数器 / sim 生活费模拟 / pro 专业版 */
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
/** 批量记账：一次记入 N 笔相同记录（1~99），编辑模式下忽略 */
const batchN = ref(1)
/** 智能清洗：导入时跳过转账 / 红包 / 收款等中转类交易（可开关，localStorage 记忆） */
const CLEAN_KEY = 'qdu_import_clean'
const cleanMode = ref(localStorage.getItem(CLEAN_KEY) !== '0')
watch(cleanMode, (v) => { try { localStorage.setItem(CLEAN_KEY, v ? '1' : '0') } catch { /* noop */ } })
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
  if (comboEgg()) return
  const amt = Number(amount.value)
  if (!amt || amt <= 0) return
  const n = editing.value ? 1 : Math.max(1, Math.min(99, Math.round(Number(batchN.value) || 1)))
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
    const noteTxt = note.value.trim()
    for (let i = 0; i < n; i++) {
      saved = {
        id: newId(),
        type: mode.value,
        cat: cat.value,
        amount: Math.round(amt * 100) / 100,
        note: n > 1 ? (noteTxt ? `${noteTxt} #${i + 1}` : `#${i + 1}`) : noteTxt,
        date: date.value || today()
      }
      records.value.unshift(saved)
    }
    if (n > 1) batchN.value = 1
  }
  amount.value = ''
  note.value = ''
  if (amt === 404) showToast('收支未找到，但你的努力已经找到方向了！', 3200)
  else if (n === 1) triggerEggs(saved)
  bannerEggFlash()
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

/** 连击彩蛋：金额 2 + 备注「1+1=」时，快速按回车（或点记入）10 次 → 彩蛋；连击期间吞掉重复保存。
 *  用「会话激活」机制：首次触发后即使金额被清空，连击窗口内仍继续计数。 */
let comboState = { active: false, count: 0, last: 0 }
function comboEgg() {
  const cond = Number(amount.value) === 2 && note.value.trim() === '1+1='
  const now = Date.now()
  if (cond && !comboState.active) {
    comboState.active = true
    comboState.count = 1
    comboState.last = now
    return false
  }
  if (!comboState.active) return false
  if (now - comboState.last > 450) { comboState.active = false; return false }
  comboState.count++
  comboState.last = now
  if (comboState.count >= 10) {
    comboState.active = false
    showToast('开发者觉得你很闲，送你个彩蛋')
    return true
  }
  return true
}

/** 像素雨：快速点「本月结余」卡片 3 次（间隔 <450ms）触发，90 个像素块全屏下落 */
let rainHits = 0
let rainLast = 0
function rainTap() {
  const now = Date.now()
  if (now - rainLast < 450) rainHits++
  else rainHits = 1
  rainLast = now
  if (rainHits >= 3) {
    rainHits = 0
    startPxRain()
  }
}

/** 单笔金额彩蛋：保存后按金额 / 类别判断（文本彩蛋每次可触发，无冷却） */
function triggerEggs(r) {
  if (r.cat === 'other' && r.type === 'expense' && Math.abs(r.amount - 9876547210.33) < 0.01) {
    showToast('你买b站手办了？', 3200)
    return
  }
  if (r.cat === 'prize' && r.type === 'income' && r.amount === 500000) {
    showToast('你抓到间谍了🫨？')
    return
  }
  if (r.type === 'expense' && r.cat === 'party' && r.amount > 100) {
    showToast('呦，吃了顿漂亮饭😋')
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
    showToast(hit ? hit[1] : '吹牛逼呢😅')
  }
}

/** 月结余彩蛋：当月结余命中极端值 → 结余卡片常驻显示（每次保存后都会刷新提示） */
const bannerEgg = computed(() => {
  const bal = balance.value
  if (bal > 100000) return { emoji: '😅', text: '吹牛逼呢' }
  if (bal < -1000000) return { emoji: '😅', text: '百万负翁' }
  if (bal < -100000) return { emoji: '😰', text: '你给双子楼炸了？' }
  return null
})
function bannerEggFlash() {
  if (bannerEgg.value) showToast(`${bannerEgg.value.emoji} ${bannerEgg.value.text}`, 2600)
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

/** 像素雨：快速点「记入」3 次触发（见 rainEgg），90 个像素块全屏下落 */
const pxRain = ref([])
let pxSeq = 0
const PX_COLORS = ['#f43f5e', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7', '#ec4899']
function startPxRain() {
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

/* ---- 隐藏成就墙：20 个徽章，支持等级（tiers）与进度显示（localStorage qdu_ach 记录已解锁） ---- */
const MEDAL = ['🥉 初阶', '🥈 进阶', '🥇 大师', '💎 传奇']
const ACHIEVEMENTS = [
  { key: 'tea', icon: '🥤', name: '奶茶品鉴师', desc: '备注含「奶茶」的支出累计', tiers: [20, 50, 100], progress: (all) => all.filter((r) => r.type === 'expense' && (r.note || '').includes('奶茶')).length },
  { key: 'food50', icon: '🍚', name: '干饭人干饭魂', desc: '伙食费累计', tiers: [50, 150, 300], progress: (all) => cnt(all, 'expense', 'food') },
  { key: 'party20', icon: '🍻', name: '干杯！社交达人', desc: '聚餐费累计', tiers: [20, 60, 120], progress: (all) => cnt(all, 'expense', 'party') },
  { key: 'trans20', icon: '🚌', name: '风一样的学生', desc: '交通费累计', tiers: [20, 60, 120], progress: (all) => cnt(all, 'expense', 'transport') },
  { key: 'fruit30', icon: '🍎', name: '水果自由人', desc: '水果零食累计', tiers: [30, 80, 150], progress: (all) => cnt(all, 'expense', 'fruit') },
  { key: 'study10', icon: '📚', name: '卷王本卷', desc: '学习资料累计', tiers: [10, 30, 60], progress: (all) => cnt(all, 'expense', 'study') },
  { key: 'cloth10', icon: '👕', name: '时尚弄潮儿', desc: '衣物鞋帽累计', tiers: [10, 30, 60], progress: (all) => cnt(all, 'expense', 'cloth') },
  { key: 'med5', icon: '💊', name: '养生青年', desc: '医疗保健累计', tiers: [5, 15, 30], progress: (all) => cnt(all, 'expense', 'medical') },
  { key: 'daily20', icon: '🧴', name: '生活小能手', desc: '日常用品累计', tiers: [20, 60, 120], progress: (all) => cnt(all, 'expense', 'daily') },
  { key: 'phone10', icon: '📱', name: '永不失联', desc: '话费 / 网费累计', tiers: [10, 30, 60], progress: (all) => cnt(all, 'expense', 'phone') },
  { key: 'fun30', icon: '🎮', name: '快乐肥宅', desc: '娱乐游戏 + 网络虚拟累计', tiers: [30, 80, 150], progress: (all) => cnt(all, 'expense', 'fun') + cnt(all, 'expense', 'virtual') },
  { key: 'beauty5', icon: '💇', name: '精致生活', desc: '美容美发累计', tiers: [5, 15, 30], progress: (all) => cnt(all, 'expense', 'beauty') },
  { key: 'housing3', icon: '🏠', name: '居家小能手', desc: '房屋住宿累计', tiers: [3, 10, 20], progress: (all) => cnt(all, 'expense', 'housing') },
  { key: 'rec100', icon: '📝', name: '记账达人', desc: '累计记账', tiers: [100, 300, 600], progress: (all) => all.length },
  { key: 'three', icon: '📅', name: '三个月全勤', desc: '有记账记录的月份数', tiers: [3, 6, 12], progress: (all) => activeMonths(all) },
  { key: 'scholar', icon: '🏆', name: '奖学金收割机', desc: '记过奖学金收入', tiers: [1, 3, 6], progress: (all) => all.filter((r) => r.type === 'income' && r.cat === 'scholarship').length },
  { key: 'worker', icon: '💼', name: '卑微打工人', desc: '兼职收入笔数', tiers: [1, 5, 15], progress: (all) => all.filter((r) => r.type === 'income' && r.cat === 'parttime').length },
  { key: 'invest', icon: '📈', name: '睡后收入', desc: '理财收益笔数', tiers: [1, 5, 15], progress: (all) => all.filter((r) => r.type === 'income' && r.cat === 'invest').length },
  { key: 'rich', icon: '💎', name: '一夜暴富', desc: '单笔收入 ≥ 5000 的笔数', tiers: [1, 3, 6], progress: (all) => all.filter((r) => r.type === 'income' && r.amount >= 5000).length },
  { key: 'surplus', icon: '💰', name: '月底有余粮', desc: '结余为正的月份数', tiers: [5, 10, 18], progress: (all) => surplusMonths(all) }
]
function cnt(all, type, cat) {
  return all.filter((r) => r.type === type && r.cat === cat).length
}
function activeMonths(all) {
  return new Set(all.map((r) => (r.date || '').slice(0, 7)).filter(Boolean)).size
}
function surplusMonths(all) {
  const byM = {}
  for (const r of all) {
    const mk = (r.date || '').slice(0, 7)
    if (!mk) continue
    if (!byM[mk]) byM[mk] = { inc: 0, exp: 0 }
    byM[mk][r.type === 'income' ? 'inc' : 'exp'] += r.amount
  }
  return Object.values(byM).filter((m) => m.inc - m.exp > 0).length
}
const levelOf = (a, cur) => {
  let lv = -1
  a.tiers.forEach((t, i) => { if (cur >= t) lv = i })
  return lv
}
const achStates = computed(() => {
  const map = {}
  for (const a of ACHIEVEMENTS) {
    const cur = a.progress(records.value)
    const lv = levelOf(a, cur)
    const next = lv >= 0 && lv < a.tiers.length - 1 ? a.tiers[lv + 1] : a.tiers[a.tiers.length - 1]
    map[a.key] = { cur, level: lv, unlocked: lv >= 0, next }
  }
  return map
})
const achCount = computed(() => ACHIEVEMENTS.filter((a) => achStates.value[a.key].unlocked).length)
const achShown = ref(JSON.parse(localStorage.getItem('qdu_ach') || '{}'))
function markAch(key) {
  try {
    const m = JSON.parse(localStorage.getItem('qdu_ach') || '{}')
    m[key] = true
    localStorage.setItem('qdu_ach', JSON.stringify(m))
    achShown.value = m
  } catch { /* noop */ }
}
watch(achStates, (cur, prev) => {
  for (const a of ACHIEVEMENTS) {
    if (cur[a.key].unlocked && (!prev || !prev[a.key].unlocked) && !achShown.value[a.key]) {
      markAch(a.key)
      showToast(`${a.icon} 成就解锁：${a.name}（${MEDAL[0]}）`, 3200)
    }
  }
}, { immediate: true })
/** 成就墙折叠：展开前只显示 4 个，已解锁优先；可展开全部 */
const achExpanded = ref(false)
const achVisible = computed(() => {
  const list = [...ACHIEVEMENTS]
  if (!achExpanded.value) {
    list.sort((a, b) => (achStates.value[b.key].unlocked ? 1 : 0) - (achStates.value[a.key].unlocked ? 1 : 0) || ACHIEVEMENTS.indexOf(a) - ACHIEVEMENTS.indexOf(b))
    return list.slice(0, 4)
  }
  return list
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
  let { added, skipped, brand, source } = res
  if (!added.length) {
    importMsg.value = `未找到可导入的收支记录（跳过中性交易/无效记录 ${skipped.neutral + skipped.closed} 笔）。请确认账单文件为微信「用于个人对账」或支付宝「交易明细」导出。`
    return
  }

  /* 智能清洗：跳过「转账/红包/收款」类大额中转（≥1000 元）——
   * 典型污染场景：别人转几万给你、你又马上转去他另一张卡，一进一出虚增当月收支。
   * 小额转账（AA 饭钱、党费等）仍保留为「转账」类，不误伤真实支出。 */
  let cleaned = 0
  let cleanedAmt = 0
  if (cleanMode.value) {
    const keep = added.filter((r) => {
      if (r.cat === 'transfer' && r.amount >= 1000) { cleaned++; cleanedAmt += r.amount; return false }
      return true
    })
    added = keep
    if (!added.length) {
      importMsg.value = `该账单 ${res.added.length} 笔全部为转账 / 红包 / 收款等大额中转，已按「智能清洗」跳过。如需保留可关闭智能清洗后重新导入。`
      return
    }
  }

  /* 导入去重：与现有记录及本批次内按 (日期|金额|收支|类别|备注) 比对，
   * 重复导入同一账单时不再产生多条相同记录。 */
  const keyOf = (r) => `${r.date}|${r.amount}|${r.type}|${r.cat}|${r.note}`
  const existing = new Set(records.value.map(keyOf))
  const seen = new Set()
  const fresh = []
  let dup = 0
  for (const r of added) {
    const k = keyOf(r)
    if (existing.has(k) || seen.has(k)) { dup++; continue }
    seen.add(k)
    fresh.push({ id: newId() + Math.random(), ...r })
  }
  if (!fresh.length) {
    importMsg.value = '导入的记录与本机已有记录完全重复，未新增任何条目（可先「清空全部」后重新导入）。'
    return
  }
  records.value = fresh.concat(records.value)

  /* 自动匹配月份：记录按各自交易日期归入对应月份，并切到账单最新月份 */
  let latest = ''
  for (const r of fresh) if (r.date > latest) latest = r.date.slice(0, 7)
  if (latest) month.value = latest

  const brandName = brand === 'alipay' ? '支付宝' : '微信'
  const typeName = source === 'xlsx' ? 'Excel(xlsx)' : '表格'
  const byMonth = {}
  for (const r of fresh) {
    const mk = r.date.slice(0, 7)
    byMonth[mk] = (byMonth[mk] || 0) + 1
  }
  const monthList = Object.keys(byMonth).sort().map((mk) => `${mk.slice(5)}月 ${byMonth[mk]}笔`).join('、')
  const skipMsg = skipped.neutral + skipped.closed ? `跳过无效/中性 ${skipped.neutral + skipped.closed} 笔；` : ''
  const cleanMsg = cleaned ? `智能清洗跳过转账/红包大额中转 ${cleaned} 笔 ¥${fmt(cleanedAmt)}；` : ''
  const dupMsg = dup ? `去重忽略重复 ${dup} 笔；` : ''
  importMsg.value = `✅ 已识别为${brandName}账单（${typeName}）并导入 ${fresh.length} 笔：支出 ¥${fmt(sum(fresh, 'expense'))} / 收入 ¥${fmt(sum(fresh, 'income'))}。${skipMsg}${cleanMsg}${dupMsg}已按各自日期归入对应月份（${monthList}），自动切到最新月份，可点「← 上月 / 下月 →」切换查看。`
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

/** 明细排序：date 日期倒序 / amount 金额降序 / cat 按分类分组 */
const sortMode = ref('date')
const catFilter = ref('all')
const sorted = computed(() => {
  const list = monthRecords.value.filter((r) => catFilter.value === 'all' || r.cat === catFilter.value)
  const arr = [...list]
  if (sortMode.value === 'amount') arr.sort((a, b) => b.amount - a.amount || (a.date < b.date ? 1 : -1))
  else if (sortMode.value === 'cat') arr.sort((a, b) => (catInfo('expense', a.cat) || {}).label?.localeCompare((catInfo('expense', b.cat) || {}).label || '') || (a.date < b.date ? 1 : -1))
  else arr.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.id - a.id))
  return arr
})

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
  <BudgetPro
    v-else-if="subView === 'pro'"
    :records="records"
    :month="month"
    @update:month="month = $event"
    @remove="remove"
    @back="subView = 'main'"
  />

  <template v-else>
  <div class="budget-root" :class="{ cyber: cyberOn }">
  <div class="view-top">
    <button class="back-btn" @click="emit('back')">← 返回首页</button>
    <div class="view-title">生活费计数器</div>
    <div class="view-sub">随手记一笔，月底少流一滴泪 · 奖学金、兼职收入也能入账</div>
    <div class="top-actions">
      <button class="btn ghost small" @click="subView = 'sim'">📊 生活费模拟 ›</button>
      <button class="btn ghost small pro-btn" @click="subView = 'pro'">⚙️ 专业版 ›</button>
    </div>
  </div>

  <div class="panel">
    <div class="month-nav">
      <button class="btn ghost small" @click="month = monthOffset(month, -1)">← 上月</button>
      <div class="month-title">{{ monthLabel }}</div>
      <button class="btn ghost small" @click="month = monthOffset(month, 1)">下月 →</button>
    </div>
    <div class="balance-banner" :class="{ negative: balance < 0 }" @click="rainTap()">
      <div v-if="bannerEgg" class="balance-egg">{{ bannerEgg.emoji }} {{ bannerEgg.text }}</div>
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
    <div class="batch-row" v-if="!editing">
      <span class="muted" style="font-size:11px;">批量：</span>
      <input v-model.number="batchN" type="number" min="1" max="99" class="input batch-input" @keyup.enter="save" />
      <span class="muted" style="font-size:11px;">笔 × ¥{{ fmt(Number(amount) || 0) }}</span>
      <span v-if="Number(batchN) > 1" class="batch-tip">一次记 {{ Number(batchN) }} 条相同记录</span>
    </div>
    <button class="btn accent big" style="margin-top:12px;width:100%;" :class="festival ? 'festival-on ' + festival : ''" :disabled="!(Number(amount) > 0)" @click="save">
      {{ editing ? '✓ 保存修改' : '＋ 记入' + (mode === 'expense' ? '支出' : '收入') + (Number(batchN) > 1 ? ' ×' + Number(batchN) : '') }}
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
    <div class="clean-toggle">
      <input id="clean-switch" type="checkbox" v-model="cleanMode" />
      <label for="clean-switch">智能清洗：自动跳过转账 / 红包 / 收款类<b>大额中转</b>（≥1000 元，如别人转几万给你、你再转去他另一张卡这类过账，避免虚增当月收支；小额 AA 饭钱等转账仍保留）</label>
    </div>
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
    <div class="section-head" style="align-items:center;margin:0 0 8px;">
      <h3 class="section-title" style="margin:0;">明细（{{ sorted.length }}）</h3>
      <button v-if="records.length" class="btn ghost small" @click="clearAll">清空全部</button>
    </div>
    <div class="sort-row">
      <button v-for="s in [{ k: 'date', t: '日期' }, { k: 'amount', t: '金额' }, { k: 'cat', t: '分类' }]" :key="s.k" class="tab" :class="{ active: sortMode === s.k }" @click="sortMode = s.k">{{ s.t }}</button>
      <span class="muted" style="font-size:10px;margin-left:auto;">共 {{ monthRecords.length }} 笔</span>
    </div>
    <div v-if="sortMode === 'cat'" class="cat-chips">
      <button class="chip" :class="{ active: catFilter === 'all' }" @click="catFilter = 'all'">全部</button>
      <button v-for="c in CATS.expense" :key="c.key" class="chip" :class="{ active: catFilter === c.key }" @click="catFilter = c.key">{{ c.icon }}{{ c.label }}</button>
    </div>
    <div v-if="!sorted.length" class="muted" style="text-align:center;padding:16px;">本月还没有记录</div>
    <div v-else class="rec-list">
      <div v-for="r in sorted" :key="r.id" class="rec-row">
        <span class="rec-icon">{{ (catInfo(r.type, r.cat) || {}).icon || '📌' }}</span>
        <span class="rec-main">
          <span class="rec-name">{{ (catInfo(r.type, r.cat) || {}).label || r.cat }}<em v-if="r.merchant"> · {{ r.merchant }}</em><em v-if="r.refunded"> ↩︎已退款</em><em v-if="r.note && r.note !== r.merchant"> · {{ r.note }}</em></span>
          <span class="muted" style="font-size:11px;">{{ r.date }}</span>
        </span>
        <span class="rec-amt" :class="r.type === 'income' ? 'in' : 'out'">{{ r.type === 'income' ? '+' : '-' }}¥{{ fmt(r.amount) }}</span>
        <button class="rec-del" @click="editStart(r)" title="编辑">✎</button>
        <button class="rec-del" @click="remove(r.id)" title="删除">✕</button>
      </div>
    </div>
    <p class="muted" style="font-size:11px;margin-top:10px;">记录保存在本机浏览器（localStorage），不会上传任何数据。</p>

    <div class="ach-panel">
      <div class="section-head" style="align-items:center;margin:0 0 10px;">
        <h3 class="section-title" style="margin:0;">🏅 隐藏成就</h3>
        <span class="ach-count">{{ achCount }} / {{ ACHIEVEMENTS.length }}</span>
      </div>
      <div class="ach-grid">
        <div v-for="a in achVisible" :key="a.key" class="ach-item" :class="{ on: achStates[a.key].unlocked }">
          <div class="ach-top">
            <span class="ach-icon">{{ achStates[a.key].unlocked ? a.icon : '🔒' }}</span>
            <span class="ach-name">{{ achStates[a.key].unlocked ? a.name + (achStates[a.key].level > 0 ? ' · ' + MEDAL[Math.min(achStates[a.key].level, MEDAL.length - 1)] : '') : '？？？' }}</span>
          </div>
          <div class="ach-desc">{{ achStates[a.key].unlocked ? a.desc : '达成条件后解锁' }}</div>
          <div v-if="achStates[a.key].unlocked" class="ach-progress">
            <div class="ach-bar"><i :style="{ width: Math.min(100, Math.round(achStates[a.key].cur / achStates[a.key].next * 100)) + '%' }"></i></div>
            <span class="muted" style="font-size:10px;">{{ achStates[a.key].cur }} / {{ achStates[a.key].next }}</span>
          </div>
        </div>
      </div>
      <button v-if="!achExpanded" class="ach-more" @click="achExpanded = true">展开全部成就 ▾</button>
    </div>
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
.clean-toggle {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-top: 10px;
  font-size: 11px;
  line-height: 1.7;
  color: var(--text-sub);
  cursor: pointer;
}
.clean-toggle input { margin-top: 2px; accent-color: #0d9488; flex: none; cursor: pointer; }
.clean-toggle label { cursor: pointer; }
.clean-toggle b { color: var(--text); }
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

/* 结余卡片彩蛋：月结余命中极端值常驻显示 */
.balance-egg {
  display: inline-block;
  margin-bottom: 8px;
  padding: 4px 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.16);
  color: #ffe9a8;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 1px;
  animation: egg-pop 0.4s ease;
}
@keyframes egg-pop {
  0% { transform: scale(0.6); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}

/* 批量记账行 */
.batch-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
  flex-wrap: wrap;
}
.batch-input { width: 64px; text-align: center; font-weight: 700; }
.batch-tip {
  font-size: 11px;
  color: var(--primary);
  background: var(--primary-soft);
  border-radius: 8px;
  padding: 2px 8px;
}

/* 顶部动作按钮 */
.top-actions { display: flex; gap: 8px; margin-top: 10px; flex-wrap: wrap; }
.pro-btn { border-color: var(--primary) !important; color: var(--primary) !important; }

/* 明细排序 / 分类筛选 */
.sort-row { display: flex; align-items: center; gap: 6px; margin-bottom: 10px; flex-wrap: wrap; }
.sort-row .tab { flex: 0 0 auto; font-size: 12px; }
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

/* 隐藏成就墙 */
.ach-panel { margin-top: 14px; padding-top: 12px; border-top: 1px dashed var(--border); }
.ach-count { font-size: 12px; font-weight: 800; color: var(--primary); }
.ach-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.ach-item {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 3px;
  padding: 9px 10px;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: var(--card);
  opacity: 0.55;
  filter: grayscale(0.9);
}
.ach-item.on {
  opacity: 1;
  filter: none;
  border-color: rgba(124, 58, 237, 0.5);
  background: linear-gradient(135deg, rgba(124, 58, 237, 0.12), rgba(79, 70, 229, 0.1));
}
.ach-top { display: flex; align-items: center; gap: 6px; }
.ach-icon { font-size: 18px; flex: none; }
.ach-name { font-size: 12px; font-weight: 700; }
.ach-item.on .ach-name { color: #6d28d9; }
.ach-desc { font-size: 10px; color: var(--text-sub); }
.ach-progress { display: flex; align-items: center; gap: 6px; width: 100%; }
.ach-bar { flex: 1; height: 6px; border-radius: 4px; background: var(--bar); overflow: hidden; }
.ach-bar i { display: block; height: 100%; border-radius: 4px; background: linear-gradient(90deg, #7c3aed, #a855f7); }
.ach-more {
  margin-top: 10px;
  width: 100%;
  padding: 8px;
  border: 1px dashed var(--border);
  background: none;
  border-radius: 10px;
  font-size: 12px;
  font-family: inherit;
  color: var(--text-sub);
  cursor: pointer;
}
.ach-more:hover { color: var(--primary); border-color: var(--primary); }

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