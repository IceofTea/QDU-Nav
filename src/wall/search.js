/**
 * ════════════════════════════════════════════════════════════════════
 * @模块路径  src/wall/search.js
 * @职责      校园墙本地检索引擎 v2：分词 → 倒排打分 → 排序 → 高亮
 *            —— 无后端期的“全文检索平替”，后端期可整体换成
 *            GET /api/wall/search?q=（见 config.API_CONTRACT），调用方签名不变
 * @入口      tokenize / scorePost / searchAdvanced / suggestTags /
 *            hotTopicsV2 / buildIndex / paginate / highlight
 * @依赖      无（纯函数，可被 unit-wall.mjs 直接断言；不碰 localStorage）
 * @被谁用    CampusWall.vue（可选增强）· CommunityInsights.vue ·
 *            Agent workflows（搜墙 hotTopics 升级版）· scripts/unit-wall.mjs
 * @降级策略  本模块纯本地计算，零网络依赖；索引构建失败 → 回退 api.searchPosts
 * @设计思想  中文按二元切分 + 英文按词切分；标题权重 3x > 标签 2x > 内容 1x；
 *            时间衰减沿用 config.hotScore 思想但不照抄，保持可解释
 * ════════════════════════════════════════════════════════════════════
 */

// ───────────────────────── 0. 常量 ─────────────────────────

export const SEARCH_VERSION = '2.1.0'

/** 中文停用词（精简版：命中则不计分，节省倒排体积） */
const STOP_ZH = new Set([
  '的', '了', '是', '在', '我', '有', '和', '就', '不', '人', '都', '一',
  '上', '也', '很', '到', '说', '要', '去', '你', '这', '吗', '什么', '怎么',
  '可以', '我们', '自己', '这个', '那个', '一下', '如何', '有没有', '一个', '为',
  '与', '或', '及', '等', '将', '已', '并', '但', '而', '呢', '啊', '吧', '哦'
])

/** 英文停用词 */
const STOP_EN = new Set([
  'the', 'a', 'an', 'of', 'to', 'in', 'on', 'for', 'with', 'is', 'are', 'was',
  'and', 'or', 'it', 'this', 'that', 'you', 'your', 'we', 'our', 'how', 'what'
])

/** 分区中文名 → id 反查（搜“美食”也能命中 tag=food） */
const TAG_ALIAS = {
  '求助': 'help', '悬赏': 'bounty', '失物': 'lost', '招领': 'lost',
  '美食': 'food', '食堂': 'food', '外卖': 'food',
  '学业': 'study', '选课': 'study', '考试': 'study', '课程': 'study',
  '资源': 'resource', '课件': 'resource', '模板': 'resource',
  '公示': 'notice', '招新': 'notice', '活动': 'notice',
  '二手': 'trade', '出': 'trade', '收': 'trade',
  '拼车': 'ride', '顺风': 'ride', '拼单': 'ride',
  '吐槽': 'rant', '闲聊': 'chat', '聊天': 'chat'
}

// ───────────────────────── 1. 分词 ─────────────────────────

/**
 * 规范化：全角转半角 / 小写 / 去多余空白
 * @param {string} s
 * @returns {string}
 */
export function normalize(s) {
  if (!s) return ''
  return String(s)
    .replace(/[\uFF01-\uFF5E]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0))
    .replace(/\u3000/g, ' ')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * 判断是否为 CJK 字符
 * @param {string} ch 单字符
 */
export function isCjk(ch) {
  if (!ch) return false
  const code = ch.codePointAt(0)
  return (
    (code >= 0x4e00 && code <= 0x9fff) || // CJK 统一表意
    (code >= 0x3400 && code <= 0x4dbf) || // 扩展 A
    (code >= 0x3040 && code <= 0x30ff) || // 日文假名（顺带切）
    (code >= 0xac00 && code <= 0xd7af)    // 韩文（顺带切）
  )
}

/**
 * 分词：中文按滑动二元（bigram）+ 单字回退；英文数字按 [a-z0-9]+ 切词
 * 例：“食堂二楼” → ["食堂","堂二","二楼","食","堂","二","楼"]
 * @param {string} text
 * @returns {string[]} token 列表（已去停用词、已去重？不去重，保留词频供打分）
 */
export function tokenize(text) {
  const norm = normalize(text)
  if (!norm) return []
  const out = []
  // 先按非 CJK / 非字母数字切出片段
  const cleaned = norm.replace(/[^\u4e00-\u9fa5a-z0-9\u3040-\u30ff\uac00-\ud7af]+/g, ' ')
  const frags = cleaned.split(' ').filter(Boolean)
  for (const frag of frags) {
    // 纯英文数字词
    if (/^[a-z0-9]+$/.test(frag)) {
      if (frag.length < 2) continue
      if (STOP_EN.has(frag)) continue
      out.push(frag)
      continue
    }
    // 含 CJK 的片段：逐字 + 二元
    const chars = Array.from(frag)
    for (const ch of chars) {
      if (STOP_ZH.has(ch)) continue
      if (isCjk(ch)) out.push(ch)
      else if (/[a-z0-9]/.test(ch)) out.push(ch)
    }
    for (let i = 0; i + 1 < chars.length; i++) {
      const bi = chars[i] + chars[i + 1]
      if (STOP_ZH.has(bi)) continue
      // 二元中至少一字为 CJK 才保留（过滤纯数字二元噪声）
      if (isCjk(chars[i]) || isCjk(chars[i + 1])) out.push(bi)
    }
    // 顺带把片段整体也作为一个短语 token（提升整词命中权重）
    if (chars.length >= 2 && chars.length <= 8) {
      const phrase = chars.join('')
      if (!STOP_ZH.has(phrase)) out.push(phrase)
    }
  }
  return out.filter((t) => t && t.length >= 1).slice(0, 120)
}

/**
 * 查询改写：提取标签意图 + 剩余关键词
 * 例：“美食 食堂二楼” → { tags:['food'], keywords:['食堂','堂二','二楼',...] }
 * @param {string} q
 */
export function parseQuery(q) {
  const norm = normalize(q)
  if (!norm) return { tags: [], keywords: [], raw: '' }
  const parts = norm.split(' ').filter(Boolean)
  const tags = []
  const rest = []
  for (const p of parts) {
    if (TAG_ALIAS[p]) {
      if (!tags.includes(TAG_ALIAS[p])) tags.push(TAG_ALIAS[p])
    } else {
      rest.push(p)
    }
  }
  // 标签别名也可能藏在长句里（如“求食堂二楼美食”）
  for (const [alias, id] of Object.entries(TAG_ALIAS)) {
    if (norm.includes(alias) && !tags.includes(id)) tags.push(id)
  }
  const keywords = tokenize(rest.join(' ') || norm)
  return { tags, keywords, raw: norm }
}

// ───────────────────────── 2. 打分 ─────────────────────────

/**
 * 单帖打分（可解释：返回明细供调试与管理台展示）
 * @param {object} post {title,content,tag,author,replies,likes,views,ts}
 * @param {string[]} keywords
 * @param {object} opt {titleW,tagW,contentW,replyW}
 */
export function scorePost(post, keywords, opt = {}) {
  const titleW = opt.titleW ?? 3
  const tagW = opt.tagW ?? 2
  const contentW = opt.contentW ?? 1
  const replyW = opt.replyW ?? 0.5
  const titleToks = new Set(tokenize(post.title || ''))
  const tagToks = new Set(tokenize((post.tag || '') + ' ' + (post.tagName || '')))
  const contentToks = new Set(tokenize(post.content || ''))
  const replyText = (post.replies || []).map((r) => r.content || '').join(' ')
  const replyToks = new Set(tokenize(replyText))
  let score = 0
  const hits = []
  const seen = new Set()
  for (const kw of keywords) {
    if (seen.has(kw)) continue
    seen.add(kw)
    if (titleToks.has(kw)) { score += titleW * (kw.length >= 2 ? 2 : 1); hits.push('title:' + kw) }
    else if (tagToks.has(kw)) { score += tagW; hits.push('tag:' + kw) }
    else if (contentToks.has(kw)) { score += contentW * (kw.length >= 2 ? 2 : 1); hits.push('content:' + kw) }
    else if (replyToks.has(kw)) { score += replyW; hits.push('reply:' + kw) }
    // 前缀兜底：帖标题包含查询整词（如搜“麻辣香锅”标题含即中）
    else if ((post.title || '').toLowerCase().includes(kw) && kw.length >= 2) {
      score += titleW
      hits.push('title:substr:' + kw)
    } else if ((post.content || '').toLowerCase().includes(kw) && kw.length >= 2) {
      score += contentW
      hits.push('content:substr:' + kw)
    }
  }
  return { score, hits }
}

/**
 * 时间衰减加成（新帖小幅加权，老帖不惩罚过重，保证可解释）
 * @param {number} ts
 */
export function freshnessBoost(ts) {
  if (!ts) return 0
  const ageH = (Date.now() - ts) / 3600000
  if (ageH < 0) return 0
  if (ageH <= 6) return 1.5
  if (ageH <= 24) return 1.0
  if (ageH <= 72) return 0.5
  if (ageH <= 168) return 0.2
  return 0
}

/**
 * 互动加成（点赞/回复/浏览，封顶防刷榜）
 */
export function engageBoost(post) {
  const likes = Math.min(post.likes || 0, 200)
  const replies = Math.min((post.replies || []).length, 200)
  const views = Math.min(post.views || 0, 5000)
  return Math.min(3, likes * 0.05 + replies * 0.08 + views * 0.0005)
}

// ───────────────────────── 3. 主搜索 ─────────────────────────

/**
 * 高级搜索（纯函数，CampusWall 可直接替换 api.searchPosts）
 * @param {object[]} posts
 * @param {string} q 查询（空串 → 按 sort 原样返回）
 * @param {object} opt {tag,sort,limit,withDetail}
 *   tag: 分区过滤（'all' 不滤）· sort: 'relevance'|'hot'|'new' · limit 上限
 * @returns {object[]|{posts,total,facets}} withDetail=true 时返回 facets（分区分布）
 */
export function searchAdvanced(posts, q, opt = {}) {
  const list = Array.isArray(posts) ? posts : []
  const tag = opt.tag || 'all'
  const sort = opt.sort || 'relevance'
  const limit = opt.limit ?? 200
  let pool = list
  if (tag && tag !== 'all') pool = pool.filter((p) => p.tag === tag)
  const { tags, keywords } = parseQuery(q)
  // 标签意图过滤（查“美食”自动收窄到 food 分区，除非用户已手动选分区）
  if (tags.length && (tag === 'all')) {
    const tagHit = pool.filter((p) => tags.includes(p.tag))
    // 若标签命中太少（<3），则不强制过滤，改为加权（防空结果）
    if (tagHit.length >= 3) pool = tagHit
  }
  if (!keywords.length) {
    const sorted = pool.slice().sort((a, b) => (sort === 'new' ? (b.ts || 0) - (a.ts || 0) : hotOf(b) - hotOf(a)))
    const sliced = sorted.slice(0, limit)
    if (opt.withDetail) return { posts: sliced, total: pool.length, facets: facetsOf(pool), query: parseQuery(q) }
    return sliced
  }
  const scored = []
  for (const p of pool) {
    const { score, hits } = scorePost(p, keywords)
    if (score <= 0) continue
    let finalScore = score + freshnessBoost(p.ts) + engageBoost(p)
    // 标签意图命中额外 +2（可解释）
    if (tags.length && tags.includes(p.tag)) { finalScore += 2; hits.push('tag:intent') }
    scored.push({ post: p, score: finalScore, hits })
  }
  scored.sort((a, b) => b.score - a.score || (b.post.ts || 0) - (a.post.ts || 0))
  let out = scored
  if (sort === 'new') out = scored.slice().sort((a, b) => (b.post.ts || 0) - (a.post.ts || 0))
  if (sort === 'hot') out = scored.slice().sort((a, b) => hotOf(b.post) - hotOf(a.post))
  const sliced = out.slice(0, limit)
  if (opt.withDetail) {
    return {
      posts: sliced.map((s) => s.post),
      scored: sliced,
      total: scored.length,
      facets: facetsOf(pool),
      query: { tags, keywords }
    }
  }
  return sliced.map((s) => s.post)
}

/** 热度（与 api.hotScoreSafe 同构，避免循环依赖） */
function hotOf(p) {
  const ageH = (Date.now() - (p.ts || 0)) / 3600000
  const engage = (p.likes || 0) * 3 + ((p.replies || []).length) * 2 + (p.views || 0) * 0.1
  return engage / Math.pow(ageH + 2, 1.1)
}

/** 分区分布（供筛选 chips 展示数量） */
export function facetsOf(posts) {
  const m = {}
  for (const p of posts || []) m[p.tag || 'chat'] = (m[p.tag || 'chat'] || 0) + 1
  return Object.entries(m).sort((a, b) => b[1] - a[1]).map(([tag, n]) => ({ tag, n }))
}

// ───────────────────────── 4. 索引（大数据量加速） ─────────────────────────

/**
 * 构建简易倒排索引（帖量 >500 时 CampusWall 可缓存复用）
 * @param {object[]} posts
 * @returns {{index:Map,docs:Map}}
 */
export function buildIndex(posts) {
  const index = new Map() // token -> Set(postId)
  const docs = new Map()  // postId -> post
  for (const p of posts || []) {
    if (!p || !p.id) continue
    docs.set(p.id, p)
    const toks = new Set([
      ...tokenize(p.title || ''),
      ...tokenize(p.content || ''),
      ...tokenize(p.tag || '')
    ])
    for (const t of toks) {
      if (!index.has(t)) index.set(t, new Set())
      index.get(t).add(p.id)
    }
  }
  return { index, docs }
}

/**
 * 走索引搜索（与 searchAdvanced 同分逻辑，适合 >1000 帖）
 */
export function searchWithIndex(built, q, opt = {}) {
  if (!built || !built.index) return searchAdvanced([...(built?.docs?.values() || [])], q, opt)
  const { keywords } = parseQuery(q)
  if (!keywords.length) return searchAdvanced([...built.docs.values()], q, opt)
  const candIds = new Set()
  for (const kw of keywords) {
    const s = built.index.get(kw)
    if (s) for (const id of s) candIds.add(id)
    // 二元切分兜底：整词无命中时退化为包含匹配
    if (!s && kw.length >= 2) {
      for (const [tok, ids] of built.index) {
        if (tok.includes(kw) || kw.includes(tok)) for (const id of ids) candIds.add(id)
      }
    }
  }
  const pool = [...candIds].map((id) => built.docs.get(id)).filter(Boolean)
  return searchAdvanced(pool, q, opt)
}

// ───────────────────────── 5. 热词 v2 ─────────────────────────

/**
 * 热词 v2：词频 × 互动加权（替代 api.hotTopics 的纯计数版，结果更“活”）
 * @param {object[]} posts
 * @param {number} topN
 */
export function hotTopicsV2(posts, topN = 8) {
  const freq = new Map()
  for (const p of posts || []) {
    const text = ((p.title || '') + ' ' + (p.content || '')).replace(/[^\u4e00-\u9fa5A-Za-z0-9]+/g, ' ')
    const words = text.split(' ').filter((w) => w.length >= 2 && !STOP_ZH.has(w))
    const weight = 1 + Math.min(3, ((p.likes || 0) * 0.1 + ((p.replies || []).length) * 0.15))
    const seen = new Set()
    for (const w of words) {
      if (w.length > 8) continue
      if (seen.has(w)) continue
      seen.add(w)
      freq.set(w, (freq.get(w) || 0) + weight)
    }
    // 二元词也计入（“食堂”“拼车”这类短词才配上热榜）
    for (const t of tokenize(p.title || '')) {
      if (t.length !== 2) continue
      freq.set(t, (freq.get(t) || 0) + weight * 0.5)
    }
  }
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([word, score]) => ({ word, n: Math.round(score * 10) / 10 }))
}

// ───────────────────────── 6. 联想 / 标签建议 ─────────────────────────

/**
 * 输入联想（Composer @ 与搜索框共用）：按前缀从作者池 + 热词池取
 * @param {string} prefix
 * @param {object[]} posts
 * @param {number} limit
 */
export function suggest(prefix, posts, limit = 6) {
  const kw = normalize(prefix).replace(/^@/, '')
  if (!kw) return []
  const authors = new Set()
  for (const p of posts || []) {
    if (p.author) authors.add(p.author)
    for (const r of p.replies || []) if (r.author) authors.add(r.author)
  }
  const out = []
  for (const a of authors) {
    if (normalize(a).includes(kw)) { out.push({ type: 'user', text: '@' + a }); if (out.length >= limit) break }
  }
  if (out.length < limit) {
    for (const { word } of hotTopicsV2(posts, 12)) {
      if (normalize(word).includes(kw)) { out.push({ type: 'topic', text: word }); if (out.length >= limit) break }
    }
  }
  return out
}

/**
 * 发帖分区建议（Composer 输入标题+内容即时推荐分区）
 * @param {string} title
 * @param {string} content
 */
export function suggestTags(title, content) {
  const text = normalize((title || '') + ' ' + (content || ''))
  const scored = []
  const RULES = [
    { tag: 'lost', keys: ['丢', '捡', '失主', '招领', '耳机', '校园卡', '钥匙', '雨伞'] },
    { tag: 'food', keys: ['食堂', '外卖', '好吃', '档口', '奶茶', '避雷', '测评'] },
    { tag: 'study', keys: ['选课', '考试', '复习', '绩点', '保研', '考研', '四六级'] },
    { tag: 'resource', keys: ['课件', '资源', '模板', '电子书', '链接', '提取码', 'pdf'] },
    { tag: 'trade', keys: ['出', '收', '二手', '转让', '闲置', '走平台'] },
    { tag: 'ride', keys: ['拼车', '顺风', '回家', '返校', '拼单'] },
    { tag: 'bounty', keys: ['悬赏', '求助', '有偿', '采纳'] },
    { tag: 'notice', keys: ['招新', '公示', '活动', '讲座', '比赛'] }
  ]
  for (const r of RULES) {
    let s = 0
    for (const k of r.keys) if (text.includes(k)) s++
    if (s > 0) scored.push({ tag: r.tag, score: s })
  }
  return scored.sort((a, b) => b.score - a.score).slice(0, 3)
}

// ───────────────────────── 7. 分页 / 高亮 ─────────────────────────

/**
 * 分页（CampusWall 列表 + 详情楼层共用）
 */
export function paginate(list, page = 1, pageSize = 20) {
  const arr = Array.isArray(list) ? list : []
  const total = arr.length
  const pages = Math.max(1, Math.ceil(total / pageSize))
  const cur = Math.min(Math.max(1, page), pages)
  const start = (cur - 1) * pageSize
  return { items: arr.slice(start, start + pageSize), total, pages, page: cur, pageSize }
}

/** HTML 转义（高亮前必做，防 XSS） */
export function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * 关键词高亮（返回 HTML，调用方用 v-html 渲染）
 * @param {string} text
 * @param {string} q
 */
export function highlight(text, q) {
  const { keywords } = parseQuery(q)
  let html = escapeHtml(text)
  const uniq = [...new Set(keywords)].filter((k) => k.length >= 2).sort((a, b) => b.length - a.length).slice(0, 12)
  for (const kw of uniq) {
    const esc = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    try {
      html = html.replace(new RegExp('(' + esc + ')', 'gi'), '<mark class="wall-mark">$1</mark>')
    } catch { /* 非法正则跳过 */ }
  }
  return html
}

/**
 * 搜索历史（本机存 10 条，搜索框下拉回显）
 */
const LS_HISTORY = 'wall_search_hist_v2'
export function getSearchHistory() {
  try { return JSON.parse(localStorage.getItem(LS_HISTORY) || '[]') } catch { return [] }
}
export function pushSearchHistory(q) {
  const kw = (q || '').trim()
  if (!kw) return []
  try {
    let h = getSearchHistory().filter((x) => x !== kw)
    h.unshift(kw)
    h = h.slice(0, 10)
    localStorage.setItem(LS_HISTORY, JSON.stringify(h))
    return h
  } catch { return [] }
}
export function clearSearchHistory() {
  try { localStorage.removeItem(LS_HISTORY) } catch { /* noop */ }
  return []
}

// ───────────────────────── 8. 兼容导出 ─────────────────────────
/** 给老调用方的一句话平替：searchPosts(posts,q) → 走 relevance 排序 */
export function searchPostsCompat(posts, q) {
  return searchAdvanced(posts, q, { sort: 'relevance', limit: 500 })
}
