# 贡献指南 · QDU-Nav-agent

## 三种参与方式

1. **代码 PR**：fork → 修改 → 本地验收全绿 → 提 PR（人工审核合入）
2. **提示词工程**：把自然语言改动写进 issue / 提交 `prompt/`，由**维护 Agent 起草 → 人工事实审核 → 合入**（人在回路，权责清晰）
3. **社区内容**：校园墙发帖 / 百科纠错 / 智能体 👎——都是真实的需求回流

## 提交规范

- 前缀：`feat:` `fix:` `refactor:` `docs:` `test:` `data:`
- 版本号**只改** `src/config/site.js`（单一事实来源），CHANGELOG 同步补条目
- 中文写作，中英文之间加空格；提交信息一句话说清"改了什么/为什么"

## 硬性红线

1. **不编造数据**：FAQ 必带 `source`；接口失败如实降级（快照/本机/提示），禁止伪造数字
2. **写操作必须 `needConfirm`**：涉及公开发布/日程写入，先经用户确认
3. **密钥不进前端**：云脑 Key 只存 server（管理台配置），不落仓库
4. **不引入未确认依赖**：新依赖需在 PR 说明理由与体积影响
5. 改动只动副本分支，不破坏 `site/` 构建产物约定（Wiki 站同理）

## 新同学 / 新 AI Agent 上手顺序

1. `src/agent/README.md` — 10 分钟拿到全项目地图
2. `docs/ARCHITECTURE.md` — 分层与设计决策
3. `server/community.mjs` 文件头 — 社区接口速查（不用通读源码）
4. `docs/REBRAND-RUNBOOK.md` — 换校机制
5. `src/agent/DIALOGUES.md` — 十组对话剧本（理解产品最快的方式）

## 改完必跑（本地验收）

```bash
node --check <你改动的 js/vue 内嵌脚本可跳过>
npm run build                            # 构建通过
node scripts/smoke-community.mjs         # 社区 18 项全 PASS（需 server 在跑）
# 浏览器按 src/agent/DIALOGUES.md 抽 2 组剧本人工过一遍
```

Wiki 站：`py -m mkdocs build`（另有 6 条原站既有的 en 链接 warning，与改动无关）。
