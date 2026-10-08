# 剧本 · 🕐 时间日期（`timeNow`）

> 模块：`src/agent/workflows.js` → WORKFLOWS.timeNow ｜ 意图注册：`intents.js`
> 类型：读操作（可直达执行）

## 触发语（patterns）
- 现在几点
- 今天星期几
- 几号了
- 今天日期
- 现在时间
- 几月几号

## 执行步骤
1. 读取系统时间
2. 今天暂无待办日程
3. 添加提醒

## 结果卡片要素
- buildCard() 输出：标题 / 副标题 / rows（图标+主文案+值）/ actions（openApp·url·agent·reask）/ note
- actions 语义：openApp=跳应用；url=新窗打开；agent=自动追问工作流；reask=预填输入框

## 降级与失败
- 接口失败 → 按步骤内 catch 就近降级（快照 / 本机草稿 / 提示启动网关），不伪造数据
- 澄清缺失槽位 → engine 抛 CLARIFY → 追问话术（ASK 表）

## 扩展点
- 加参数 → slots.js 补抽取；改卡片 → 仅动本工作流 buildCard；跨校差异 → config.js 换校落点
