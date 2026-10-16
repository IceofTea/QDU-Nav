/**
 * 绩点 / 加权平均 引擎自测：node scripts/test_gpa.mjs
 * 覆盖：五级制折算、两级制不计平均、加权平均与 GPA 加权、分段换算、脏数据丢弃、
 *      目标反推（可达 / 已达标 / 不可能）、导出导入往返。
 */
import assert from 'node:assert/strict'
import {
  LEVEL5_TO_PERCENT, DEFAULT_GPA_BANDS, round, percentOf, gpaOf, normalizeCourse,
  summarize, solveRemaining, exportCourses, importCourses
} from '../src/utils/gpa.js'

let failed = 0
function check(name, fn) {
  try {
    fn()
    console.log('✔', name)
  } catch (e) {
    failed++
    console.error('✘', name, '\n   ', e.message)
  }
}

const c = (o) => ({ scoreType: 'percent', ...o })

check('round 处理浮点与 -0', () => {
  assert.equal(round(0.1 + 0.2), 0.3)
  assert.equal(round(2.345, 2), 2.35)
  assert.ok(Object.is(round(-0.0001), 0))
})

check('percentOf：三类成绩的折算口径', () => {
  assert.equal(percentOf(c({ score: 88 })), 88)
  assert.equal(percentOf({ scoreType: 'level5', level: 'excellent' }), LEVEL5_TO_PERCENT.excellent)
  assert.equal(percentOf({ scoreType: 'level5', level: 'good' }), 85)
  assert.equal(percentOf({ scoreType: 'pass', pass: 'pass' }), null, '两级制不参与平均')
  assert.equal(percentOf({ scoreType: 'level5', level: '不存在' }), null)
})

check('gpaOf 分段换算（含边界）', () => {
  assert.equal(gpaOf(95), 4.0)
  assert.equal(gpaOf(90), 4.0)
  assert.equal(gpaOf(89.9), 3.7)
  assert.equal(gpaOf(85), 3.7)
  assert.equal(gpaOf(84), 3.3)
  assert.equal(gpaOf(60), 1.0)
  assert.equal(gpaOf(59.9), 0.0)
  assert.equal(gpaOf(0), 0.0)
  assert.equal(gpaOf(null), null)
})

check('normalizeCourse 丢弃脏数据、补 id、限定范围', () => {
  assert.equal(normalizeCourse(null), null)
  assert.equal(normalizeCourse({}), null)
  assert.equal(normalizeCourse({ name: 'a', credit: 0, score: 80 }), null, '学分为 0 丢弃')
  assert.equal(normalizeCourse({ name: 'a', credit: 3, score: 101 }), null, '成绩越界丢弃')
  assert.equal(normalizeCourse({ name: 'a', credit: 3, score: -1 }), null)
  const ok = normalizeCourse({ name: '  高等数学  ', credit: 5, score: 88.46 })
  assert.equal(ok.name, '高等数学')
  assert.equal(ok.credit, 5)
  assert.equal(ok.score, 88.5)
  assert.ok(ok.id)
  const unknownType = normalizeCourse({ name: 'x', credit: 2, scoreType: '??', score: 70 })
  assert.equal(unknownType.scoreType, 'percent')
  const badLevel = normalizeCourse({ name: 'x', credit: 2, scoreType: 'level5', level: 'nope' })
  assert.equal(badLevel.level, 'pass')
})

check('summarize：加权平均 / GPA 加权 / 两级制只计学分', () => {
  const r = summarize([
    c({ name: '高数', credit: 5, score: 90 }),   // 4.0
    c({ name: '英语', credit: 3, score: 80 }),   // 3.0
    { scoreType: 'pass', name: '体育', credit: 1, pass: 'pass' }
  ])
  assert.equal(r.totalCredit, 9, '总学分含两级制')
  assert.equal(r.countedCredit, 8, '参与平均的学分不含两级制')
  assert.equal(r.avg, round((5 * 90 + 3 * 80) / 8))
  assert.equal(r.gpa, round((5 * 4.0 + 3 * 3.0) / 8))
  assert.equal(r.failedCount, 0)
})

check('summarize：五级制折算后参与平均', () => {
  const r = summarize([
    c({ name: 'A', credit: 2, score: 100 }),
    { scoreType: 'level5', name: 'B', credit: 2, level: 'good' }
  ])
  assert.equal(r.avg, round((2 * 100 + 2 * 85) / 4))
})

check('summarize：挂科计入 failedCount，但不影响算错', () => {
  const r = summarize([
    c({ name: '挂科课', credit: 3, score: 55 }),
    c({ name: '正常课', credit: 3, score: 85 })
  ])
  assert.equal(r.failedCount, 1)
  assert.equal(r.avg, 70)
  assert.equal(r.gpa, round((3 * 0 + 3 * 3.7) / 6))
})

check('summarize：空数据不产生 NaN', () => {
  const r = summarize([])
  assert.equal(r.totalCredit, 0)
  assert.equal(r.avg, null)
  assert.equal(r.gpa, null)
  const dirty = summarize([null, {}, { name: 'x', credit: 'abc', score: 80 }])
  assert.equal(dirty.rows.length, 0)
})

check('solveRemaining：达标 / 已达标 / 不可能', () => {
  // 已修 60 学分、平均 3.0；还需 30 学分；目标 3.3 → 剩余需 3.9（≤4.0 可达）
  const ok = solveRemaining({ avg: 3.0, doneCredit: 60, remainCredit: 30, target: 3.3 })
  assert.equal(ok.feasible, true, 'need=' + ok.need)
  assert.equal(ok.need, round((3.3 * 90 - 3.0 * 60) / 30))
  const already = solveRemaining({ avg: 3.9, doneCredit: 90, remainCredit: 10, target: 3.5 })
  assert.equal(already.reason, 'already', '当前 3.9、还差 10 学分、目标 3.5 → 只需 0 分即达标')
  const beyond = solveRemaining({ avg: 2.0, doneCredit: 60, remainCredit: 3, target: 4.0 })
  assert.equal(beyond.feasible, false)
  assert.equal(beyond.reason, 'beyond')
  assert.equal(solveRemaining({ avg: 3, doneCredit: 60, remainCredit: 0, target: 3.5 }).reason, 'insufficient')
  const avgKind = solveRemaining({ avg: 78, doneCredit: 60, remainCredit: 30, target: 85, kind: 'avg' })
  assert.equal(avgKind.ceiling, 100)
})

check('导出→导入往返一致，且能带回自定义分段表', () => {
  const courses = [
    c({ name: '高数', credit: 5, score: 88 }),
    { scoreType: 'level5', name: '思政', credit: 2, level: 'good' },
    { scoreType: 'pass', name: '体育', credit: 1, pass: 'pass' }
  ]
  const text = exportCourses(courses, DEFAULT_GPA_BANDS, { app: 'QDU-Nav', version: '1.7.7' }, new Date('2026-10-16T00:00:00Z'))
  const parsed = JSON.parse(text)
  assert.equal(parsed.kind, 'qdu-gpa-courses')
  assert.equal(parsed.count, 3)
  const back = importCourses(text)
  assert.equal(back.ok, true)
  assert.equal(back.courses.length, 3)
  assert.ok(Array.isArray(back.bands) && back.bands.length === DEFAULT_GPA_BANDS.length)
  assert.equal(back.courses.find((x) => x.name === '高数').score, 88)
})

check('importCourses：三形态 + 错误码 + 去重丢非法', () => {
  const one = { name: 'A', credit: 2, score: 80 }
  assert.equal(importCourses(JSON.stringify([one])).ok, true)
  assert.equal(importCourses(JSON.stringify({ courses: [one] })).ok, true)
  assert.equal(importCourses('{bad').error, 'not-json')
  assert.equal(importCourses('{"x":1}').error, 'no-courses')
  assert.equal(importCourses(JSON.stringify([{ nope: 1 }])).error, 'all-invalid')
  const dup = importCourses(JSON.stringify([one, { ...one }, null]))
  assert.equal(dup.ok, true)
  assert.equal(dup.courses.length, 1)
  assert.equal(dup.dropped, 2)
})

console.log(failed ? `\n${failed} 项失败` : '\n全部通过')
process.exit(failed ? 1 : 0)
