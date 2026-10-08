/**
 * ════════════════════════════════════════════════════════════════════
 * @模块路径  src/wall/moderation.js
 * @职责      校园墙前端治理层：发帖/回复前预检 + 信任等级门禁 + 举报理由 +
 *            折叠展示规则 —— 服务端 400 兜底之前的“第一道软拦截”
 * @入口      precheck / canPublish / reportReasons / shouldFold /
 *            foldReason / levelGate / sanitizeInput
 * @依赖      ./config（LEVELS/levelOf/POINTS）· 可选服务端词库（管理台下发）
 * @被谁用    WallComposer / WallThread / CommentTree / CampusWall ·
 *            scripts/unit-wall.mjs
 * @降级策略  词库拉取失败 → 用内置 DEFAULT_PATTERNS；等级读取失败 → 按见习处理
 * @后端切换  服务端已做 400 拦截（community.mjs），本模块只做体验优化，
 *            后端加词无需改前端（管理台 /api/moderation/words 热更新）
 * ════════════════════════════════════════════════════════════════════
 */
import { LEVELS, levelOf } from './config.js'

export const MOD_VERSION = '2.1.0'

/* ──────────────────────── 1. 内置敏感模式（服务端词库的本地镜像） ── */

const DEFAULT_PATTERNS = [
  '加微信', '加vx', '加v', '微信号', '加qq', 'qq号', 'qq群', '群号',
  '代写', '代考', '包过', '刷单', '兼职刷', '日结', '一夜暴富',
  '援交', '裸聊', '赌博', '博彩', '六合彩', '网贷',
  '傻逼', '脑残', '去死', '滚蛋', '贱人', '智障'
]

let serverWords = []
let serverWordsTs = 0
const WORDS_TTL = 5 * 60 * 1000

/**
 * 拉取服务端词库（失败静默，复用缓存）
 * @returns {Promise<string[]>}
 */
export async function fetchServerWords() {
  const now = Date.now()
  if (now - serverWordsTs < WORDS_TTL && serverWords.length) return serverWords
  try {
    const r = await fetch('/api/moderation/words')
    const d = await r.json().catch(() => ({}))
    if (Array.isArray(d.words) && d.words.length) {
      serverWords = d.words.map(String)
      serverWordsTs = now
      return serverWords
    }
  } catch { /* 离线：用内置 */ }
  return serverWords.length ? serverWords : DEFAULT_PATTERNS
}

/** 同步设置词库（管理台页可注入，测试可 mock） */
export function setServerWords(words) {
  serverWords = (words || []).map(String)
  serverWordsTs = Date.now()
}

function activePatterns() {
  return serverWords.length ? serverWords : DEFAULT_PATTERNS
}

// ──────────────────────── 2. 输入清洗 ─────────────────────────

/** 长度截断（与服务端 MAX_LEN 对齐，前端先截防超长） */
export const LIMITS = {
  title: 60,
  content: 2000,
  reply: 1000,
  author: 24,
  reason: 200
}

/**
 * 通用清洗：去首尾空 / 压多空行 / 截断
 * @param {string} s
 * @param {number} max
 */
export function sanitizeInput(s, max = 1000) {
  let t = String(s ?? '').replace(/\r/g, '').trim()
  t = t.replace(/\n{4,}/g, '\n\n\n')
  t = t.replace(/[ \t]{4,}/g, '   ')
  if (t.length > max) t = t.slice(0, max)
  return t
}

/** 是否疑似灌水（同一内容高频发：调用方传最近 N 条时间戳） */
export function isFlooding(recentTs, windowMs = 60000, maxN = 3) {
  if (!Array.isArray(recentTs) || !recentTs.length) return false
  const now = Date.now()
  return recentTs.filter((t) => now - t < windowMs).length >= maxN
}

/** 是否全是 emoji / 符号的无效内容 */
export function isMeaningless(s) {
  const t = String(s || '').trim()
  if (t.length < 2) return true
  const stripped = t.replace(/[\p{Emoji}\p{P}\p{S}\s]/gu, '')
  return stripped.length === 0
}

// ──────────────────────── 3. 预检 ─────────────────────────

/**
 * 内容预检（发帖/回复/私信共用）
 * @param {string} text 标题+内容拼接后的待检文本
 * @param {object} opt {words: string[]} 可注入词库（测试用）
 * @returns {{ok:boolean, hits:string[]}}
 */
export function precheck(text, opt = {}) {
  const t = String(text || '').toLowerCase()
  if (!t.trim()) return { ok: false, hits: ['内容为空'] }
  const words = opt.words || activePatterns()
  const hits = []
  for (const w of words) {
    if (!w) continue
    if (t.includes(String(w).toLowerCase())) {
      hits.push(w)
      if (hits.length >= 5) break
    }
  }
  return { ok: hits.length === 0, hits }
}

/**
 * 发帖门禁：长度 + 预检 + 等级 + 冷却，一次返回所有问题（表单一次性展示）
 * @param {object} payload {title,content,tag,type}
 * @param {object} ctx {points, recentTs}
 */
export function canPublish(payload, ctx = {}) {
  const issues = []
  const title = sanitizeInput(payload.title || '', LIMITS.title)
  const content = sanitizeInput(payload.content || '', LIMITS.content)
  if (!title && !content) issues.push('标题和内容不能都空')
  if (content && content.length < 2) issues.push('内容太短，再写两句吧')
  if (isMeaningless(content) && !title) issues.push('内容疑似无效字符')
  const { ok, hits } = precheck(title + ' ' + content)
  if (!ok) issues.push('命中敏感词：' + hits.slice(0, 3).join('、') + '（请修改后重发）')
  // 等级门禁（与 config.LEVELS 对齐：投票/悬赏需要成员及以上）
  const lv = levelOf(ctx.points || 0)
  const lvIdx = LEVELS.indexOf(lv)
  if ((payload.type === 'vote' || payload.type === 'resource') && lvIdx < 1) {
    issues.push('发起投票/资源需要「成员」等级（20 积分），先签到互动升级吧')
  }
  if (payload.type === 'bounty' && lvIdx < 2) {
    issues.push('发起悬赏需要「活跃」等级（60 积分）')
  }
  if (isFlooding(ctx.recentTs || [])) issues.push('发得太快了，休息 1 分钟再发')
  return { ok: issues.length === 0, issues, clean: { title, content } }
}

/** 回复门禁（比发帖宽松：不卡等级，只卡敏感词与长度） */
export function canReply(content, ctx = {}) {
  const clean = sanitizeInput(content, LIMITS.reply)
  if (clean.length < 1) return { ok: false, issues: ['回复不能为空'], clean }
  const { ok, hits } = precheck(clean)
  if (!ok) return { ok: false, issues: ['命中敏感词：' + hits.slice(0, 3).join('、')], clean }
  if (isFlooding(ctx.recentTs || [], 30000, 5)) return { ok: false, issues: ['回复太频繁，稍后再试'], clean }
  return { ok: true, issues: [], clean }
}

// ──────────────────────── 4. 举报 ─────────────────────────

/** 举报理由（管理台举报队列分组依据，前后端共识） */
export const REPORT_REASONS = [
  { id: 'spam', name: '广告/引流', icon: '📢', desc: '微信/QQ/刷单/代写等' },
  { id: 'abuse', name: '人身攻击', icon: '🤬', desc: '辱骂/诅咒/歧视' },
  { id: 'porn', name: '色情低俗', icon: '🔞', desc: '擦边/约炮/裸聊' },
  { id: 'fraud', name: '诈骗嫌疑', icon: '🎣', desc: '网贷/博彩/假冒' },
  { id: 'privacy', name: '泄露隐私', icon: '🪪', desc: '人肉/电话/宿舍号' },
  { id: 'other', name: '其他', icon: '📝', desc: '请补充说明' }
]

export function reasonOf(id) {
  return REPORT_REASONS.find((r) => r.id === id) || REPORT_REASONS[REPORT_REASONS.length - 1]
}

/** 举报 payload 校验（前端先验，服务端再验） */
export function buildReport(id, reasonId, detail = '') {
  const reason = reasonOf(reasonId)
  const clean = sanitizeInput(detail, LIMITS.reason)
  if (!id) return { ok: false, error: '缺少目标 id' }
  return { ok: true, payload: { id, reason: reason.id, reasonName: reason.name, detail: clean, ts: Date.now() } }
}

// ──────────────────────── 5. 折叠规则 ─────────────────────────

/**
 * 是否折叠（被举报多 / 被踩多 / 敏感命中待审，默认折叠保体验）
 * @param {object} item {reports, likes, dislikes?, status}
 */
export function shouldFold(item) {
  if (!item) return false
  if (item.status === 'hide' || item.status === 'pending') return true
  if ((item.reports || 0) >= 3) return true
  const dis = item.dislikes || item.dislike || 0
  const like = item.likes || 0
  if (dis >= 5 && dis > like * 2) return true
  return false
}

export function foldReason(item) {
  if (!item) return ''
  if (item.status === 'hide') return '已被管理员隐藏'
  if (item.status === 'pending') return '待审核，暂折叠'
  if ((item.reports || 0) >= 3) return '被多人举报，暂折叠待审'
  return '互动反馈不佳，已折叠'
}

// ──────────────────────── 6. 等级门禁文案 ─────────────────────────

/**
 * 等级能力说明（关于页/个人卡/Composer 提示共用）
 * @param {number} points
 */
export function levelGate(points) {
  const lv = levelOf(points || 0)
  const idx = LEVELS.indexOf(lv)
  const next = LEVELS[idx + 1] || null
  return {
    level: lv,
    index: idx,
    next,
    canVote: idx >= 1,
    canBounty: idx >= 2,
    canNotice: idx >= 3,
    progress: next ? Math.min(100, Math.round(((points || 0) / next.min) * 100)) : 100,
    hint: next ? `再得 ${next.min - (points || 0)} 分升级「${next.name}」` : '已满级 👑'
  }
}

/** 发帖按钮是否置灰 + 原因（Composer 直接用） */
export function publishGate(type, points) {
  const g = levelGate(points)
  if ((type === 'vote' || type === 'resource') && !g.canVote) {
    return { disabled: true, reason: '投票/资源帖需「成员」等级，先去签到互动吧' }
  }
  if (type === 'bounty' && !g.canBounty) {
    return { disabled: true, reason: '悬赏帖需「活跃」等级' }
  }
  return { disabled: false, reason: '' }
}
