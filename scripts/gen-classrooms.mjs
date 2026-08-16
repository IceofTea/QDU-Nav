// 从 snapshot 真实排课数据生成 classrooms.js 的 buildings（楼层/房间全部真实）
// 运行：node scripts/gen-classrooms.mjs
import fs from 'node:fs'
import path from 'node:path'

const snap = JSON.parse(fs.readFileSync(new URL('../public/data/snapshot.json', import.meta.url), 'utf8'))
const normRoom = (r) => (r || '').replace(/[（(]智慧[)）]/g, '').trim()

// 楼名 -> 校区/区域 元信息（alias 为新旧名称对应，据青大办字〔2006〕24号命名方案）
const META = {
  博学楼: { campus: '浮山校区', zone: '西院', alias: '原西1教' },
  博文楼: { campus: '浮山校区', zone: '西院', alias: '原西2教' },
  博观楼: { campus: '浮山校区', zone: '西院', alias: '原西3教' },
  博知楼: { campus: '浮山校区', zone: '西院', alias: '原西4教' },
  博远楼: { campus: '浮山校区', zone: '西院', alias: '原西5教' },
  博逸楼: { campus: '浮山校区', zone: '西院', alias: '原西6教' },
  博雅楼: { campus: '浮山校区', zone: '西院', alias: '原基础医学楼' },
  慎行楼: { campus: '浮山校区', zone: '西院' },
  '西院1教': { campus: '浮山校区', zone: '西院', alias: '即博学楼' },
  '西院2教': { campus: '浮山校区', zone: '西院', alias: '即博文楼' },
  '西院2号实验楼': { campus: '浮山校区', zone: '西院' },
  '西院3号实验楼': { campus: '浮山校区', zone: '西院' },
  德音楼: { campus: '浮山校区', zone: '北院（师范学院）', alias: '北院教学楼' },
  德雅楼: { campus: '浮山校区', zone: '北院（师范学院）' },
  德晖楼: { campus: '浮山校区', zone: '北院（师范学院）', alias: '北院实验楼' },
  静思楼1号: { campus: '浮山校区', zone: '东院', alias: '原东9教' },
  静思楼2号: { campus: '浮山校区', zone: '东院', alias: '原东10教' },
  静思楼3号: { campus: '浮山校区', zone: '东院', alias: '原东11教' },
  东1教: { campus: '浮山校区', zone: '东院', alias: '即睿思楼' },
  东2教: { campus: '浮山校区', zone: '东院', alias: '即学思楼' },
  东3教: { campus: '浮山校区', zone: '东院', alias: '即慎思楼' },
  东12教: { campus: '浮山校区', zone: '东院' },
  浩园1教: { campus: '浮山校区', zone: '浮山苑', alias: '浩园1号' },
  图文中心: { campus: '浮山校区', zone: '东院' },
  东院实验楼: { campus: '浮山校区', zone: '东院' },
  东院图书馆: { campus: '浮山校区', zone: '东院' },
  纺织实验楼: { campus: '浮山校区', zone: '东院' },
  文化艺术楼C座: { campus: '浮山校区', zone: '东院' },
  行思楼: { campus: '浮山校区', zone: '东院', alias: '原东4教' },
  科技研发中心A: { campus: '金家岭校区', zone: '东院' },
  教学楼: { campus: '金家岭校区', zone: '西院' },
  '1号教学楼': { campus: '金家岭校区', zone: '西院' },
  实验楼: { campus: '金家岭校区', zone: '西院' },
  品正楼: { campus: '金家岭校区', zone: '东院' },
  敏正楼: { campus: '金家岭校区', zone: '东院' },
  行正楼: { campus: '金家岭校区', zone: '东院' },
  松山校区营养楼: { campus: '松山校区', zone: '' }
}

const BUILDINGS = Object.keys(META)

// 未出现在课程总表但真实存在的教学楼（社区整理楼层分布，标注非排课数据）
const EXTRA = [
  { name: '1号教学楼', campus: '金家岭校区', zone: '西院', desc: '金家岭西院主教学楼（官方名称：1号教学楼）', floors: [
    { floor: '1F', rooms: ['101', '102', '103', '112', '117', '118'] },
    { floor: '2F', rooms: ['201', '202', '203', '205', '206', '208'] },
    { floor: '3F', rooms: ['301', '302', '303', '305', '306', '308', '310'] }
  ] },
  { name: '实验楼', campus: '金家岭校区', zone: '西院', desc: '金家岭实验教学集中区（官方名称：实验楼），多为机房与实训教室', floors: [
    { floor: '1F', rooms: ['101', '102'] },
    { floor: '2F', rooms: ['201', '202', '203', '205'] },
    { floor: '3F', rooms: ['301', '302', '303', '304'] },
    { floor: '4F', rooms: ['401', '402', '403', '410'] }
  ] },
  { name: '品正楼', campus: '金家岭校区', zone: '东院', desc: '金家岭东院教学楼（官方名称：品正楼），紧邻图书馆', floors: [
    { floor: '1F', rooms: ['101', '102', '103'] },
    { floor: '2F', rooms: ['201', '202', '203', '204', '205', '206', '208'] },
    { floor: '3F', rooms: ['301', '302', '303', '305', '306', '308', '310'] }
  ] },
  { name: '敏正楼', campus: '金家岭校区', zone: '东院', desc: '金家岭东院办公与教学楼，出国留学培训基地在 107 室', floors: [
    { floor: '1F', rooms: ['107（留学培训基地）'] },
    { floor: '2F', rooms: ['办公区'] }
  ] },
  { name: '行正楼', campus: '金家岭校区', zone: '东院', desc: '金家岭东院教学楼，招生办公在 202 室', floors: [
    { floor: '2F', rooms: ['202（招生办公）'] }
  ] },
  { name: '办公楼', campus: '金家岭校区', zone: '东院', desc: '金家岭校区学生事务大厅与保卫处在一楼', floors: [
    { floor: '1F', rooms: ['学生事务大厅', '保卫处'] }
  ] }
]

// 分类：把每个教室归入楼
const roomsByBuild = {}
for (const raw of new Set(snap.rows.map((r) => r.r).filter(Boolean))) {
  const room = normRoom(raw)
  if (!room) continue
  // 运动场/线上/自行安排 过滤
  if (/田径场|篮球场|排球场|网球场|足球场|羽毛球馆|健美操|瑜伽|舞蹈|健身房|乒乓球|轮滑|线上|自行安排|体育馆|奥帆|体操|实验室$/.test(room)) continue
  const build = BUILDINGS.find((b) => room.startsWith(b))
  if (!build) continue
  if (!roomsByBuild[build]) roomsByBuild[build] = new Set()
  roomsByBuild[build].add(room)
}

// 生成 buildings
const buildings = [
  ...EXTRA.map((b) => ({
    ...b,
    mapUrl: 'https://www.amap.com/search?query=' + encodeURIComponent(`青岛大学${b.campus}${b.name}`),
    nearby: [],
    route: []
  })),
  ...Object.entries(roomsByBuild)
  .map(([name, roomSet]) => {
    const meta = META[name]
    // 楼层分组：提取房间号数字（去掉楼名前缀）
    const floorsMap = {}
    for (const r of roomSet) {
      const num = r.slice(name.length).replace(/[-－]/g, '-').trim()
      const m = num.match(/^(\d{1,2})/)
      if (m) {
        const floor = m[1].length === 1 ? m[1] + 'F' : m[1][0] + 'F'
        if (!floorsMap[floor]) floorsMap[floor] = new Set()
        floorsMap[floor].add(num)
      }
    }
    const floors = Object.entries(floorsMap)
      .sort((a, b) => a[0].localeCompare(b[0], 'en', { numeric: true }))
      .map(([floor, rooms]) => ({ floor, rooms: [...rooms].sort((a, b) => a.localeCompare(b, 'en', { numeric: true })) }))
    const allRooms = [...roomSet].length
    return {
      name,
      campus: meta.campus,
      zone: meta.zone,
      desc: `${meta.campus}${meta.zone}排课教学楼，覆盖 ${allRooms} 间教室（据教务处课程总表 ${snap.courseTables.length} 个学期并集，含 ${snap.courseTable.semester}）${meta.alias ? ' · ' + meta.alias : ''}`,
      mapUrl: 'https://www.amap.com/search?query=' + encodeURIComponent(`青岛大学${meta.campus}${name}`),
      nearby: [],
      route: [],
      floors
    }
  })
  .sort((a, b) => a.campus.localeCompare(b.campus, 'zh') || a.zone.localeCompare(b.zone, 'zh'))
]

const out = `// 楼宇与教室数据由 scripts/gen-classrooms.mjs 从教务处真实课程总表生成（${snap.courseTable.semester}）
// 楼名对应校区区域参考学校文化标识系统；route 为通用指引，请以校园实地指示为准
export const buildings = ${JSON.stringify(buildings, null, 2)}

export const campusFilters = ['全部', '浮山校区', '金家岭校区', '松山校区']

export function searchRooms(keyword) {
  const k = keyword.trim()
  return buildings.filter((b) => {
    if (!k) return true
    const kw = k.replace(/\\s/g, '')
    const hitName = b.name.replace(/\\s/g, '').includes(kw)
    const hitCampus = b.campus.includes(k)
    const hitZone = b.zone.includes(k)
    const hitRoom = b.floors.some((f) => f.rooms.some((r) => r.includes(k)))
    return hitName || hitCampus || hitZone || hitRoom
  })
}
`
fs.writeFileSync(new URL('../src/data/classrooms.js', import.meta.url), out)
console.log(`generated ${buildings.length} buildings`)
for (const b of buildings) console.log(`  ${b.campus} ${b.zone} ${b.name} (${b.floors.length} 层)`)