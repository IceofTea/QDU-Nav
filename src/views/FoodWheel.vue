<script setup>
import { ref, computed, onMounted } from 'vue'
import { foods, halls } from '../data/foods'
import CountUp from '../components/CountUp.vue'
import { useI18n } from '../i18n'

const { t, lang } = useI18n()

const emit = defineEmits(['back'])

const HUNGRY = { name: '饿着😭', campus: '', zone: '', hall: '' }
/** 轮盘旋转动画时长（ms），与 .wheel 的 transition 时长保持一致 */
const SPIN_MS = 3400

const TIERS = [
  { key: 'free', label: '免费', cost: 0, hungry: 0.55, desc: '大概率饿着' },
  { key: 'luck', label: '幸运', cost: 2, hungry: 0.3, desc: '小概率饿着' },
  { key: 'lux', label: '豪华', cost: 5, hungry: 0.15, desc: '基本不饿着' },
  { key: 'top', label: '至尊', cost: 10, hungry: 0.05, desc: '稳稳吃到' }
]

const colors = ['#1b66c9', '#e76f51', '#0f766e', '#d97706', '#7c3aed', '#b63a46', '#0284c7', '#f43f5e']

const hallSegs = [...halls, { name: HUNGRY.name }]

const balance = ref(0)
const tier = ref('free')
const stage = ref('hall')
const rotation = ref(0)
const spinning = ref(false)
const result = ref(null)
const currentHall = ref(null)
const spins = ref(0)
const history = ref([])

const currentSegs = computed(() => {
  if (stage.value === 'hall') return hallSegs
  const hall = currentHall.value
  if (!hall) return []
  let list = foods.filter((f) => f.hall === hall.name).map((f) => f.name).slice(0, 12)
  while (list.length < 6) list = list.concat(list.length ? list.slice(0, 6 - list.length) : ['大众窗口'])
  return list.map((n) => ({ name: n }))
})

const anglePer = computed(() => 360 / currentSegs.value.length)
const gradient = computed(() =>
  currentSegs.value.map((s, i) => `${colors[i % colors.length]} ${i * anglePer.value}deg ${(i + 1) * anglePer.value}deg`).join(', ')
)

const tierInfo = computed(() => TIERS.find((t) => t.key === tier.value))
const canUseTier = (t) => balance.value >= t.cost || t.cost === 0

function tierHungry(roll) {
  return Math.random() < roll.hungry
}

function spin() {
  if (spinning.value) return
  const info = tierInfo.value
  if (info.cost > balance.value) return
  if (stage.value === 'hall') balance.value -= info.cost
  spinning.value = true
  result.value = null

  const segs = currentSegs.value
  const roll = tierHungry(info)
  let target
  if (stage.value === 'hall') {
    if (roll) target = segs.length - 1
    else target = Math.floor(Math.random() * (segs.length - 1))
  } else {
    target = Math.floor(Math.random() * segs.length)
  }

  const extra = 360 * (4 + Math.floor(Math.random() * 4))
  // 指针最终停靠角必须等于目标扇区中心：把当前角度归一化后补足差值，
  // 而不是把绝对目标角直接累加（否则第二次起指针与结果对不上）
  const offset = 360 - target * anglePer.value - anglePer.value / 2
  rotation.value += extra + (((offset - rotation.value) % 360) + 360) % 360

  // 等待 CSS 旋转动画（时长 = SPIN_MS，见 .wheel 的 transition）结束后结算
  setTimeout(() => {
    spinning.value = false
    const hit = segs[target]
    if (stage.value === 'hall') {
      if (hit.name === HUNGRY.name) {
        result.value = { ...HUNGRY, hungry: true }
        spins.value += 1
        pushHistory(null, HUNGRY.name, tier.value)
      } else {
        const hall = halls.find((h) => h.name === hit.name)
        currentHall.value = hall
        result.value = { hallObj: hall, name: hall.name, campus: hall.campus, zone: hall.zone }
        stage.value = 'dish'
      }
    } else {
      const hall = currentHall.value
      result.value = { hallObj: hall, dish: hit.name, name: hall.name + ' · ' + hit.name, campus: hall.campus, zone: hall.zone }
      spins.value += 1
      pushHistory(hall.name, hit.name, tier.value)
      stage.value = 'hall'
    }
  }, SPIN_MS)
}

function pushHistory(hall, dish, t) {
  history.value.unshift({ at: new Date().toLocaleTimeString(), hall: hall || '—', dish, tier: t })
  history.value = history.value.slice(0, 10)
  localStorage.setItem('qdu_wheel_history', JSON.stringify(history.value))
  sessionStorage.setItem('qdu_wheel_spins', String(spins.value))
}

function addBalance(n) {
  balance.value += n
  localStorage.setItem('qdu_wheel_balance', String(balance.value))
}

function pickTier(k) {
  const t = TIERS.find((x) => x.key === k)
  if (canUseTier(t)) tier.value = k
}

onMounted(() => {
  spins.value = Number(sessionStorage.getItem('qdu_wheel_spins')) || 0
  balance.value = Number(localStorage.getItem('qdu_wheel_balance')) || 0
  try {
    history.value = JSON.parse(localStorage.getItem('qdu_wheel_history')) || []
  } catch {
    history.value = []
  }
})

const groupedFoods = computed(() => halls.map((h) => ({ ...h, foods: foods.filter((f) => f.hall === h.name).map((f) => f.name) })))
</script>

<template>
  <div class="view-top">
    <button class="back-btn" @click="emit('back')">{{ t('common.back') }}</button>
    <div class="view-title">{{ t('foodWheel.title') }}</div>
    <div class="view-sub">{{ t('foodWheel.subFull') }} <CountUp :value="spins" /> {{ t('foodWheel.spins') }}</div>
  </div>

  <div class="panel" style="text-align:center;">
    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;">
      <div class="tier-tabs">
        <button
          v-for="t in TIERS"
          :key="t.key"
          class="tier-btn"
          :class="{ active: tier === t.key, disabled: !canUseTier(t) }"
          :title="t.desc"
          @click="pickTier(t.key)"
        >
          {{ t.label }}{{ t.cost ? ' ' + t.cost + '币' : '' }}
        </button>
      </div>
      <div class="balance-box">
        <b>{{ balance }}</b> {{ t('foodWheel.coins') }}
        <button class="btn ghost small" style="margin-left:6px;" @click="addBalance(10)">{{ t('foodWheel.recharge') }}</button>
      </div>
    </div>
    <div class="muted" style="font-size:12px;text-align:left;margin-top:6px;">
      {{ tierInfo.label }}{{ t('foodWheel.tierHint') }}{{ tierInfo.desc }}{{ t('foodWheel.noPayHint') }}
    </div>

    <div class="wheel-wrap">
      <div class="pointer"></div>
      <div class="wheel" :style="{ background: 'conic-gradient(' + gradient + ')', transform: `rotate(${rotation}deg)` }"></div>
    </div>

    <div v-if="result" class="result-box" style="text-align:center;">
      <div class="muted" style="font-size:13px;">{{ result.hungry ? t('foodWheel.hungryResult') : stage === 'dish' ? t('foodWheel.hallResult') : t('foodWheel.恭喜抽中') }}</div>
      <div style="font-size:22px;font-weight:800;margin:4px 0;">{{ result.hungry ? '😭 ' + result.name : '🍽️ ' + result.name }}</div>
      <div v-if="!result.hungry" class="muted" style="font-size:13px;">{{ result.campus }} · {{ result.zone }}</div>
    </div>
    <div v-else class="muted" style="margin:10px 0;">
      {{ stage === 'hall' ? t('foodWheel.hallHint') : t('foodWheel.dishHint2') }}
    </div>

    <button
      class="btn accent"
      style="margin-top:8px;"
      :disabled="spinning || (stage === 'hall' && !canUseTier(tierInfo))"
      @click="spin"
    >
      {{ spinning ? t('foodWheel.spinning') : stage === 'hall' ? t('foodWheel.spinHall') : t('foodWheel.spinDish') }}
    </button>
    <div v-if="stage === 'dish' && result" class="muted" style="font-size:12px;margin-top:6px;">{{ t('foodWheel.dishHint') }}</div>
  </div>

  <div class="panel" style="margin-top:16px;">
    <div class="section-title" style="margin:0 0 12px;"><span class="bar"></span>{{ t('foodWheel.menuTitle') }}{{ foods.length }}{{ t('foodWheel.menuUnit') }}</div>
    <div v-for="g in groupedFoods" :key="g.name" style="margin-bottom:12px;">
      <div style="font-weight:700;font-size:13px;margin-bottom:4px;">{{ g.name }} <span class="muted" style="font-weight:400;">{{ g.campus }} · {{ g.zone }}</span></div>
      <div style="display:flex;flex-wrap:wrap;gap:6px;">
        <span v-for="f in g.foods" :key="f" class="food-chip">{{ f }}</span>
      </div>
    </div>
  </div>

  <div class="panel" style="margin-top:16px;">
    <div class="section-title" style="margin:0 0 12px;"><span class="bar"></span>{{ t('foodWheel.historyTitle') }}{{ history.length }}{{ t('foodWheel.historyUnit') }}</div>
    <div v-if="!history.length" class="muted" style="text-align:center;padding:14px;">{{ t('foodWheel.noHistory') }}</div>
    <table v-else class="data">
      <thead><tr><th>{{ t('foodWheel.tableTime') }}</th><th>{{ t('foodWheel.tableTier') }}</th><th>{{ t('foodWheel.tableHall') }}</th><th>{{ t('foodWheel.tableDish') }}</th></tr></thead>
      <tbody>
        <tr v-for="(h, i) in history" :key="i">
          <td>{{ h.at }}</td>
          <td>{{ h.tier }}</td>
          <td>{{ h.hall }}</td>
          <td><b>{{ h.dish }}</b></td>
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
  margin: 14px auto 18px;
}
.wheel {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 6px solid var(--card);
  box-shadow: 0 10px 30px rgba(27, 102, 201, 0.2);
  /* 时长与 JS 常量 SPIN_MS(3400ms) 同步 */
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
.tier-tabs { display: flex; gap: 6px; flex-wrap: wrap; }
.tier-btn {
  border: 1px solid var(--border);
  background: var(--card);
  color: var(--text);
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  padding: 6px 10px;
  border-radius: 999px;
  cursor: pointer;
}
.tier-btn.active { background: var(--primary); color: #fff; border-color: var(--primary); }
.tier-btn.disabled { opacity: 0.45; cursor: not-allowed; }
.balance-box { font-size: 13px; }
.food-chip {
  font-size: 11px;
  padding: 3px 9px;
  border-radius: 999px;
  background: var(--soft-fg);
  border: 1px solid var(--border);
  color: var(--text);
}
</style>