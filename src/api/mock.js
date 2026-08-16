import { classes, semesters } from '../data/timetable'
import { foods, halls } from '../data/foods'

const delay = (ms) => new Promise(r => setTimeout(r, ms))

export const dataMeta = {
  updatedAt: '2026-08-16 15:20',
  source: '内置示例数据（可对接 crawler/ 爬虫后端实时更新）'
}

export async function apiGetTimetables() {
  await delay(450)
  return {
    data: { classes, semesters },
    meta: { classCount: classes.length, updatedAt: dataMeta.updatedAt }
  }
}

export async function apiLookupStudentId({ kaoshenghao, name, idLast6 }) {
  await delay(900)
  if (!kaoshenghao || !name || !idLast6) {
    return { ok: false, msg: '请完整填写考生号、姓名与证件号后 6 位' }
  }
  if (kaoshenghao.length !== 14) {
    return { ok: false, msg: '考生号应为 14 位数字' }
  }
  if (idLast6.length !== 6) {
    return { ok: false, msg: '证件号后 6 位应为 6 位' }
  }
  const seed = kaoshenghao.slice(-6)
  const hash = seed.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  const collegeSeq = String((hash % 35) + 1).padStart(2, '0')
  const personSeq = String((hash * 7) % 100).padStart(2, '0')
  const sid = `2026${collegeSeq}${personSeq}${seed.slice(-2)}`
  return { ok: true, sid, name, college: '计算机科学技术学院', major: '计算机科学与技术' }
}

export async function apiGetFoods() {
  await delay(300)
  return { data: { foods, halls }, meta: { foodCount: foods.length, hallCount: halls.length, updatedAt: dataMeta.updatedAt } }
}

export async function apiGetCampusMeta() {
  await delay(250)
  return { data: dataMeta }
}