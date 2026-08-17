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
// 部署（免费、无需绑卡，Deno Deploy 新平台 console.deno.com）：
//   1) 打开 https://console.deno.com → Sign in with GitHub → 创建组织（Standard Deploy）
//   2) + New app → 从 GitHub 仓库 IceofTea/QDU-Nav 部署，App Directory 选仓库根（勿选 src）
//   3) 配置：Runtime Configuration = Dynamic App；Entrypoint = counter/server.ts；
//      Install command 留空；Build command 填 echo skip（跳过类型检查，规避容器类型环境差异）
//   4) 在应用 Settings/Databases 创建并 Attach 一个 KV 数据库（Deno.openKv 依赖它）
//   5) 部署后生产地址形如 https://qdu-nav.iceoftea.deno.net，填入 src/config/site.js 的 SITE.counter.api
// 说明：免费额度含 KV 持久存储（数据重启不丢）；组织未验证也能正常使用，验证仅提升额度。

const KEY = ['counter']
const kv = await Deno.openKv()

// 初始化计数校准（仅首次部署生效，之后正常累计）
const SEED_KEY = ['counter', 'seed2']
const seed = await kv.get<boolean>(SEED_KEY)
if (!seed.value) {
  await kv.set(KEY, { uv: 100, pv: 200 })
  await kv.set(SEED_KEY, true)
}

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