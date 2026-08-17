// QDU-Nav 独立访问计数服务（Node 无依赖 · 多维统计，本地联调版）
// 与 Deno 版 server.ts 逻辑一致：按日期/小时/星期/设备/系统/来源/应用自动累计。
// 数据：内存 + 异步落盘 `counter/data.json`。
import http from 'node:http'
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_FILE = process.env.DATA_FILE || path.join(__dirname, 'data.json')
const PORT = Number(process.env.PORT) || 8788
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*'

const empty = () => ({ uv: 0, pv: 0, byDay: {}, byHour: {}, byWeekday: {}, byDevice: {}, byOs: {}, byRef: {}, byApp: {} })
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
  const toArr = (obj) => Object.entries(obj).map(([name, v]) => ({ name, v })).sort((a, b) => b.v - a.v)
  return {
    uv: state.uv, pv: state.pv,
    today: { date: todayKey, ...today },
    week, hours, weekdays,
    devices: toArr(state.byDevice), os: toArr(state.byOs), refs: toArr(state.byRef), apps: toArr(state.byApp)
  }
}

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', CORS_ORIGIN)
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end() }

  const u = new URL(req.url, 'http://localhost')
  if (u.pathname === '/api/hit' || u.pathname === '/api/stats') {
    const hit = u.pathname === '/api/hit'
    if (hit) {
      const isNew = u.searchParams.get('isNewUv') !== '0'
      state.pv++
      if (isNew) state.uv++
      const now = cnNow()
      const dk = dayKey(now)
      const day = state.byDay[dk] || { pv: 0, uv: 0 }
      day.pv++
      if (isNew) day.uv++
      state.byDay[dk] = day
      bump(state.byHour, String(now.getHours()))
      bump(state.byWeekday, String(now.getDay()))
      bump(state.byDevice, parseDevice(req.headers['user-agent'] || ''))
      bump(state.byOs, parseOs(req.headers['user-agent'] || ''))
      bump(state.byRef, parseRef(req.headers.referer || ''))
      const app = u.searchParams.get('app')
      if (app) bump(state.byApp, app)
      setTimeout(save, 400)
    }
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify(overview()))
  } else {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end('QDU-Nav counter ok')
  }
})

load().then(() => {
  server.listen(PORT, () => console.log('QDU-Nav counter listening on :' + PORT))
})