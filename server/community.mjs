/**
 * ════════════════════════════════════════════════════════════════════
 * @模块路径  server/community.mjs
 * @职责      社区中台：评论 / 校园墙（含投票·表情） / 反馈 / 敏感词 / 云脑代理 / 管理端 API
 * @挂载点    server/index.mjs → 匹配 /api/{comments,wall,moderation,admin,feedback,chat,react,vote}
 * @数据文件  server/data/community.json（原子写；旧 comments.json 自动迁移）
 * @鉴权      公开接口无鉴权（IP 限流）；/api/admin/* 需 x-admin-token 头（口令见 ADMIN_TOKEN）
 * @被谁用    前端 comments.js / CampusWall.vue / AgentChat.vue；管理台 admin.html；Wiki 静态站跨域
 * @改动指南  加接口 → 对应 handle* 函数加分支；改词库 → 无需改码（管理台可增删）
 * @关联文档  挑战杯报告 §6（互动）· §14（落地记录）
 * ════════════════════════════════════════════════════════════════════
 *
 * ── 公开接口速查（新人/新 Agent 看这里即可对接，无需通读源码）──────────
 *   GET  /api/comments?path=<页路径>       → {comments:[…], latestTs}   仅 status=ok
 *   GET  /api/comments?stats=1             → 全站计数
 *   GET  /api/comments/queue?since=<ts>    → 增量拉取（轮询）
 *   POST /api/comments                     → 发表 {path,title,author,content,type?,paraIndex?,quote?}
 *                                            敏感词命中 → 400 {error,hits}
 *   POST /api/comments/like                → {id} → {likes}
 *   POST /api/comments/report              → {id,reason}
 *   POST /api/react                        → 表情表态 {type:comments|posts, id, emoji} → {reactions}
 *   GET  /api/wall?tag=&sort=new|hot       → 校园墙列表（含 vote 帖）
 *   POST /api/wall                         → 发帖 {title,content,tag,author,anonymous,vote?}
 *                                            vote = {question, options:[…]} 即投票帖
 *   POST /api/wall/like | /reply | /report → 与评论同构
 *   POST /api/wall/vote                    → {id, index} 投票（每人每帖一次，IP 记录）
 *   POST /api/feedback                     → 智能体反馈 {text, kind, verdict}（👎/报错）
 *   GET  /api/moderation/words             → 敏感词库（前端预检缓存用）
 *   POST /api/chat                         → 云脑代理 {messages:[…]} （未配置 → 501）
 *
 * ── 管理端接口（x-admin-token 头）──────────────────────────────────
 *   POST /api/admin/login {token}          → 口令校验（5 次/分失败锁定）
 *   GET  /api/admin/overview               → 概览 + 举报队列 + 反馈计数
 *   GET  /api/admin/items?type=comments|posts|feedback&status=
 *   POST /api/admin/moderate {type,id,action: approve|hide|delete}
 *   GET/POST /api/admin/words {action:add|remove, word}
 *   GET  /api/admin/llm                    → 云脑配置（apiKey 脱敏）
 *   POST /api/admin/llm {baseUrl,apiKey,model,action:test|save|clear}
 *   GET  /api/admin/audit                  → 管理操作审计日志（最近 200 条）
 *   GET  /api/admin/agent-introspect       → 意图表+知识库只读内省（管理台测试台数据源）
 *   POST /api/admin/announce {title,content} → 发布站内公告（写 announcements.json 热更新）
 *   GET  /api/admin/backup                → 下载 community.json 全量备份
 *
 * ── 暗门（隐秘入口，普通用户不可见）────────────────────────────────
 *   GET /admin · /console · /.g/9f3a       → 管理台页面（admin.html）
 *   站内入口：导航站首页连点 Logo 3 次 / Wiki 连点评论标题 5 次 → 弹口令
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.join(__dirname, 'data')
const FILE = path.join(DATA_DIR, 'community.json')
const LEGACY_FILE = path.join(DATA_DIR, 'comments.json')

const MAX_LEN = 1000
const MAX_AUTHOR = 24
const MAX_TITLE = 60
const RATE_WINDOW = 60 * 1000
const RATE_MAX = 12
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'qdu-agent-2026'
const LOGIN_MAX_FAIL = 5
const LOGIN_WINDOW = 60 * 1000
const EMOJIS = ['👍', '😂', '🤔', '❤️', '🎉']

let db = null
const rateMap = new Map()
const loginFails = new Map() // ip -> {t, n}

/* ──────────────────────── 存储层 ──────────────────────── */

function load() {
  if (db) return db
  try {
    db = JSON.parse(fs.readFileSync(FILE, 'utf8'))
  } catch {
    db = null
  }
  if (!db || typeof db !== 'object') db = {}
  // 从旧 comments.json 一次性迁移
  if (!Array.isArray(db.comments)) {
    db.comments = []
    try {
      const old = JSON.parse(fs.readFileSync(LEGACY_FILE, 'utf8'))
      if (old && Array.isArray(old.comments)) db.comments = old.comments
    } catch { /* noop */ }
  }
  if (!Array.isArray(db.posts)) db.posts = []
  if (!Array.isArray(db.feedback)) db.feedback = []
  if (!Array.isArray(db.audit)) db.audit = []
  if (!Array.isArray(db.words) || !db.words.length) db.words = [...DEFAULT_WORDS]
  if (!db.llm) db.llm = { baseUrl: '', apiKey: '', model: 'deepseek-chat' }
  if (!db.voted) db.voted = {} // ip|postId -> true（每帖一票）
  for (const c of db.comments) { if (!c.status) c.status = 'ok'; if (!c.reactions) c.reactions = {} }
  for (const p of db.posts) {
    if (!p.status) p.status = 'ok'
    if (!Array.isArray(p.replies)) p.replies = []
    if (!p.reactions) p.reactions = {}
    if (p.vote && !Array.isArray(p.vote.tallies)) p.vote.tallies = (p.vote.options || []).map(() => 0)
  }
  return db
}

function persist() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
    const tmp = FILE + '.tmp'
    fs.writeFileSync(tmp, JSON.stringify(db, null, 2), 'utf8')
    fs.renameSync(tmp, FILE)
  } catch (e) {
    console.error('[community] 落盘失败:', e.message)
  }
}

/** 管理操作审计（谁在何时做了什么，供管理台追溯） */
function audit(action, detail) {
  load().audit.unshift({ ts: Date.now(), action, detail: String(detail || '').slice(0, 200) })
  if (db.audit.length > 200) db.audit.length = 200
  persist()
}

/* ──────────────────────── 安全层 ──────────────────────── */

const DEFAULT_WORDS = [
  '加微信', '加vx', '加v信', '微信号是', '加qq', 'qq号', 'QQ群', '群号是',
  '代写', '代考', '包过', '刷单', '兼职刷', '日结工资', '一夜暴富',
  '色情', '援交', '裸聊', '赌博', '博彩', '六合彩', '网贷口子',
  '傻逼', '脑残', '去死', '滚蛋', '贱人', '狗东西', '智障玩意'
]

function rateOk(ip) {
  const now = Date.now()
  const rec = rateMap.get(ip)
  if (!rec || now - rec.t > RATE_WINDOW) { rateMap.set(ip, { t: now, n: 1 }); return true }
  if (rec.n >= RATE_MAX) return false
  rec.n++
  return true
}

/** 登录防爆破：窗口内失败 LOGIN_MAX_FAIL 次即锁 */
function loginAllowed(ip) {
  const rec = loginFails.get(ip)
  if (!rec) return true
  if (Date.now() - rec.t > LOGIN_WINDOW) { loginFails.delete(ip); return true }
  return rec.n < LOGIN_MAX_FAIL
}
function loginFail(ip) {
  const rec = loginFails.get(ip) || { t: Date.now(), n: 0 }
  rec.n++
  loginFails.set(ip, rec)
}

function readBody(req, limit = 64 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks = []
    req.on('data', (c) => {
      size += c.length
      if (size > limit) { reject(new Error('body too large')); req.destroy(); return }
      chunks.push(c)
    })
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

function sanitize(s, max) {
  return Array.from(String(s || ''))
    .filter((ch) => ch.charCodeAt(0) >= 32)
    .join('')
    .trim()
    .slice(0, max)
}

function hitWords(text) {
  const t = String(text || '').toLowerCase()
  const hits = []
  for (const w of load().words) {
    if (w && t.includes(String(w).toLowerCase())) hits.push(w)
  }
  return hits
}

function adminOk(req) {
  return req.headers['x-admin-token'] === ADMIN_TOKEN
}

function rateFromReq(req, ip) {
  return ip || req.socket.remoteAddress || 'local'
}

/* ──────────────────────── 评论 ──────────────────────── */

async function handleComments(req, urlPath, searchParams, ip) {
  const data = load()
  const action = urlPath.replace('/api/comments', '').replace(/^\//, '')

  if (action === 'like') {
    if (req.method !== 'POST') return { status: 405, body: { ok: false } }
    let body = {}
    try { body = JSON.parse((await readBody(req)) || '{}') } catch { return { status: 400, body: { ok: false, error: 'bad json' } } }
    const c = data.comments.find((x) => x.id === body.id)
    if (!c) return { status: 404, body: { ok: false, error: 'not found' } }
    c.likes = (c.likes || 0) + 1
    persist()
    return { status: 200, body: { ok: true, likes: c.likes } }
  }

  if (action === 'report') {
    if (req.method !== 'POST') return { status: 405, body: { ok: false } }
    let body = {}
    try { body = JSON.parse((await readBody(req)) || '{}') } catch { return { status: 400, body: { ok: false, error: 'bad json' } } }
    const c = data.comments.find((x) => x.id === body.id)
    if (!c) return { status: 404, body: { ok: false, error: 'not found' } }
    if (c.status !== 'reported') {
      c.status = 'reported'
      c.reportReason = sanitize(body.reason, 100) || '违规内容'
      c.reportedAt = Date.now()
      persist()
    }
    return { status: 200, body: { ok: true, msg: '已收到举报，管理员将尽快处理' } }
  }

  if (action === 'queue') {
    const since = Number(searchParams.get('since') || 0)
    const all = data.comments.filter((c) => c.status === 'ok').sort((a, b) => b.ts - a.ts)
    const fresh = since ? all.filter((c) => c.ts > since) : []
    return { status: 200, body: { ok: true, latestTs: all[0] ? all[0].ts : 0, fresh, count: all.length } }
  }

  if (req.method === 'GET') {
    if (searchParams.get('stats') === '1') {
      const pages = new Set(data.comments.map((c) => c.path))
      const users = new Set(data.comments.map((c) => c.author))
      return {
        status: 200,
        body: {
          ok: true,
          total: data.comments.length,
          pages: pages.size,
          users: users.size,
          reported: data.comments.filter((c) => c.status === 'reported').length,
          hidden: data.comments.filter((c) => c.status === 'hidden').length,
          posts: data.posts.length,
          feedback: data.feedback.length
        }
      }
    }
    const p = sanitize(searchParams.get('path') || '', 300)
    const list = data.comments
      .filter((c) => c.status === 'ok' && (p ? c.path === p : true))
      .sort((a, b) => b.ts - a.ts)
      .slice(0, 300)
    return { status: 200, body: { ok: true, comments: list, latestTs: list[0] ? list[0].ts : 0 } }
  }

  if (req.method === 'POST') {
    if (!rateOk(rateFromReq(req, ip))) return { status: 429, body: { ok: false, error: '发言过于频繁，请稍后再试' } }
    let body = {}
    try { body = JSON.parse((await readBody(req)) || '{}') } catch { return { status: 400, body: { ok: false, error: 'bad json' } } }
    const content = sanitize(body.content, MAX_LEN)
    if (content.length < 2) return { status: 400, body: { ok: false, error: '内容太短' } }
    const hits = hitWords(content)
    if (hits.length) return { status: 400, body: { ok: false, error: '内容包含违规词语，已被拦截', hits: hits.slice(0, 3) } }
    const parent = body.parent ? sanitize(String(body.parent), 40) : null
    if (parent && !data.comments.some((c) => c.id === parent)) {
      return { status: 400, body: { ok: false, error: '回复的评论不存在（可能已被删除）' } }
    }
    const c = {
      id: genId(),
      path: sanitize(body.path, 300) || '/',
      title: sanitize(body.title, 120),
      author: sanitize(body.author, MAX_AUTHOR) || '匿名同学',
      content,
      type: sanitize(body.type, 20) || 'page',
      paraIndex: Number.isInteger(body.paraIndex) ? body.paraIndex : null,
      quote: sanitize(body.quote, 300),
      parent, // 楼中楼：非空即为某条评论的回复
      replyTo: body.replyTo ? sanitize(String(body.replyTo), MAX_AUTHOR) : '',
      status: 'ok',
      ts: Date.now(),
      likes: 0,
      reactions: {}
    }
    data.comments.push(c)
    if (data.comments.length > 8000) data.comments = data.comments.slice(-8000)
    persist()
    return { status: 200, body: { ok: true, comment: c } }
  }

  return { status: 405, body: { ok: false, error: 'Method Not Allowed' } }
}

/* ──────────────────────── 表情表态（评论/帖子通用） ──────────────────────── */

async function handleReact(req, urlPath, searchParams, ip) {
  if (req.method !== 'POST') return { status: 405, body: { ok: false } }
  if (!rateOk(rateFromReq(req, ip))) return { status: 429, body: { ok: false, error: '操作过于频繁' } }
  let body = {}
  try { body = JSON.parse((await readBody(req)) || '{}') } catch { return { status: 400, body: { ok: false, error: 'bad json' } } }
  const emoji = String(body.emoji || '')
  if (!EMOJIS.includes(emoji)) return { status: 400, body: { ok: false, error: '不支持的表情' } }
  const data = load()
  const arr = body.type === 'posts' ? data.posts : data.comments
  const item = arr.find((x) => x.id === body.id)
  if (!item) return { status: 404, body: { ok: false, error: 'not found' } }
  if (!item.reactions) item.reactions = {}
  item.reactions[emoji] = (item.reactions[emoji] || 0) + 1
  persist()
  return { status: 200, body: { ok: true, reactions: item.reactions } }
}

/* ──────────────────────── 校园墙（含投票） ──────────────────────── */

async function handleWall(req, urlPath, searchParams, ip) {
  const data = load()
  const action = urlPath.replace('/api/wall', '').replace(/^\//, '')

  if (req.method === 'GET') {
    const tag = sanitize(searchParams.get('tag') || '', 20)
    const sort = searchParams.get('sort') === 'hot' ? 'hot' : 'new'
    let list = data.posts.filter((p) => p.status === 'ok')
    if (tag && tag !== '投票') list = list.filter((p) => p.tag === tag)
    if (tag === '投票') list = list.filter((p) => !!p.vote)
    list = list.sort((a, b) => (sort === 'hot' ? (b.likes + b.replies.length * 2) - (a.likes + a.replies.length * 2) : b.ts - a.ts))
    // 投票帖附带"我是否已投"（按 IP 记录）
    const withVoted = list.map((p) => {
      const key = (ip || 'local') + '|' + p.id
      return { ...p, myVoted: !!data.voted[key] }
    })
    return { status: 200, body: { ok: true, posts: withVoted.slice(0, 100), total: list.length } }
  }

  if (action === 'like') {
    if (req.method !== 'POST') return { status: 405, body: { ok: false } }
    let body = {}
    try { body = JSON.parse((await readBody(req)) || '{}') } catch { return { status: 400, body: { ok: false } } }
    const p = data.posts.find((x) => x.id === body.id)
    if (!p) return { status: 404, body: { ok: false, error: 'not found' } }
    p.likes = (p.likes || 0) + 1
    persist()
    return { status: 200, body: { ok: true, likes: p.likes } }
  }

  if (action === 'view') {
    if (req.method !== 'POST') return { status: 405, body: { ok: false } }
    let body = {}
    try { body = JSON.parse((await readBody(req)) || '{}') } catch { return { status: 400, body: { ok: false } } }
    const p = data.posts.find((x) => x.id === body.id)
    if (p) { p.views = (p.views || 0) + 1; persist() }
    // 简易去重进阶版（IP+帖 每天 1 次）留待后端期：见 config.API_CONTRACT.view
    return { status: 200, body: { ok: true, views: p ? p.views : 0 } }
  }

  if (action === 'vote') {
    if (req.method !== 'POST') return { status: 405, body: { ok: false } }
    let body = {}
    try { body = JSON.parse((await readBody(req)) || '{}') } catch { return { status: 400, body: { ok: false } } }
    const p = data.posts.find((x) => x.id === body.id)
    if (!p || !p.vote) return { status: 404, body: { ok: false, error: '投票帖不存在' } }
    const idx = Number(body.index)
    if (!Number.isInteger(idx) || idx < 0 || idx >= (p.vote.options || []).length) {
      return { status: 400, body: { ok: false, error: '选项不合法' } }
    }
    const key = (ip || 'local') + '|' + p.id
    if (data.voted[key]) return { status: 409, body: { ok: false, error: '你已经投过票了（每帖一票）' } }
    data.voted[key] = true
    p.vote.tallies[idx] = (p.vote.tallies[idx] || 0) + 1
    persist()
    return { status: 200, body: { ok: true, tallies: p.vote.tallies, total: p.vote.tallies.reduce((a, b) => a + b, 0) } }
  }

  if (action === 'reply') {
    if (req.method !== 'POST') return { status: 405, body: { ok: false } }
    if (!rateOk(rateFromReq(req, ip))) return { status: 429, body: { ok: false, error: '发言过于频繁' } }
    let body = {}
    try { body = JSON.parse((await readBody(req)) || '{}') } catch { return { status: 400, body: { ok: false, error: 'bad json' } } }
    const p = data.posts.find((x) => x.id === body.id)
    if (!p) return { status: 404, body: { ok: false, error: 'not found' } }
    const content = sanitize(body.content, 500)
    if (content.length < 2) return { status: 400, body: { ok: false, error: '内容太短' } }
    const hits = hitWords(content)
    if (hits.length) return { status: 400, body: { ok: false, error: '内容包含违规词语，已被拦截', hits: hits.slice(0, 3) } }
    const reply = { id: genId(), author: sanitize(body.author, MAX_AUTHOR) || '匿名同学', content, ts: Date.now(), likes: 0 }
    p.replies.push(reply)
    persist()
    return { status: 200, body: { ok: true, reply } }
  }

  if (action === 'report') {
    if (req.method !== 'POST') return { status: 405, body: { ok: false } }
    let body = {}
    try { body = JSON.parse((await readBody(req)) || '{}') } catch { return { status: 400, body: { ok: false } } }
    const p = data.posts.find((x) => x.id === body.id)
    if (!p) return { status: 404, body: { ok: false, error: 'not found' } }
    if (p.status !== 'reported') {
      p.status = 'reported'
      p.reportReason = sanitize(body.reason, 100) || '违规内容'
      p.reportedAt = Date.now()
      persist()
    }
    return { status: 200, body: { ok: true, msg: '已收到举报' } }
  }

  if (req.method === 'POST') {
    if (!rateOk(rateFromReq(req, ip))) return { status: 429, body: { ok: false, error: '发帖过于频繁，请稍后再试' } }
    let body = {}
    try { body = JSON.parse((await readBody(req)) || '{}') } catch { return { status: 400, body: { ok: false, error: 'bad json' } } }
    const content = sanitize(body.content, MAX_LEN)
    const title = sanitize(body.title, MAX_TITLE)
    if (content.length < 2) return { status: 400, body: { ok: false, error: '内容太短' } }
    // 投票帖：校验选项
    let vote = null
    if (body.vote && Array.isArray(body.vote.options)) {
      const question = sanitize(body.vote.question, 100)
      const options = body.vote.options.map((o) => sanitize(o, 40)).filter(Boolean)
      if (!question || options.length < 2 || options.length > 6) {
        return { status: 400, body: { ok: false, error: '投票需要 1 个问题与 2~6 个选项' } }
      }
      vote = { question, options, tallies: options.map(() => 0) }
    }
    const hits = hitWords(title + ' ' + content + ' ' + (vote ? vote.question + vote.options.join('') : ''))
    if (hits.length) return { status: 400, body: { ok: false, error: '内容包含违规词语，已被拦截', hits: hits.slice(0, 3) } }
    const p = {
      id: genId(),
      title: title || (vote ? vote.question : content.slice(0, 20)),
      content,
      tag: sanitize(body.tag, 20) || (vote ? '投票' : '闲聊'),
      author: body.anonymous ? '匿名同学' : (sanitize(body.author, MAX_AUTHOR) || '匿名同学'),
      anonymous: !!body.anonymous,
      vote,
      status: 'ok',
      ts: Date.now(),
      likes: 0,
      reactions: {},
      replies: []
    }
    data.posts.push(p)
    if (data.posts.length > 3000) data.posts = data.posts.slice(-3000)
    persist()
    return { status: 200, body: { ok: true, post: p } }
  }

  return { status: 405, body: { ok: false, error: 'Method Not Allowed' } }
}

/* ──────────────────────── 智能体反馈（👎/报错回流） ──────────────────────── */

async function handleFeedback(req, urlPath, searchParams, ip) {
  const data = load()
  if (req.method === 'GET') {
    // 公开只读计数（管理台另走 admin 接口）
    return { status: 200, body: { ok: true, count: data.feedback.length } }
  }
  if (req.method === 'POST') {
    if (!rateOk(rateFromReq(req, ip))) return { status: 429, body: { ok: false, error: '反馈过于频繁' } }
    let body = {}
    try { body = JSON.parse((await readBody(req)) || '{}') } catch { return { status: 400, body: { ok: false, error: 'bad json' } } }
    const text = sanitize(body.text, 300)
    if (!text) return { status: 400, body: { ok: false, error: '内容为空' } }
    const item = {
      id: genId(),
      text,
      kind: sanitize(body.kind, 40) || 'dislike',
      detail: sanitize(body.detail, 300),
      path: sanitize(body.path, 200),
      status: 'new', // new | handled
      ts: Date.now()
    }
    data.feedback.unshift(item)
    if (data.feedback.length > 1000) data.feedback.length = 1000
    persist()
    return { status: 200, body: { ok: true, id: item.id } }
  }
  return { status: 405, body: { ok: false } }
}

/* ──────────────────────── 云脑代理（服务端持 key，前端零暴露） ──────────────────────── */

async function handleChat(req) {
  if (req.method !== 'POST') return { status: 405, body: { ok: false, error: 'POST only' } }
  const cfg = load().llm
  if (!cfg || !cfg.baseUrl || !cfg.apiKey) {
    return { status: 501, body: { ok: false, error: '云脑未配置：请在管理台「云脑配置」中填写接口地址与密钥' } }
  }
  let body = {}
  try { body = JSON.parse((await readBody(req)) || '{}') } catch { return { status: 400, body: { ok: false, error: 'bad json' } } }
  const messages = Array.isArray(body.messages) ? body.messages.slice(-8) : []
  if (!messages.length) return { status: 400, body: { ok: false, error: 'messages 为空' } }
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 15000)
    const res = await fetch(cfg.baseUrl, {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + cfg.apiKey },
      body: JSON.stringify({ model: cfg.model || 'deepseek-chat', messages, max_tokens: 500, temperature: 0.6 })
    })
    clearTimeout(timer)
    if (!res.ok) {
      const t = await res.text().catch(() => '')
      return { status: 502, body: { ok: false, error: `上游返回 ${res.status}: ${t.slice(0, 160)}` } }
    }
    const d = await res.json()
    const content = d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content
    if (!content) return { status: 502, body: { ok: false, error: '上游响应格式异常' } }
    return { status: 200, body: { ok: true, content, model: cfg.model, remote: true } }
  } catch (e) {
    return { status: 502, body: { ok: false, error: '云脑调用失败：' + (e.name === 'AbortError' ? '超时 15s' : e.message) } }
  }
}

/* ──────────────────────── 敏感词（公开只读） ──────────────────────── */

async function handleModeration(req, urlPath) {
  if (urlPath === '/api/moderation/words' && req.method === 'GET') {
    return { status: 200, body: { ok: true, words: load().words, emojis: EMOJIS } }
  }
  return { status: 404, body: { ok: false, error: 'not found' } }
}

/* ──────────────────────── 管理端 ──────────────────────── */

async function handleAdmin(req, urlPath, searchParams, ip) {
  const data = load()
  const action = urlPath.replace('/api/admin', '').replace(/^\//, '')

  // 登录（防爆破）
  if (action === 'login') {
    if (req.method !== 'POST') return { status: 405, body: { ok: false } }
    if (!loginAllowed(ip)) {
      return { status: 429, body: { ok: false, error: '失败次数过多，请 1 分钟后再试' } }
    }
    let body = {}
    try { body = JSON.parse((await readBody(req)) || '{}') } catch { return { status: 400, body: { ok: false } } }
    if (body.token === ADMIN_TOKEN) {
      loginFails.delete(ip)
      audit('login', '管理台登录成功')
      return { status: 200, body: { ok: true, token: ADMIN_TOKEN } }
    }
    loginFail(ip)
    return { status: 401, body: { ok: false, error: '口令错误' } }
  }

  if (!adminOk(req)) return { status: 401, body: { ok: false, error: '未授权：需要管理员口令' } }

  if (action === 'overview' && req.method === 'GET') {
    const cs = data.comments
    const ps = data.posts
    return {
      status: 200,
      body: {
        ok: true,
        comments: { total: cs.length, ok: cs.filter((c) => c.status === 'ok').length, reported: cs.filter((c) => c.status === 'reported').length, hidden: cs.filter((c) => c.status === 'hidden').length },
        posts: { total: ps.length, ok: ps.filter((p) => p.status === 'ok').length, reported: ps.filter((p) => p.status === 'reported').length, votes: ps.filter((p) => p.vote).length },
        feedback: { total: data.feedback.length, new: data.feedback.filter((f) => f.status === 'new').length },
        words: data.words.length,
        llm: { configured: !!(data.llm.baseUrl && data.llm.apiKey), model: data.llm.model },
        reports: [
          ...cs.filter((c) => c.status === 'reported').map((c) => ({ type: 'comment', id: c.id, text: c.content.slice(0, 60), reason: c.reportReason, ts: c.reportedAt || c.ts })),
          ...ps.filter((p) => p.status === 'reported').map((p) => ({ type: 'post', id: p.id, text: (p.title + ' / ' + p.content).slice(0, 60), reason: p.reportReason, ts: p.reportedAt || p.ts }))
        ].sort((a, b) => b.ts - a.ts)
      }
    }
  }

  if (action === 'items' && req.method === 'GET') {
    const type = searchParams.get('type') || 'comments'
    if (type === 'feedback') {
      const st = searchParams.get('status')
      const list = data.feedback.filter((x) => !st || st === 'all' || x.status === st).slice(0, 200)
      return { status: 200, body: { ok: true, type, items: list } }
    }
    const arr = type === 'posts' ? data.posts : data.comments
    const st = searchParams.get('status')
    const list = arr.filter((x) => !st || st === 'all' || x.status === st).sort((a, b) => b.ts - a.ts).slice(0, 200)
    return { status: 200, body: { ok: true, type, items: list } }
  }

  if (action === 'moderate' && req.method === 'POST') {
    let body = {}
    try { body = JSON.parse((await readBody(req)) || '{}') } catch { return { status: 400, body: { ok: false, error: 'bad json' } } }
    if (body.type === 'feedback') {
      const f = data.feedback.find((x) => x.id === body.id)
      if (!f) return { status: 404, body: { ok: false, error: 'not found' } }
      if (body.action === 'delete') data.feedback = data.feedback.filter((x) => x.id !== body.id)
      else if (body.action === 'approve') f.status = 'handled'
      else return { status: 400, body: { ok: false, error: 'unknown action' } }
      audit('feedback:' + body.action, f.text.slice(0, 60))
      persist()
      return { status: 200, body: { ok: true, action: body.action } }
    }
    const type = body.type === 'posts' ? 'posts' : 'comments'
    const arr = type === 'posts' ? data.posts : data.comments
    const item = arr.find((x) => x.id === body.id)
    if (!item) return { status: 404, body: { ok: false, error: 'not found' } }
    if (body.action === 'delete') {
      const i = arr.indexOf(item)
      arr.splice(i, 1)
      // 级联：删除评论时其楼中楼一并删除
      if (type === 'comments') data.comments = data.comments.filter((c) => c.parent !== item.id)
    } else if (body.action === 'approve') {
      item.status = 'ok'
      delete item.reportReason
    } else if (body.action === 'hide') {
      item.status = 'hidden'
    } else {
      return { status: 400, body: { ok: false, error: 'unknown action' } }
    }
    audit(`${type}:${body.action}`, (item.content || item.title || '').slice(0, 60))
    persist()
    return { status: 200, body: { ok: true, action: body.action, id: item.id } }
  }

  if (action === 'words') {
    if (req.method === 'GET') return { status: 200, body: { ok: true, words: data.words } }
    if (req.method === 'POST') {
      let body = {}
      try { body = JSON.parse((await readBody(req)) || '{}') } catch { return { status: 400, body: { ok: false } } }
      const w = sanitize(body.word, 40)
      if (!w) return { status: 400, body: { ok: false, error: '词不能为空' } }
      if (body.action === 'remove') {
        data.words = data.words.filter((x) => x !== w)
        audit('word:remove', w)
      } else {
        if (!data.words.includes(w)) data.words.push(w)
        audit('word:add', w)
      }
      persist()
      return { status: 200, body: { ok: true, words: data.words } }
    }
  }

  // 云脑配置（apiKey 脱敏返回；action=test 走一次真实上游调用）
  if (action === 'llm') {
    if (req.method === 'GET') {
      return { status: 200, body: { ok: true, baseUrl: data.llm.baseUrl, model: data.llm.model, hasKey: !!data.llm.apiKey } }
    }
    if (req.method === 'POST') {
      let body = {}
      try { body = JSON.parse((await readBody(req)) || '{}') } catch { return { status: 400, body: { ok: false } } }
      if (body.action === 'clear') {
        data.llm = { baseUrl: '', apiKey: '', model: 'deepseek-chat' }
        audit('llm:clear', '')
        persist()
        return { status: 200, body: { ok: true, configured: false } }
      }
      // 先保存再测试（保证测试用的是新配置）；测试直接构造最小消息，不复用已消费的请求体
      if (typeof body.baseUrl === 'string') data.llm.baseUrl = body.baseUrl.trim()
      if (typeof body.apiKey === 'string' && body.apiKey.trim()) data.llm.apiKey = body.apiKey.trim()
      if (typeof body.model === 'string' && body.model.trim()) data.llm.model = body.model.trim()
      persist()
      if (body.action === 'test') {
        const cfg = data.llm
        if (!cfg.baseUrl || !cfg.apiKey) return { status: 501, body: { ok: false, error: '请先填写接口地址与密钥' } }
        try {
          const ctrl = new AbortController()
          const timer = setTimeout(() => ctrl.abort(), 15000)
          const res = await fetch(cfg.baseUrl, {
            method: 'POST', signal: ctrl.signal,
            headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + cfg.apiKey },
            body: JSON.stringify({ model: cfg.model, messages: [{ role: 'user', content: '回复"连接成功"四个字' }], max_tokens: 20 })
          })
          clearTimeout(timer)
          const okJson = await res.json().catch(() => null)
          if (!res.ok) {
            audit('llm:test-fail', 'HTTP ' + res.status)
            return { status: 502, body: { ok: false, error: `上游返回 ${res.status}` } }
          }
          const content = okJson && okJson.choices && okJson.choices[0] && okJson.choices[0].message && okJson.choices[0].message.content
          audit('llm:test-ok', String(content || '').slice(0, 40))
          return { status: 200, body: { ok: true, msg: '云脑连接成功', content } }
        } catch (e) {
          audit('llm:test-fail', e.message)
          return { status: 502, body: { ok: false, error: '调用失败：' + (e.name === 'AbortError' ? '超时' : e.message) } }
        }
      }
      audit('llm:save', data.llm.baseUrl + ' / ' + data.llm.model)
      return { status: 200, body: { ok: true, configured: true, baseUrl: data.llm.baseUrl, model: data.llm.model, hasKey: !!data.llm.apiKey } }
    }
  }

  // 意图/知识库内省（只读；打分逻辑在管理台前端，保持网关无状态）
  if (action === 'agent-introspect' && req.method === 'GET') {
    const root = path.join(__dirname, '..')
    let intentsText = ''
    let kbDocs = []
    let faqN = 0
    try {
      intentsText = fs.readFileSync(path.join(root, 'src', 'agent', 'intents.js'), 'utf8')
    } catch { /* noop */ }
    try {
      const kb = JSON.parse(fs.readFileSync(path.join(root, 'src', 'agent', 'kb-nav.json'), 'utf8'))
      kbDocs = (kb.docs || []).map((d) => ({ t: d.t, s: (d.s || '').slice(0, 80), src: d.src, kind: d.kind }))
    } catch { /* noop */ }
    try {
      const faq = fs.readFileSync(path.join(root, 'src', 'agent', 'faq.js'), 'utf8')
      faqN = (faq.match(/\bid:\s*'/g) || []).length
    } catch { /* noop */ }
    const ids = [...intentsText.matchAll(/id:\s*'([^']+)',\s*kind:\s*'([^']+)'(?:,\s*(?:wf|app):\s*'([^']+)')?/g)]
      .map((m) => ({ id: m[1], kind: m[2], target: m[3] || '-' }))
    const pats = [...intentsText.matchAll(/patterns:\s*\[([^\]]+)\]/g)]
      .map((m) => [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]))
    const merged = ids.map((it, i) => Object.assign({}, it, { patterns: pats[i] || [] }))
    return { status: 200, body: { ok: true, intents: merged, kb: kbDocs, faqCount: faqN } }
  }

  // 发布站内公告（写 public/data/announcements.json，站点公告弹窗下次拉取即见）
  if (action === 'announce' && req.method === 'POST') {
    let body = {}
    try { body = JSON.parse((await readBody(req)) || '{}') } catch { return { status: 400, body: { ok: false, error: 'bad json' } } }
    const title = sanitize(body.title, 80)
    const content = sanitize(body.content, 2000)
    if (!title || !content) return { status: 400, body: { ok: false, error: '标题与内容必填' } }
    const hits = hitWords(title + content)
    if (hits.length) return { status: 400, body: { ok: false, error: '公告包含违规词', hits } }
    const ap = path.join(__dirname, '..', 'public', 'data', 'announcements.json')
    try {
      const raw = JSON.parse(fs.readFileSync(ap, 'utf8'))
      const key = Array.isArray(raw.list) ? 'list' : 'notices'
      if (!Array.isArray(raw[key])) raw[key] = []
      raw[key].unshift({ id: Date.now(), title, date: new Date().toISOString().slice(0, 10), content })
      fs.writeFileSync(ap, JSON.stringify(raw, null, 2), 'utf8')
      audit('announce', title)
      return { status: 200, body: { ok: true, count: raw[key].length } }
    } catch (e) {
      return { status: 500, body: { ok: false, error: '公告文件写入失败: ' + e.message } }
    }
  }

  // 全量备份下载
  if (action === 'backup' && req.method === 'GET') {
    persist()
    return { status: 200, body: { ok: true, file: 'community.json', data: data, exportedAt: new Date().toISOString() } }
  }

  if (action === 'audit' && req.method === 'GET') {
    return { status: 200, body: { ok: true, audit: data.audit.slice(0, 100) } }
  }

  return { status: 404, body: { ok: false, error: 'not found' } }
}

/* ──────────────────────── 总入口 ──────────────────────── */

export async function handleCommunity(req, urlPath, searchParams, ip = 'local') {
  try {
    if (urlPath.startsWith('/api/admin')) return await handleAdmin(req, urlPath, searchParams, ip)
    if (urlPath.startsWith('/api/moderation')) return await handleModeration(req, urlPath, searchParams)
    if (urlPath.startsWith('/api/feedback')) return await handleFeedback(req, urlPath, searchParams, ip)
    if (urlPath === '/api/chat') return await handleChat(req)
    if (urlPath.startsWith('/api/react')) return await handleReact(req, urlPath, searchParams, ip)
    if (urlPath.startsWith('/api/wall')) return await handleWall(req, urlPath, searchParams, ip)
    if (urlPath.startsWith('/api/comments')) return await handleComments(req, urlPath, searchParams, ip)
    return { status: 404, body: { ok: false, error: 'not found' } }
  } catch (e) {
    console.error('[community] 错误:', e.message)
    return { status: 500, body: { ok: false, error: e.message } }
  }
}

export function communityCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-token')
}
