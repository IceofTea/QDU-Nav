<script setup>
import { ref, computed, onMounted } from 'vue'
import { foods } from '../data/foods'
import CountUp from '../components/CountUp.vue'

const emit = defineEmits(['back'])

const SEG = foods.slice(0, 8)
const anglePer = 360 / SEG.length
const colors = ['#1b66c9', '#e76f51', '#0f766e', '#d97706', '#7c3aed', '#b63a46', '#0284c7', '#f43f5e']

const rotation = ref(0)
const spinning = ref(false)
const result = ref(null)
const spins = ref(0)
const history = ref([])

const gradient = computed(() => {
  return `conic-gradient(${SEG.map((f, i) => `${colors[i]} 0 ${(i + 1) * anglePer}deg`).join(', ')})`
})

function spin() {
  if (spinning.value) return
  spinning.value = true
  result.value = null
  const target = Math.floor(Math.random() * SEG.length)
  const extra = 360 * (4 + Math.floor(Math.random() * 4))
  const finalRot = rotation.value + extra + (360 - target * anglePer - anglePer / 2)
  rotation.value = finalRot
  setTimeout(() => {
    spinning.value = false
    result.value = SEG[target]
    spins.value += 1
    history.value.unshift({ ...SEG[target], at: new Date().toLocaleTimeString() })
    sessionStorage.setItem('qdu_wheel_spins', String(spins.value))
    localStorage.setItem('qdu_wheel_history', JSON.stringify(history.value.slice(0, 10)))
  }, 3400)
}

onMounted(() => {
  spins.value = Number(sessionStorage.getItem('qdu_wheel_spins')) || 0
  try {
    history.value = JSON.parse(localStorage.getItem('qdu_wheel_history')) || []
  } catch {
    history.value = []
  }
})
</script>

<template>
  <div class="view-top">
    <button class="back-btn" @click="emit('back')">← 返回首页</button>
    <div class="view-title">美食轮盘</div>
    <div class="view-sub">食堂美食转盘 · 今日已抽 <CountUp :value="spins" /> 次</div>
  </div>

  <div class="panel" style="text-align:center;">
    <div class="wheel-wrap">
      <div class="pointer"></div>
      <div
        class="wheel"
        :style="{ background: gradient, transform: `rotate(${rotation}deg)` }"
      ></div>
    </div>

    <div v-if="result" class="result-box" style="text-align:center;">
      <div class="muted" style="font-size:13px;">恭喜抽中</div>
      <div style="font-size:22px;font-weight:800;margin:4px 0;">🍽️ {{ result.name }}</div>
      <div class="muted" style="font-size:13px;">{{ result.hall }} · ¥{{ result.price }} · {{ result.heat }} kcal</div>
    </div>
    <div v-else class="muted" style="margin:10px 0;">点击「开始抽奖」，指针停下指向的美食就是今天的答案</div>

    <button class="btn accent" style="margin-top:8px;" :disabled="spinning" @click="spin">
      {{ spinning ? '转动中…' : '🎡 开始抽奖' }}
    </button>
  </div>

  <div class="panel" style="margin-top:16px;">
    <div class="section-title" style="margin:0 0 12px;"><span class="bar"></span>轮盘候选</div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px;">
      <div
        v-for="(f, i) in SEG"
        :key="f.name"
        style="display:flex;align-items:center;gap:8px;background:#f6f9ff;border-radius:10px;padding:8px 10px;"
      >
        <span style="width:12px;height:12px;border-radius:3px;background:var(--wheel-color);" :style="{ background: colors[i] }"></span>
        <span style="font-size:13px;font-weight:600;">{{ f.name }}</span>
      </div>
    </div>
  </div>

  <div class="panel" style="margin-top:16px;">
    <div class="section-title" style="margin:0 0 12px;"><span class="bar"></span>抽奖记录（最近 {{ history.length }} 次）</div>
    <div v-if="!history.length" class="muted" style="text-align:center;padding:14px;">还没有抽奖记录</div>
    <table v-else class="data">
      <thead><tr><th>时间</th><th>美食</th><th>食堂</th></tr></thead>
      <tbody>
        <tr v-for="(h, i) in history" :key="i">
          <td>{{ h.at }}</td>
          <td><b>{{ h.name }}</b></td>
          <td>{{ h.hall }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.wheel-wrap {
  position: relative;
  width: 260px;
  height: 260px;
  margin: 10px auto 18px;
}
.wheel {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 6px solid #fff;
  box-shadow: 0 10px 30px rgba(27, 102, 201, 0.2);
  transition: transform 3.2s cubic-bezier(0.16, 0.85, 0.25, 1);
}
.pointer {
  position: absolute;
  top: -8px;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 12px solid transparent;
  border-right: 12px solid transparent;
  border-top: 20px solid #b63a46;
  z-index: 2;
  filter: drop-shadow(0 2px 3px rgba(0, 0, 0, 0.3));
}
</style>