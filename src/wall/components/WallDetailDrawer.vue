<script setup>
/**
 * ════════════════════════════════════════════════════════════════════
 * @模块路径  src/wall/components/WallDetailDrawer.vue
 * @职责      帖子详情抽屉：右侧滑出详情，feed 保持挂载（上下文不丢），
 *            内嵌 WallThread 复用全部楼层能力 —— 替代整页详情跳转
 * @props     post:Object（必填）· offline:Boolean · words:Array
 * @emits     close · back · reply · adopt · report · like · react ·
 *            vote · editLocal（与 WallThread 同构透传）
 * @被谁用    CampusWall.vue（detailPost 非空即开）
 * @交互      点遮罩关闭 · Esc 关闭 · 面板内滚动锁（背景不跟滚）
 * ════════════════════════════════════════════════════════════════════
 */
import { onMounted, onBeforeUnmount } from 'vue'
import WallThread from './WallThread.vue'

const props = defineProps({
  post: { type: Object, required: true },
  offline: { type: Boolean, default: false },
  words: { type: Array, default: () => [] }
})
const emit = defineEmits(['close', 'back', 'reply', 'adopt', 'report', 'like', 'react', 'vote', 'editLocal'])

function onKey(e) {
  if (e.key === 'Escape') emit('close')
}
onMounted(() => {
  document.addEventListener('keydown', onKey)
  try { document.body.style.overflow = 'hidden' } catch { /* noop */ }
})
onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKey)
  try { document.body.style.overflow = '' } catch { /* noop */ }
})
</script>

<template>
  <div class="wd-mask" @click.self="emit('close')">
    <aside class="wd-panel">
      <div class="wd-head">
        <button class="wd-x" @click="emit('close')">✕ 关闭</button>
        <span class="wd-tip">帖子详情（feed 保持不动）</span>
      </div>
      <div class="wd-body">
        <WallThread
          :post="post" :offline="offline" :words="words"
          @back="emit('close')"
          @reply="(...a) => emit('reply', ...a)"
          @adopt="(...a) => emit('adopt', ...a)"
          @report="(...a) => emit('report', ...a)"
          @like="(...a) => emit('like', ...a)"
          @react="(...a) => emit('react', ...a)"
          @vote="(...a) => emit('vote', ...a)"
          @edit-local="emit('editLocal')"
        />
      </div>
    </aside>
  </div>
</template>

<style scoped>
.wd-mask { position: fixed; inset: 0; z-index: 60; background: rgba(0, 0, 0, 0.45); display: flex; justify-content: flex-end; }
.wd-panel { width: min(560px, 94vw); height: 100%; background: var(--card, #fff); display: flex; flex-direction: column; box-shadow: -12px 0 40px rgba(0, 0, 0, 0.25); animation: wdIn 0.22s ease-out; }
@keyframes wdIn { from { transform: translateX(40px); opacity: 0; } to { transform: none; opacity: 1; } }
@media (prefers-reduced-motion: reduce) { .wd-panel { animation: none; } }
.wd-head { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-bottom: 1px solid var(--border, #eee); }
.wd-x { border: 1px solid var(--border, #e5e5e5); background: var(--bg, #fafafa); border-radius: 10px; padding: 4px 12px; cursor: pointer; }
.wd-tip { font-size: 12px; color: var(--muted, #8a94a6); }
.wd-body { flex: 1; overflow-y: auto; padding: 12px 14px; }
</style>
