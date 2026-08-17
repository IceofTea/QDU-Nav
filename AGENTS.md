# AGENTS.md — 本站维护须知（每次会话必读）

> 本文件是 AI 助手与本仓库协作的「维护手册」：先读本项目须知，再读下方「维护清单」与「更新日志」，
> 确保每次改动都遵循既有架构与发布流程。更新日志的机制与 `QDU-Wiki/prompt/AGENT-GUIDE.md` 一脉相承：
> **每次发布都把「改了什么 / 为什么改 / 验证结果」追加到日志**，方便后续会话快速接续上下文。

## 一、项目是什么

**QDU-Nav（青大导航）**：面向青岛大学的纯静态校园导航单页应用。

- 技术栈：Vite + Vue 3（Composition API）+ 无后端，托管于 GitHub Pages。
- 数据策略：**「优先抓实时、回退用快照」**——有 server 网关时请求实时接口，纯静态托管下读取 `public/data/` 下的静态快照。
- 定时数据：GitHub Actions `snapshot.yml` 每 6 小时抓取教务处公开数据并自动提交；前端「数据洞察 / 贴吧舆情」等依赖该产物。

## 二、架构速览（改动前先确认位置）

| 模块 | 路径 | 说明 |
| --- | --- | --- |
| 应用注册 | `src/data/apps.js` | 首页应用网格的唯一来源 |
| 路由注册 | `src/router.js` | 应用 id → 视图组件的映射（新增页面必须双登记） |
| 站点配置 | `src/config/site.js` | 站点名 / 副标题 / 版本号（**版本号唯一维护点**） |
| 视图 | `src/views/*.vue` | 各应用页面 |
| 静态数据 | `src/data/*.js` | 校历、食堂、学院官网、题库、配置等前端内置数据 |
| 数据抓取（Python 首选） | `crawler/` | `fetcher.py` 抓取 / `parsers.py` 解析 / `build_snapshot.py` 快照 / `analysis.py` 洞察 / `tieba.py` 贴吧舆情 / `validate.py` 校验 / `diff.py` 差异摘要 |
| 数据抓取（Node 回退） | `scripts/snapshot.mjs`、`scripts/tieba.mjs` | 与 Python 版输出格式一致 |
| 静态产物 | `public/data/*.json` | `snapshot.json`、`course_stats.json`、`tieba_stats.json`（由 CI 提交） |
| 定时任务 | `.github/workflows/snapshot.yml` | 每 6h 抓取并自动提交；`deploy.yml` 构建部署 |

## 三、数据链路（新增数据源时照此办理）

1. 在 `crawler/` 新增抓取/解析脚本（标准库优先，Python 首选；保持 `scripts/` 有 Node 回退）。
2. 在 `.github/workflows/snapshot.yml` 的 crawl job 中加入步骤，并在 `git add` 中登记产物文件。
3. 前端在 `src/views/` 下新建视图，在 `apps.js` + `router.js` 双登记。
4. 抓取应「尽力而为」：失败不覆盖上一次成功数据、不阻塞整体提交（参见 `crawler/tieba.py` 的处理方式）。
5. 静态数据文件必须能被 404 优雅降级（前端做好空态），因为首次部署前产物文件可能不存在。

## 四、维护清单（每次改动必须按序执行）

1. **改完跑 Python 单测**：`python -m unittest discover -s tests`（解析器/构建器改动必须补单测）。
2. **前端构建**：`npm run build`，确认无报错、JS 体积合理。
3. **回归**：用 `node server/index.mjs` 起服务（端口 8787），跑 CDP 回归脚本 `regress_v*.mjs`（基线见 `C:\Users\13111\AppData\Local\Temp\opencode\qdunav\`），确认全绿。
4. **更新 README**：功能表 / 数据来源 / 版权说明如有变化需同步；版本历史追加一行。
5. **更新版本号**：视改动大小在 `src/config/site.js` 递增（小修补丁位，功能迭代次版本位）；README 头部版本行同步。
6. **追加本文件「更新日志」**：写清楚改了什么、为什么、验证结果。
7. **提交并推送**：commit message 用 `feat:` / `fix:` / `data:` 前缀；push 前先 `git fetch` 处理定时任务的自动提交（需要时 rebase）。

## 五、红线

- 不引入前端注释（除非必要）；不新增未经确认的依赖库。
- 不编造数据：抓不到就如实降级（空态 + 提示），绝不捏造课程/食堂/舆情数据。
- 版权与隐私：贴吧帖子等第三方内容只做轻量聚合，页面需注明来源。
- 版本号只在 `site.js` 维护，不要在页面模板里硬编码。

---

## 六、更新日志

| 日期 | 版本 | 内容 |
| --- | --- | --- |
| 2026-08-17 | v1.1.1 | **社区修复版**（合入贡献 PR #1，致谢 huanuyn）。①`server/index.mjs` 课程接口报错：`PARSE_PY` 原本指向 `os.tmpdir()/qdu_parse_kcb.py`（不存在），改为 `server/parse_kcb.py`，并按平台选择 `python`（win32）/`python3`（类 Unix）；②`FoodWheel.vue` 美食轮盘第二次起指针停靠角与抽取结果不一致：将当前旋转角归一化后补足到目标扇区中心，而非把绝对目标角直接累加；③PR 还独立修复了「快照保留 kind/campus」——与 v1.1.0 已有实现重复且实现较简（未含 col/cat/credit/weeks 与 colDist），**未重复合入**。验证：Python 单测 18/18、构建通过、回归 v12–v18 全绿。 |
| 2026-08-17 | v1.1.0（2 次提交） | **功能迭代**。①数据链路修复：快照保留 `col/campus/kind/credit/weeks` 附带列，`analysis.py` 新增 `colDist`，数据洞察新增课程性质 / 校区 / 学院开课分布与解读（旧快照为「未标注」，下次定时抓取自动补齐）；②课程表班级列表全量展示（移除 40 条截断）；③生活费计数器增强：类别扩充 + 微信/支付宝账单 CSV 导入自动归类 + 奖学金/助学金预设一键带出 + 结余情绪分档与月对比；④青大知多少题库扩至 102 题 + 选项徽章 + 成绩页错题回顾与本机排行榜；⑤今天吃什么支持校区筛选；⑥删除「受福师大启发」元素；⑦**新增贴吧舆情**：`crawler/tieba.py` + `scripts/tieba.mjs` 尽力抓取「青岛大学吧」公开列表页，产出 `tieba_stats.json`（热帖榜 / 关键词 / 话题分布 / 近 14 天趋势），前端 `TiebaSentiment.vue`，接入 snapshot.yml（失败不阻塞，旧数据保留），删除原「评论区」本地演示应用（纯本地无社交意义）；⑧学校官网：学院官网按「人文社科 / 理工 / 医学 / 艺术与体育 / 合作办学」分类展示，社区与资源组新增青岛大学吧链接。验证：Python 单测 18/18，构建通过，回归 88/88 + 新增 v18（贴吧舆情 / 学院分类 / 贴吧入口）。 |
| 2026-08-17 | v1.1.0（1st） | 本日志之前记录于会话内。含：数据链路修复、课程表全量、生活费增强、题库 102 题、今天吃什么校区筛选、福师大元素清理。（见 README 版本历史 v1.1.0） |
| 2026-08-16 | v1.0.0 | 前端工程化重构为可移植模板（config/site.js、router.js、utils/），版本号体系建立。详见 README 版本历史。 |
