/**
 * ════════════════════════════════════════════════════════════════════
 * @模块路径  src/im/api.js
 * @职责      站内私信数据访问层（唯一发请求的地方）—— 网关优先 ·
 *            localStorage 兜底 · 后端契约预留；组件不得直接 fetch
 * @入口      listThreads / getThread / sendMessage / markThreadRead /
 *            deleteThread / blockUser / unblockUser / listBlocks /
 *            searchLocal / exportThreads / unreadTotal
 * @依赖      无（纯 fetch + localStorage；不依赖 wall/api，避免循环）
 * @被谁用    ./store.js · views/Messages.vue · Agent workflows（私信预留）
 * @降级策略  网关可达 → REST /api/pm*；不可达 → local* 读写 localStorage，
 *            返回值标记 {offline:true} 供 UI 显示“本机模式”
 * @后端切换  实现 config.API_CONTRACT [BE] /api/pm* 后，把对应 local* 分支
 *            改为真实接口即可（函数签名不变，组件零改动）
 * ════════════════════════════════════════════════════════════════════
 *
 * ── 后端接口契约（与 wall/config.API_CONTRACT 对齐，前后端共识）────
 *   [BE] GET  /api/pm/threads            → {threads:[{peer,lastText,lastTs,unread}]}
 *   [BE] GET  /api/pm/:peer?since=<ts>   → {messages:[…]} 增量拉取
 *   [BE] POST /api/pm/:peer              → 发送 {text,image?} → {message}
 *   [BE] POST /api/pm/:peer/read         → 标已读 {peer} → {ok}
 *   [BE] POST /api/pm/block              → 拉黑 {peer} → {ok}
 */

export const IM_VERSION = '1.0.0'

import { apiUrl } from '../wall/apiBase.js'

const LS_THREADS = 'im_threads_v1'   // {peer: {peer, messages:[], unread, updatedAt, draft}}
const LS_BLOCKS = 'im_blocks_v1'     // [peer]
const LS_MSGLOG = 'im_msglog_v1'     // 最近发送时间戳（防连击）
const MAX_MSG = 500                 // 单会话保留上限
const MAX_THREADS = 100
const MAX_LEN = 1000

/* ──────────────────────── 工具 ──────────────────────── */

async function http(path, opts = {}) {
  const r = await fetch(apiUrl(path), {
    method: opts.method || 'GET',
    headers: { 'Content-Type': 'application/json' },
    body: opts.body ? JSON.stringify(opts.body) : undefined
  })
  const d = await r.json().catch(() => ({}))
  if (!r.ok) {
    const err = new Error(d.error || 'HTTP ' + r.status)
    err.status = r.status
    throw err
  }
  return d
}

function lsGet(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback } catch { return fallback }
}
function lsSet(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)) } catch { /* noop */ }
}
function genId() {
  return 'M' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}
function now() { return Date.now() }
function me() {
  try { return localStorage.getItem('qdu_wall_name') || '我' } catch { return '我' }
}

/** 会话表读写 */
function readThreads() {
  const t = lsGet(LS_THREADS, {})
  return (t && typeof t === 'object') ? t : {}
}
function writeThreads(t) {
  const keys = Object.keys(t).slice(-MAX_THREADS)
  const slim = {}
  for (const k of keys) slim[k] = t[k]
  lsSet(LS_THREADS, slim)
}

/* ──────────────────────── 会话 ──────────────────────── */

/**
 * 会话列表（按更新倒序；被拉黑者自动隐藏，会话保留）
 * @returns {Promise<{threads, offline}>}
 */
export async function listThreads() {
  try {
    const d = await http('/api/pm/threads')
    return { threads: d.threads || [], offline: false }
  } catch {
    const t = readThreads()
    const blocks = new Set(lsGet(LS_BLOCKS, []))
    const threads = Object.values(t)
      .filter((th) => !blocks.has(th.peer))
      .map((th) => ({
        peer: th.peer,
        lastText: th.messages.length ? th.messages[th.messages.length - 1].text : '',
        lastTs: th.updatedAt || 0,
        unread: th.unread || 0,
        hasDraft: !!(th.draft && th.draft.trim())
      }))
      .sort((a, b) => b.lastTs - a.lastTs)
    return { threads, offline: true }
  }
}

/**
 * 取单会话消息（含标已读可选）
 * @param {string} peer 对方昵称
 * @param {object} opt {markRead:boolean}
 */
export async function getThread(peer, opt = {}) {
  const p = String(peer || '').slice(0, 24)
  if (!p) throw new Error('缺少会话对象')
  try {
    const d = await http('/api/pm/' + encodeURIComponent(p))
    if (opt.markRead) {
      try { await http('/api/pm/' + encodeURIComponent(p) + '/read', { method: 'POST' }) } catch { /* noop */ }
    }
    return { messages: d.messages || [], offline: false }
  } catch {
    const t = readThreads()
    const th = t[p] || { peer: p, messages: [], unread: 0, updatedAt: 0 }
    if (opt.markRead && th.unread) {
      th.unread = 0
      t[p] = th
      writeThreads(t)
    }
    return { messages: th.messages || [], offline: true }
  }
}

/* ──────────────────────── 发送 ──────────────────────── */

/** 发送冷却（3s 内连发拦截，防手抖 double-tap） */
function coolOk() {
  const last = lsGet(LS_MSGLOG, 0)
  if (now() - last < 3000) return false
  lsSet(LS_MSGLOG, now())
  return true
}

/**
 * 发私信（空内容/超长/拉黑/刷屏逐项校验，一次返回明确错误）
 * @param {string} peer
 * @param {string} text
 */
export async function sendMessage(peer, text) {
  const p = String(peer || '').trim().slice(0, 24)
  const t = String(text || '').trim().slice(0, MAX_LEN)
  if (!p) throw new Error('缺少接收人')
  if (t.length < 1) throw new Error('消息不能为空')
  if (lsGet(LS_BLOCKS, []).includes(p)) throw new Error('对方已被你拉黑，先解除拉黑再发')
  if (!coolOk()) throw new Error('发得太快了，3 秒后再发')
  const mine = me()
  try {
    const d = await http('/api/pm/' + encodeURIComponent(p), { method: 'POST', body: { text: t } })
    // 网关成功也同步一份到本地（离线可回看）
    const threads = readThreads()
    const th = threads[p] || { peer: p, messages: [], unread: 0, updatedAt: 0 }
    th.messages.push(d.message || { id: genId(), from: mine, to: p, text: t, ts: now(), mine: true })
    th.messages = th.messages.slice(-MAX_MSG)
    th.updatedAt = now()
    th.draft = ''
    threads[p] = th
    writeThreads(threads)
    return { message: d.message || th.messages[th.messages.length - 1], offline: false }
  } catch (e) {
    if (e.status === 400 || e.status === 403 || e.status === 429) throw e
    const threads = readThreads()
    const th = threads[p] || { peer: p, messages: [], unread: 0, updatedAt: 0 }
    const msg = { id: genId(), from: mine, to: p, text: t, ts: now(), mine: true, local: true }
    th.messages.push(msg)
    th.messages = th.messages.slice(-MAX_MSG)
    th.updatedAt = now()
    th.draft = ''
    threads[p] = th
    writeThreads(threads)
    return { message: msg, offline: true }
  }
}

/**
 * 模拟收到（本机演示用：Agent 回复 / 对方自动回复落盘；后端期由推送代替）
 * @param {string} peer
 * @param {string} text
 */
export function receiveLocal(peer, text) {
  const p = String(peer || '').trim().slice(0, 24)
  if (!p || !String(text || '').trim()) return null
  const threads = readThreads()
  const th = threads[p] || { peer: p, messages: [], unread: 0, updatedAt: 0 }
  const msg = { id: genId(), from: p, to: me(), text: String(text).slice(0, MAX_LEN), ts: now(), mine: false }
  th.messages.push(msg)
  th.messages = th.messages.slice(-MAX_MSG)
  th.unread = (th.unread || 0) + 1
  th.updatedAt = now()
  threads[p] = th
  writeThreads(threads)
  return msg
}

/** 标会话已读 */
export async function markThreadRead(peer) {
  const p = String(peer || '')
  try {
    await http('/api/pm/' + encodeURIComponent(p) + '/read', { method: 'POST' })
    return { offline: false }
  } catch {
    const t = readThreads()
    if (t[p]) { t[p].unread = 0; writeThreads(t) }
    return { offline: true }
  }
}

/** 删除会话（含全部消息，不可恢复，调用方先 confirm） */
export async function deleteThread(peer) {
  const p = String(peer || '')
  try {
    await http('/api/pm/' + encodeURIComponent(p), { method: 'DELETE' }).catch(() => ({}))
  } catch { /* 本地照删 */ }
  const t = readThreads()
  delete t[p]
  writeThreads(t)
  return true
}

/* ──────────────────────── 草稿 ──────────────────────── */

/** 存会话草稿（切换会话不丢字） */
export function saveDraft(peer, text) {
  const p = String(peer || '')
  if (!p) return
  const t = readThreads()
  const th = t[p] || { peer: p, messages: [], unread: 0, updatedAt: now() }
  th.draft = String(text || '').slice(0, MAX_LEN)
  t[p] = th
  writeThreads(t)
}
/** 取会话草稿 */
export function getDraft(peer) {
  const t = readThreads()
  return (t[String(peer || '')] || {}).draft || ''
}

/* ──────────────────────── 拉黑 ──────────────────────── */

export function listBlocks() {
  return lsGet(LS_BLOCKS, [])
}
/** 拉黑（会话隐藏 + 禁止发送；后端期同步服务端） */
export async function blockUser(peer) {
  const p = String(peer || '').trim()
  if (!p) throw new Error('缺少对象')
  try { await http('/api/pm/block', { method: 'POST', body: { peer: p } }).catch(() => ({})) } catch { /* noop */ }
  const b = new Set(lsGet(LS_BLOCKS, []))
  b.add(p)
  lsSet(LS_BLOCKS, [...b])
  return [...b]
}
export async function unblockUser(peer) {
  const p = String(peer || '').trim()
  try { await http('/api/pm/unblock', { method: 'POST', body: { peer: p } }).catch(() => ({})) } catch { /* noop */ }
  lsSet(LS_BLOCKS, lsGet(LS_BLOCKS, []).filter((x) => x !== p))
  return lsGet(LS_BLOCKS, [])
}

/* ──────────────────────── 检索 / 统计 ──────────────────────── */

/** 本地全文检索（跨会话搜消息；后端期换服务端检索） */
export function searchLocal(q) {
  const kw = String(q || '').trim().toLowerCase()
  if (!kw) return []
  const out = []
  for (const th of Object.values(readThreads())) {
    for (const m of th.messages || []) {
      if ((m.text || '').toLowerCase().includes(kw)) {
        out.push({ peer: th.peer, message: m })
        if (out.length >= 50) return out
      }
    }
  }
  return out.sort((a, b) => b.message.ts - a.message.ts)
}

/** 全站未读总数（小红点用） */
export function unreadTotal() {
  return Object.values(readThreads()).reduce((a, th) => a + (th.unread || 0), 0)
}

/** 导出全量（设置页备份用） */
export function exportThreads() {
  return { version: IM_VERSION, exportedAt: now(), threads: readThreads(), blocks: lsGet(LS_BLOCKS, []) }
}
