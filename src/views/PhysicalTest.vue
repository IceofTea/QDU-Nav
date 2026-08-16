<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { standards, itemWeights, itemLabels, bmiScore, itemScore, gradeOf } from '../data/physical'

const emit = defineEmits(['back'])

const yearLabels = ['大一', '大二', '大三', '大四']
const gender = ref('male')
const activeYear = ref(0)
const years = reactive(
  yearLabels.map(() => ({
    height: null, weight: null,
    vital: null, sprint: null, sitReach: null, longJump: null,
    strength: null, endurMin: null, endurSec: null
  }))
)

const saved = localStorage.getItem('qdu_physical_test')
if (saved) {
  try {
    const d = JSON.parse(saved)
    if (d.gender) gender.value = d.gender
    if (Array.isArray(d.years)) d.years.forEach((y, i) => { if (y && years[i]) Object.assign(years[i], y) })
  } catch (e) { /* ignore */ }
}

watch(
  [gender, years],
  () => localStorage.setItem('qdu_physical_test', JSON.stringify({ gender: gender.value, years })),
  { deep: true }
)

function yearResult(y) {
  const g = gender.value
  const bmi = y.height && y.weight ? y.weight / Math.pow(y.height / 100, 2) : null
  const endurSecs = y.endurMin != null && y.endurSec != null ? y.endurMin * 60 + y.endurSec : null
  const items = [
    { key: 'bmi', label: 'BMI', score: bmiScore(g, bmi), raw: bmi ? bmi.toFixed(1) : null, unit: '' },
    { key: 'vitalCapacity', label: itemLabels.vitalCapacity, score: itemScore(g, 'vitalCapacity', y.vital), raw: y.vital, unit: 'ml' },
    { key: 'sprint50', label: itemLabels.sprint50, score: itemScore(g, 'sprint50', y.sprint), raw: y.sprint, unit: '秒' },
    { key: 'sitReach', label: itemLabels.sitReach, score: itemScore(g, 'sitReach', y.sitReach), raw: y.sitReach, unit: 'cm' },
    { key: 'longJump', label: itemLabels.longJump, score: itemScore(g, 'longJump', y.longJump), raw: y.longJump, unit: 'cm' },
    { key: 'strength', label: standards[g].strength.label, score: itemScore(g, 'strength', y.strength), raw: y.strength, unit: '个' },
    { key: 'endurance', label: standards[g].endurance.label, score: itemScore(g, 'endurance', endurSecs), raw: endurSecs, unit: '分:秒' }
  ]
  let total = 0
  let filled = 0
  for (const it of items) {
    if (it.score != null) { total += it.score * itemWeights[it.key]; filled++ }
  }
  total = Math.round(total)
  return { items, total, filled, grade: gradeOf(total) }
}

const active = computed(() => yearResult(years[activeYear.value]))
const filledNow = computed(() => active.value.filled)

const activeTable = ref('bmi')

const FIELD = { vitalCapacity: 'vital', sprint50: 'sprint', sitReach: 'sitReach', longJump: 'longJump', strength: 'strength' }

function rawOf(y, key) {
  if (key === 'bmi') {
    const h = y.height && y.weight ? y.weight / Math.pow(y.height / 100, 2) : null
    return h ? +h.toFixed(1) : null
  }
  if (key === 'endurance') {
    return y.endurMin != null && y.endurSec != null ? y.endurMin * 60 + y.endurSec : null
  }
  return y[FIELD[key]]
}

function fmtVal(key, v) {
  if (v == null) return '—'
  if (key === 'endurance') return Math.floor(v / 60) + ':' + String(v % 60).padStart(2, '0')
  return v
}

const tableChips = computed(() => [
  { key: 'bmi', label: 'BMI' },
  { key: 'vitalCapacity', label: '肺活量' },
  { key: 'sprint50', label: '50 米' },
  { key: 'sitReach', label: '体前屈' },
  { key: 'longJump', label: '跳远' },
  { key: 'strength', label: standards[gender.value].strength.label },
  { key: 'endurance', label: standards[gender.value].endurance.label }
])

const activeTableData = computed(() => {
  const g = gender.value
  if (activeTable.value === 'bmi') {
    const rule = standards[g].bmi
    const [lo, hi] = rule.normal
    const cur = rawOf(years[activeYear.value], 'bmi')
    const score = cur != null ? bmiScore(g, cur) : null
    const rows = [
      { v: `${lo} ~ ${hi}`, s: 100 },
      { v: `${rule.overweight} ~ ${rule.obese - 0.1}`, s: 80 },
      { v: `低于 ${lo}`, s: 80 },
      { v: `${rule.obese} 及以上`, s: 60 }
    ]
    return { key: 'bmi', unit: 'kg/m²', dir: '区间对应', cur: cur != null ? cur : null, score, rows }
  }
  const st = standards[g][activeTable.value]
  if (!st || !st.table) return null
  const cur = rawOf(years[activeYear.value], activeTable.value)
  const score = cur != null ? itemScore(g, activeTable.value, cur) : null
  const dir = st.higher ? '达到或超过' : '不超过'
  return {
    key: activeTable.value,
    unit: st.unit,
    dir,
    cur: fmtVal(activeTable.value, cur),
    score,
    rows: st.table.map(([v, s]) => ({ v, s }))
  }
})
</script>

<template>
  <div class="view-top">
    <button class="back-btn" @click="emit('back')">← 返回首页</button>
    <div class="view-title">体测成绩计算器</div>
    <div class="view-sub">保存并计算大一到大四体测成绩 · 评分标准按《国家学生体质健康标准》整理</div>
  </div>

  <div class="panel">
    <div class="seg">
      <button class="seg-btn" :class="{ active: gender === 'male' }" @click="gender = 'male'">👨 男</button>
      <button class="seg-btn" :class="{ active: gender === 'female' }" @click="gender = 'female'">👩 女</button>
    </div>

    <div class="year-tabs">
      <button v-for="(l, i) in yearLabels" :key="l" class="year-tab" :class="{ active: activeYear === i }" @click="activeYear = i">
        {{ l }}
      </button>
    </div>

    <div class="result-banner">
      <div class="result-score">
        <span class="result-num">{{ active.total }}</span>
        <span class="result-total">/100</span>
      </div>
      <div class="result-grade" :class="active.grade.cls">{{ active.grade.label }}</div>
      <div class="result-hint">已填 {{ filledNow }}/7 项 · 总分按各项权重加权</div>
    </div>

    <div class="field-grid">
      <label class="field">
        <span class="field-label">身高（cm）</span>
        <input v-model.number="years[activeYear].height" class="input" type="number" placeholder="如 175" @focus="activeTable = 'bmi'" />
      </label>
      <label class="field">
        <span class="field-label">体重（kg）</span>
        <input v-model.number="years[activeYear].weight" class="input" type="number" placeholder="如 65" @focus="activeTable = 'bmi'" />
      </label>
      <label class="field">
        <span class="field-label">肺活量（ml）</span>
        <input v-model.number="years[activeYear].vital" class="input" type="number" placeholder="如 4200" @focus="activeTable = 'vitalCapacity'" />
      </label>
      <label class="field">
        <span class="field-label">50 米跑（秒）</span>
        <input v-model.number="years[activeYear].sprint" class="input" type="number" step="0.1" placeholder="如 7.5" @focus="activeTable = 'sprint50'" />
      </label>
      <label class="field">
        <span class="field-label">坐位体前屈（cm）</span>
        <input v-model.number="years[activeYear].sitReach" class="input" type="number" step="0.1" placeholder="如 18" @focus="activeTable = 'sitReach'" />
      </label>
      <label class="field">
        <span class="field-label">立定跳远（cm）</span>
        <input v-model.number="years[activeYear].longJump" class="input" type="number" placeholder="如 250" @focus="activeTable = 'longJump'" />
      </label>
      <label class="field">
        <span class="field-label">{{ standards[gender].strength.label }}（{{ gender === 'male' ? '个' : '个/分' }}）</span>
        <input v-model.number="years[activeYear].strength" class="input" type="number" placeholder="如 15" @focus="activeTable = 'strength'" />
      </label>
      <div class="field field-split">
        <span class="field-label">{{ standards[gender].endurance.label }}（分:秒）</span>
        <div class="split-row">
          <input v-model.number="years[activeYear].endurMin" class="input" type="number" placeholder="分" @focus="activeTable = 'endurance'" />
          <span class="split-colon">:</span>
          <input v-model.number="years[activeYear].endurSec" class="input" type="number" placeholder="秒" @focus="activeTable = 'endurance'" />
        </div>
      </div>
    </div>

    <div class="score-list">
      <div v-for="it in active.items" :key="it.key" class="score-row">
        <span class="score-name">{{ it.label }}</span>
        <span class="score-raw" :class="{ dim: it.raw == null }">{{ it.raw != null ? it.raw + (it.unit ? ' ' + it.unit : '') : '未填' }}</span>
        <span class="score-bar"><i :style="{ width: (it.score ?? 0) + '%' }"></i></span>
        <span class="score-val" :class="{ dim: it.score == null }">{{ it.score ?? '—' }}分</span>
      </div>
    </div>
    <p class="muted">成绩已自动保存在本机浏览器中，下次打开自动恢复。</p>
  </div>

  <div class="panel">
    <div class="section-head" style="align-items:center;">
      <h3 class="section-title">📊 一分一段表</h3>
      <span class="section-sub">成绩 ↔ 分数对应（{{ standards[gender].genderText || (gender === 'male' ? '男生' : '女生') }}）</span>
    </div>
    <div class="tab-row" style="flex-wrap:wrap;gap:6px;">
      <button
        v-for="t in tableChips"
        :key="t.key"
        class="tab"
        :class="{ active: activeTable === t.key }"
        @click="activeTable = t.key"
      >{{ t.label }}</button>
    </div>

    <div v-if="activeTableData" class="table-wrap" style="margin-top:10px;">
      <div class="muted" style="font-size:12px;margin-bottom:6px;">
        成绩单位：{{ activeTableData.unit }} · 评分规则：{{ activeTableData.dir }}
        <template v-if="activeTableData.cur !== '—'">
          当前成绩 {{ activeTableData.cur }}{{ activeTableData.unit }} → <b style="color:var(--primary)">{{ activeTableData.score }} 分</b>
        </template>
      </div>
      <table class="mini-table">
        <thead><tr><th>成绩（{{ activeTableData.unit }}）</th><th>得分</th><th>等级</th></tr></thead>
        <tbody>
          <tr v-for="row in activeTableData.rows" :key="row.v" :class="{ hit: activeTableData.score != null && row.s === activeTableData.score }">
            <td>{{ row.v }}</td>
            <td><b>{{ row.s }}</b></td>
            <td class="muted">{{ row.s >= 90 ? '优秀' : row.s >= 80 ? '良好' : row.s >= 60 ? '及格' : '不及格' }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.score-raw {
  font-size: 11px;
  color: var(--text-light);
  min-width: 64px;
  text-align: right;
}
.score-raw.dim { color: #c2c9d6; }
.score-bar { flex: 1; }
.table-wrap { overflow-x: auto; }
.mini-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.mini-table th, .mini-table td {
  border: 1px solid var(--border);
  padding: 6px 10px;
  text-align: left;
}
.mini-table th { background: var(--bg); font-weight: 700; }
.mini-table tr.hit td { background: #e8f2ff; }
.mini-table tr.hit td:first-child { font-weight: 800; color: var(--primary); }
</style>