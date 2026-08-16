<script setup>
import { ref, computed, onMounted } from 'vue'
import { quiz } from '../data/quiz'
import CountUp from '../components/CountUp.vue'

const emit = defineEmits(['back'])

const QUESTIONS = 10
const pool = ref([])
const index = ref(0)
const score = ref(0)
const correct = ref(0)
const picked = ref(null)
const done = ref(false)
const best = ref(0)
const rounds = ref(0)

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function start() {
  pool.value = shuffle(quiz).slice(0, QUESTIONS)
  index.value = 0
  score.value = 0
  correct.value = 0
  picked.value = null
  done.value = false
}

function choose(optIdx) {
  if (picked.value !== null) return
  picked.value = optIdx
  if (optIdx === cur.value.answer) {
    score.value += 10
    correct.value += 1
  }
}

function next() {
  if (index.value + 1 >= pool.value.length) {
    done.value = true
    rounds.value += 1
    best.value = Math.max(best.value, score.value)
    localStorage.setItem('qdu_quiz_best', String(best.value))
    localStorage.setItem('qdu_quiz_rounds', String(rounds.value))
  } else {
    index.value += 1
    picked.value = null
  }
}

const cur = computed(() => pool.value[index.value])

const verdict = computed(() => {
  if (picked.value === null) return ''
  return picked.value === cur.value.answer ? '✅ 回答正确' : '❌ 回答错误'
})

const grade = computed(() => {
  const p = score.value / (QUESTIONS * 10)
  if (p >= 0.9) return 'S · 青大活地图！'
  if (p >= 0.7) return 'A · 很了解青大！'
  if (p >= 0.5) return 'B · 有一定了解'
  if (p >= 0.3) return 'C · 多逛逛校园吧'
  return 'D · 新生报到，常来逛逛！'
})

onMounted(() => {
  best.value = Number(localStorage.getItem('qdu_quiz_best')) || 0
  rounds.value = Number(localStorage.getItem('qdu_quiz_rounds')) || 0
  start()
})
</script>

<template>
  <div class="view-top">
    <button class="back-btn" @click="emit('back')">← 返回首页</button>
    <div class="view-title">青大知多少</div>
    <div class="view-sub">校园知识问答 · 已挑战 <CountUp :value="rounds" /> 次 · 历史最高 <CountUp :value="best" /> 分</div>
  </div>

  <div v-if="!done" class="panel">
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
      <div style="font-weight:800;font-size:15px;">第 {{ index + 1 }} / {{ pool.length }} 题</div>
      <div style="flex:1;height:8px;background:#eef3fa;border-radius:4px;overflow:hidden;">
        <div
          style="height:100%;background:linear-gradient(90deg,#1b66c9,#3a86e8);transition:width .3s;"
          :style="{ width: ((index + (picked !== null ? 1 : 0)) / pool.length * 100) + '%' }"
        ></div>
      </div>
      <div style="font-weight:800;color:var(--primary);">得分 {{ score }}</div>
    </div>

    <div style="font-size:18px;font-weight:700;line-height:1.6;margin-bottom:18px;">{{ cur.q }}</div>

    <div style="display:grid;gap:10px;">
      <button
        v-for="(opt, oi) in cur.options"
        :key="oi"
        class="opt"
        :class="{
          correct: picked !== null && oi === cur.answer,
          wrong: picked === oi && oi !== cur.answer,
          dim: picked !== null && oi !== cur.answer && oi !== picked
        }"
        :disabled="picked !== null"
        @click="choose(oi)"
      >{{ String.fromCharCode(65 + oi) }}. {{ opt }}</button>
    </div>

    <div v-if="picked !== null" class="result-box" :style="{ background: picked === cur.answer ? '#e8f6ee' : '#fdf0f0' }">
      <div style="font-weight:700;">{{ verdict }}</div>
      <div class="muted" style="font-size:13px;margin-top:4px;">{{ cur.explain }}</div>
      <button class="btn" style="margin-top:12px;" @click="next">
        {{ index + 1 >= pool.length ? '查看成绩' : '下一题 →' }}
      </button>
    </div>
  </div>

  <div v-else class="panel" style="text-align:center;padding:34px;">
    <div style="font-size:40px;">🏆</div>
    <div style="font-size:22px;font-weight:800;margin:10px 0;">{{ score }} / {{ QUESTIONS * 10 }}</div>
    <div style="font-size:15px;font-weight:600;color:var(--primary);">{{ grade }}</div>
    <div class="muted" style="margin:10px 0;">答对 {{ correct }} / {{ QUESTIONS }} 题</div>
    <div style="display:flex;gap:10px;justify-content:center;margin-top:14px;">
      <button class="btn" @click="start">再来一轮</button>
      <button class="btn ghost" @click="emit('back')">返回首页</button>
    </div>
  </div>
</template>

<style scoped>
.opt {
  text-align: left;
  background: #f6f9ff;
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 13px 16px;
  font-size: 14px;
  cursor: pointer;
  transition: 0.15s;
  color: var(--text);
}
.opt:hover:not(:disabled) {
  border-color: var(--primary);
  background: var(--primary-soft);
}
.opt.correct {
  background: #e8f6ee;
  border-color: #0f766e;
  color: #0f766e;
  font-weight: 700;
}
.opt.wrong {
  background: #fdf0f0;
  border-color: #b63a46;
  color: #b63a46;
}
.opt.dim {
  opacity: 0.5;
}
</style>