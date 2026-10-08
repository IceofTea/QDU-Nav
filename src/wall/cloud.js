/**
 * ════════════════════════════════════════════════════════════════════
 * @模块路径  src/wall/cloud.js
 * @职责      公有云共享层（Supabase PostgREST）：配好即全员共享帖子/回复/
 *            点赞 —— Pages 纯静态站的“公共笔记本”，免自建服务器
 * @入口      cloudEnabled / getCloud / setCloud / probeCloud /
 *            cloudList / cloudCreate / cloudReply / cloudLike
 * @配置优先级 localStorage('qdu_supabase') > <meta> > ''（未配=关闭，零影响）
 * @依赖      无（原生 fetch 调 PostgREST；表结构见 supabase/schema.sql）
 * @被谁用    wall/api.js（cloud 优先 → 网关 → 本机三级）·
 *            views/DataManager.vue（填 key 入口）· scripts/unit-im.mjs
 * @降级策略  未配置/请求失败一律抛错由调用方接住走下一级，绝不白屏
 * @安全说明  用 anon key + RLS 开放读写（演示级；key 轮换方便；防刷靠
 *            网关 400 敏感词 + 发帖冷却；高并发场景再上服务端鉴权）
 * ════════════════════════════════════════════════════════════════════
 */

export const CLOUD_VERSION = '1.0.0'

const LS_KEY = 'qdu_supabase' // {url, key}

/** 读配置（缺任一项即视为关闭） */
export function getCloud() {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) {
      const c = JSON.parse(raw)
      if (c && c.url && c.key) return { url: String(c.url).replace(/\/+$/, ''), key: String(c.key) }
    }
  } catch { /* noop */ }
  try {
    const mu = document.querySelector('meta[name="supabase-url"]')
    const mk = document.querySelector('meta[name="supabase-key"]')
    if (mu && mu.content && mk && mk.content) {
      return { url: mu.content.replace(/\/+$/, ''), key: mk.content }
    }
  } catch { /* noop */ }
  return null
}
/** 是否启用（调用方热路径只调它，localStorage 同步读无开销问题） */
export function cloudEnabled() {
  return !!getCloud()
}
/** 保存/清除（数据管家页调用） */
export function setCloud(url, key) {
  const u = String(url || '').trim().replace(/\/+$/, '')
  const k = String(key || '').trim()
  try {
    if (u && k) localStorage.setItem(LS_KEY, JSON.stringify({ url: u, key: k }))
    else localStorage.removeItem(LS_KEY)
  } catch { /* noop */ }
  return !!(u && k)
}

async function rest(table, query, opts = {}) {
  const c = getCloud()
  if (!c) throw new Error('cloud 未配置')
  const r = await fetch(c.url + '/rest/v1/' + table + (query || ''), {
    method: opts.method || 'GET',
    headers: {
      apikey: c.key,
      Authorization: 'Bearer ' + c.key,
      'Content-Type': 'application/json',
      Prefer: opts.prefer || 'return=representation'
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined
  })
  if (!r.ok) {
    const err = new Error('cloud HTTP ' + r.status)
    err.status = r.status
    throw err
  }
  if (r.status === 204) return null
  return r.json().catch(() => null)
}

/** 行 → 帖子（与 wall/api.createPost 本地结构同构，组件零改动） */
function rowToPost(row, replies) {
  return {
    id: 'C' + row.id,
    cloudId: row.id,
    title: row.title || '',
    content: row.content || '',
    tag: row.tag || 'chat',
    type: row.ptype || 'normal',
    author: row.author || '匿名同学',
    anonymous: !!row.anonymous,
    vote: row.vote || null,
    bounty: row.bounty || null,
    resource: row.resource || null,
    likes: row.likes || 0,
    views: row.views || 0,
    reactions: row.reactions || {},
    replies: (replies || []).map((x) => ({
      id: 'C' + x.id, cloudId: x.id, author: x.author, content: x.content,
      ts: new Date(x.created_at).getTime(), likes: x.likes || 0,
      parent: x.parent_cloud ? 'C' + x.parent_cloud : null, replyTo: x.reply_to || ''
    })),
    ts: new Date(row.created_at).getTime(),
    cloud: true
  }
}

/**
 * 拉帖子（最新 100；tag 服务端过滤；热排序本地算，复用 hotScore 思想）
 * @param {object} opt {tag, limit}
 */
export async function cloudList(opt = {}) {
  const tag = opt.tag && opt.tag !== 'all' ? opt.tag : ''
  const limit = opt.limit || 100
  let q = '?select=*&order=created_at.desc&limit=' + limit
  if (tag) q += '&tag=eq.' + encodeURIComponent(tag)
  const rows = await rest('wall_posts', q)
  const ids = (rows || []).map((r) => r.id)
  let replyMap = {}
  if (ids.length) {
    const rr = await rest('wall_replies', '?select=*&post_id=in.(' + ids.join(',') + ')&order=created_at.asc&limit=1000')
    replyMap = {}
    for (const x of rr || []) (replyMap[x.post_id] = replyMap[x.post_id] || []).push(x)
  }
  return (rows || []).map((r) => rowToPost(r, replyMap[r.id] || []))
}

/** 发帖（返回 rowToPost 单帖；vote/bounty/resource 以 JSONB 存） */
export async function cloudCreate(payload) {
  const body = {
    title: String(payload.title || '').slice(0, 60),
    content: String(payload.content || '').slice(0, 2000),
    tag: payload.tag || 'chat',
    ptype: payload.type || 'normal',
    author: payload.anonymous ? '匿名同学' : String(payload.author || '匿名同学').slice(0, 24),
    anonymous: !!payload.anonymous,
    vote: payload.vote || null,
    bounty: payload.bounty || null,
    resource: payload.resource || null
  }
  const rows = await rest('wall_posts', '', { method: 'POST', body })
  const row = Array.isArray(rows) ? rows[0] : rows
  if (!row || !row.id) throw new Error('cloud 发帖无返回')
  return rowToPost(row, [])
}

/** 回复（parent_cloud 传云端数字 id；replyTo 透传昵称） */
export async function cloudReply(cloudPostId, content, author, parentCloudId = null, replyTo = '') {
  const rows = await rest('wall_replies', '', {
    method: 'POST',
    body: {
      post_id: cloudPostId,
      author: String(author || '匿名同学').slice(0, 24),
      content: String(content || '').slice(0, 1000),
      parent_cloud: parentCloudId,
      reply_to: String(replyTo || '').slice(0, 24)
    }
  })
  return Array.isArray(rows) ? rows[0] : rows
}

/** 点赞（读后 +1 写回；演示量级够用，高并发再换 RPC 原子加） */
export async function cloudLike(cloudPostId) {
  const rows = await rest('wall_posts', '?id=eq.' + cloudPostId + '&select=id,likes')
  const cur = (Array.isArray(rows) ? rows[0] : rows) || { likes: 0 }
  const upd = await rest('wall_posts', '?id=eq.' + cloudPostId, {
    method: 'PATCH', body: { likes: (cur.likes || 0) + 1 }
  })
  const row = Array.isArray(upd) ? upd[0] : upd
  return (row && row.likes) || (cur.likes || 0) + 1
}

/** 浏览 +1（静默，失败不抛） */
export async function cloudView(cloudPostId) {
  try {
    const rows = await rest('wall_posts', '?id=eq.' + cloudPostId + '&select=id,views')
    const cur = (Array.isArray(rows) ? rows[0] : rows) || { views: 0 }
    await rest('wall_posts', '?id=eq.' + cloudPostId, { method: 'PATCH', body: { views: (cur.views || 0) + 1 } })
  } catch { /* noop */ }
}

/**
 * 连通探测（数据管家“测试”按钮用；8s 超时；顺带校验表存在）
 * @param {object} cfg 缺省用当前配置 {url, key}
 */
export async function probeCloud(cfg) {
  const c = cfg || getCloud()
  if (!c) return { ok: false, ms: 0, error: '未配置 Supabase 地址/key' }
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 8000)
  const t0 = Date.now()
  try {
    const r = await fetch(c.url + '/rest/v1/wall_posts?select=id&limit=1', {
      signal: ctrl.signal,
      headers: { apikey: c.key, Authorization: 'Bearer ' + c.key }
    })
    if (!r.ok) throw new Error(r.status === 404 ? '表不存在（先跑 supabase/schema.sql）' : 'HTTP ' + r.status)
    return { ok: true, ms: Date.now() - t0 }
  } catch (e) {
    return { ok: false, ms: Date.now() - t0, error: e.name === 'AbortError' ? '连接超时（8s）' : (e.message || '连接失败') }
  } finally {
    clearTimeout(timer)
  }
}
