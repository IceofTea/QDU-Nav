/**
 * 空教室 / 教室导航视图级单测：node scripts/test_classroom.mjs
 *
 * 覆盖三层：
 *  ① 纯函数层（utils/classroom.js）——教室归楼栋、占用判定、占用表、空教室结果归一化、分组排序；
 *  ② 静态数据层（data/classrooms.js）——楼栋/楼层/教室清单结构自洽（无重名、无空楼层、校区字段齐全）；
 *  ③ 真实课表交叉验证——用 t0.json 的真实 rows 反推「某天某节空闲教室」，
 *     校验与 occupancyMap 的结果自洽（避免线上出现「明明有课却说空闲」这类口径错位）。
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  buildOfRoom, occupies, occupancyMap, summarizeEmpty, groupByBuilding, normRoomName
} from '../src/utils/classroom.js'
import { buildings, searchRooms } from '../src/data/classrooms.js'
import { normRoom } from '../src/utils/course.js'

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

const B = [{ name: '博远楼' }, { name: '博学楼' }, { name: '浮山校区' }]

check('buildOfRoom：优先按楼名前缀，退回首个数字前', () => {
  assert.equal(buildOfRoom('博远楼303', B), '博远楼')
  assert.equal(buildOfRoom('博学楼105', B), '博学楼')
  assert.equal(buildOfRoom('博远楼201（智慧）', B), '博远楼', '带（智慧）后缀也要归对楼')
  assert.equal(buildOfRoom('未知楼999', B), '未知楼', '匹配不到就取数字前部分')
  assert.equal(buildOfRoom('ABCDEF', B), 'ABCDEF', '没有数字就原样返回')
  assert.equal(buildOfRoom('', B), '')
  assert.equal(buildOfRoom(null, B), '')
  assert.equal(buildOfRoom('博远楼303', []), '博远楼', '楼栋表为空也不能崩')
})

check('occupies：同一天同一节才占；跨节取并集区间', () => {
  const row = { d: 3, s: 3, e: 4 }
  assert.equal(occupies(row, 3, 3), true)
  assert.equal(occupies(row, 3, 4), true)
  assert.equal(occupies(row, 3, 5), false)
  assert.equal(occupies(row, 3, 2), false)
  assert.equal(occupies(row, 4, 3), false, '别的星期不算')
  assert.equal(occupies({ d: 3, s: 4, e: 3 }, 3, 3), true, '节次写反也要能判')
  assert.equal(occupies({ d: 3, s: 4, e: 3 }, 3, 4), true, '写反时按小→大区间（3..4）')
  assert.equal(occupies({ d: 3, s: 4, e: 3 }, 3, 5), false, '第 5 节不在 3..4 区间内')
  assert.equal(occupies(null, 1, 1), false)
  assert.equal(occupies({}, 1, 1), false)
  assert.equal(occupies({ d: '', s: 1, e: 2 }, 1, 1), false, '脏数据不算占用')
  assert.equal(occupies(row, 3, 'x'), false, '节次非数字不算占用')
})

check('occupancyMap：同一教室多门课只算一个占用', () => {
  const rows = [
    { d: 1, s: 1, e: 2, r: '博远楼303' },
    { d: 1, s: 1, e: 2, r: '博远楼303（智慧）' },
    { d: 1, s: 1, e: 1, r: '博学楼105' },
    { d: 2, s: 1, e: 1, r: '博学楼105' }
  ]
  const m = occupancyMap(rows, 1, 1)
  assert.equal(m.size, 2, '应只有 2 个教室被占')
  assert.equal(m.get('博远楼303'), 2, '同一教室的两门课分别计数')
  assert.equal(m.get('博学楼105'), 1)
  assert.equal(occupancyMap([], 1, 1).size, 0)
  assert.equal(occupancyMap(null, 1, 1).size, 0)
})

check('summarizeEmpty：脏返回体归一化，绝不产出 NaN', () => {
  const good = summarizeEmpty({ day: 1, period: 3, total: 100, emptyCount: 60, rooms: ['博远楼303', '博学楼105'] })
  assert.equal(good.ok, true)
  assert.equal(good.total, 100)
  assert.equal(good.emptyCount, 60)
  assert.deepEqual(good.rooms, ['博远楼303', '博学楼105'])

  const missingCounts = summarizeEmpty({ day: 2, period: 5, rooms: ['A1', '  ', null, 'B2'] })
  assert.equal(missingCounts.total, 2, 'total 缺失回落到实际条数（空串已被过滤）')
  assert.equal(missingCounts.emptyCount, 2)
  assert.deepEqual(missingCounts.rooms, ['A1', 'B2'])

  const bad = summarizeEmpty({ day: 9, period: 0 })
  assert.equal(bad.ok, false, '星期/节次越界应判为不可用')
  assert.equal(summarizeEmpty(null).ok, false)
  assert.equal(summarizeEmpty({}).rooms.length, 0)
  assert.equal(summarizeEmpty('垃圾').ok, false)
  assert.ok(!Number.isNaN(summarizeEmpty({}).emptyCount))
})

check('groupByBuilding：按楼栋分组，组内外都稳定排序', () => {
  const g = groupByBuilding(['博学楼105', '博远楼303', '博远楼101', '', null], B)
  assert.equal(g.length, 2, '空串/空值应被丢弃')
  assert.deepEqual(g.map((x) => x[0]), ['博学楼', '博远楼'])
  assert.deepEqual(g.find((x) => x[0] === '博远楼')[1], ['博远楼101', '博远楼303'])
  assert.deepEqual(groupByBuilding([], B), [])
  assert.deepEqual(groupByBuilding(null, B), [])
})

/* ── ② 静态数据层 ─────────────────────────────────────── */

check('classrooms.js：楼栋/楼层/教室结构自洽', () => {
  assert.ok(Array.isArray(buildings) && buildings.length > 0, '楼栋表为空')
  const names = new Set()
  let floorCount = 0
  let roomCount = 0
  for (const b of buildings) {
    assert.ok(b && typeof b.name === 'string' && b.name, '楼栋缺少 name')
    assert.ok(!names.has(b.name), '楼栋重名：' + b.name)
    names.add(b.name)
    assert.ok(b.campus, '楼栋缺少 campus：' + b.name)
    assert.ok(Array.isArray(b.floors) && b.floors.length, '楼栋缺少楼层：' + b.name)
    for (const f of b.floors) {
      assert.ok(Array.isArray(f.rooms) && f.rooms.length, '楼层没有教室：' + b.name)
      floorCount++
      for (const r of f.rooms) {
        assert.equal(typeof r, 'string', '教室名必须是字符串')
        assert.ok(r.trim(), '存在空教室名：' + b.name)
        roomCount++
      }
    }
  }
  assert.ok(floorCount > 10, '楼层数过少：' + floorCount)
  assert.ok(roomCount > 100, '教室数过少：' + roomCount)
})

check('classrooms.js：searchRooms 关键字与校区筛选可用', () => {
  const all = searchRooms('')
  assert.ok(all.length > 0, '空关键字应返回全部楼栋')
  const one = buildings[0]
  const hit = searchRooms(one.name)
  assert.ok(hit.some((b) => b.name === one.name), '按楼名搜不到自己：' + one.name)
  const noHit = searchRooms('这个楼栋肯定不存在zzz')
  assert.equal(noHit.length, 0, '不存在的关键字应返回空')
})

/* ── ③ 真实课表交叉验证 ─────────────────────────────── */

let rows = []
try {
  const T0 = path.join(ROOT, 'public', 'data', 'terms', 't0.json')
  rows = (JSON.parse(fs.readFileSync(T0, 'utf8')).rows) || []
} catch (e) {
  console.error('! 读不到 t0.json：' + e.message)
}

check('真实课表：能反推「空闲教室」且与占用表口径一致', () => {
  assert.ok(rows.length > 1000, '课表行数过少：' + rows.length)
  const day = 2
  const period = 5
  const used = occupancyMap(rows, day, period)
  assert.ok(used.size > 0, `第 ${day} 天第 ${period} 节应有课在排`)
  // 空闲 = 「课表里出现过的教室全集」−「当节被占用的教室」。
  // 注意基准不能用 classrooms.js 的楼层清单：那里房间号是不带楼名的 '101'，
  // 而课表用的是 '博学楼208' 全名，两者命名体系不同（这也是本用例要长期守住的口径）。
  const all = new Set(rows.map((r) => normRoomName(r.r)).filter(Boolean))
  const free = [...all].filter((r) => !used.has(r))
  assert.ok(all.size > used.size, '占用教室数不应等于全部教室数：' + used.size + '/' + all.size)
  assert.ok(free.length > 0, '该节次不应一个空教室都没有')
  assert.ok(free.length < all.size, '不可能全部空闲')
  for (const r of free.slice(0, 30)) {
    assert.equal(used.has(r), false, '空闲教室不应出现在占用表：' + r)
  }
})

check('真实课表：教学楼归属率足够高（分组不至于全落进兜底桶）', () => {
  const sample = rows.map((r) => normRoom(r.r)).filter(Boolean).slice(0, 2000)
  const named = sample.filter((r) => {
    const g = buildOfRoom(r, buildings)
    return buildings.some((b) => b.name === g)
  })
  const rate = named.length / sample.length
  assert.ok(rate > 0.5, `课表教室能归入楼栋表的比例过低：${(rate * 100).toFixed(1)}%`)
})

console.log(failed ? `\n${failed} 项失败` : '\n全部通过')
process.exit(failed ? 1 : 0)