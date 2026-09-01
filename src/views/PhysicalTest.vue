<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { standards, itemWeights, itemLabels, bmiScore, itemScore, gradeOf } from '../data/physical'
import { useI18n } from '../i18n'

const { t, lang } = useI18n()

const emit = defineEmits(['back'])

const yearKeys = ['year1', 'year2', 'year3', 'year4']
const yearLabels = computed(() => yearKeys.map(k => t('physicalTest.' + k)))
const gender = ref('male')
const activeYear = ref(0)
const years = reactive(
  yearKeys.map(() => ({
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
    { key: 'vitalCapacity', label: lang.value === 'en' ? itemLabels.vitalCapacityEn : itemLabels.vitalCapacity, score: itemScore(g, 'vitalCapacity', y.vital), raw: y.vital, unit: 'ml' },
    { key: 'sprint50', label: lang.value === 'en' ? itemLabels.sprint50En : itemLabels.sprint50, score: itemScore(g, 'sprint50', y.sprint), raw: y.sprint, unit: lang.value === 'en' ? 's' : '秒' },
    { key: 'sitReach', label: lang.value === 'en' ? itemLabels.sitReachEn : itemLabels.sitReach, score: itemScore(g, 'sitReach', y.sitReach), raw: y.sitReach, unit: 'cm' },
    { key: 'longJump', label: lang.value === 'en' ? itemLabels.longJumpEn : itemLabels.longJump, score: itemScore(g, 'longJump', y.longJump), raw: y.longJump, unit: 'cm' },
    { key: 'strength', label: lang.value === 'en' ? standards[g].strength.labelEn : standards[g].strength.label, score: itemScore(g, 'strength', y.strength), raw: y.strength, unit: lang.value === 'en' ? 'reps' : '个' },
    { key: 'endurance', label: lang.value === 'en' ? standards[g].endurance.labelEn : standards[g].endurance.label, score: itemScore(g, 'endurance', endurSecs), raw: endurSecs, unit: lang.value === 'en' ? 'min:sec' : '分:秒' }
  ]
  let total = 0
  let filled = 0
  for (const it of items) {
    if (it.score != null) { total += it.score * itemWeights[it.key]; filled++ }
  }
  total = Math.round(total)
  return { items, total, filled, grade: gradeOf(total, lang.value) }
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
  { key: 'vitalCapacity', label: lang.value === 'en' ? itemLabels.vitalCapacityEn : t('physicalTest.vitalCapacity') },
  { key: 'sprint50', label: lang.value === 'en' ? itemLabels.sprint50En : '50m' },
  { key: 'sitReach', label: lang.value === 'en' ? itemLabels.sitReachEn : t('physicalTest.sitReach') },
  { key: 'longJump', label: lang.value === 'en' ? itemLabels.longJumpEn : t('physicalTest.longJump') },
  { key: 'strength', label: lang.value === 'en' ? standards[gender.value].strength.labelEn : standards[gender.value].strength.label },
  { key: 'endurance', label: lang.value === 'en' ? standards[gender.value].endurance.labelEn : standards[gender.value].endurance.label }
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
      { v: lang.value === 'en' ? `Below ${lo}` : `低于 ${lo}`, s: 80 },
      { v: lang.value === 'en' ? `${rule.obese} and above` : `${rule.obese} 及以上`, s: 60 }
    ]
    return { key: 'bmi', unit: 'kg/m²', dir: lang.value === 'en' ? 'within range' : '区间对应', cur: cur != null ? cur : null, score, rows }
  }
  const st = standards[g][activeTable.value]
  if (!st || !st.table) return null
  const cur = rawOf(years[activeYear.value], activeTable.value)
  const score = cur != null ? itemScore(g, activeTable.value, cur) : null
  const dir = st.higher ? (lang.value === 'en' ? 'at or above' : '达到或超过') : (lang.value === 'en' ? 'no more than' : '不超过')
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
    <button class="back-btn" @click="emit('back')">{{ t('common.back') }}</button>
    <div class="view-title">{{ t('physicalTest.titleFull') }}</div>
    <div class="view-sub">{{ t('physicalTest.subFull') }}</div>
  </div>

  <div class="panel">
    <div class="seg">
      <button class="seg-btn" :class="{ active: gender === 'male' }" @click="gender = 'male'">👨 {{ t('physicalTest.male') }}</button>
      <button class="seg-btn" :class="{ active: gender === 'female' }" @click="gender = 'female'">👩 {{ t('physicalTest.female') }}</button>
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
      <div class="result-hint">{{ t('physicalTest.filledHint', { n: filledNow }) }}</div>
    </div>

    <div class="field-grid">
      <label class="field">
        <span class="field-label">{{ t('physicalTest.heightLabel') }}</span>
        <input v-model.number="years[activeYear].height" class="input" type="number" :placeholder="t('physicalTest.placeholderHeight')" @focus="activeTable = 'bmi'" />
      </label>
      <label class="field">
        <span class="field-label">{{ t('physicalTest.weightLabel') }}</span>
        <input v-model.number="years[activeYear].weight" class="input" type="number" :placeholder="t('physicalTest.placeholderWeight')" @focus="activeTable = 'bmi'" />
      </label>
      <label class="field">
        <span class="field-label">{{ t('physicalTest.vitalLabel') }}</span>
        <input v-model.number="years[activeYear].vital" class="input" type="number" :placeholder="t('physicalTest.placeholderVital')" @focus="activeTable = 'vitalCapacity'" />
      </label>
      <label class="field">
        <span class="field-label">{{ t('physicalTest.sprintLabel') }}</span>
        <input v-model.number="years[activeYear].sprint" class="input" type="number" step="0.1" :placeholder="t('physicalTest.placeholderSprint')" @focus="activeTable = 'sprint50'" />
      </label>
      <label class="field">
        <span class="field-label">{{ t('physicalTest.sitReachLabel') }}</span>
        <input v-model.number="years[activeYear].sitReach" class="input" type="number" step="0.1" :placeholder="t('physicalTest.placeholderSitReach')" @focus="activeTable = 'sitReach'" />
      </label>
      <label class="field">
        <span class="field-label">{{ t('physicalTest.longJumpLabel') }}</span>
        <input v-model.number="years[activeYear].longJump" class="input" type="number" :placeholder="t('physicalTest.placeholderLongJump')" @focus="activeTable = 'longJump'" />
      </label>
      <label class="field">
        <span class="field-label">{{ lang.value === 'en' ? standards[gender].strength.labelEn : standards[gender].strength.label }}（{{ gender === 'male' ? t('physicalTest.unitReps') : t('physicalTest.unitRepsMin') }}）</span>
        <input v-model.number="years[activeYear].strength" class="input" type="number" :placeholder="t('physicalTest.placeholderStrength')" @focus="activeTable = 'strength'" />
      </label>
      <div class="field field-split">
        <span class="field-label">{{ standards[gender].endurance.label }}（{{ t('physicalTest.unitMinSec') }}）</span>
        <div class="split-row">
          <input v-model.number="years[activeYear].endurMin" class="input" type="number" :placeholder="t('physicalTest.placeholderMin')" @focus="activeTable = 'endurance'" />
          <span class="split-colon">:</span>
          <input v-model.number="years[activeYear].endurSec" class="input" type="number" :placeholder="t('physicalTest.placeholderSec')" @focus="activeTable = 'endurance'" />
        </div>
      </div>
    </div>

    <div class="score-list">
      <div v-for="it in active.items" :key="it.key" class="score-row">
        <span class="score-name">{{ it.label }}</span>
        <span class="score-raw" :class="{ dim: it.raw == null }">{{ it.raw != null ? it.raw + (it.unit ? ' ' + it.unit : '') : t('physicalTest.notFilled') }}</span>
        <span class="score-bar"><i :style="{ width: (it.score ?? 0) + '%' }"></i></span>
        <span class="score-val" :class="{ dim: it.score == null }">{{ it.score ?? '—' }}{{ t('physicalTest.scoreUnit') }}</span>
      </div>
    </div>
    <p class="muted">{{ t('physicalTest.autoSave') }}</p>
  </div>

  <div class="panel">
    <div class="section-head" style="align-items:center;">
      <h3 class="section-title">{{ t('physicalTest.tableTitle') }}</h3>
      <span class="section-sub">{{ t('physicalTest.tableSub') }}{{ standards[gender].genderText || (gender === 'male' ? t('physicalTest.tableSubMale') : t('physicalTest.tableSubFemale') ) }}）</span>
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
        {{ t('physicalTest.tableUnit') }}{{ activeTableData.unit }} · {{ t('physicalTest.tableRule') }}{{ activeTableData.dir }}
        <template v-if="activeTableData.cur !== '—'">
          {{ t('physicalTest.currentScore') }}{{ activeTableData.cur }}{{ activeTableData.unit }} → <b style="color:var(--primary)">{{ activeTableData.score }} {{ t('physicalTest.scoreUnit') }}</b>
        </template>
      </div>
      <table class="mini-table">
        <thead><tr><th>{{ t('physicalTest.tableHeader', { unit: activeTableData.unit }) }}</th><th>{{ t('physicalTest.tableHeaderScore') }}</th><th>{{ t('physicalTest.tableHeaderGrade') }}</th></tr></thead>
        <tbody>
          <tr v-for="row in activeTableData.rows" :key="row.v" :class="{ hit: activeTableData.score != null && row.s === activeTableData.score }">
            <td>{{ row.v }}</td>
            <td><b>{{ row.s }}</b></td>
            <td class="muted">{{ row.s >= 90 ? t('physicalTest.excellent') : row.s >= 80 ? t('physicalTest.good') : row.s >= 60 ? t('physicalTest.pass') : t('physicalTest.fail') }}</td>
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
.score-raw.dim { color: var(--dim-gray); }
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
.mini-table tr.hit td { background: var(--blue-bright); }
.mini-table tr.hit td:first-child { font-weight: 800; color: var(--primary); }
</style>