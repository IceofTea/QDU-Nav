/**
 * 应用注册表（单一数据源）
 * 首页应用网格与「应用分类」面板都从本数组渲染。
 */
export const apps = [
  { id: 'officialSites', title: '学校官网', titleEn: 'University Portal', desc: '青岛大学官方网站与各学院官网大全', descEn: 'Official QDU website and all college portals', icon: '🏛️', color: '#7c3aed', group: '服务', groupEn: 'Services' },
  { id: 'campusNews', title: '校园动态', titleEn: 'Campus News', desc: '教务处官方通知与动态实时同步', descEn: 'Real-time Academic Affairs Office notices', icon: '📢', color: '#e11d48', group: '学习', groupEn: 'Study' },
  { id: 'calendar', title: '校历', titleEn: 'Calendar', desc: '查看每学期校历与放假安排', descEn: 'View academic calendar & holidays', icon: '📅', color: '#f43f5e', group: '学习', groupEn: 'Study' },
  { id: 'classroomNav', title: '教室导航', titleEn: 'Room Navigator', desc: '实时空教室查询、教室占用表与分步路线', descEn: 'Find empty rooms, schedules & directions', icon: '🧭', color: '#b63a46', group: '学习', groupEn: 'Study' },
  { id: 'physicalTest', title: '体测成绩计算器', titleEn: 'PE Test Calculator', desc: '保存并计算大一到大四体测成绩', descEn: 'Calculate PE test scores Year 1-4', icon: '💪', color: '#0f766e', group: '健康', groupEn: 'Health' },
  { id: 'budget', title: '生活费计数器', titleEn: 'Budget Tracker', desc: '收支随手记，月底不吃土 · 支持奖学金收入', descEn: 'Track income & expenses easily', icon: '🧮', color: '#0e7490', group: '生活', groupEn: 'Life' },
  { id: 'studentId', title: '新生学号查询', titleEn: 'Student ID Lookup', desc: '凭录取信息查询本人学号', descEn: 'Look up student ID from admission info', icon: '🪪', color: '#0284c7', group: '新生', groupEn: 'Newcomer' },
  { id: 'canteen', title: '食堂空座率', titleEn: 'Cafeteria Status', desc: '各食堂实时空座人数与就餐高峰提示', descEn: 'Real-time seating & peak hours', icon: '🍽️', color: '#ea580c', group: '生活', groupEn: 'Life' },
  { id: 'whatToEat', title: '今天吃什么', titleEn: 'What to Eat', desc: '是啊，吃什么', descEn: "Can't decide? Let us pick!", icon: '🍜', color: '#e76f51', group: '生活', groupEn: 'Life' },
  { id: 'foodWheel', title: '美食轮盘', titleEn: 'Food Wheel', desc: '食堂美食转盘，随机抽一个开吃', descEn: 'Spin the wheel for today\'s meal', icon: '🎡', color: '#d97706', group: '游戏', groupEn: 'Games' },
  { id: 'quiz', title: '青大知多少', titleEn: 'QDU Quiz', desc: '青大知识问答小游戏，测测你的校史功底', descEn: 'Test your knowledge of QDU', icon: '🎯', color: '#8b5cf6', group: '游戏', groupEn: 'Games' },
  { id: 'buildingMatch', title: '教学楼速配', titleEn: 'Building Match', desc: '翻牌配对教学楼新旧名称，测测你的记忆', descEn: 'Match old & new building names', icon: '🧩', color: '#0f766e', group: '游戏', groupEn: 'Games' },
  { id: 'leaderTest', title: '校领导测试', titleEn: 'Leader Personality Test', desc: '测出你像哪位青岛大学校领导', descEn: 'Which QDU leader are you most like?', icon: '🎓', color: '#7c3aed', group: '游戏', groupEn: 'Games' },
  { id: 'timetable', title: '课程表', titleEn: 'Timetable', desc: '查看班级、教室与教师课表，支持预览下学期', descEn: 'View class, room & teacher schedules', icon: '🗓️', color: '#1b66c9', group: '学习', groupEn: 'Study' },
  { id: 'courseStats', title: '数据洞察', titleEn: 'Course Insights', desc: '从近7学期5万条排课看教室/教师/课程热度', descEn: 'Analytics from 7 semesters of course data', icon: '📊', color: '#0f766e', group: '学习', groupEn: 'Study' },
  { id: 'tiebaSentiment', title: '贴吧舆情', titleEn: 'Tieba Sentiment', desc: '青岛大学吧热帖与话题舆情分析', descEn: 'Sentiment analysis from QDU Tieba', icon: '📣', color: '#1677ff', group: '生活', groupEn: 'Life' },
  { id: 'siteStats', title: '本站舆情', titleEn: 'Site Analytics', desc: '独立访客、访问趋势、设备来源与热门应用', descEn: 'Visitors, trends, devices & popular apps', icon: '📊', color: '#0891b2', group: '服务', groupEn: 'Services' },
  { id: 'contributors', title: '贡献者墙', titleEn: 'Contributors', desc: '词云致敬每一位代码贡献者', descEn: 'A word cloud honoring our contributors', icon: '🏆', color: '#0f766e', group: '服务', groupEn: 'Services' }
]

export const appGroups = ['学习', '新生', '健康', '服务', '生活', '游戏']
export const appGroupsEn = ['Study', 'Newcomer', 'Health', 'Services', 'Life', 'Games']

export const groupColors = {
  学习: '#1b66c9',
  新生: '#0284c7',
  健康: '#0f766e',
  服务: '#7c3aed',
  生活: '#ea580c',
  游戏: '#d97706'
}

export const campusStats = {
  campuses: 3,
  colleges: 28,
  majors: 90,
  apps: apps.length
}
