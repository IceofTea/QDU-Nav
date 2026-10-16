/**
 * 绩点 / 加权平均 引擎自测：node scripts/test_gpa.mjs
 * 覆盖：五级制折算、两级制不计平均、加权平均与 GPA 加权、分段换算、脏数据丢弃、
 *      目标反推（可达 / 已达标 / 不可能）、导出导入往返。
 */
import assert from 'node:assert/strict'
import {
  LEVEL5_TO_PERCENT, DEFAULT_GPA_BANDS, round, percentOf, gpaOf, normalizeCourse,
  summarize, solveRemaining, exportCourses, importCourses,
  courseKey, termKey, termShort, byTerm, trendSeries
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

check('termKey/termShort：教务原文的各种写法', () => {
  assert.equal(termKey('2026年秋季学期'), 202609)
  assert.equal(termKey('2026年春季学期'), 202602)
  assert.equal(termKey('2023年春夏学期'), 202304)
  assert.equal(termKey('2025年夏季学期'), 202506)
  assert.equal(termKey(''), 0)
  assert.equal(termKey('没写学期'), 0, '没有年份 → 0（排最后，不报错）')
  assert.equal(termKey(null), 0)
  assert.equal(termShort('2026年秋季学期'), '26秋')
  assert.equal(termShort('2023年春夏学期'), '23春夏')
  assert.equal(termShort('没写学期'), '没写学期')
  assert.ok(termKey('2026年秋季学期') > termKey('2026年春季学期'), '秋季应排在春季之后')
  assert.ok(termKey('2026年春季学期') > termKey('2025年秋季学期'), '跨年应正确排序')
})

check('normalizeCourse：带学期、截断超长学期名', () => {
  const a = normalizeCourse({ name: '高数', credit: 5, score: 90, term: '2026年秋季学期' })
  assert.equal(a.term, '2026年秋季学期')
  const b = normalizeCourse({ name: '高数', credit: 5, score: 90, term: '  ' })
  assert.equal(b.term, '', '空白学期归一为空串')
  const long = normalizeCourse({ name: 'x', credit: 1, score: 60, term: 'A'.repeat(50) })
  assert.equal(long.term.length, 20, '学期名超长要截断')
})

check('courseKey：同学期同课为同一把尺，跨学期可共存', () => {
  const base = { name: '高数', credit: 5, scoreType: 'percent', score: 88 }
  const a = normalizeCourse({ ...base, term: '2026年秋季学期' })
  const b = normalizeCourse({ ...base, term: '2026年秋季学期' })
  const c = normalizeCourse({ ...base, term: '2027年春季学期' })
  assert.equal(courseKey(a), courseKey(b), '同学期应判为重复')
  assert.notEqual(courseKey(a), courseKey(c), '跨学期不应判为重复')
  const dup = importCourses(JSON.stringify([{ ...base, term: '2026年秋季学期' }, { ...base, term: '2027年春季学期' }]))
  assert.equal(dup.ok, true)
  assert.equal(dup.courses.length, 2, '两个学期都应保留')
})

check('byTerm：分组、升序、跳过没填学期的课', () => {
  const list = [
    c({ name: 'A', credit: 4, score: 90, term: '2026年春季学期' }),   // 4.0
    c({ name: 'B', credit: 2, score: 80, term: '2026年春季学期' }),   // 3.0
    c({ name: 'C', credit: 3, score: 70, term: '2025年秋季学期' }),   // 2.0（68-71 档）
    c({ name: 'D', credit: 5, score: 60 })                             // 没学期 → 不进趋势
  ]
  const r = byTerm(list)
  assert.equal(r.length, 2, '只有填了学期的两个学期进趋势')
  assert.equal(r[0].term, '2025年秋季学期', '应按时间升序')
  assert.equal(r[1].term, '2026年春季学期')
  assert.equal(r[1].short, '26春')
  assert.equal(r[1].credit, 6)
  assert.equal(r[1].count, 2)
  assert.equal(r[1].avg, round((4 * 90 + 2 * 80) / 6))
  assert.equal(r[1].gpa, round((4 * 4.0 + 2 * 3.0) / 6))
  assert.equal(r[0].gpa, 2.0, '70 分落在 68-71 档 → 2.0')
  assert.equal(r[1].failedCount, 0)
})

check('trendSeries：绩点 / 加权分两种口径 + 空数据安全', () => {
  const list = [
    c({ name: 'A', credit: 4, score: 90, term: '2026年春季学期' }),
    c({ name: 'C', credit: 3, score: 70, term: '2025年秋季学期' })
  ]
  const g = trendSeries(list, 'gpa')
  assert.deepEqual(g.labels, ['25秋', '26春'])
  assert.deepEqual(g.data, [2.0, 4.0])
  assert.equal(g.terms.length, 2)
  const a = trendSeries(list, 'avg')
  assert.deepEqual(a.data, [70, 90])
  const empty = trendSeries([], 'gpa')
  assert.deepEqual(empty.labels, [])
  assert.deepEqual(empty.data, [])
})

check('导出/导入：学期随备份一起往返', () => {
  const list = [c({ name: '高数', credit: 5, score: 88, term: '2026年秋季学期' })]
  const text = exportCourses(list, DEFAULT_GPA_BANDS, { app: 'QDU-Nav', version: '1.7.8' })
  const back = importCourses(text)
  assert.equal(back.ok, true)
  assert.equal(back.courses[0].term, '2026年秋季学期', '学期必须跟着备份走')
})

console.log(failed ? `\n${failed} 项失败` : '\n全部通过')
process.exit(failed ? 1 : 0)
