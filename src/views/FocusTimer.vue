<script setup>
/**
 * ════════════════════════════════════════════════════════════════════
 * @模块路径  src/views/FocusTimer.vue
 * @职责      番茄钟页：预设选择 + 倒计时 + 状态机流转 + 今日/周统计 +
 *            艾宾浩斯到期提醒 —— studyPlan.js 的视图层（逻辑全在工具层）
 * @路由      #/app/focus（VIEWS.focus + data/apps 双登记）
 * @数据      src/utils/studyPlan.js（Pomodoro/周报/复习卡，本机持久化）
 * @交互      后台切回自动校准（visibilitychange 补差）· 完成桌面通知 ·
 *            中断二次确认 · 到期复习一键跳提醒中心
 * @被谁用    App.vue 路由；任务链 study 一键开番茄深链本页
 * ════════════════════════════════════════════════════════════════════
 */
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import {
  Pomodoro, POMO_PRESETS, todayFocusMin, weekFocus, dueReviews,
  doneReviewStep, listReviewCards, addReviewCard
} from '../utils/studyPlan'

const emit = defineEmits(['back', 'goto'])

const pomo = ref(new Pomodoro('classic'))
const left = ref(0)            // 剩余秒
const running = ref(false)
const label = ref('')
const todayMin = ref(0)
const week = ref([])
const due = ref([])
const cards = ref([])
const newSubject = ref('')
const toast = ref('')
let timer = null
let lastTick = 0

const mmss = computed(() => {
  const s = Math.max(0, left.value)
  return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0')
})
const progress = computed(() => {
  const total = pomo.value.phase === 'focus' ? pomo.value.focusMin * 60
    : pomo.value.phase === 'short' ? pomo.value.shortMin * 60
    : pomo.value.phase === 'long' ? pomo.value.longMin * 60 : 1
  return total ? Math.min(100, Math.round(((total - left.value) / total) * 100)) : 0
})
const phaseName = computed(() => pomo.value.label())

function showToast(m) { toast.value = m; setTimeout(() => { toast.value = '' }, 2600) }
function refreshStats() {
  try {
    todayMin.value = todayFocusMin()
    week.value = weekFocus()
    due.value = dueReviews()
    cards.value = listReviewCards()
  } catch { /* 隐私模式兜底 */ }
}
function setPreset(k) {
  if (running.value) { showToast('进行中，先暂停再换预设'); return }
  pomo.value = new Pomodoro(k)
  left.value = 0
}
function start() {
  if (running.value) return
  if (pomo.value.phase === 'idle') left.value = pomo.value.startFocus()
  running.value = true
  lastTick = Date.now()
  timer = setInterval(tick, 1000)
  label.value = label.value || ('专注 ' + new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }))
}
function tick() {
  // 后台切回补差（setInterval 被节流时按墙钟追秒，误差 <2s）
  const nowT = Date.now()
  const elapsed = Math.round((nowT - lastTick) / 1000)
  lastTick = nowT
  left.value -= Math.min(Math.max(1, elapsed), 5)
  if (left.value <= 0) finishPhase()
}
function pause() {
  running.value = false
  if (timer) clearInterval(timer)
  timer = null
}
function giveUp() {
  if (!running.value) return
  if (!confirm('中断本次？已计时长不计入完成。')) return
  const total = pomo.value.phase === 'focus' ? pomo.value.focusMin * 60 : 0
  pomo.value.abort(total - left.value)
  pause()
  left.value = 0
  refreshStats()
}
function finishPhase() {
  pause()
  const r = pomo.value.finish()
  refreshStats()
  try {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(r.next === 'idle' ? '🍅 番茄完成' : '⏰ 时间到', {
        body: r.next === 'focus' ? '开始专注' : r.next === 'short' ? '短休息一下' : r.next === 'long' ? '长休息，好好放松' : '本轮结束，可再开一轮'
      })
    }
  } catch { /* noop */ }
  if (r.next === 'idle') { left.value = 0; showToast('🍅 本轮完成，已记入统计') }
  else { left.value = r.nextSec; showToast('进入' + (r.next === 'focus' ? '专注' : r.next === 'short' ? '短休息' : '长休息')); start() }
}
async function askNotify() {
  try {
    if ('Notification' in window && Notification.permission === 'default') await Notification.requestPermission()
  } catch { /* noop */ }
}
function addCard() {
  try {
    addReviewCard(newSubject.value)
    newSubject.value = ''
    refreshStats()
    showToast('已加入复习计划 ✓')
  } catch (e) { showToast(e.message) }
}
function doneStep(cardId, step) { doneReviewStep(cardId, step); refreshStats() }
function onVis() {
  // 切回前台时刷新到期（Reminder 引擎顺带扫定时发布，互补）
  if (!document.hidden) refreshStats()
}

onMounted(() => {
  refreshStats()
  askNotify()
  document.addEventListener('visibilitychange', onVis)
})
onBeforeUnmount(() => {
  pause()
  document.removeEventListener('visibilitychange', onVis)
})
</script>

<template>
  <div class="fc-wrap">
    <div class="fc-head">
      <button class="back" @click="emit('back')">‹ 返回</button>
      <b>🍅 番茄钟</b>
      <span class="fc-today">今日 {{ todayMin }} 分钟</span>
    </div>
    <div v-if="toast" class="fc-toast">{{ toast }}</div>

    <div class="fc-presets">
      <button
        v-for="(p, k) in { classic: { name: '经典 25+5' }, deep: { name: '深度 50+10' }, sprint: { name: '冲刺 15+3' } }"
        :key="k" :class="{ on: pomo.preset === k }" @click="setPreset(k)"
      >{{ p.name }}</button>
    </div>

    <div class="fc-clock">
      <div class="fc-phase">{{ phaseName }}</div>
      <div class="fc-time">{{ left ? mmss : (pomo.phase === 'idle' ? '准备好了吗？' : mmss) }}</div>
      <div class="fc-bar"><i :style="{ width: progress + '%' }"></i></div>
      <div class="fc-btns">
        <button v-if="!running" class="primary" @click="start">{{ pomo.phase === 'idle' ? '开始专注' : '继续' }}</button>
        <button v-else @click="pause">暂停</button>
        <button v-if="running" class="danger" @click="giveUp">中断</button>
      </div>
      <input v-model="label" class="fc-label" placeholder="这次在学什么？（如：高数 ch3）" maxlength="40" />
    </div>

    <div class="fc-sec">
      <b>📅 近 7 天专注（分钟）</b>
      <div class="fc-week">
        <div v-for="d in week" :key="d.label" class="wk">
          <div class="wk-bar" :style="{ height: Math.min(80, d.min) + 'px' }"></div>
          <span>{{ d.label }}</span><em>{{ d.min }}</em>
        </div>
      </div>
    </div>

    <div class="fc-sec">
      <b>🧠 艾宾浩斯 · 今日到期（{{ due.length }}）</b>
      <div v-if="!due.length" class="fc-empty">今日无到期复习，稳 👍</div>
      <div v-for="d in due.slice(0, 10)" :key="d.card.id + '-' + d.step" class="fc-due">
        <span>{{ d.card.subject }} · 第 {{ d.step }} 步（+{{ d.gap }}天）</span>
        <button @click="doneStep(d.card.id, d.step)">✓ 完成</button>
      </div>
      <div class="fc-add">
        <input v-model="newSubject" placeholder="新建复习卡：如 线代 ch2" maxlength="60" @keyup.enter="addCard" />
        <button class="primary" @click="addCard">加入计划</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.fc-wrap { display: flex; flex-direction: column; gap: 12px; padding-bottom: 30px; }
.fc-head { display: flex; align-items: center; gap: 10px; }
.fc-head .back { border: 1px solid #e5e5e5; background: #fafafa; border-radius: 10px; padding: 3px 10px; cursor: pointer; }
.fc-today { margin-left: auto; font-size: 12px; color: #166534; background: #dcfce7; border-radius: 8px; padding: 1px 8px; }
.fc-toast { background: #eff6ff; color: #1b66c9; font-size: 13px; padding: 6px 12px; border-radius: 8px; }
.fc-presets { display: flex; gap: 8px; }
.fc-presets button { border: 1px solid #e5e5e5; background: #fff; border-radius: 14px; padding: 4px 14px; cursor: pointer; }
.fc-presets button.on { background: #1b66c9; color: #fff; border-color: #1b66c9; }
.fc-clock { text-align: center; border: 1px solid #eee; border-radius: 16px; padding: 22px 16px; background: linear-gradient(180deg, #fff, #f8fafc); }
.fc-phase { font-size: 13px; color: #666; }
.fc-time { font-size: 52px; font-weight: 800; font-variant-numeric: tabular-nums; margin: 6px 0 10px; }
.fc-bar { height: 8px; background: #eee; border-radius: 999px; overflow: hidden; }
.fc-bar i { display: block; height: 100%; background: linear-gradient(90deg, #e11d48, #f59e0b); }
.fc-btns { display: flex; gap: 8px; justify-content: center; margin-top: 12px; }
.fc-btns button { border: 1px solid #e5e5e5; background: #fff; border-radius: 12px; padding: 7px 22px; cursor: pointer; }
.fc-btns button.primary { background: #e11d48; border-color: #e11d48; color: #fff; }
.fc-btns button.danger { color: #e11d48; }
.fc-label { margin-top: 10px; border: 1px solid #ddd; border-radius: 10px; padding: 8px 12px; width: min(360px, 90%); }
.fc-sec { border: 1px solid #eee; border-radius: 12px; padding: 12px 14px; background: #fff; }
.fc-week { display: flex; gap: 8px; align-items: flex-end; margin-top: 8px; }
.wk { flex: 1; text-align: center; font-size: 11px; color: #888; display: flex; flex-direction: column; gap: 2px; align-items: center; }
.wk-bar { width: 70%; background: linear-gradient(180deg, #1b66c9, #93c5fd); border-radius: 4px 4px 0 0; min-height: 3px; }
.wk em { font-style: normal; color: #333; font-weight: 700; }
.fc-empty { color: #999; font-size: 13px; padding: 8px 0; }
.fc-due { display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px dashed #eee; font-size: 13px; }
.fc-due button { border: 1px solid #bbf7d0; background: #f0fdf4; color: #166534; border-radius: 10px; padding: 2px 12px; cursor: pointer; }
.fc-add { display: flex; gap: 6px; margin-top: 8px; }
.fc-add input { flex: 1; border: 1px solid #ddd; border-radius: 10px; padding: 7px 12px; }
.fc-add button.primary { background: #1b66c9; color: #fff; border: none; border-radius: 10px; padding: 7px 16px; cursor: pointer; }
</style>
