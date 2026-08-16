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

const normRoom = (r) => (r || '').replace(/[（(]智慧[)）]/g, '').trim()

async function getCourse() {
  const listHtml = (await fetchText(JWC + '/xxgk/kcap.htm')).text
  const rows = parseList(listHtml, JWC + '/xxgk/kcap.htm')
  const latest = rows.find((i) => /课程总表/.test(i.title) && /本科/.test(i.title)) || rows.find((i) => /课程总表/.test(i.title))
  if (!latest) throw new Error('未找到课程总表')
  const detailHtml = (await fetchText(latest.url)).text
  const dl = /href="([^"]*download\.jsp[^"]*)"/.exec(detailHtml)?.[1]
  if (!dl) throw new Error('未找到附件下载地址')
  const dlUrl = new URL(dl, latest.url).href
  const buf = await fetchBuf(dlUrl, latest.url)
  const tmp = path.join(os.tmpdir(), `kcb_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.xlsx`)
  fs.writeFileSync(tmp, buf)
  let parsed
  try {
    const { stdout } = await execFileP(PY, [PARSE_PY, tmp], { maxBuffer: 64 * 1024 * 1024 })
    parsed = JSON.parse(stdout)
  } finally {
    fs.rmSync(tmp, { force: true })
  }
  const rooms = new Set(parsed.rows.map((r) => r.r && normRoom(r.r)).filter(Boolean)).size
  const semester = (latest.title.match(/青岛大学(\S*?)课程总表/) || [])[1] || latest.title
  return { semester, count: parsed.count, rooms, rows: parsed.rows, latestUrl: latest.url }
}

const [courses, notices, calendar, course] = await Promise.all([
  fetchText(JWC + '/xxgk/kcap.htm').then(({ text }) => ({ items: parseList(text, JWC + '/xxgk/kcap.htm') })),
  fetchText(JWC + '/index.htm').then(({ text }) => ({ items: parseHomeNotices(text) })),
  fetchText(JWC + '/xl.htm').then(({ text }) => ({ items: parseList(text, JWC + '/xl.htm') })),
  getCourse()
])

const snap = {
  updatedAt: new Date().toISOString(),
  source: JWC,
  courses,
  notices,
  calendar,
  courseTable: {
    semester: course.semester,
    count: course.count,
    rooms: course.rooms,
    updatedAt: new Date().toISOString(),
    cached: true,
    latestUrl: course.latestUrl
  },
  rows: course.rows
}

const outDir = path.join(__dirname, '..', 'public', 'data')
fs.mkdirSync(outDir, { recursive: true })
const outFile = path.join(outDir, 'snapshot.json')
fs.writeFileSync(outFile, JSON.stringify(snap))
console.log(`snapshot written: ${outFile}`)
console.log(`courseTable: ${snap.courseTable.semester} / ${snap.courseTable.count} 条 / ${snap.courseTable.rooms} 教室`)
console.log(`courses ${snap.courses.items.length} / notices ${snap.notices.items.length} / calendar ${snap.calendar.items.length}`)
console.log(`size: ${(fs.statSync(outFile).size / 1024).toFixed(1)} KB`)