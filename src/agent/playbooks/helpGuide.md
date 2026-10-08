# 剧本 · 🗺️ 使用指南（`helpGuide`）

> 模块：`src/agent/workflows.js` → WORKFLOWS.helpGuide ｜ 意图注册：`intents.js`
> 类型：读操作（可直达执行）

## 触发语（patterns）
- 使用指南
- 能力地图
- 你能干嘛
- 功能清单
- 会什么
- 教我用

## 执行步骤
1. 汇总当前能力矩阵
2. 学习：课表/空教室/课程查询/校历/成绩查询（FAQ）
3. 日程：加提醒/我的日程/今日简报/时间日期
4. 社区：发墙/看墙/搜墙/失物/悬赏/资源/热词
5. 积分：签到/我的积分/悬赏结算
6. 服务：VPN/官网/食堂/吃什么/导航
7. 系统：协作看板/反馈/指南/三模式切换
8. ☀️ 试试今日简报

## 结果卡片要素
- buildCard() 输出：标题 / 副标题 / rows（图标+主文案+值）/ actions（openApp·url·agent·reask）/ note
- actions 语义：openApp=跳应用；url=新窗打开；agent=自动追问工作流；reask=预填输入框

## 降级与失败
- 接口失败 → 按步骤内 catch 就近降级（快照 / 本机草稿 / 提示启动网关），不伪造数据
- 澄清缺失槽位 → engine 抛 CLARIFY → 追问话术（ASK 表）

## 扩展点
- 加参数 → slots.js 补抽取；改卡片 → 仅动本工作流 buildCard；跨校差异 → config.js 换校落点
