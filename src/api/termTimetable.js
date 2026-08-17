/**
 * 课程表按学期懒加载
 * ---------------------------------------------------------------------------
 * crawler/split_snapshot.py 把快照 rows 按学期拆成轻量小文件：
 *   - data/timetable_meta.json     学期列表 / 当前学期 / courseTable 元信息
 *   - data/terms/t0.json …         每个学期仅含该学期 rows
 * 课程表默认只加载当前学期文件，切换学期时按需加载并缓存，
 * 避免一次性 fetch + parse 15MB 全量快照导致首屏慢 / 手机卡死。
 * 旧部署无拆分数据时返回 null，由调用方回退到全量 loadSnap。
 */

let meta = null
let metaLoading = null
const termCache = new Map()

export async function loadTimetableMeta() {
  if (meta) return meta
  if (metaLoading) return metaLoading
  metaLoading = (async () => {
    try {
      const r = await fetch(import.meta.env.BASE_URL + 'data/timetable_meta.json')
      if (!r.ok) return null
      meta = await r.json()
      return meta
    } catch {
      return null
    } finally {
      metaLoading = null
    }
  })()
  return metaLoading
}

export async function loadTermRows(file) {
  if (termCache.has(file)) return termCache.get(file)
  const p = (async () => {
    try {
      const r = await fetch(import.meta.env.BASE_URL + 'data/terms/' + file)
      if (!r.ok) return { rows: [] }
      return await r.json()
    } catch {
      return { rows: [] }
    }
  })()
  termCache.set(file, p)
  return p
}