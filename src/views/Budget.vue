<script setup>
import { ref, computed, watch } from 'vue'

const emit = defineEmits(['back'])

const CATS = {
  expense: [
    { key: 'food', icon: '🍚', label: '伙食费', hint: '食堂 · 外卖 · 小卖部' },
    { key: 'party', icon: '🍻', label: '聚餐费', hint: '团建 · 约饭 · 奶茶局' },
    { key: 'transport', icon: '🚌', label: '交通费', hint: '公交 · 打车 · 共享电车' },
    { key: 'fruit', icon: '🍎', label: '水果费', hint: '水果 · 酸奶 · 零食' },
    { key: 'daily', icon: '🧴', label: '日常用品', hint: '洗发水 · 纸巾 · 洗衣液' },
    { key: 'phone', icon: '📱', label: '电话费', hint: '话费 · 流量 · 校园网' },
    { key: 'fun', icon: '🎮', label: '充三国杀', hint: '氪金一时爽，月底火葬场' },
    { key: 'trouble', icon: '💥', label: '闯祸费', hint: '赔了舍友的碗 / 打碎东西' },
    { key: 'other', icon: '📦', label: '其它支出', hint: '说不清的一笔' }
  ],
  income: [
    { key: 'allowance', icon: '💰', label: '生活费', hint: '爸妈打款' },
    { key: 'scholarship', icon: '🏅', label: '奖学金', hint: '知识就是金钱' },
    { key: 'parttime', icon: '💼', label: '兼职', hint: '搬砖收入' },
    { key: 'prize', icon: '🎁', label: '红包/奖金', hint: '意外之财' }
  ]
}

const REF = [
  { key: 'food', label: '伙食费', lo: 800, hi: 1500 },
  { key: 'party', label: '聚餐费', lo: 200, hi: 600 },
  { key: 'transport', label: '交通费', lo: 60, hi: 250 },
  { key: 'fruit', label: '水果零食', lo: 80, hi: 300 },
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

const mode = ref('expense')
const cat = ref('food')
const amount = ref('')
const note = ref('')
const date = ref(today())
const month = ref(curMonth())
const showRef = ref(false)

const cats = computed(() => CATS[mode.value])
const catInfo = (type, key) => (CATS[type] || []).find((c) => c.key === key)

function pickCat(key) {
  cat.value = key
}

function add() {
  const amt = Number(amount.value)
  if (!amt || amt <= 0) return
  records.value.unshift({
    id: Date.now() + Math.random(),
    type: mode.value,
    cat: cat.value,
    amount: Math.round(amt * 100) / 100,
    note: note.value.trim(),
    date: date.value || today()
  })
  amount.value = ''
  note.value = ''
}

function remove(id) {
  records.value = records.value.filter((r) => r.id !== id)
}

function sum(list, type) {
  return Math.round(list.filter((r) => r.type === type).reduce((s, r) => s + r.amount, 0) * 100) / 100
}

const monthRecords = computed(() => records.value.filter((r) => r.date.startsWith(month.value)))
const income = computed(() => sum(monthRecords.value, 'income'))
const expense = computed(() => sum(monthRecords.value, 'expense'))
const balance = computed(() => Math.round((income.value - expense.value) * 100) / 100)

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
  if (balance.value < 0) return '本月已超支 ' + fmt(Math.abs(balance.value)) + ' 元，建议喊爸妈或白嫖食堂 🥲'
  if (income.value === 0) return '光花不挣，奖学金该提上日程了 😏'
  return '收支平衡，继续保持 🎉'
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
  <div class="view-top">
    <button class="back-btn" @click="emit('back')">← 返回首页</button>
    <div class="view-title">生活费计数器</div>
    <div class="view-sub">随手记一笔，月底少流一滴泪 · 奖学金、兼职收入也能入账</div>
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
      <div class="balance-row">
        <div class="balance-item income"><span>收入</span><b>+¥{{ fmt(income) }}</b></div>
        <div class="balance-item expense"><span>支出</span><b>-¥{{ fmt(expense) }}</b></div>
        <div class="balance-item"><span>笔数</span><b>{{ monthRecords.length }}</b></div>
      </div>
    </div>
  </div>

  <div class="panel">
    <div class="section-title" style="margin:0 0 12px;"><span class="bar"></span>记一笔</div>
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
    <div class="input-row" style="margin-top:14px;">
      <input v-model="amount" class="input amount-input" type="number" inputmode="decimal" placeholder="金额，如 12.5" @keyup.enter="add" />
      <input v-model="date" class="input date-input" type="date" />
    </div>
    <input v-model="note" class="input" style="margin-top:10px;" placeholder="备注（可选），如：食堂麻辣香锅" @keyup.enter="add" />
    <button class="btn accent big" style="margin-top:12px;width:100%;" :disabled="!(Number(amount) > 0)" @click="add">
      ＋ 记入{{ mode === 'expense' ? '支出' : '收入' }}
    </button>
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
      <div v-for="c in catStats" :key="c.name" style="margin-bottom:8px;">
        <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:2px;">
          <span>{{ c.name }}</span><span class="muted">¥{{ fmt(c.v) }}</span>
        </div>
        <div style="background:#eef3fb;border-radius:8px;overflow:hidden;">
          <div style="height:12px;background:linear-gradient(90deg,#b63a46,#e76f51);border-radius:8px;" :style="{ width: Math.round(c.v / maxCat * 100) + '%' }"></div>
        </div>
      </div>
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
        <button class="rec-del" @click="remove(r.id)" title="删除">✕</button>
      </div>
    </div>
    <p class="muted" style="font-size:11px;margin-top:10px;">记录保存在本机浏览器（localStorage），不会上传任何数据。</p>
  </div>
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
.balance-hint { font-size: 12px; opacity: 0.9; margin-bottom: 12px; }
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
.cat-hint { font-size: 10px; color: var(--text-sub); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.amount-input { font-size: 18px; font-weight: 700; flex: 1; min-width: 120px; }
.date-input { width: 150px; }
.btn.big { padding: 12px; font-size: 15px; }
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
  background: #eef3fb;
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
  border: none; background: none; color: #b9c2d0; font-size: 14px; cursor: pointer; padding: 4px;
}
.rec-del:hover { color: var(--primary); }
</style>