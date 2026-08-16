import {
  staticCourses,
  staticNotices,
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
  if (p === '/calendar') return staticCalendar()
  if (p === '/courseTable') return staticCourseTable()
  if (p === '/emptyRooms')
    return staticEmptyRooms(Number(q.get('day')), Number(q.get('period')), (q.get('kw') || '').trim())
  if (p === '/roomSchedule') return staticRoomSchedule(q.get('room') || '')
  if (p === '/courseQuery') return staticCourseQuery((q.get('q') || '').trim())
  return null
}