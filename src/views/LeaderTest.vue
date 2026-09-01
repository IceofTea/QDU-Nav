<script setup>
/** 测出你像哪位校领导
 *  参考 leadertest.site 的多维原型比对：回答校园管理场景题 → 9 维画像 → 与
 *  青岛大学历任/现任校领导原型做加权距离匹配。结果仅供娱乐。 */
import { ref, computed } from 'vue'
import { DIMS, leaders, questions, shareLine, BIAS } from '../data/leaders'
import { useI18n } from '../i18n'

const { t, lang } = useI18n()

const emit = defineEmits(['back'])

const phase = ref('intro') // intro | quiz | result
const step = ref(0)
const answers = ref({})

const totalQ = questions.length
const current = computed(() => questions[step.value])
const progress = computed(() => Math.round((step.value / totalQ) * 100))

const selected = computed(() => answers.value[current.value?.id])
const LIKERT = computed(() => [t('leaderTest.likert1'), t('leaderTest.likert2'), t('leaderTest.likert3'), t('leaderTest.likert4'), t('leaderTest.likert5')])

function next() {
  if (step.value < totalQ - 1) step.value++
}
function choose(optionIndex) {
  const q = current.value
  if (q.type === 'multi') {
    const arr = Array.isArray(answers.value[q.id]) ? [...answers.value[q.id]] : []
    const i = arr.indexOf(optionIndex)
    if (i >= 0) arr.splice(i, 1)
    else if (arr.length < (q.max || 2)) arr.push(optionIndex)
    answers.value = { ...answers.value, [q.id]: arr }
    // 多选选满自动进下一题（最后一题不跳，等提交）
    if (arr.length >= (q.max || 2) && step.value < totalQ - 1) setTimeout(next, 160)
    return
  }
  answers.value = { ...answers.value, [q.id]: optionIndex }
  // 点选项即进下一题（最后一题不跳，等提交）
  if (step.value < totalQ - 1) setTimeout(next, 160)
}
function chooseLikert(level) {
  answers.value = { ...answers.value, [current.value.id]: level }
  if (step.value < totalQ - 1) setTimeout(next, 160)
}
function start() {
  step.value = 0
  answers.value = {}
  phase.value = 'quiz'
}

/** 当前题是否已答（用于「下一题 / 提交」按钮可用性） */
const answered = computed(() => {
  const q = current.value
  if (!q) return false
  const ans = answers.value[q.id]
  if (q.type === 'multi') return Array.isArray(ans) && ans.length > 0
  return ans !== undefined && ans !== null
})

/** 上一题 / 下一题 / 提交 */
function goPrev() {
  if (step.value > 0) step.value--
}
function goNext() {
  if (!answered.value) return
  if (step.value < totalQ - 1) step.value++
  else finish()
}

/** 用户 9 维得分（含每题权重、多选主/次权重） */
function userScores() {
  const u = { power: 0, logic: 0, conflict: 0, emotion: 0, order: 0, ideology: 0, mobilization: 0, force: 0, development: 0 }
  for (const q of questions) {
    const ans = answers.value[q.id]
    if (ans === undefined || ans === null) continue
    const w = q.weight || 1
    if (q.type === 'likert') {
      const s = q.scores[ans] || {}
      for (const [k, v] of Object.entries(s)) u[k] = (u[k] || 0) + v * w
    } else if (q.type === 'multi') {
      const arr = Array.isArray(ans) ? ans : []
      arr.forEach((optIdx, order) => {
        const opt = q.options[optIdx]
        if (!opt || !opt.score) return
        const mw = order === 0 ? (q.mainWeight ?? 1) : (q.secondWeight ?? 0.5)
        for (const [k, v] of Object.entries(opt.score)) u[k] = (u[k] || 0) + v * w * mw
      })
    } else {
      const opt = q.options[ans]
      if (opt && opt.score) for (const [k, v] of Object.entries(opt.score)) u[k] = (u[k] || 0) + v * w
    }
  }
  return u
}

const user = ref(null)
const ranked = ref([])

/** 用户向量中心化缩放（-1..1，0=居中），与原型 vec 中心化（vec/5-1）同标尺匹配 */
function normalizedUser(raw) {
  const maxAbs = Math.max(...DIMS.map((d) => Math.abs(raw[d.key])), 1)
  const n = {}
  for (const d of DIMS) n[d.key] = raw[d.key] / maxAbs
  return n
}

function finish() {
  const nu = normalizedUser(userScores())
  user.value = nu
  const list = [...leaders]
    .map((l, i) => ({
      ...l,
      dist: DIMS.reduce((s, d) => s + l.weight[d.key] * Math.abs(nu[d.key] - (l.vec[d.key] / 5 - 1)), 0) - (BIAS[i] || 0)
    }))
    .sort((a, b) => a.dist - b.dist)
  const worst = list[list.length - 1].dist || 1
  ranked.value = list.map((r) => ({ ...r, match: Math.max(5, Math.round(100 - (r.dist / worst) * 100)) }))
  phase.value = 'result'
}

const best = computed(() => ranked.value[0] || null)
const second = computed(() => ranked.value[1] || null)
const third = computed(() => ranked.value[2] || null)

/** 为什么是这个人：距离最近的三维 + 用户风格倾向最高的两维
 *  用户向量归一（-1..1）后映射回 0-10（norm），与原型 vec（0-10）同标尺比较 */
const whyText = computed(() => {
  if (!best.value || !user.value) return ''
  const nearest = [...DIMS]
    .map((d) => ({ k: d.key, label: lang.value === 'en' ? d.labelEn : d.label, diff: Math.abs(norm(user.value[d.key]) - best.value.vec[d.key]) }))
    .sort((a, b) => a.diff - b.diff)
    .slice(0, 3)
  const topDims = [...DIMS].sort((a, b) => (user.value[b.key] || 0) - (user.value[a.key] || 0)).slice(0, 2)
  return t('leaderTest.whyText')
    .replace('{name}', best.value.name)
    .replace('{dims}', nearest.map((n) => n.label).join(lang.value === 'en' ? ', ' : '、'))
    .replace('{style}', topDims.map((td) => lang.value === 'en' ? td.labelEn : td.label).join(lang.value === 'en' ? ', ' : '、'))
})

/** 结果条：用户向量中心化（-1..1）映射回 0-10，与原型 vec 同量纲 */
const norm = (v) => Math.max(0, Math.min(10, Math.round((v + 1) * 5)))
const pct = (v) => Math.round((v / 10) * 100)

const shareText = computed(() => (best.value ? shareLine(best.value, lang.value) : ''))
const copied = ref(false)
async function copyShare() {
  try {
    await navigator.clipboard.writeText(shareText.value)
    copied.value = true
    setTimeout(() => (copied.value = false), 1600)
  } catch {
    /* noop */
  }
}

const feedback = ref(null)

/** 照片路径拼 BASE_URL：兼容 GH Pages 子路径部署（photo 在 data 中存相对路径） */
const photoUrl = (p) => (p ? import.meta.env.BASE_URL + p : '')
/** 头像回退：照片缺失时按名字生成首字母彩色头像 */
function avatarStyle(l) {
  const hue = leaders.indexOf(l) * 46
  return { background: `linear-gradient(135deg, hsl(${hue} 55% 45%), hsl(${hue + 40} 55% 62%))` }
}
const initial = (name) => name.charAt(0)
</script>

<template>
  <div class="view-top">
    <button class="back-btn" @click="emit('back')">{{ t('common.back') }}</button>
    <div class="view-title">{{ t('leaderTest.titleFull') }}</div>
    <div class="view-sub">{{ t('leaderTest.subFull') }}</div>
  </div>

  <!-- 开始页 -->
  <div v-if="phase === 'intro'" class="panel" style="text-align:center;padding:32px 20px;">
    <div style="font-size:44px;">🎓</div>
    <div style="font-size:18px;font-weight:800;margin:10px 0 6px;">{{ t('leaderTest.introTitle') }}</div>
    <p class="muted" style="font-size:13px;line-height:1.8;max-width:420px;margin:0 auto;">
      {{ t('leaderTest.introDesc', { total: totalQ }) }}
    </p>
    <p class="muted" style="font-size:12px;margin-top:8px;">{{ t('leaderTest.introNote') }}</p>
    <button class="btn accent big" style="margin-top:18px;width:100%;max-width:320px;" @click="start">{{ t('leaderTest.start') }}</button>
  </div>

  <!-- 答题页 -->
  <div v-else-if="phase === 'quiz'" class="panel">
    <div class="quiz-progress"><i :style="{ width: progress + '%' }"></i></div>
    <div class="muted" style="font-size:12px;margin:8px 0 2px;">{{ t('leaderTest.questionOf', { cur: step + 1, total: totalQ }) }} · {{ lang === 'en' ? current.kickerEn : current.kicker }}</div>
    <div style="font-size:17px;font-weight:800;margin:10px 0 4px;">{{ lang === 'en' ? current.titleEn : current.title }}</div>
    <div class="muted" style="font-size:12px;margin-bottom:14px;">{{ lang === 'en' ? current.descEn : current.desc }}</div>

      <div v-if="current.type === 'likert'" class="likert">
      <button v-for="(l, i) in LIKERT" :key="l" class="likert-btn" :class="{ active: selected === i }" @click="chooseLikert(i)">{{ l }}</button>
    </div>
    <div v-else-if="current.type === 'multi'" class="opt-list">
      <button v-for="(o, i) in current.options" :key="i" class="opt-btn" :class="{ active: (selected || []).includes(i) }" @click="choose(i)">
        <span class="opt-tag">{{ (selected || []).indexOf(i) >= 0 ? (selected || []).indexOf(i) + 1 : String.fromCharCode(65 + i) }}</span>
        <span>{{ lang === 'en' ? o.labelEn : o.label }}</span>
      </button>
      <div class="muted" style="font-size:11px;margin-top:6px;">{{ t('leaderTest.selectedMulti').replace('{n}', (selected || []).length).replace('{m}', current.max || 2) }}</div>
    </div>
    <div v-else class="opt-list">
      <button v-for="(o, i) in current.options" :key="i" class="opt-btn" :class="{ active: selected === i }" @click="choose(i)">
        <span class="opt-tag">{{ String.fromCharCode(65 + i) }}</span>
        <span>{{ lang === 'en' ? o.labelEn : o.label }}</span>
      </button>
    </div>

    <div class="quiz-nav">
      <button class="btn ghost" :disabled="step === 0" @click="goPrev">{{ t('leaderTest.prevQuestion') }}</button>
      <button class="btn accent" :disabled="!answered" @click="goNext">{{ step === totalQ - 1 ? t('leaderTest.submitResult') : t('leaderTest.nextQuestion') }}</button>
    </div>
  </div>

  <!-- 结果页 -->
  <div v-else-if="phase === 'result' && best" class="panel result-panel">
    <div class="result-hero">
      <div class="portrait" :style="avatarStyle(best)">
        <img v-if="best.photo" :src="photoUrl(best.photo)" alt="" @error="best.photo = ''" />
        <span v-else class="portrait-initial">{{ initial(best.name) }}</span>
      </div>
      <div class="result-hero-txt">
        <div class="muted" style="font-size:11px;">{{ t('leaderTest.resultMatch') }} {{ best.match }}{{ t('leaderTest.percent') }}</div>
        <div class="result-name">{{ best.name }}</div>
        <div class="muted" style="font-size:12px;">{{ lang === 'en' ? best.periodEn : best.period }} · {{ lang === 'en' ? best.roleEn : best.role }}</div>
        <div class="result-bio">{{ lang === 'en' ? best.bioEn : best.bio }}</div>
      </div>
    </div>

    <div class="result-sec">
      <div class="sec-title">{{ t('leaderTest.matchAnalysis') }}</div>
      <p class="muted" style="font-size:13px;line-height:1.8;margin:0;">{{ whyText }}</p>
    </div>

    <div class="result-sec">
      <div class="sec-title">{{ t('leaderTest.multiDim') }} <span class="sec-note">{{ t('leaderTest.dimNote') }}{{ best.name }}{{ t('leaderTest.dimNoteEnd') }}</span></div>
      <div v-for="d in DIMS" :key="d.key" class="dim-block">
        <div class="dim-head">
          <span class="dim-name">{{ lang === 'en' ? d.labelEn : d.label }}</span>
          <span class="dim-nums">{{ t('leaderTest.dimYou') }} <b>{{ norm(user[d.key]) }}</b> / {{ t('leaderTest.dimProto') }} <b>{{ best.vec[d.key] }}</b></span>
        </div>
        <div class="dim-track">
          <i class="dim-you" :style="{ width: pct(norm(user[d.key])) + '%' }"></i>
          <i class="dim-proto" :style="{ width: pct(best.vec[d.key]) + '%' }"></i>
        </div>
      </div>
    </div>

    <div class="result-sec">
      <div class="sec-title">{{ t('leaderTest.briefBio') }}</div>
      <p class="muted" style="font-size:13px;line-height:1.8;margin:0;">{{ lang === 'en' ? best.summaryEn : best.summary }}</p>
    </div>

    <div class="result-sec">
      <div class="sec-title">{{ t('leaderTest.nearbyTwo') }}</div>
      <div v-for="(o, i) in [second, third]" :key="o.name" class="near-row">
        <span class="near-rank">#{{ i + 2 }}</span>
        <img v-if="o.photo" class="near-img" :src="photoUrl(o.photo)" alt="" @error="o.photo = ''" />
        <span v-else class="near-avatar" :style="avatarStyle(o)">{{ initial(o.name) }}</span>
        <div class="near-main">
          <div class="near-name">{{ o.name }}</div>
          <div class="muted" style="font-size:12px;">{{ lang === 'en' ? o.bioEn : o.bio }}</div>
        </div>
      </div>
    </div>

    <div class="share-box">
      <div style="font-weight:800;font-size:13px;margin-bottom:6px;">{{ t('leaderTest.shareText') }}</div>
      <p class="muted" style="font-size:13px;margin:0 0 10px;line-height:1.6;">{{ shareText }}</p>
      <button class="btn ghost small" @click="copyShare">{{ copied ? t('leaderTest.copiedText') : t('leaderTest.copyText') }}</button>
    </div>

    <div style="margin:18px 0 4px;font-size:13px;">{{ t('leaderTest.feedbackTitle') }}</div>
    <div style="display:flex;gap:10px;justify-content:center;">
      <button class="tab" :class="{ active: feedback === 'ok' }" @click="feedback = 'ok'">{{ t('leaderTest.feedbackOk') }}</button>
      <button class="tab" :class="{ active: feedback === 'mid' }" @click="feedback = 'mid'">{{ t('leaderTest.feedbackMid') }}</button>
      <button class="tab" :class="{ active: feedback === 'no' }" @click="feedback = 'no'">{{ t('leaderTest.feedbackNo') }}</button>
    </div>

    <p class="muted" style="font-size:11px;margin:16px 0 0;">{{ t('leaderTest.testNote') }}</p>
    <button class="btn accent big" style="margin-top:14px;width:100%;" @click="start">{{ t('leaderTest.retake') }}</button>
  </div>
</template>

<style scoped>
.quiz-progress { height: 6px; border-radius: 4px; background: var(--bar); overflow: hidden; }
.quiz-progress i { display: block; height: 100%; border-radius: 4px; background: linear-gradient(90deg, #1b66c9, #3b82f6); transition: width 0.2s; }
.quiz-nav { display: flex; gap: 10px; margin-top: 16px; }
.quiz-nav .btn { flex: 1; }
.opt-list { display: flex; flex-direction: column; gap: 8px; }
.opt-btn {
  display: flex; align-items: center; gap: 10px; text-align: left;
  border: 1px solid var(--border); background: var(--card); border-radius: 12px;
  padding: 12px 14px; font-family: inherit; font-size: 14px; cursor: pointer; color: var(--text);
}
.opt-btn.active { border-color: var(--primary); background: var(--primary-soft); box-shadow: 0 0 0 1px var(--primary); }
.opt-tag { flex: 0 0 26px; height: 26px; border-radius: 8px; background: var(--primary-soft); color: var(--primary); font-weight: 800; font-size: 13px; display: flex; align-items: center; justify-content: center; }
.likert { display: flex; flex-direction: column; gap: 8px; }
.likert-btn { border: 1px solid var(--border); background: var(--card); border-radius: 12px; padding: 12px; font-family: inherit; font-size: 14px; cursor: pointer; color: var(--text); }
.likert-btn.active { border-color: var(--primary); background: var(--primary-soft); }
.result-panel { padding: 18px 16px; }
.result-hero { display: flex; align-items: center; gap: 14px; }
.portrait {
  width: 86px; height: 86px; border-radius: 50%; flex: 0 0 auto;
  display: flex; align-items: center; justify-content: center; overflow: hidden;
  border: 3px solid #fff; box-shadow: 0 8px 20px rgba(0, 0, 0, 0.18);
}
.portrait img { width: 100%; height: 100%; object-fit: cover; }
.portrait-initial { font-size: 34px; font-weight: 800; color: #fff; }
.result-hero-txt { flex: 1; min-width: 0; }
.result-name { font-size: 22px; font-weight: 800; line-height: 1.2; }
.result-bio { font-size: 14px; font-weight: 700; color: var(--primary-dark); margin-top: 2px; }
.result-sec { margin-top: 16px; padding-top: 14px; border-top: 1px dashed var(--border); }
.sec-title { font-size: 14px; font-weight: 800; margin-bottom: 10px; }
.sec-note { font-size: 11px; font-weight: 500; color: var(--text-sub); margin-left: 6px; }
.dim-block { margin-bottom: 9px; }
.dim-head { display: flex; justify-content: space-between; align-items: baseline; font-size: 12px; margin-bottom: 3px; }
.dim-name { color: var(--text); }
.dim-nums { color: var(--text-sub); }
.dim-nums b { color: var(--primary); }
.dim-track { position: relative; height: 14px; border-radius: 7px; background: var(--bar); overflow: hidden; }
.dim-you { position: absolute; left: 0; top: 0; height: 100%; border-radius: 7px 0 0 7px; background: linear-gradient(90deg, #1b66c9, #3b82f6); }
.dim-proto { position: absolute; left: 0; top: 0; height: 4px; margin-top: 5px; border-radius: 2px; background: #f59e0b; }
.near-row { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px dashed var(--border); }
.near-row:last-child { border-bottom: none; }
.near-rank { flex: 0 0 22px; font-weight: 800; color: var(--text-sub); font-size: 13px; }
.near-img { width: 38px; height: 38px; border-radius: 50%; object-fit: cover; flex: none; }
.near-avatar { width: 38px; height: 38px; border-radius: 50%; color: #fff; font-weight: 800; display: flex; align-items: center; justify-content: center; flex: none; }
.near-main { flex: 1; min-width: 0; }
.near-name { font-size: 13px; font-weight: 700; }
.share-box { margin-top: 16px; padding: 12px; border: 1px dashed var(--primary); border-radius: 12px; background: var(--primary-soft); }
</style>