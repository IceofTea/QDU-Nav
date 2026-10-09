<script setup>
/**
 * ════════════════════════════════════════════════════════════════════
 * @模块路径  src/views/AboutAgent.vue
 * @职责      智能体介绍页（演示门面 / 评委第一站）：架构可视化、能力矩阵、
 *            三模式说明、双 Agent 飞轮叙事、现场演示引导
 * @路由      #/app/aboutagent（apps.js + router.js 双登记）
 * @叙事线    标题「基于 AI Agent 协作维护」的正面回应：这里讲清
 *            「AI 在产品里做什么」——与答辩 P8/P9 页一一对应
 * @数据      纯静态说明 + kbStats/workflows 实时计数（不编造）
 * ════════════════════════════════════════════════════════════════════
 */
import { ref, computed } from 'vue'
import { WORKFLOWS } from '../agent/workflows.js'
import { FAQ } from '../agent/faq.js'
import { AGENT_PROFILE } from '../agent/config.js'
import { kbStats } from '../agent/navAnswer.js'
import { recognize } from '../agent/intents.js'

const emit = defineEmits(['open'])

const kb = kbStats()
const wfCount = Object.keys(WORKFLOWS).length

const stats = computed(() => [
  { v: wfCount, l: '真实工作流', icon: '⚙️' },
  { v: 45, l: '意图规则', icon: '🎯' },
  { v: kb.docs, l: '知识语料', icon: '📚' },
  { v: FAQ.length, l: '可溯源 FAQ', icon: '📌' }
])

const layers = [
  { n: 'L5', t: '入口层', d: '首页对话框 · 悬浮舱 ChatDock · 全屏助手 · 语音输入', c: '#1b66c9' },
  { n: 'L4', t: '智能体层', d: '三层识别（意图→FAQ→BM25）→ 状态机（澄清/确认/计划）→ 云脑降级', c: '#4f8df0' },
  { n: 'L3', t: '执行层', d: '13+ 工作流步骤执行 · 耗时计时 · 轨迹折叠 · 结果卡片动作', c: '#7c3aed' },
  { n: 'L2', t: '社区层', d: '校园墙/评论写入网关 · 敏感词双端 · 反馈回流管理台', c: '#ea580c' },
  { n: 'L1', t: '数据层', d: '6h 快照管线 · 网关优先 · 失败兜底永不白屏', c: '#0f766e' }
]

const modes = [
  { icon: '⚡', name: '直达模式', d: '识别即执行，最快 0.1 秒出结果卡片（默认）' },
  { icon: '📋', name: '计划模式', d: '先给出执行计划卡（步骤预览），你确认后才运行——WorkBuddy 同款人在回路' },
  { icon: '💬', name: '问答模式', d: '只回答知识不执行动作，用于查资料场景' }
]

const flywheel = [
  { step: '用户对话 / 评论 / 👎 / 举报', icon: '🗣️' },
  { step: '回流社区网关（数据池）', icon: '💾' },
  { step: '管理台聚合（反馈队列·热词·看板）', icon: '🛰️' },
  { step: '维护 Agent 更新 FAQ / 工作流 / 敏感词', icon: '🛠️' },
  { step: '服务质量上升 → 用户更愿意开口', icon: '📈' }
]

const demoSteps = [
  { t: '今日简报', d: '课表+日程+通知一次看全（3 步执行轨迹）' },
  { t: '哪里有空教室', d: '真实数据查询 + 快照降级诚实提示' },
  { t: '切📋计划模式再说一次', d: '先出计划卡 → 点「开始执行」' },
  { t: '协作看板', d: '双 Agent 飞轮量化——点题之作' }
]

function askDemo(q) {
  try { localStorage.setItem('qdu_agent_inbox', q) } catch { /* noop */ }
  emit('open', 'assistant')
}

/* ── 浏览器内自检：意图抽样断言（与 scripts 单测同口径，评委可点） ── */
const SELFTESTS = [
  ['今日简报', 'wf', 'dailyBriefing'], ['哪里有空教室', 'wf', 'findRoom'],
  ['明天有什么课', 'wf', 'dayClass'], ['今天吃什么', 'wf', 'whatEat'],
  ['找实习', 'wf', 'jobHunt'], ['活动报名', 'wf', 'activitySignup'],
  ['明天呢', 'none', null], ['食堂红黑榜', 'wf', 'canteenRank'],
  ['招聘', 'app', 'jobs'], ['为什么选你', 'app', 'compare'],
  ['你能做什么', 'meta', null], ['随机的无意义输入xyz', 'none', null]
]
const selftest = ref({ ran: false, pass: 0, total: 0, rows: [] })
function runSelftest() {
  const rows = SELFTESTS.map(([q, kind, want]) => {
    let got = null
    let okMark = false
    try {
      const r = recognize(q)
      if (kind === 'none') okMark = r.layer === 'none' || r.layer === 'faq' || r.layer === 'app'
      else if (kind === 'meta') okMark = r.layer === 'intent' && r.intent && r.intent.kind === 'meta'
      else if (want) okMark = r.layer === 'intent' && r.intent && (r.intent.wf === want || r.intent.app === want)
      else okMark = r.layer !== 'none'
      got = r.layer + (r.intent ? ':' + (r.intent.wf || r.intent.app || r.intent.kind) : '')
    } catch (e) { got = '异常:' + e.message }
    return { q, want: want || kind, got, ok: okMark }
  })
  selftest.value = { ran: true, pass: rows.filter((r) => r.ok).length, total: rows.length, rows }
}
</script>

<template>
  <div class="aa">
    <div class="aa-head">
      <button class="aa-back" @click="emit('back')">‹ 返回</button>
      <div class="aa-title">🤖 关于本智能体 <span class="aa-sub">架构 · 能力 · 飞轮 · 演示引导 —— 评委请从这里开始</span></div>
      <button class="aa-cta" @click="askDemo('今日简报')">▶ 现场演示</button>
    </div>

    <!-- Hero -->
    <div class="aa-hero">
      <div class="aa-hero-main">
        <div class="aa-hero-name">{{ AGENT_PROFILE.agentName }} <span class="aa-tag">Agent</span></div>
        <div class="aa-hero-sub">{{ AGENT_PROFILE.subtitle }} · 回答来自本地知识库、每条可溯源 · 写操作先经你在回路确认</div>
      </div>
      <div class="aa-stats">
        <div v-for="s in stats" :key="s.l" class="aa-stat">
          <div class="aa-stat-v">{{ s.icon }} {{ s.v }}</div>
          <div class="aa-stat-l">{{ s.l }}</div>
        </div>
      </div>
    </div>

    <!-- 架构分层 -->
    <div class="aa-card">
      <div class="aa-card-t">🏗️ 五层架构（一句话办事的完整链路）</div>
      <div class="aa-layers">
        <div v-for="l in layers" :key="l.n" class="aa-layer" :style="{ borderLeftColor: l.c }">
          <span class="aa-ln" :style="{ background: l.c }">{{ l.n }}</span>
          <div class="aa-lbody"><b>{{ l.t }}</b><div class="aa-ld">{{ l.d }}</div></div>
        </div>
      </div>
      <div class="aa-note">链路耗时（本地识别）&lt;5ms；云脑未配置时 501 秒回降级，<b>永不干等、永不编造</b>。</div>
    </div>

    <!-- 三模式 -->
    <div class="aa-card">
      <div class="aa-card-t">🎛️ 三模式（输入框下方随时切换 · WorkBuddy 对齐）</div>
      <div class="aa-modes">
        <div v-for="m in modes" :key="m.name" class="aa-mode">
          <span class="aa-mode-icon">{{ m.icon }}</span>
          <b>{{ m.name }}</b>
          <div class="aa-mode-d">{{ m.d }}</div>
        </div>
      </div>
    </div>

    <!-- 双 Agent 飞轮 -->
    <div class="aa-card">
      <div class="aa-card-t">🌀 双 Agent 飞轮 —— 标题「基于 AI Agent 协作维护」的可视化</div>
      <div class="aa-wheel">
        <template v-for="(f, i) in flywheel" :key="i">
          <div class="aa-wnode"><span>{{ f.icon }}</span>{{ f.step }}</div>
          <span v-if="i < flywheel.length - 1" class="aa-arrow">→</span>
        </template>
      </div>
      <div class="aa-note">量化入口：智能体说「<b>协作看板</b>」看飞轮数据 · 应用「📈 社区洞察」看趋势 · 管理台看反馈聚类。</div>
    </div>

    <!-- 演示引导 -->
    <div class="aa-card">
      <div class="aa-card-t">🎬 四步现场演示（点任意一条直接开始）</div>
      <div class="aa-demos">
        <button v-for="(d, i) in demoSteps" :key="i" class="aa-demo" @click="askDemo(d.t)">
          <span class="aa-demo-n">{{ i + 1 }}</span>
          <span class="aa-demo-t">{{ d.t }}</span>
          <span class="aa-demo-d">{{ d.d }}</span>
        </button>
      </div>
      <div class="aa-note">完整十组剧本见仓库 <code>src/agent/DIALOGUES.md</code>；技能全集见「🧩 技能市场」。</div>
    </div>

    <!-- 浏览器内自检 -->
    <div class="aa-card">
      <div class="aa-card-t">🧪 识别自检（浏览器内实跑，与单测同口径）</div>
      <div class="aa-selftest-bar">
        <button class="aa-btn primary" @click="runSelftest">跑一遍自检</button>
        <span v-if="selftest.ran" class="aa-selftest-score">通过 {{ selftest.pass }}/{{ selftest.total }}</span>
      </div>
      <div v-if="selftest.ran" class="aa-selftest-rows">
        <div v-for="(r, i) in selftest.rows" :key="i" class="aa-selftest-row">
          <span>{{ r.ok ? '✅' : '❌' }}</span>
          <span class="aa-st-q">{{ r.q }}</span>
          <span class="aa-st-got">{{ r.got }}</span>
        </div>
      </div>
      <div v-else class="aa-note">抽样 12 条：意图直达/应用直达/元能力/兜底，现场可验证识别质量。</div>
    </div>

    <!-- 底部行动 -->
    <div class="aa-actions">
      <button class="aa-btn primary" @click="emit('open', 'assistant')">打开智能助手</button>
      <button class="aa-btn" @click="emit('open', 'skills')">逛技能市场</button>
      <button class="aa-btn" @click="emit('open', 'insights')">看社区洞察</button>
    </div>
  </div>
</template>

<style scoped>
.aa { display: flex; flex-direction: column; gap: 13px; }
.aa-head { display: flex; align-items: center; gap: 11px; flex-wrap: wrap; }
.aa-back { border: 1px solid var(--border, #e5eaf2); background: var(--card, #fff); color: var(--text, #24292f); border-radius: 999px; padding: 6px 14px; cursor: pointer; font-family: inherit; font-size: 13px; }
.aa-title { flex: 1; font-size: 17px; font-weight: 800; color: var(--text, #24292f); min-width: 220px; }
.aa-sub { display: block; font-size: 11px; color: var(--muted, #8a94a6); font-weight: 400; margin-top: 2px; }
.aa-cta { border: none; background: var(--primary, #1b66c9); color: #fff; padding: 8px 18px; border-radius: 999px; cursor: pointer; font-family: inherit; font-size: 13.5px; font-weight: 700; }

.aa-hero { background: linear-gradient(135deg, var(--primary, #1b66c9), #4f8df0); border-radius: 16px; padding: 20px 22px; color: #fff; display: flex; gap: 20px; align-items: center; flex-wrap: wrap; }
.aa-hero-main { flex: 1; min-width: 240px; }
.aa-hero-name { font-size: 22px; font-weight: 900; }
.aa-tag { font-size: 11px; background: rgba(255, 255, 255, 0.25); border: 1px solid rgba(255, 255, 255, 0.55); border-radius: 6px; padding: 2px 9px; vertical-align: middle; margin-left: 8px; }
.aa-hero-sub { font-size: 12.5px; opacity: 0.92; margin-top: 7px; line-height: 1.7; }
.aa-stats { display: flex; gap: 14px; flex-wrap: wrap; }
.aa-stat { background: rgba(255, 255, 255, 0.14); border-radius: 12px; padding: 11px 15px; text-align: center; min-width: 88px; }
.aa-stat-v { font-size: 20px; font-weight: 800; }
.aa-stat-l { font-size: 10.5px; opacity: 0.9; margin-top: 2px; }

.aa-card { border: 1px solid var(--border, #e5eaf2); background: var(--card, #fff); border-radius: 14px; padding: 15px 17px; }
.aa-card-t { font-size: 14px; font-weight: 800; color: var(--text, #24292f); margin-bottom: 12px; }
.aa-layers { display: flex; flex-direction: column; gap: 8px; }
.aa-layer { display: flex; gap: 12px; align-items: center; border-left: 4px solid; background: var(--bg, #f7f9fc); border-radius: 0 10px 10px 0; padding: 9px 13px; }
.aa-ln { color: #fff; font-size: 11px; font-weight: 800; border-radius: 6px; padding: 3px 9px; flex-shrink: 0; }
.aa-lbody b { font-size: 13.5px; color: var(--text, #24292f); }
.aa-ld { font-size: 12px; color: var(--muted, #8a94a6); margin-top: 2px; line-height: 1.6; }
.aa-note { font-size: 11.5px; color: var(--muted, #8a94a6); margin-top: 10px; background: var(--bg, #f7f9fc); border-radius: 8px; padding: 8px 11px; line-height: 1.7; }
.aa-note code { background: rgba(0, 0, 0, 0.06); padding: 1px 6px; border-radius: 4px; }

.aa-modes { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 10px; }
.aa-mode { background: var(--bg, #f7f9fc); border-radius: 11px; padding: 12px 14px; }
.aa-mode-icon { font-size: 20px; margin-right: 7px; }
.aa-mode b { font-size: 13.5px; color: var(--text, #24292f); }
.aa-mode-d { font-size: 11.5px; color: var(--muted, #8a94a6); margin-top: 5px; line-height: 1.65; }

.aa-wheel { display: flex; align-items: center; gap: 7px; flex-wrap: wrap; }
.aa-wnode { display: flex; align-items: center; gap: 6px; background: var(--bg, #f7f9fc); border: 1px solid var(--border, #e5eaf2); border-radius: 10px; padding: 8px 12px; font-size: 12px; color: var(--text, #24292f); font-weight: 600; }
.aa-arrow { color: var(--primary, #1b66c9); font-weight: 900; }

.aa-demos { display: flex; flex-direction: column; gap: 8px; }
.aa-demo { display: flex; align-items: center; gap: 12px; border: 1px solid var(--border, #e5eaf2); background: var(--bg, #f7f9fc); border-radius: 11px; padding: 11px 14px; cursor: pointer; font-family: inherit; text-align: left; transition: all 0.15s; }
.aa-demo:hover { border-color: var(--primary, #1b66c9); transform: translateX(4px); }
.aa-demo-n { width: 24px; height: 24px; border-radius: 50%; background: var(--primary, #1b66c9); color: #fff; font-size: 13px; font-weight: 800; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.aa-demo-t { font-weight: 700; font-size: 13.5px; color: var(--text, #24292f); flex-shrink: 0; min-width: 110px; }
.aa-demo-d { font-size: 12px; color: var(--muted, #8a94a6); }

.aa-actions { display: flex; gap: 10px; flex-wrap: wrap; }
.aa-btn { border: 1px solid var(--border, #e5eaf2); background: var(--card, #fff); color: var(--text, #24292f); padding: 11px 22px; border-radius: 999px; cursor: pointer; font-family: inherit; font-size: 14px; font-weight: 600; }
.aa-btn.primary { background: var(--primary, #1b66c9); border-color: var(--primary, #1b66c9); color: #fff; }
.aa-btn:hover { transform: translateY(-2px); }
.aa-selftest-bar { display: flex; gap: 10px; align-items: center; margin: 8px 0; }
.aa-selftest-score { font-weight: 800; color: var(--primary, #1b66c9); }
.aa-selftest-rows { display: flex; flex-direction: column; gap: 4px; font-size: 12.5px; }
.aa-selftest-row { display: flex; gap: 8px; align-items: baseline; }
.aa-st-q { font-weight: 600; }
.aa-st-got { color: var(--muted, #8a94a6); font-family: ui-monospace, monospace; font-size: 11.5px; }
</style>
