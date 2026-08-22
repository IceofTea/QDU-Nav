/**
 * 本站舆情数据源：读取自建计数服务（counter/server.ts 的 /api/stats）
 * 返回 UV/PV 及 近7天趋势 / 小时与星期分布 / 设备与系统 / 来源 / 热门应用。
 * 计数服务额度超限期间（site.js counter.staticMode = true）改读静态快照，
 * 动态接口逻辑完整保留，额度恢复后把开关改回 false 即可。
 */
import { SITE } from '../config/site'

const api = (SITE.counter && SITE.counter.api) || ''
const STATIC_MODE = !!(SITE.counter && SITE.counter.staticMode)
const staticUrl =
  import.meta.env.BASE_URL + ((SITE.counter && SITE.counter.staticData) || 'data/site_stats_snapshot.json')

export const EMPTY_STATS = {
  uv: 0,
  pv: 0,
  today: { pv: 0, uv: 0 },
  week: [],
  hours: [],
  weekdays: [],
  devices: [],
  os: [],
  refs: [],
  apps: [],
  likes: []
}

export const isStaticMode = () => STATIC_MODE

/** 读本地快照（静态降级模式），失败回退空数据 */
async function fetchStatic() {
  try {
    const r = await fetch(staticUrl)
    if (!r.ok) return EMPTY_STATS
    const d = await r.json()
    if (!d || d.pv === undefined) return EMPTY_STATS
    return { ...EMPTY_STATS, ...d }
  } catch {
    return EMPTY_STATS
  }
}

export async function getSiteStats() {
  if (STATIC_MODE) return fetchStatic()
  if (!api) return EMPTY_STATS
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 8000)
    const r = await fetch(api + '/api/stats', { signal: ctrl.signal })
    clearTimeout(timer)
    if (!r.ok) return EMPTY_STATS
    const d = await r.json()
    if (!d || d.pv === undefined) return EMPTY_STATS
    return { ...EMPTY_STATS, ...d }
  } catch {
    return EMPTY_STATS
  }
}
