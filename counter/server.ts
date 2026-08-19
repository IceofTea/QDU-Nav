// QDU-Nav 独立访问计数服务（Deno Deploy 版 · 多维统计）
// -----------------------------------------------------------------------------
// 端点：
//   GET /api/hit?vid=<匿名ID>&app=<appId>  本次访问 PV+1；UV 按前端匿名访客 ID 去重
//                                           （vid 缺失时回退「IP+UA」指纹）；
//                                           按日期/小时/星期/设备/系统/来源/应用自动累计，返回完整统计
//   GET /api/like?app=<appId>&vid=<vid>&on=1|0   点赞 / 取消（每人每应用限 1 次，可反复切换）
//   GET /api/stats                         查询完整统计（不计数，含 likes 点赞榜）
//   GET /                                  探活文本
// 数据全部存 Deno KV（['stats'] 单 key），免费额度含 KV 持久化，重启不丢。
// 部署见文件头部注释（console.deno.com：App Directory 根、Dynamic、entrypoint、
// Build 命令 echo skip、创建并 Attach KV 数据库）。
// 说明：早期版本按「IP+UA」指纹去重，校园 NAT 共享出口 IP 会把大量真实访客算成
// 同一人（UV 严重低估）；现改为前端匿名访客 ID（vid）优先、IP+UA 兜底。

const KEY = ['stats']
const kv = await Deno.openKv()

interface DayStats { pv: number; uv: number }
interface Stats {
  uv: number
  pv: number
  byDay: Record<string, DayStats>
  byHour: Record<string, number>
  byWeekday: Record<string, number>
  byDevice: Record<string, number>
  byOs: Record<string, number>
  byRef: Record<string, number>
  byApp: Record<string, number>
  byAppLikes: Record<string, number>
}

function emptyStats(): Stats {
  return { uv: 0, pv: 0, byDay: {}, byHour: {}, byWeekday: {}, byDevice: {}, byOs: {}, byRef: {}, byApp: {}, byAppLikes: {} }
}

function emptyStats(): Stats {
  return { uv: 0, pv: 0, byDay: {}, byHour: {}, byWeekday: {}, byDevice: {}, byOs: {}, byRef: {}, byApp: {}, byAppLikes: {} }
}

async function getStats(): Promise<Stats> {
  const r = await kv.get<Stats>(KEY)
  return r.value ?? emptyStats()
}

const pad = (n: number) => String(n).padStart(2, '0')
/** 北京时间（UTC+8，无夏令时）：日期/小时/星期均按中国时区统计，避免「今日」跨日错位 */
function cnNow() {
  return new Date(Date.now() + 8 * 3600 * 1000)
}
function dayKey(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
function bump(obj: Record<string, number>, k: string) {
  obj[k] = (obj[k] || 0) + 1
}

function parseDevice(ua: string) {
  if (/iPad|Tablet|PlayBook/i.test(ua)) return '平板'
  if (/Mobile|Android|iPhone|iOS/i.test(ua)) return '手机'
  return '桌面'
}
function parseOs(ua: string) {
  if (/Android/i.test(ua)) return 'Android'
  if (/iPhone|iPad|iOS/i.test(ua)) return 'iOS'
  if (/Windows/i.test(ua)) return 'Windows'
  if (/Mac OS X|Macintosh/i.test(ua)) return 'macOS'
  if (/Linux/i.test(ua)) return 'Linux'
  return '其他'
}
function parseRef(ref: string) {
  if (!ref) return '直接访问'
  if (/github\.io|github\.com/i.test(ref)) return 'GitHub'
  if (/baidu|google|bing|sogou|sm\.cn|so\.com/i.test(ref)) return '搜索引擎'
  if (/tieba|zhihu|weibo|xiaohongshu|douyin|bilibili/i.test(ref)) return '社交平台'
  return '其他外链'
}

function overview(s: Stats) {
  const todayKey = dayKey(cnNow())
  const today = s.byDay[todayKey] ?? { pv: 0, uv: 0 }
  const week: { label: string; pv: number; uv: number }[] = []
  for (let i = 6; i >= 0; i--) {
    const d = cnNow()
    d.setDate(d.getDate() - i)
    const k = dayKey(d)
    const v = s.byDay[k] ?? { pv: 0, uv: 0 }
    week.push({ label: k.slice(5), pv: v.pv, uv: v.uv })
  }
  const hours = Array.from({ length: 24 }, (_, i) => ({ label: i + '点', v: s.byHour[String(i)] || 0 }))
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'].map((n, i) => ({
    label: n,
    v: s.byWeekday[String(i)] || 0
  }))
  const toArr = (obj: Record<string, number>) =>
    Object.entries(obj).map(([name, v]) => ({ name, v })).sort((a, b) => b.v - a.v)
return {
    uv: s.uv,
    pv: s.pv,
    today: { date: todayKey, ...today },
    week,
    hours,
    weekdays,
    devices: toArr(s.byDevice),
    os: toArr(s.byOs),
    refs: toArr(s.byRef),
    apps: toArr(s.byApp),
    likes: toArr(s.byAppLikes)
  }
}
}

// ============================================================
// 一次性初始校准（历史痕迹，保留勿删）：
// 某次本地数据误删后手动恢复，按「独立访客 150 / 累计访问 260」为起点调试。
// 注意：该校准只写顶层 uv / pv，未同步补 byDay/byHour/byWeekday/
// byDevice/byOs/byRef/byApp 等维度明细，故存在已知口径差异——
// 累计 UV/PV 会大于各维度加总（例：PV 显示 500+，但来源/时段/设备分布
// 加总不足 500）。属历史遗留，不影响后续继续累加；做占比/趋势分析时请留意。
// ============================================================
const SEED_KEY = ['stats', 'seed3']
if (!(await kv.get(SEED_KEY)).value) {
  const st = await getStats()
  st.uv = 150
  st.pv = 260
  await kv.set(KEY, st)
  await kv.set(SEED_KEY, true)
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
  if (u.pathname === '/api/like') {
    const app = (u.searchParams.get('app') || '').trim()
    const vid = (u.searchParams.get('vid') || '').trim()
    const on = u.searchParams.get('on') === '1'
    const s = await getStats()
    if (app && vid) {
      const likeKey = ['lk', app, vid]
      const liked = (await kv.get(likeKey)).value === 1
      if (on && !liked) {
        s.byAppLikes[app] = (s.byAppLikes[app] || 0) + 1
        await kv.set(likeKey, 1)
      } else if (!on && liked) {
        s.byAppLikes[app] = Math.max(0, (s.byAppLikes[app] || 0) - 1)
        await kv.delete(likeKey)
      }
      await kv.set(KEY, s)
    }
    headers.set('Content-Type', 'application/json')
    return new Response(JSON.stringify({ app, likes: s.byAppLikes[app] || 0, liked: on }), { headers })
  }
  if (u.pathname === '/api/hit' || u.pathname === '/api/stats') {
    const hit = u.pathname === '/api/hit'
    const s = await getStats()
    if (hit) {
      s.pv++
      const now = cnNow()
      const dk = dayKey(now)
      const day = s.byDay[dk] ?? { pv: 0, uv: 0 }
      day.pv++
      // 独立访客 / 今日访客：优先前端匿名访客 ID（vid），缺失时回退「IP + UA」指纹
      const vid = (u.searchParams.get('vid') || '').trim()
      const fwd = req.headers.get('x-forwarded-for') || ''
      const ip = (fwd.split(',')[0] || req.headers.get('x-real-ip') || '').trim()
      const fingerprint = vid || ((ip + '|' + (req.headers.get('user-agent') || '')).trim())
      if (fingerprint) {
        const uvKey = ['v', fingerprint]
        if ((await kv.get(uvKey)).value == null) {
          s.uv++
          await kv.set(uvKey, true)
        }
        const dayUvKey = ['vd', dk, fingerprint]
        if ((await kv.get(dayUvKey)).value == null) {
          day.uv++
          await kv.set(dayUvKey, true)
        }
      }
      s.byDay[dk] = day
      bump(s.byHour, String(now.getHours()))
      bump(s.byWeekday, String(now.getDay()))
      bump(s.byDevice, parseDevice(req.headers.get('user-agent') || ''))
      bump(s.byOs, parseOs(req.headers.get('user-agent') || ''))
      bump(s.byRef, parseRef(req.headers.get('referer') || ''))
      const app = u.searchParams.get('app')
      if (app) bump(s.byApp, app)
      await kv.set(KEY, s)
    }
    headers.set('Content-Type', 'application/json')
    return new Response(JSON.stringify(overview(s)), { headers })
  }

  headers.set('Content-Type', 'text/plain; charset=utf-8')
  return new Response('QDU-Nav counter ok', { headers })
})