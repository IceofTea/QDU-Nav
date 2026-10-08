# 意图总表（由 intents.js 自动生成）

> 三层识别第一层。打分：全等 100 · 包含 60+len×2 · 被包含 40+len×3，阈值 40。
> 未命中本表 → FAQ（faq.js）→ 应用检索（searchIndex.js）→ 云脑 → 兜底。

| id | kind | 目标 | 触发语示例 |
|---|---|---|---|
| meta.help | meta | - | 你能做什么、你会什么、能干什么、有什么功能 |
| meta.greet | meta | - | 你好、您好、嗨、哈喽 |
| meta.thanks | meta | - | 谢谢、感谢、多谢、辛苦了 |
| wf.emptyRoom | workflow | findRoom | 空教室、自习室、哪里自习、自习去哪 |
| wf.notice | workflow | todayNotice | 有什么通知、最新通知、教务通知、看通知 |
| wf.searchNotice | workflow | searchNotice | 查一下通知、搜索通知、搜通知、找通知 |
| wf.tomorrow | workflow | dayClass | 明天上什么、明天的课、明天有什么课、明天上课 |
| wf.eat | workflow | whatEat | 吃什么、今天吃啥、吃啥、晚饭吃什么 |
| wf.canteen | workflow | canteenStatus | 食堂、空座位、空座、人多吗 |
| wf.addSchedule | workflow | addSchedule | 提醒我、加日程、加个日程、记个日程 |
| wf.mySchedule | workflow | mySchedule | 我的日程、日程安排、看日程、接下来要做什么 |
| wf.service | workflow | jumpService | vpn、VPN、织网、知网 |
| wf.courseQuery | workflow | courseQuery | 查课表、查课程、谁教的、哪门课 |
| wf.campusNav | workflow | campusNav | 怎么去、怎么走、带我去、导航到 |
| wf.setClass | workflow | setClass | 我是哪个班、设置班级、我的班级、记住我的班级 |
| wf.wiki | workflow | wikiAsk | 百科、wiki、Wiki、查百科 |
| wf.briefing | workflow | dailyBriefing | 今日简报、每日简报、今天有什么、今天有什么事 |
| wf.wallPost | workflow | wallPost | 发墙、发到墙、校园墙发帖、发个帖子 |
| wf.timeNow | workflow | timeNow | 现在几点、今天星期几、几号了、今天日期 |
| wf.wallView | workflow | wallView | 看校园墙、逛墙、校园墙上有什么、热门帖子 |
| wf.agentBoard | workflow | agentBoard | 协作看板、看板、数据看板、运营数据 |
| wf.wallSearch | workflow | wallSearch | 搜墙、搜索校园墙、墙上搜、搜帖子 |
| wf.myPoints | workflow | myPoints | 我的积分、积分多少、积分明细、看积分 |
| wf.signIn | workflow | signIn | 签到、每日签到、打个卡、打卡 |
| wf.lostFound | workflow | lostFound | 发失物、失物招领、寻物启事、我丢了 |
| wf.bountyPost | workflow | bountyPost | 发悬赏、悬赏求助、发起悬赏、赏金求助 |
| wf.resourceShare | workflow | resourceShare | 分享资源、发资源、分享链接、共享资料 |
| wf.hotTopics | workflow | hotTopics | 话题热词、热词、大家在聊什么、热门话题 |
| wf.reportFeedback | workflow | reportFeedback | 提交反馈、提个建议、我要反馈、反馈一下 |
| wf.helpGuide | workflow | helpGuide | 使用指南、能力地图、你能干嘛、功能清单 |
| app.reminder | app | reminder | 提醒中心、定时提醒、看提醒、闹钟 |
| app.insights | app | insights | 社区洞察、数据可视化、趋势图、评论趋势 |
| app.rebrand | app | rebrand | 换校向导、换学校预览、品牌预览、主题试穿 |
| app.timetable | app | timetable | 课表、课程表、看课表 |
| app.calendar | app | calendar | 校历、放假安排、什么时候放假、寒假 |
| app.budget | app | budget | 记账、记一笔、花了多少钱、账单 |
| app.physical | app | physicalTest | 体测、体测成绩、跑步成绩、体质测试 |
| app.official | app | officialSites | 官网、学校网站、学院官网、官方网站 |
| app.studentId | app | studentId | 查学号、我的学号、新生学号、录取查询 |
| app.stats | app | courseStats | 数据统计、排课统计、课程分析、热度分析 |
| app.quiz | app | quiz | 答题、知识竞赛、校史问答、来一局 |
| app.tieba | app | tiebaSentiment | 贴吧、青大吧、热帖、论坛 |
| app.siteStats | app | siteStats | 访问统计、访客、流量统计 |
| app.contributors | app | contributors | 贡献者、开发者、更新日志 |
| app.categories | app | categories | 全部应用、所有应用、应用列表、更多应用 |

共 45 条意图。修改后请同步 playbooks/INDEX.md。