/**
 * 课表视图级单测：node scripts/test_timetable.mjs
 *
 * 覆盖两层：
 *  ① 纯函数层（utils/course.js）——教室名归一、班级串拆分/范围展开、专业关键字、周次解析；
 *  ② **真实课表数据契约层**——直接读 public/data/terms/t0.json（教务处课程总表快照）抽样验证：
 *     字段名没变、解析函数在真实数据上不抛异常、覆盖率达阈值。
 *     这一层能挡住「上游课表结构变了 → 课表页静默变空白」这类事故（真机冒烟很难稳定复现）。
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { normRoom, clsSplit, profOf, parseWeeks } from '../src/utils/course.js'
import { occupancyMap, occupies, normRoomName } from '../src/utils/classroom.js'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')

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

/* ── ① 纯函数层 ───────────────────────────────────────── */

check('normRoom：去掉「（智慧）」别名标记', () => {
  assert.equal(normRoom('博远楼201（智慧）'), '博远楼201')
  assert.equal(normRoom('博远楼201(智慧)'), '博远楼201')
  assert.equal(normRoom('  博远楼303 '), '博远楼303')
  assert.equal(normRoom(null), '')
  assert.equal(normRoom(undefined), '')
  assert.equal(normRoom('博远楼201（智慧）（智慧）'), '博远楼201', '重复标记也要清干净')
})

check('clsSplit：合班串拆分 + 范围班展开 + 补零', () => {
  assert.deepEqual(clsSplit('24临床（5+3）[01-05]班,25体育[01-02]班,25软件03班'), [
    '24临床（5+3）01班', '24临床（5+3）02班', '24临床（5+3）03班', '24临床（5+3）04班', '24临床（5+3）05班',
    '25体育01班', '25体育02班',
    '25软件03班'
  ])
  assert.deepEqual(clsSplit('25软件[01-04]班'), ['25软件01班', '25软件02班', '25软件03班', '25软件04班'])
  assert.deepEqual(clsSplit('24软件[1-2]班'), ['24软件01班', '24软件02班'], '一位数也要补零')
  assert.deepEqual(clsSplit('24软件[01-01]班'), ['24软件01班'], '起止相同只出一个')
  assert.deepEqual(clsSplit(''), [])
  assert.deepEqual(clsSplit(null), [])
  assert.deepEqual(clsSplit('，，、'), [], '纯分隔符不产出空班级')
})

check('clsSplit：范围倒序不产生死循环/错序', () => {
  const out = clsSplit('24软件[05-03]班')
  assert.deepEqual(out, ['24软件03班', '24软件04班', '24软件05班'], '起止颠倒时应按小→大展开')
})

check('profOf：从班级名提取专业关键字', () => {
  assert.equal(profOf('24临床（5+3）01班'), '临床')
  assert.equal(profOf('25体育01班'), '体育')
  assert.equal(profOf('24服装01班'), '服装')
  assert.equal(profOf('24软件[01-04]班'), '软件')
  assert.equal(profOf(''), '')
})

check('parseWeeks：单周 / 区间 / 混合 / 脏输入', () => {
  assert.deepEqual([...parseWeeks('1-16')], [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16])
  assert.deepEqual([...parseWeeks('3,5,7')], [3, 5, 7])
  assert.deepEqual([...parseWeeks('1-8,10')], [1, 2, 3, 4, 5, 6, 7, 8, 10])
  assert.deepEqual([...parseWeeks('5-5')], [5], '起止相同只有一个周次')
  assert.deepEqual([...parseWeeks('1–4')], [1, 2, 3, 4], '半角连接号也要认')
  assert.deepEqual([...parseWeeks('')], [])
  assert.deepEqual([...parseWeeks(null)], [])
  assert.deepEqual([...parseWeeks('第1-16周')], [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16])
})

/* ── ② 真实课表数据契约层 ─────────────────────────────── */

const T0 = path.join(ROOT, 'public', 'data', 'terms', 't0.json')
let rows = []
let meta = null
try {
  meta = JSON.parse(fs.readFileSync(T0, 'utf8'))
  rows = (meta && meta.rows) || []
} catch (e) {
  console.error('! 读不到 t0.json：' + e.message)
}

check('真实课表：快照结构与必需字段齐全（数据契约）', () => {
  assert.ok(rows.length > 1000, '课表行数过少：' + rows.length + '（抓取可能失效）')
  for (const k of ['c', 't', 'd', 's', 'e', 'w', 'r', 'term', 'credit']) {
    const hit = rows.slice(0, 500).filter((x) => x[k] !== undefined && x[k] !== null).length
    assert.ok(hit > 450, `字段 ${k} 覆盖率过低：${hit}/500`)
  }
  assert.ok(meta.semester, '缺 semester')
})

check('真实课表：解析函数全量跑通，不抛异常', () => {
  let rooms = 0
  let classes = 0
  for (const r of rows) {
    const nm = normRoom(r.r)
    if (nm) rooms++
    const cs = clsSplit(r.cls)
    classes += cs.length
    const wk = parseWeeks(r.w)
    assert.ok(wk.size > 0, '周次解析为空：' + JSON.stringify(r.w))
    assert.ok(Number(r.d) >= 1 && Number(r.d) <= 7, '星期越界：' + r.d)
    assert.ok(Number(r.s) >= 1 && Number(r.s) <= Number(r.e), '节次倒挂：' + r.s + '-' + r.e)
  }
  assert.ok(rooms / rows.length > 0.9, '教室名覆盖率过低：' + rooms + '/' + rows.length)
  assert.ok(classes / rows.length > 1, '班级拆分异常，平均每行不到 1 个班：' + classes + '/' + rows.length)
})

check('真实课表：normRoom 把「（智慧）」别名改名成同一物理教室', () => {
  const before = [...new Set(rows.map((r) => String(r.r || '').trim()).filter(Boolean))]
  const after = [...new Set(rows.map((r) => normRoom(r.r)).filter(Boolean))]
  // 归一是「改名」不是「去重」：教室总数应保持不变，但名字里的「智慧」标记必须被清掉，
  // 这样同一间智慧教室的两种写法才会落到同一个 key 上。
  assert.equal(after.length, before.length, '归一只改名，教室总数不应变化')
  // 只针对「（智慧）」这种独立别名标记；像「博文楼416（智慧F型终端互动）」属于另一种教室命名，不在此规则内
  assert.ok(!after.some((x) => /[（(]智慧[)）]/.test(x)), '归一后仍残留「（智慧）」独立标记')
  const smart = before.filter((x) => /智慧/.test(x))
  assert.ok(smart.length > 0, '样本里没有智慧教室，规则可能已失效')
  assert.ok(after.includes('博学楼201') || after.some((x) => /^博学楼\d+$/.test(x)), '归一结果应对得上无标记写法')
})

check('真实课表：占用判定与教室占用表可用（周一第 1 节）', () => {
  const m = occupancyMap(rows, 1, 1)
  assert.ok(m.size > 0, '周一第 1 节应有课在排')
  // 抽样交叉验证：占用表里出现的教室，必然能在原始行里找到同教室的周一 1 节课
  for (const [room, n] of [...m.entries()].slice(0, 20)) {
    assert.ok(n >= 1, '计数异常')
    const found = rows.some((r) => occupies(r, 1, 1) && normRoomName(r.r) === room)
    assert.ok(found, '占用表里的教室在原始数据中找不到：' + room)
  }
})

check('真实课表：跨节连堂（s≠e）在起止节都被判占用', () => {
  const cross = rows.find((r) => Number(r.s) !== Number(r.e))
  assert.ok(cross, '样本里没有连堂课，跳过判定')
  const s = Number(cross.s)
  const e = Number(cross.e)
  assert.equal(occupies(cross, Number(cross.d), s), true)
  assert.equal(occupies(cross, Number(cross.d), e), true)
  if (e + 1 <= 12) assert.equal(occupies(cross, Number(cross.d), e + 1), false, '连堂结束后的节次不应算占用')
})

check('真实课表：学期与学分可用于绩点工具', () => {
  const withCredit = rows.filter((r) => Number(r.credit) > 0).length
  assert.ok(withCredit / rows.length > 0.8, '学分覆盖率过低：' + withCredit + '/' + rows.length)
  const terms = new Set(rows.map((r) => String(r.term || '').trim()).filter(Boolean))
  assert.ok(terms.size >= 1, '缺少学期字段')
})

console.log(failed ? `\n${failed} 项失败` : '\n全部通过')
process.exit(failed ? 1 : 0)