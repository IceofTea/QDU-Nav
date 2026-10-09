<script setup>
/**
 * ChatDock —— 右下角悬浮智能体舱（全站可用）
 * FAB 点击展开对话面板；承接 App 层的 openApp 动作。
 */
import { ref } from 'vue'
import AgentChat from './AgentChat.vue'
import { AGENT_PROFILE } from '../../agent/config.js'

const emit = defineEmits(['open'])
const open = ref(false)
const chatRef = ref(null)
const dockEl = ref(null)

function toggle() {
  open.value = !open.value
}

function onOpenApp(id) {
  emit('open', id)
  open.value = false
}
</script>

<template>
  <!-- FAB -->
  <button class="cd-fab" :class="{ open }" :title="AGENT_PROFILE.agentName + ' · ' + AGENT_PROFILE.subtitle" @click="toggle">
    <span class="cd-fab-icon">{{ open ? '✕' : '🤖' }}</span>
    <span v-if="!open" class="cd-fab-badge">AI</span>
  </button>

  <!-- 面板 -->
  <transition name="cd-pop">
    <div v-if="open" ref="dockEl" class="cd-panel">
      <div class="cd-head">
        <div class="cd-head-main">
          <span class="cd-avatar">🤖</span>
          <div>
            <div class="cd-title">{{ AGENT_PROFILE.agentName }}</div>
            <div class="cd-sub">{{ AGENT_PROFILE.subtitle }}</div>
          </div>
        </div>
        <button class="cd-full" title="全屏打开" @click="emit('open', 'assistant')">⧉</button>
      </div>
      <div class="cd-body">
        <AgentChat ref="chatRef" variant="dock" @open="onOpenApp" />
      </div>
    </div>
  </transition>
</template>

<style scoped>
.cd-fab {
  position: fixed;
  right: 18px;
  bottom: 78px;
  z-index: 960;
  width: 54px;
  height: 54px;
  border-radius: 50%;
  border: none;
  background: linear-gradient(135deg, var(--primary, #1b66c9), #4f8df0);
  color: #fff;
  cursor: pointer;
  box-shadow: 0 6px 20px rgba(27, 102, 201, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s, box-shadow 0.2s;
}
.cd-fab:hover { transform: translateY(-3px) scale(1.05); }
.cd-fab.open { background: var(--card, #f7f9fc); box-shadow: 0 6px 20px rgba(0, 0, 0, 0.18); }
.cd-fab.open .cd-fab-icon { color: var(--primary, #1b66c9); }
.cd-fab-icon { font-size: 24px; line-height: 1; }
.cd-fab-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  background: #f59e0b;
  color: #fff;
  font-size: 9.5px;
  font-weight: 800;
  padding: 2px 5px;
  border-radius: 999px;
  border: 2px solid var(--bg, #fff);
}

.cd-panel {
  position: fixed;
  right: 14px;
  bottom: 142px;
  z-index: 961;
  width: min(392px, calc(100vw - 24px));
  height: min(560px, calc(100vh - 200px));
  background: var(--bg, #fff);
  border: 1px solid var(--border, #e5eaf2);
  border-radius: 16px;
  box-shadow: 0 18px 50px rgba(0, 0, 0, 0.22);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.cd-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 11px 13px;
  border-bottom: 1px solid var(--border, #e5eaf2);
  background: linear-gradient(135deg, var(--primary-soft, rgba(27, 102, 201, 0.08)), transparent);
}
.cd-head-main { display: flex; align-items: center; gap: 9px; min-width: 0; }
.cd-avatar { font-size: 22px; }
.cd-title { font-size: 14px; font-weight: 800; color: var(--text, #24292f); }
.cd-sub { font-size: 10.5px; color: var(--muted, #8a94a6); }
.cd-full { border: 1px solid var(--border, #e5eaf2); background: var(--bg, #fff); border-radius: 8px; width: 30px; height: 30px; cursor: pointer; color: var(--muted, #8a94a6); font-size: 14px; }
.cd-full:hover { color: var(--primary, #1b66c9); border-color: var(--primary, #1b66c9); }
.cd-body { flex: 1; min-height: 0; display: flex; flex-direction: column; }

.cd-pop-enter-active, .cd-pop-leave-active { transition: all 0.22s cubic-bezier(0.2, 0.9, 0.3, 1.2); }
.cd-pop-enter-from, .cd-pop-leave-to { opacity: 0; transform: translateY(18px) scale(0.94); }

@media (max-width: 640px) {
  .cd-panel { right: 8px; left: 8px; width: auto; bottom: 138px; height: min(520px, calc(100vh - 190px)); }
  .cd-fab { right: 12px; bottom: 72px; }
}
</style>
