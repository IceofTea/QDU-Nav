/**
 * 全局搜索索引（单一数据源）
 * ---------------------------------------------------------------------------
 * 每个应用三层可检索文本：
 * - keywords  别名 / 同义词（如「课表」「空教室」「记账」）
 * - content   应用内核心功能点（让搜索直达应用内的能力）
 * - title/desc apps.js 基础字段
 * 匹配按权重求和排序：标题3 > 别名全等2.5/包含2 > 简介1.5 > 功能点1，
 * 多关键词空格拆分、全部命中才保留（AND），返回 { app, score, hits }。
 */
import { apps } from './apps'

const EXTRA = {
  officialSites: {
    keywords: ['官网', '网址', '教务处', '邮箱', '图书馆', '学院网站', 'portal', '办事大厅', '新媒体', '微博', '抖音', 'b站'],
    content: ['学校官网入口', '28 个学院官网', '校园邮箱助手', '网上办事大厅', '官方新媒体矩阵'],
  },
  campusNews: {
    keywords: ['通知', '公告', '动态', '教务通知', '新闻'],
    content: ['教务处通知列表', '工作动态', '通知详情查看'],
  },
  calendar: {
    keywords: ['校历', '放假', '寒假', '暑假', '开学', '教学周', '学期', '节假日'],
    content: ['学期校历预览', '放假安排时间线', '教学周查询', '教务处校历原文'],
  },
  classroomNav: {
    keywords: ['空教室', '自习', '教室', '上课地点', '教学楼', '占用', '路线', '导航'],
    content: ['空教室实时查询', '教室一周占用表', '教学楼教室检索', '分步路线指引'],
  },
  physicalTest: {
    keywords: ['体测', '跑步', '八百米', '一千米', '立定跳远', '肺活量', '体质', '成绩计算'],
    content: ['体测单项得分计算', '大一到大四记录保存', '总分等级评定'],
  },
  budget: {
    keywords: ['记账', '生活费', '花钱', '账单', '收支', '消费', '存钱', '奖学金', '微信账单', '支付宝账单', '建行', '专业版', '预算'],
    content: ['随手记账与批量录入', '微信支付宝建行账单导入', '生活费模拟与预算分配器', '收支日历与商户排行', 'Excel导出与成就墙'],
  },
  studentId: {
    keywords: ['学号', '新生', '录取', '查询学号', '考生号'],
    content: ['凭录取信息查学号', '新生报到指引'],
  },
  canteen: {
    keywords: ['食堂', '空座', '人多吗', '吃饭', '就餐', '高峰', '营业时间'],
    content: ['各食堂实时空座人数', '就餐高峰提示', '食堂营业时间'],
  },
  whatToEat: {
    keywords: ['吃什么', '吃饭', '美食推荐', '随机', '选择困难'],
    content: ['按校区筛选菜品', '随机推荐今天吃什么'],
  },
  foodWheel: {
    keywords: ['轮盘', '转盘', '随机', '抽奖', '吃什么', '食堂'],
    content: ['食堂美食转盘随机抽取'],
  },
  quiz: {
    keywords: ['问答', '答题', '校史', '知识', '测试', '题库', '排行榜'],
    content: ['青大知识题库问答', '错题回顾与本机排行'],
  },
  buildingMatch: {
    keywords: ['配对', '翻牌', '记忆', '新旧楼名', '游戏', '速配'],
    content: ['教学楼新旧名称配对挑战'],
  },
  leaderTest: {
    keywords: ['校领导', '人格测试', '趣味测试', '校长'],
    content: ['35题多维人格比对', '测你像哪位校领导'],
  },
  timetable: {
    keywords: ['课表', '课程表', '上课时间', '周次', '下学期', '班级课表', '教师课表', '教室课表'],
    content: ['班级教师教室三视图', '周视图与列表视图', '课程详情弹窗', '预览下学期排课'],
  },
  courseStats: {
    keywords: ['数据', '统计', '热度', '洞察', '排课', '课程分析', '教师热度'],
    content: ['教室教师课程热度排行', '近7学期5万条排课统计', '课程性质校区学院分布'],
  },
  tiebaSentiment: {
    keywords: ['贴吧', '舆情', '热帖', '论坛', '讨论', '青大吧'],
    content: ['青岛大学吧热帖榜', '关键词话题分布', '14天发帖趋势'],
  },
  siteStats: {
    keywords: ['访问统计', '访客', 'uv', 'pv', '流量', '来源', '点赞榜'],
    content: ['独立访客与访问趋势', '设备系统来源分布', '热门应用与点赞榜'],
  },
  contributors: {
    keywords: ['贡献者', '开发者', '致谢', '版本历史', '更新日志'],
    content: ['代码贡献者词云', '社区贡献记录与版本历史'],
  },
}

/** 应用 id → 检索文档 */
export const searchDocs = apps.map((a) => ({
  ...a,
  keywords: EXTRA[a.id]?.keywords || [],
  content: EXTRA[a.id]?.content || [],
}))

/**
 * 检索：支持多关键词（空格拆分，全部需命中），
 * 返回 { app, score, hits[] } 按 score 降序。
 */
export function searchApps(query) {
  const q = query.trim().toLowerCase()
  if (!q) return searchDocs.map((app) => ({ app, score: 0, hits: [] }))
  const terms = q.split(/\s+/).filter(Boolean)
  const results = []
  for (const app of searchDocs) {
    let total = 0
    const hits = []
    let allMatched = true
    for (const t of terms) {
      let s = 0
      let hitLabel = ''
      if (app.title.toLowerCase().includes(t)) { s += 3; hitLabel = app.title }
      const kw = app.keywords.find((k) => k.toLowerCase().includes(t))
      if (kw) { s += kw.toLowerCase() === t ? 2.5 : 2; hitLabel = hitLabel || kw }
      if (app.desc.toLowerCase().includes(t)) { s += 1.5; hitLabel = hitLabel || t }
      const ct = app.content.find((c) => c.toLowerCase().includes(t))
      if (ct) { s += 1; hitLabel = hitLabel || ct }
      if (s === 0) { allMatched = false; break }
      total += s
      if (hitLabel && !hits.includes(hitLabel)) hits.push(hitLabel)
    }
    if (allMatched && total > 0) results.push({ app, score: total, hits: hits.slice(0, 3) })
  }
  return results.sort((a, b) => b.score - a.score)
}
