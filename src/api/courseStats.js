export const EMPTY_STATS = {
  periods: 0,
  terms: [],
  hotRooms: [],
  hotTeachers: [],
  topCourses: [],
  dayDist: [],
  periodDist: [],
  kindDist: [],
  campusDist: []
}

export async function getCourseStats() {
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 8000)
    const res = await fetch(import.meta.env.BASE_URL + 'data/course_stats.json', { signal: ctrl.signal })
    clearTimeout(timer)
    if (!res.ok) throw new Error('HTTP ' + res.status)
    const d = await res.json()
    return d && d.periods ? d : EMPTY_STATS
  } catch {
    return EMPTY_STATS
  }
}