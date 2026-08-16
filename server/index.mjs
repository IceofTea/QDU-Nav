import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DIST = path.join(__dirname, '..', 'dist')
const PORT = Number(process.env.PORT) || 8787
const execFileP = promisify(execFile)
const PY = process.env.PYTHON || 'python'
const PARSE_PY = process.env.PARSE_PY || path.join(os.tmpdir(), 'qdu_parse_kcb.py')

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'
const JWC = 'https://jwc.qdu.edu.cn'
const XJW = 'https://xjw.qdu.edu.cn/jsxsd'
const JW = 'http://jw.qdu.edu.cn/academic/j_acegi_security_check'
const CHAOXING = 'https://qddx.mh.chaoxing.com/'

const cache = new Map()
const TTL = 5 * 60 * 1000

async function fetchText(url, force) {
  const hit = cache.get(url)
  if (!force && hit && Date.now() - hit.time < TTL) {
    return { text: hit.data, cached: true, ageMs: Date.now() - hit.time }
  }
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 15000)
  const start = Date.now()
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { 'User-Agent': UA } })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const text = await res.text()
    cache.set(url, { time: Date.now(), data: text })
    return { text, cached: false, ageMs: 0, costMs: Date.now() - start }
  } finally {
    clearTimeout(timer)
  }
}

const abs = (p) => (p.startsWith('http') ? p : JWC + '/' + p.replace(/^\//, ''))

function parseList(html, base) {
  const out = []
  const re =
    /<div class="notice_box">\s*<span>(\d{4}-\d{2}-\d{2})<\/span>\s*<a[^>]+href="([^"]+)"[^>]*>([^<]*)<\/a>/g
  let m
  while ((m = re.exec(html))) {
    out.push({ date: m[1], title: m[3].trim(), url: new URL(m[2], base).href })
  }
  return out
}

function parseHomeNotices(html) {
  const out = []
  const re =
    /<div class="list-date01"><strong>(\d+)<\/strong><i>(\d{4})\.(\d{2})<\/i><\/div>[\s\S]*?<a href="([^"]+)"[^>]*>\s*<p>([^<]*)<\/p>/g
  let m
  while ((m = re.exec(html))) {
    out.push({ date: `${m[2]}-${m[3]}-${m[1]}`, title: m[5].trim(), url: abs(m[4]) })
  }
  return out
}

function parseNews(html) {
  const out = []
  const re = /<a href="(info\/[^"]+\.htm)" title="([^"]*)">[\s\S]*?(?:<img src="([^"]+)")?/g
  let m
  while ((m = re.exec(html))) {
    out.push({ title: m[2], url: abs(m[1]), img: m[3] ? JWC + m[3] : null })
  }
  return out
}

function parseNoticeDetail(html) {
  const titleRaw = /<title>([^<]*)<\/title>/.exec(html)?.[1] || ''
  const title = titleRaw.split('-')[0].trim()
  const s = html.indexOf('vsbcontent_start')
  const e = html.indexOf('vsbcontent_end')
  let body = ''
  if (s >= 0 && e > s) body = html.slice(s + 'vsbcontent_start'.length, e)
  body = body
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/\son\w+="[^"]*"/gi, '')
    .replace(/\son\w+='[^']*'/gi, '')
  body = body.replace(/(src|href)="(?!https?:|#|\/)([^"]+)"/g, (_, attr, v) => `${attr}="${abs(v)}"`)
  return { title, body }
}

const nowIso = () => new Date().toISOString()

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

let courseIndex = null
const COURSE_TTL = 12 * 60 * 60 * 1000
const normRoom = (r) => (r || '').replace(/[（(]智慧[)）]/g, '').trim()

async function getCourseIndex(force) {
  if (courseIndex && Date.now() - courseIndex.time < COURSE_TTL && !force) return courseIndex
  const listHtml = (await fetchText(JWC + '/xxgk/kcap.htm', force)).text
  const rows = parseList(listHtml, JWC + '/xxgk/kcap.htm')
  const latest = rows.find((i) => /课程总表/.test(i.title) && /本科/.test(i.title)) || rows.find((i) => /课程总表/.test(i.title))
  if (!latest) throw new Error('未找到课程总表')
  const detailHtml = (await fetchText(latest.url, force)).text
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
  const byRoom = new Map()
  for (const r of parsed.rows) {
    if (!r.r) continue
    const nr = normRoom(r.r)
    if (!byRoom.has(nr)) byRoom.set(nr, [])
    byRoom.get(nr).push(r)
  }
  const semester = (latest.title.match(/青岛大学(\S*?)课程总表/) || [])[1] || latest.title
  courseIndex = { time: Date.now(), semester, count: parsed.count, rows: parsed.rows, byRoom, latestUrl: latest.url }
  return courseIndex
}

const PERIOD_MAX = 12

const routes = {
  async '/api/health'() {
    return { ok: true, time: nowIso() }
  },
  async '/api/notices'(q) {
    const force = q.get('force') === '1'
    const all = q.get('all') === '1'
    if (all) {
      const { text, cached, ageMs, costMs } = await fetchText(JWC + '/jwtz.htm', force)
      return { source: JWC, fetchedAt: nowIso(), cached, ageMs, costMs, ttl: TTL, items: parseList(text, JWC + '/jwtz.htm') }
    }
    const { text, cached, ageMs, costMs } = await fetchText(JWC + '/index.htm', force)
    return { source: JWC, fetchedAt: nowIso(), cached, ageMs, costMs, ttl: TTL, items: parseHomeNotices(text) }
  },
  async '/api/news'(q) {
    const force = q.get('force') === '1'
    const { text, cached, ageMs, costMs } = await fetchText(JWC + '/index.htm', force)
    return { source: JWC, fetchedAt: nowIso(), cached, ageMs, costMs, ttl: TTL, items: parseNews(text) }
  },
  async '/api/calendar'(q) {
    const force = q.get('force') === '1'
    const { text, cached, ageMs, costMs } = await fetchText(JWC + '/xl.htm', force)
    return { source: JWC, fetchedAt: nowIso(), cached, ageMs, costMs, ttl: TTL, items: parseList(text, JWC + '/xl.htm') }
  },
  async '/api/courses'(q) {
    const force = q.get('force') === '1'
    const { text, cached, ageMs, costMs } = await fetchText(JWC + '/xxgk/kcap.htm', force)
    return { source: JWC, fetchedAt: nowIso(), cached, ageMs, costMs, ttl: TTL, items: parseList(text, JWC + '/xxgk/kcap.htm') }
  },
  async '/api/notice'(q) {
    const id = q.get('id')
    const force = q.get('force') === '1'
    if (!id || !/^\d+$/.test(id)) return { ok: false, error: 'need valid id' }
    const url = JWC + `/info/1009/${id}.htm`
    const { text, cached, ageMs, costMs } = await fetchText(url, force)
    return { source: JWC, sourceUrl: url, fetchedAt: nowIso(), cached, ageMs, costMs, ttl: TTL, ...parseNoticeDetail(text) }
  },
  async '/api/systems'() {
    return {
      items: [
        { name: '新教务综合系统', url: XJW, desc: '选课 / 成绩 / 课表（推荐）' },
        { name: '教务管理信息系统', url: JW, desc: '原教务系统入口' },
        { name: '云教学平台', url: CHAOXING, desc: '在线课程与教学' }
      ]
    }
  },
  async '/api/courseTable'(q) {
    const force = q.get('force') === '1'
    const idx = await getCourseIndex(force)
    return {
      semester: idx.semester,
      count: idx.count,
      rooms: idx.byRoom.size,
      updatedAt: new Date(idx.time).toISOString(),
      cached: Date.now() - idx.time < COURSE_TTL,
      latestUrl: idx.latestUrl
    }
  },
  async '/api/roomSchedule'(q) {
    const force = q.get('force') === '1'
    const room = normRoom(q.get('room') || '')
    if (!room) return { ok: false, error: 'need room' }
    const idx = await getCourseIndex(force)
    const list = idx.byRoom.get(room) || []
    list.sort((a, b) => a.d - b.d || a.s - b.s)
    return { semester: idx.semester, room, count: list.length, schedule: list }
  },
  async '/api/emptyRooms'(q) {
    const force = q.get('force') === '1'
    const day = Number(q.get('day'))
    const period = Number(q.get('period'))
    const kw = (q.get('kw') || '').trim()
    if (!day || day < 1 || day > 7 || !period || period < 1 || period > PERIOD_MAX)
      return { ok: false, error: 'need day(1-7) and period(1-12)' }
    const idx = await getCourseIndex(force)
    const busy = new Set()
    for (const [room, list] of idx.byRoom) {
      if (list.some((r) => r.d === day && period >= r.s && period <= r.e)) busy.add(room)
    }
    let all = [...idx.byRoom.keys()]
    if (kw) all = all.filter((r) => r.includes(kw))
    const empty = all.filter((r) => !busy.has(r)).sort()
    return { semester: idx.semester, day, period, total: all.length, emptyCount: empty.length, rooms: empty }
  },
  async '/api/courseQuery'(q) {
    const force = q.get('force') === '1'
    const kw = (q.get('q') || '').trim()
    if (!kw) return { ok: false, error: 'need q' }
    const idx = await getCourseIndex(force)
    const hits = idx.rows.filter((r) => r.cls.includes(kw) || r.c.includes(kw) || r.t.includes(kw))
    return { semester: idx.semester, q: kw, count: hits.length, rows: hits.slice(0, 200) }
  },
  // 食堂空座率：框架端点。当前返回官方食堂名单与营业时间；
  // 待食堂摄像头实时数据接入后，在此处解析实时「在座人数」并写入 people 字段。
  async '/api/canteen'() {
    return {
      status: '实时人数待接入摄像头数据',
      updatedAt: null,
      source: '青岛大学后勤管理处「饮食服务」栏目'
    }
  }
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
  '.woff2': 'font/woff2'
}

function serveStatic(req, res, urlPath) {
  const file = path.join(DIST, urlPath === '/' ? 'index.html' : urlPath)
  if (!file.startsWith(DIST)) {
    res.writeHead(403)
    return res.end()
  }
  fs.readFile(file, (err, data) => {
    if (err) {
      fs.readFile(path.join(DIST, 'index.html'), (err2, html) => {
        if (err2) {
          res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
          return res.end('Not Found（请先 npm run build）')
        }
        res.writeHead(200, { 'Content-Type': MIME['.html'] })
        res.end(html)
      })
      return
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream' })
    res.end(data)
  })
}

function json(res, status, obj) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(obj))
}

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://localhost')
  const urlPath = u.pathname
  if (urlPath.startsWith('/api/')) {
    const handler = routes[urlPath]
    if (handler) {
      try {
        json(res, 200, await handler(u.searchParams))
      } catch (e) {
        console.error(`[qdu-nav] /api 错误 ${urlPath}:`, e.message)
        json(res, 502, { ok: false, error: e.message })
      }
      return
    }
    return json(res, 404, { ok: false, error: 'not found' })
  }
  serveStatic(req, res, urlPath)
})

server.listen(PORT, () => {
  console.log(`[qdu-nav] 服务已启动：http://localhost:${PORT}`)
  console.log(`[qdu-nav] API 网关：${JWC} / ${XJW}`)
})