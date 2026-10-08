<script setup>
/**
 * AgentChat —— 智能体对话核心组件（v2 · WorkBuddy 风格）
 * 新增：三模式切换（⚡直达/📋计划/💬问答）· 执行计时 · 停止 · 步骤折叠
 *      计划确认卡 · 消息操作（复制/重试/反馈）· "/" 命令面板 · 会话历史
 */
import { ref, reactive, computed, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { createEngine } from '../../agent/engine'
import { AGENT_PROFILE, agentText } from '../../agent/config'
import { WORKFLOWS } from '../../agent/workflows'

const props = defineProps({
  variant: { type: String, default: 'dock' }
})
const emit = defineEmits(['open'])

const lang = ref('zh')
const T = computed(() => agentText(lang.value))
const engine = createEngine(lang.value)

const messages = reactive([])
const input = ref('')
const busy = ref(false)
const stopped = ref(false)
const mode = ref('agent')
const modeMenu = ref(false)
const cmdMenu = ref(false)
const listEl = ref(null)
const inputEl = ref(null)
const showHistory = ref(false)

/* 计时器（WorkBuddy：每条回复显示耗时） */
let tick = null
const nowMs = ref(0)

const MODES = [
  { id: 'agent', icon: '⚡', name: '直达', desc: '识别后直接执行' },
  { id: 'plan', icon: '📋', name: '计划', desc: '先出执行计划，确认后运行' },
  { id: 'ask', icon: '💬', name: '问答', desc: '只回答问题，不执行动作' }
]
const modeInfo = computed(() => MODES.find((m) => m.id === mode.value) || MODES[0])

function setMode(m) {
  mode.value = m
  engine.setMode(m)
  modeMenu.value = false
}

function scrollBottom() {
  nextTick(() => {
    if (listEl.value) listEl.value.scrollTop = listEl.value.scrollHeight
  })
}

function newAgentMsg(extra = {}) {
  const m = reactive({ role: 'agent', text: '', res: null, steps: [], card: null, done: true, stepsOpen: false, elapsed: 0, ...extra })
  messages.push(m)
  return m
}

/* ── 会话历史（localStorage 持久化） ── */
const HISTORY_KEY = 'qdu_agent_session'
function saveSession() {
  try {
    const slim = messages.slice(-24).map((m) => ({
      role: m.role, text: m.fullText || m.text,
      res: m.res ? { kind: m.res.kind, reply: m.res.reply, layer: m.res.layer, confidence: m.res.confidence, source: m.res.source, chips: m.res.chips, confirmActions: m.res.confirmActions, mode: m.res.mode } : null,
      card: m.card || null
    }))
    localStorage.setItem(HISTORY_KEY, JSON.stringify({ t: Date.now(), msgs: slim }))
  } catch { /* noop */ }
}
function restoreSession() {
  try {
    const d = JSON.parse(localStorage.getItem(HISTORY_KEY) || 'null')
    if (!d || !d.msgs || !d.msgs.length) return false
    messages.length = 0
    d.msgs.forEach((m) => messages.push(reactive({ ...m, steps: [], done: true, stepsOpen: true, elapsed: 0 })))
    showHistory.value = false
    scrollBottom()
    return true
  } catch { return false }
}

async function send(text) {
  const q = (text ?? input.value).trim()
  if (!q || busy.value) return
  input.value = ''
  histIdx.value = -1
  cmdMenu.value = false
  messages.push({ role: 'user', text: q })
  busy.value = true
  stopped.value = false
  scrollBottom()
  saveSession()

  const msg = newAgentMsg({ text: '', thinking: true, done: false, steps: [], stepsOpen: true })
  // 执行计数（协作看板数据源之一）
  try { localStorage.setItem('qdu_agent_exec', String(Number(localStorage.getItem('qdu_agent_exec') || 0) + 1)) } catch { /* noop */ }
  const startedAt = Date.now()
  msg.elapsed = 0
  tick = setInterval(() => { nowMs.value = Date.now(); msg.elapsed = (Date.now() - startedAt) / 1000 }, 100)

  const onStep = (s) => {
    if (stopped.value) throw new Error('已停止')
    const exist = msg.steps.find((x) => x.index === s.index)
    if (exist) Object.assign(exist, s)
    else msg.steps.push({ ...s })
    scrollBottom()
  }

  let res
  try {
    res = await engine.handle(q, { onStep, mode: mode.value })
  } catch (e) {
    res = { kind: 'fallback', reply: stopped.value ? '⏹ 已停止本次执行。' : '内部异常：' + (e.message || e), confidence: 0 }
  }
  clearInterval(tick)
  msg.elapsed = (Date.now() - startedAt) / 1000
  msg.thinking = false
  msg.done = true
  msg.res = res
  msg.fullText = res.reply || ''
  if (res.card) msg.card = res.card
  if (res.mode) mode.value = res.mode
  reveal(msg, msg.fullText)
  if (msg.steps.length) msg.stepsOpen = false // 默认折叠为摘要
  busy.value = false
  scrollBottom()
}

/* ── 打字机揭示（交互感；减弱动效用户直接全显，点击气泡立即补全） ── */
function reduceMotion() {
  try { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches } catch { return false }
}
function reveal(m, full) {
  m.fullText = full || ''
  if (reduceMotion() || !full || full.length < 24) {
    m.text = full || ''
    saveSession()
    return
  }
  m.text = ''
  const step = () => {
    if (!m._tw) return
    m.text = full.slice(0, m.text.length + 4)
    scrollBottom()
    if (m.text.length >= full.length) {
      m._tw = null
      saveSession()
      return
    }
    m._tw = setTimeout(step, 16)
  }
  m._tw = setTimeout(step, 16)
}
function finishReveal(m) {
  if (m && m._tw) {
    clearTimeout(m._tw)
    m._tw = null
    m.text = m.fullText || m.text
    saveSession()
  }
}

function stop() {
  stopped.value = true
}

function runAction(a) {
  if (!a) return
  if (a.type === 'openApp') { emit('open', a.value); return }
  if (a.type === 'url') { window.open(a.value, '_blank', 'noopener'); return }
  if (a.type === 'agent') { send(a.value); return }
  if (a.type === 'reask') { input.value = a.value || ''; inputEl.value?.focus() }
}

function confirmYes() { send('确认') }
function confirmNo() { send('取消') }

/* ── 消息操作：复制 / 重试 / 反馈 ── */
function copyMsg(m) {
  try { navigator.clipboard.writeText(m.text + (m.card ? '\n' + m.card.title : '')) } catch { /* noop */ }
  m.copied = true
  setTimeout(() => { m.copied = false }, 1500)
}
function retryMsg(idx) {
  for (let i = idx - 1; i >= 0; i--) {
    if (messages[i].role === 'user') { send(messages[i].text); return }
  }
}
function dislike(m) {
  m.disliked = !m.disliked
  if (!m.disliked) return
  // 反馈回流：上报社区网关（管理台「👎 反馈」聚合视图），同时本地留底
  try {
    const fb = JSON.parse(localStorage.getItem('qdu_agent_fb') || '[]')
    fb.push({ text: m.text.slice(0, 80), kind: m.res?.kind, ts: Date.now() })
    localStorage.setItem('qdu_agent_fb', JSON.stringify(fb.slice(-100)))
  } catch { /* noop */ }
  fetch('/api/feedback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: (m.text || '').slice(0, 200),
      kind: m.res?.kind || 'dislike',
      detail: '用户点击 👎',
      path: location.hash || '/'
    })
  }).catch(() => { /* 网关未连：本地已留底 */ })
}

/* ── 导出会话（Markdown，便于反馈与存档） ── */
function exportSession() {
  const lines = ['# 智能体会话导出 · ' + new Date().toLocaleString(), '']
  for (const m of messages) {
    if (m.role === 'user') lines.push('**🧑 用户**：' + m.text)
    else {
      lines.push('**🤖 ' + (m.res?.layer === 'plan-confirm' ? '计划执行' : '智能体') + '**：' + m.text)
      if (m.card) { lines.push(''); lines.push('> ' + m.card.title); m.card.rows?.forEach((r) => lines.push('> - ' + r.label + ' ' + r.value)) }
      if (m.steps?.length) m.steps.forEach((s) => lines.push('> - [' + s.status + '] ' + s.label + ' · ' + (s.detail || '')))
      lines.push('')
    }
  }
  try {
    const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'agent-session-' + Date.now() + '.md'
    a.click()
    URL.revokeObjectURL(a.href)
    m0_exported.value = true
  } catch { /* noop */ }
}
const m0_exported = ref(false)

/* ── "/" 命令面板 ── */
const commands = computed(() => Object.values(WORKFLOWS).map((w) => ({
  cmd: '/' + w.id, icon: w.icon, title: w.title, steps: w.steps.length
})))
const filteredCmds = computed(() => {
  const q = input.value.replace(/^\//, '').toLowerCase()
  return commands.value.filter((c) => !q || c.cmd.toLowerCase().includes(q) || c.title.includes(q)).slice(0, 8)
})
function onInput() {
  cmdMenu.value = input.value.startsWith('/') && input.value.length > 0
}
function pickCmd(c) {
  const wf = WORKFLOWS[c.cmd.slice(1)]
  input.value = ''
  cmdMenu.value = false
  send(wf ? wf.title : c.title)
}

/* ── 语音输入 ── */
const speechSupported = ref(false)
const listening = ref(false)
let rec = null
function initSpeech() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition
  if (!SR) return
  speechSupported.value = true
  rec = new SR()
  rec.lang = 'zh-CN'
  rec.interimResults = false
  rec.onresult = (e) => { input.value = e.results[0][0].transcript; send() }
  rec.onend = () => { listening.value = false }
  rec.onerror = () => { listening.value = false }
}
function toggleVoice() {
  if (!rec) return
  if (listening.value) { rec.stop(); listening.value = false; return }
  try { rec.start(); listening.value = true } catch { /* noop */ }
}

const layerLabel = (l) => ({ intent: '意图命中', faq: '知识库', app: '应用检索', cloud: '云端推理', none: '未识别', 'clarify-resume': '多轮续接', 'plan-confirm': '计划执行' }[l] || l)

/* ── 输入历史：↑/↓ 回溯（TUI 同款，减少重复输入） ── */
const histIdx = ref(-1)
function onHistKey(e) {
  if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return
  let h = []
  try { h = JSON.parse(localStorage.getItem('qdu_chat_history_v1') || '[]') } catch { h = [] }
  if (!h.length) return
  if (e.key === 'ArrowUp') { histIdx.value = Math.min(histIdx.value + 1, h.length - 1) }
  else { histIdx.value = Math.max(histIdx.value - 1, -1) }
  input.value = histIdx.value === -1 ? '' : h[histIdx.value]
}

const suggestions = AGENT_PROFILE.examples
onMounted(() => {
  // 动态问候（时段 + 画像推送；失败回退静态欢迎，首屏永远有话说）
  let greet = null
  try { greet = engine.greeting() } catch { greet = null }
  const pushesCard = greet && greet.card ? greet.card : {
    title: `🤖 ${AGENT_PROFILE.agentName} 已就绪 · ${MODES.length} 种模式`,
    subtitle: AGENT_PROFILE.subtitle + ' · 支持 "/" 命令直达工作流',
    rows: [
      { icon: '☀️', label: '今日简报：课表 + 日程 + 通知一次看全', value: '说"今日简报"' },
      { icon: '📋', label: '计划模式：先看执行计划再动手', value: '输入框下方切换' },
      { icon: '🧱', label: '校园墙：发帖 / 吐槽 / 失物招领', value: '说"发墙 …"' }
    ],
    actions: [
      { label: '☀️ 今日简报', type: 'reask', value: '今日简报' },
      { label: '哪里有空教室？', type: 'reask', value: '哪里有空教室自习' },
      { label: '看校园墙', type: 'reask', value: '看校园墙' }
    ]
  }
  const hello = newAgentMsg({
    text: '',
    fullText: '',
    card: pushesCard,
    chips: (greet && greet.chips) || ['今日简报', ...suggestions.slice(0, 3)]
  })
  reveal(hello, (greet && greet.reply) || AGENT_PROFILE.welcome)
  initSpeech()
  scrollBottom()
})

onBeforeUnmount(() => {
  if (tick) clearInterval(tick)
  try { messages.forEach((m) => { if (m._tw) { clearTimeout(m._tw); m._tw = null; m.text = m.fullText || m.text } }) } catch { /* noop */ }
})

defineExpose({ send, restoreSession })
</script>

<template>
  <div class="agent-chat" :class="'v-' + props.variant">
    <!-- 顶部工具条：模式 + 历史 -->
    <div class="ac-toolbar">
      <div class="ac-modes">
        <button
          v-for="m in MODES" :key="m.id"
          class="ac-mode" :class="{ on: mode === m.id }"
          :title="m.desc"
          @click="setMode(m.id)"
        >{{ m.icon }} {{ m.name }}</button>
      </div>
      <button class="ac-tool-btn" title="恢复上次对话" @click="showHistory = !showHistory">🕘</button>
      <button class="ac-tool-btn" title="导出会话为 Markdown" @click="exportSession">⇩</button>
    </div>
    <div v-if="showHistory" class="ac-history">
      <button class="ac-chip" @click="restoreSession(); showHistory = false">恢复上次对话</button>
      <button class="ac-chip" @click="messages.length = 0; showHistory = false; engine.reset()">清空重来</button>
    </div>

    <div ref="listEl" class="ac-list">
      <div v-for="(m, i) in messages" :key="i" class="ac-msg" :class="'role-' + m.role">
        <div v-if="m.role === 'user'" class="ac-bubble user">{{ m.text }}</div>

        <div v-else class="ac-bubble agent">
          <div v-if="m.thinking" class="ac-thinking">
            <span class="ac-dot"></span><span class="ac-dot"></span><span class="ac-dot"></span>
            <span class="ac-thinking-text">{{ T.thinking }}…</span>
            <span class="ac-elapsed">⏱ {{ (m.elapsed || 0).toFixed(1) }}s</span>
            <button class="ac-stop" @click="stop">⏹ 停止</button>
          </div>

          <template v-else>
            <div class="ac-text" title="点击立即显示全文" @click="finishReveal(m)">{{ m.text }}<span v-if="m._tw" class="ac-caret">▍</span></div>

            <div v-if="m.res && m.res.layer && m.res.confidence" class="ac-meta">
              <span class="ac-badge">{{ layerLabel(m.res.layer) }}</span>
              <span class="ac-conf">置信度 {{ m.res.confidence }}%</span>
              <span class="ac-conf">⏱ {{ (m.elapsed || 0).toFixed(2) }}s</span>
              <span v-if="m.res.source" class="ac-source">📌 {{ m.res.source }}</span>
            </div>

            <!-- 计划卡（Plan 模式） -->
            <div v-if="m.res && m.res.kind === 'plan' && m.res.plan" class="ac-card plan">
              <div class="ac-card-title">📋 执行计划 · {{ m.res.plan.title }}</div>
              <div class="ac-card-sub">共 {{ m.res.plan.steps.length }} 步 · 确认后开始运行（WorkBuddy Plan 式：先方案后执行）</div>
              <div class="ac-plan-steps">
                <div v-for="(s, j) in m.res.plan.steps" :key="j" class="ac-plan-step">
                  <span class="ac-plan-num">{{ j + 1 }}</span><span>{{ s }}</span>
                </div>
              </div>
            </div>

            <!-- 工作流执行轨迹（可折叠） -->
            <div v-if="m.steps && m.steps.length" class="ac-steps-wrap">
              <button class="ac-steps-toggle" @click="m.stepsOpen = !m.stepsOpen">
                {{ m.stepsOpen ? '▾' : '▸' }} 执行轨迹 · {{ m.steps.length }} 步
                <span class="ac-steps-sum">{{ m.steps.filter(s => s.status === 'done').length }} 完成 · {{ (m.elapsed || 0).toFixed(2) }}s</span>
              </button>
              <div v-show="m.stepsOpen" class="ac-steps">
                <div v-for="s in m.steps" :key="s.index" class="ac-step" :class="'st-' + s.status">
                  <span class="ac-step-icon">{{ s.status === 'running' ? '⏳' : s.status === 'done' ? '✅' : s.status === 'fail' ? '❌' : '💬' }}</span>
                  <span class="ac-step-label">{{ s.label }}</span>
                  <span class="ac-step-detail">{{ s.detail }}</span>
                </div>
              </div>
            </div>

            <!-- 结果卡片 -->
            <div v-if="m.card" class="ac-card">
              <div class="ac-card-title">{{ m.card.title }}</div>
              <div v-if="m.card.subtitle" class="ac-card-sub">{{ m.card.subtitle }}</div>
              <div v-if="m.card.rows && m.card.rows.length" class="ac-card-rows">
                <div v-for="(r, j) in m.card.rows" :key="j" class="ac-row" @click="r.url && runAction({ type: 'url', value: r.url })">
                  <span class="ac-row-icon">{{ r.icon || '•' }}</span>
                  <span class="ac-row-label" :class="{ link: !!r.url }">{{ r.label }}</span>
                  <span class="ac-row-value">{{ r.value }}</span>
                </div>
              </div>
              <div v-if="m.card.source" class="ac-card-source">📌 {{ T.source }}：{{ m.card.source }}</div>
              <div v-if="m.card.note" class="ac-card-note">ℹ️ {{ m.card.note }}</div>
              <div v-if="m.card.actions && m.card.actions.length" class="ac-actions">
                <button v-for="(a, j) in m.card.actions" :key="j" class="ac-action" @click="runAction(a)">{{ a.label }}</button>
              </div>
            </div>

            <!-- 确认 / 取消 -->
            <div v-if="m.res && m.res.confirmActions" class="ac-confirm">
              <button class="ac-btn yes" @click="confirmYes">✓ {{ m.res.kind === 'plan' ? '开始执行' : T.confirm }}</button>
              <button class="ac-btn no" @click="confirmNo">✕ {{ T.cancel }}</button>
            </div>

            <!-- 消息操作 -->
            <div class="ac-msgops">
              <button class="ac-msgop" title="复制" @click="copyMsg(m)">{{ m.copied ? '✓ 已复制' : '⧉ 复制' }}</button>
              <button class="ac-msgop" title="重试" @click="retryMsg(i)">↻ 重试</button>
              <button class="ac-msgop" :class="{ bad: m.disliked }" title="反馈（回流维护）" @click="dislike(m)">👎{{ m.disliked ? ' 已反馈' : '' }}</button>
            </div>

            <div v-if="m.chips && m.chips.length && !m.res?.confirmActions" class="ac-chips">
              <button v-for="(c, j) in m.chips" :key="j" class="ac-chip" @click="send(c)">{{ c }}</button>
            </div>
          </template>
        </div>
      </div>
    </div>

    <!-- "/" 命令面板 -->
    <div v-if="cmdMenu && filteredCmds.length" class="ac-cmdpanel">
      <button v-for="c in filteredCmds" :key="c.cmd" class="ac-cmditem" @click="pickCmd(c)">
        <span>{{ c.icon }}</span><span class="ac-cmdtitle">{{ c.title }}</span><span class="ac-cmdsteps">{{ c.steps }} 步</span>
      </button>
    </div>

    <!-- 输入区 -->
    <div class="ac-inputbar">
      <button v-if="speechSupported" class="ac-voice" :class="{ on: listening }" title="语音输入" @click="toggleVoice">{{ listening ? '🎙️' : '🎤' }}</button>
      <input
        ref="inputEl"
        v-model="input"
        class="ac-input"
        :placeholder="listening ? '正在聆听…' : (busy ? '执行中…' : '/' + ' 命令直达 · ' + T.listening)"
        :disabled="busy && !stopped"
        @input="onInput"
        @keydown.enter.prevent="send()"
        @keydown="onHistKey"
      />
      <button v-if="busy" class="ac-send stop" title="停止" @click="stop">⏹</button>
      <button v-else class="ac-send" :disabled="!input.trim()" @click="send()">➤</button>
    </div>
    <!-- 模式标识（WorkBuddy 同款：输入框下方显示当前模式） -->
    <div class="ac-modebar">
      <span class="ac-modechip">{{ modeInfo.icon }} {{ modeInfo.name }}模式 · {{ modeInfo.desc }}</span>
      <span class="ac-hint">{{ T.hint }}</span>
    </div>
  </div>
</template>

<style scoped>
.agent-chat { display: flex; flex-direction: column; min-height: 0; height: 100%; background: var(--bg, #fff); position: relative; }

.ac-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 8px 10px 4px; background: var(--bg, #fff); }
.ac-modes { display: flex; gap: 5px; }
.ac-mode { border: 1px solid var(--border, #e5eaf2); background: transparent; color: var(--muted, #8a94a6); font-size: 11.5px; padding: 4px 10px; border-radius: 999px; cursor: pointer; font-family: inherit; transition: all 0.15s; }
.ac-mode.on { background: var(--primary, #1b66c9); border-color: var(--primary, #1b66c9); color: #fff; font-weight: 600; }
.ac-tool-btn { border: 1px solid var(--border, #e5eaf2); background: transparent; border-radius: 8px; width: 28px; height: 28px; cursor: pointer; font-size: 13px; }
.ac-history { display: flex; gap: 7px; padding: 4px 12px; }

.ac-list { flex: 1; overflow-y: auto; padding: 10px 12px 6px; display: flex; flex-direction: column; gap: 10px; scroll-behavior: smooth; }
.ac-msg { display: flex; }
.ac-msg.role-user { justify-content: flex-end; }
.ac-msg.role-agent { justify-content: flex-start; }
.ac-bubble { max-width: 92%; border-radius: 14px; padding: 9px 12px; font-size: 13.5px; line-height: 1.6; }
.ac-bubble.user { background: var(--primary, #1b66c9); color: #fff; border-bottom-right-radius: 4px; }
.ac-bubble.agent { background: var(--card, #f7f9fc); border: 1px solid var(--border, #e5eaf2); border-bottom-left-radius: 4px; width: 96%; }
.ac-text { white-space: pre-wrap; word-break: break-word; cursor: pointer; }
.ac-caret { color: #1b66c9; animation: acBlink 0.8s infinite; font-weight: 400; }
@keyframes acBlink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
@media (prefers-reduced-motion: reduce) { .ac-caret { animation: none; } }

.ac-thinking { display: flex; align-items: center; gap: 5px; color: var(--muted, #8a94a6); font-size: 12.5px; flex-wrap: wrap; }
.ac-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--primary, #1b66c9); animation: acBlink 1.2s infinite; }
.ac-dot:nth-child(2) { animation-delay: 0.2s; }
.ac-dot:nth-child(3) { animation-delay: 0.4s; }
@keyframes acBlink { 0%, 80%, 100% { opacity: 0.25; transform: scale(0.8); } 40% { opacity: 1; transform: scale(1); } }
.ac-elapsed { font-variant-numeric: tabular-nums; color: var(--primary, #1b66c9); font-weight: 600; }
.ac-stop { border: 1px solid #d1242f; background: transparent; color: #d1242f; font-size: 11px; padding: 2px 9px; border-radius: 999px; cursor: pointer; font-family: inherit; margin-left: auto; }

.ac-meta { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; align-items: center; }
.ac-badge { font-size: 10.5px; padding: 1px 7px; border-radius: 999px; background: var(--primary-soft, rgba(27, 102, 201, 0.1)); color: var(--primary, #1b66c9); font-weight: 600; }
.ac-conf { font-size: 10.5px; color: var(--muted, #8a94a6); font-variant-numeric: tabular-nums; }
.ac-source { font-size: 10.5px; color: var(--muted, #8a94a6); }

.ac-steps-wrap { margin-top: 8px; border-left: 2px solid var(--primary, #1b66c9); padding-left: 9px; }
.ac-steps-toggle { border: none; background: transparent; font-size: 12px; color: var(--primary, #1b66c9); cursor: pointer; font-family: inherit; font-weight: 600; padding: 0; text-align: left; }
.ac-steps-sum { color: var(--muted, #8a94a6); font-weight: 400; margin-left: 6px; }
.ac-steps { display: flex; flex-direction: column; gap: 5px; margin-top: 6px; }
.ac-step { display: flex; align-items: baseline; gap: 6px; font-size: 12px; }
.ac-step-icon { flex-shrink: 0; }
.ac-step-label { color: var(--text, #24292f); font-weight: 500; }
.ac-step.st-fail .ac-step-label { color: #d1242f; }
.ac-step-detail { color: var(--muted, #8a94a6); font-size: 11.5px; }
.ac-step.st-running .ac-step-detail { color: var(--primary, #1b66c9); }

.ac-card { margin-top: 8px; border: 1px solid var(--border, #e5eaf2); border-radius: 10px; background: var(--bg, #fff); overflow: hidden; }
.ac-card.plan { border-color: var(--primary, #1b66c9); background: linear-gradient(135deg, var(--primary-soft, rgba(27, 102, 201, 0.06)), transparent); }
.ac-card-title { padding: 9px 11px 3px; font-weight: 700; font-size: 13px; color: var(--text, #24292f); }
.ac-card-sub { padding: 0 11px 6px; font-size: 11.5px; color: var(--muted, #8a94a6); }
.ac-plan-steps { padding: 2px 10px 10px; display: flex; flex-direction: column; gap: 5px; }
.ac-plan-step { display: flex; align-items: center; gap: 8px; font-size: 12.5px; color: var(--text, #24292f); }
.ac-plan-num { width: 18px; height: 18px; border-radius: 50%; background: var(--primary, #1b66c9); color: #fff; font-size: 10.5px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.ac-card-rows { padding: 2px 6px 6px; display: flex; flex-direction: column; }
.ac-row { display: flex; align-items: center; gap: 7px; padding: 6px 6px; border-radius: 7px; font-size: 12.5px; }
.ac-row:hover { background: var(--primary-soft, rgba(27, 102, 201, 0.07)); }
.ac-row-icon { flex-shrink: 0; }
.ac-row-label { flex: 1; min-width: 0; color: var(--text, #24292f); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ac-row-label.link { color: var(--primary, #1b66c9); text-decoration: underline; cursor: pointer; }
.ac-row-value { color: var(--muted, #8a94a6); font-size: 11.5px; text-align: right; flex-shrink: 0; max-width: 55%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ac-card-source, .ac-card-note { padding: 4px 11px; font-size: 11px; color: var(--muted, #8a94a6); background: var(--primary-soft, rgba(27, 102, 201, 0.05)); }
.ac-actions { display: flex; flex-wrap: wrap; gap: 6px; padding: 8px 10px; border-top: 1px dashed var(--border, #e5eaf2); }
.ac-action { border: 1px solid var(--primary, #1b66c9); background: var(--bg, #fff); color: var(--primary, #1b66c9); font-size: 12px; padding: 5px 11px; border-radius: 999px; cursor: pointer; font-family: inherit; transition: all 0.15s; }
.ac-action:hover { background: var(--primary, #1b66c9); color: #fff; }

.ac-confirm { display: flex; gap: 8px; margin-top: 8px; }
.ac-btn { flex: 1; padding: 7px 10px; border-radius: 9px; font-size: 13px; font-weight: 600; cursor: pointer; font-family: inherit; border: 1px solid transparent; }
.ac-btn.yes { background: var(--primary, #1b66c9); color: #fff; }
.ac-btn.no { background: transparent; border-color: var(--border, #e5eaf2); color: var(--muted, #8a94a6); }

.ac-msgops { display: flex; gap: 8px; margin-top: 7px; opacity: 0.75; }
.ac-msgop { border: none; background: transparent; color: var(--muted, #8a94a6); font-size: 11px; cursor: pointer; font-family: inherit; padding: 0; }
.ac-msgop:hover { color: var(--primary, #1b66c9); }
.ac-msgop.bad { color: #d1242f; }

.ac-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
.ac-chip { border: 1px solid var(--border, #e5eaf2); background: var(--bg, #fff); color: var(--text, #24292f); font-size: 12px; padding: 4px 10px; border-radius: 999px; cursor: pointer; font-family: inherit; }
.ac-chip:hover { border-color: var(--primary, #1b66c9); color: var(--primary, #1b66c9); }

.ac-cmdpanel { position: absolute; left: 10px; right: 10px; bottom: 96px; background: var(--card, #fff); border: 1px solid var(--border, #e5eaf2); border-radius: 12px; box-shadow: 0 10px 34px rgba(0, 0, 0, 0.16); overflow: hidden; z-index: 5; max-height: 240px; overflow-y: auto; }
.ac-cmditem { display: flex; align-items: center; gap: 9px; width: 100%; border: none; background: transparent; padding: 9px 13px; font-size: 13px; cursor: pointer; font-family: inherit; color: var(--text, #24292f); text-align: left; }
.ac-cmditem:hover { background: var(--primary-soft, rgba(27, 102, 201, 0.08)); }
.ac-cmdtitle { flex: 1; }
.ac-cmdsteps { font-size: 11px; color: var(--muted, #8a94a6); }

.ac-inputbar { display: flex; align-items: center; gap: 7px; padding: 9px 10px 4px; border-top: 1px solid var(--border, #e5eaf2); background: var(--bg, #fff); }
.ac-input { flex: 1; min-width: 0; border: 1px solid var(--border, #e5eaf2); border-radius: 999px; padding: 8px 14px; font-size: 13.5px; font-family: inherit; background: var(--bg, #fff); color: var(--text, #24292f); outline: none; }
.ac-input:focus { border-color: var(--primary, #1b66c9); }
.ac-send { width: 36px; height: 36px; border-radius: 50%; border: none; background: var(--primary, #1b66c9); color: #fff; font-size: 15px; cursor: pointer; flex-shrink: 0; }
.ac-send:disabled { opacity: 0.4; cursor: default; }
.ac-send.stop { background: #d1242f; }
.ac-voice { width: 34px; height: 34px; border-radius: 50%; border: 1px solid var(--border, #e5eaf2); background: var(--bg, #fff); font-size: 15px; cursor: pointer; flex-shrink: 0; }
.ac-voice.on { background: #d1242f22; border-color: #d1242f; animation: acPulse 1s infinite; }
@keyframes acPulse { 0%, 100% { box-shadow: 0 0 0 0 #d1242f55; } 50% { box-shadow: 0 0 0 6px #d1242f00; } }

.ac-modebar { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 3px 12px 8px; background: var(--bg, #fff); }
.ac-modechip { font-size: 10.5px; color: var(--primary, #1b66c9); background: var(--primary-soft, rgba(27, 102, 201, 0.1)); padding: 2px 9px; border-radius: 999px; font-weight: 600; }
.ac-hint { font-size: 10px; color: var(--muted, #8a94a6); text-align: right; }

.v-full .ac-bubble { max-width: 86%; font-size: 14px; }
.v-full .ac-list { padding: 18px 18px 8px; }
</style>
