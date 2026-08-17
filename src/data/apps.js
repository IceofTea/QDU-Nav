/**
 * 应用注册表（单一数据源）
 * ---------------------------------------------------------------------------
 * 首页应用网格与「应用分类」面板都从本数组渲染。
 * 新增一个应用页面：
 *   1. 在 src/views/ 新建视图组件（接收 @open / @back 事件）
 *   2. 在本文件追加一项 { id, title, desc, icon, color, group, link }
 *   3. 在 src/router.js 的 VIEWS 注册表中登记 id → 组件
 * 详见 README「二次开发：新增应用」。
 */
export const apps = [
  { id: 'officialSites', title: '学校官网', desc: '青岛大学官方网站与各学院官网大全', icon: '🏛️', color: '#7c3aed', group: '服务', link: '#/app/officialSites' },
  { id: 'campusNews', title: '校园动态', desc: '教务处官方通知与动态实时同步', icon: '📢', color: '#e11d48', group: '学习', link: '#/app/campusNews' },
  { id: 'calendar', title: '校历', desc: '查看每学期校历与放假安排', icon: '📅', color: '#f43f5e', group: '学习', link: '#/app/calendar' },
  { id: 'classroomNav', title: '教室导航', desc: '实时空教室查询、教室占用表与分步路线', icon: '🧭', color: '#b63a46', group: '学习', link: '#/app/classroomNav' },
  { id: 'physicalTest', title: '体测成绩计算器', desc: '保存并计算大一到大四体测成绩', icon: '💪', color: '#0f766e', group: '健康', link: '#/app/physicalTest' },
  { id: 'budget', title: '生活费计数器', desc: '收支随手记，月底不吃土 · 支持奖学金收入', icon: '🧮', color: '#0e7490', group: '生活', link: '#/app/budget' },
  { id: 'studentId', title: '新生学号查询', desc: '凭录取信息查询本人学号', icon: '🪪', color: '#0284c7', group: '新生', link: '#/app/studentId' },
  { id: 'canteen', title: '食堂空座率', desc: '各食堂实时空座人数与就餐高峰提示', icon: '🍽️', color: '#ea580c', group: '生活', link: '#/app/canteen' },
  { id: 'whatToEat', title: '今天吃什么', desc: '是啊，吃什么', icon: '🍜', color: '#e76f51', group: '生活', link: '#/app/whatToEat' },
  { id: 'foodWheel', title: '美食轮盘', desc: '食堂美食转盘，随机抽一个开吃', icon: '🎡', color: '#d97706', group: '游戏', link: '#/app/foodWheel' },
  { id: 'quiz', title: '青大知多少', desc: '青大知识问答小游戏，测测你的校史功底', icon: '🎯', color: '#8b5cf6', group: '游戏', link: '#/app/quiz' },
  { id: 'buildingMatch', title: '教学楼速配', desc: '翻牌配对教学楼新旧名称，测测你的记忆', icon: '🧩', color: '#0f766e', group: '游戏', link: '#/app/buildingMatch' },
  { id: 'leaderTest', title: '校领导测试', desc: '测出你像哪位青岛大学校领导', icon: '🎓', color: '#7c3aed', group: '游戏', link: '#/app/leaderTest' },
  { id: 'timetable', title: '课程表', desc: '查看班级、教室与教师课表，支持预览下学期', icon: '🗓️', color: '#1b66c9', group: '学习', link: '#/app/timetable' },
  { id: 'courseStats', title: '数据洞察', desc: '从近7学期5万条排课看教室/教师/课程热度', icon: '📊', color: '#0f766e', group: '学习', link: '#/app/courseStats' },
  { id: 'tiebaSentiment', title: '贴吧舆情', desc: '青岛大学吧热帖与话题舆情分析', icon: '📣', color: '#1677ff', group: '生活', link: '#/app/tiebaSentiment' },
  { id: 'siteStats', title: '本站舆情', desc: '独立访客、访问趋势、设备来源与热门应用', icon: '📊', color: '#0891b2', group: '服务', link: '#/app/siteStats' },
  { id: 'contributors', title: '贡献者墙', desc: '词云致敬每一位代码贡献者', icon: '🏆', color: '#0f766e', group: '服务', link: '#/app/contributors' }
]

export const appGroups = ['学习', '新生', '健康', '服务', '生活', '游戏']

export const campusStats = {
  campuses: 3,
  colleges: 28,
  majors: 90,
  apps: apps.length
}