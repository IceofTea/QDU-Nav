# 剧本 · ☀️ 今日简报（`dailyBriefing`）

> 模块：`src/agent/workflows.js` → WORKFLOWS.dailyBriefing ｜ 意图注册：`intents.js`
> 类型：读操作（可直达执行）

## 触发语（patterns）
- 今日简报
- 每日简报
- 今天有什么
- 今天有什么事
- 今日概览
- 今天安排

## 执行步骤
1. 读取本机日程与班级记忆
2. 拉取今日课程与最新通知
3. 生成今日简报
4. 今天没有课
5. 未设置班级，说“设置班级 2025级XX班”解锁今日课程
6. 打开课程表
7. 查看全部通知
8. 逛逛校园墙

## 结果卡片要素
- buildCard() 输出：标题 / 副标题 / rows（图标+主文案+值）/ actions（openApp·url·agent·reask）/ note
- actions 语义：openApp=跳应用；url=新窗打开；agent=自动追问工作流；reask=预填输入框

## 降级与失败
- 接口失败 → 按步骤内 catch 就近降级（快照 / 本机草稿 / 提示启动网关），不伪造数据
- 澄清缺失槽位 → engine 抛 CLARIFY → 追问话术（ASK 表）

## 扩展点
- 加参数 → slots.js 补抽取；改卡片 → 仅动本工作流 buildCard；跨校差异 → config.js 换校落点
