/**
 * ════════════════════════════════════════════════════════════════════
 * @模块路径  scripts/gen_kb_nav.mjs
 * @职责      重建智能体本地知识库 kb-nav.json（BM25 倒排索引）
 *            语料来源：agent/faq.js 全量 Q+A+source · workflows.js 能力描述 ·
 *            data/apps.js 应用标题与描述 —— 全部真实文本，零编造
 * @用法      node scripts/gen_kb_nav.mjs   （改 faq/workflows/apps 后必跑）
 * @输出      src/agent/kb-nav.json（缩进格式，便于 diff 与人工抽查）
 * @一致性    分词规则（英文词 + 中文 bigram，剔除停用字）必须与
 *            src/agent/navAnswer.js 的 tokenize() 完全一致，否则检索失效
 * ════════════════════════════════════════════════════════════════════
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const AGENT = path.join(__dirname, '..', 'src', 'agent')
const APPS = path.join(__dirname, '..', 'src', 'data', 'apps.js')

const STOP = new Set(('的了是在我有和就不人也都一上也很到说要去你吗什么怎么可以我们自己这个那个一下如何有没有与及或被把从对为了而并且但是如果但' +
  '的了是我在有和就不人也都一上也很到说要去').split(''))

/** 与 navAnswer.tokenize 同步修改的分词器 */
function tokens(text) {
  const clean = String(text).replace(/[^\u4e00-\u9fa5A-Za-z0-9]/g, ' ')
  const out = []
  for (const seg of clean.split(/\s+/)) {
    if (!seg) continue
    if (/^[A-Za-z0-9]+$/.test(seg) && seg.length >= 2 && !STOP.has(seg.toLowerCase())) out.push(seg.toLowerCase())
    for (let i = 0; i < seg.length - 1; i++) {
      const a = seg[i], b = seg[i + 1]
      if (!STOP.has(a) && !STOP.has(b)) out.push(a + b)
    }
  }
  return out
}

function extractQuoted(str, key) {
  const re = new RegExp(key + ":\\s*'([^']*)'", 'g')
  const res = []
  let m
  while ((m = re.exec(str))) res.push(m[1])
  return res
}

const chunks = []

// 1) FAQ 语料
try {
  const faq = fs.readFileSync(path.join(AGENT, 'faq.js'), 'utf8')
  const blocks = faq.split(/\{\s*\n\s*id:/).slice(1)
  for (const b of blocks) {
    const q = (b.match(/q:\s*'([^']+)'/) || [])[1]
    const a = (b.match(/a:\s*'([^']+)'/) || [])[1]
    const src = (b.match(/source:\s*'([^']+)'/) || [])[1]
    if (q && a) chunks.push({ t: q, s: a, src: src || '本地知识库', kind: 'faq' })
  }
} catch (e) { console.warn('faq.js 读取失败:', e.message) }

// 2) 工作流能力语料
try {
  const wf = fs.readFileSync(path.join(AGENT, 'workflows.js'), 'utf8')
  const re = /id:\s*'(\w+)',\s*title:\s*'([^']+)',\s*icon:\s*'([^']+)'/g
  let m
  while ((m = re.exec(wf))) {
    chunks.push({
      t: m[2] + ' 怎么用',
      s: `对智能体说出「${m[2]}」即可触发工作流 ${m[1]}，执行过程逐步可见，结果以卡片呈现（含可点操作与降级说明）。`,
      src: '工作流 ' + m[1], kind: 'wf'
    })
  }
} catch (e) { console.warn('workflows.js 读取失败:', e.message) }

// 3) 应用语料
try {
  const apps = fs.readFileSync(APPS, 'utf8')
  const ids = extractQuoted(apps, 'id')
  const titles = extractQuoted(apps, 'title')
  const descs = extractQuoted(apps, 'desc')
  for (let i = 0; i < titles.length; i++) {
    chunks.push({ t: titles[i] + ' 功能介绍', s: descs[i] || '', src: '应用 ' + (ids[i] || ''), kind: 'app' })
  }
} catch (e) { console.warn('apps.js 读取失败:', e.message) }

// 4) 构建 BM25 索引
const docs = chunks.map((c) => {
  const tk = tokens(c.t + ' ' + c.s + ' ' + (c.src || ''))
  const tf = {}
  for (const w of tk) tf[w] = (tf[w] || 0) + 1
  return { t: c.t, s: c.s, src: c.src, kind: c.kind, tf, len: tk.length }
})
const N = docs.length
const df = {}
for (const d of docs) for (const w in d.tf) df[w] = (df[w] || 0) + 1
const vocab = Object.keys(df).sort()
const index = {
  meta: { n: N, avgdl: docs.reduce((a, d) => a + d.len, 0) / Math.max(1, N), k1: 1.5, b: 0.75, gen: 'nav-bm25-v1' },
  vocab,
  df: vocab.map((w) => df[w]),
  docs
}

const out = process.env.KB_NAV_OUT
  ? path.resolve(process.env.KB_NAV_OUT)
  : path.join(AGENT, 'kb-nav.json')
fs.writeFileSync(out, JSON.stringify(index, null, 1), 'utf8')
console.log(`kb-nav.json 已生成：${N} docs · 词表 ${vocab.length} · ${path.relative(process.cwd(), out)}`)
console.log('提醒：同步修改分词规则时必须同时更新 navAnswer.js 的 tokenize()')
