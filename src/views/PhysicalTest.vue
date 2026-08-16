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
        <input v-model.number="years[activeYear].height" class="input" type="number" placeholder="如 175" />
      </label>
      <label class="field">
        <span class="field-label">体重（kg）</span>
        <input v-model.number="years[activeYear].weight" class="input" type="number" placeholder="如 65" />
      </label>
      <label class="field">
        <span class="field-label">肺活量（ml）</span>
        <input v-model.number="years[activeYear].vital" class="input" type="number" placeholder="如 4200" />
      </label>
      <label class="field">
        <span class="field-label">50 米跑（秒）</span>
        <input v-model.number="years[activeYear].sprint" class="input" type="number" step="0.1" placeholder="如 7.5" />
      </label>
      <label class="field">
        <span class="field-label">坐位体前屈（cm）</span>
        <input v-model.number="years[activeYear].sitReach" class="input" type="number" step="0.1" placeholder="如 18" />
      </label>
      <label class="field">
        <span class="field-label">立定跳远（cm）</span>
        <input v-model.number="years[activeYear].longJump" class="input" type="number" placeholder="如 250" />
      </label>
      <label class="field">
        <span class="field-label">{{ standards[gender].strength.label }}（{{ gender === 'male' ? '个' : '个/分' }}）</span>
        <input v-model.number="years[activeYear].strength" class="input" type="number" placeholder="如 15" />
      </label>
      <div class="field field-split">
        <span class="field-label">{{ standards[gender].endurance.label }}（分:秒）</span>
        <div class="split-row">
          <input v-model.number="years[activeYear].endurMin" class="input" type="number" placeholder="分" />
          <span class="split-colon">:</span>
          <input v-model.number="years[activeYear].endurSec" class="input" type="number" placeholder="秒" />
        </div>
      </div>
    </div>

    <div class="score-list">
      <div v-for="it in active.items" :key="it.key" class="score-row">
        <span class="score-name">{{ it.label }}</span>
        <span class="score-bar"><i :style="{ width: (it.score ?? 0) + '%' }"></i></span>
        <span class="score-val" :class="{ dim: it.score == null }">{{ it.score ?? '未填' }}分</span>
      </div>
    </div>
    <p class="muted">成绩已自动保存在本机浏览器中，下次打开自动恢复。</p>
  </div>
</template>