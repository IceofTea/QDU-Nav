<script setup>
/** 生活费计数器：随手记账 + 微信/支付宝账单 CSV 导入 + 奖学金快捷勾选
 *  数据仅存本机浏览器 localStorage（qdu_budget_records），不上传任何数据 */
import { ref, computed, watch } from 'vue'
import BudgetSim from './BudgetSim.vue'
import BarRow from '../components/BarRow.vue'

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
    { key: 'trouble', icon: '💥', label: '闯祸费', hint: '赔了舍友的碗 / 打碎东西' },
    { key: 'other', icon: '📦', label: '其它支出', hint: '说不清的一笔' }
  ],
  income: [
    { key: 'allowance', icon: '💰', label: '生活费', hint: '爸妈打款' },
    { key: 'scholarship', icon: '🏅', label: '奖学金', hint: '知识就是金钱' },
    { key: 'parttime', icon: '💼', label: '兼职', hint: '搬砖收入' },
    { key: 'prize', icon: '🎁', label: '红包/奖金', hint: '意外之财' },
    { key: 'resale', icon: '🏷️', label: '闲置转卖', hint: '断舍离变现' },
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

/** 导入账单时按商品名关键词猜测类别 */
const HINT_CATS = [
  { key: 'food', words: ['食堂', '餐', '饭', '外卖', '奶茶', '咖啡', '果', '零食', '面', '饺', '烧烤', '火锅', '汉堡', '小吃', '买菜', '菜场'] },
  { key: 'party', words: ['聚餐', '团建', '约饭'] },
  { key: 'transport', words: ['公交', '地铁', '打车', '滴滴', '高铁', '火车', '共享', '加油', '停车', '飞机'] },
  { key: 'study', words: ['书', '教材', '打印', '文具', '资料', '报名', '考研', '考证'] },
  { key: 'cloth', words: ['衣', '服', '鞋', '裤', '帽', '穿搭'] },
  { key: 'medical', words: ['药', '医院', '挂号', '体检', '口罩'] },
  { key: 'daily', words: ['洗发', '纸巾', '洗衣', '牙膏', '毛巾', '日用'] },
  { key: 'phone', words: ['话费', '流量', '移动', '联通', '电信', '校园网', '宽带'] },
  { key: 'fun', words: ['游戏', 'steam', '电影', 'ktv', '演出', '门票', '会员', '视频'] }
]

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
  if (editing.value) {
    const rec = records.value.find((r) => r.id === editing.value)
    if (rec) {
      rec.type = mode.value
      rec.cat = cat.value
      rec.amount = Math.round(amt * 100) / 100
      rec.note = note.value.trim()
      rec.date = date.value || today()
    }
    editing.value = null
  } else {
    records.value.unshift({
      id: newId(),
      type: mode.value,
      cat: cat.value,
      amount: Math.round(amt * 100) / 100,
      note: note.value.trim(),
      date: date.value || today()
    })
  }
  amount.value = ''
  note.value = ''
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

function sum(list, type) {
  return Math.round(list.filter((r) => r.type === type).reduce((s, r) => s + r.amount, 0) * 100) / 100
}

/** 选中奖学金预设：自动带出金额与备注 */
function pickScholar(s) {
  if (Number(amount.value) && Number(amount.value) !== s.amount && !window.confirm(`当前金额为 ¥${fmt(Number(amount.value))}，要替换为 ¥${fmt(s.amount)} 吗？`)) return
  amount.value = String(s.amount)
  note.value = s.name
}

function guessCat(name) {
  const n = (name || '').toLowerCase()
  for (const h of HINT_CATS) {
    if (h.words.some((w) => n.includes(w))) return h.key
  }
  return 'other'
}

function csvImport(file) {
  importMsg.value = ''
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    const text = String(reader.result || '')
    const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/)
    let head = -1
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('收/支')) { head = i; break }
    }
    if (head < 0) {
      importMsg.value = '未识别到账单表头（需包含「收/支」「金额」列），请确认是微信/支付宝导出的账单 CSV。'
      return
    }
    const cols = lines[head].split(',')
    const idx = (name) => {
      const exact = cols.findIndex((c) => c.trim() === name)
      if (exact >= 0) return exact
      return cols.findIndex((c) => c.includes(name))
    }
    const iTime = idx('交易时间') >= 0 ? idx('交易时间') : idx('交易创建时间')
    const iKind = idx('收/支')
    const iAmt = idx('金额')
    const iName = idx('商品') >= 0 ? idx('商品') : idx('商品名称')
    const iStatus = idx('当前状态') >= 0 ? idx('当前状态') : idx('交易状态')
    const iNote = idx('备注')
    if (iKind < 0 || iAmt < 0) {
      importMsg.value = '账单缺少「收/支」或「金额」列，无法导入。'
      return
    }
    const added = []
    for (let i = head + 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line || !line.includes(',')) continue
      const cell = line.split(',')
      const get = (j) => (j >= 0 && j < cell.length ? cell[j].trim() : '')
      const kind = get(iKind)
      const status = get(iStatus)
      if (status && !status.includes('成功') && !status.includes('支付')) continue
      const amtRaw = get(iAmt).replace(/[^\d.]/g, '')
      const amt = Math.round(Number(amtRaw || 0) * 100) / 100
      if (!amt || amt <= 0 || (kind !== '支出' && kind !== '收入')) continue
      const name = get(iName)
      const noteText = get(iNote)
      const dateText = (get(iTime) || '').slice(0, 10)
      added.push({
        id: newId() + added.length,
        type: kind === '支出' ? 'expense' : 'income',
        cat: guessCat(name),
        amount: amt,
        note: noteText || name,
        date: dateText || today()
      })
    }
    if (!added.length) {
      importMsg.value = '未找到可导入的收支记录，请确认账单格式。'
      return
    }
    records.value = added.concat(records.value)
    importMsg.value = `✅ 已导入 ${added.length} 笔记录（金额合计 ¥${fmt(sum(added, 'expense'))} 支出 / ¥${fmt(sum(added, 'income'))} 收入）。支出已按商品名自动归类，可在明细中修改。`
  }
  reader.onerror = () => { importMsg.value = '文件读取失败。' }
  reader.readAsText(file, 'utf-8')
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
  <div class="view-top">
    <button class="back-btn" @click="emit('back')">← 返回首页</button>
    <div class="view-title">生活费计数器</div>
    <div class="view-sub">随手记一笔，月底少流一滴泪 · 奖学金、兼职收入也能入账</div>
    <button class="btn ghost small" style="margin-top:10px;" @click="subView = 'sim'">🧮 生活费模拟 · 青岛一个月多少生活费合适 ›</button>
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
      <button class="seg-btn" :class="{ active: mode === 'expense' }" @click="mode = 'expense'; cat = 'food'">💸 支出</button>
      <button class="seg-btn" :class="{ active: mode === 'income' }" @click="mode = 'income'; cat = 'allowance'">💵 收入</button>
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
    <button class="btn accent big" style="margin-top:12px;width:100%;" :disabled="!(Number(amount) > 0)" @click="save">
      {{ editing ? '✓ 保存修改' : '＋ 记入' + (mode === 'expense' ? '支出' : '收入') }}
    </button>
    <button v-if="editing" class="btn ghost big" style="margin-top:8px;width:100%;" @click="cancelEdit">取消</button>
  </div>

  <div class="panel">
    <div class="section-title" style="margin:0 0 10px;"><span class="bar"></span>📥 导入微信 / 支付宝账单</div>
    <p class="muted" style="font-size:12px;margin-bottom:10px;">
      支持微信支付账单明细、支付宝账单明细导出的 CSV：在「微信支付 → 账单下载 → 用于个人对账」或「支付宝 → 我的账单 → 导出」下载后选择文件，金额按「收/支」自动记入，支出按商品名自动归类。
    </p>
    <input id="csv-file" type="file" accept=".csv,text/csv" style="display:none;" @change="csvImport($event.target.files[0])" />
    <label for="csv-file" class="btn ghost" style="cursor:pointer;display:inline-flex;align-items:center;gap:6px;">📄 选择账单 CSV 文件</label>
    <div v-if="importMsg" class="import-msg">{{ importMsg }}</div>
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
</style>