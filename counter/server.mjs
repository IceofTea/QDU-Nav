// QDU-Nav 独立访问计数服务（Node 无依赖 · 多维统计，本地联调版）
// 与 Deno 版 server.ts 逻辑一致：按日期/小时/星期/设备/系统/来源/应用自动累计。
// UV 优先按前端匿名访客 ID（vid）去重，缺失时回退「IP + UA」指纹（内存 Map 定期清理）。
// 数据：内存 + 异步落盘 `counter/data.json`；一次性校准标记存 `counter/.seed3`。
import http from 'node:http'
import { readFile, writeFile } from 'node:fs/promises'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_FILE = process.env.DATA_FILE || path.join(__dirname, 'data.json')
const PORT = Number(process.env.PORT) || 8788
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*'
const SEED_FILE = path.join(__dirname, '.seed3')

const empty = () => ({ uv: 0, pv: 0, byDay: {}, byHour: {}, byWeekday: {}, byDevice: {}, byOs: {}, byRef: {}, byApp: {}, byAppLikes: {}, liked: {} })
let state = empty()
let saving = false

async function load() {
  try {
    const d = JSON.parse(await readFile(DATA_FILE, 'utf8'))
    state = { ...empty(), ...d }
  } catch {
    state = empty()
  }
}
async function seedOnce() {
  if (fs.existsSync(SEED_FILE)) return
  // 一次性初始校准（历史痕迹，保留勿删）：某次本地数据误删后手动恢复，
  // 按「独立访客 150 / 累计访问 260」为起点调试。只补顶层 uv/pv，
  // 未同步 byDay/byHour/byRef/byDevice 等维度明细，故累计 UV/PV 会大于
  // 维度加总——已知口径差异，属历史遗留，不影响后续继续累加。
  state.uv = 150
  state.pv = 260
  await save()
  try {
    fs.writeFileSync(SEED_FILE, '1', 'utf-8')
  } catch {
    /* 磁盘不可写时下次再校准 */
  }
}
async function save() {
  if (saving) return
  saving = true
  try {
    await writeFile(DATA_FILE, JSON.stringify(state), 'utf8')
  } catch {
    /* 磁盘不可写时忽略 */
  } finally {
    saving = false
  }
}

const pad = (n) => String(n).padStart(2, '0')
const cnNow = () => new Date(Date.now() + 8 * 3600 * 1000)
const dayKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const bump = (obj, k) => { obj[k] = (obj[k] || 0) + 1 }
const parseDevice = (ua) => (/iPad|Tablet|PlayBook/i.test(ua) ? '平板' : /Mobile|Android|iPhone|iOS/i.test(ua) ? '手机' : '桌面')
const parseOs = (ua) => (/Android/i.test(ua) ? 'Android' : /iPhone|iPad|iOS/i.test(ua) ? 'iOS' : /Windows/i.test(ua) ? 'Windows' : /Mac OS X|Macintosh/i.test(ua) ? 'macOS' : /Linux/i.test(ua) ? 'Linux' : '其他')
const parseRef = (ref) => {
  if (!ref) return '直接访问'
  if (/github\.io|github\.com/i.test(ref)) return 'GitHub'
  if (/baidu|google|bing|sogou|sm\.cn|so\.com/i.test(ref)) return '搜索引擎'
  if (/tieba|zhihu|weibo|xiaohongshu|douyin|bilibili/i.test(ref)) return '社交平台'
  return '其他外链'
}
/* UV 去重：按「IP + UA」指纹（Map 存最后命中时间，定期清理防长期运行无限增长） */
const visitedUv = new Map()
const visitedDayUv = new Map()
const UV_TTL = 30 * 24 * 3600 * 1000
const DAY_UV_TTL = 3 * 24 * 3600 * 1000
function pruneUv() {
  const now = Date.now()
  for (const [k, ts] of visitedUv) if (now - ts > UV_TTL) visitedUv.delete(k)
  for (const [k, ts] of visitedDayUv) if (now - ts > DAY_UV_TTL) visitedDayUv.delete(k)
}

function overview() {
  const todayKey = dayKey(cnNow())
  const today = state.byDay[todayKey] || { pv: 0, uv: 0 }
  const week = []
  for (let i = 6; i >= 0; i--) {
    const d = cnNow(); d.setDate(d.getDate() - i)
    const k = dayKey(d)
    const v = state.byDay[k] || { pv: 0, uv: 0 }
    week.push({ label: k.slice(5), pv: v.pv, uv: v.uv })
  }
  const hours = Array.from({ length: 24 }, (_, i) => ({ label: i + '点', v: state.byHour[String(i)] || 0 }))
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'].map((n, i) => ({ label: n, v: state.byWeekday[String(i)] || 0 }))
  return {
    uv: state.uv, pv: state.pv,
    today: { date: todayKey, ...today },
    week, hours, weekdays,
    devices: toArr(state.byDevice), os: toArr(state.byOs), refs: toArr(state.byRef), apps: toArr(state.byApp),
    likes: toArr(state.byAppLikes)
  }
}
const toArr = (obj) => Object.entries(obj || {}).map(([name, v]) => ({ name, v })).sort((a, b) => b.v - a.v)

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', CORS_ORIGIN)
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end() }

  const u = new URL(req.url, 'http://localhost')
  if (u.pathname === '/api/like') {
    const app = (u.searchParams.get('app') || '').trim()
    const vid = (u.searchParams.get('vid') || '').trim()
    const on = u.searchParams.get('on') === '1'
    if (app && vid) {
      const lk = app + '|' + vid
      const liked = !!state.liked[lk]
      if (on && !liked) {
        state.byAppLikes[app] = (state.byAppLikes[app] || 0) + 1
        state.liked[lk] = 1
      } else if (!on && liked) {
        state.byAppLikes[app] = Math.max(0, (state.byAppLikes[app] || 0) - 1)
        delete state.liked[lk]
      }
      setTimeout(save, 400)
    }
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ app, likes: state.byAppLikes[app] || 0, liked: on }))
    return
  }
  if (u.pathname === '/api/likes') {
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ likes: toArr(state.byAppLikes) }))
    return
  }
  if (u.pathname === '/api/hit' || u.pathname === '/api/stats') {
    const hit = u.pathname === '/api/hit'
    if (hit) {
      state.pv++
      const now = cnNow()
      const dk = dayKey(now)
      const day = state.byDay[dk] || { pv: 0, uv: 0 }
      day.pv++
      // UV 优先按前端匿名访客 ID（vid）去重，缺失时回退「IP + UA」指纹
      const vid = (u.searchParams.get('vid') || '').trim()
      const fwd = req.headers['x-forwarded-for'] || ''
      const ip = (fwd.split(',')[0] || req.headers['x-real-ip'] || '').trim()
      const fingerprint = vid || ((ip + '|' + (req.headers['user-agent'] || '')).trim())
      if (fingerprint) {
        const ts = Date.now()
        if (!visitedUv.has(fingerprint)) { state.uv++; visitedUv.set(fingerprint, ts) }
        const dkHash = dk + '|' + fingerprint
        if (!visitedDayUv.has(dkHash)) { day.uv++; visitedDayUv.set(dkHash, ts) }
        pruneUv()
      }
      state.byDay[dk] = day
      bump(state.byHour, String(now.getHours()))
      bump(state.byWeekday, String(now.getDay()))
      bump(state.byDevice, parseDevice(req.headers['user-agent'] || ''))
      bump(state.byOs, parseOs(req.headers['user-agent'] || ''))
      bump(state.byRef, parseRef(req.headers.referer || ''))
      const app = u.searchParams.get('app')
      if (app) bump(state.byApp, app)
      // 控制对象体积：只保留近 120 天明细
      const cutoff = dayKey(new Date(cnNow().getTime() - 120 * 86400000))
      for (const k of Object.keys(state.byDay)) if (k < cutoff) delete state.byDay[k]
      setTimeout(save, 400)
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ ok: 1, uv: state.uv, pv: state.pv, today: { date: dk, ...day } }))
      return
    }
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify(overview()))
  } else {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end('QDU-Nav counter ok')
  }
})

load().then(() => {
  seedOnce().then(() => {
    server.listen(PORT, () => console.log('QDU-Nav counter listening on :' + PORT))
  })
})