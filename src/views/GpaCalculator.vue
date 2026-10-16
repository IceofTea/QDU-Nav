<!-- @模块：src/views/GpaCalculator.vue —— 青岛大学 · 绩点/加权平均计算器 -->
<script setup>
/** 绩点计算器（面向青岛大学学生）
 *  · 手动录课（百分制 / 五级制 / 通过不通过），实时算「加权平均分」与「4.0 制 GPA」
 *  · 目标反推：给定目标与剩余学分，算剩余课程需要多少
 *  · 换算分段表**仅为通用示意**，页面明确提示以学校学籍管理规定为准
 *  · 数据只存本机浏览器（qdu_gpa_courses），可导出 JSON 备份
 */
import { ref, computed, watch } from 'vue'
import { useI18n } from '../i18n/index.js'
import { setNavContext } from '../stores/navContext.js'
import { getJson, setJson } from '../utils/safeStorage.js'
import {
  DEFAULT_GPA_BANDS, LEVEL5_TO_PERCENT, SCORE_TYPES,
  summarize, solveRemaining, exportCourses, importCourses, normalizeCourse
} from '../utils/gpa.js'

const { t, lang } = useI18n()
const emit = defineEmits(['back', 'open'])
setNavContext(t('gpa.title'), t('gpa.sub'))

const STORAGE = 'qdu_gpa_courses'
const courses = ref((getJson(STORAGE, []) || []).map((c) => normalizeCourse(c)).filter(Boolean))
watch(courses, () => setJson(STORAGE, courses.value), { deep: true })

/* ---- 录入表单 ---- */
const name = ref('')
const credit = ref('')
const score = ref('')
const scoreType = ref('percent')
const level = ref('good')
const pass = ref('pass')
const editing = ref(null)
const LEVELS = ['excellent', 'good', 'medium', 'pass', 'fail']

function resetForm() {
  editing.value = null
  name.value = ''
  credit.value = ''
  score.value = ''
  scoreType.value = 'percent'
  level.value = 'good'
  pass.value = 'pass'
}
function editStart(row) {
  editing.value = row.id
  name.value = row.name
  credit.value = String(row.credit)
  scoreType.value = row.scoreType
  if (row.scoreType === 'percent') score.value = String(row.score)
  if (row.scoreType === 'level5') level.value = row.level
  if (row.scoreType === 'pass') pass.value = row.pass
  window.scrollTo({ top: 0, behavior: 'smooth' })
}
function save() {
  const raw = {
    id: editing.value || undefined,
    name: name.value,
    credit: credit.value,
    scoreType: scoreType.value,
    score: score.value,
    level: level.value,
    pass: pass.value
  }
  const ok = normalizeCourse(raw)
  if (!ok) { msg.value = t('gpa.invalid'); return }
  if (editing.value) {
    courses.value = courses.value.map((c) => (c.id === editing.value ? { ...ok, id: editing.value } : c))
  } else {
    courses.value = [...courses.value, ok]
  }
  msg.value = ''
  resetForm()
}
function remove(id) {
  courses.value = courses.value.filter((c) => c.id !== id)
  if (editing.value === id) resetForm()
}
function clearAll() {
  if (window.confirm(t('gpa.clearConfirm'))) courses.value = []
}

/* ---- 核算 ---- */
const stat = computed(() => summarize(courses.value, DEFAULT_GPA_BANDS, LEVEL5_TO_PERCENT))

const fmt = (n) => (n === null || n === undefined ? '—' : n % 1 === 0 ? String(n) : Number(n).toFixed(2))

/* ---- 目标规划 ---- */
const planTargetVal = ref('')
const planRemain = ref('')
const planKind = ref('gpa')
const plan = computed(() => solveRemaining({
  avg: planKind.value === 'gpa' ? stat.value.gpa : stat.value.avg,
  doneCredit: stat.value.countedCredit,
  remainCredit: planRemain.value,
  target: planTargetVal.value,
  kind: planKind.value
}))
const planText = computed(() => {
  const p = plan.value
  if (p.reason === 'insufficient') return t('gpa.planInsuff')
  if (p.reason === 'already') return t('gpa.planAlready')
  if (p.reason === 'beyond') return t('gpa.planBeyond', { need: p.need, cap: p.ceiling })
  return t('gpa.planOk', { need: p.need })
})

/* ---- 导出 / 导入 ---- */
const msg = ref('')
const backupMsg = ref('')
function doExport() {
  if (!courses.value.length) { backupMsg.value = t('gpa.exportEmpty'); return }
  const text = exportCourses(courses.value, DEFAULT_GPA_BANDS, { app: 'QDU-Nav', version: '1.7.7' })
  const blob = new Blob([text], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `青大绩点-${new Date().toISOString().slice(0, 10)}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
  backupMsg.value = t('gpa.exportDone', { n: courses.value.length })
}
async function doImport(file, mode = 'append') {
  backupMsg.value = ''
  if (!file) return
  let text = ''
  try { text = await file.text() } catch { backupMsg.value = t('gpa.importReadFail'); return }
  const res = importCourses(text)
  if (!res.ok) {
    backupMsg.value = res.error === 'not-json' ? t('gpa.importNotJson')
      : res.error === 'no-courses' ? t('gpa.importNoCourses') : t('gpa.importAllInvalid')
    return
  }
  if (mode === 'replace') {
    if (!window.confirm(t('gpa.importConfirmReplace', { n: res.courses.length }))) return
    courses.value = res.courses
    backupMsg.value = t('gpa.importReplaced', { n: res.courses.length })
    return
  }
  const seen = new Set(courses.value.map((c) => `${c.name}|${c.credit}|${c.scoreType}|${c.score || ''}${c.level || ''}${c.pass || ''}`))
  let added = 0
  let dup = 0
  const merged = [...courses.value]
  for (const c of res.courses) {
    const k = `${c.name}|${c.credit}|${c.scoreType}|${c.score || ''}${c.level || ''}${c.pass || ''}`
    if (seen.has(k)) { dup++; continue }
    seen.add(k)
    merged.push(c)
    added++
  }
  courses.value = merged
  backupMsg.value = t('gpa.importAppended', { added, dup })
}

const levelLabel = (k) => t('gpa.level_' + k)
const typeLabel = (k) => t('gpa.type_' + k)
</script>

<template>
  <div class="view-top">
    <button class="back-btn" @click="emit('back')">← {{ t('common.back').slice(2) }}</button>
    <div class="view-title">{{ t('gpa.title') }}</div>
    <div class="view-sub">{{ t('gpa.sub') }}</div>
  </div>

  <div class="panel">
    <div class="gpa-kpi">
      <div class="kpi"><span>{{ t('gpa.kpiCredit') }}</span><b>{{ stat.totalCredit }}</b></div>
      <div class="kpi"><span>{{ t('gpa.kpiCounted') }}</span><b>{{ stat.countedCredit }}</b></div>
      <div class="kpi"><span>{{ t('gpa.kpiAvg') }}</span><b class="in">{{ fmt(stat.avg) }}</b></div>
      <div class="kpi"><span>{{ t('gpa.kpiGpa') }}</span><b class="in">{{ fmt(stat.gpa) }}</b></div>
    </div>
    <p class="muted" style="font-size:11.5px;margin-top:8px;">
      {{ t('gpa.kpiNote', { n: courses.value.length, fail: stat.failedCount }) }}
    </p>
  </div>

  <div class="panel">
    <div class="section-title" style="margin:0 0 10px;"><span class="bar"></span>{{ editing ? t('gpa.editTitle') : t('gpa.addTitle') }}</div>
    <input v-model="name" class="input" :placeholder="t('gpa.namePh')" @keyup.enter="save" />
    <div class="gpa-row">
      <input v-model="credit" class="input" type="number" min="0.5" max="30" step="0.5" :placeholder="t('gpa.creditPh')" />
      <select v-model="scoreType" class="input gpa-sel">
        <option v-for="s in SCORE_TYPES" :key="s" :value="s">{{ typeLabel(s) }}</option>
      </select>
      <input v-if="scoreType === 'percent'" v-model="score" class="input" type="number" min="0" max="100" step="0.5" :placeholder="t('gpa.scorePh')" @keyup.enter="save" />
      <select v-else-if="scoreType === 'level5'" v-model="level" class="input gpa-sel">
        <option v-for="l in LEVELS" :key="l" :value="l">{{ levelLabel(l) }}</option>
      </select>
      <select v-else v-model="pass" class="input gpa-sel">
        <option value="pass">{{ t('gpa.passOk') }}</option>
        <option value="fail">{{ t('gpa.passFail') }}</option>
      </select>
    </div>
    <div class="gpa-btns">
      <button class="btn accent" @click="save">{{ editing ? t('gpa.saveEdit') : t('gpa.addBtn') }}</button>
      <button v-if="editing" class="btn ghost" @click="resetForm">{{ t('gpa.cancel') }}</button>
    </div>
    <div v-if="msg" class="gpa-msg">{{ msg }}</div>
  </div>

  <div class="panel">
    <div class="section-head" style="align-items:center;margin:0 0 10px;">
      <h3 class="section-title" style="margin:0;"><span class="bar"></span>{{ t('gpa.listTitle', { n: courses.value.length }) }}</h3>
      <button v-if="courses.value.length" class="btn ghost small" @click="clearAll">{{ t('gpa.clearAll') }}</button>
    </div>
    <div v-if="!courses.value.length" class="muted" style="text-align:center;padding:14px;">{{ t('gpa.empty') }}</div>
    <div v-else class="gpa-list">
      <div v-for="r in stat.rows" :key="r.id" class="gpa-item">
        <span class="gpa-name">{{ r.name }}</span>
        <span class="gpa-meta">
          {{ r.credit }} {{ t('gpa.unit') }} ·
          <template v-if="r.scoreType === 'percent'">{{ r.score }}</template>
          <template v-else-if="r.scoreType === 'level5'">{{ levelLabel(r.level) }}（≈{{ r.percent }}）</template>
          <template v-else>{{ r.pass === 'pass' ? t('gpa.passOk') : t('gpa.passFail') }}</template>
          <em v-if="!r.counted"> · {{ t('gpa.notCounted') }}</em>
        </span>
        <span class="gpa-point">{{ r.gpa === null ? '—' : r.gpa.toFixed(1) }}</span>
        <button class="rec-del" @click="editStart(r)" :title="t('gpa.edit')">✎</button>
        <button class="rec-del" @click="remove(r.id)" :title="t('gpa.del')">✕</button>
      </div>
    </div>
  </div>

  <div class="panel">
    <div class="section-title" style="margin:0 0 10px;"><span class="bar"></span>{{ t('gpa.planTitle') }}</div>
    <div class="gpa-row">
      <select v-model="planKind" class="input gpa-sel">
        <option value="gpa">{{ t('gpa.planKindGpa') }}</option>
        <option value="avg">{{ t('gpa.planKindAvg') }}</option>
      </select>
      <input v-model="planTargetVal" class="input" type="number" step="0.1" :placeholder="t('gpa.planTargetPh')" />
      <input v-model="planRemain" class="input" type="number" step="0.5" :placeholder="t('gpa.planRemainPh')" />
    </div>
    <div class="gpa-plan">{{ planText }}</div>
    <p class="muted" style="font-size:11.5px;margin-top:6px;">{{ t('gpa.planNote', { n: stat.countedCredit, v: fmt(planKind === 'gpa' ? stat.gpa : stat.avg) }) }}</p>
  </div>

  <div class="panel">
    <div class="section-title" style="margin:0 0 10px;"><span class="bar"></span>{{ t('gpa.bandsTitle') }}</div>
    <div class="gpa-bands">
      <span v-for="b in DEFAULT_GPA_BANDS" :key="b.label" class="gpa-band">{{ b.label }} → {{ b.gpa.toFixed(1) }}</span>
    </div>
    <p class="muted" style="font-size:11.5px;margin-top:8px;">{{ t('gpa.bandsNote') }}</p>
  </div>

  <div class="panel">
    <div class="section-title" style="margin:0 0 10px;"><span class="bar"></span>{{ t('gpa.dataTitle') }}</div>
    <div class="gpa-btns">
      <button class="btn ghost" @click="doExport">⬇️ {{ t('gpa.exportBtn') }}</button>
      <label class="btn ghost gpa-label" for="gpa-file-append">⬆️ {{ t('gpa.importAppend') }}</label>
      <input id="gpa-file-append" type="file" accept=".json,application/json" style="display:none;" @change="doImport($event.target.files[0], 'append'); $event.target.value = ''" />
      <label class="btn ghost gpa-label" for="gpa-file-replace">♻️ {{ t('gpa.importReplace') }}</label>
      <input id="gpa-file-replace" type="file" accept=".json,application/json" style="display:none;" @change="doImport($event.target.files[0], 'replace'); $event.target.value = ''" />
    </div>
    <div v-if="backupMsg" class="gpa-msg">{{ backupMsg }}</div>
    <p class="muted" style="font-size:11.5px;margin-top:8px;">{{ t('gpa.privacyNote') }}</p>
  </div>
</template>

<style scoped>
.gpa-kpi { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.gpa-kpi .kpi { display: flex; flex-direction: column; gap: 4px; padding: 12px; border-radius: 12px; background: var(--primary-soft); }
.gpa-kpi .kpi span { font-size: 11px; color: var(--text-sub); }
.gpa-kpi .kpi b { font-size: 17px; }
.gpa-kpi .kpi b.in { color: #0f766e; }
.gpa-row { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 10px; }
.gpa-row .input { flex: 1 1 120px; min-width: 0; }
.gpa-sel { flex: 0 1 150px; }
.gpa-btns { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 12px; }
.gpa-label { display: inline-flex; align-items: center; cursor: pointer; }
.gpa-msg { margin-top: 10px; font-size: 12px; padding: 10px; background: var(--soft-green); border: 1px solid var(--soft-green-border); border-radius: 10px; color: var(--soft-green-text); }
.gpa-list { display: flex; flex-direction: column; }
.gpa-item { display: flex; align-items: center; gap: 10px; padding: 9px 0; border-bottom: 1px solid var(--border); font-size: 13px; }
.gpa-item:last-child { border-bottom: none; }
.gpa-name { font-weight: 600; flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.gpa-meta { font-size: 11.5px; color: var(--text-sub); flex: 0 1 auto; }
.gpa-meta em { font-style: normal; color: var(--primary); }
.gpa-point { font-weight: 800; color: #0f766e; min-width: 34px; text-align: right; }
.rec-del { border: none; background: none; color: var(--text-light); font-size: 14px; cursor: pointer; padding: 4px; }
.rec-del:hover { color: var(--primary); }
.gpa-plan { margin-top: 12px; padding: 12px; border-radius: 12px; background: var(--soft-green); border: 1px solid var(--soft-green-border); color: var(--soft-green-text); font-size: 13px; line-height: 1.7; }
.gpa-bands { display: flex; flex-wrap: wrap; gap: 6px; }
.gpa-band { font-size: 11.5px; padding: 3px 10px; border-radius: 999px; border: 1px solid var(--border); background: var(--card); color: var(--text-sub); }
</style>
