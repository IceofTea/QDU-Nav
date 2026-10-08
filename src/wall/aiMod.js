/**
 * ════════════════════════════════════════════════════════════════════
 * @模块路径  src/wall/aiMod.js
 * @职责      AI 评论治理（纯前端抽取式，无外部请求）：讨论摘要 / 争议检测 /
 *            高频选题提取 / 纠错聚合 —— “评论区即选题库”（专家卖点 5）
 * @入口      summarizeThread / detectDispute / hotQuestions / collectFixes /
 *            modReport
 * @依赖      无（帖子/评论由调用方透传；中文二元词频与 search.js 同思想）
 * @被谁用    views/Flywheel.vue（治理面板）· views/CommunityInsights.vue
 *            （下一步）· Agent workflows（选题口播）· scripts/unit-grow.mjs
 * @设计思想  全部可解释：每个结论附证据句/帖子 id；零幻觉（只抽取不生成）
 * ════════════════════════════════════════════════════════════════════
 */

export const AIMOD_VERSION = '1.0.0'

/** 中文分句 */
function sentences(text) {
  return String(text || '').split(/[。！？!?\n]+/).map((s) => s.trim()).filter((s) => s.length >= 4)
}
/** 二元词频 */
function bigramFreq(texts) {
  const freq = {}
  for (const t of texts) {
    const s = String(t || '')
    for (let i = 0; i + 1 < s.length; i++) {
      const bg = s.slice(i, i + 2)
      if (/[\u4e00-\u9fa5]{2}/.test(bg)) freq[bg] = (freq[bg] || 0) + 1
    }
  }
  return freq
}
/** 句打分（词频均值，首句小幅加权） */
function scoreSent(s, freq, isFirst) {
  let sc = 0
  for (let i = 0; i + 1 < s.length; i++) sc += freq[s.slice(i, i + 2)] || 0
  sc = sc / Math.max(1, s.length)
  return isFirst ? sc * 1.2 : sc
}

// ──────────────────────── 1. 讨论摘要 ─────────────────────────

/**
 * 单帖讨论摘要（主楼 + 回复抽取 2 句；空态返回 null，调用方显示空态）
 * @param {object} post {title, content, replies:[{content}]}
 */
export function summarizeThread(post) {
  if (!post) return null
  const texts = [post.content || '', ...((post.replies || []).map((r) => r.content || ''))].filter((t) => t.trim())
  if (!texts.length) return null
  if (texts.length === 1 && (post.replies || []).length === 0) return '暂无讨论：' + texts[0].slice(0, 50)
  const freq = bigramFreq(texts)
  const sents = []
  texts.forEach((t, ti) => sentences(t).forEach((s, si) => sents.push({ s, sc: scoreSent(s, freq, ti === 0 && si === 0) })))
  if (!sents.length) return null
  sents.sort((a, b) => b.sc - a.sc)
  const top = sents.slice(0, 2).map((x) => '“' + x.s.slice(0, 40) + '”')
  return `本地 AI 归纳（${(post.replies || []).length} 条回复）：主要在讨论 ${top.join('；')}`
}

// ──────────────────────── 2. 争议检测 ─────────────────────────

/**
 * 争议帖检测（规则型、可解释）：举报多 / 踩多 / 褒贬词对冲
 * @param {object[]} posts
 * @returns {object[]} [{post, level: 'high'|'mid', reasons:[]}]
 */
export function detectDispute(posts) {
  const PRAISE = ['好', '赞', '支持', '喜欢', '推荐', '靠谱', '感谢']
  const BLAME = ['差', '坑', '垃圾', '避雷', '投诉', '举报', '愤怒', '失望']
  const out = []
  for (const p of posts || []) {
    const reasons = []
    if ((p.reports || 0) >= 2) reasons.push(`被举报 ${p.reports} 次`)
    const blobs = [p.content || '', ...((p.replies || []).map((r) => r.content || ''))].join(' ')
    const praise = PRAISE.filter((w) => blobs.includes(w)).length
    const blame = BLAME.filter((w) => blobs.includes(w)).length
    if (praise >= 2 && blame >= 2) reasons.push(`褒贬对冲（赞 ${praise} / 贬 ${blame}）`)
    if ((p.replies || []).length >= 15) reasons.push(`回复 ${p.replies.length} 条（远超均值）`)
    if (reasons.length >= 2) out.push({ post: p, level: 'high', reasons })
    else if (reasons.length === 1) out.push({ post: p, level: 'mid', reasons })
  }
  return out.sort((a, b) => (a.level === b.level ? 0 : a.level === 'high' ? -1 : 1))
}

// ──────────────────────── 3. 高频选题 ─────────────────────────

/**
 * 高频选题提取（“怎么/求/哪家/推荐”问句聚类 → 维护 Agent 选题库）
 * @param {object[]} posts
 * @param {number} topN
 */
export function hotQuestions(posts, topN = 6) {
  const ASK = ['怎么', '如何', '哪家', '哪里', '求', '推荐', '有人知道', '请问', '?', '？']
  const freq = {}
  const sample = {}
  for (const p of posts || []) {
    const text = (p.title || '') + ' ' + (p.content || '')
    if (!ASK.some((k) => text.includes(k))) continue
    // 关键词：标题二元组
    const seen = new Set()
    for (let i = 0; i + 1 < text.length; i++) {
      const bg = text.slice(i, i + 2)
      if (!/[\u4e00-\u9fa5]{2}/.test(bg) || seen.has(bg)) continue
      seen.add(bg)
      freq[bg] = (freq[bg] || 0) + 1
      if (!sample[bg]) sample[bg] = p
    }
  }
  return Object.entries(freq)
    .filter(([, n]) => n >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([word, n]) => ({ word, n, post: sample[word] ? { id: sample[word].id, title: sample[word].title } : null }))
}

// ──────────────────────── 4. 纠错聚合 ─────────────────────────

/**
 * 纠错聚合（type=correction 的评论/帖子 → 维护待办口径）
 * @param {object[]} comments Wiki comments 或墙回复（需 type==='correction'）
 */
export function collectFixes(comments) {
  return (comments || [])
    .filter((c) => c.type === 'correction')
    .map((c) => ({
      id: c.id,
      quote: (c.quote || c.title || '').slice(0, 60),
      content: (c.content || '').slice(0, 120),
      author: c.author || '匿名同学',
      ts: c.ts || 0,
      path: c.path || ''
    }))
    .sort((a, b) => b.ts - a.ts)
}

// ──────────────────────── 5. 治理日报 ─────────────────────────

/**
 * 治理日报（一屏给管理台/飞轮看板：摘要数/争议数/选题数/纠错数）
 * @param {object[]} posts
 * @param {object[]} comments
 */
export function modReport(posts, comments) {
  const disputes = detectDispute(posts)
  const questions = hotQuestions(posts)
  const fixes = collectFixes(comments)
  const parts = []
  if (disputes.filter((d) => d.level === 'high').length) {
    parts.push(`⚠️ 高争议 ${disputes.filter((d) => d.level === 'high').length} 帖需人工看一眼`)
  }
  if (questions.length) parts.push(`💡 高频选题 ${questions.length} 个（${questions.slice(0, 3).map((q) => q.word).join('、')}）`)
  if (fixes.length) parts.push(`🚩 待核纠错 ${fixes.length} 条`)
  return {
    disputes, questions, fixes,
    summary: parts.length ? parts.join('；') + '。' : '社区风平浪静，暂无待治理项 ✅'
  }
}
