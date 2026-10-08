<script setup>
/**
 * ════════════════════════════════════════════════════════════════════
 * @模块路径  src/wall/components/CommentTree.vue
 * @职责      通用评论树：楼中楼多层折叠 + 引用回复 + 只看楼主 + 排序 +
 *            @高亮 + 敏感折叠 + 本机编辑/删除 + 举报 + 复制楼层链接
 *            —— WallThread 的详情楼层升级版，Wiki 评论区可直接复用
 * @props     replies:Array（帖子 replies 或评论 comments）· postAuthor:String
 *            postId:String · offline:Boolean · words:Array（敏感词库）
 *            pageSize:Number（楼层分页）· deepLink:String（复制链接前缀）
 * @emits     reply({content,parent,replyTo}) · editLocal · report({id,reason})
 *            like({id}) · react({id,emoji})
 * @被谁用    CampusWall 详情模式（下一步接入）· Wiki comments.js 移植目标
 * @设计      纯展示 + 事件上抛，数据变更由父组件落盘（网关/local 双轨在 api.js）
 * ════════════════════════════════════════════════════════════════════
 */
import { ref, computed } from 'vue'
import { shouldFold, foldReason, precheck } from '../moderation.js'
import { parseMentions } from '../notify.js'

const props = defineProps({
  replies: { type: Array, default: () => [] },
  postAuthor: { type: String, default: '' },
  postId: { type: [String, Number], default: '' },
  offline: { type: Boolean, default: false },
  words: { type: Array, default: () => [] },
  pageSize: { type: Number, default: 50 },
  deepLink: { type: String, default: '' },
  showToolbar: { type: Boolean, default: true }
})
const emit = defineEmits(['reply', 'editLocal', 'report', 'like', 'react'])

/* ── 视图状态 ── */
const onlyAuthor = ref(false)
const sortMode = ref('floor') // floor | hot | new
const page = ref(1)
const collapsed = ref(new Set()) // 手动折叠的 id
const expandedFold = ref(new Set()) // 被治理折叠但用户点开展开的 id
const replyBoxFor = ref(null) // 正在回复的楼层 id（null=收起）
const replyText = ref('')
const replyAuthor = ref('')
const quote = ref(null) // {floor, author, text}
const err = ref('')
const copiedId = ref('')

/* ── 楼层编号（按 ts 正序 #1 起，与 WallThread 对齐） ── */
const ordered = computed(() => {
  const arr = (props.replies || []).slice().sort((a, b) => (a.ts || 0) - (b.ts || 0))
  arr.forEach((r, i) => { r._floor = i + 1 })
  return arr
})
const idMap = computed(() => {
  const m = new Map()
  for (const r of ordered.value) m.set(r.id, r)
  return m
})
function childrenOf(id) {
  return ordered.value.filter((r) => r.parent === id)
}
function roots() {
  return ordered.value.filter((r) => !r.parent || !idMap.value.has(r.parent))
}
const visibleRoots = computed(() => {
  let list = roots()
  if (onlyAuthor.value && props.postAuthor) list = list.filter((r) => r.author === props.postAuthor)
  if (sortMode.value === 'new') list = list.slice().sort((a, b) => (b.ts || 0) - (a.ts || 0))
  if (sortMode.value === 'hot') list = list.slice().sort((a, b) => ((b.likes || 0) + childrenOf(b.id).length * 2) - ((a.likes || 0) + childrenOf(a.id).length * 2))
  return list
})
const totalPages = computed(() => Math.max(1, Math.ceil(visibleRoots.value.length / props.pageSize)))
const pagedRoots = computed(() => {
  const p = Math.min(page.value, totalPages.value)
  return visibleRoots.value.slice((p - 1) * props.pageSize, p * props.pageSize)
})

function fmt(ts) {
  const diff = (Date.now() - (ts || 0)) / 1000
  if (diff < 60) return '刚刚'
  if (diff < 3600) return Math.floor(diff / 60) + ' 分钟前'
  if (diff < 86400) return Math.floor(diff / 3600) + ' 小时前'
  const d = new Date(ts || Date.now())
  return (d.getMonth() + 1) + '-' + d.getDate() + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0')
}
function isFolded(r) {
  if (expandedFold.value.has(r.id)) return false
  if (collapsed.value.has(r.id)) return true
  return shouldFold(r)
}
function toggleFold(r) {
  if (expandedFold.value.has(r.id)) { expandedFold.value.delete(r.id); collapsed.value.add(r.id); return }
  if (collapsed.value.has(r.id)) { collapsed.value.delete(r.id); return }
  // 治理折叠 → 点开展开；普通楼层 → 折叠
  if (shouldFold(r)) expandedFold.value.add(r.id)
  else collapsed.value.add(r.id)
}
function mine(r) {
  try {
    const me = localStorage.getItem('qdu_wall_name') || ''
    return (me && r.author === me) || String(props.postId).startsWith('L')
  } catch { return String(props.postId).startsWith('L') }
}
function startReply(r) {
  replyBoxFor.value = r ? r.id : null
  quote.value = r ? { floor: r._floor, author: r.author, text: String(r.content || '').slice(0, 60) } : null
  replyText.value = r ? ('@' + r.author + ' ') : ''
  err.value = ''
}
function cancelReply() { replyBoxFor.value = null; replyText.value = ''; quote.value = null; err.value = '' }
function submitReply(parent) {
  const t = replyText.value.trim()
  if (t.length < 1) { err.value = '回复不能为空'; return }
  const { ok, hits } = precheck(t, props.words && props.words.length ? { words: props.words } : {})
  if (!ok) { err.value = '命中敏感词：' + hits.slice(0, 3).join('、'); return }
  emit('reply', { content: t, parent: parent || null, replyTo: quote.value ? quote.value.author : '' })
  cancelReply()
}
function editReply(r) {
  const text = prompt('编辑回复：', r.content)
  if (text == null) return
  if (text.trim().length < 1) return
  r.content = text.trim()
  r.edited = true
  emit('editLocal')
}
function deleteReply(r) {
  if (!confirm('删除这条回复？子回复会一并删除。')) return
  emit('reply', { content: '__DELETE__:' + r.id, parent: null, replyTo: '' })
}
function copyLink(r) {
  const link = (props.deepLink || location.href.split('#')[0]) + '#reply-' + r.id
  try {
    if (navigator.clipboard) navigator.clipboard.writeText(link)
    else {
      const ta = document.createElement('textarea')
      ta.value = link
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    copiedId.value = r.id
    setTimeout(() => { copiedId.value = '' }, 1500)
  } catch { /* noop */ }
}
/** @ 高亮 + 楼层引用高亮（v-html 前已转义） */
function renderBody(r) {
  let s = String(r.content || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  s = s.replace(/@([^\s@#]{1,16})/g, '<span class="ct-mention">@$1</span>')
  if (r.replyTo) s = '<span class="ct-replyto">回复 @' + String(r.replyTo).replace(/</g, '&lt;') + '</span> ' + s
  if (r.edited) s += ' <span class="ct-edited">(已编辑)</span>'
  return s
}
function mentionsOf(r) { return parseMentions(r.content || '') }
function switchSort(m) { sortMode.value = m; page.value = 1 }
</script>

<template>
  <div class="ct-wrap">
    <div v-if="showToolbar" class="ct-bar">
      <div class="ct-tabs">
        <button :class="{ on: sortMode === 'floor' }" @click="switchSort('floor')">按楼层</button>
        <button :class="{ on: sortMode === 'hot' }" @click="switchSort('hot')">最热</button>
        <button :class="{ on: sortMode === 'new' }" @click="switchSort('new')">最新</button>
      </div>
      <label class="ct-only">
        <input type="checkbox" v-model="onlyAuthor" /> 只看楼主
      </label>
      <span class="ct-count">{{ (replies || []).length }} 条回复</span>
    </div>

    <div v-if="!pagedRoots.length" class="ct-empty">还没有回复，来抢沙发吧 🛋️</div>

    <div v-for="r in pagedRoots" :key="r.id" class="ct-node" :id="'reply-' + r.id">
      <div class="ct-main">
        <div class="ct-head">
          <span class="ct-floor">#{{ r._floor }}</span>
          <span class="ct-author">{{ r.author || '匿名同学' }}</span>
          <span v-if="r.author === postAuthor" class="ct-lz">楼主</span>
          <span class="ct-time">{{ fmt(r.ts) }}</span>
          <span v-if="isFolded(r)" class="ct-foldtag">{{ foldReason(r) }}</span>
        </div>
        <div v-if="!isFolded(r)" class="ct-body" v-html="renderBody(r)"></div>
        <div v-else class="ct-folded">
          <button @click="toggleFold(r)">展开看看</button>
        </div>
        <div v-if="!isFolded(r)" class="ct-ops">
          <button @click="startReply(r)">回复</button>
          <button @click="emit('like', { id: r.id })">赞{{ r.likes ? '(' + r.likes + ')' : '' }}</button>
          <button @click="emit('react', { id: r.id, emoji: '❤️' })">❤️</button>
          <button @click="copyLink(r)">{{ copiedId === r.id ? '已复制 ✓' : '复制链接' }}</button>
          <button @click="toggleFold(r)">折叠</button>
          <button v-if="mine(r)" @click="editReply(r)">编辑</button>
          <button v-if="mine(r)" @click="deleteReply(r)">删除</button>
          <button @click="emit('report', { id: r.id })">举报</button>
        </div>
        <div v-if="replyBoxFor === r.id" class="ct-replybox">
          <div v-if="quote" class="ct-quote">引用 #{{ quote.floor }} @{{ quote.author }}：{{ quote.text }}</div>
          <textarea v-model="replyText" rows="2" placeholder="友善回复，理性讨论"></textarea>
          <div class="ct-replyops">
            <span v-if="err" class="ct-err">{{ err }}</span>
            <button @click="cancelReply">取消</button>
            <button class="primary" @click="submitReply(r.id)">发送</button>
          </div>
        </div>
      </div>
      <!-- 子回复一层 -->
      <div v-if="!isFolded(r)" class="ct-children">
        <div v-for="c in childrenOf(r.id)" :key="c.id" class="ct-child">
          <span class="ct-author sm">{{ c.author || '匿名同学' }}</span>
          <span class="ct-time sm">{{ fmt(c.ts) }}</span>
          <span class="ct-body sm" v-html="renderBody(c)"></span>
          <span class="ct-ops sm">
            <button @click="startReply(c)">回复</button>
            <button @click="emit('like', { id: c.id })">赞{{ c.likes ? '(' + c.likes + ')' : '' }}</button>
            <button v-if="mine(c)" @click="editReply(c)">编辑</button>
            <button v-if="mine(c)" @click="deleteReply(c)">删除</button>
          </span>
          <div v-if="replyBoxFor === c.id" class="ct-replybox">
            <textarea v-model="replyText" rows="2" placeholder="回复 @{{ c.author }}"></textarea>
            <div class="ct-replyops">
              <span v-if="err" class="ct-err">{{ err }}</span>
              <button @click="cancelReply">取消</button>
              <button class="primary" @click="submitReply(c.id)">发送</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="totalPages > 1" class="ct-pager">
      <button :disabled="page <= 1" @click="page--">上一页</button>
      <span>{{ page }} / {{ totalPages }}</span>
      <button :disabled="page >= totalPages" @click="page++">下一页</button>
    </div>

    <div class="ct-foot">
      <button class="primary" @click="startReply(null)">写回复</button>
      <div v-if="replyBoxFor === null" class="ct-replybox">
        <textarea v-model="replyText" rows="3" placeholder="友善回复，理性讨论（支持 @ 提及）"></textarea>
        <div class="ct-replyops">
          <span v-if="err" class="ct-err">{{ err }}</span>
          <button @click="cancelReply">取消</button>
          <button class="primary" @click="submitReply(null)">发送</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ct-wrap { display: flex; flex-direction: column; gap: 10px; }
.ct-bar { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.ct-tabs button { border: 1px solid #e2e2e2; background: #fff; border-radius: 14px; padding: 3px 10px; cursor: pointer; }
.ct-tabs button.on { background: #1b66c9; color: #fff; border-color: #1b66c9; }
.ct-only { font-size: 13px; color: #555; }
.ct-count { margin-left: auto; font-size: 12px; color: #999; }
.ct-empty { color: #999; padding: 18px; text-align: center; border: 1px dashed #ddd; border-radius: 10px; }
.ct-node { border: 1px solid #eee; border-radius: 10px; padding: 10px 12px; background: #fff; }
.ct-head { display: flex; align-items: center; gap: 8px; font-size: 13px; }
.ct-floor { color: #1b66c9; font-weight: 700; }
.ct-author { font-weight: 600; }
.ct-author.sm { font-size: 13px; }
.ct-lz { font-size: 11px; background: #fef3c7; color: #92400e; border-radius: 8px; padding: 0 6px; }
.ct-time { color: #999; font-size: 12px; }
.ct-time.sm { margin-left: 6px; }
.ct-foldtag { font-size: 11px; color: #b45309; background: #fef3c7; border-radius: 8px; padding: 0 6px; }
.ct-body { margin: 6px 0; font-size: 14px; line-height: 1.6; word-break: break-word; }
.ct-body.sm { display: inline; margin-left: 6px; }
.ct-body :deep(.ct-mention), .ct-node :deep(.ct-mention) { color: #1b66c9; font-weight: 600; }
.ct-replyto { color: #7c3aed; font-size: 12px; }
.ct-edited { color: #999; font-size: 11px; }
.ct-ops { display: flex; gap: 8px; flex-wrap: wrap; }
.ct-ops button, .ct-pager button, .ct-foot button { border: 1px solid #e5e5e5; background: #fafafa; border-radius: 12px; padding: 2px 10px; cursor: pointer; font-size: 12px; }
.ct-ops.sm button { border: none; background: none; color: #1b66c9; padding: 0 4px; }
.ct-ops button.primary, .ct-foot button.primary, .ct-replyops button.primary { background: #1b66c9; color: #fff; border-color: #1b66c9; }
.ct-folded button { border: none; background: none; color: #1b66c9; cursor: pointer; }
.ct-children { margin-top: 8px; padding-left: 12px; border-left: 2px solid #f0f0f0; display: flex; flex-direction: column; gap: 6px; }
.ct-child { font-size: 13px; background: #fafafa; border-radius: 8px; padding: 6px 8px; }
.ct-replybox { margin-top: 8px; display: flex; flex-direction: column; gap: 6px; }
.ct-replybox textarea { width: 100%; border: 1px solid #ddd; border-radius: 8px; padding: 8px; font-size: 14px; }
.ct-replyops { display: flex; gap: 8px; align-items: center; justify-content: flex-end; }
.ct-err { color: #e11d48; font-size: 12px; margin-right: auto; }
.ct-quote { font-size: 12px; color: #666; background: #f6f6f6; border-radius: 6px; padding: 4px 8px; }
.ct-pager { display: flex; gap: 10px; align-items: center; justify-content: center; }
.ct-foot { margin-top: 4px; }
.wall-mark { background: #fef08a; }
</style>
