/**
 * 本站舆情数据源：读取自建计数服务（counter/server.ts 的 /api/stats）
 * 返回 UV/PV 及 近7天趋势 / 小时与星期分布 / 设备与系统 / 来源 / 热门应用。
 */
import { SITE } from '../config/site'

const api = (SITE.counter && SITE.counter.api) || ''

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
  apps: []
}

export async function getSiteStats() {
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