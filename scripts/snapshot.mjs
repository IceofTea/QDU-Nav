// 生成静态数据快照 public/data/snapshot.json
// 供 GitHub Pages 等纯静态托管使用：前端 apiFetch 请求网关失败时回退到本快照。
// 运行：node scripts/snapshot.mjs
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const execFileP = promisify(execFile)
const PY = process.env.PYTHON || 'python'
const PARSE_PY = process.env.PARSE_PY || path.join(__dirname, '..', 'server', 'parse_kcb.py')
const JWC = 'https://jwc.qdu.edu.cn'
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'

const abs = (p) => (p.startsWith('http') ? p : JWC + '/' + p.replace(/^\//, ''))

async function fetchText(url) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 15000)
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { 'User-Agent': UA } })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return { text: await res.text() }
  } finally {
    clearTimeout(timer)
  }
}

async function fetchBuf(url, referer) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 30000)
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { 'User-Agent': UA, referer } })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return Buffer.from(await res.arrayBuffer())
  } finally {
    clearTimeout(timer)
  }
}

function parseList(html, base) {
  const out = []
  const re = /<div class="notice_box">\s*<span>(\d{4}-\d{2}-\d{2})<\/span>\s*<a[^>]+href="([^"]+)"[^>]*>([^<]*)<\/a>/g
  let m
  while ((m = re.exec(html))) out.push({ date: m[1], title: m[3].trim(), url: new URL(m[2], base).href })
  return out
}

function parseHomeNotices(html) {
  const out = []
  const re = /<div class="list-date01"><strong>(\d+)<\/strong><i>(\d{4})\.(\d{2})<\/i><\/div>[\s\S]*?<a href="([^"]+)"[^>]*>\s*<p>([^<]*)<\/p>/g
  let m
  while ((m = re.exec(html))) out.push({ date: `${m[2]}-${m[3]}-${m[1]}`, title: m[5].trim(), url: abs(m[4]) })
  return out
}

function parseNews(html) {
  const out = []
  const re = /<a href="(info\/[^"]+\.htm)" title="([^"]*)">[\s\S]*?(?:<img src="([^"]+)")?/g
  let m
  while ((m = re.exec(html))) out.push({ title: m[2], url: abs(m[1]), img: m[3] ? JWC + m[3] : null })
  return out
}

const normRoom = (r) => (r || '').replace(/[（(]智慧[)）]/g, '').trim()

async function getCourses() {
  const listHtml = (await fetchText(JWC + '/xxgk/kcap.htm')).text
  const rows = parseList(listHtml, JWC + '/xxgk/kcap.htm')
  const items = rows.filter((i) => /课程总表/.test(i.title)).slice(0, 8)
  if (!items.length) throw new Error('未找到课程总表')
  const results = []
  for (const it of items) {
    const semester = (it.title.match(/青岛大学(\S*?)课程总表/) || [])[1] || it.title
    try {
      const detailHtml = (await fetchText(it.url)).text
      const dl = /href="([^"]*download\.jsp[^"]*)"/.exec(detailHtml)?.[1]
      if (!dl) {
        console.warn(`skip ${it.title}: 无附件`)
        continue
      }
      const dlUrl = new URL(dl, it.url).href
      const buf = await fetchBuf(dlUrl, it.url)
      const tmp = path.join(os.tmpdir(), `kcb_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.xlsx`)
      fs.writeFileSync(tmp, buf)
      let parsed
      try {
        const { stdout } = await execFileP(PY, [PARSE_PY, tmp], { maxBuffer: 64 * 1024 * 1024 })
        parsed = JSON.parse(stdout)
      } finally {
        fs.rmSync(tmp, { force: true })
      }
      results.push({ semester, title: it.title, count: parsed.count, url: it.url, rows: parsed.rows })
      console.log(`  ${it.title}: ${parsed.count} 条`)
    } catch (e) {
      console.warn(`skip ${it.title}: ${e.message}`)
    }
  }
  if (!results.length) throw new Error('未抓到任何课程总表')
  return results
}

const [courses, notices, news, calendar, courseTables] = await Promise.all([
  fetchText(JWC + '/xxgk/kcap.htm').then(({ text }) => ({ items: parseList(text, JWC + '/xxgk/kcap.htm') })),
  fetchText(JWC + '/index.htm').then(({ text }) => ({ items: parseHomeNotices(text) })),
  fetchText(JWC + '/index.htm').then(({ text }) => ({ items: parseNews(text) })),
  fetchText(JWC + '/xl.htm').then(({ text }) => ({ items: parseList(text, JWC + '/xl.htm') })),
  getCourses()
])

const latest = courseTables[0]
const mergedRows = []
for (const t of courseTables) {
  const term = t.semester
  for (const row of t.rows) {
    mergedRows.push({ c: row.c, t: row.t, cls: row.cls, d: row.d, s: row.s, e: row.e, w: row.w, r: row.r, term })
  }
}
const allRooms = new Set(mergedRows.map((r) => r.r && normRoom(r.r)).filter(Boolean)).size

const snap = {
  updatedAt: new Date().toISOString(),
  source: JWC,
  courses,
  notices,
  news,
  calendar,
  courseTables: courseTables.map((t) => ({ semester: t.semester, title: t.title, count: t.count, url: t.url })),
  courseTable: {
    semester: latest.semester,
    count: latest.count,
    rooms: allRooms,
    updatedAt: new Date().toISOString(),
    cached: true,
    latestUrl: latest.url
  },
  rows: mergedRows
}

const outDir = path.join(__dirname, '..', 'public', 'data')
fs.mkdirSync(outDir, { recursive: true })
const outFile = path.join(outDir, 'snapshot.json')
fs.writeFileSync(outFile, JSON.stringify(snap))
console.log(`snapshot written: ${outFile}`)
console.log(`courseTable: ${snap.courseTable.semester} / ${snap.courseTable.count} 条 / ${snap.courseTable.rooms} 教室（${snap.courseTables.length} 个学期并集）`)
console.log(`courses ${snap.courses.items.length} / notices ${snap.notices.items.length} / news ${snap.news.items.length} / calendar ${snap.calendar.items.length}`)
console.log(`size: ${(fs.statSync(outFile).size / 1024).toFixed(1)} KB`)