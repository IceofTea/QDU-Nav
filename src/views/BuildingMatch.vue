<script setup>
import { ref, computed } from 'vue'
import CountUp from '../components/CountUp.vue'

const emit = defineEmits(['back'])

const PAIRS = [
  ['博学楼', '西 1 教'],
  ['博文楼', '西 2 教'],
  ['博观楼', '西 3 教'],
  ['博知楼', '西 4 教'],
  ['博远楼', '西 5 教'],
  ['博逸楼', '西 6 教'],
  ['博雅楼', '原基础医学楼'],
  ['行思楼', '东 4 教'],
  ['睿思楼', '东 1 教'],
  ['学思楼', '东 2 教'],
  ['慎思楼', '东 3 教'],
  ['诚思楼', '东 5 教'],
  ['静思楼 1 号', '东 9 教'],
  ['静思楼 2 号', '东 10 教'],
  ['静思楼 3 号', '东 11 教'],
  ['德音楼', '北院教学楼'],
  ['德晖楼', '北院实验楼']
]

const BACK_IMGS = [
  'https://houqin.qdu.edu.cn/__local/A/D3/DB/C0402756203CF01BB504FB2F160_45396267_9B52.jpg',
  'https://houqin.qdu.edu.cn/__local/B/7E/D5/68721FCE6800F5BF27655795A6D_7EB203A8_1C42A.jpg',
  'https://houqin.qdu.edu.cn/__local/A/F7/33/F2252CBEDA9F5E5AEE163FFBA6F_5A3799E5_1CE34.jpg',
  'https://houqin.qdu.edu.cn/__local/E/A6/A1/E09EEBC4B35A7040F30534F81AB_5E0E64D1_1E82B.jpg',
  'https://houqin.qdu.edu.cn/__local/4/D9/DD/BBD0AF9BDBD9D2DD9F08A9C3E34_E14B3FFA_1EB79.jpg',
  'https://houqin.qdu.edu.cn/__local/B/3A/51/0B59C287B1795C0C3E211875663_4FE0A6F5_1DDB8.jpg',
  'https://houqin.qdu.edu.cn/__local/D/E3/35/87C1944BD538986596E2A753051_FBF27E8D_1AFDC.jpg',
  'https://houqin.qdu.edu.cn/__local/0/FC/20/C63BFE356C6FCF0D4660203F633_D698434D_1A9F0.jpg'
]

const DIFFS = {
  easy: { label: '简单', pairs: 6, cols: 4 },
  normal: { label: '普通', pairs: 10, cols: 5 },
  hard: { label: '挑战', pairs: 15, cols: 6 }
}
const diff = ref('easy')
const activePairs = computed(() => PAIRS.slice(0, DIFFS[diff.value].pairs))

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function buildCards() {
  const cards = activePairs.value.flatMap(([a, b], pair) => [
    { id: a + b + 'a' + pair, pair, label: a, newName: true, img: BACK_IMGS[(pair * 2) % BACK_IMGS.length] },
    { id: a + b + 'b' + pair, pair, label: b, newName: false, img: BACK_IMGS[(pair * 2 + 1) % BACK_IMGS.length] }
  ])
  return shuffle(cards)
}

const cards = ref(buildCards())
const flipped = ref([])
const matched = ref(new Set())
const confirmPair = ref(null)
const pickedId = ref(null)
const moves = ref(0)
const best = ref(Number(localStorage.getItem('qdu_bm_best')) || null)
const done = ref(false)
const found = ref(false)
const noPair = ref(false)
const help = ref(false)
const cheat = ref(false)
const cheatTimer = ref(null)

const finished = computed(() => matched.value.size === activePairs.value.length)
const stars = computed(() => {
  if (!finished.value) return 0
  const n = activePairs.value.length
  if (moves.value <= n * 1.6) return 3
  if (moves.value <= n * 2.2) return 2
  return 1
})

function pickDiff(d) {
  diff.value = d
  restart()
}

function isOpen(c) {
  return matched.value.has(c.pair) || flipped.value.includes(c.id)
}

function byId(id) {
  return cards.value.find((c) => c.id === id)
}

function checkWin() {
  if (matched.value.size === activePairs.value.length) {
    done.value = true
    if (!best.value || moves.value < best.value) {
      best.value = moves.value
      localStorage.setItem('qdu_bm_best', String(best.value))
    }
  }
}

function flip(card) {
  if (done.value || matched.value.has(card.pair)) return

  if (confirmPair.value) {
    const cp = confirmPair.value
    if (card.id !== cp.a && card.id !== cp.b) return
    if (!pickedId.value) {
      pickedId.value = card.id
      return
    }
    if (pickedId.value !== card.id) {
      matched.value.add(cp.pair)
      flipped.value = []
      confirmPair.value = null
      pickedId.value = null
      found.value = false
      checkWin()
    }
    return
  }

  if (flipped.value.includes(card.id) || flipped.value.length >= 4) return
  flipped.value.push(card.id)

  if (flipped.value.length === 4) {
    moves.value += 1
    const group = {}
    flipped.value.forEach((id) => {
      const p = byId(id).pair
      ;(group[p] = group[p] || []).push(id)
    })
    const pairFound = Object.values(group).find((arr) => arr.length === 2)
    if (pairFound) {
      found.value = true
      const pair = byId(pairFound[0]).pair
      confirmPair.value = { a: pairFound[0], b: pairFound[1], pair }
      flipped.value = pairFound
    } else {
      noPair.value = true
      setTimeout(() => {
        flipped.value = []
        noPair.value = false
      }, 700)
    }
  }
}

function openCheat() {
  cheat.value = true
  clearTimeout(cheatTimer.value)
  cheatTimer.value = setTimeout(() => { cheat.value = false }, 3200)
}

function restart() {
  cards.value = buildCards()
  flipped.value = []
  matched.value = new Set()
  confirmPair.value = null
  pickedId.value = null
  found.value = false
  noPair.value = false
  moves.value = 0
  done.value = false
}
</script>

<template>
  <div class="view-top">
    <button class="back-btn" @click="emit('back')">← 返回首页</button>
    <div class="view-title">教学楼速配</div>
    <div class="view-sub">新楼名 × 旧称配对 · 一次可翻 4 张记忆 · 配对应从照片上翻起</div>
  </div>

  <div class="panel" style="margin-bottom:16px;">
    <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
      <div class="stat-pill"><b>{{ moves }}</b><span>步数</span></div>
      <div class="stat-pill"><b>{{ matched.size }}/{{ activePairs.length }}</b><span>已配对</span></div>
      <div class="stat-pill" v-if="best"><b>{{ best }}</b><span>最佳</span></div>
      <div style="margin-left:auto;display:flex;gap:8px;">
        <button class="btn ghost" style="padding:7px 14px;" @click="help = true">❓ 玩法</button>
        <button class="btn ghost" style="padding:7px 14px;" @click="openCheat">✨ 开挂</button>
        <button class="btn ghost" style="padding:7px 14px;" @click="restart">🔄 重开</button>
      </div>
    </div>

    <div class="tab-row" style="margin-top:12px;">
      <button v-for="(d, k) in DIFFS" :key="k" class="tab" :class="{ active: diff === k }" @click="pickDiff(k)">
        {{ d.label }} · {{ d.pairs }} 对
      </button>
    </div>

    <div v-if="finished" class="result-box" style="text-align:center;margin-top:12px;">
      <div style="font-size:26px;">🎉</div>
      <div style="font-weight:800;font-size:18px;">全部配对成功！</div>
      <div style="margin-top:4px;">{{ DIFFS[diff].label }}难度 · 用了 {{ moves }} 步 · 获得 {{ stars }} 星</div>
    </div>

    <div
      v-if="found"
      class="found-tip"
    >🔍 发现配对！点击两张高亮卡片确认（还需翻到对应两张才算成功哦）</div>
    <div v-else-if="noPair" class="found-tip bad">这 4 张里没有配对，已翻回，再试试</div>
    <div v-else-if="confirmPair && !pickedId" class="found-tip">先点击一张高亮卡片选中，再点击另一张完成配对</div>
    <div v-else-if="confirmPair && pickedId" class="found-tip good">已选中 ✅ 点击另一张高亮卡片配对</div>

    <div class="card-grid" :style="{ gridTemplateColumns: 'repeat(' + DIFFS[diff].cols + ', 1fr)' }">
      <button
        v-for="c in cards"
        :key="c.id"
        class="card"
        :class="{
          open: isOpen(c),
          match: matched.has(c.pair),
          confirm: confirmPair && (c.id === confirmPair.a || c.id === confirmPair.b),
          picked: pickedId === c.id,
          shake: noPair && flipped.includes(c.id)
        }"
        :style="!isOpen(c) ? { backgroundImage: 'url(' + c.img + ')' } : null"
        @click="flip(c)"
      >
        <template v-if="isOpen(c)">
          <span class="card-label" :class="{ new: c.newName }">{{ c.label }}</span>
        </template>
        <template v-else>
          <span class="card-badge">青大</span>
        </template>
      </button>
    </div>
    <div class="muted" style="font-size:11px;margin-top:10px;">卡背为青大校园实景 · 名称对应据《青岛大学道路楼宇及园林命名方案》（青大办字〔2006〕24号）</div>
  </div>

  <div v-if="help" class="overlay" @click="help = false">
    <div class="overlay-card" @click.stop>
      <div style="font-weight:800;font-size:17px;margin-bottom:12px;">📖 玩法说明</div>
      <div style="font-size:14px;line-height:2;">
        <p>1. 卡片背面是青大校园实景照片，点击翻开看楼名。</p>
        <p>2. 每次可同时翻开 <b>4 张</b> 记忆：若 4 张里没有配对会自动翻回；<b>若发现配对</b>，两张卡片会高亮，但你还需依次点击这两张确认才算配对成功。</p>
        <p>3. 目标是找出「新楼名 ⇄ 旧称」的全部配对，步数越少星级越高。</p>
        <p>4. 卡住了？点「✨ 开挂」会显示 3 秒全部配对答案。</p>
      </div>
      <button class="btn accent" style="width:100%;margin-top:6px;" @click="help = false">明白了，开始！</button>
    </div>
  </div>

  <div v-if="cheat" class="overlay">
    <div class="cheat-box">
      <div style="font-weight:800;font-size:15px;margin-bottom:10px;">✨ 答案速览（3 秒后自动关闭）</div>
      <div v-for="(p, i) in activePairs" :key="i" class="cheat-row">
        <b style="color:var(--primary);">{{ p[0] }}</b>
        <span style="opacity:.6;">⇄</span>
        <span>{{ p[1] }}</span>
      </div>
    </div>
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
  background-color: #0d4ea8;
  background-size: cover;
  background-position: center;
  color: #fff;
  font-family: inherit;
  cursor: pointer;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.12s ease, box-shadow 0.15s ease;
  overflow: hidden;
}
.card::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(160deg, rgba(13, 78, 168, 0.18), rgba(4, 32, 78, 0.42));
  pointer-events: none;
}
.card.open { background: #f6f9ff; color: var(--text); border-color: var(--primary); }
.card.open::after { display: none; }
.card.match { background: #e8f6ee; color: #0f766e; border-color: #0f766e; }
.card.match::after { display: none; }
.card.confirm {
  border-color: #f5a623;
  box-shadow: 0 0 0 3px rgba(245, 166, 35, 0.55);
  animation: glow 1.1s ease-in-out infinite;
}
.card.picked { box-shadow: 0 0 0 4px var(--primary); }
.card.shake { animation: shake 0.4s ease; }
.card:not(.open):not(.match):not(.confirm):hover { transform: translateY(-2px); }
.card-label { position: relative; z-index: 1; font-size: 13px; font-weight: 800; padding: 0 4px; }
.card.open .card-label { color: var(--text); }
.card.match .card-label { color: #0f766e; }
.card-label.new { color: var(--primary); }
.card-badge {
  position: relative;
  z-index: 1;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 2px;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(13, 78, 168, 0.55);
  backdrop-filter: blur(2px);
  border: 1px solid rgba(255, 255, 255, 0.5);
}
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
.found-tip {
  margin-top: 12px;
  padding: 8px 12px;
  border-radius: 10px;
  background: #fff8e6;
  border: 1px solid #f5c34c;
  color: #8a5b00;
  font-size: 13px;
  font-weight: 600;
}
.found-tip.bad { background: #fdf0f0; border-color: #e6a3a3; color: #b63a46; }
.found-tip.good { background: #e8f6ee; border-color: #7ec9a0; color: #0f766e; }
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(6, 20, 40, 0.55);
  backdrop-filter: blur(3px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 60;
  padding: 20px;
}
.overlay-card {
  background: #fff;
  border-radius: 18px;
  padding: 22px;
  max-width: 380px;
  width: 100%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}
.overlay-card p { margin: 0; }
.cheat-box {
  background: rgba(255, 255, 255, 0.97);
  border-radius: 16px;
  padding: 18px 20px;
  max-width: 400px;
  width: 100%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.35);
}
.cheat-row {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  font-size: 13px;
  padding: 5px 0;
  border-bottom: 1px dashed var(--border);
}
.cheat-row:last-child { border-bottom: none; }
@keyframes glow {
  0%, 100% { box-shadow: 0 0 0 3px rgba(245, 166, 35, 0.55); }
  50% { box-shadow: 0 0 0 6px rgba(245, 166, 35, 0.25); }
}
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-4px); }
  75% { transform: translateX(4px); }
}
</style>