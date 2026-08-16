// 静态快照回退层：GitHub Pages 等纯静态托管没有网关，apiFetch 失败时用 /data/snapshot.json 在浏览器本地查询。
let snap = null
let loading = null

const normRoom = (r) => (r || '').replace(/[（(]智慧[)）]/g, '').trim()

export async function loadSnap() {
  if (snap) return snap
  if (loading) return loading
  loading = (async () => {
    try {
      const r = await fetch(import.meta.env.BASE_URL + 'data/snapshot.json')
      if (!r.ok) return null
      snap = await r.json()
      return snap
    } catch {
      return null
    } finally {
      loading = null
    }
  })()
  return loading
}

export async function staticCourses() {
  const d = await loadSnap()
  return d ? { items: d.courses.items, source: d.source, fetchedAt: d.updatedAt, cached: true, static: true } : null
}

export async function staticNotices(all) {
  const d = await loadSnap()
  if (!d) return null
  return { items: d.notices.items, source: d.source, fetchedAt: d.updatedAt, cached: true, static: true }
}

export async function staticCalendar() {
  const d = await loadSnap()
  return d ? { items: d.calendar.items, source: d.source, fetchedAt: d.updatedAt, cached: true, static: true } : null
}

export async function staticCourseTable() {
  const d = await loadSnap()
  return d ? { semester: d.courseTable.semester, count: d.courseTable.count, rooms: d.courseTable.rooms, updatedAt: d.courseTable.updatedAt, cached: true, static: true, latestUrl: d.courseTable.latestUrl } : null
}

export async function staticEmptyRooms(day, period, kw) {
  const d = await loadSnap()
  if (!d) return null
  const busy = new Set()
  for (const r of d.rows) {
    if (r.d === day && period >= r.s && period <= r.e) busy.add(normRoom(r.r))
  }
  let all = [...new Set(d.rows.map((r) => r.r && normRoom(r.r)).filter(Boolean))]
  if (kw) all = all.filter((x) => x.includes(kw))
  const empty = all.filter((x) => !busy.has(x)).sort()
  return { semester: d.courseTable.semester, day, period, total: all.length, emptyCount: empty.length, rooms: empty, static: true }
}

export async function staticRoomSchedule(room) {
  const d = await loadSnap()
  if (!d) return null
  const nr = normRoom(room)
  const list = d.rows.filter((r) => normRoom(r.r) === nr).sort((a, b) => a.d - b.d || a.s - b.s)
  return { semester: d.courseTable.semester, room: nr, count: list.length, schedule: list, static: true }
}

export async function staticCourseQuery(q) {
  const d = await loadSnap()
  if (!d) return null
  const hits = d.rows.filter((r) => r.cls.includes(q) || r.c.includes(q) || r.t.includes(q))
  return { semester: d.courseTable.semester, q, count: hits.length, rows: hits.slice(0, 200), static: true }
}