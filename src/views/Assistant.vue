<script setup>
/**
 * 智能助手（全屏应用页）—— 智能体的"主场"
 * 左：对话执行区；右：能力面板（工作流清单 / 三层识别说明 / 个性化记忆）。
 */
import { ref, computed, onMounted } from 'vue'
import AgentChat from '../components/agent/AgentChat.vue'
import { AGENT_PROFILE } from '../agent/config'
import { WORKFLOWS } from '../agent/workflows'
import { FAQ } from '../agent/faq'

const emit = defineEmits(['open', 'back'])
const chatRef = ref(null)

/* 接收首页对话框传入的话术（一次性收件箱） */
onMounted(() => {
  // 入口①：站内收件箱（首页对话框）
  try {
    const inbox = localStorage.getItem('qdu_agent_inbox')
    if (inbox) {
      localStorage.removeItem('qdu_agent_inbox')
      setTimeout(() => chatRef.value?.send(inbox), 350)
      return
    }
  } catch { /* noop */ }
  // 入口②：跨站带话术（Wiki 智能体委托执行工作流 → #/app/assistant?q=<话术>）
  const m = location.hash.match(/assistant\?q=([^&]+)/)
  if (m) {
    try { location.hash = '#/app/assistant' } catch { /* noop */ }
    const q = decodeURIComponent(m[1])
    setTimeout(() => chatRef.value?.send(q), 450)
  }
})

const wfUsage = ref({})
function bumpUsage() {
  try { wfUsage.value = JSON.parse(localStorage.getItem('qdu_wf_usage') || '{}') } catch { wfUsage.value = {} }
}
function recordUsage(id) {
  wfUsage.value[id] = (wfUsage.value[id] || 0) + 1
  try { localStorage.setItem('qdu_wf_usage', JSON.stringify(wfUsage.value)) } catch { /* noop */ }
}
const wfList = computed(() => {
  bumpUsage()
  return Object.values(WORKFLOWS)
    .map((w) => ({ id: w.id, title: w.title, icon: w.icon, steps: w.steps.length, confirm: !!w.needConfirm, used: wfUsage.value[w.id] || 0 }))
    .sort((a, b) => b.used - a.used) // 常用技能置顶（个性化排序）
})

const memory = ref({ class: '' })
try { memory.value.class = localStorage.getItem('qdu_agent_class') || '' } catch { /* noop */ }
function clearMemory() {
  try { localStorage.removeItem('qdu_agent_class') } catch { /* noop */ }
  memory.value.class = ''
}

function trySay(s) { chatRef.value?.send(s) }

/** 常用技能计数：点技能卡时记录，侧栏按使用频率个性化排序 */
function onPickWf(id) { recordUsage(id) }
</script>

<template>
  <div class="asst">
    <div class="asst-head">
      <button class="asst-back" @click="emit('back')">‹ 返回</button>
      <div class="asst-title">
        <span class="asst-logo">🤖</span>
        <div>
          <div class="asst-name">{{ AGENT_PROFILE.agentName }} <span class="asst-tag">Agent</span></div>
          <div class="asst-desc">{{ AGENT_PROFILE.subtitle }}</div>
        </div>
      </div>
      <button class="asst-link" @click="emit('open', 'contributors')">协作看板 ›</button>
    </div>

    <div class="asst-grid">
      <!-- 左：对话 -->
      <section class="asst-chat">
        <AgentChat ref="chatRef" variant="full" @open="(id) => emit('open', id)" />
      </section>

      <!-- 右：能力面板 -->
      <aside class="asst-side">
        <div class="panel">
          <div class="panel-title">⚡ 一句话办事 · 工作流清单</div>
          <div class="wf-list">
            <button v-for="w in wfList" :key="w.id" class="wf-item" @click="onPickWf(w.id); trySay(w.title === '今天吃什么' ? '今天吃什么' : w.title)">
              <span class="wf-icon">{{ w.icon }}</span>
              <span class="wf-name">{{ w.title }}</span>
              <span class="wf-used" v-if="w.used" title="你的使用次数">×{{ w.used }}</span>
              <span class="wf-steps">{{ w.steps }} 步{{ w.confirm ? ' · 需确认' : '' }}</span>
            </button>
          </div>
        </div>

        <div class="panel">
          <div class="panel-title">🧠 三层本地识别（可解释）</div>
          <ol class="layer-list">
            <li><b>① 意图表</b>——40+ 意图加权匹配，命中即办事</li>
            <li><b>② 知识库</b>——{{ FAQ.length }} 条 FAQ，回答必带 📌 出处</li>
            <li><b>③ 应用检索</b>——兜底直达最相关的校园应用</li>
          </ol>
          <div class="layer-note">本地推理零依赖、离线可用；配置云脑接口后复杂问题自动升级云端并回退兜底。</div>
        </div>

        <div class="panel">
          <div class="panel-title">💾 个性化记忆（存本机）</div>
          <div class="mem-row">
            <span>班级：</span>
            <b>{{ memory.class || '未设置' }}</b>
          </div>
          <div class="mem-actions">
            <button class="mini" @click="trySay('设置班级 2025级计算机科学1班')">{{ memory.class ? '重新设置' : '设置班级' }}</button>
            <button v-if="memory.class" class="mini ghost" @click="clearMemory">清除</button>
          </div>
          <div class="layer-note">设置后"明天上什么课"可直接查询；记忆仅存于你的浏览器。</div>
        </div>

        <div class="panel">
          <div class="panel-title">🎮 快速上手</div>
          <div class="quick">
            <button v-for="s in AGENT_PROFILE.examples" :key="s" class="quick-btn" @click="trySay(s)">{{ s }}</button>
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.asst { display: flex; flex-direction: column; min-height: 70vh; }
.asst-head { display: flex; align-items: center; gap: 14px; padding: 6px 2px 14px; border-bottom: 1px solid var(--border, #e5eaf2); margin-bottom: 14px; }
.asst-back { border: 1px solid var(--border, #e5eaf2); background: var(--card, #fff); color: var(--text, #24292f); border-radius: 999px; padding: 6px 14px; cursor: pointer; font-family: inherit; font-size: 13px; }
.asst-title { display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0; }
.asst-logo { font-size: 26px; }
.asst-name { font-size: 17px; font-weight: 800; color: var(--text, #24292f); }
.asst-tag { font-size: 10px; background: var(--primary, #1b66c9); color: #fff; border-radius: 5px; padding: 2px 6px; vertical-align: middle; font-weight: 700; }
.asst-desc { font-size: 12px; color: var(--muted, #8a94a6); }
.asst-link { border: none; background: transparent; color: var(--primary, #1b66c9); cursor: pointer; font-family: inherit; font-size: 13px; }

.asst-grid { display: grid; grid-template-columns: 1fr 300px; gap: 16px; flex: 1; min-height: 480px; }
.asst-chat { border: 1px solid var(--border, #e5eaf2); border-radius: 14px; overflow: hidden; display: flex; min-height: 480px; background: var(--card, #fff); }
.asst-side { display: flex; flex-direction: column; gap: 12px; min-width: 0; }

.panel { border: 1px solid var(--border, #e5eaf2); border-radius: 12px; padding: 12px; background: var(--card, #fff); }
.panel-title { font-size: 13px; font-weight: 800; color: var(--text, #24292f); margin-bottom: 9px; }

.wf-list { display: flex; flex-direction: column; gap: 5px; }
.wf-item { display: flex; align-items: center; gap: 7px; border: 1px solid transparent; background: var(--bg, #f7f9fc); border-radius: 8px; padding: 7px 9px; cursor: pointer; font-family: inherit; font-size: 12.5px; text-align: left; color: var(--text, #24292f); }
.wf-item:hover { border-color: var(--primary, #1b66c9); background: var(--primary-soft, rgba(27, 102, 201, 0.07)); }
.wf-icon { flex-shrink: 0; }
.wf-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.wf-used { font-size: 10px; background: var(--primary, #1b66c9); color: #fff; border-radius: 999px; padding: 0 7px; font-weight: 700; flex-shrink: 0; }
.wf-steps { font-size: 10.5px; color: var(--muted, #8a94a6); flex-shrink: 0; }

.layer-list { margin: 0; padding-left: 18px; font-size: 12.3px; line-height: 1.8; color: var(--text, #24292f); }
.layer-note { margin-top: 7px; font-size: 11px; color: var(--muted, #8a94a6); line-height: 1.6; }
.mem-row { font-size: 13px; color: var(--text, #24292f); }
.mem-actions { display: flex; gap: 7px; margin-top: 7px; }
.mini { border: 1px solid var(--primary, #1b66c9); background: var(--primary, #1b66c9); color: #fff; font-size: 12px; padding: 4px 11px; border-radius: 999px; cursor: pointer; font-family: inherit; }
.mini.ghost { background: transparent; color: var(--muted, #8a94a6); border-color: var(--border, #e5eaf2); }
.quick { display: flex; flex-direction: column; gap: 6px; }
.quick-btn { border: 1px dashed var(--border, #e5eaf2); background: transparent; color: var(--text, #24292f); font-size: 12.5px; padding: 7px 10px; border-radius: 8px; cursor: pointer; font-family: inherit; text-align: left; }
.quick-btn:hover { border-color: var(--primary, #1b66c9); color: var(--primary, #1b66c9); }

@media (max-width: 860px) {
  .asst-grid { grid-template-columns: 1fr; }
  .asst-side { order: -1; }
  .asst-chat { min-height: 420px; }
}
</style>
