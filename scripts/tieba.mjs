// 青岛大学吧舆情分析（Node 版，crawler/tieba.py 的回退实现）
// 与 Python 版保持同一抓取方案：手机版 mo/q/threadlist 接口 + 移动 UA 池，
// 解析 tl_shadow 条目结构，输出 public/data/tieba_stats.json。
// 任何失败都不覆盖上一次的成功数据（尽力而为），失败时以非零码退出。
// 运行：node scripts/tieba.mjs
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.join(__dirname, '..', 'public', 'data', 'tieba_stats.json')
const BAR_NAME = '青岛大学'
const BAR_URL = 'https://tieba.baidu.com/f?kw=' + encodeURIComponent(BAR_NAME)
const LIST_URL = 'https://tieba.baidu.com/mo/q/threadlist?kw=' + encodeURIComponent(BAR_NAME) + '&pn=%d'
const PAGES = 4
const PAGE_SIZE = 30
const RETRIES = 3

// 手机版接口走 iPhone / Android 移动 UA（桌面版 UA 会被 WAF 拦成 403）
const UA_POOL = [
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
  'Mozilla/5.0 (Linux; Android 12; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Mobile Safari/537.36'
]
const BAIDUID = crypto.randomBytes(16).toString('hex')

const TOPIC_KEYWORDS = {
  考研升学: ['考研', '复试', '保研', '上岸', '调剂', '初试', '分数线', '研招'],
  校园生活: ['食堂', '宿舍', '澡堂', '快递', '外卖', '热水', '空调', '电费', '超市', '洗衣'],
  学习考试: ['期末', '考试', '挂科', '绩点', '选课', '图书馆', '自习', '成绩', '四六级', '教材'],
  校园事务: ['转专业', '军训', '社团', '迎新', '报到', '评优', '奖学金', '助学金', '退学', '休学'],
  就业实习: ['实习', '招聘', '秋招', '春招', '就业', 'offer', '考公', '兼职'],
  吐槽求助: ['吐槽', '求助', '求问', '无语', '离谱', '难受', '崩溃', '郁闷', '踩坑']
}
const KEYWORD_DICT = [...new Set(Object.values(TOPIC_KEYWORDS).flat())].sort((a, b) => b.length - a.length)

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const rand = (lo, hi) => lo + Math.random() * (hi - lo)

async function fetchListHtml(pageIndex) {
  const url = LIST_URL.replace('%d', pageIndex * PAGE_SIZE)
  let lastErr = null
  for (let attempt = 0; attempt < RETRIES; attempt++) {
    try {
      await sleep(rand(600, 1800))
      const res = await fetch(url, {
        headers: {
          'User-Agent': UA_POOL[Math.floor(Math.random() * UA_POOL.length)],
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'zh-CN,zh;q=0.9',
          'Referer': BAR_URL,
          'Cookie': `BAIDUID=${BAIDUID}`
        },
        signal: AbortSignal.timeout(20000)
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const text = await res.text()
      if (text.length < 5000 || !text.includes('j_common ti_item')) {
        throw new Error('页面无帖子列表（疑似被反爬拦截）')
      }
      return text
    } catch (err) {
      lastErr = err
      await sleep(1500 * (attempt + 1))
    }
  }
  throw new Error('贴吧抓取失败: ' + (lastErr && lastErr.message))
}

// 手机版 threadlist：置顶帖 tl_top / 普通帖 tl_shadow，tid 在 li 上
const THREAD_LI_RE = /<li class="(?:tl_shadow[^"]*|tl_top[^"]*)"[^>]*data-tid="(\d+)"[^>]*>([\s\S]*?)<\/li>/g

function spanText(block, cls) {
  const m = block.match(new RegExp(`class="${cls}">\\s*([^<]{1,200}?)\\s*<`))
  return m ? m[1].trim() : ''
}

function parseThreads(html) {
  const threads = []
  let m
  while ((m = THREAD_LI_RE.exec(html || ''))) {
    const tid = m[1]
    const block = m[2]
    let title = ''
    const tm = block.match(/class="ti_title"[^>]*>([\s\S]*?)<\/div>/)
    if (tm) {
      title = [...tm[1].matchAll(/<span(?![^>]*class=)[^>]*>\s*([^<]{1,200}?)\s*<\/span>/g)].map((x) => x[1]).join('').trim()
    }
    if (!title) continue
    const repliesM = block.match(/btn_reply[^>]*>[\s\S]*?<span[^>]*>\s*(\d+)\s*<\/span>/)
    threads.push({
      title,
      author: spanText(block, 'ti_author'),
      replies: repliesM ? parseInt(repliesM[1], 10) : 0,
      date: spanText(block, 'ti_time'),
      url: 'https://tieba.baidu.com/p/' + tid
    })
  }
  return threads
}

const pad = (n) => String(n).padStart(2, '0')
function normDate(raw, today) {
  const s = String(raw || '').trim()
  if (!s) return ''
  const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  if (s === '今天' || s === '刚刚' || s === '1分钟前' || /^\d{1,2}:\d{2}$/.test(s)) return iso(today)
  if (s === '昨天') return iso(new Date(today.getTime() - 86400000))
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (m) return `${m[1]}-${pad(+m[2])}-${pad(+m[3])}`
  m = s.match(/^(\d{1,2})-(\d{1,2})$/)
  if (m) return `${today.getFullYear()}-${pad(+m[1])}-${pad(+m[2])}`
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
    const key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
    weekTrend.push({ label: key.slice(5), count: dayCount[key] || 0 })
  }
  return { topThreads: top, keywords, topics, weekTrend }
}

async function main() {
  let threads = []
  for (let p = 0; p < PAGES; p++) {
    threads = threads.concat(parseThreads(await fetchListHtml(p)))
  }
  if (!threads.length) throw new Error('未解析到任何帖子')
  const result = {
    updatedAt: new Date().toISOString(),
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