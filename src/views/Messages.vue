<script setup>
/**
 * ════════════════════════════════════════════════════════════════════
 * @模块路径  src/views/Messages.vue
 * @职责      站内私信页：会话列表 + 聊天窗 + 表情 + 搜索 + 联系人推荐 +
 *            拉黑管理 —— 无后端期全走本机，联网自动并轨
 * @路由      #/app/messages（VIEWS.messages + data/apps 双登记）
 * @数据      src/im/store.js（单例）· 网关 /api/pm*（后端期）
 * @交互      切会话草稿保留 · 敏感词预检 · 3s 连发冷却 · 未读小红点 ·
 *            联系人推荐（墙互动作者池）· 删除/拉黑二次确认
 * @被谁用    App.vue 路由；Agent 工作流（私信直达深链本页）
 * ════════════════════════════════════════════════════════════════════
 */
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { useImStore } from '../im/store.js'
import { loadPosts } from '../wall/api.js'
import RichEditor from '../wall/components/RichEditor.vue'

const emit = defineEmits(['back'])
const store = useImStore()

/* ── 状态 ── */
const input = ref('')
const search = ref('')
const showContacts = ref(true)
const contacts = ref([])
const confirmBox = ref('')
const boxRef = ref(null)
const EMOJIS = ['😂', '👍', '❤️', '🔥', '🙏', '🎉', '🤔', '🍜']
const showEmoji = ref(false)

const threads = computed(() => {
  const kw = search.value.trim().toLowerCase()
  if (!kw) return store.threads.value
  return store.threads.value.filter((t) =>
    t.peer.toLowerCase().includes(kw) || (t.lastText || '').toLowerCase().includes(kw))
})

function fmt(ts) {
  const diff = (Date.now() - (ts || 0)) / 1000
  if (diff < 60) return '刚刚'
  if (diff < 3600) return Math.floor(diff / 60) + ' 分钟前'
  if (diff < 86400) return Math.floor(diff / 3600) + ' 小时前'
  const d = new Date(ts || Date.now())
  return (d.getMonth() + 1) + '-' + d.getDate()
}
function fmtMsg(ts) {
  const d = new Date(ts || Date.now())
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0')
}
function scrollBottom() {
  nextTick(() => { try { boxRef.value && (boxRef.value.scrollTop = boxRef.value.scrollHeight) } catch { /* noop */ } })
}
watch(() => store.messages.value.length, scrollBottom)

/* ── 会话操作 ── */
async function open(peer) {
  // 存旧会话草稿
  if (store.active.value && store.active.value !== peer) store.saveDraftOf(store.active.value, input.value)
  await store.openThread(peer)
  input.value = store.draftOf(peer)
  scrollBottom()
}
let draftTimer = null
function onInput() {
  clearTimeout(draftTimer)
  draftTimer = setTimeout(() => {
    if (store.active.value) store.saveDraftOf(store.active.value, input.value)
  }, 800)
}
const posts = ref([])
async function send() {
  const t = input.value.trim()
  if (!t || !store.active.value) return
  try {
    await store.send(store.active.value, t)
    input.value = ''
    scrollBottom()
  } catch (e) {
    store.showToast(e.message)
  }
}
function addEmoji(e) { input.value += e; showEmoji.value = false }
function askDelete(peer) { confirmBox.value = 'del:' + peer }
function askBlock(peer) { confirmBox.value = 'block:' + peer }
async function doConfirm() {
  const [act, peer] = confirmBox.value.split(/:(.+)/)
  confirmBox.value = ''
  if (act === 'del') await store.removeThread(peer)
  if (act === 'block') await store.block(peer)
}
async function refreshAll() {
  await store.refresh()
  // 联系人推荐：拉墙作者池（失败则隐藏推荐区，不挡主流程）
  try {
    const r = await loadPosts({ sort: 'new' })
    posts.value = r.posts || []
    contacts.value = store.contacts(r.posts, 8)
  } catch { contacts.value = [] }
}

onMounted(async () => {
  await refreshAll()
  store.startPolling()
  // 深链：#/app/messages?peer=xxx → 直达会话（Agent 私信直达用）
  try {
    const m = /peer=([^&]+)/.exec(location.hash)
    if (m) open(decodeURIComponent(m[1]))
  } catch { /* noop */ }
})
onBeforeUnmount(() => {
  if (store.active.value) store.saveDraftOf(store.active.value, input.value)
  store.stopPolling()
})
</script>

<template>
  <div class="msg-wrap">
    <div class="msg-head">
      <button class="back" @click="emit('back')">‹ 返回</button>
      <b>💬 私信</b>
      <span v-if="store.offline.value" class="off">本机模式</span>
      <span v-else class="on">实时</span>
      <button class="refresh" @click="refreshAll">↻</button>
    </div>
    <div v-if="store.toast.value" class="msg-toast">{{ store.toast.value }}</div>

    <div class="msg-body">
      <!-- 左：会话列表 -->
      <div class="msg-left">
        <input v-model="search" class="msg-search" placeholder="搜索会话/消息" />
        <div v-if="showContacts && contacts.length" class="msg-contacts">
          <div class="ct-t">👥 可能认识（墙互动推荐）</div>
          <button v-for="c in contacts" :key="c.peer" class="ct-item" @click="open(c.peer)">
            {{ c.peer }}
          </button>
        </div>
        <div v-if="!threads.length" class="msg-empty">还没有私信，去墙里找同学聊聊吧～</div>
        <div
          v-for="t in threads" :key="t.peer"
          class="msg-thread" :class="{ on: store.active.value === t.peer }"
          @click="open(t.peer)"
        >
          <div class="th-top">
            <b>{{ t.peer }}</b>
            <span class="th-time">{{ fmt(t.lastTs) }}</span>
          </div>
          <div class="th-sub">
            <span class="th-last">{{ t.hasDraft ? '✏️[草稿] ' : '' }}{{ t.lastText || '（空）' }}</span>
            <span v-if="t.unread" class="th-unread">{{ t.unread }}</span>
          </div>
        </div>
      </div>

      <!-- 右：聊天窗 -->
      <div class="msg-right">
        <div v-if="!store.active.value" class="msg-none">← 选一个会话开始聊天</div>
        <template v-else>
          <div class="chat-head">
            <b>{{ store.active.value }}</b>
            <span class="chat-ops">
              <button @click="askDelete(store.active.value)">删除</button>
              <button @click="askBlock(store.active.value)">拉黑</button>
            </span>
          </div>
          <div v-if="confirmBox" class="confirm">
            <span>{{ confirmBox.startsWith('del:') ? '删除整个会话（含消息，不可恢复）？' : '拉黑后对方消息不再显示，继续？' }}</span>
            <button @click="confirmBox = ''">取消</button>
            <button class="danger" @click="doConfirm">确认</button>
          </div>
          <div class="chat-search">
            <input v-model="store.keyword.value" placeholder="会话内搜索" />
          </div>
          <div ref="boxRef" class="chat-box">
            <div
              v-for="m in store.filteredMessages.value" :key="m.id"
              class="bubble" :class="{ mine: m.mine }"
            >
              <div class="b-text">{{ m.text }}</div>
              <div class="b-time">{{ fmtMsg(m.ts) }}{{ m.local ? ' ·本机' : '' }}</div>
            </div>
          </div>
          <div class="chat-send">
            <RichEditor
              v-model="input"
              :posts="posts"
              :show-suggest="false"
              @submit="(p) => send(p.content)"
              @mention="(n) => { input = '@' + n + ' ' + input }"
            />
          </div>
          <div v-if="showEmoji" class="emoji-row">
            <button v-for="e in EMOJIS" :key="e" @click="addEmoji(e)">{{ e }}</button>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.msg-wrap { display: flex; flex-direction: column; height: 100%; background: #fff; }
.msg-head { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-bottom: 1px solid #eee; }
.msg-head .back, .msg-head .refresh { border: 1px solid #e5e5e5; background: #fafafa; border-radius: 10px; padding: 3px 10px; cursor: pointer; }
.msg-head .off { font-size: 11px; background: #fef3c7; color: #92400e; border-radius: 8px; padding: 1px 8px; }
.msg-head .on { font-size: 11px; background: #dcfce7; color: #166534; border-radius: 8px; padding: 1px 8px; }
.msg-toast { background: #fef2f2; color: #b91c1c; font-size: 13px; padding: 6px 14px; }
.msg-body { display: flex; flex: 1; min-height: 0; }
.msg-left { width: 250px; border-right: 1px solid #eee; overflow-y: auto; padding: 8px; display: flex; flex-direction: column; gap: 6px; }
.msg-search { border: 1px solid #ddd; border-radius: 8px; padding: 6px 10px; font-size: 13px; }
.msg-contacts { background: #f8fafc; border-radius: 8px; padding: 6px; }
.ct-t { font-size: 12px; color: #666; margin-bottom: 4px; }
.ct-item { border: 1px solid #dbeafe; background: #eff6ff; border-radius: 12px; padding: 2px 10px; margin: 0 4px 4px 0; cursor: pointer; font-size: 12px; }
.msg-empty { color: #999; font-size: 13px; text-align: center; padding: 20px 0; }
.msg-thread { border: 1px solid #f0f0f0; border-radius: 10px; padding: 8px 10px; cursor: pointer; }
.msg-thread.on { border-color: #1b66c9; background: #eff6ff; }
.th-top { display: flex; justify-content: space-between; font-size: 14px; }
.th-time { font-size: 11px; color: #999; }
.th-sub { display: flex; justify-content: space-between; align-items: center; margin-top: 2px; }
.th-last { font-size: 12px; color: #888; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 170px; }
.th-unread { background: #e11d48; color: #fff; font-size: 11px; border-radius: 999px; padding: 0 7px; }
.msg-right { flex: 1; display: flex; flex-direction: column; min-width: 0; }
.msg-none { margin: auto; color: #999; }
.chat-head { display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; border-bottom: 1px solid #eee; }
.chat-ops button { border: 1px solid #e5e5e5; background: #fafafa; border-radius: 10px; padding: 2px 10px; cursor: pointer; font-size: 12px; margin-left: 6px; }
.confirm { display: flex; gap: 8px; align-items: center; background: #fef2f2; padding: 8px 14px; font-size: 13px; }
.confirm .danger { background: #e11d48; color: #fff; border: none; border-radius: 8px; padding: 3px 12px; cursor: pointer; }
.chat-search { padding: 6px 14px 0; }
.chat-search input { width: 100%; border: 1px solid #eee; border-radius: 8px; padding: 5px 10px; font-size: 12px; }
.chat-box { flex: 1; overflow-y: auto; padding: 12px 14px; display: flex; flex-direction: column; gap: 8px; }
.bubble { max-width: 75%; align-self: flex-start; }
.bubble.mine { align-self: flex-end; }
.b-text { background: #f3f4f6; border-radius: 12px; padding: 8px 12px; font-size: 14px; line-height: 1.6; word-break: break-word; }
.bubble.mine .b-text { background: #1b66c9; color: #fff; }
.b-time { font-size: 11px; color: #aaa; margin-top: 2px; }
.chat-send { display: flex; gap: 6px; padding: 10px 14px; border-top: 1px solid #eee; }
.chat-send input { flex: 1; border: 1px solid #ddd; border-radius: 10px; padding: 8px 12px; font-size: 14px; }
.chat-send button { border: 1px solid #e5e5e5; background: #fafafa; border-radius: 10px; padding: 6px 12px; cursor: pointer; }
.chat-send button.primary { background: #1b66c9; color: #fff; border-color: #1b66c9; }
.emoji-row { display: flex; gap: 4px; padding: 0 14px 10px; }
.emoji-row button { border: none; background: none; font-size: 20px; cursor: pointer; }
</style>
