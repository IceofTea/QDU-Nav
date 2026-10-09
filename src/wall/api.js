/**
 * ════════════════════════════════════════════════════════════════════
 * @模块路径  src/wall/api.js
 * @职责      校园墙数据访问层（唯一发请求的地方）—— 网关优先 · localStorage
 *            兜底 · 后端契约预留；组件不得直接 fetch，一律经此模块
 * @入口      loadPosts / createPost / likePost / replyPost / reportPost /
 *            castVote / reactPost / viewPost / searchPosts / getWallet /
 *            addPoints / signIn / toggleFav / isFav / setAdopted
 * @依赖      ./config（PARTS/POINTS/WALLET_KEY/SIGN_KEY/FAV_KEY/hotScore）
 * @被谁用    store.js · CampusWall.vue · Agent workflows（wallPost/lostFound/bounty…）
 * @降级策略  网关可达 → REST /api/wall*；不可达 → local* 系列读写 localStorage，
 *            并在返回值标记 {offline:true} 供 UI 显示"本机模式"
 * @后端切换  实现 config.API_CONTRACT 中 [BE] 接口后，把对应 local* 分支
 *            改为调用真实接口即可（函数签名保持不变，组件零改动）
 * ════════════════════════════════════════════════════════════════════
 */
import {
  WALLET_KEY, SIGN_KEY, FAV_KEY, POINTS, hotScore
} from './config.js'
import { apiUrl } from './apiBase.js'
import { cloudEnabled, cloudList, cloudCreate, cloudReply, cloudLike, cloudView } from './cloud.js'

const LS_POSTS = 'wall_posts_v1'
const LS_VOTED = 'wall_voted_v1'

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
  return 'L' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}
function now() { return Date.now() }

/* ──────────────────────── 帖子读写 ──────────────────────── */

/**
 * 统一展示排序（top 只过滤不过排，保持各轨原有顺序语义；
 * hot 按热度，new/默认按时间倒序；调用方三处原来各写一遍，现收敛）
 */
export function applySort(posts, sort) {
  const list = posts || []
  if (sort === 'top') return list.filter((p) => p.status === 'top' || p.best)
  if (sort === 'hot') return list.slice().sort((a, b) => hotScore(b) - hotScore(a))
  return list.slice().sort((a, b) => b.ts - a.ts)
}

/**
 * 拉取帖子列表（tag 过滤 + 排序 hot|new|top）
 * 三轨并集：公有云（全员共享）+ 网关/本机（历史存量），id 天然不重复
 * （云帖 C 前缀），展示排序统一走现有逻辑；云失败自动只走存量轨
 */
export async function loadPosts({ tag = 'all', sort = 'hot' } = {}) {
  if (cloudEnabled()) {
    try {
      const [cloudPosts, base] = await Promise.all([
        cloudList({ tag, limit: 100 }),
        loadBase({ tag, sort: 'new' })
      ])
      const seen = new Set()
      const merged = []
      for (const p of [...cloudPosts, ...base.posts]) {
        if (!p || seen.has(p.id)) continue
        seen.add(p.id)
        merged.push(p)
      }
      return { posts: applySort(merged, sort), offline: base.offline, cloud: true }
    } catch { /* 掉到存量轨 */ }
  }
  return loadBase({ tag, sort })
}

/** 存量轨：网关优先 → 本机兜底（原 loadPosts 本体下沉） */
async function loadBase({ tag = 'all', sort = 'hot' } = {}) {
  try {
    const q = new URLSearchParams()
    if (tag && tag !== 'all') q.set('tag', tag)
    q.set('sort', sort === 'top' ? 'new' : sort)
    const d = await http('/api/wall?' + q.toString())
    return { posts: applySort(d.posts || [], sort), offline: false }
  } catch (e) {
    // 网关不可达 → 本机帖子 + 网关缓存并集
    let posts = lsGet(LS_POSTS, [])
    if (tag && tag !== 'all') posts = posts.filter((p) => p.tag === tag)
    return { posts: applySort(posts, sort), offline: true }
  }
}

/** 发帖（type: normal|vote|bounty|resource|notice；离线入本机草稿） */
export async function createPost(payload) {
  if (cloudEnabled()) {
    try {
      const post = await cloudCreate(payload)
      addPoints(POINTS.post)
      return { post, offline: false, cloud: true }
    } catch { /* 掉到网关轨 */ }
  }
  const local = {
    id: genId(),
    title: payload.title || '',
    content: payload.content || '',
    tag: payload.tag || 'chat',
    type: payload.type || 'normal',
    author: payload.anonymous ? '匿名同学' : (payload.author || '匿名同学'),
    anonymous: !!payload.anonymous,
    vote: payload.vote || null,
    bounty: payload.bounty || null,     // {points, adoptedId}
    resource: payload.resource || null, // {url, code, downloads}
    views: 1,
    status: 'ok',
    ts: now(),
    likes: 0,
    reactions: {},
    replies: []
  }
  try {
    const d = await http('/api/wall', { method: 'POST', body: { ...payload, type: local.type } })
    return { post: d.post, offline: false }
  } catch (e) {
    if (e.status === 400) throw e // 敏感词等业务拒绝必须上抛
    const posts = lsGet(LS_POSTS, [])
    posts.unshift(local)
    lsSet(LS_POSTS, posts.slice(0, 300))
    addPoints(POINTS.post)
    return { post: local, offline: true }
  }
}

export async function likePost(id) {
  // 云帖（id 以 C 开头）：走公有云计数
  if (cloudEnabled() && String(id || '').startsWith('C')) {
    try {
      const likes = await cloudLike(Number(String(id).slice(1)))
      return { likes, offline: false, cloud: true }
    } catch { return { likes: 0, offline: true, cloud: true } }
  }
  try {
    const d = await http('/api/wall/like', { method: 'POST', body: { id } })
    return { likes: d.likes, offline: false }
  } catch {
    const posts = lsGet(LS_POSTS, [])
    const p = posts.find((x) => x.id === id)
    if (p) { p.likes = (p.likes || 0) + 1; lsSet(LS_POSTS, posts) }
    return { likes: p ? p.likes : 0, offline: true }
  }
}

export async function replyPost(id, content, author, parent = null) {
  if (cloudEnabled() && String(id || '').startsWith('C')) {
    try {
      const reply = await cloudReply(Number(String(id).slice(1)), content, author)
      addPoints(POINTS.reply)
      return { reply: { id: 'C' + reply.id, author: reply.author, content: reply.content, ts: Date.now(), likes: 0 }, offline: false, cloud: true }
    } catch (e) {
      throw new Error('云回复失败，请稍后重试')
    }
  }
  try {
    const d = await http('/api/wall/reply', { method: 'POST', body: { id, content, author, parent: parent || undefined } })
    addPoints(POINTS.reply)
    return { reply: d.reply, offline: false }
  } catch (e) {
    if (e.status === 400 || e.status === 429) throw e
    const posts = lsGet(LS_POSTS, [])
    const p = posts.find((x) => x.id === id)
    if (!p) throw new Error('帖子不存在（本机模式仅保存你自己的帖）')
    const reply = { id: genId(), author: author || '匿名同学', content, ts: now(), likes: 0, floor: (p.replies.length + 1), parent: parent || null }
    p.replies.push(reply)
    lsSet(LS_POSTS, posts)
    addPoints(POINTS.reply)
    return { reply, offline: true }
  }
}

export async function reportPost(id, reason) {
  try {
    await http('/api/wall/report', { method: 'POST', body: { id, reason } })
    return true
  } catch {
    return false
  }
}

/** 浏览计数（后端期换 POST /api/wall/:id/view 去重） */
export async function viewPost(id) {
  if (cloudEnabled() && String(id || '').startsWith('C')) { cloudView(Number(String(id).slice(1))); return }
  try { await http('/api/wall/view', { method: 'POST', body: { id } }) } catch { /* noop */ }
}

/* ──────────────────────── 投票 ──────────────────────── */

export async function castVote(id, index) {
  try {
    const d = await http('/api/wall/vote', { method: 'POST', body: { id, index } })
    return { tallies: d.tallies, offline: false }
  } catch (e) {
    if (e.status === 409) throw e
    const voted = lsGet(LS_VOTED, {})
    if (voted[id]) { const err = new Error('已投票'); err.status = 409; throw err }
    voted[id] = true
    lsSet(LS_VOTED, voted)
    const posts = lsGet(LS_POSTS, [])
    const p = posts.find((x) => x.id === id)
    if (p && p.vote) {
      p.vote.tallies[index] = (p.vote.tallies[index] || 0) + 1
      lsSet(LS_POSTS, posts)
      return { tallies: p.vote.tallies, offline: true }
    }
    throw new Error('投票帖不存在')
  }
}

export function hasVotedLocal(id) {
  return !!lsGet(LS_VOTED, {})[id]
}

/* ──────────────────────── 表情 ──────────────────────── */

export async function reactPost(id, emoji) {
  try {
    const d = await http('/api/react', { method: 'POST', body: { type: 'posts', id, emoji } })
    return d.reactions
  } catch (e) {
    if (e.status === 400) throw e
    const posts = lsGet(LS_POSTS, [])
    const p = posts.find((x) => x.id === id)
    if (p) {
      if (!p.reactions) p.reactions = {}
      p.reactions[emoji] = (p.reactions[emoji] || 0) + 1
      lsSet(LS_POSTS, posts)
      return p.reactions
    }
    return {}
  }
}

/* ──────────────────────── 悬赏采纳（后端期见 API_CONTRACT.adopt） ── */

export async function setAdopted(postId, replyId) {
  const posts = lsGet(LS_POSTS, [])
  const p = posts.find((x) => x.id === postId)
  if (p && p.bounty) {
    p.bounty.adoptedId = replyId
    p.best = true
    lsSet(LS_POSTS, posts)
    addPoints((p.bounty.points || 0) > 0 ? 0 : 0) // 赏金由楼主体外扣除，答题方 +POINTS.adopted
    addPoints(POINTS.adopted)
    return true
  }
  // 网关帖：预留后端接口（当前网关暂不存采纳，提示走管理台）
  return false
}

/* ──────────────────────── 收藏 / 搜索 ──────────────────────── */

export function toggleFav(id) {
  const favs = lsGet(FAV_KEY, [])
  const i = favs.indexOf(id)
  if (i >= 0) favs.splice(i, 1)
  else favs.push(id)
  lsSet(FAV_KEY, favs)
  return i < 0
}
export function isFav(id) {
  return lsGet(FAV_KEY, []).includes(id)
}
export function favCount() {
  return lsGet(FAV_KEY, []).length
}

/** 墙内搜索（本地过滤；后端期换 GET /api/wall/search?q= 全文检索） */
export function searchPosts(posts, q) {
  const kw = (q || '').trim().toLowerCase()
  if (!kw) return posts
  return posts.filter((p) =>
    (p.title || '').toLowerCase().includes(kw) ||
    (p.content || '').toLowerCase().includes(kw) ||
    (p.tag || '').includes(kw)
  )
}

/* ──────────────────────── 积分钱包 / 签到 ──────────────────────── */

export function getWallet() {
  return lsGet(WALLET_KEY, { points: 0, history: [] })
}
export function addPoints(delta, reason = '') {
  const w = getWallet()
  w.points = Math.max(0, (w.points || 0) + delta)
  w.history = w.history || []
  w.history.unshift({ d: delta, reason, ts: now() })
  if (w.history.length > 100) w.history.length = 100
  lsSet(WALLET_KEY, w)
  return w
}

/** 每日签到（幂等：同日重复返回 already） */
export function signInToday() {
  const today = new Date().toDateString()
  const last = lsGet(SIGN_KEY, '')
  if (last === today) return { already: true, points: getWallet().points }
  lsSet(SIGN_KEY, today)
  const w = addPoints(POINTS.signIn, '每日签到')
  return { already: false, points: w.points, gained: POINTS.signIn }
}
export function signedToday() {
  return lsGet(SIGN_KEY, '') === new Date().toDateString()
}

/** 连续签到（提升粘性的轻量玩法） */
export function streakDays() {
  const w = getWallet()
  const signs = (w.history || []).filter((h) => h.reason === '每日签到')
  if (!signs.length) return 0
  let streak = 0
  const day = new Date()
  for (let i = 0; i < 365; i++) {
    const ds = new Date(day.getTime() - i * 86400000).toDateString()
    if (signs.some((s) => new Date(s.ts).toDateString() === ds)) streak++
    else if (i > 0) break
  }
  return streak
}

/* ──────────────────────── 话题热词（Agent hotTopics 数据源） ── */

export function hotTopics(posts, topN = 6) {
  const freq = {}
  const STOP = new Set(['的', '了', '是', '在', '我', '有', '和', '就', '不', '人', '都', '一', '一个', '上', '也', '很', '到', '说', '要', '去', '你', '这', '吗', '什么', '怎么', '可以', '我们', '自己', '这个', '那个', '一下', '一下', '如何', '有没有'])
  for (const p of posts) {
    const text = (p.title + ' ' + p.content).replace(/[^\u4e00-\u9fa5A-Za-z0-9]/g, ' ')
    const words = text.split(/\s+/).filter((w) => w.length >= 2 && !STOP.has(w))
    const seen = new Set()
    for (const w of words) {
      if (seen.has(w)) continue
      seen.add(w)
      freq[w] = (freq[w] || 0) + 1
    }
  }
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([word, n]) => ({ word, n }))
}
