# 剧本 · 📋 我的日程（`mySchedule`）

> 模块：`src/agent/workflows.js` → WORKFLOWS.mySchedule ｜ 意图注册：`intents.js`
> 类型：读操作（可直达执行）

## 触发语（patterns）
- 我的日程
- 日程安排
- 看日程
- 接下来要做什么
- 我安排了什么
- 有什么安排

## 执行步骤
1. 读取本机日程
2. 暂无日程
3. 添加新日程
4. 清空日程

## 结果卡片要素
- buildCard() 输出：标题 / 副标题 / rows（图标+主文案+值）/ actions（openApp·url·agent·reask）/ note
- actions 语义：openApp=跳应用；url=新窗打开；agent=自动追问工作流；reask=预填输入框

## 降级与失败
- 接口失败 → 按步骤内 catch 就近降级（快照 / 本机草稿 / 提示启动网关），不伪造数据
- 澄清缺失槽位 → engine 抛 CLARIFY → 追问话术（ASK 表）

## 扩展点
- 加参数 → slots.js 补抽取；改卡片 → 仅动本工作流 buildCard；跨校差异 → config.js 换校落点
