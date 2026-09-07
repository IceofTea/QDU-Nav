/**
 * QDU-Nav 各页面新手引导步骤定义
 */

/** 首页引导（4步） */
export const homeTour = [
  { target: '[data-tour="search"]', title: '搜索框', content: '输入关键词快速找到应用，如"奖学金""记账"，支持模糊匹配。', placement: 'bottom', icon: '🔍' },
  { target: '[data-tour="app-grid"]', title: '应用中心', content: '点击卡片打开各种校园应用，涵盖学习、生活、健康等分类。', placement: 'top', icon: '📱' },
  { target: '[data-tour="bottom-nav"]', title: '快捷导航', content: '底部导航栏一键直达常用功能，当前页面会高亮。', placement: 'top', icon: '🧭' },
  { target: '[data-tour="tour-btn"]', title: '重新查看引导', content: '随时点击这个 ❓ 按钮重新查看新手引导。', placement: 'bottom', icon: '💡' }
]

/** 教室导航引导（3步） */
export const classroomNavTour = [
  { target: '.view-top', title: '返回首页', content: '点击这里可以随时返回首页。', placement: 'bottom', icon: '🏠' },
  { target: '[data-tour="classroom-search"]', title: '空教室查询', content: '选择时间段，输入楼宇名称，一键查询空闲教室。', placement: 'bottom', icon: '🔍' },
  { target: '[data-tour="classroom-result"]', title: '查看结果', content: '点击教室可查看一周占用情况，数据来自教务处课程总表。', placement: 'top', icon: '📊' }
]

/** 生活费计数器引导（4步） */
export const budgetTour = [
  { target: '[data-tour="budget-sub"]', title: '三种记账模式', content: '计数器（日常记账）、生活费模拟（规划预算）、专业版（高级分析）。', placement: 'bottom', icon: '🔄' },
  { target: '[data-tour="budget-category"]', title: '选择类别', content: '先选支出/收入，再选具体类别，支持奖学金预设一键带出金额。', placement: 'bottom', icon: '🏷️' },
  { target: '.input-row', title: '记录金额', content: '输入金额和日期，点击「记入」保存。支持批量记账，数据仅存本地。', placement: 'top', icon: '💰' },
  { target: '[data-tour="budget-chart"]', title: '统计与导入', content: '查看月度收支图表、趋势分析。支持导入微信/支付宝账单。', placement: 'top', icon: '📈' }
]

/** 体测成绩计算器引导（2步） */
export const physicalTestTour = [
  { target: '[data-tour="pt-year"]', title: '选择年级', content: '选择要记录的年级，大一到大四数据分开保存。', placement: 'bottom', icon: '📅' },
  { target: '[data-tour="pt-result"]', title: '成绩评级', content: '输入成绩后自动计算总分和等级，数据保存在本地。', placement: 'top', icon: '🏆' }
]

/** 校园动态引导（2步） */
export const campusNewsTour = [
  { target: '[data-tour="news-tabs"]', title: '内容分类', content: '在教务通知、教学动态之间切换。', placement: 'bottom', icon: '📑' },
  { target: '[data-tour="news-filter"]', title: '关键词过滤', content: '输入关键词快速筛选新闻内容。', placement: 'bottom', icon: '🔍' }
]

/** 校历引导（2步） */
export const calendarTour = [
  { target: '[data-tour="cal-mode"]', title: '学期选择', content: '选择要查看的学期，当前学期默认高亮。', placement: 'bottom', icon: '📅' },
  { target: '[data-tour="cal-preview"]', title: '图片预览', content: '点击图片可全屏预览，支持缩放和拖动。', placement: 'top', icon: '🖼️' }
]

/** 学校官网引导（2步） */
export const officialSitesTour = [
  { target: '[data-tour="sites-featured"]', title: '常用网站', content: '高亮显示的是最常用的学校网站，一键直达。', placement: 'bottom', icon: '⭐' },
  { target: '[data-tour="sites-colleges"]', title: '学院官网', content: '所有学院官网一览，点击即可跳转。', placement: 'top', icon: '🏛️' }
]

/** 食堂空座率引导（2步） */
export const canteenTour = [
  { target: '[data-tour="canteen-live"]', title: '实时数据', content: '显示各食堂当前空座人数，绿色表示空位多。', placement: 'bottom', icon: '📊' },
  { target: '[data-tour="canteen-peak"]', title: '就餐高峰', content: '查看各时段就餐高峰，避开拥挤时段。', placement: 'top', icon: '⏰' }
]

/** 课程表引导（2步） */
export const timetableTour = [
  { target: '.view-top', title: '返回首页', content: '点击这里可以随时返回首页。', placement: 'bottom', icon: '🏠' },
  { target: '.panel', title: '查询课程', content: '输入班级、教室或教师姓名，快速查询课程安排。', placement: 'bottom', icon: '🔍' }
]

/** 今天吃什么引导（2步） */
export const whatToEatTour = [
  { target: '.view-top', title: '返回首页', content: '点击这里可以随时返回首页。', placement: 'bottom', icon: '🏠' },
  { target: '.panel', title: '饮食推荐', content: '选择校区、餐次和预算，获取食堂档口推荐。', placement: 'bottom', icon: '🍽️' }
]

/** 美食轮盘引导（1步） */
export const foodWheelTour = [
  { target: '.view-top', title: '美食轮盘', content: '点击转盘随机选择今天吃什么，解决选择困难症！', placement: 'bottom', icon: '🎡' }
]

/** 数据洞察引导（2步） */
export const courseStatsTour = [
  { target: '.view-top', title: '返回首页', content: '点击这里可以随时返回首页。', placement: 'bottom', icon: '🏠' },
  { target: '.panel', title: '排课统计', content: '查看近学期排课数据、热门教室和教师统计。', placement: 'bottom', icon: '📊' }
]

/** 贴吧舆情引导（2步） */
export const tiebaSentimentTour = [
  { target: '.view-top', title: '返回首页', content: '点击这里可以随时返回首页。', placement: 'bottom', icon: '🏠' },
  { target: '.panel', title: '热门话题', content: '查看青岛大学吧最热门的帖子和讨论。', placement: 'bottom', icon: '🔥' }
]

/** 新生学号查询引导（2步） */
export const studentIdTour = [
  { target: '.view-top', title: '返回首页', content: '点击这里可以随时返回首页。', placement: 'bottom', icon: '🏠' },
  { target: '.panel', title: '查询学号', content: '输入录取通知书编号或身份证号，一键查询学号。', placement: 'bottom', icon: '🎓' }
]

/** 贡献者墙引导（1步） */
export const contributorsTour = [
  { target: '.view-top', title: '贡献者墙', content: '词云展示所有贡献者，点击可查看详细贡献内容。', placement: 'bottom', icon: '👥' }
]

/** 应用分类引导（2步） */
export const categoriesTour = [
  { target: '.view-top', title: '返回首页', content: '点击这里可以随时返回首页。', placement: 'bottom', icon: '🏠' },
  { target: '.group-list', title: '应用分组', content: '按学习、新生、健康、服务、生活、游戏分类浏览。', placement: 'top', icon: '📂' }
]

/** 校史问答引导（1步） */
export const quizTour = [
  { target: '.view-top', title: '校史问答', content: '测试你对青大的了解程度，答对得分！', placement: 'bottom', icon: '🎮' }
]

/** 教学楼速配引导（1步） */
export const buildingMatchTour = [
  { target: '.view-top', title: '教学楼速配', content: '翻开卡片配对教学楼的新旧名称，考验记忆力！', placement: 'bottom', icon: '🃏' }
]

/** 校领导测试引导（1步） */
export const leaderTestTour = [
  { target: '.view-top', title: '校领导测试', content: '回答几个问题，看看你最像哪位校领导！', placement: 'bottom', icon: '🧩' }
]

/** 本站舆情引导（2步） */
export const siteStatsTour = [
  { target: '.view-top', title: '返回首页', content: '点击这里可以随时返回首页。', placement: 'bottom', icon: '🏠' },
  { target: '.panel', title: '访问统计', content: '查看本站各应用的访问量、点赞数等统计数据。', placement: 'bottom', icon: '📊' }
]

/** 所有引导映射 */
export const tourMap = {
  home: homeTour,
  classroomNav: classroomNavTour,
  budget: budgetTour,
  physicalTest: physicalTestTour,
  campusNews: campusNewsTour,
  calendar: calendarTour,
  officialSites: officialSitesTour,
  canteen: canteenTour,
  timetable: timetableTour,
  whatToEat: whatToEatTour,
  foodWheel: foodWheelTour,
  courseStats: courseStatsTour,
  tiebaSentiment: tiebaSentimentTour,
  studentId: studentIdTour,
  contributors: contributorsTour,
  categories: categoriesTour,
  quiz: quizTour,
  buildingMatch: buildingMatchTour,
  leaderTest: leaderTestTour,
  siteStats: siteStatsTour
}

/** 获取某个页面的引导步骤 */
export function getTourSteps(pageId) {
  return tourMap[pageId] || null
}
