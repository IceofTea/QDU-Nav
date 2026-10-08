/**
 * ════════════════════════════════════════════════════════════════════
 * @模块路径  src/im/store.js
 * @职责      私信状态管理：会话列表缓存 + 当前会话 + 未读聚合 + 联系人
 *            推荐 + 自动回复演示 + SSE/轮询增量 —— Messages.vue 唯一数据源
 * @入口      useImStore（组合式单例）：threads / active / messages /
 *            unread / openThread / send / contacts / autoReply
 * @依赖      ./api（listThreads/getThread/sendMessage/…）· ../wall/notify
 *           （桌面通知复用）· ../wall/moderation（发送预检复用）
 * @被谁用    views/Messages.vue · App.vue 小红点（下一步）· Agent（@发起私信）
 * @降级策略  网关失联全走 local；联系人推荐纯本地计算，零网络依赖
 * @后端切换  api.js 换接口后本模块零改动（只认 {threads,offline} 信封）
 * ════════════════════════════════════════════════════════════════════
 */
import { ref, computed } from 'vue'
import {
  listThreads, getThread, sendMessage as apiSend, receiveLocal,
  markThreadRead, deleteThread as apiDelete, blockUser as apiBlock,
  unblockUser as apiUnblock, listBlocks, saveDraft as apiSaveDraft,
  getDraft as apiGetDraft, searchLocal, unreadTotal
} from './api.js'
import { notifyDesktop, canDesktop } from '../wall/notify.js'
import { precheck } from '../wall/moderation.js'

/* 单例（多组件共享同一份会话状态，避免重复拉取） */
let _store = null

export function useImStore() {
  if (_store) return _store

  const threads = ref([])        // [{peer,lastText,lastTs,unread,hasDraft}]
  const active = ref('')         // 当前 peer
  const messages = ref([])       // 当前会话消息
  const offline = ref(false)
  const loading = ref(false)
  const blocks = ref(listBlocks())
  const keyword = ref('')        // 会话内搜索
  const toast = ref('')
  let pollTimer = null
  let lastUnread = 0

  const unread = computed(() => threads.value.reduce((a, t) => a + (t.unread || 0), 0))
  const activeThread = computed(() => threads.value.find((t) => t.peer === active.value) || null)
  const filteredMessages = computed(() => {
    const kw = keyword.value.trim().toLowerCase()
    if (!kw) return messages.value
    return messages.value.filter((m) => (m.text || '').toLowerCase().includes(kw))
  })

  /**
   * 联系人推荐：从帖子/回复作者池按互动频次排序（排除自己与已拉黑）
   * @param {object[]} posts 校园墙帖子（调用方透传，避免本模块依赖 wall/api）
   * @param {number} limit
   */
  function contacts(posts, limit = 8) {
    let me = ''
    try { me = localStorage.getItem('qdu_wall_name') || '' } catch { /* noop */ }
    const blocked = new Set(blocks.value)
    const freq = new Map()
    for (const p of posts || []) {
      if (p.author && p.author !== me && !blocked.has(p.author)) {
        freq.set(p.author, (freq.get(p.author) || 0) + 2)
      }
      for (const r of p.replies || []) {
        if (r.author && r.author !== me && !blocked.has(r.author)) {
          freq.set(r.author, (freq.get(r.author) || 0) + 1)
        }
      }
    }
    // 已有会话的置顶（最近联系优先）
    const recent = new Set(threads.value.slice(0, 5).map((t) => t.peer))
    return [...freq.entries()]
      .sort((a, b) => ((recent.has(b[0]) ? 100 : 0) + b[1]) - ((recent.has(a[0]) ? 100 : 0) + a[1]))
      .slice(0, limit)
      .map(([peer, score]) => ({ peer, score }))
  }

  function showToast(msg) {
    toast.value = msg
    setTimeout(() => { toast.value = '' }, 2600)
  }

  /** 刷新会话列表（静默：不闪 loading，轮询用） */
  async function refresh(silent = false) {
    if (!silent) loading.value = true
    try {
      const r = await listThreads()
      threads.value = r.threads
      offline.value = r.offline
      const u = unreadTotal()
      // 未读增加 → 桌面提醒（仅新增时打扰一次）
      if (u > lastUnread && threads.value.length) {
        const top = threads.value.find((t) => t.unread > 0)
        if (top && canDesktop()) notifyDesktop('💬 私信新消息', `${top.peer}：${(top.lastText || '').slice(0, 50)}`)
      }
      lastUnread = u
    } finally {
      if (!silent) loading.value = false
    }
  }

  /** 打开会话（拉消息 + 标已读 + 恢复草稿由调用方读 getDraft） */
  async function openThread(peer) {
    const p = String(peer || '').trim()
    if (!p) return
    // 切走前先存当前草稿（调用方把 textarea 值先给 saveDraftOf）
    active.value = p
    loading.value = true
    try {
      const r = await getThread(p, { markRead: true })
      messages.value = r.messages
      offline.value = r.offline
      const th = threads.value.find((t) => t.peer === p)
      if (th) th.unread = 0
      lastUnread = unreadTotal()
    } finally {
      loading.value = false
    }
  }

  /** 发送（预检 + 冷却错误透出给调用方展示） */
  async function send(peer, text) {
    const t = String(text || '').trim()
    if (!t) throw new Error('消息不能为空')
    const { ok, hits } = precheck(t)
    if (!ok) throw new Error('命中敏感词：' + hits.slice(0, 3).join('、'))
    const r = await apiSend(peer, t)
    // 乐观追加（网关/local 双轨都返回 message，直接拼，避免重拉闪烁）
    if (r.message && active.value === peer) {
      if (!messages.value.some((m) => m.id === r.message.id)) messages.value.push(r.message)
    }
    await refresh(true)
    // 演示性自动回复（本机模式趣味彩蛋；后端期由真实对方/推送代替）
    if (r.offline) scheduleAutoReply(peer)
    return r
  }

  /** 本机演示自动回复（3s 后一条，内容按关键词拼 human-like 话术） */
  function scheduleAutoReply(peer) {
    setTimeout(() => {
      // 若用户已删会话则不再打扰
      getThread(peer).then((r) => {
        if (!r.messages.length && !threads.value.some((t) => t.peer === peer)) return
        const last = [...messages.value].reverse().find((m) => m.mine)
        const reply = craftReply(last ? last.text : '')
        receiveLocal(peer, reply)
        if (active.value === peer) {
          getThread(peer).then((rr) => { messages.value = rr.messages })
        }
        refresh(true)
      }).catch(() => { /* noop */ })
    }, 3000)
  }

  /** 关键词自动回复话术（演示级，后端期删除） */
  function craftReply(text) {
    const t = String(text || '')
    if (/拼车|顺风|回家/.test(t)) return '拼车吗？我周五下午也回，时间对得上可以一起走～（本机演示回复）'
    if (/课件|资料|复习|考试/.test(t)) return '资料我整理了一份，在校园墙资源区那帖里，搜“高数”就能找到～（本机演示回复）'
    if (/谢谢|感谢/.test(t)) return '不客气呀，互相帮助～（本机演示回复）'
    if (/你好|在吗|hi|hello/i.test(t)) return '在的在的，什么事呀？（本机演示回复）'
    return '收到收到，稍后详细回你～（本机演示自动回复，联网后为真人）'
  }

  /** 存当前会话草稿（输入框 input 事件直调，防抖由调用方做） */
  function saveDraftOf(peer, text) {
    try { apiSaveDraft(peer, text) } catch { /* noop */ }
    const th = threads.value.find((t) => t.peer === peer)
    if (th) th.hasDraft = !!(text && text.trim())
  }
  function draftOf(peer) {
    try { return apiGetDraft(peer) } catch { return '' }
  }

  async function removeThread(peer) {
    await apiDelete(peer)
    threads.value = threads.value.filter((t) => t.peer !== peer)
    if (active.value === peer) { active.value = ''; messages.value = [] }
  }
  async function block(peer) {
    blocks.value = await apiBlock(peer)
    threads.value = threads.value.filter((t) => t.peer !== peer)
    if (active.value === peer) { active.value = ''; messages.value = [] }
    showToast('已拉黑 ' + peer)
  }
  async function unblock(peer) {
    blocks.value = await apiUnblock(peer)
    await refresh(true)
    showToast('已解除拉黑')
  }

  /** 站内搜索（跨会话） */
  function search(q) {
    try { return searchLocal(q) } catch { return [] }
  }

  /** 启动轮询（20s；与墙轮询错峰；SSE 由 Messages.vue 按需 bind） */
  function startPolling() {
    stopPolling()
    pollTimer = setInterval(() => { refresh(true) }, 20000)
  }
  function stopPolling() {
    if (pollTimer) clearInterval(pollTimer)
    pollTimer = null
  }

  _store = {
    threads, active, messages, offline, loading, blocks, keyword, toast,
    unread, activeThread, filteredMessages,
    refresh, openThread, send, contacts, saveDraftOf, draftOf,
    removeThread, block, unblock, search, startPolling, stopPolling, showToast
  }
  return _store
}

/** 未读数（App 小红点轻量入口，不初始化全 store） */
export function peekUnread() {
  try { return unreadTotal() } catch { return 0 }
}
