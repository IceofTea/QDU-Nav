// QDU-Nav 独立访问计数服务（Deno Deploy 版）
// -----------------------------------------------------------------------------
// 给 QDU 校园导航一个完全独立于 QDU-Wiki 的「独立访客 / 累计访问」计数。
// 不依赖 Vercount / 不蒜子（实测 Vercount 无页面级 UV，同域下两站无法分开记 UV）。
//
// 端点：
//   GET /api/hit?isNewUv=1|0   本次访问 PV+1；isNewUv=1 时 UV+1，返回 { uv, pv }
//   GET /api/stats             查询 { uv, pv }（不计数）
//   GET /                      探活文本
//
// 跨域说明：前端（GitHub Pages）跨域请求本服务时，响应 Set-Cookie 属于第三方
// Cookie，现代浏览器可能拦截，故 UV 去重改由前端 localStorage + isNewUv 参数完成。
//
// 部署（免费、无需绑卡）：
//   1) 打开 https://dash.deno.com  → Sign in with GitHub
//   2) New Project → 连接本仓库（授予 QDU-Nav 仓库权限）
//   3) 入口文件 Main Entrypoint 填：counter/server.ts
//   4) 点 Deploy，等构建完成后复制生成的 https://xxx.deno.dev 地址
//   5) 把该地址填入 src/config/site.js 的 SITE.counter.api，重新推送即生效
// 说明：Deno Deploy 免费额度含 KV 持久存储（数据重启不丢）。

const KEY = ['counter']
const kv = await Deno.openKv()

interface State {
  uv: number
  pv: number
}

async function getState(): Promise<State> {
  const r = await kv.get<State>(KEY)
  return r.value ?? { uv: 0, pv: 0 }
}

Deno.serve(async (req) => {
  const headers = new Headers()
  headers.set('Access-Control-Allow-Origin', req.headers.get('Origin') || '*')
  headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS')
  headers.set('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers })
  }

  const u = new URL(req.url)
  if (u.pathname === '/api/hit' || u.pathname === '/api/stats') {
    const hit = u.pathname === '/api/hit'
    const state = await getState()
    if (hit) {
      state.pv++
      if (u.searchParams.get('isNewUv') !== '0') {
        state.uv++
      }
      await kv.set(KEY, state)
    }
    headers.set('Content-Type', 'application/json')
    return new Response(JSON.stringify({ uv: state.uv, pv: state.pv }), { headers })
  }

  headers.set('Content-Type', 'text/plain; charset=utf-8')
  return new Response('QDU-Nav counter ok', { headers })
})