/**
 * ════════════════════════════════════════════════════════════════════
 * @模块路径  src/wall/notify.js
 * @职责      校园墙通知层：@提及解析 → 未读收件箱 → 桌面通知 → SSE 实时联动
 *            —— 无后端期的“站内信平替”，后端期换 WS/推送网关时调用方不动
 * @入口      parseMentions / buildInbox / unreadCount / markRead /
 *            notifyDesktop / bindSSE / formatNotify
 * @依赖      无（storage key 内聚本模块；SSE 订阅复用 /api/events）
 * @被谁用    CampusWall.vue · WallThread/CommentTree（@插入回显未读）·
 *            ReminderCenter（复用桌面通知封装）· unit-wall.mjs
 * @降级策略  Notification 拒绝/不可用 → 静默记未读；SSE 断线 → 轮询回退
 * @后端切换  [BE] GET /api/notify/inbox（见 API_CONTRACT.pm）实现后，
 *            把 loadInbox 的 local 分支换成接口即可
 * ════════════════════════════════════════════════════════════════════
 */

export const NOTIFY_VERSION = '2.2.0'

import { eventsUrl } from './apiBase.js'

const LS_INBOX = 'wall_notify_inbox_v2'
const LS_NAME = 'qdu_wall_name'
const MAX_INBOX = 100

/* ──────────────────────── 1. @ 解析 ───────────────────────── */

/**
 * 解析 @提及（支持中文昵称 + 空格结尾 + 行尾）
 * 例：“@李四 明天拼车” → ["李四"]
 * @param {string} text
 * @returns {string[]}
 */
export function parseMentions(text) {
  const out = []
  if (!text) return out
  const re = /@([^\s@#]{1,16})(?=[\s.,，。!！?？:：;；#]|$)/g
  let m
  while ((m = re.exec(String(text)))) {
    const name = m[1].trim()
    if (name && !out.includes(name)) out.push(name)
    if (out.length >= 10) break
  }
  return out
}

/** 当前昵称（发帖人身份；未设置 → 空串，@自己不计未读） */
export function myName() {
  try { return localStorage.getItem(LS_NAME) || '' } catch { return '' }
}
export function setMyName(name) {
  try {
    if (name) localStorage.setItem(LS_NAME, String(name).slice(0, 24))
    else localStorage.removeItem(LS_NAME)
  } catch { /* noop */ }
}

/**
 * 从帖子/回复里抽取“与我相关”的事件（被回复/被@/被采纳/被点赞聚合）
 * @param {object[]} posts
 * @param {string} me 缺省取 myName()
 */
export function extractRelated(posts, me = myName()) {
  if (!me) return []
  const events = []
  for (const p of posts || []) {
    // 有人回了我的帖
    if (p.author === me && Array.isArray(p.replies)) {
      for (const r of p.replies) {
        if (r.author === me) continue
        events.push({
          kind: r.parent ? 'reply_of_reply' : 'reply_me',
          postId: p.id,
          postTitle: p.title || '(无标题)',
          from: r.author,
          text: (r.content || '').slice(0, 80),
          ts: r.ts || p.ts || Date.now(),
          key: 'r:' + (r.id || r.ts)
        })
      }
    }
    // 有人 @ 我（主楼 + 回复全文扫）
    const hay = (p.title || '') + '\n' + (p.content || '') + '\n' +
      (p.replies || []).map((r) => r.content || '').join('\n')
    if (parseMentions(hay).includes(me)) {
      events.push({
        kind: 'mention',
        postId: p.id,
        postTitle: p.title || '(无标题)',
        from: p.author,
        text: '有人在帖子里 @ 了你',
        ts: p.ts || Date.now(),
        key: 'm:' + p.id
      })
    }
    // 我的悬赏被回答 / 被采纳（本地采纳标记 best）
    if (p.author === me && p.bounty && p.bounty.adoptedId) {
      events.push({
        kind: 'adopted',
        postId: p.id,
        postTitle: p.title || '(无标题)',
        from: '系统',
        text: '你的悬赏已采纳最佳回答',
        ts: p.ts || Date.now(),
        key: 'a:' + p.id
      })
    }
  }
  // 去重 + 按时间倒序
  const seen = new Set()
  return events
    .filter((e) => (seen.has(e.key) ? false : (seen.add(e.key), true)))
    .sort((a, b) => b.ts - a.ts)
    .slice(0, 50)
}

// ──────────────────────── 2. 收件箱（本机） ─────────────────────────

function lsGet(k, fb) {
  try { return JSON.parse(localStorage.getItem(k) || 'null') ?? fb } catch { return fb }
}
function lsSet(k, v) {
  try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* noop */ }
}

/** 读取收件箱 */
export function loadInbox() {
  return lsGet(LS_INBOX, [])
}

/** 未读数 */
export function unreadCount() {
  return loadInbox().filter((n) => !n.read).length
}

/**
 * 合并新事件入收件箱（幂等：按 key 去重；超 100 条截断）
 * @param {object[]} events extractRelated 产物
 * @returns {{inbox, added}}
 */
export function mergeInbox(events) {
  const inbox = loadInbox()
  const keys = new Set(inbox.map((n) => n.key))
  let added = 0
  for (const e of events || []) {
    if (keys.has(e.key)) continue
    keys.add(e.key)
    inbox.unshift({ ...e, read: false, ts: e.ts || Date.now() })
    added++
  }
  const trimmed = inbox.slice(0, MAX_INBOX)
  lsSet(LS_INBOX, trimmed)
  return { inbox: trimmed, added }
}

/** 标已读（单个 / 全部） */
export function markRead(key) {
  const inbox = loadInbox()
  if (key === 'all') {
    for (const n of inbox) n.read = true
  } else {
    const it = inbox.find((n) => n.key === key)
    if (it) it.read = true
  }
  lsSet(LS_INBOX, inbox)
  return inbox
}

/** 清空（保留 7 天内的已读？不，本机版直接清，简单可解释） */
export function clearInbox() {
  lsSet(LS_INBOX, [])
  return []
}

/**
 * 轮询同步：拉取 posts → 抽取 related → 合并 → 可选桌面提醒
 * @param {Function} loadPostsFn 注入 () => Promise<posts>（CampusWall 传 loadPosts）
 * @param {object} opt {desktop:boolean}
 */
export async function syncNotifies(loadPostsFn, opt = {}) {
  try {
    const r = await loadPostsFn()
    const posts = Array.isArray(r) ? r : r.posts || []
    const events = extractRelated(posts)
    const { inbox, added } = mergeInbox(events)
    if (added > 0 && opt.desktop) {
      const latest = inbox.find((n) => !n.read)
      if (latest) notifyDesktop(formatNotify(latest).title, formatNotify(latest).body)
    }
    return { inbox, added }
  } catch {
    return { inbox: loadInbox(), added: 0 }
  }
}

// ──────────────────────── 3. 文案 ─────────────────────────

/** 通知文案（管理台/桌面通知/站内小红点共用） */
export function formatNotify(n) {
  const titleMap = {
    reply_me: '💬 有人回复了你的帖子',
    reply_of_reply: '↩️ 有人回复了你参与的讨论',
    mention: '📣 有人在帖子里 @ 了你',
    adopted: '🏆 悬赏有结果了'
  }
  return {
    title: titleMap[n.kind] || '🔔 新消息',
    body: `《${(n.postTitle || '').slice(0, 20)}》— ${n.from}：${(n.text || '').slice(0, 60)}`
  }
}

// ──────────────────────── 4. 桌面通知 ─────────────────────────

/** 是否支持桌面通知 */
export function canDesktop() {
  return typeof window !== 'undefined' && 'Notification' in window
}

/** 请求权限（用户手势中调用：签到/发帖成功后顺手问一次） */
export async function ensureDesktopPermission() {
  if (!canDesktop()) return 'unsupported'
  if (Notification.permission === 'granted') return 'granted'
  if (Notification.permission === 'denied') return 'denied'
  try {
    const r = await Notification.requestPermission()
    return r
  } catch { return 'default' }
}

/** 发一条桌面通知（失败静默） */
export function notifyDesktop(title, body) {
  try {
    if (!canDesktop()) return false
    if (Notification.permission !== 'granted') return false
    const n = new Notification(title, { body, tag: 'wall-' + Date.now() })
    setTimeout(() => { try { n.close() } catch { /* noop */ } }, 6000)
    return true
  } catch { return false }
}

// ──────────────────────── 5. SSE 联动 ─────────────────────────

let esRef = null
let esTimer = null
let esFails = 0
let esExplicitOff = false

/**
 * 绑定 SSE：收到 wall/comment 事件 → 自动 syncNotifies（防抖 3s）
 * 断线策略（指数退避 + 轮询兜底，保证手机弱网可用）：
 *   第 1~3 次断线 → 5s/15s/30s 后重建 EventSource；
 *   连续失败 ≥4 次 → 退化为 60s 轮询；网络恢复后下次 pull 成功即复位计数。
 * @param {Function} onUpdate 回调 (inbox)（CampusWall 刷新小红点用）
 * @param {Function} loadPostsFn 透传给 syncNotifies
 */
export function bindSSE(onUpdate, loadPostsFn) {
  unbindSSE()
  esExplicitOff = false
  if (typeof window === 'undefined' || typeof EventSource === 'undefined') return null
  let pending = false
  const pull = async () => {
    if (pending) return
    pending = true
    try {
      const { inbox } = await syncNotifies(loadPostsFn)
      esFails = 0 // 拉成功即复位（网络已恢复）
      if (typeof onUpdate === 'function') onUpdate(inbox)
    } finally {
      pending = false
    }
  }
  const backoff = () => Math.min(30000, 5000 * Math.pow(2, Math.min(2, esFails)))
  const armTimer = (ms) => {
    if (esTimer) clearInterval(esTimer)
    esTimer = setInterval(pull, ms)
  }
  const connect = () => {
    if (esExplicitOff) return
    try { if (esRef) esRef.close() } catch { /* noop */ }
    try {
      esRef = new EventSource(eventsUrl())
      let debounce = null
      esRef.onmessage = () => {
        esFails = 0
        clearTimeout(debounce)
        debounce = setTimeout(pull, 3000)
      }
      esRef.onerror = () => {
        esFails++
        try { if (esRef) esRef.close() } catch { /* noop */ }
        esRef = null
        if (esFails >= 4) {
          armTimer(60000) // 重度断线：60s 轮询保底
        } else {
          armTimer(30000)
          setTimeout(() => { if (!esExplicitOff && !esRef) connect() }, backoff())
        }
      }
    } catch {
      esFails++
      armTimer(30000)
    }
  }
  connect()
  armTimer(30000) // 并行保底轮询（与 CampusWall 20s 轮询错峰）
  return { pull, fails: () => esFails }
}

export function unbindSSE() {
  esExplicitOff = true
  try { if (esRef) esRef.close() } catch { /* noop */ }
  esRef = null
  if (esTimer) clearInterval(esTimer)
  esTimer = null
}
