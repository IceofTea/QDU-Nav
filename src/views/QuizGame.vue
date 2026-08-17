<script setup>
import { ref, computed, onMounted } from 'vue'
import { quiz } from '../data/quiz'
import CountUp from '../components/CountUp.vue'

const emit = defineEmits(['back'])

const mode = ref('play')
const bankKw = ref('')
const bankOpen = ref({})

const QUESTIONS = 10
const pool = ref([])
const index = ref(0)
const score = ref(0)
const correct = ref(0)
const picked = ref(null)
const done = ref(false)
const best = ref(0)
const rounds = ref(0)
const scores = ref([])
const wrongList = ref([])

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
  wrongList.value = []
}

function choose(optIdx) {
  if (picked.value !== null) return
  picked.value = optIdx
  if (optIdx === cur.value.answer) {
    score.value += 10
    correct.value += 1
  } else {
    wrongList.value.push(cur.value)
  }
}

function next() {
  if (index.value + 1 >= pool.value.length) {
    done.value = true
    rounds.value += 1
    best.value = Math.max(best.value, score.value)
    localStorage.setItem('qdu_quiz_best', String(best.value))
    localStorage.setItem('qdu_quiz_rounds', String(rounds.value))
    scores.value.unshift({
      score: score.value,
      correct: correct.value,
      total: QUESTIONS,
      date: new Date().toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })
    })
    scores.value = scores.value.slice(0, 100)
    localStorage.setItem('qdu_quiz_scores', JSON.stringify(scores.value))
  } else {
    index.value += 1
    picked.value = null
  }
}

const cur = computed(() => pool.value[index.value])

const leaderboard = computed(() =>
  [...scores.value].sort((a, b) => b.score - a.score || b.correct - a.correct).slice(0, 10))

const filteredBank = computed(() => {
  const k = bankKw.value.trim()
  if (!k) return quiz
  return quiz.filter((q) => (q.q + q.explain + q.options.join('')).includes(k))
})

function toggleBank(q) {
  bankOpen.value[q.q] = !bankOpen.value[q.q]
}

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
  try {
    const s = JSON.parse(localStorage.getItem('qdu_quiz_scores'))
    scores.value = Array.isArray(s) ? s : []
  } catch { scores.value = [] }
  start()
})
</script>

<template>
  <div class="view-top">
    <button class="back-btn" @click="emit('back')">← 返回首页</button>
    <div class="view-title">青大知多少</div>
    <div class="view-sub">校园知识问答 · 已挑战 <CountUp :value="rounds" /> 次 · 历史最高 <CountUp :value="best" /> 分</div>
  </div>

  <div class="panel" style="margin-bottom:16px;padding:10px;">
    <div class="mode-tabs">
      <button class="mode-btn" :class="{ active: mode === 'play' }" @click="mode = 'play'">🎯 开始答题</button>
      <button class="mode-btn" :class="{ active: mode === 'bank' }" @click="mode = 'bank'">📚 题库查看（{{ quiz.length }} 题）</button>
    </div>
  </div>

  <template v-if="mode === 'bank'">
    <div class="panel" style="margin-bottom:16px;">
      <div class="input-row">
        <input v-model="bankKw" class="input" placeholder="🔍 搜索题目 / 答案关键词" />
      </div>
      <div class="muted" style="font-size:12px;margin-top:6px;">共 {{ filteredBank.length }} 题，点击题目展开查看答案与解析</div>
    </div>

    <div class="panel">
      <div v-for="(q, qi) in filteredBank" :key="q.q" class="bank-item">
        <button class="bank-q" @click="toggleBank(q)">
          <span class="bank-no">{{ qi + 1 }}</span>
          <span class="bank-text">{{ q.q }}</span>
          <span class="bank-toggle">{{ bankOpen[q.q] ? '收起 ▴' : '答案 ▾' }}</span>
        </button>
        <div v-if="bankOpen[q.q]" class="bank-detail">
          <div style="display:grid;gap:6px;margin:8px 0;">
            <div
              v-for="(opt, oi) in q.options"
              :key="oi"
              class="bank-opt"
              :class="{ right: oi === q.answer }"
            >{{ String.fromCharCode(65 + oi) }}. {{ opt }}{{ oi === q.answer ? ' ✓' : '' }}</div>
          </div>
          <div class="bank-explain">💡 {{ q.explain }}</div>
        </div>
      </div>
      <div v-if="!filteredBank.length" class="muted" style="text-align:center;padding:20px;">没有找到相关题目</div>
    </div>
  </template>

  <template v-else-if="!done">
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
      >
        <span class="opt-key" :class="{ ok: picked !== null && oi === cur.answer, no: picked === oi && oi !== cur.answer }">{{ String.fromCharCode(65 + oi) }}</span>
        <span>{{ opt }}</span>
      </button>
    </div>

    <div v-if="picked !== null" class="result-box" :style="{ background: picked === cur.answer ? '#e8f6ee' : '#fdf0f0' }">
      <div style="font-weight:700;">{{ verdict }}</div>
      <div class="muted" style="font-size:13px;margin-top:4px;">{{ cur.explain }}</div>
      <button class="btn" style="margin-top:12px;" @click="next">
        {{ index + 1 >= pool.length ? '查看成绩' : '下一题 →' }}
      </button>
    </div>
  </template>

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

  <div v-if="done && wrongList.length" class="panel" style="margin-top:16px;">
    <div class="section-title" style="margin:0 0 10px;"><span class="bar"></span>📝 本轮错题回顾</div>
    <div v-for="(w, wi) in wrongList" :key="wi" class="bank-item">
      <div class="bank-q" style="cursor:default;">
        <span class="bank-no" style="background:#b63a46;">{{ wi + 1 }}</span>
        <span class="bank-text">{{ w.q }}</span>
      </div>
      <div style="display:grid;gap:6px;margin:8px 0 0 32px;">
        <div v-for="(opt, oi) in w.options" :key="oi" class="bank-opt" :class="{ right: oi === w.answer }">
          {{ String.fromCharCode(65 + oi) }}. {{ opt }}{{ oi === w.answer ? ' ✓' : '' }}
        </div>
      </div>
      <div class="bank-explain" style="margin-left:32px;">💡 {{ w.explain }}</div>
    </div>
  </div>

  <div v-if="done" class="panel" style="margin-top:16px;">
    <div class="section-title" style="margin:0 0 10px;"><span class="bar"></span>🏅 本机排行榜 Top 10</div>
    <div v-if="leaderboard.length" class="rank-list">
      <div v-for="(s, i) in leaderboard" :key="i" class="rank-row">
        <span class="rank-no" :class="{ top: i === 0 }">{{ i + 1 }}</span>
        <span class="rank-main">{{ s.score }} 分 · 答对 {{ s.correct }}/{{ s.total }}</span>
        <span class="muted" style="font-size:12px;">{{ s.date }}</span>
      </div>
    </div>
    <div v-else class="muted" style="text-align:center;padding:12px;">完成一轮答题即可上榜</div>
    <p class="muted" style="font-size:11px;margin-top:10px;">成绩仅保存在本机浏览器（localStorage），供自己挑战刷新。</p>
  </div>
</template>

<style scoped>
.mode-tabs { display: flex; gap: 8px; }
.mode-btn {
  flex: 1;
  border: 1px solid var(--border);
  background: var(--card);
  color: var(--text);
  font-family: inherit;
  font-size: 13px;
  font-weight: 700;
  padding: 9px 0;
  border-radius: 10px;
  cursor: pointer;
  transition: 0.15s;
}
.mode-btn.active { background: var(--primary); color: #fff; border-color: var(--primary); }
.bank-item { border-bottom: 1px dashed var(--border); padding: 6px 0; }
.bank-item:last-child { border-bottom: none; }
.bank-q {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  width: 100%;
  text-align: left;
  background: none;
  border: none;
  color: var(--text);
  font-family: inherit;
  cursor: pointer;
  padding: 8px 0;
}
.bank-no {
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  border-radius: 6px;
  background: var(--primary);
  color: #fff;
  font-size: 12px;
  font-weight: 800;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.bank-text { flex: 1; font-size: 14px; font-weight: 600; line-height: 1.5; }
.bank-toggle { flex-shrink: 0; font-size: 12px; color: var(--text-light); padding-top: 2px; }
.bank-detail { padding: 4px 0 10px 32px; }
.bank-opt { font-size: 13px; padding: 5px 10px; border-radius: 8px; background: #f6f9ff; border: 1px solid var(--border); }
.bank-opt.right { background: #e8f6ee; border-color: #0f766e; color: #0f766e; font-weight: 700; }
.bank-explain { font-size: 12px; color: var(--text-sub); margin-top: 8px; line-height: 1.6; }
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
  display: flex;
  align-items: center;
  gap: 10px;
}
.opt-key {
  flex-shrink: 0;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: var(--primary);
  color: #fff;
  font-size: 13px;
  font-weight: 800;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.opt-key.ok { background: #0f766e; }
.opt-key.no { background: #b63a46; }
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
.rank-list { display: flex; flex-direction: column; }
.rank-row { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px solid var(--border); }
.rank-row:last-child { border-bottom: none; }
.rank-no {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  border-radius: 6px;
  background: var(--bar);
  color: var(--text-sub);
  font-size: 12px;
  font-weight: 800;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.rank-no.top { background: #f59e0b; color: #fff; }
.rank-main { flex: 1; font-size: 13px; font-weight: 600; }
</style>