# 剧本 · 🔍 发布失物招领（`lostFound`）

> 模块：`src/agent/workflows.js` → WORKFLOWS.lostFound ｜ 意图注册：`intents.js`
> 类型：写操作（needConfirm，执行前必须用户确认）

## 触发语（patterns）
- 发失物
- 失物招领
- 寻物启事
- 我丢了
- 捡到东西
- 丢了东西

## 执行步骤
1. 抽取物品描述与类型
2. 发布到失物分区（敏感词双端校验）
3. 打开失物分区
4. 再发一条

## 结果卡片要素
- buildCard() 输出：标题 / 副标题 / rows（图标+主文案+值）/ actions（openApp·url·agent·reask）/ note
- actions 语义：openApp=跳应用；url=新窗打开；agent=自动追问工作流；reask=预填输入框

## 降级与失败
- 接口失败 → 按步骤内 catch 就近降级（快照 / 本机草稿 / 提示启动网关），不伪造数据
- 澄清缺失槽位 → engine 抛 CLARIFY → 追问话术（ASK 表）

## 扩展点
- 加参数 → slots.js 补抽取；改卡片 → 仅动本工作流 buildCard；跨校差异 → config.js 换校落点
