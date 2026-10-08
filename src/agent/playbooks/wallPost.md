# 剧本 · 🧱 发布到校园墙（`wallPost`）

> 模块：`src/agent/workflows.js` → WORKFLOWS.wallPost ｜ 意图注册：`intents.js`
> 类型：写操作（needConfirm，执行前必须用户确认）

## 触发语（patterns）
- 发墙
- 发到墙
- 校园墙发帖
- 发个帖子
- 墙上发
- 我要吐槽

## 执行步骤
1. 抽取帖子内容与分区
2. 发布到社区网关（敏感词实时校验）
3. 打开校园墙
4. 打开校园墙查看
5. 再发一条

## 结果卡片要素
- buildCard() 输出：标题 / 副标题 / rows（图标+主文案+值）/ actions（openApp·url·agent·reask）/ note
- actions 语义：openApp=跳应用；url=新窗打开；agent=自动追问工作流；reask=预填输入框

## 降级与失败
- 接口失败 → 按步骤内 catch 就近降级（快照 / 本机草稿 / 提示启动网关），不伪造数据
- 澄清缺失槽位 → engine 抛 CLARIFY → 追问话术（ASK 表）

## 扩展点
- 加参数 → slots.js 补抽取；改卡片 → 仅动本工作流 buildCard；跨校差异 → config.js 换校落点
