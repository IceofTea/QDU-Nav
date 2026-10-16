/**
 * 教室与空教室工具 —— 纯函数 · 零依赖 · 可单测
 *
 * 定位：把「教室 → 楼栋」「某节课某教室是否被占」「空教室结果归一化」这类
 * 判定逻辑从视图里抽出来（逻辑与原实现保持一致，只是换个位置），
 * 这样就能被 scripts/test_classroom.mjs 直接单测，而不必靠真机冒烟兜。
 *
 * 口径说明：课表行的节次字段为 `s`（起始节）~`e`（结束节）、`d`（星期 1-7）、
 * `w`（周次表达式，如 "1-16" 或 "1,3,5"），与教务处课程总表一致。
 */

/** 安全取整数 */
function num(v) {
  if (v === null || v === undefined || v === '') return NaN
  const n = Number(v)
  return Number.isFinite(n) ? n : NaN
}

/** 教室名归一化（与 utils/course.js 的 normRoom 同规则，单独保留一份避免循环依赖） */
export function normRoomName(r) {
  return (r || '').replace(/[（(]智慧[)）]/g, '').trim()
}

/**
 * 教室 → 楼栋名。
 * 先按 buildings 里的楼名做前缀匹配；匹配不到就退回「首个数字之前」的部分。
 * @param {string} room 教室名，如「博远楼303」
 * @param {Array<{name:string}>} buildings 楼栋表
 */
export function buildOfRoom(room, buildings = []) {
  const r = String(room || '')
  if (!r) return ''
  const b = buildings.find((x) => x && x.name && r.startsWith(x.name))
  if (b) return b.name
  return r.split(/\d/)[0] || r
}

/**
 * 这条课表行是否占用「第 day 天（1=周一）· 第 period 节」。
 * 跨节（s~e，如 3-4 节连堂）任一节重叠即算占用。
 */
export function occupies(row, day, period) {
  if (!row) return false
  const d = num(row.d)
  const s = num(row.s)
  const e = num(row.e)
  if (Number.isNaN(d) || Number.isNaN(s) || Number.isNaN(e)) return false
  const p = num(period)
  if (Number.isNaN(p)) return false
  return d === day && p >= Math.min(s, e) && p <= Math.max(s, e)
}

/**
 * 统计「第 day 天第 period 节」被占用的教室 → Map<归一化教室名, 该教室当节课程数>
 * 同一教室多门课同时上只算 1 个占用。
 */
export function occupancyMap(rows, day, period) {
  const m = new Map()
  for (const r of rows || []) {
    if (!occupies(r, day, period)) continue
    const name = normRoomName(r.r)
    if (!name) continue
    m.set(name, (m.get(name) || 0) + 1)
  }
  return m
}

/**
 * 空教室结果归一化（来自 /api 空教室接口或本地回退）。
 * 缺字段/类型不对都不抛异常：rooms 一律过滤成非空串，计数回落到实际长度。
 * @returns { ok, day, period, total, emptyCount, rooms }
 */
export function summarizeEmpty(payload) {
  const p = payload && typeof payload === 'object' ? payload : {}
  const day = num(p.day)
  const period = num(p.period)
  const rooms = Array.isArray(p.rooms) ? p.rooms.map((x) => String(x || '').trim()).filter(Boolean) : []
  const total = Number.isFinite(num(p.total)) && num(p.total) >= 0 ? num(p.total) : rooms.length
  const emptyCount = Number.isFinite(num(p.emptyCount)) && num(p.emptyCount) >= 0 ? num(p.emptyCount) : rooms.length
  const ok = Number.isFinite(day) && day >= 1 && day <= 7 && Number.isFinite(period) && period >= 1
  return {
    ok,
    day: Number.isFinite(day) ? day : null,
    period: Number.isFinite(period) ? period : null,
    total,
    emptyCount,
    rooms
  }
}

/**
 * 按楼栋分组空教室，组内与组间都按中文习惯排序（楼栋名升序，教室名升序）。
 * @returns [string, string[]][]
 */
export function groupByBuilding(rooms, buildings = []) {
  const g = new Map()
  for (const r of rooms || []) {
    const name = String(r || '').trim()
    if (!name) continue
    const b = buildOfRoom(name, buildings)
    if (!g.has(b)) g.set(b, [])
    g.get(b).push(name)
  }
  return [...g.entries()]
    .map(([k, v]) => [k, v.sort((a, b) => a.localeCompare(b, 'zh'))])
    .sort((a, b) => a[0].localeCompare(b[0], 'zh'))
}

export default {
  normRoomName,
  buildOfRoom,
  occupies,
  occupancyMap,
  summarizeEmpty,
  groupByBuilding
}