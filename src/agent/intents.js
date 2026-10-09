/**
 * 意图识别（本地推理 · 可解释 · 零外部依赖）
 * ---------------------------------------------------------------------------
 * 三层识别，按序短路：
 *   ① 意图表精确/包含匹配（加权打分，返回命中得分供 UI 展示"识别置信度"）
 *   ② FAQ 知识库（可溯源问答）
 *   ③ 应用检索 searchApps（兜底直达应用）
 * 每条意图带 kind：workflow（办事）/ app（直达）/ faq（问答）/ meta（元能力）。
 */
import { matchFaq } from './faq.js'
import { searchApps } from '../data/searchIndex.js'

export const INTENTS = [
  // ── 元能力 ──────────────────────────────────────────────
  {
    id: 'meta.help', kind: 'meta', title: '能力说明',
    patterns: ['你能做什么', '你会什么', '能干什么', '有什么功能', '怎么用', '帮助', '使用说明', 'help', '你能干嘛'],
    reply: '我可以替你办事：查空教室、看通知、找课表、推荐吃什么、加日程、跳转VPN/官网……直接说出需求即可，例如"哪里有空教室"。每条回答都可溯源，涉及写入的操作会先请你确认。'
  },
  {
    id: 'meta.greet', kind: 'meta', title: '打招呼',
    patterns: ['你好', '您好', '嗨', '哈喽', '在吗', '在么', 'hello', 'hi', '早上好', '晚上好', '下午好'],
    reply: '你好！我是校园智能体，说出需求就能办事——试试"明天有什么课"或"今天吃什么"。'
  },
  {
    id: 'meta.thanks', kind: 'meta', title: '致谢',
    patterns: ['谢谢', '感谢', '多谢', '辛苦了', 'thanks', 'thank you'],
    reply: '不客气，随时找我。'
  },

  // ── 工作流（办事） ─────────────────────────────────────
  {
    id: 'wf.emptyRoom', kind: 'workflow', wf: 'findRoom', title: '空教室速查',
    patterns: ['空教室', '自习室', '哪里自习', '自习去哪', '找间教室', '找教室', '没课的教室', '哪间教室空', '教室空闲', '有空教室吗']
  },
  {
    id: 'wf.notice', kind: 'workflow', wf: 'todayNotice', title: '最新通知',
    patterns: ['有什么通知', '最新通知', '教务通知', '看通知', '通知列表', '最近的通知', '出了什么通知', '校园动态']
  },
  {
    id: 'wf.searchNotice', kind: 'workflow', wf: 'searchNotice', title: '搜索通知',
    patterns: ['查一下通知', '搜索通知', '搜通知', '找通知', '有没有关于']
  },
  {
    id: 'wf.tomorrow', kind: 'workflow', wf: 'dayClass', title: '某天的课',
    patterns: ['明天上什么', '明天的课', '明天有什么课', '明天上课', '今天上什么', '今天的课', '后天上什么', '哪天有课', '我有什么课', '上什么课']
  },
  {
    id: 'wf.eat', kind: 'workflow', wf: 'whatEat', title: '今天吃什么',
    patterns: ['吃什么', '今天吃啥', '吃啥', '晚饭吃什么', '午饭吃什么', '早餐吃什么', '推荐吃的', '吃什么好', '去哪吃']
  },
  {
    id: 'wf.canteen', kind: 'workflow', wf: 'canteenStatus', title: '食堂空座',
    patterns: ['食堂', '空座位', '空座', '人多吗', '就餐高峰', '吃饭人多', '食堂人']
  },
  {
    id: 'wf.addSchedule', kind: 'workflow', wf: 'addSchedule', title: '加入日程',
    patterns: ['提醒我', '加日程', '加个日程', '记个日程', '记一下', '安排一下', '备忘', '待办', '帮我记着', '设个提醒']
  },
  {
    id: 'wf.mySchedule', kind: 'workflow', wf: 'mySchedule', title: '我的日程',
    patterns: ['我的日程', '日程安排', '看日程', '接下来要做什么', '我安排了什么', '有什么安排']
  },
  {
    id: 'wf.service', kind: 'workflow', wf: 'jumpService', title: '服务直达',
    patterns: ['vpn', 'VPN', '织网', '知网', '校外访问', '下载资源', '论文下载', '图书馆入口', '办事大厅', '邮箱']
  },
  {
    id: 'wf.courseQuery', kind: 'workflow', wf: 'courseQuery', title: '课程查询',
    patterns: ['查课表', '查课程', '谁教的', '哪门课', '某个班', '查班级', '查老师', '课程查询', '查老师课表']
  },
  {
    id: 'wf.campusNav', kind: 'workflow', wf: 'campusNav', title: '校内导航',
    patterns: ['怎么去', '怎么走', '带我去', '导航到', '路线', '在哪里怎么走', '怎么到达']
  },
  {
    id: 'wf.setClass', kind: 'workflow', wf: 'setClass', title: '设置班级',
    patterns: ['我是哪个班', '设置班级', '我的班级', '记住我的班级', '班级是']
  },
  {
    id: 'wf.wiki', kind: 'workflow', wf: 'wikiAsk', title: '百科问答',
    patterns: ['百科', 'wiki', 'Wiki', '查百科', '翻百科', '手册里']
  },
  {
    id: 'wf.briefing', kind: 'workflow', wf: 'dailyBriefing', title: '每日简报',
    patterns: ['今日简报', '每日简报', '今天有什么', '今天有什么事', '今日概览', '今天安排', '今天的事', '今日提醒', '早上好要做什么', '今天什么安排', '简报']
  },
  {
    id: 'wf.wallPost', kind: 'workflow', wf: 'wallPost', title: '发校园墙',
    patterns: ['发墙', '发到墙', '校园墙发帖', '发个帖子', '墙上发', '我要吐槽', '墙说', '发帖']
  },
  {
    id: 'wf.timeNow', kind: 'workflow', wf: 'timeNow', title: '时间日期',
    patterns: ['现在几点', '今天星期几', '几号了', '今天日期', '现在时间', '几月几号']
  },
  {
    id: 'wf.wallView', kind: 'workflow', wf: 'wallView', title: '看校园墙',
    patterns: ['看校园墙', '逛墙', '校园墙上有什么', '热门帖子', '最新帖子', '刷墙']
  },
  {
    id: 'wf.agentBoard', kind: 'workflow', wf: 'agentBoard', title: '协作看板',
    patterns: ['协作看板', '看板', '数据看板', '运营数据', '后台数据', '双agent', '飞轮', '运行统计']
  },
  { id: 'wf.wallSearch', kind: 'workflow', wf: 'wallSearch', title: '搜索校园墙', patterns: ['搜墙', '搜索校园墙', '墙上搜', '搜帖子', '墙上有没有', '找帖子', '搜一下校园墙'] },
  { id: 'wf.myPoints', kind: 'workflow', wf: 'myPoints', title: '我的积分', patterns: ['我的积分', '积分多少', '积分明细', '看积分', '钱包', '多少积分', '积分余额'] },
  { id: 'wf.signIn', kind: 'workflow', wf: 'signIn', title: '每日签到', patterns: ['签到', '每日签到', '打个卡', '打卡'] },
  { id: 'wf.lostFound', kind: 'workflow', wf: 'lostFound', title: '失物招领', patterns: ['发失物', '失物招领', '寻物启事', '我丢了', '捡到东西', '丢了东西', '丢东西', '丢了'] },
  { id: 'wf.bountyPost', kind: 'workflow', wf: 'bountyPost', title: '发起悬赏', patterns: ['发悬赏', '悬赏求助', '发起悬赏', '赏金求助', '悬赏一下'] },
  { id: 'wf.resourceShare', kind: 'workflow', wf: 'resourceShare', title: '分享资源', patterns: ['分享资源', '发资源', '分享链接', '共享资料', '分享个资料'] },
  { id: 'wf.hotTopics', kind: 'workflow', wf: 'hotTopics', title: '话题热词', patterns: ['话题热词', '热词', '大家在聊什么', '热门话题', '讨论热度', '最近热什么'] },
  { id: 'wf.reportFeedback', kind: 'workflow', wf: 'reportFeedback', title: '提交反馈', patterns: ['提交反馈', '提个建议', '我要反馈', '反馈一下', '提建议', '意见反馈', '我要提bug', '提个bug'] },
  { id: 'wf.taskChain', kind: 'workflow', wf: 'taskChain', title: '任务链', patterns: ['任务链', '跑任务链', '晨间组合', '学习组合', '生活组合', '连续执行', '一口气'] },
  { id: 'wf.helpGuide', kind: 'workflow', wf: 'helpGuide', title: '使用指南', patterns: ['使用指南', '能力地图', '你能干嘛', '功能清单', '会什么', '教我用', '怎么用你', '使用说明', '功能列表'] },
  { id: 'wf.jobHunt', kind: 'workflow', wf: 'jobHunt', title: '找实习', patterns: ['找实习', '实习', '找工作', '勤工俭学', '兼职', '投简历', '岗位推荐', '有什么兼职', '想打工'] },
  { id: 'wf.activitySignup', kind: 'workflow', wf: 'activitySignup', title: '活动报名', patterns: ['活动报名', '报名活动', '有什么活动', '讲座', '比赛报名', '招新', '志愿者报名', '参加活动'] },
  { id: 'wf.fixReport', kind: 'workflow', wf: 'fixReport', title: '宿舍报修', patterns: ['报修', '宿舍坏了', '灯坏了', '水龙头', '修东西', '找人修', '空调坏了', '门锁坏了', '报修宿舍'] },

  // ── 应用直达 ───────────────────────────────────────────
  { id: 'app.reminder', kind: 'app', app: 'reminder', title: '提醒中心', patterns: ['提醒中心', '定时提醒', '看提醒', '闹钟', '提醒列表'] },
  { id: 'app.insights', kind: 'app', app: 'insights', title: '社区洞察', patterns: ['社区洞察', '数据可视化', '趋势图', '评论趋势', '图表看板'] },
  { id: 'app.rebrand', kind: 'app', app: 'rebrand', title: '换校向导', patterns: ['换校向导', '换学校预览', '品牌预览', '主题试穿', '怎么换校'] },
  { id: 'app.timetable', kind: 'app', app: 'timetable', title: '课程表', patterns: ['课表', '课程表', '看课表'] },
  { id: 'app.calendar', kind: 'app', app: 'calendar', title: '校历', patterns: ['校历', '放假安排', '什么时候放假', '寒假', '暑假', '教学周'] },
  { id: 'app.budget', kind: 'app', app: 'budget', title: '记账', patterns: ['记账', '记一笔', '花了多少钱', '账单', '生活费管理'] },
  { id: 'app.physical', kind: 'app', app: 'physicalTest', title: '体测', patterns: ['体测', '体测成绩', '跑步成绩', '体质测试'] },
  { id: 'app.official', kind: 'app', app: 'officialSites', title: '学校官网', patterns: ['官网', '学校网站', '学院官网', '官方网站'] },
  { id: 'app.studentId', kind: 'app', app: 'studentId', title: '学号查询', patterns: ['查学号', '我的学号', '新生学号', '录取查询'] },
  { id: 'app.stats', kind: 'app', app: 'courseStats', title: '数据洞察', patterns: ['数据统计', '排课统计', '课程分析', '热度分析'] },
  { id: 'app.quiz', kind: 'app', app: 'quiz', title: '知识问答', patterns: ['答题', '知识竞赛', '校史问答', '来一局'] },
  { id: 'app.tieba', kind: 'app', app: 'tiebaSentiment', title: '贴吧舆情', patterns: ['贴吧', '青大吧', '热帖', '论坛'] },
  { id: 'app.siteStats', kind: 'app', app: 'siteStats', title: '访问统计', patterns: ['访问统计', '访客', '流量统计'] },
  { id: 'app.contributors', kind: 'app', app: 'contributors', title: '贡献者', patterns: ['贡献者', '开发者', '更新日志'] },
  { id: 'app.categories', kind: 'app', app: 'categories', title: '全部应用', patterns: ['全部应用', '所有应用', '应用列表', '更多应用'] },
  { id: 'app.jobs', kind: 'app', app: 'jobs', title: '招聘求职', patterns: ['招聘', '求职', '岗位', '就业', '双选会', '校招'] },
  { id: 'app.compare', kind: 'app', app: 'compare', title: '为什么选我', patterns: ['为什么选你', '和豆包区别', '对比', '优势', '和官网区别', '小程序区别'] },
  { id: 'app.flywheel', kind: 'app', app: 'flywheel', title: '协作飞轮', patterns: ['飞轮', '协作看板详情', '维护进展', 'AI贡献'] },
  { id: 'app.transplant', kind: 'app', app: 'transplant', title: '换校移植', patterns: ['换校移植', '移植看板', '复制到别的学校', '开分站'] },
  { id: 'app.profile', kind: 'app', app: 'profile', title: '我的画像', patterns: ['我的画像', '画像', '了解我', '个性化', '我的标签'] }
]

/** 归一化：去标点、降噪 */
function normalize(s) {
  return (s || '').toLowerCase().replace(/[？?！!。，,、.;；:：~～"'"“”‘’（）()\s]/g, '').trim()
}

/**
 * 意图匹配：返回 { intent, score } | null
 * 打分：全等 100 · 包含 60+len*2 · 被包含 40+len*3；取最高分，阈值 40。
 */
export function matchIntent(text) {
  const t = normalize(text)
  if (!t) return null
  let best = null
  let bestScore = 0
  for (const it of INTENTS) {
    let score = 0
    for (const p of it.patterns) {
      const pl = normalize(p)
      if (!pl) continue
      if (t === pl) score = Math.max(score, 100)
      else if (t.includes(pl)) score = Math.max(score, 60 + pl.length * 2)
      else if (pl.includes(t) && t.length >= 2) score = Math.max(score, 40 + t.length * 3)
    }
    if (score > bestScore) { bestScore = score; best = it }
  }
  return bestScore >= 40 ? { intent: best, score: bestScore } : null
}

/** 三层识别主入口：意图表 → FAQ → 应用检索 */
export function recognize(text) {
  const hit = matchIntent(text)
  if (hit) return { layer: 'intent', score: hit.score, ...hit }
  const faq = matchFaq(text)
  if (faq) return { layer: 'faq', score: 75, faq }
  const apps = searchApps(text)
  if (apps.length && apps[0].score >= 4) return { layer: 'app', score: Math.min(95, 50 + apps[0].score * 3), app: apps[0].app, apps: apps.slice(0, 4) }
  return { layer: 'none', score: 0 }
}
