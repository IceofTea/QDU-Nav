# 剧本 · 🏷️ 话题热词（`hotTopics`）

> 模块：`src/agent/workflows.js` → WORKFLOWS.hotTopics ｜ 意图注册：`intents.js`
> 类型：读操作（可直达执行）

## 触发语（patterns）
- 话题热词
- 热词
- 大家在聊什么
- 热门话题
- 讨论热度
- 最近热什么

## 执行步骤
1. 全站帖子分词统计
2. 打开校园墙看热议
3. 针对热词搜帖子

## 结果卡片要素
- buildCard() 输出：标题 / 副标题 / rows（图标+主文案+值）/ actions（openApp·url·agent·reask）/ note
- actions 语义：openApp=跳应用；url=新窗打开；agent=自动追问工作流；reask=预填输入框

## 降级与失败
- 接口失败 → 按步骤内 catch 就近降级（快照 / 本机草稿 / 提示启动网关），不伪造数据
- 澄清缺失槽位 → engine 抛 CLARIFY → 追问话术（ASK 表）

## 扩展点
- 加参数 → slots.js 补抽取；改卡片 → 仅动本工作流 buildCard；跨校差异 → config.js 换校落点
