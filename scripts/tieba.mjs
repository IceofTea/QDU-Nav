// 青岛大学吧舆情分析（Node 版，Python 版 crawler/tieba.py 的回退实现）
// 尽力抓取百度贴吧「青岛大学吧」公开列表页，做热帖/关键词/话题/趋势分析，
// 输出 public/data/tieba_stats.json。任何失败都不覆盖上一次的成功数据。
// 运行：node scripts/tieba.mjs
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.join(__dirname, '..', 'public', 'data', 'tieba_stats.json')
const BAR_NAME = '青岛大学'
const BAR_URL = 'https://tieba.baidu.com/f?kw=' + encodeURIComponent(BAR_NAME)
const PAGES = 4
const PAGE_SIZE = 50
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'
const BAIDUID = crypto.randomBytes(16).toString('hex')

const TOPIC_KEYWORDS = {
  考研升学: ['考研', '复试', '保研', '上岸', '调剂', '初试', '分数线', '研招'],
  校园生活: ['食堂', '宿舍', '澡堂', '快递', '外卖', '热水', '空调', '电费', '超市', '洗衣'],
  学习考试: ['期末', '考试', '挂科', '绩点', '选课', '图书馆', '自习', '成绩', '四六级', '教材'],
  校园事务: ['转专业', '军训', '社团', '迎新', '报到', '评优', '奖学金', '助学金', '退学', '休学'],
  就业实习: ['实习', '招聘', '秋招', '春招', '就业', 'offer', '考公', '兼职'],
  吐槽求助: ['吐槽', '求助', '求问', '无语', '离谱', '难受', '崩溃', '郁闷', '踩坑']
}
const KEYWORD_DICT = [...new Set(Object.values(TOPIC_KEYWORDS).flat())].sort(
  (a, b) => b.length - a.length
)

async function fetchList(page) {
  const url = `${BAR_URL}&ie=utf-8&pn=${page * PAGE_SIZE}`
  const res = await fetch(url, {
    headers: {
      'User-Agent': UA,
      'Accept-Language': 'zh-CN,zh;q=0.9',
      Cookie: `BAIDUID=${BAIDUID}`
    },
    signal: AbortSignal.timeout(20000)
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const text = await res.text()
  if (text.length < 5000 || !text.includes('j_thread_list')) {
    throw new Error('页面无帖子列表（疑似被反爬拦截）')
  }
  return text
}

function parseReplies(raw) {
  const s = String(raw || '').trim().replace(/,/g, '')
  const w = s.match(/^([\d.]+)\s*万/)
  if (w) return Math.round(parseFloat(w[1]) * 10000)
  const n = s.match(/^(\d+)/)
  return n ? parseInt(n[1], 10) : 0
}

function parseThreads(html) {
  const threads = []
  const liRe = /<li[^>]*class="[^"]*(?:j_thread_list|threadlist)[^"]*"[^>]*>([\s\S]*?)<\/li>/g
  let m
  while ((m = liRe.exec(html))) {
    const block = m[1]
    const titleM = block.match(/<a[^>]*class="[^"]*j_th_tit[^"]*"[^>]*>([\s\S]*?)<\/a>/)
    if (!titleM) continue
    const title = titleM[1].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&gt;/g, '>').replace(/&lt;/g, '<').trim()
    const hrefM = block.match(/href="([^"]*\/p\/\d+)"/)
    const authorM = block.match(/<a[^>]*class="[^"]*frs-author-name[^"]*"[^>]*>([\s\S]*?)<\/a>/)
    const replyM = block.match(/<span[^>]*class="[^"]*threadlist_reply_num[^"]*"[^>]*>([\s\S]*?)<\/span>/)
    const dateM = block.match(/<div[^>]*class="[^"]*threadlist_date[^"]*"[^>]*>([\s\S]*?)<\/div>/)
    threads.push({
      title,
      author: authorM ? authorM[1].replace(/<[^>]+>/g, '').trim() : '',
      replies: parseReplies(replyM ? replyM[1] : ''),
      date: dateM ? dateM[1].replace(/<[^>]+>/g, '').trim() : '',
      url: hrefM ? 'https://tieba.baidu.com' + hrefM[1] : ''
    })
  }
  return threads
}

function normDate(raw, today) {
  const s = String(raw || '').trim()
  if (!s) return ''
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  if (['今天', '刚刚', '1分钟前'].includes(s)) return iso(today)
  if (s === '昨天') return iso(new Date(today.getTime() - 86400000))
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`
  m = s.match(/^(\d{1,2})-(\d{1,2})$/)
  if (m) return `${today.getFullYear()}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`
  return ''
}

function analyze(threads) {
  const today = new Date()
  const top = [...threads].sort((a, b) => b.replies - a.replies).slice(0, 10)
  const wordCount = {}
  for (const t of threads) {
    for (const w of KEYWORD_DICT) if (t.title.includes(w)) wordCount[w] = (wordCount[w] || 0) + 1
  }
  const keywords = Object.entries(wordCount)
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count || a.word.localeCompare(b.word, 'zh'))
    .slice(0, 15)
  const topicCount = {}
  for (const t of threads) {
    for (const [topic, ws] of Object.entries(TOPIC_KEYWORDS)) {
      if (ws.some((w) => t.title.includes(w))) topicCount[topic] = (topicCount[topic] || 0) + 1
    }
  }
  const topics = Object.entries(topicCount)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
  const dayCount = {}
  for (const t of threads) {
    const d = normDate(t.date, today)
    if (d) dayCount[d] = (dayCount[d] || 0) + 1
  }
  const weekTrend = []
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 86400000)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    weekTrend.push({ label: key.slice(5), count: dayCount[key] || 0 })
  }
  return { topThreads: top, keywords, topics, weekTrend }
}

function utcNow() {
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z').replace('Z', '') + '.000Z'
}

async function main() {
  let threads = []
  for (let p = 0; p < PAGES; p++) {
    threads = threads.concat(parseThreads(await fetchList(p)))
  }
  if (!threads.length) throw new Error('未解析到任何帖子')
  const result = {
    updatedAt: utcNow(),
    status: 'ok',
    source: 'tieba',
    barUrl: BAR_URL,
    total: threads.length,
    pages: PAGES,
    ...analyze(threads)
  }
  fs.mkdirSync(path.dirname(OUT), { recursive: true })
  const tmp = OUT + '.tmp'
  fs.writeFileSync(tmp, JSON.stringify(result), 'utf-8')
  fs.renameSync(tmp, OUT)
  console.log(`tieba ok: ${threads.length} 帖 / ${PAGES} 页 → ${OUT}`)
}

main().catch((err) => {
  console.error(`tieba crawl failed (non-fatal): ${err.message}`)
  process.exit(1)
})
