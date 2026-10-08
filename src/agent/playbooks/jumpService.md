# 剧本 · 🚀 校园服务直达（`jumpService`）

> 模块：`src/agent/workflows.js` → WORKFLOWS.jumpService ｜ 意图注册：`intents.js`
> 类型：读操作（可直达执行）

## 触发语（patterns）
- vpn
- VPN
- 织网
- 知网
- 校外访问
- 下载资源

## 执行步骤
1. 识别目标服务
2. 定位官方入口链接
3. 立即打开
4. 查看全部服务入口
5. 提示
6. 打开学校官网

## 结果卡片要素
- buildCard() 输出：标题 / 副标题 / rows（图标+主文案+值）/ actions（openApp·url·agent·reask）/ note
- actions 语义：openApp=跳应用；url=新窗打开；agent=自动追问工作流；reask=预填输入框

## 降级与失败
- 接口失败 → 按步骤内 catch 就近降级（快照 / 本机草稿 / 提示启动网关），不伪造数据
- 澄清缺失槽位 → engine 抛 CLARIFY → 追问话术（ASK 表）

## 扩展点
- 加参数 → slots.js 补抽取；改卡片 → 仅动本工作流 buildCard；跨校差异 → config.js 换校落点
