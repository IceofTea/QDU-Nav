/**
 * 绩点 / 加权平均分 计算引擎 —— 纯函数 · 零依赖 · 可单测
 *
 * 定位：本站面向**青岛大学**学生，提供一个本地、可自定义的成绩核算工具。
 * 重要约定（红线）：**不编造校规**。本模块内置的只是**通用换算示意**
 * （4.0 分段的常见做法与五级制折算），页面上明确提示「最终以学校学籍管理规定为准」，
 * 并提供「自定义分段」能力——学校口径一变，学生自己改区间即可，无需改代码。
 *
 * 口径说明（写死在这里，避免各处各算）：
 *   · 百分制课程：参与「加权平均分」= Σ(学分 × 百分成绩) / Σ学分；也按分段换算出 GPA。
 *   · 五级制（优/良/中/及格/不及格）：先按 `LEVEL5_TO_PERCENT` 折成百分制再参与计算。
 *   · 两级制（通过/不通过）：**记学分但不计入平均**（多数学校如此），页面上单独标注。
 *   · 学位课/非学位课本工具不做区分（信息量不足，交给你自己按需要筛选课程）。
 */

/** 五级制 → 百分制折算（示意值，可在页面上看到并自行调整） */
export const LEVEL5_TO_PERCENT = { excellent: 95, good: 85, medium: 75, pass: 65, fail: 50 }

/** 两级制选项 */
export const PASS_KINDS = ['pass', 'fail']

/** 默认的 4.0 分段换算表（示意；学校口径不同请自行修改） */
export const DEFAULT_GPA_BANDS = [
  { min: 90, gpa: 4.0, label: '90 及以上' },
  { min: 85, gpa: 3.7, label: '85 – 89' },
  { min: 82, gpa: 3.3, label: '82 – 84' },
  { min: 78, gpa: 3.0, label: '78 – 81' },
  { min: 75, gpa: 2.7, label: '75 – 77' },
  { min: 72, gpa: 2.3, label: '72 – 74' },
  { min: 68, gpa: 2.0, label: '68 – 71' },
  { min: 64, gpa: 1.5, label: '64 – 67' },
  { min: 60, gpa: 1.0, label: '60 – 63' },
  { min: 0, gpa: 0.0, label: '60 以下' }
]

/** 成绩类型 */
export const SCORE_TYPES = ['percent', 'level5', 'pass']

function num(v) {
  // 注意：Number(null) === 0、Number('') === 0，若不显式排除，
  // 空成绩会被当成「0 分」混进加权平均（真实 bug，测试已回归）。
  if (v === null || v === undefined || v === '') return null
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : null
}

/** 四舍五入到指定小数位（默认 2） */
export function round(v, digits = 2) {
  const p = Math.pow(10, digits)
  const r = Math.round((Number(v) + Number.EPSILON) * p) / p
  return Object.is(r, -0) ? 0 : r
}

/** 把一门课折算成「参与统计的百分制成绩」；不参与平均的返回 null */
export function percentOf(course, level5 = LEVEL5_TO_PERCENT) {
  if (!course) return null
  if (course.scoreType === 'pass') return null
  if (course.scoreType === 'level5') {
    const v = level5[course.level]
    return typeof v === 'number' ? v : null
  }
  return num(course.score)
}

/** 按分段表把百分制成绩换成 GPA；成绩缺失返回 null */
export function gpaOf(percent, bands = DEFAULT_GPA_BANDS) {
  const p = num(percent)
  if (p === null) return null
  const sorted = [...bands].sort((a, b) => b.min - a.min)
  for (const b of sorted) {
    if (p >= b.min) return b.gpa
  }
  return sorted.length ? sorted[sorted.length - 1].gpa : null
}

/** 规范化一条课程记录（脏数据丢弃） */
export function normalizeCourse(raw) {
  if (!raw || typeof raw !== 'object') return null
  const credit = num(raw.credit)
  if (credit === null || credit <= 0 || credit > 30) return null
  const type = SCORE_TYPES.includes(raw.scoreType) ? raw.scoreType : 'percent'
  const c = {
    id: raw.id != null ? raw.id : `c${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
    name: String(raw.name == null ? '' : raw.name).trim().slice(0, 40) || '未命名课程',
    credit: round(credit, 1),
    scoreType: type
  }
  if (type === 'percent') {
    const s = num(raw.score)
    if (s === null || s < 0 || s > 100) return null
    c.score = round(s, 1)
  } else if (type === 'level5') {
    c.level = Object.prototype.hasOwnProperty.call(LEVEL5_TO_PERCENT, raw.level) ? raw.level : 'pass'
  } else {
    c.pass = raw.pass === 'fail' ? 'fail' : 'pass'
  }
  return c
}

/**
 * 汇总核算。
 * @returns { totalCredit, countedCredit, avg, gpa, failedCount, rows:[{...course, percent, gpa, counted}] }
 */
export function summarize(courses, bands = DEFAULT_GPA_BANDS, level5 = LEVEL5_TO_PERCENT) {
  const list = (courses || []).map(normalizeCourse).filter(Boolean)
  let totalCredit = 0
  let countedCredit = 0
  let weighted = 0
  let gpaWeighted = 0
  let failedCount = 0
  const rows = list.map((c) => {
    totalCredit += c.credit
    const percent = percentOf(c, level5)
    const counted = percent !== null
    const gpa = counted ? gpaOf(percent, bands) : null
    if (counted) {
      countedCredit += c.credit
      weighted += c.credit * percent
      gpaWeighted += c.credit * (gpa === null ? 0 : gpa)
    }
    if ((c.scoreType === 'percent' && c.score < 60) || c.level === 'fail' || c.pass === 'fail') failedCount++
    return { ...c, percent, gpa, counted }
  })
  return {
    totalCredit: round(totalCredit, 1),
    countedCredit: round(countedCredit, 1),
    avg: countedCredit > 0 ? round(weighted / countedCredit) : null,
    gpa: countedCredit > 0 ? round(gpaWeighted / countedCredit, 2) : null,
    failedCount,
    rows
  }
}

/**
 * 目标规划：已知「已修学分 + 当前平均」与「剩余学分」，求剩余课程需要多少平均分才能达到目标。
 * 数学：target = (avg × done + need × remain) / (done + remain)
 *      → need = (target × (done + remain) − avg × done) / remain
 * @param kind 'gpa' 时上限按 4.0 判定；'avg'（百分制加权分）按 100 判定
 * @returns { need, feasible, reason: 'ok'|'already'|'beyond'|'insufficient', ceiling }
 */
export function solveRemaining({ avg, doneCredit, remainCredit, target, kind = 'gpa' }) {
  const a = num(avg)
  const d = num(doneCredit)
  const r = num(remainCredit)
  const t = num(target)
  if (a === null || d === null || r === null || t === null || r <= 0) {
    return { need: null, feasible: false, reason: 'insufficient' }
  }
  const total = d + r
  const need = round((t * total - a * d) / r)
  const maxScale = kind === 'avg' ? 100 : 4.0
  if (need <= 0) return { need: 0, feasible: true, reason: 'already', ceiling: maxScale }
  if (need > maxScale) return { need, feasible: false, reason: 'beyond', ceiling: maxScale }
  return { need, feasible: true, reason: 'ok', ceiling: maxScale }
}

/** 导出为可下载 JSON 文本 */
export function exportCourses(courses, bands, meta = {}, now = new Date()) {
  const list = (courses || []).map(normalizeCourse).filter(Boolean)
  return JSON.stringify({
    kind: 'qdu-gpa-courses',
    format: 1,
    exportedAt: now.toISOString(),
    app: String(meta.app || ''),
    version: String(meta.version || ''),
    count: list.length,
    bands: (bands || DEFAULT_GPA_BANDS).slice(),
    courses: list
  }, null, 2)
}

/** 解析导入的课程文本；兼容「完整对象 / 裸数组 / {courses}」 */
export function importCourses(text) {
  let obj = null
  try {
    obj = JSON.parse(String(text || ''))
  } catch {
    return { ok: false, error: 'not-json', courses: [], bands: null }
  }
  let raw = null
  let bands = null
  if (Array.isArray(obj)) raw = obj
  else if (obj && Array.isArray(obj.courses)) {
    raw = obj.courses
    if (Array.isArray(obj.bands) && obj.bands.length) bands = obj.bands
  }
  if (!raw) return { ok: false, error: 'no-courses', courses: [], bands: null }
  const seen = new Set()
  const out = []
  let dropped = 0
  for (const it of raw) {
    const c = normalizeCourse(it)
    if (!c) { dropped++; continue }
    const key = `${c.name}|${c.credit}|${c.scoreType}|${c.score || ''}${c.level || ''}${c.pass || ''}`
    if (seen.has(key)) { dropped++; continue }
    seen.add(key)
    out.push(c)
  }
  if (!out.length) return { ok: false, error: 'all-invalid', courses: [], bands }
  return { ok: true, courses: out, bands, dropped }
}

export default {
  LEVEL5_TO_PERCENT,
  PASS_KINDS,
  DEFAULT_GPA_BANDS,
  SCORE_TYPES,
  round,
  percentOf,
  gpaOf,
  normalizeCourse,
  summarize,
  solveRemaining,
  exportCourses,
  importCourses
}
