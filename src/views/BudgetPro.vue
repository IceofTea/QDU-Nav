<script setup>
/** 生活费 · 专业版：多维图表 + 商户聚合 + 明细筛选 + 导出分析
 *  全部计算在本机浏览器完成；图表带索引，点击即筛选下方明细。 */
import { ref, computed } from 'vue'
import BarRow from '../components/BarRow.vue'
import { cleanMerchant } from '../utils/billImport.js'

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
const INC_LABEL = {
  allowance: '生活费', scholarship: '奖学金', parttime: '兼职', prize: '红包/奖金',
  resale: '闲置转卖', refund: '退款', invest: '理财收益', transfer: '转账收入', other: '其它收入'
}
const fmt = (n) => (n % 1 === 0 ? String(n) : n.toFixed(2))
const sum = (list, type) => Math.round(list.filter((r) => r.type === type).reduce((s, r) => s + r.amount, 0) * 100) / 100
const isExp = (r) => r.type === 'expense'

/* ---- KPI ---- */
const totalInc = computed(() => sum(props.records, 'income'))
const totalExp = computed(() => sum(props.records, 'expense'))
const totalBal = computed(() => Math.round((totalInc.value - totalExp.value) * 100) / 100)
const refundTotal = computed(() => Math.round(props.records.filter((r) => r.refunded).reduce((s, r) => s + r.amount, 0) * 100) / 100)
const refundCount = computed(() => props.records.filter((r) => r.refunded).length)

/* ---- 月度收支（近 12 个月）---- */
function monthOffset(base, off) {
  const [y, m] = base.split('-').map(Number)
  const d = new Date(y, m - 1 + off, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
const monthly = computed(() => {
  const arr = []
  for (let off = -11; off <= 0; off++) {
    const key = monthOffset(props.month, off)
    const list = props.records.filter((r) => r.date.startsWith(key))
    arr.push({
      key,
      label: key.slice(5) + '月',
      inc: sum(list, 'income'),
      exp: sum(list, 'expense'),
      bal: Math.round((sum(list, 'income') - sum(list, 'expense')) * 100) / 100
    })
  }
  return arr
})
const maxMonthly = computed(() => Math.max(1, ...monthly.value.map((m) => Math.max(m.inc, m.exp))))
function jumpMonth(key) {
  emit('update:month', key)
  emit('back')
}

/* ---- 分类聚合 ---- */
const catAgg = computed(() => {
  const map = {}
  for (const r of props.records) {
    if (!isExp(r)) continue
    const label = EXP_LABEL[r.cat] || r.cat
    map[label] = (map[label] || 0) + r.amount
  }
  return Object.entries(map).map(([name, v]) => ({ name, v: Math.round(v * 100) / 100, key: name })).sort((a, b) => b.v - a.v)
})
const incAgg = computed(() => {
  const map = {}
  for (const r of props.records) {
    if (r.type !== 'income' || r.cat === 'refund') continue
    const label = INC_LABEL[r.cat] || r.cat
    map[label] = (map[label] || 0) + r.amount
  }
  return Object.entries(map).map(([name, v]) => ({ name, v: Math.round(v * 100) / 100 })).sort((a, b) => b.v - a.v)
})
const maxCat = computed(() => Math.max(1, ...catAgg.value.map((c) => c.v)))

/* ---- 商户聚合：同商户支出排行 ---- */
const merchantAgg = computed(() => {
  const map = {}
  for (const r of props.records) {
    if (!isExp(r)) continue
    const m = cleanMerchant(r.merchant) || '其他'
    map[m] = (map[m] || 0) + r.amount
  }
  return Object.entries(map).map(([name, v]) => ({ name, v: Math.round(v * 100) / 100 })).sort((a, b) => b.v - a.v)
})
const maxMerchant = computed(() => Math.max(1, ...merchantAgg.value.map((m) => m.v)))

/* ---- 明细：筛选（分类 / 商户）+ 排序 ---- */
const proFilter = ref('')
const proSort = ref('date')
const proCats = ref([])
const catToggle = (label) => {
  proFilter.value = proFilter.value === label ? '' : label
}
const merchantClick = (name) => {
  proFilter.value = proFilter.value === name ? '' : name
}
const filtered = computed(() => {
  let list = props.records
  if (proFilter.value) {
    const isCat = !!EXP_LABEL[proFilter.value] || !merchantAgg.value.some((m) => m.name === proFilter.value)
    list = list.filter((r) => (isCat ? (EXP_LABEL[r.cat] || r.cat) === proFilter.value : cleanMerchant(r.merchant) === proFilter.value))
  }
  const arr = [...list]
  if (proSort.value === 'amount') arr.sort((a, b) => b.amount - a.amount || (a.date < b.date ? 1 : -1))
  else if (proSort.value === 'cat') arr.sort((a, b) => (EXP_LABEL[a.cat] || '').localeCompare(EXP_LABEL[b.cat] || ''))
  else arr.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.id - a.id))
  return arr
})

/* ---- 导出分析文件（CSV，Excel 可直接打开）---- */
function exportCsv() {
  const line = (a) => a.map((c) => {
    const s = String(c == null ? '' : c)
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
  }).join(',')
  const rows = []
  rows.push(['QDU 生活费收支分析导出', new Date().toLocaleString()])
  rows.push([])
  rows.push(['累计收入', '累计支出', '结余', '退款冲抵笔数', '退款冲抵金额'])
  rows.push([fmt(totalInc.value), fmt(totalExp.value), fmt(totalBal.value), refundCount.value, fmt(refundTotal.value)])
  rows.push([])
  rows.push(['【分类支出汇总】'])
  rows.push(['分类', '金额'])
  for (const c of catAgg.value) rows.push([c.name, c.v])
  rows.push([])
  rows.push(['【商户支出 Top 30】'])
  rows.push(['商户', '金额'])
  for (const m of merchantAgg.value.slice(0, 30)) rows.push([m.name, m.v])
  rows.push([])
  rows.push(['【收支明细】'])
  rows.push(['日期', '类型', '分类', '商户', '金额', '已退款', '备注'])
  for (const r of filtered.value) {
    rows.push([r.date, r.type === 'income' ? '收入' : '支出', (EXP_LABEL[r.cat] || INC_LABEL[r.cat] || r.cat), r.merchant || '', r.amount, r.refunded ? '是' : '', r.note || ''])
  }
  const csv = '\uFEFF' + rows.map(line).join('\r\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `生活费分析_${props.month}.csv`
  document.body.appendChild(a)
  a.click()
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove() }, 300)
}
</script>

<template>
  <div class="view-top">
    <button class="back-btn" @click="emit('back')">← 返回生活费计数器</button>
    <div class="view-title">生活费 · 专业版</div>
    <div class="view-sub">多维图表 · 同商户聚合 · 明细筛选 · 导出分析（全部本地计算）</div>
  </div>

  <div class="panel">
    <div class="kpi-row">
      <div class="kpi"><span>累计收入</span><b class="in">+¥{{ fmt(totalInc) }}</b></div>
      <div class="kpi"><span>累计支出</span><b class="out">-¥{{ fmt(totalExp) }}</b></div>
      <div class="kpi"><span>结余</span><b :class="totalBal >= 0 ? 'in' : 'out'">{{ totalBal >= 0 ? '+' : '' }}¥{{ fmt(totalBal) }}</b></div>
      <div class="kpi"><span>退款冲抵</span><b>{{ refundCount }} 笔 ¥{{ fmt(refundTotal) }}</b></div>
    </div>
  </div>

  <div class="panel">
    <div class="section-title" style="margin:0 0 10px;"><span class="bar"></span>近 12 月收支对比</div>
    <div class="bar-chart">
      <div v-for="m in monthly" :key="m.key" class="bc-col" :class="{ cur: m.key === month }" @click="jumpMonth(m.key)">
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
    <p class="muted" style="font-size:11px;margin-top:8px;">点击月份可跳转到该月主视图 · 绿=收入 红=支出</p>
  </div>

  <div class="panel">
    <div class="section-title" style="margin:0 0 10px;"><span class="bar"></span>支出分类构成</div>
    <div v-if="catAgg.length" class="chart-rows">
      <button v-for="c in catAgg" :key="c.name" class="chart-row" @click="catToggle(c.name)">
        <BarRow :label="c.name" :value="c.v" :max="maxCat" :text="'¥' + fmt(c.v) + ' · ' + Math.round(c.v / Math.max(1, totalExp) * 100) + '%'" color="linear-gradient(90deg,#b63a46,#e76f51)" />
      </button>
    </div>
    <div v-else class="muted" style="text-align:center;padding:10px;">暂无支出数据</div>
  </div>

  <div class="panel">
    <div class="section-title" style="margin:0 0 10px;"><span class="bar"></span>同商户支出排行</div>
    <div v-if="merchantAgg.length" class="chart-rows">
      <button v-for="m in merchantAgg.slice(0, 15)" :key="m.name" class="chart-row" @click="merchantClick(m.name)">
        <BarRow :label="m.name" :value="m.v" :max="maxMerchant" :text="'¥' + fmt(m.v)" color="linear-gradient(90deg,#0d9488,#2dd4bf)" />
      </button>
    </div>
    <div v-else class="muted" style="text-align:center;padding:10px;">暂无商户数据</div>
  </div>

  <div class="panel">
    <div class="section-head" style="align-items:center;margin:0 0 8px;">
      <h3 class="section-title" style="margin:0;">收支明细</h3>
      <div style="display:flex;gap:6px;align-items:center;">
        <button v-for="s in [{ k: 'date', t: '日期' }, { k: 'amount', t: '金额' }, { k: 'cat', t: '分类' }]" :key="s.k" class="tab" :class="{ active: proSort === s.k }" @click="proSort = s.k">{{ s.t }}</button>
        <button class="btn ghost small" @click="exportCsv">⬇️ 导出分析</button>
      </div>
    </div>
    <div v-if="proFilter" class="pro-filter-tip">
      已筛选：<b>{{ proFilter }}</b>（{{ filtered.length }} 笔）
      <button class="btn ghost small" @click="proFilter = ''">✕ 清除筛选</button>
    </div>
    <div v-if="!filtered.length" class="muted" style="text-align:center;padding:16px;">暂无记录</div>
    <div v-else class="rec-list">
      <div v-for="r in filtered" :key="r.id" class="rec-row">
        <span class="rec-icon">{{ isExp(r) ? (EXP_LABEL[r.cat] || '📌') : '💵' }}</span>
        <span class="rec-main">
          <span class="rec-name">{{ (isExp(r) ? EXP_LABEL[r.cat] : INC_LABEL[r.cat]) || r.cat }}<em v-if="r.merchant"> · {{ r.merchant }}</em><em v-if="r.refunded"> ↩︎已退款</em></span>
          <span class="muted" style="font-size:11px;">{{ r.date }}</span>
        </span>
        <span class="rec-amt" :class="isExp(r) ? 'out' : 'in'">{{ isExp(r) ? '-' : '+' }}¥{{ fmt(r.amount) }}</span>
        <button class="rec-del" @click="emit('remove', r.id)" title="删除">✕</button>
      </div>
    </div>
  </div>

  <p class="muted" style="font-size:12px;text-align:center;padding:4px 0 10px;">
    专业版所有分析均在本地浏览器完成，导出文件仅包含你的记账数据，不会上传任何服务器
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

@media (max-width: 480px) {
  .kpi-row { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
</style>