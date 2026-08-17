/**
 * API 统一入口（网关优先，快照兜底）
 * ---------------------------------------------------------------------------
 * 优先请求本地网关 /api/*（开发与自托管时可用，实时性更好）；
 * 纯静态托管下网关不可达，自动回退到 /data/snapshot.json 在浏览器内完成查询，
 * 上层视图无需感知差异。
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
  return null
}