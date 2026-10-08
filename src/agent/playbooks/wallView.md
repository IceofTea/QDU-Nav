# 剧本 · 🧱 浏览校园墙（`wallView`）

> 模块：`src/agent/workflows.js` → WORKFLOWS.wallView ｜ 意图注册：`intents.js`
> 类型：读操作（可直达执行）

## 触发语（patterns）
- 看校园墙
- 逛墙
- 校园墙上有什么
- 热门帖子
- 最新帖子
- 刷墙

## 执行步骤
1. 拉取校园墙热帖
2. 启动 node server/index.mjs 后即可浏览/发布校园墙
3. 打开校园墙页面
4. 还没有帖子，来说第一句
5. 打开校园墙（发帖/回复）
6. 我也发一条

## 结果卡片要素
- buildCard() 输出：标题 / 副标题 / rows（图标+主文案+值）/ actions（openApp·url·agent·reask）/ note
- actions 语义：openApp=跳应用；url=新窗打开；agent=自动追问工作流；reask=预填输入框

## 降级与失败
- 接口失败 → 按步骤内 catch 就近降级（快照 / 本机草稿 / 提示启动网关），不伪造数据
- 澄清缺失槽位 → engine 抛 CLARIFY → 追问话术（ASK 表）

## 扩展点
- 加参数 → slots.js 补抽取；改卡片 → 仅动本工作流 buildCard；跨校差异 → config.js 换校落点
