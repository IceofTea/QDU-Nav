# 智能体模块总纲（新 Agent / 新同学 10 分钟上手）

> 目标读者：接手本项目的新 AI Agent 或新开发者。读完本文件即可定位改动点，
> 无需通读源码——这就是"为新 Agent 节省 token"的设计。

## 1. 分层地图（改什么 → 去哪个文件）

| 层 | 文件 | 职责 | 典型改动 |
|---|---|---|---|
| 配置 | `src/agent/config.js` | 名称/欢迎语/示例/云脑地址（**换校落点**） | 改文案、换校脚本会自动改这里 |
| 意图 | `src/agent/intents.js` | 40+ 意图加权匹配（全等100/包含60+/被包含40+） | 加意图：INTENTS 数组追加 `{id, kind, wf/app, patterns[]}` |
| 槽位 | `src/agent/slots.js` | 时间/节次/地点/日程槽位抽取 | 加正则即可 |
| 知识 | `src/agent/faq.js` | 20 条 FAQ（必带 source，禁止编造） | 加问答：FAQ 追加，source 写可核验出处 |
| 执行 | `src/agent/workflows.js` | **27 条工作流**（步骤+结果卡片），真实调 API | 加工作流：WORKFLOWS 追加 `{id, steps[], buildCard()}` |
| 状态机 | `src/agent/engine.js` | 三层识别调度 · 澄清/确认/计划 三态续接 · 云脑降级 | 加模式/改确认词在这里 |
| UI | `src/components/agent/AgentChat.vue` | 消息流/计时/停止/折叠/命令面板/语音 | 改交互样式与消息操作 |
| 装配 | `src/views/Assistant.vue` | 全屏页（技能面板/记忆/常用排序） | 改侧栏与技能统计 |

## 2. 一次输入的完整旅程

```
用户输入
 → engine.handle(text, {onStep, mode})
   ├ 模式特判（切回直达/计划/问答）
   ├ 澄清续接 pending=clarify（补槽位）
   ├ 确认续接 pending=confirm|plan（开始执行/取消）
   ├ recognize() 三层：意图表 → FAQ → 应用检索
   ├ mode=plan 且命中工作流 → 返回计划卡等确认
   ├ mode=ask → 只答不办事
   └ 都没命中 → /api/chat 云脑（未配501秒回）→ 本地兜底话术
 命中 workflow → runWorkflow() 逐步 onStep 回调 → buildCard() 结果卡片
 UI 渲染：耗时计时 · 执行轨迹（默认折叠）· 卡片 actions（openApp/url/agent/reask）
```

## 3. 三模式语义（WorkBuddy 对齐）

- **⚡直达**：识别即执行（默认）
- **📋计划**：先出执行计划卡（步骤预览），确认后运行 —— pending.kind='plan'
- **💬问答**：只回答知识，不执行动作

## 4. 数据红线（必须遵守）

1. **不编造数据**：FAQ 必带 `source`；接口失败如实降级（快照/本机/提示），禁止伪造数字。
2. **写操作人在回路**：`needConfirm: true` 的工作流必须经用户确认。
3. **内容安全双端**：任何公开发布（评论/帖子/回复）先本地敏感词预检，服务端二次拦截。
4. **云脑只经 `/api/chat`**：密钥存 server，前端永不接触。

## 5. 与社区的耦合点（双 Agent 飞轮）

- `src/wall/api.js`：发墙/失物/悬赏/资源等工作流经此写入社区网关。
- `/api/feedback`：👎与"提交反馈"工作流 → 管理台聚合视图 → 维护 Agent 消化。
- `views/Assistant.vue` 技能使用计数（localStorage `qdu_wf_usage`）→ 常用技能置顶。
- 协作看板工作流（`agentBoard`）：本机执行数 + 网关评论/帖子/反馈统计一站式呈现。

## 6. 常见任务速查

| 我想… | 操作 |
|---|---|
| 加一个新工作流 | `workflows.js` 追加 + `intents.js` 注册 patterns + （可选）UI 无需改 |
| 改欢迎语/示例 | `config.js` AGENT_PROFILE（换校脚本同步改写） |
| 加 FAQ | `faq.js` 追加，source 必填可核验 |
| 接真实大模型 | 管理台「🧠 云脑」配置 baseUrl+Key → `/api/chat` 自动生效 |
| 调整确认话术 | `engine.js` CONFIRM_WORDS / ASK 表 |
| 看板数据口径 | `workflows.js` agentBoard + `/api/comments?stats=1` |

## 7. 验收清单（改完必跑）

```bash
node --check src/agent/workflows.js   # 语法
npm run build                          # 构建
# 冒烟：scripts/smoke-community.mjs（需 node server/index.mjs 在跑）
node scripts/smoke-community.mjs
```

详细剧本见 `agent/playbooks/`（高频工作流的触发语/步骤/降级/扩展点）。
