/**
 * ════════════════════════════════════════════════════════════════════
 * @模块路径  src/agent/navAnswer.js
 * @职责      导航站端本地知识检索（BM25）——智能体识别的「第二层」由
 *            20 条 FAQ 精确匹配升级为全库语义近似检索（与 Wiki 站 kb.json 同级）
 * @数据      ./kb-nav.json（scripts/gen_kb_nav 逻辑内嵌生成：faq/workflows/apps
 *            真实语料 → bigram 分词 → BM25 倒排；47 docs / 1000+ 词表）
 * @入口      navAnswer(text) → {t, s, src, score} | null
 * @被谁用    engine.js recognize() 的 faq 层之后、app 检索之前
 * @性能      首次懒加载 + 模块级缓存；47 篇量级全量打分 <2ms，零外部依赖
 * @维护      改 faq/workflows 后重新生成索引（见文件尾注释），或手工补 docs
 * ════════════════════════════════════════════════════════════════════
 */
import KB from './kb-nav.json'

let ready = false
let dfMap = null
let postings = null // word -> [[docIdx, tf], ...]

function ensureIndex() {
  if (ready) return
  dfMap = Object.create(null)
  KB.vocab.forEach((w, i) => { dfMap[w] = KB.df[i] })
  postings = Object.create(null)
  KB.docs.forEach((d, di) => {
    for (const w in d.tf) {
      if (!postings[w]) postings[w] = []
      postings[w].push([di, d.tf[w]])
    }
  })
  ready = true
}

/** 与生成端一致的 bigram 分词 */
function tokenize(q) {
  const text = String(q || '').replace(/[^\u4e00-\u9fa5A-Za-z0-9]/g, ' ')
  const toks = []
  for (const seg of text.split(/\s+/)) {
    if (!seg) continue
    if (/^[A-Za-z0-9]+$/.test(seg) && seg.length >= 2) toks.push(seg.toLowerCase())
    for (let i = 0; i < seg.length - 1; i++) {
      toks.push(seg.substr(i, 2))
    }
  }
  return toks
}

/**
 * BM25 检索
 * @param {string} text 用户问题
 * @param {number} topK 返回条数（默认 1）
 * @returns {{t:string,s:string,src:string,score:number}|null}
 */
export function navAnswer(text, topK = 1) {
  ensureIndex()
  const qtoks = tokenize(text)
  if (!qtoks.length) return null
  const { k1, b, avgdl, n } = KB.meta
  const scores = Object.create(null)
  let hit = 0
  for (const w of qtoks) {
    const df = dfMap[w]
    if (!df) continue
    hit++
    const idf = Math.log(1 + (n - df + 0.5) / (df + 0.5))
    for (const [di, tf] of postings[w]) {
      const dl = KB.docs[di].len
      const s = (idf * tf * (k1 + 1)) / (tf + k1 * (1 - b + (b * dl) / avgdl))
      scores[di] = (scores[di] || 0) + s
    }
  }
  if (!hit) return null
  // 阈值：至少命中 2 个不同词位或得分显著，避免单字蹭中
  const distinct = Object.keys(scores).length
  const arr = Object.entries(scores).map(([di, sc]) => [+di, sc]).sort((a, c) => c[1] - a[1])
  const best = arr[0]
  if (!best) return null
  const minScore = distinct >= 3 ? 1.2 : 2.5
  if (best[1] < minScore) return null
  const d = KB.docs[best[0]]
  return { t: d.t, s: d.s, src: d.src, score: Math.round(best[1] * 100) / 100, kind: d.kind }
}

export function kbStats() {
  return { docs: KB.meta.n, vocab: KB.vocab.length }
}

/* ────────────────────────────────────────────────────────────────
 * 索引重建（维护者用）：修改 faq.js / workflows.js / apps 描述后执行
 *   node scripts/gen_kb_nav.mjs
 * 生成逻辑与 scripts/gen_kb_nav.mjs 保持一致（生成端 bigram 与本文件
 * tokenize 必须同步修改，否则检索失效）。
 * ──────────────────────────────────────────────────────────────── */
