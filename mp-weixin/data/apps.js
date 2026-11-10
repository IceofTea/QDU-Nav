// 文件路径: /qdu-nav/mp-weixin/data/apps.js
// 全量应用网格：与网站 src/data/apps.js 注册表一一对应（36 个）。
// 全部复制网页版链接打开。
const APP_GROUPS = [
  {
    group: "服务",
    apps: [
      { id: "assistant", title: "智能助手", icon: "🤖", color: "#1b66c9", url: "/#/assistant", desc: "说一句话就能办事：查课表、找空教室、加日程、直达服务" },
      { id: "jobs", title: "求职招聘", icon: "💼", color: "#b45309", url: "/#/jobs", desc: "勤工俭学/实习岗位 + 画像匹配 + 活动报名" },
      { id: "officialSites", title: "学校官网", icon: "🏛️", color: "#7c3aed", url: "/#/officialSites", desc: "青岛大学官方网站与各学院官网大全" },
      { id: "skills", title: "技能市场", icon: "🧩", color: "#2563eb", url: "/#/skills", desc: "27 条工作流卡片化：分类搜索、使用统计、一键运行" },
      { id: "data", title: "数据管家", icon: "🗄️", color: "#0f766e", url: "/#/data", desc: "网关地址一键切线上版 + 本机备份恢复 + 存储用量" },
    ],
  },
  {
    group: "学习",
    apps: [
      { id: "timetable", title: "课程表", icon: "🗓️", color: "#1b66c9", url: "/#/timetable", desc: "查看班级、教室与教师课表，支持预览下学期" },
      { id: "importer", title: "课表导入器", icon: "📥", color: "#0f766e", url: "/#/importer", desc: "粘贴课表即解析存本机，解锁免班级查课表" },
      { id: "classroomNav", title: "教室导航", icon: "🧭", color: "#b63a46", url: "/#/classroomNav", desc: "实时空教室查询、教室占用表与分步路线" },
      { id: "calendar", title: "校历", icon: "📅", color: "#f43f5e", url: "/#/calendar", desc: "查看每学期校历与放假安排" },
      { id: "focus", title: "番茄钟", icon: "🍅", color: "#e11d48", url: "/#/focus", desc: "经典/深度/冲刺三预设 + 艾宾浩斯复习排期" },
      { id: "campusNews", title: "校园动态", icon: "📢", color: "#e11d48", url: "/#/campusNews", desc: "教务处官方通知与动态实时同步" },
      { id: "gpa", title: "绩点计算器", icon: "📈", color: "#0f766e", url: "/#/gpa", desc: "录入学分与成绩，算加权平均与 4.0 绩点；可按目标反推还需多少分" },
      { id: "buildingGallery", title: "楼宇图鉴", icon: "🏢", color: "#b63a46", url: "/#/buildingGallery", desc: "真实排课数据生成：楼层房间格子图，点房查占用" },
      { id: "courseStats", title: "数据洞察", icon: "📊", color: "#0f766e", url: "/#/courseStats", desc: "从近7学期5万条排课看教室/教师/课程热度" },
    ],
  },
  {
    group: "新生",
    apps: [
      { id: "studentId", title: "新生学号查询", icon: "🪪", color: "#0284c7", url: "/#/studentId", desc: "凭录取信息查询本人学号" },
    ],
  },
  {
    group: "健康",
    apps: [
      { id: "physicalTest", title: "体测成绩计算器", icon: "💪", color: "#0f766e", url: "/#/physicalTest", desc: "保存并计算大一到大四体测成绩" },
    ],
  },
  {
    group: "生活",
    apps: [
      { id: "reminder", title: "提醒中心", icon: "⏰", color: "#d97706", url: "/#/reminder", desc: "定时提醒引擎：页内弹窗+桌面通知+提示音，与智能体日程打通" },
      { id: "canteen", title: "食堂空座率", icon: "🍽️", color: "#ea580c", url: "/#/canteen", desc: "各食堂实时空座人数与就餐高峰提示" },
      { id: "whatToEat", title: "今天吃什么", icon: "🍜", color: "#e76f51", url: "/#/whatToEat", desc: "是啊，吃什么" },
      { id: "budget", title: "生活费计数器", icon: "🧮", color: "#0e7490", url: "/#/budget", desc: "收支随手记，月底不吃土 · 支持奖学金收入" },
      { id: "campusWall", title: "校园墙", icon: "🧱", color: "#ea580c", url: "/#/campusWall", desc: "发帖吐槽、失物招领、求助美食，匿名互动全员可见" },
      { id: "messages", title: "站内私信", icon: "💬", color: "#7c3aed", url: "/#/messages", desc: "点对点私聊：会话草稿保留、未读提醒、联系人推荐" },
      { id: "tiebaSentiment", title: "贴吧舆情", icon: "📣", color: "#1677ff", url: "/#/tiebaSentiment", desc: "青岛大学吧热帖与话题舆情分析" },
    ],
  },
  {
    group: "游戏",
    apps: [
      { id: "foodWheel", title: "美食轮盘", icon: "🎡", color: "#d97706", url: "/#/foodWheel", desc: "食堂美食转盘，随机抽一个开吃" },
      { id: "quiz", title: "青大知多少", icon: "🎯", color: "#8b5cf6", url: "/#/quiz", desc: "青大知识问答小游戏，测测你的校史功底" },
      { id: "buildingMatch", title: "教学楼速配", icon: "🧩", color: "#0f766e", url: "/#/buildingMatch", desc: "翻牌配对教学楼新旧名称，测测你的记忆" },
      { id: "leaderTest", title: "校领导测试", icon: "🎓", color: "#7c3aed", url: "/#/leaderTest", desc: "测出你像哪位青岛大学校领导" },
    ],
  },
  {
    group: "关于",
    apps: [
      { id: "rebrand", title: "换校向导", icon: "🔁", color: "#7c3aed", url: "/#/rebrand", desc: "一键换校可视化：品牌实时预览、9 套主题、导出配置脚本直改" },
      { id: "transplant", title: "换校移植", icon: "🔁", color: "#0e7490", url: "/#/transplant", desc: "3 插槽 + 工作流可移植矩阵 + 两校验证" },
      { id: "compare", title: "为什么选我", icon: "⚔️", color: "#b91c1c", url: "/#/compare", desc: "vs 官网/小程序/通用大模型三段对比 + 防御问答" },
      { id: "flywheel", title: "协作飞轮", icon: "🔄", color: "#6d28d9", url: "/#/flywheel", desc: "双 Agent 可视化 + AI 治理日报 + 争议选题" },
      { id: "insights", title: "社区洞察", icon: "📈", color: "#0f766e", url: "/#/insights", desc: "评论趋势、分区占比、热词与治理健康度的可视化看板" },
      { id: "profile", title: "我的画像", icon: "🧬", color: "#7c3aed", url: "/#/profile", desc: "学院技能画像 + 行为可解释 + 推送预览" },
      { id: "siteStats", title: "本站舆情", icon: "📊", color: "#0891b2", url: "/#/siteStats", desc: "独立访客、访问趋势、设备来源与热门应用" },
      { id: "aboutagent", title: "关于智能体", icon: "🤖", color: "#0891b2", url: "/#/aboutagent", desc: "架构五层、三模式、双 Agent 飞轮与现场演示引导" },
      { id: "contributors", title: "贡献者墙", icon: "🏆", color: "#0f766e", url: "/#/contributors", desc: "词云致敬每一位代码贡献者" },
    ],
  },
];

const OFFICIAL_GROUPS = [
  {
    name: '信息化与服务', icon: '🖥️',
    sites: [
      { name: '网上办事大厅', url: 'https://ehall.qdu.edu.cn', desc: '选课/成绩/缴费一站式服务', featured: true },
      { name: '校园邮箱', url: 'https://mail.qdu.edu.cn', desc: '学生邮箱 学号@qdu.edu.cn' },
      { name: '智慧校园与信息化建设中心', url: 'https://nic.qdu.edu.cn', desc: '网络/账号/智慧校园' },
    ],
  },
  {
    name: '学校主站', icon: '🏛️',
    sites: [
      { name: '青岛大学官网', url: 'https://www.qdu.edu.cn', desc: '学校主站' },
      { name: '教务处', url: 'https://jwc.qdu.edu.cn', desc: '教学通知/教务公告' },
      { name: '研究生院', url: 'https://grad.qdu.edu.cn', desc: '研究生教育' },
      { name: '图书馆', url: 'https://lib.qdu.edu.cn', desc: '馆藏/借阅/数据库' },
    ],
  },
  {
    name: '社区与资源', icon: '📚',
    sites: [
      { name: '青大 Wiki', url: 'https://iceoftea.github.io/QDU-Wiki/', desc: '课程笔记/考研复试/经验文档' },
      { name: '青岛大学吧', url: 'https://tieba.baidu.com/f?kw=青岛大学', desc: '学生社区交流' },
    ],
  },
];

module.exports = { APP_GROUPS, OFFICIAL_GROUPS };
