/**
 * 数据洞察数据源
 * ---------------------------------------------------------------------------
 * 读取由 crawler/analysis.py 定时生成的 public/data/course_stats.json，
 * 文件随构建复制到部署产物（注意用 BASE_URL 相对路径以兼容 GH Pages 子路径）。
 * 加载失败时返回 EMPTY_STATS（各页面呈现「暂不可用」空态）。
 */

/** 空统计对象：未取到数据时的兜底值，保证视图无需判空 */
export const EMPTY_STATS = {
  periods: 0,
  terms: [],
  hotRooms: [],
  hotTeachers: [],
  topCourses: [],
  dayDist: [],
  periodDist: [],
  kindDist: [],
  campusDist: [],
  colDist: []
}

export async function getCourseStats() {
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 8000)
    const res = await fetch(import.meta.env.BASE_URL + 'data/course_stats.json', { signal: ctrl.signal })
    clearTimeout(timer)
    if (!res.ok) throw new Error('HTTP ' + res.status)
    const d = await res.json()
    if (!d || !d.periods) return EMPTY_STATS
    return { ...EMPTY_STATS, ...d, colDist: d.colDist || [] }
  } catch {
    return EMPTY_STATS
  }
}