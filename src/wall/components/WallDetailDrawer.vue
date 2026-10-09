<script setup>
/**
 * ════════════════════════════════════════════════════════════════════
 * @模块路径  src/wall/components/WallDetailDrawer.vue
 * @职责      帖子详情抽屉：右侧滑出详情，feed 保持挂载（上下文不丢）；
 *            楼层/树形双视图（WallThread 与 CommentTree 一键切换，共用
 *            同一套父事件，树形嵌套走 replyPost parent 链路）
 * @props     post:Object（必填）· offline:Boolean · words:Array
 * @emits     close · back · reply(content,author,parent?) · adopt · report ·
 *            like · react · vote · editLocal（与 CampusWall 对接）
 * @被谁用    CampusWall.vue（detailPost 非空即开）
 * @交互      点遮罩关闭 · Esc 关闭 · 面板内滚动锁（背景不跟滚）
 * ════════════════════════════════════════════════════════════════════
 */
import { ref, onMounted, onBeforeUnmount } from 'vue'
import WallThread from './WallThread.vue'
import CommentTree from './CommentTree.vue'

const props = defineProps({
  post: { type: Object, required: true },
  offline: { type: Boolean, default: false },
  words: { type: Array, default: () => [] }
})
const emit = defineEmits(['close', 'back', 'reply', 'adopt', 'report', 'like', 'react', 'vote', 'editLocal'])

const mode = ref('floor') // floor | tree

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

/** 树形回复事件适配（CommentTree 载荷 → CampusWall 处理器签名） */
function replyOf(id) {
  return (props.post.replies || []).find((r) => r.id === id) || null
}
function onTreeReply(payload) {
  const { content, parent, replyTo } = payload || {}
  // CommentTree 的本机删除协议：__DELETE__:<id>
  if (typeof content === 'string' && content.startsWith('__DELETE__:')) {
    const rid = content.slice('__DELETE__:'.length)
    const arr = props.post.replies || []
    for (let i = arr.length - 1; i >= 0; i--) {
      if (arr[i].id === rid || arr[i].parent === rid) arr.splice(i, 1)
    }
    emit('editLocal')
    return
  }
  emit('reply', content, replyTo || props.post.author, parent || null)
}
function onTreeLike({ id }) {
  const r = replyOf(id)
  if (r) emit('like', r)
}
function onTreeReact({ id, emoji }) {
  const r = replyOf(id)
  if (r) emit('react', r, emoji)
}
function onTreeReport({ id }) {
  emit('report', { id })
}
</script>

<template>
  <div class="wd-mask" @click.self="emit('close')">
    <aside class="wd-panel">
      <div class="wd-head">
        <button class="wd-x" @click="emit('close')">✕ 关闭</button>
        <div class="wd-tabs">
          <button :class="{ on: mode === 'floor' }" @click="mode = 'floor'">楼层</button>
          <button :class="{ on: mode === 'tree' }" @click="mode = 'tree'">树形</button>
        </div>
        <span class="wd-tip">feed 保持不动</span>
      </div>
      <div class="wd-body">
        <WallThread
          v-if="mode === 'floor'"
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
        <CommentTree
          v-else
          :replies="post.replies || []"
          :post-author="post.author"
          :post-id="post.id"
          :offline="offline"
          :words="words"
          @reply="onTreeReply"
          @edit-local="emit('editLocal')"
          @report="onTreeReport"
          @like="onTreeLike"
          @react="onTreeReact"
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
.wd-tabs { display: flex; border: 1px solid var(--border, #e5e5e5); border-radius: 12px; overflow: hidden; }
.wd-tabs button { border: none; background: transparent; padding: 3px 14px; cursor: pointer; font-size: 12px; }
.wd-tabs button.on { background: #1b66c9; color: #fff; }
.wd-tip { font-size: 12px; color: var(--muted, #8a94a6); margin-left: auto; }
.wd-body { flex: 1; overflow-y: auto; padding: 12px 14px; }
</style>
