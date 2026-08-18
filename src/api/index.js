/**
 * API 统一入口（网关优先，快照兜底）
 * ---------------------------------------------------------------------------
 * 优先请求本地网关 /api/*（开发与自托管时可用，实时性更好）；
 * 纯静态托管下网关不可达，自动回退到 /data/snapshot.json 在浏览器内完成查询。
 * 例外：/notice（通知详情）依赖网关逐条抓取，快照不存正文，纯静态下不可用，
 * 由视图（NoticeDetail）如实降级为「前往官方原文」，属预期行为。
 */
import {
  staticCourses,
  staticNotices,
  staticNews,
  staticCalendar,
  staticCourseTable,
  staticEmptyRooms,
  staticRoomSchedule,
  staticCourseQuery
} from './localCourse'

const TIMEOUT = 10000

export async function apiFetch(path) {
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT)
    const res = await fetch('/api' + path, { signal: ctrl.signal })
    clearTimeout(timer)
    if (!res.ok) throw new Error('HTTP ' + res.status)
    return await res.json()
  } catch {
    return staticFallback(path)
  }
}

async function staticFallback(path) {
  const [p, qs] = path.split('?')
  const q = new URLSearchParams(qs || '')
  if (p === '/courses') return staticCourses()
  if (p === '/notices') return staticNotices(q.get('all') === '1')
  if (p === '/news') return staticNews()
  if (p === '/calendar') return staticCalendar()
  if (p === '/courseTable') return staticCourseTable()
  if (p === '/emptyRooms')
    return staticEmptyRooms(Number(q.get('day')), Number(q.get('period')), (q.get('kw') || '').trim())
  if (p === '/roomSchedule') return staticRoomSchedule(q.get('room') || '')
  if (p === '/courseQuery') return staticCourseQuery((q.get('q') || '').trim())
  // /notice 等依赖网关实时抓取的接口：快照无对应数据，返回 null（视图降级）
  return null
}