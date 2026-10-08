<script setup>
/**
 * ════════════════════════════════════════════════════════════════════
 * @模块路径  src/views/ReminderCenter.vue
 * @职责      提醒中心：本地定时提醒引擎（日程/课程/自定义倒计时）——
 *            页面打开即启动轮询检查，到期弹 Toast + 声音提示（可关）+
 *            桌面 Notification（权限允许时），并汇总"今日提醒/已过期/完成"
 * @路由      #/app/reminder（apps.js + router.js 双登记）
 * @数据      自定义提醒 localStorage: qdu_agent_reminders；日程读 qdu_agent_schedule
 *            （与智能体 addSchedule/workflows 同一数据源，打通闭环）
 * @被谁用    用户手动管理；智能体"提醒我"产生的日程自动进入本中心
 * @提醒引擎  30s 轮询比对 now>=fireAt 且未触发 → toast+notification+记录
 * ════════════════════════════════════════════════════════════════════
 */
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

const emit = defineEmits(['back'])

const REM_KEY = 'qdu_agent_reminders'
const SCHED_KEY = 'qdu_agent_schedule'
const FIRED_KEY = 'qdu_agent_reminders_fired'

const reminders = ref(loadRem())
const schedule = ref(loadSched())
const fired = ref(loadFired())
const toast = ref('')
const soundOn = ref(true)
let timer = null

/* 新建表单 */
const newTitle = ref('')
const newWhen = ref('')   // datetime-local 值
const newRepeat = ref('none')

function loadRem() { try { return JSON.parse(localStorage.getItem(REM_KEY) || '[]') } catch { return [] } }
function saveRem() { try { localStorage.setItem(REM_KEY, JSON.stringify(reminders.value)) } catch { /* noop */ } }
function loadSched() { try { return JSON.parse(localStorage.getItem(SCHED_KEY) || '[]') } catch { return [] } }
function loadFired() { try { return JSON.parse(localStorage.getItem(FIRED_KEY) || '[]') } catch { return [] } }
function saveFired() { try { localStorage.setItem(FIRED_KEY, JSON.stringify(fired.value.slice(-50))) } catch { /* noop */ } }

function fmt(ts) {
  const d = new Date(ts)
  return (d.getMonth() + 1) + '-' + d.getDate() + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0')
}
function untilText(ts) {
  const diff = ts - Date.now()
  if (diff < 0) return '已到期'
  const m = Math.floor(diff / 60000)
  if (m < 60) return m + ' 分钟后'
  const h = Math.floor(m / 60)
  if (h < 24) return h + ' 小时后'
  return Math.floor(h / 24) + ' 天后'
}
function toLocalInput(ts) {
  const d = new Date(ts)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** 汇总：今日日程（来自智能体） + 自定义提醒（合并视图） */
const merged = computed(() => {
  const now = Date.now()
  const items = []
  for (const r of reminders.value) {
    items.push({ id: 'r' + r.id, kind: 'custom', title: r.title, ts: r.ts, repeat: r.repeat, done: fired.value.includes('r' + r.id), raw: r })
  }
  for (const s of schedule.value) {
    const ts = guessTsOfSched(s)
    items.push({ id: 's' + s.id, kind: 'sched', title: s.thing, label: s.label, ts, done: !!s.done })
  }
  return items.sort((a, b) => (a.ts || 0) - (b.ts || 0))
})

const todayCount = computed(() => {
  const d = new Date().toDateString()
  return merged.value.filter((m) => m.ts && new Date(m.ts).toDateString() === d).length
})
const pendingCount = computed(() => merged.value.filter((m) => !m.done).length)
const expiredCount = computed(() => merged.value.filter((m) => m.ts && m.ts < Date.now() && !m.done).length)

/** 由日程结构推算时间戳（day=周几, hour=小时；智能体写入格式） */
function guessTsOfSched(s) {
  if (!s) return 0
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const today = now.getDay() || 7
  let diff = ((s.day || today) - today + 7) % 7
  const d = new Date(now.getTime() + diff * 86400000)
  if (s.hour != null) d.setHours(s.hour, 0, 0, 0)
  else d.setHours(23, 59, 0, 0)
  return d.getTime()
}

function addReminder() {
  if (!newTitle.value.trim()) { showToast('给提醒起个名字', true); return }
  const ts = newWhen.value ? new Date(newWhen.value).getTime() : Date.now() + 10 * 60000
  reminders.value.push({
    id: Date.now().toString(36),
    title: newTitle.value.trim(),
    ts,
    repeat: newRepeat.value,
    createdAt: Date.now()
  })
  saveRem()
  newTitle.value = ''
  newWhen.value = ''
  showToast('提醒已创建 ✓ 到点自动弹出')
}

function removeRem(id) {
  reminders.value = reminders.value.filter((r) => r.id !== id)
  saveRem()
}

function clearFired() {
  fired.value = []
  saveFired()
  showToast('已清空触发记录')
}

function showToast(msg, err) {
  toast.value = msg
  setTimeout(() => { toast.value = '' }, 3200)
  void err
}

/** 简单提示音（WebAudio，无外部资源） */
function beep() {
  if (!soundOn.value) return
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.connect(g); g.connect(ctx.destination)
    o.frequency.value = 880
    g.gain.value = 0.06
    o.start()
    setTimeout(() => { o.stop(); ctx.close() }, 320)
  } catch { /* noop */ }
}

/** 桌面通知（需权限；拒绝则仅页内 toast） */
function notify(title, body) {
  try {
    if (window.Notification && Notification.permission === 'granted') {
      new Notification(title, { body })
    } else if (window.Notification && Notification.permission !== 'denied') {
      Notification.requestPermission()
    }
  } catch { /* noop */ }
}

/** 提醒引擎：30s tick */
function tickEngine() {
  const now = Date.now()
  schedule.value = loadSched() // 同步智能体新写入
  for (const r of reminders.value) {
    const id = 'r' + r.id
    if (r.ts <= now && !fired.value.includes(id)) {
      fired.value.push(id)
      saveFired()
      showToast('⏰ ' + r.title)
      beep()
      notify('校园智能体 · 提醒', r.title)
      if (r.repeat === 'daily') {
        // 每日重复：顺延一天重新挂起
        r.ts = r.ts + 86400000
        fired.value = fired.value.filter((x) => x !== id)
        saveFired()
        saveRem()
      }
    }
  }
}

/* ── 导出 .ics（iCalendar 标准）：双击/传手机即可加入系统日历 ── */
function pad(n) { return String(n).padStart(2, '0') }
function fmtIcs(dt) {
  return dt.getUTCFullYear() + pad(dt.getUTCMonth() + 1) + pad(dt.getUTCDate()) + 'T' +
    pad(dt.getUTCHours()) + pad(dt.getUTCMinutes()) + '00Z'
}
function toICS() {
  const items = merged.value.filter((m) => m.ts && !m.done)
  if (!items.length) { showToast('没有可导出的待办日程', true); return }
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//QDU Agent//ReminderCenter//CN', 'CALSCALE:GREGORIAN']
  for (const m of items) {
    const start = new Date(m.ts)
    const end = new Date(m.ts + 30 * 60000)
    lines.push('BEGIN:VEVENT')
    lines.push('UID:' + m.id + '@agent-reminder')
    lines.push('DTSTAMP:' + fmtIcs(new Date()))
    lines.push('DTSTART:' + fmtIcs(start))
    lines.push('DTEND:' + fmtIcs(end))
    lines.push('SUMMARY:' + String(m.title || '提醒').replace(/[\r\n]/g, ' '))
    lines.push('DESCRIPTION:' + String(m.label || '来自校园智能体提醒中心').replace(/[\r\n]/g, ' '))
    lines.push('BEGIN:VALARM', 'TRIGGER:-PT10M', 'ACTION:DISPLAY', 'DESCRIPTION:提醒', 'END:VALARM')
    lines.push('END:VEVENT')
  }
  lines.push('END:VCALENDAR')
  try {
    const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'reminders-' + new Date().toISOString().slice(0, 10) + '.ics'
    a.click()
    URL.revokeObjectURL(a.href)
    showToast('已导出 ' + items.length + ' 条日程 · 传手机打开即入系统日历')
  } catch { showToast('导出失败', true) }
}

function jumpToAgent() {
  try { localStorage.setItem('qdu_agent_inbox', '我的日程') } catch { /* noop */ }
  emit('back')
  setTimeout(() => { location.hash = '#/app/assistant' }, 120)
}

onMounted(() => {
  tickEngine()
  timer = setInterval(tickEngine, 30000)
  if (window.Notification && Notification.permission === 'default') {
    // 首次进入温和请求权限（拒绝也不影响页内提醒）
    try { Notification.requestPermission() } catch { /* noop */ }
  }
})
onBeforeUnmount(() => { if (timer) clearInterval(timer) })
</script>

<template>
  <div class="rc">
    <div class="rc-head">
      <button class="rc-back" @click="emit('back')">‹ 返回</button>
      <div class="rc-title">⏰ 提醒中心 <span class="rc-sub">定时引擎 30s · 页内弹窗 + 桌面通知 + 提示音 · 与智能体日程打通</span></div>
      <label class="rc-sound"><input type="checkbox" v-model="soundOn" /> 🔔 声音</label>
      <button class="rc-mini" @click="jumpToAgent">🤖 去智能体加提醒</button>
      <button class="rc-mini" @click="toICS">📅 导出 .ics（手机日历）</button>
    </div>

    <!-- 概览 -->
    <div class="rc-stats">
      <div class="rc-stat"><div class="rc-v">{{ todayCount }}</div><div class="rc-l">今日提醒</div></div>
      <div class="rc-stat"><div class="rc-v">{{ pendingCount }}</div><div class="rc-l">待办</div></div>
      <div class="rc-stat warn"><div class="rc-v">{{ expiredCount }}</div><div class="rc-l">已过期未处理</div></div>
      <div class="rc-stat"><div class="rc-v">{{ reminders.length }}</div><div class="rc-l">自定义提醒</div></div>
    </div>

    <!-- 新建 -->
    <div class="rc-form">
      <input v-model="newTitle" class="rc-input" maxlength="80" placeholder="提醒什么？（如：交作业 / 去开组会 / 打卡健身房）" />
      <input v-model="newWhen" class="rc-input rc-when" type="datetime-local" />
      <select v-model="newRepeat" class="rc-select">
        <option value="none">不重复</option>
        <option value="daily">每天</option>
      </select>
      <button class="rc-add" @click="addReminder">＋ 创建提醒</button>
      <button class="rc-mini" @click="clearFired">清空记录</button>
    </div>

    <!-- 列表 -->
    <div class="rc-list">
      <div v-if="!merged.length" class="rc-empty">
        还没有提醒——对我说「<b>提醒我明天下午三点开会</b>」，或在上方创建 ⏰
      </div>
      <div v-for="m in merged" :key="m.id" class="rc-item" :class="{ done: m.done, expired: m.ts && m.ts < Date.now() && !m.done }">
        <div class="rc-item-main">
          <div class="rc-item-title">
            <span class="rc-kind" :class="m.kind">{{ m.kind === 'sched' ? '📅 智能体日程' : '⏰ 自定义' }}</span>
            {{ m.title }}
          </div>
          <div class="rc-item-meta">
            <span v-if="m.label">{{ m.label }}</span>
            <span v-else-if="m.ts">{{ fmt(m.ts) }}</span>
            <span class="rc-until">{{ m.ts ? untilText(m.ts) : '' }}</span>
            <span v-if="m.repeat === 'daily'" class="rc-repeat">🔁 每天</span>
            <span v-if="m.done" class="rc-ok">✅ 已触发</span>
          </div>
        </div>
        <button v-if="m.kind === 'custom'" class="rc-del" @click="removeRem(m.raw.id)">删除</button>
      </div>
    </div>

    <div class="rc-tips">
      💡 引擎说明：页面打开即启动 30s 轮询；到期 → 页内 Toast + 蜂鸣 + 桌面通知（已授权时）。
      每日重复提醒会自动顺延。智能体产生的日程与本中心同源（qdu_agent_schedule），双端打通零延迟。
    </div>

    <div v-if="toast" class="rc-toast">{{ toast }}</div>
  </div>
</template>

<style scoped>
.rc { display: flex; flex-direction: column; gap: 13px; }
.rc-head { display: flex; align-items: center; gap: 11px; flex-wrap: wrap; }
.rc-back { border: 1px solid var(--border, #e5eaf2); background: var(--card, #fff); color: var(--text, #24292f); border-radius: 999px; padding: 6px 14px; cursor: pointer; font-family: inherit; font-size: 13px; }
.rc-title { flex: 1; font-size: 17px; font-weight: 800; color: var(--text, #24292f); min-width: 200px; }
.rc-sub { display: block; font-size: 11px; color: var(--muted, #8a94a6); font-weight: 400; margin-top: 2px; }
.rc-sound { font-size: 12.5px; color: var(--muted, #8a94a6); display: flex; align-items: center; gap: 4px; }
.rc-mini { border: 1px solid var(--border, #e5eaf2); background: var(--card, #fff); color: var(--muted, #8a94a6); font-size: 12px; padding: 5px 12px; border-radius: 999px; cursor: pointer; font-family: inherit; }
.rc-mini:hover { border-color: var(--primary, #1b66c9); color: var(--primary, #1b66c9); }

.rc-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 11px; }
.rc-stat { border: 1px solid var(--border, #e5eaf2); background: var(--card, #fff); border-radius: 13px; padding: 13px 15px; text-align: center; }
.rc-stat.warn .rc-v { color: #d97706; }
.rc-v { font-size: 27px; font-weight: 800; color: var(--primary, #1b66c9); font-variant-numeric: tabular-nums; }
.rc-l { font-size: 11.5px; color: var(--muted, #8a94a6); margin-top: 2px; }

.rc-form { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; border: 1px solid var(--border, #e5eaf2); background: var(--card, #fff); border-radius: 13px; padding: 12px 14px; }
.rc-input { border: 1px solid var(--border, #e5eaf2); border-radius: 9px; padding: 8px 12px; font-size: 13.5px; font-family: inherit; background: var(--bg, #fff); color: var(--text, #24292f); outline: none; flex: 1; min-width: 200px; }
.rc-when { flex: 0 1 210px; min-width: 180px; }
.rc-select { border: 1px solid var(--border, #e5eaf2); border-radius: 9px; padding: 8px 10px; font-size: 13px; font-family: inherit; background: var(--bg, #fff); color: var(--text, #24292f); }
.rc-add { border: none; background: var(--primary, #1b66c9); color: #fff; padding: 9px 18px; border-radius: 999px; cursor: pointer; font-family: inherit; font-size: 13.5px; font-weight: 600; }

.rc-list { display: flex; flex-direction: column; gap: 9px; }
.rc-empty { padding: 36px; text-align: center; color: var(--muted, #8a94a6); font-size: 13.5px; background: var(--card, #fff); border: 1px dashed var(--border, #e5eaf2); border-radius: 13px; line-height: 1.8; }
.rc-item { display: flex; align-items: center; gap: 12px; border: 1px solid var(--border, #e5eaf2); background: var(--card, #fff); border-radius: 12px; padding: 11px 15px; }
.rc-item.done { opacity: 0.55; }
.rc-item.expired { border-color: #d9770666; background: rgba(217, 119, 6, 0.04); }
.rc-item-main { flex: 1; min-width: 0; }
.rc-item-title { font-size: 14px; font-weight: 600; color: var(--text, #24292f); }
.rc-kind { font-size: 10.5px; border-radius: 999px; padding: 1px 8px; margin-right: 7px; font-weight: 700; }
.rc-kind.sched { background: var(--primary-soft, rgba(27, 102, 201, 0.12)); color: var(--primary, #1b66c9); }
.rc-kind.custom { background: rgba(217, 119, 6, 0.12); color: #d97706; }
.rc-item-meta { display: flex; gap: 10px; font-size: 11.5px; color: var(--muted, #8a94a6); margin-top: 4px; flex-wrap: wrap; }
.rc-until { color: var(--primary, #1b66c9); font-weight: 600; }
.rc-repeat { color: #7c3aed; }
.rc-ok { color: #2e7d32; }
.rc-del { border: none; background: transparent; color: var(--muted, #8a94a6); font-size: 12px; cursor: pointer; font-family: inherit; }
.rc-del:hover { color: #d1242f; }

.rc-tips { font-size: 11.5px; color: var(--muted, #8a94a6); background: var(--primary-soft, rgba(27, 102, 201, 0.05)); border-radius: 10px; padding: 10px 14px; line-height: 1.8; }

.rc-toast { position: fixed; top: 74px; left: 50%; transform: translateX(-50%); background: #d97706; color: #fff; padding: 12px 26px; border-radius: 999px; font-size: 14.5px; font-weight: 700; box-shadow: 0 10px 34px rgba(0, 0, 0, 0.28); z-index: 999; animation: rcPop 0.3s ease; max-width: 88vw; text-align: center; }
@keyframes rcPop { from { opacity: 0; transform: translate(-50%, -12px); } to { opacity: 1; transform: translate(-50%, 0); } }
</style>
