<script setup>
/**
 * ════════════════════════════════════════════════════════════════════
 * @模块路径  src/wall/components/WallThread.vue
 * @职责      帖子详情页：主楼完整展示 + 楼层制回复（#1F 起）+ 只看楼主 +
 *            悬赏采纳（本地积分结算，后端期见 API_CONTRACT.adopt）+
 *            收藏/分享/举报/浏览计数
 * @props     post · offline · words
 * @emits     back · reply(content,author) · adopt(replyId) · report · fav · like
 * @被谁用    CampusWall.vue（detail 模式）
 * ════════════════════════════════════════════════════════════════════
 */
import { ref, computed, watch } from 'vue'
import { partOf, POINTS } from '../config.js'
import { isFav, toggleFav } from '../api.js'
import WallPostCard from './WallPostCard.vue'

const props = defineProps({
  post: { type: Object, required: true },
  offline: { type: Boolean, default: false },
  words: { type: Array, default: () => [] }
})
const emit = defineEmits(['back', 'reply', 'adopt', 'report', 'like', 'react', 'vote', 'editLocal'])

const onlyAuthor = ref(false)
const replyText = ref('')
const replyAuthor = ref('')
const fav = ref(isFav(props.post.id))
const quoteFloor = ref(null)   // 引用的楼层 {floor, author, text}（Discourse 式选中引用）
const err = ref('')
const copied = ref(false)

watch(() => props.post.id, () => { onlyAuthor.value = false; replyText.value = ''; fav.value = isFav(props.post.id) })

const part = computed(() => partOf(props.post.tag))
/** 楼层的子回复（嵌套一层：parent 指向楼层 id） */
function subOf(id) { return (props.post.replies || []).filter((r) => r.parent === id) }
/** 是否本人可编辑/删除（本地帖或本机作者） */
function mine(r) {
  try {
    const me = localStorage.getItem('qdu_wall_name') || ''
    return (me && r.author === me && !props.offline) || String(props.post.id).startsWith('L')
  } catch { return String(props.post.id).startsWith('L') }
}
function editReply(r) {
  const text = prompt('编辑回复（原文会显示在框中）：', r.content)
  if (text == null) return
  if (text.trim().length < 2) return
  r.content = text.trim()
  r.edited = true
  emit('editLocal')   // 通知父组件把本机帖落盘
}
function deleteReply(r) {
  if (!confirm('删除这条回复？')) return
  const arr = props.post.replies
  const i = arr.indexOf(r)
  if (i >= 0) arr.splice(i, 1)
  // 连带删除其子回复
  for (let j = arr.length - 1; j >= 0; j--) if (arr[j].parent === r.id) arr.splice(j, 1)
  emit('editLocal')
}
/** @提及：输入 @ 弹出本帖作者列表插入 */
function insertMention(r) {
  replyText.value = ('@' + r.author + ' ') + replyText.value
  const ta = document.querySelector('.wt-text')
  if (ta) ta.focus()
}

const shownReplies = computed(() => {
  const list = props.post.replies || []
  if (!onlyAuthor.value) return list
  return list.filter((r) => r.author === props.post.author)
})

function fmt(ts) {
  const d = new Date(ts)
  return (d.getMonth() + 1) + '-' + d.getDate() + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0')
}
function precheck(t) {
  const s = (t || '').toLowerCase()
  return props.words.find((w) => w && s.includes(String(w).toLowerCase()))
}
function quote(r, floor) {
  quoteFloor.value = { floor, author: r.author, text: r.content.slice(0, 60) }
  replyText.value = '> #' + floor + '楼 ' + r.author + '：' + r.content.slice(0, 60) + (r.content.length > 60 ? '…' : '') + '\n\n'
  const ta = document.querySelector('.wt-text')
  if (ta) ta.focus()
}
function doReply() {
  err.value = ''
  const c = replyText.value.trim()
  if (c.length < 2) { err.value = '回复太短'; return }
  const hit = precheck(c)
  if (hit) { err.value = '包含违规词「' + hit + '」'; return }
  emit('reply', c, replyAuthor.value.trim() || '匿名同学')
  replyText.value = ''
}
function doFav() {
  fav.value = toggleFav(props.post.id)
}
function doCopy() {
  try {
    navigator.clipboard.writeText(location.href.split('#')[0] + '#/app/campusWall')
    copied.value = true
    setTimeout(() => { copied.value = false }, 1500)
  } catch { /* noop */ }
}
function isMyPost() {
  // 本地帖（L 开头）且作者与当前输入一致 → 可采纳（后端期由登录态判定）
  return String(props.post.id).startsWith('L')
}
</script>

<template>
  <div class="wt">
    <div class="wt-bar">
      <button class="wt-back" @click="emit('back')">‹ 返回列表</button>
      <span class="wt-part" :style="{ color: part.color, borderColor: part.color + '55' }">{{ part.icon }} {{ part.name }}</span>
      <label v-if="(post.replies || []).length" class="wt-only"><input type="checkbox" v-model="onlyAuthor" /> 只看楼主</label>
      <button class="wt-mini" @click="doFav">{{ fav ? '⭐ 已藏' : '☆ 收藏' }}</button>
      <button class="wt-mini" @click="doCopy">{{ copied ? '✓ 已复制' : '🔗 分享' }}</button>
      <button class="wt-mini danger" @click="emit('report', post)">🚩 举报</button>
    </div>

    <!-- 主楼 -->
    <WallPostCard :post="post" :fav="fav" compact @like="emit('like', $event)" @react="(p, e) => emit('react', p, e)"
      @report="emit('report', $event)" @vote="(p, i) => emit('vote', p, i)" @fav="doFav" @open="() => {}" />

    <!-- 楼层回复 -->
    <div class="wt-floors">
      <div class="wt-floors-head">
        <b>回复 {{ (post.replies || []).length }} 条</b>
        <span class="wt-offline" v-if="offline">🟡 本机模式</span>
      </div>

      <div v-if="!shownReplies.length" class="wt-empty">还没有回复，抢 #1 楼 🥇</div>

      <div v-for="(r, i) in shownReplies" :key="r.id" class="wt-floor" :class="{ adopted: post.bounty && post.bounty.adoptedId === r.id }">
        <div class="wt-floor-no">#{{ i + 1 }}</div>
        <div class="wt-floor-main">
          <div class="wt-floor-meta">
            <b>{{ r.author }}</b>
            <span v-if="post.author === r.author" class="wt-op">楼主</span>
            <span v-if="post.bounty && post.bounty.adoptedId === r.id" class="wt-adopted">🌟 已采纳 +{{ post.bounty.points || POINTS.adopted }}</span>
            <span v-if="r.edited" class="wt-edited">已编辑</span>
            <span class="wt-time">{{ fmt(r.ts) }}</span>
          </div>
          <div class="wt-floor-content">{{ r.content }}</div>
          <!-- 嵌套子回复（一层缩进） -->
          <div v-if="subOf(r.id).length" class="wt-subs">
            <div v-for="sr in subOf(r.id)" :key="sr.id" class="wt-sub">
              <b>{{ sr.author }}</b><span class="wt-time">{{ fmt(sr.ts) }}</span>
              <div class="wt-floor-content">{{ sr.content }}</div>
            </div>
          </div>
          <div class="wt-floor-ops">
            <button class="wt-quote" @click="quote(r, i + 1)">💬 引用</button>
            <button class="wt-quote" @click="insertMention(r)">@ 提及</button>
            <button v-if="mine(r)" class="wt-quote" @click="editReply(r)">✏️ 编辑</button>
            <button v-if="mine(r)" class="wt-quote danger" @click="deleteReply(r)">🗑 删除</button>
            <button v-if="post.bounty && !post.bounty.adoptedId && (isMyPost() || offline)" class="wt-adopt" @click="emit('adopt', r)">
              ⭐ 采纳此回答（{{ post.bounty.points || POINTS.adopted }} 积分）
            </button>
          </div>
        </div>
      </div>

      <!-- 回复框 -->
      <div class="wt-replybox">
        <input v-model="replyAuthor" class="wt-input" maxlength="24" placeholder="昵称（留空=匿名）" />
        <div v-if="quoteFloor" class="wt-quotehint">💬 正在引用 #{{ quoteFloor.floor }} 楼 @{{ quoteFloor.author }}
          <button class="wt-mini" @click="quoteFloor = null; replyText = ''">取消引用</button>
        </div>
        <textarea v-model="replyText" class="wt-text" rows="3" maxlength="500" placeholder="写下你的回复…（自动敏感词校验；点楼层「引用」可带上下文）"></textarea>
        <div class="wt-reply-foot">
          <span v-if="err" class="wt-err">⚠ {{ err }}</span>
          <span class="wt-count">{{ replyText.length }}/500</span>
          <button class="wt-submit" @click="doReply">回复</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.wt { display: flex; flex-direction: column; gap: 12px; }
.wt-bar { display: flex; align-items: center; gap: 9px; flex-wrap: wrap; }
.wt-back { border: 1px solid var(--border, #e5eaf2); background: var(--card, #fff); color: var(--text, #24292f); border-radius: 999px; padding: 6px 14px; cursor: pointer; font-family: inherit; font-size: 13px; }
.wt-part { font-size: 11.5px; border: 1px solid; border-radius: 999px; padding: 2px 10px; font-weight: 600; }
.wt-only { font-size: 12.5px; color: var(--muted, #8a94a6); display: flex; align-items: center; gap: 4px; }
.wt-mini { border: 1px solid var(--border, #e5eaf2); background: var(--card, #fff); color: var(--muted, #8a94a6); font-size: 12px; padding: 4px 11px; border-radius: 999px; cursor: pointer; font-family: inherit; }
.wt-mini:hover { border-color: var(--primary, #1b66c9); color: var(--primary, #1b66c9); }
.wt-mini.danger:hover { border-color: #e11d48; color: #e11d48; }

.wt-floors { border: 1px solid var(--border, #e5eaf2); background: var(--card, #fff); border-radius: 14px; padding: 14px 16px; }
.wt-floors-head { display: flex; justify-content: space-between; align-items: center; font-size: 13.5px; color: var(--text, #24292f); margin-bottom: 11px; }
.wt-offline { font-size: 11px; color: #b45309; }
.wt-empty { padding: 26px; text-align: center; color: var(--muted, #8a94a6); font-size: 13px; }

.wt-floor { display: flex; gap: 11px; padding: 11px 0; border-top: 1px dashed var(--border, #e5eaf2); }
.wt-floor.adopted { background: rgba(217, 119, 6, 0.05); border-radius: 9px; padding: 11px 9px; }
.wt-floor-no { font-size: 12px; font-weight: 800; color: var(--muted, #8a94a6); width: 34px; flex-shrink: 0; font-variant-numeric: tabular-nums; }
.wt-floor-main { flex: 1; min-width: 0; }
.wt-floor-meta { display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--muted, #8a94a6); flex-wrap: wrap; }
.wt-floor-meta b { color: var(--text, #24292f); font-size: 13px; }
.wt-op { font-size: 10.5px; background: var(--primary, #1b66c9); color: #fff; border-radius: 4px; padding: 0 6px; font-weight: 700; }
.wt-adopted { font-size: 10.5px; background: rgba(217, 119, 6, 0.15); color: #d97706; border-radius: 999px; padding: 1px 8px; font-weight: 700; }
.wt-time { margin-left: auto; font-size: 11px; }
.wt-floor-content { font-size: 13.5px; line-height: 1.7; color: var(--text, #24292f); margin-top: 5px; white-space: pre-wrap; word-break: break-word; }
.wt-floor-ops { margin-top: 6px; }
.wt-quote { border: 1px solid var(--border, #e5eaf2); background: transparent; color: var(--muted, #8a94a6); font-size: 11.5px; padding: 4px 12px; border-radius: 999px; cursor: pointer; font-family: inherit; }
.wt-quote.danger:hover { border-color: #e11d48; color: #e11d48; }
.wt-edited { font-size: 10px; color: var(--muted, #8a94a6); font-style: italic; }
.wt-subs { margin-top: 8px; margin-left: 22px; border-left: 2px solid rgba(27,102,201,0.3); padding-left: 11px; display: flex; flex-direction: column; gap: 7px; }
.wt-sub { background: var(--bg, #f7f9fc); border-radius: 8px; padding: 7px 11px; font-size: 12.5px; }
.wt-sub b { color: var(--primary, #1b66c9); font-size: 12.5px; }
.wt-sub .wt-time { margin-left: 8px; font-size: 10.5px; color: var(--muted, #8a94a6); }
.wt-quote:hover { border-color: var(--primary, #1b66c9); color: var(--primary, #1b66c9); }
.wt-quotehint { font-size: 12px; color: var(--primary, #1b66c9); background: var(--primary-soft, rgba(27,102,201,0.08)); border-radius: 8px; padding: 7px 11px; display: flex; align-items: center; gap: 10px; }
.wt-adopt { border: 1px solid #d97706; background: rgba(217, 119, 6, 0.08); color: #d97706; font-size: 11.5px; padding: 4px 12px; border-radius: 999px; cursor: pointer; font-family: inherit; font-weight: 600; }
.wt-adopt:hover { background: #d97706; color: #fff; }

.wt-replybox { margin-top: 13px; border-top: 1px solid var(--border, #e5eaf2); padding-top: 13px; display: flex; flex-direction: column; gap: 8px; }
.wt-input { border: 1px solid var(--border, #e5eaf2); border-radius: 9px; padding: 8px 12px; font-size: 13px; font-family: inherit; background: var(--bg, #fff); color: var(--text, #24292f); outline: none; width: 200px; }
.wt-text { border: 1px solid var(--border, #e5eaf2); border-radius: 9px; padding: 9px 12px; font-size: 13.5px; font-family: inherit; background: var(--bg, #fff); color: var(--text, #24292f); resize: vertical; outline: none; line-height: 1.65; }
.wt-text:focus, .wt-input:focus { border-color: var(--primary, #1b66c9); }
.wt-reply-foot { display: flex; align-items: center; gap: 10px; justify-content: flex-end; }
.wt-err { color: #d1242f; font-size: 12.5px; margin-right: auto; }
.wt-count { font-size: 11.5px; color: var(--muted, #8a94a6); }
.wt-submit { border: none; background: var(--primary, #1b66c9); color: #fff; padding: 8px 22px; border-radius: 999px; cursor: pointer; font-family: inherit; font-size: 13.5px; font-weight: 600; }
</style>
