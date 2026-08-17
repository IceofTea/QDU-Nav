<script setup>
/** 测出你像哪位校领导
 *  参考 leadertest.site 的多维原型比对：回答校园管理场景题 → 9 维画像 → 与
 *  青岛大学历任/现任校领导原型做加权距离匹配。结果仅供娱乐。 */
import { ref, computed } from 'vue'
import { DIMS, leaders, questions, shareLine } from '../data/leaders'

const emit = defineEmits(['back'])

const phase = ref('intro') // intro | quiz | result
const step = ref(0)
const answers = ref({})

const totalQ = questions.length
const current = computed(() => questions[step.value])
const progress = computed(() => Math.round((step.value / totalQ) * 100))

const selected = computed(() => answers.value[current.value?.id])
const LIKERT = ['很不符合', '较不符合', '一般', '较符合', '很符合']

function choose(optionIndex) {
  const q = current.value
  if (q.type === 'multi') {
    const arr = Array.isArray(answers.value[q.id]) ? [...answers.value[q.id]] : []
    const i = arr.indexOf(optionIndex)
    if (i >= 0) arr.splice(i, 1)
    else if (arr.length < (q.max || 2)) arr.push(optionIndex)
    answers.value = { ...answers.value, [q.id]: arr }
    if (arr.length >= (q.max || 2)) setTimeout(next, 180)
    return
  }
  answers.value = { ...answers.value, [q.id]: optionIndex }
  setTimeout(next, 180)
}
function chooseLikert(level) {
  const q = current.value
  answers.value = { ...answers.value, [q.id]: level }
  setTimeout(next, 180)
}
function next() {
  if (step.value < totalQ - 1) {
    step.value++
  } else {
    finish()
  }
}

function start() {
  step.value = 0
  answers.value = {}
  phase.value = 'quiz'
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

/** 用户向量归一化到 0-10（与原型 vec 同标尺，按用户自身轮廓拉伸），避免低分维原型常胜 */
function normalizedUser(raw) {
  const vals = DIMS.map((d) => raw[d.key])
  const mn = Math.min(...vals, 0)
  const mx = Math.max(...vals, 10)
  const span = mx - mn || 1
  const n = {}
  for (const d of DIMS) n[d.key] = Math.max(0, Math.min(10, ((raw[d.key] - mn) / span) * 10))
  return n
}

function finish() {
  const nu = normalizedUser(userScores())
  user.value = nu
  const list = [...leaders]
    .map((l) => ({ ...l, dist: DIMS.reduce((s, d) => s + l.weight[d.key] * Math.abs(nu[d.key] - l.vec[d.key]), 0) }))
    .sort((a, b) => a.dist - b.dist)
  const worst = list[list.length - 1].dist || 1
  ranked.value = list.map((r) => ({ ...r, match: Math.max(5, Math.round(100 - (r.dist / worst) * 100)) }))
  phase.value = 'result'
}

const best = computed(() => ranked.value[0] || null)
const second = computed(() => ranked.value[1] || null)
const third = computed(() => ranked.value[2] || null)

/** 为什么是这个人：距离最近的三维 + 用户风格倾向最高的两维 */
const whyText = computed(() => {
  if (!best.value || !user.value) return ''
  const nearest = [...DIMS]
    .map((d) => ({ k: d.key, label: d.label, diff: Math.abs(user.value[d.key] - best.value.vec[d.key]) }))
    .sort((a, b) => a.diff - b.diff)
    .slice(0, 3)
  const topDims = [...DIMS].sort((a, b) => (user.value[b.key] || 0) - (user.value[a.key] || 0)).slice(0, 2)
  return `最终你最接近 ${best.value.name}，主要因为你在 ${nearest.map((n) => n.label).join('、')} 这几项上与该原型距离最近。整体看，你更偏向 ${topDims.map((t) => t.label).join('、')} 这类风格。`
})

/** 结果条：用户得分归一（0-10 截断，与原型同量纲） */
const norm = (v) => Math.max(0, Math.min(10, Math.round(v || 0)))
const pct = (v) => Math.round((v / 10) * 100)
/** 维度对齐度：用户与原型该维越接近越满 */
const dimAlign = (d) =>
  Math.max(0, Math.min(100, Math.round(100 - Math.abs(user.value[d.key] - best.value.vec[d.key]) * 10)))

const shareText = computed(() => (best.value ? shareLine(best.value) : ''))
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

/** 头像：优先官方照片，缺失回退首字母彩色头像 */
function avatarStyle(l) {
  const hue = leaders.indexOf(l) * 46
  return { background: `linear-gradient(135deg, hsl(${hue} 55% 45%), hsl(${hue + 40} 55% 62%))` }
}
const initial = (name) => name.charAt(0)
</script>

<template>
  <div class="view-top">
    <button class="back-btn" @click="emit('back')">← 返回首页</button>
    <div class="view-title">测出你像哪位校领导</div>
    <div class="view-sub">按校园管理风格匹配 · 青岛大学历任与现任校领导原型</div>
  </div>

  <!-- 开始页 -->
  <div v-if="phase === 'intro'" class="panel" style="text-align:center;padding:32px 20px;">
    <div style="font-size:44px;">🎓</div>
    <div style="font-size:18px;font-weight:800;margin:10px 0 6px;">你是哪位校领导「转世」？</div>
    <p class="muted" style="font-size:13px;line-height:1.8;max-width:420px;margin:0 auto;">
      回答 {{ totalQ }} 道校园管理场景题，系统会从<b>决策魄力、规划理性、改革锐气、情怀感召、制度规范、育人理念、师生动员、执行强度、发展导向</b>九个维度刻画你的风格，并匹配你最像的青岛大学校领导。
    </p>
    <p class="muted" style="font-size:12px;margin-top:8px;">本测试结果仅供娱乐，不涉及任何现实人物的立场讨论。</p>
    <button class="btn accent big" style="margin-top:18px;width:100%;max-width:320px;" @click="start">开始测试</button>
  </div>

  <!-- 答题页 -->
  <div v-else-if="phase === 'quiz'" class="panel">
    <div class="quiz-progress"><i :style="{ width: progress + '%' }"></i></div>
    <div class="muted" style="font-size:12px;margin:8px 0 2px;">第 {{ step + 1 }} / {{ totalQ }} 题 · {{ current.kicker }}</div>
    <div style="font-size:17px;font-weight:800;margin:10px 0 4px;">{{ current.title }}</div>
    <div class="muted" style="font-size:12px;margin-bottom:14px;">{{ current.desc }}</div>

    <div v-if="current.type === 'likert'" class="likert">
      <button v-for="(l, i) in LIKERT" :key="l" class="likert-btn" :class="{ active: selected === i }" @click="chooseLikert(i)">{{ l }}</button>
    </div>
    <div v-else-if="current.type === 'multi'" class="opt-list">
      <button v-for="(o, i) in current.options" :key="i" class="opt-btn" :class="{ active: (selected || []).includes(i) }" @click="choose(i)">
        <span class="opt-tag">{{ (selected || []).indexOf(i) >= 0 ? (selected || []).indexOf(i) + 1 : String.fromCharCode(65 + i) }}</span>
        <span>{{ o.label }}</span>
      </button>
      <div class="muted" style="font-size:11px;margin-top:6px;">已选 {{ (selected || []).length }}/{{ current.max || 2 }} · 选满自动进入下一题</div>
    </div>
    <div v-else class="opt-list">
      <button v-for="(o, i) in current.options" :key="i" class="opt-btn" :class="{ active: selected === i }" @click="choose(i)">
        <span class="opt-tag">{{ String.fromCharCode(65 + i) }}</span>
        <span>{{ o.label }}</span>
      </button>
    </div>
  </div>

  <!-- 结果页 -->
  <div v-else-if="phase === 'result' && best" class="panel result-panel">
    <div class="result-hero">
      <div class="portrait" :style="avatarStyle(best)">
        <img v-if="best.photo" :src="best.photo" alt="" @error="best.photo = ''" />
        <span v-else class="portrait-initial">{{ initial(best.name) }}</span>
      </div>
      <div class="result-hero-txt">
        <div class="muted" style="font-size:11px;">唯一结果匹配 · 契合度 {{ best.match }}%</div>
        <div class="result-name">{{ best.name }}</div>
        <div class="muted" style="font-size:12px;">{{ best.period }} · {{ best.role }}</div>
        <div class="result-bio">{{ best.bio }}</div>
      </div>
    </div>

    <div class="result-sec">
      <div class="sec-title">契合分析</div>
      <p class="muted" style="font-size:13px;line-height:1.8;margin:0;">{{ whyText }}</p>
    </div>

    <div class="result-sec">
      <div class="sec-title">多维原型比对 <span class="sec-note">蓝=你的画像 · 橙={{ best.name }}原型</span></div>
      <div v-for="d in DIMS" :key="d.key" class="dim-block">
        <div class="dim-head">
          <span class="dim-name">{{ d.label }}</span>
          <span class="dim-nums">你 <b>{{ norm(user[d.key]) }}</b> / 原型 <b>{{ best.vec[d.key] }}</b></span>
        </div>
        <div class="dim-track">
          <i class="dim-you" :style="{ width: pct(norm(user[d.key])) + '%' }"></i>
          <i class="dim-proto" :style="{ width: pct(best.vec[d.key]) + '%' }"></i>
        </div>
      </div>
    </div>

    <div class="result-sec">
      <div class="sec-title">简要事迹</div>
      <p class="muted" style="font-size:13px;line-height:1.8;margin:0;">{{ best.summary }}</p>
    </div>

    <div class="result-sec">
      <div class="sec-title">最接近的另外两位</div>
      <div v-for="(o, i) in [second, third]" :key="o.name" class="near-row">
        <span class="near-rank">#{{ i + 2 }}</span>
        <img v-if="o.photo" class="near-img" :src="o.photo" alt="" @error="o.photo = ''" />
        <span v-else class="near-avatar" :style="avatarStyle(o)">{{ initial(o.name) }}</span>
        <div class="near-main">
          <div class="near-name">{{ o.name }}</div>
          <div class="muted" style="font-size:12px;">{{ o.bio }}</div>
        </div>
      </div>
    </div>

    <div class="share-box">
      <div style="font-weight:800;font-size:13px;margin-bottom:6px;">可分享文案</div>
      <p class="muted" style="font-size:13px;margin:0 0 10px;line-height:1.6;">{{ shareText }}</p>
      <button class="btn ghost small" @click="copyShare">{{ copied ? '已复制 ✓' : '复制文案' }}</button>
    </div>

    <div style="margin:18px 0 4px;font-size:13px;">这个结果准吗？</div>
    <div style="display:flex;gap:10px;justify-content:center;">
      <button class="tab" :class="{ active: feedback === 'ok' }" @click="feedback = 'ok'">👍 准</button>
      <button class="tab" :class="{ active: feedback === 'mid' }" @click="feedback = 'mid'">🤔 一般</button>
      <button class="tab" :class="{ active: feedback === 'no' }" @click="feedback = 'no'">👎 不准</button>
    </div>

    <p class="muted" style="font-size:11px;margin:16px 0 0;">本测试结果仅供娱乐，不参与任何立场和现实人物的讨论。</p>
    <button class="btn accent big" style="margin-top:14px;width:100%;" @click="start">再测一次</button>
  </div>
</template>

<style scoped>
.quiz-progress { height: 6px; border-radius: 4px; background: #eef3fb; overflow: hidden; }
.quiz-progress i { display: block; height: 100%; border-radius: 4px; background: linear-gradient(90deg, #1b66c9, #3b82f6); transition: width 0.2s; }
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
.dim-track { position: relative; height: 14px; border-radius: 7px; background: #eef3fb; overflow: hidden; }
.dim-you { position: absolute; left: 0; top: 0; height: 100%; border-radius: 7px 0 0 7px; background: linear-gradient(90deg, #1b66c9, #3b82f6); }
.dim-proto { position: absolute; left: 0; top: 0; height: 4px; margin-top: 5px; border-radius: 2px; background: #f59e0b; }
.near-row { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px dashed var(--border); }
.near-row:last-child { border-bottom: none; }
.near-rank { flex: 0 0 22px; font-weight: 800; color: var(--muted); font-size: 13px; }
.near-img { width: 38px; height: 38px; border-radius: 50%; object-fit: cover; flex: none; }
.near-avatar { width: 38px; height: 38px; border-radius: 50%; color: #fff; font-weight: 800; display: flex; align-items: center; justify-content: center; flex: none; }
.near-main { flex: 1; min-width: 0; }
.near-name { font-size: 13px; font-weight: 700; }
.share-box { margin-top: 16px; padding: 12px; border: 1px dashed var(--primary); border-radius: 12px; background: var(--primary-soft); }
</style>