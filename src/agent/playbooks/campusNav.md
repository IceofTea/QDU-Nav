# 剧本 · 📍 校内导航（`campusNav`）

> 模块：`src/agent/workflows.js` → WORKFLOWS.campusNav ｜ 意图注册：`intents.js`
> 类型：读操作（可直达执行）

## 触发语（patterns）
- 怎么去
- 怎么走
- 带我去
- 导航到
- 路线
- 在哪里怎么走

## 执行步骤
1. 解析目的地
2. 匹配校区与楼宇数据
3. 教室导航：空教室 + 一周占用 + 分步路线
4. 打开教室导航
5. 查学校地址（寄快递用）

## 结果卡片要素
- buildCard() 输出：标题 / 副标题 / rows（图标+主文案+值）/ actions（openApp·url·agent·reask）/ note
- actions 语义：openApp=跳应用；url=新窗打开；agent=自动追问工作流；reask=预填输入框

## 降级与失败
- 接口失败 → 按步骤内 catch 就近降级（快照 / 本机草稿 / 提示启动网关），不伪造数据
- 澄清缺失槽位 → engine 抛 CLARIFY → 追问话术（ASK 表）

## 扩展点
- 加参数 → slots.js 补抽取；改卡片 → 仅动本工作流 buildCard；跨校差异 → config.js 换校落点
