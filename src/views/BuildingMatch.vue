<script setup>
import { ref, computed } from 'vue'
import CountUp from '../components/CountUp.vue'

const emit = defineEmits(['back'])

const PAIRS = [
  ['博学楼', '西 1 教'],
  ['博文楼', '西 2 教'],
  ['博知楼', '西 4 教'],
  ['博远楼', '西 5 教'],
  ['博逸楼', '西 6 教'],
  ['静思楼 2 号', '东 10 教'],
  ['行思楼', '东 4 教'],
  ['德音楼', '北院教学楼']
]

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function buildCards() {
  const cards = PAIRS.flatMap(([a, b], pair) => [
    { id: a + b + 'a', pair, label: a, newName: true },
    { id: a + b + 'b', pair, label: b, newName: false }
  ])
  return shuffle(cards)
}

const cards = ref(buildCards())
const flipped = ref([])
const matched = ref(new Set())
const moves = ref(0)
const best = ref(Number(localStorage.getItem('qdu_bm_best')) || null)
const done = ref(false)

const finished = computed(() => matched.value.size === PAIRS.length)
const stars = computed(() => {
  if (!finished.value) return 0
  if (moves.value <= 10) return 3
  if (moves.value <= 14) return 2
  return 1
})

function flip(card) {
  if (done.value || matched.value.has(card.pair) || flipped.value.some((c) => c.id === card.id) || flipped.value.length >= 2) return
  const next = [...flipped.value, card]
  flipped.value = next
  if (next.length === 2) {
    moves.value += 1
    if (next[0].pair === next[1].pair) {
      next.forEach((c) => matched.value.add(c.pair))
      flipped.value = []
      if (matched.value.size === PAIRS.length) {
        done.value = true
        if (!best.value || moves.value < best.value) {
          best.value = moves.value
          localStorage.setItem('qdu_bm_best', String(best.value))
        }
      }
    } else {
      setTimeout(() => { flipped.value = [] }, 650)
    }
  }
}

function restart() {
  cards.value = buildCards()
  flipped.value = []
  matched.value = new Set()
  moves.value = 0
  done.value = false
}
</script>

<template>
  <div class="view-top">
    <button class="back-btn" @click="emit('back')">← 返回首页</button>
    <div class="view-title">教学楼速配</div>
    <div class="view-sub">把教学楼新名与旧称配对 · 翻牌记忆游戏</div>
  </div>

  <div class="panel" style="margin-bottom:16px;">
    <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
      <div class="stat-pill"><b>{{ moves }}</b><span>步数</span></div>
      <div class="stat-pill"><b>{{ matched.size }}/{{ PAIRS.length }}</b><span>已配对</span></div>
      <div class="stat-pill" v-if="best"><b>{{ best }}</b><span>最佳</span></div>
      <button class="btn ghost" style="margin-left:auto;padding:7px 14px;" @click="restart">🔄 重新开始</button>
    </div>

    <div v-if="finished" class="result-box" style="text-align:center;margin-top:12px;">
      <div style="font-size:26px;">🎉</div>
      <div style="font-weight:800;font-size:18px;">全部配对成功！</div>
      <div style="margin-top:4px;">用了 {{ moves }} 步 · 获得 {{ stars }} 星</div>
    </div>

    <div class="card-grid">
      <button
        v-for="c in cards"
        :key="c.id"
        class="card"
        :class="{ open: flipped.some((f) => f.id === c.id), match: matched.has(c.pair) }"
        @click="flip(c)"
      >
        <span v-if="flipped.some((f) => f.id === c.id) || matched.has(c.pair)" class="card-label" :class="{ new: c.newName }">
          {{ c.label }}
        </span>
        <span v-else class="card-back">青</span>
      </button>
    </div>
    <div class="muted" style="font-size:11px;margin-top:10px;">名称对应据《青岛大学道路楼宇及园林命名方案》（青大办字〔2006〕24号）</div>
  </div>
</template>

<style scoped>
.card-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  margin-top: 14px;
}
.card {
  aspect-ratio: 4 / 3;
  border-radius: 14px;
  border: 1px solid var(--border);
  background: linear-gradient(145deg, #1b66c9, #0d4ea8);
  color: #fff;
  font-family: inherit;
  font-size: 24px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.12s ease, background 0.15s ease;
}
.card.open { background: #f6f9ff; color: var(--text); border-color: var(--primary); }
.card.match { background: #e8f6ee; color: #0f766e; border-color: #0f766e; }
.card.open .card-label { font-size: 13px; font-weight: 800; }
.card.open .card-label.new { color: var(--primary); }
.card:not(.open):not(.match):hover { transform: translateY(-2px); }
.stat-pill {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 54px;
  padding: 6px 10px;
  border-radius: 10px;
  background: var(--bg);
}
.stat-pill b { font-size: 18px; color: var(--primary); }
.stat-pill span { font-size: 10px; color: var(--text-light); }
</style>