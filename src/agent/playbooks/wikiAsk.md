# 剧本 · 📚 百科深度问答（`wikiAsk`）

> 模块：`src/agent/workflows.js` → WORKFLOWS.wikiAsk ｜ 意图注册：`intents.js`
> 类型：读操作（可直达执行）

## 触发语（patterns）
- 百科
- wiki
- Wiki
- 查百科
- 翻百科
- 手册里

## 执行步骤
1. 抽取问题关键词
2. 百科回答可溯源到具体条目
3. 打开百科（预置搜索）
4. 返回本站问答

## 结果卡片要素
- buildCard() 输出：标题 / 副标题 / rows（图标+主文案+值）/ actions（openApp·url·agent·reask）/ note
- actions 语义：openApp=跳应用；url=新窗打开；agent=自动追问工作流；reask=预填输入框

## 降级与失败
- 接口失败 → 按步骤内 catch 就近降级（快照 / 本机草稿 / 提示启动网关），不伪造数据
- 澄清缺失槽位 → engine 抛 CLARIFY → 追问话术（ASK 表）

## 扩展点
- 加参数 → slots.js 补抽取；改卡片 → 仅动本工作流 buildCard；跨校差异 → config.js 换校落点
