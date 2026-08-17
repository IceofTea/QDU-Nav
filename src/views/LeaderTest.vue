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
  const val = optionIndex
  answers.value = { ...answers.value, [q.id]: val }
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

/** 用户 9 维得分 */
function userScores() {
  const u = { power: 0, logic: 0, conflict: 0, emotion: 0, order: 0, ideology: 0, mobilization: 0, force: 0, development: 0 }
  for (const q of questions) {
    const ans = answers.value[q.id]
    if (ans === undefined || ans === null) continue
    if (q.type === 'likert') {
      const s = q.scores[ans] || {}
      for (const [k, v] of Object.entries(s)) u[k] = (u[k] || 0) + v
    } else {
      const opt = q.options[ans]
      if (opt && opt.score) for (const [k, v] of Object.entries(opt.score)) u[k] = (u[k] || 0) + v
    }
  }
  return u
}

const user = ref(null)
const ranked = ref([])

function finish() {
  const u = userScores()
  user.value = u
  ranked.value = [...leaders]
    .map((l) => ({ ...l, dist: DIMS.reduce((s, d) => s + l.weight[d.key] * Math.abs(u[d.key] - l.vec[d.key]), 0) }))
    .sort((a, b) => a.dist - b.dist)
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
    <div v-else class="opt-list">
      <button v-for="(o, i) in current.options" :key="i" class="opt-btn" :class="{ active: selected === i }" @click="choose(i)">
        <span class="opt-tag">{{ String.fromCharCode(65 + i) }}</span>
        <span>{{ o.label }}</span>
      </button>
    </div>
  </div>

  <!-- 结果页 -->
  <div v-else-if="phase === 'result' && best" class="panel" style="text-align:center;padding:24px 18px;">
    <div class="muted" style="font-size:12px;">唯一结果匹配</div>

    <div class="portrait" :style="avatarStyle(best)">
      <img v-if="best.photo" :src="best.photo" alt="" @error="best.photo = ''" />
      <span v-else class="portrait-initial">{{ initial(best.name) }}</span>
    </div>
    <div style="font-size:24px;font-weight:800;margin-top:10px;">{{ best.name }}</div>
    <div class="muted" style="font-size:12px;">{{ best.period }} · {{ best.role }}</div>
    <div style="font-size:15px;font-weight:700;margin:8px 0 0;color:var(--primary-dark);">{{ best.bio }}</div>

    <div class="muted" style="font-size:12px;margin:18px 0 8px;">多维原型比对</div>
    <div v-for="d in DIMS" :key="d.key" style="margin-bottom:10px;">
      <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:2px;">
        <span>{{ d.label }}</span><span class="muted">你 {{ norm(user[d.key]) }} / 原型 {{ best.vec[d.key] }}</span>
      </div>
      <div style="display:flex;gap:3px;">
        <div style="flex:1;height:10px;border-radius:5px;background:#eef3fb;overflow:hidden;">
          <div style="height:100%;border-radius:5px;background:linear-gradient(90deg,#1b66c9,#3b82f6);" :style="{ width: pct(norm(user[d.key])) + '%' }"></div>
        </div>
        <div style="flex:1;height:10px;border-radius:5px;background:#eef3fb;overflow:hidden;">
          <div style="height:100%;border-radius:5px;background:linear-gradient(90deg,#d97706,#f59e0b);" :style="{ width: pct(best.vec[d.key]) + '%' }"></div>
        </div>
      </div>
      <div class="muted" style="font-size:10px;text-align:right;">蓝=你 · 橙=原型</div>
    </div>

    <div style="margin-top:6px;padding:12px;background:var(--primary-soft);border-radius:12px;text-align:left;">
      <div style="font-weight:800;font-size:14px;margin-bottom:4px;">为什么会是这个人</div>
      <p class="muted" style="font-size:13px;line-height:1.8;margin:0;">{{ whyText }}</p>
    </div>

    <div style="margin-top:14px;padding:12px;border:1px solid var(--border);border-radius:12px;text-align:left;">
      <div style="font-weight:800;font-size:14px;margin-bottom:4px;">{{ best.name }} · 简要事迹</div>
      <p class="muted" style="font-size:13px;line-height:1.8;margin:0;">{{ best.summary }}</p>
    </div>

    <div style="margin-top:14px;text-align:left;">
      <div class="muted" style="font-size:13px;font-weight:700;margin-bottom:8px;">最接近的另外两位</div>
      <div v-for="(o, i) in [second, third]" :key="o.name" style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px dashed var(--border);">
        <span style="flex:0 0 22px;text-align:center;font-weight:800;color:var(--muted);">#{{ i + 2 }}</span>
        <div class="mini-avatar" :style="avatarStyle(o)">{{ initial(o.name) }}</div>
        <div>
          <div style="font-size:13px;font-weight:700;">{{ o.name }}</div>
          <div class="muted" style="font-size:12px;">{{ o.bio }}</div>
        </div>
      </div>
    </div>

    <div class="share-box">
      <div style="font-weight:800;font-size:13px;margin-bottom:6px;">可分享文案</div>
      <p class="muted" style="font-size:13px;margin:0 0 10px;line-height:1.6;">{{ shareText }}</p>
      <button class="btn ghost small" @click="copyShare">{{ copied ? '已复制 ✓' : '复制文案' }}</button>
    </div>

    <div style="margin:16px 0 4px;font-size:13px;">这个结果准吗？</div>
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
.portrait {
  width: 96px; height: 96px; border-radius: 50%; margin: 14px auto 0;
  display: flex; align-items: center; justify-content: center; overflow: hidden;
  border: 3px solid #fff; box-shadow: 0 8px 20px rgba(0, 0, 0, 0.18);
}
.portrait img { width: 100%; height: 100%; object-fit: cover; }
.portrait-initial { font-size: 40px; font-weight: 800; color: #fff; }
.mini-avatar { width: 34px; height: 34px; border-radius: 50%; color: #fff; font-weight: 800; font-size: 15px; display: flex; align-items: center; justify-content: center; flex: 0 0 auto; }
.share-box { margin-top: 14px; padding: 12px; border: 1px dashed var(--primary); border-radius: 12px; background: var(--primary-soft); text-align: left; }
</style>