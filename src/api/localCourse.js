/**
 * 静态快照回退层
 * ---------------------------------------------------------------------------
 * GitHub Pages 等纯静态托管没有网关，apiFetch 失败时用 /data/snapshot.json
 * 在浏览器本地完成同样的查询，保证站点在任何静态托管上功能完整。
 */
import { normRoom, clsSplit } from '../utils/course'

let snap = null
let loading = null
let tmMeta = null
let tmLoading = null

/** 课程表元信息轻量读取（timetable_meta.json 约 2KB，避免全量 15MB snapshot） */
async function loadTimetableMetaFast() {
  if (tmMeta) return tmMeta
  if (tmLoading) return tmLoading
  tmLoading = (async () => {
    try {
      const r = await fetch(import.meta.env.BASE_URL + 'data/timetable_meta.json')
      if (!r.ok) return null
      tmMeta = await r.json()
      return tmMeta
    } catch {
      return null
    } finally {
      tmLoading = null
    }
  })()
  return tmLoading
}

const rowsOf = (d, term) => (term && term !== 'all' ? d.rows.filter((r) => r.term === term) : d.rows)
const allRoomsOf = (d) => [...new Set(d.rows.map((r) => r.r && normRoom(r.r)).filter(Boolean))]

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

export async function staticNews() {
  const d = await loadSnap()
  return d ? { items: d.news.items, source: d.source, fetchedAt: d.updatedAt, cached: true, static: true } : null
}

export async function staticCalendar() {
  const d = await loadSnap()
  return d ? { items: d.calendar.items, source: d.source, fetchedAt: d.updatedAt, cached: true, static: true } : null
}

export async function staticCourseTable() {
  const m = await loadTimetableMetaFast()
  if (m && m.courseTable) {
    return {
      semester: m.courseTable.semester,
      count: m.courseTable.count,
      rooms: m.courseTable.rooms,
      updatedAt: m.courseTable.updatedAt,
      cached: true,
      static: true,
      latestUrl: m.courseTable.latestUrl,
      semesters: (m.courseTables || []).map((t) => t.semester)
    }
  }
  const d = await loadSnap()
  if (!d) return null
  return {
    semester: d.courseTable.semester,
    count: d.courseTable.count,
    rooms: d.courseTable.rooms,
    updatedAt: d.courseTable.updatedAt,
    cached: true,
    static: true,
    latestUrl: d.courseTable.latestUrl,
    semesters: (d.courseTables || []).map((t) => t.semester)
  }
}

export async function staticEmptyRooms(day, period, kw, term) {
  const d = await loadSnap()
  if (!d) return null
  const cur = term && term !== 'all' ? term : d.courseTable.semester
  const busy = new Set()
  for (const r of rowsOf(d, cur)) {
    if (r.d === day && period >= r.s && period <= r.e) busy.add(normRoom(r.r))
  }
  let all = allRoomsOf(d)
  if (kw) all = all.filter((x) => x.includes(kw))
  const empty = all.filter((x) => !busy.has(x)).sort()
  return { semester: cur, day, period, total: all.length, emptyCount: empty.length, rooms: empty, static: true }
}

export async function staticRoomSchedule(room, term) {
  const d = await loadSnap()
  if (!d) return null
  const nr = normRoom(room)
  const cur = term && term !== 'all' ? term : d.courseTable.semester
  const list = rowsOf(d, cur)
    .filter((r) => normRoom(r.r) === nr)
    .sort((a, b) => a.d - b.d || a.s - b.s)
  return { semester: cur, room: nr, count: list.length, schedule: list, static: true }
}

export async function staticCourseQuery(q, term) {
  const d = await loadSnap()
  if (!d) return null
  const cur = term && term !== 'all' ? term : d.courseTable.semester
  const hits = rowsOf(d, cur).filter((r) => clsSplit(r.cls).includes(q) || r.c.includes(q) || r.t.includes(q))
  return { semester: cur, q, count: hits.length, rows: hits.slice(0, 200), static: true }
}