export const apps = [
  { id: 'campusNews', title: '校园动态', desc: '教务处官方通知与动态实时同步', icon: '📢', color: '#e11d48', group: '学习', link: '#/app/campusNews' },
  { id: 'timetable', title: '课程表', desc: '查看班级、教室与教师课表，支持预览下学期', icon: '🗓️', color: '#1b66c9', group: '学习', link: '#/app/timetable' },
  { id: 'calendar', title: '校历', desc: '查看每学期校历与放假安排', icon: '📅', color: '#f43f5e', group: '学习', link: '#/app/calendar' },
  { id: 'classroomNav', title: '教室导航', desc: '实时空教室查询、教室占用表与分步路线', icon: '🧭', color: '#b63a46', group: '学习', link: '#/app/classroomNav' },
  { id: 'canteen', title: '食堂空座率', desc: '各食堂实时空座人数与就餐高峰提示', icon: '🍽️', color: '#ea580c', group: '生活', link: '#/app/canteen' },
  { id: 'studentId', title: '新生学号查询', desc: '凭录取信息查询本人学号', icon: '🪪', color: '#0284c7', group: '新生', link: '#/app/studentId' },
  { id: 'physicalTest', title: '体测成绩计算器', desc: '保存并计算大一到大四体测成绩', icon: '💪', color: '#0f766e', group: '健康', link: '#/app/physicalTest' },
  { id: 'officialSites', title: '学校官网', desc: '青岛大学官方网站与各学院官网大全', icon: '🏛️', color: '#7c3aed', group: '服务', link: '#/app/officialSites' },
  { id: 'whatToEat', title: '今天吃什么', desc: '是啊，吃什么', icon: '🍜', color: '#e76f51', group: '生活', link: '#/app/whatToEat' },
  { id: 'quiz', title: '青大知多少', desc: '青大知识问答小游戏，测测你的校史功底', icon: '🎯', color: '#8b5cf6', group: '游戏', link: '#/app/quiz' },
  { id: 'foodWheel', title: '美食轮盘', desc: '食堂美食转盘，随机抽一个开吃', icon: '🎡', color: '#d97706', group: '游戏', link: '#/app/foodWheel' }
]

export const appGroups = ['学习', '新生', '健康', '服务', '生活', '游戏']

export const campusStats = {
  campuses: 3,
  colleges: 28,
  majors: 90,
  apps: apps.length,
  statsNote: '数据来源：青岛大学官网《学校简介》，截至 2026 年'
}