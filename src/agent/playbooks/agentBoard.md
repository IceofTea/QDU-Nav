# 剧本 · 📊 协作看板（`agentBoard`）

> 模块：`src/agent/workflows.js` → WORKFLOWS.agentBoard ｜ 意图注册：`intents.js`
> 类型：读操作（可直达执行）

## 触发语（patterns）
- 协作看板
- 看板
- 数据看板
- 运营数据
- 后台数据
- 双agent

## 执行步骤
1. 统计用户 Agent（本机执行记录）
2. 拉取维护端与社区统计（评论网关）
3. 生成飞轮看板
4. 用户 Agent · 本机工作流执行
5. 维护 Agent · 在库能力
6. 社区评论（用户回流数据池）
7. 校园墙帖子
8. 待处理反馈（进维护队列）

## 结果卡片要素
- buildCard() 输出：标题 / 副标题 / rows（图标+主文案+值）/ actions（openApp·url·agent·reask）/ note
- actions 语义：openApp=跳应用；url=新窗打开；agent=自动追问工作流；reask=预填输入框

## 降级与失败
- 接口失败 → 按步骤内 catch 就近降级（快照 / 本机草稿 / 提示启动网关），不伪造数据
- 澄清缺失槽位 → engine 抛 CLARIFY → 追问话术（ASK 表）

## 扩展点
- 加参数 → slots.js 补抽取；改卡片 → 仅动本工作流 buildCard；跨校差异 → config.js 换校落点
