/**
 * ════════════════════════════════════════════════════════════════════
 * @模块路径  src/wall/stats.js
 * @职责      校园墙数据洞察聚合层：分区分布 / 活跃时段 / 热词趋势 /
 *            作者榜 / 互动漏斗 —— CommunityInsights.vue 唯一数据源
 *            —— 红线：只做真实聚合，绝不编数；无数据即空态
 * @入口      partDist / hourHeat / authorBoard / funnel / voteStats /
 *            trendByDay / summarize
 * @依赖      无（纯函数；帖子由调用方透传，避免依赖 wall/api）
 * @被谁用    views/CommunityInsights.vue · Agent workflows（看板口播）·
 *            skills（数据看板技能）· scripts/unit-im.mjs
 * @设计思想  全部按“可解释计数”实现：每个数字都能在管理台/墙列表中
 *            找到对应帖子；百分比保留 1 位小数
 * ════════════════════════════════════════════════════════════════════
 */

export const STATS_VERSION = '1.0.0'

/** 分区中文名（与 wall/config.PARTS 对齐的精简映射，避免循环依赖） */
const PART_NAMES = {
  help: '求助', bounty: '悬赏', lost: '失物', food: '美食', study: '学业',
  resource: '资源', notice: '公示', trade: '二手', ride: '拼车',
  rant: '吐槽', chat: '闲聊', all: '全部'
}
export function partName(id) {
  return PART_NAMES[id] || id || '闲聊'
}

/* ──────────────────────── 1. 分区分布 ───────────────────────── */

/**
 * 分区发帖分布（帖数 + 占比 + 互动均值）
 * @param {object[]} posts
 */
export function partDist(posts) {
  const list = Array.isArray(posts) ? posts : []
  const total = list.length
  const m = new Map()
  for (const p of list) {
    const tag = p.tag || 'chat'
    if (!m.has(tag)) m.set(tag, { tag, name: partName(tag), posts: 0, likes: 0, replies: 0 })
    const r = m.get(tag)
    r.posts++
    r.likes += p.likes || 0
    r.replies += (p.replies || []).length
  }
  return [...m.values()]
    .map((r) => ({
      ...r,
      pct: total ? Math.round((r.posts / total) * 1000) / 10 : 0,
      avgLikes: r.posts ? Math.round((r.likes / r.posts) * 10) / 10 : 0,
      avgReplies: r.posts ? Math.round((r.replies / r.posts) * 10) / 10 : 0
    }))
    .sort((a, b) => b.posts - a.posts)
}

// ──────────────────────── 2. 活跃时段 ─────────────────────────

/**
 * 24 小时发帖热力（0-23 格，值=帖数； façade 给 SVG 图直接渲染）
 * @param {object[]} posts
 */
export function hourHeat(posts) {
  const hours = new Array(24).fill(0)
  for (const p of posts || []) {
    if (!p.ts) continue
    hours[new Date(p.ts).getHours()]++
  }
  const max = Math.max(1, ...hours)
  return hours.map((n, h) => ({ h, n, lv: n === 0 ? 0 : n / max <= 0.33 ? 1 : n / max <= 0.66 ? 2 : 3 }))
}

/** 一周分布（周一=1 … 周日=7；getDay 周日=0 需换算） */
export function weekDist(posts) {
  const days = new Array(7).fill(0)
  const names = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
  for (const p of posts || []) {
    if (!p.ts) continue
    const d = new Date(p.ts).getDay() // 0=周日
    days[(d + 6) % 7]++
  }
  const total = days.reduce((a, b) => a + b, 0)
  return days.map((n, i) => ({ day: i + 1, name: names[i], n, pct: total ? Math.round((n / total) * 1000) / 10 : 0 }))
}

// ──────────────────────── 3. 作者榜 ─────────────────────────

/**
 * 贡献榜（发帖 3 分 + 回复 1 分 + 获赞 0.5 分；匿名合并为“匿名同学”1 项）
 * @param {object[]} posts
 * @param {number} topN
 */
export function authorBoard(posts, topN = 10) {
  const m = new Map()
  const add = (author, score, kind) => {
    const name = author || '匿名同学'
    if (!m.has(name)) m.set(name, { author: name, posts: 0, replies: 0, likes: 0, score: 0 })
    const r = m.get(name)
    if (kind === 'post') r.posts++
    if (kind === 'reply') r.replies++
    r.likes += 0 // 获赞归因在帖维度累加（见下）
    r.score += score
  }
  for (const p of posts || []) {
    add(p.author, 3, 'post')
    const rec = m.get(p.author || '匿名同学')
    if (rec) { rec.likes += p.likes || 0; rec.score += (p.likes || 0) * 0.5 }
    for (const r of p.replies || []) add(r.author, 1, 'reply')
  }
  return [...m.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, topN)
    .map((r, i) => ({ ...r, rank: i + 1, score: Math.round(r.score * 10) / 10 }))
}

// ──────────────────────── 4. 互动漏斗 ─────────────────────────

/**
 * 互动漏斗：总帖 → 有回复 → 有点赞 → 精华（likes>=10 或 replies>=10）
 * 每层给出转化率，评审问“留存/互动”时直接可用
 */
export function funnel(posts) {
  const list = Array.isArray(posts) ? posts : []
  const total = list.length
  const replied = list.filter((p) => (p.replies || []).length > 0).length
  const liked = list.filter((p) => (p.likes || 0) > 0).length
  const best = list.filter((p) => (p.likes || 0) >= 10 || (p.replies || []).length >= 10 || p.best).length
  const pct = (n) => (total ? Math.round((n / total) * 1000) / 10 : 0)
  return [
    { stage: '发帖', n: total, pct: 100 },
    { stage: '有人回复', n: replied, pct: pct(replied) },
    { stage: '有人点赞', n: liked, pct: pct(liked) },
    { stage: '精华帖', n: best, pct: pct(best) }
  ]
}

// ──────────────────────── 5. 投票帖统计 ─────────────────────────

/** 投票帖参与度（总票数 + 最高选项 + 参与帖占比） */
export function voteStats(posts) {
  const votes = (posts || []).filter((p) => p.type === 'vote' && p.vote)
  let totalVotes = 0
  let topOption = null
  for (const p of votes) {
    const tallies = p.vote.tallies || []
    const sum = tallies.reduce((a, b) => a + (b || 0), 0)
    totalVotes += sum
    tallies.forEach((n, i) => {
      if (!topOption || n > topOption.votes) {
        topOption = { post: p.title || '(投票)', option: (p.vote.options || [])[i] || ('选项' + (i + 1)), votes: n }
      }
    })
  }
  return {
    votePosts: votes.length,
    totalVotes,
    topOption,
    pct: (posts || []).length ? Math.round((votes.length / posts.length) * 1000) / 10 : 0
  }
}

// ──────────────────────── 6. 每日趋势 ─────────────────────────

/**
 * 近 N 天发帖/回复趋势（折线图数据源；按本地日期归桶）
 * @param {object[]} posts
 * @param {number} days
 */
export function trendByDay(posts, days = 14) {
  const out = []
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000)
    const label = (d.getMonth() + 1) + '/' + d.getDate()
    out.push({ label, ts: d.getTime(), posts: 0, replies: 0 })
  }
  const idx = (ts) => {
    const dd = new Date(ts)
    dd.setHours(0, 0, 0, 0)
    return Math.floor((dd.getTime() - out[0].ts) / 86400000)
  }
  for (const p of posts || []) {
    if (!p.ts) continue
    const k = idx(p.ts)
    if (k >= 0 && k < out.length) {
      out[k].posts++
      out[k].replies += (p.replies || []).length
    }
  }
  return out
}

// ──────────────────────── 7. 一句话总结 ─────────────────────────

/**
 * 看板一句话总结（Agent 口播 / 关于页数字共用；无数据返回空态文案）
 * @param {object[]} posts
 */
export function summarize(posts) {
  const list = Array.isArray(posts) ? posts : []
  if (!list.length) return '社区还没有帖子，来发第一帖吧 🌱'
  const dist = partDist(list)
  const top = dist[0]
  const totalReplies = list.reduce((a, p) => a + (p.replies || []).length, 0)
  const heat = hourHeat(list)
  const peak = heat.reduce((a, b) => (b.n > a.n ? b : a), heat[0])
  return `社区共 ${list.length} 帖、${totalReplies} 条回复；` +
    `最热分区是「${top.name}」（${top.posts} 帖，占 ${top.pct}%）；` +
    `发帖高峰在 ${peak.h} 点。`
}
