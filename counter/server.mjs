// QDU-Nav 独立访问计数服务（Node 无依赖，单文件）
// -----------------------------------------------------------------------------
// 目的：给 QDU 校园导航一个完全独立于 QDU-Wiki 的「独立访客 / 累计访问」计数。
//       不依赖 Vercount / 不蒜子等第三方（它们同域名下无法为两个站点分开记 UV）。
//
// 端点：
//   GET /api/stats   查询 { uv, pv }（不计数）
//   GET /api/hit     本次访问 +1 PV；新访客（无 UV Cookie）+1 UV，返回 { uv, pv }
//   GET /            探活文本
//
// 部署（免费，约 3 分钟）：
//   1) Render：render.com 新建 Web Service → 连接本仓库 → Root Directory 填 `counter`
//      → Build 留空 → Start Command 填 `node server.mjs` → 环境变量 PORT 可省
//   2) 或任意支持磁盘持久化的 Node 平台（Glitch / Fly.io 等），启动 `node server.mjs`
//   3) 部署后把地址填到 `src/config/site.js` 的 `SITE.counter.api`
//
// 数据：内存 + 异步落盘 `counter/data.json`（磁盘持久化，重启不丢）。
import http from 'node:http'
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_FILE = process.env.DATA_FILE || path.join(__dirname, 'data.json')
const PORT = Number(process.env.PORT) || 8788
const UV_COOKIE = 'qdu_nav_uv'
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*'

let state = { uv: 0, pv: 0 }
let saving = false

async function load() {
  try {
    const raw = await readFile(DATA_FILE, 'utf8')
    const d = JSON.parse(raw)
    state = { uv: Number(d.uv) || 0, pv: Number(d.pv) || 0 }
  } catch {
    state = { uv: 0, pv: 0 }
  }
}

async function save() {
  if (saving) return
  saving = true
  try {
    await writeFile(DATA_FILE, JSON.stringify(state), 'utf8')
  } catch {
    /* 磁盘不可写时忽略（内存计数仍可用） */
  } finally {
    saving = false
  }
}

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', CORS_ORIGIN)
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    return res.end()
  }

  const u = new URL(req.url, 'http://localhost')
  if (u.pathname === '/api/hit' || u.pathname === '/api/stats') {
    const hit = u.pathname === '/api/hit'
    if (hit) {
      state.pv++
      // UV 去重由前端 localStorage + isNewUv 参数完成（跨域第三方 Cookie 可能被拦截）
      if (u.searchParams.get('isNewUv') !== '0') {
        state.uv++
        res.setHeader('Set-Cookie', `${UV_COOKIE}=1; Path=/; Max-Age=31536000; SameSite=Lax`)
      }
      // 节流落盘
      setTimeout(save, 400)
    }
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ uv: state.uv, pv: state.pv }))
  } else {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end('QDU-Nav counter ok')
  }
})

load().then(() => {
  server.listen(PORT, () => console.log('QDU-Nav counter listening on :' + PORT))
})
