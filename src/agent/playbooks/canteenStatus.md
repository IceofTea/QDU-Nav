# 剧本 · 🍽️ 食堂空座与营业时间（`canteenStatus`）

> 模块：`src/agent/workflows.js` → WORKFLOWS.canteenStatus ｜ 意图注册：`intents.js`
> 类型：读操作（可直达执行）

## 触发语（patterns）
- 食堂
- 空座位
- 空座
- 人多吗
- 就餐高峰
- 吃饭人多

## 执行步骤
1. 请求实时空座接口
2. 聚合食堂静态档案
3. 打开食堂空座位
4. 打开食堂空座位
5. 直接问吃什么

## 结果卡片要素
- buildCard() 输出：标题 / 副标题 / rows（图标+主文案+值）/ actions（openApp·url·agent·reask）/ note
- actions 语义：openApp=跳应用；url=新窗打开；agent=自动追问工作流；reask=预填输入框

## 降级与失败
- 接口失败 → 按步骤内 catch 就近降级（快照 / 本机草稿 / 提示启动网关），不伪造数据
- 澄清缺失槽位 → engine 抛 CLARIFY → 追问话术（ASK 表）

## 扩展点
- 加参数 → slots.js 补抽取；改卡片 → 仅动本工作流 buildCard；跨校差异 → config.js 换校落点
