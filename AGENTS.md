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
5. **更新版本号**：按 `x.y.z`——小更新（bug 修复 / 文案 / 维护性改动）只加 z（如 1.1.1→1.1.2）；功能迭代 / 新功能等大更新加 y 并归零 z（如 1.1.x→1.2.0）。版本号只在 `src/config/site.js` 维护，README 头部版本行同步。
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
| 2026-08-17 | v1.2.7 | **课表体验**。①`Timetable.vue` 的 `subOf` 班级模式改为「教师 · 教室」（数据来自课程总表 `t` 列，此前班级课表只显示教室）；②新增**列表视图**（`viewMode='list'`）：按星期分组、每门课一行（节次 / 课程 / 教师 / 教室），手机端不再挤在窄网格（375px 下网格每列仅约 48px）；③**点击课程弹详情**：`detail` ref + overlay，展示 教师 / 教室 / 班级 / 时间 / 周次 / 校区 / 类别 / 学分；④周视图 / 列表视图一键切换。验证：构建通过、回归 v12–v19 全绿、375px 手机视口实测（网格 53 卡显示教师名、列表 53 项、详情弹窗字段齐全）。 |
| 2026-08-17 | v1.2.6 | **性能优化**。①`Timetable.vue` 的 `termRows` 改 `shallowRef`：避免 Vue 深度代理 5900+ 元素数组（每次属性访问走 Proxy 拖慢遍历）；②`curRows` 直接返回当前学期数据（onMounted/switchTerm 已按学期载入），省重复 filter；③`termTimetable.js` 新增**内联 Web Worker** 后台 `JSON.parse`（2MB 排课数据解析移出主线程），低端机/弱网加载时主线程可正常点击返回/导航。验证：构建通过、回归 v12–v19 全绿、CPU 4x 模拟手机实测冷启动约 0.6s / 搜索 0.3s / 教师与教室 tab 各 22 项正常。 |
| 2026-08-17 | v1.2.5 | **性能优化**。①**课程表卡顿彻底修复**：`Timetable.vue` 的 `countOf(name)` 对每个班级全量 `filter` 遍历排课（O(n²)，约 1470 班级 × 5900 行 ≈ 870 万次，搜索/筛选时主线程卡死、手机无法退出）改为**一次性预计算 `counts` Map**（`computed` 依赖 curRows+tab，一次遍历建 Map，`resultItems` O(1) 查询）；实测打开 **8548ms → 277ms**（快约 30 倍）、搜索响应 264ms；②**智能分页**：`v-for="p in pageCount"` 罗列全部页码（147 个按钮，手机 DOM 巨大且难看）改为 `pageNos` 折叠（`« ‹ 1 2 … 末几页 › »` + `jumpPage` 输入数字跳转 + 首页/末页），expandAll 时隐藏页码。验证：构建通过、回归 v12–v19 全绿、375px 手机视口实测（加载 277ms、搜索 264ms、分页 10 按钮 + 省略号）。 |
| 2026-08-17 | v1.2.4 | **体验优化**。①**课程表加载提速（根因修复）**：`localCourse.js` 的 `staticCourseTable` 改用 2KB `timetable_meta.json`（原回退 `loadSnap()` 全量 15MB snapshot 是卡顿真凶）；`Timetable.vue` 移除 `apiFetch('/courseTable')` 阻塞（本地网关不可达时触发 10s 超时 + 15MB fallback）；实测打开约 217ms；②**官方新媒体链接修正**：微博 `https://www.weibo.com/u/5726029829`、抖音 `douyin.com/user/MS4wLjAB…`、公众号 `mp.weixin.qq.com/s/o6vjr3toGHgJjSUABA26_A`，并新增 **B 站** `space.bilibili.com/441692154`；③**邮箱助手美化**：卡片式渐变 + emoji 图标头 + 俏皮话「校长邮箱 xiaozhang@qdu.edu.cn」。验证：构建通过、回归 v12–v19 全绿、课程表加载实测 217ms。 |
| 2026-08-17 | v1.2.3 | **体验优化**。①**课程表加载提速**：新增 `crawler/split_snapshot.py` 按学期拆分排课数据（`public/data/timetable_meta.json` + `terms/t*.json`，当前学期约 2MB），前端 `src/api/termTimetable.js` 默认只加载当前学期、切换学期懒加载并缓存（替代一次性 fetch+parse 15MB 全量快照），解决首屏慢 / 手机卡死；snapshot.yml 接入 split 步骤并提交拆分产物；②**校园邮箱**：官网「信息化与服务」新增 `mail.qdu.edu.cn` 入口，官网页内嵌**邮箱助手**（输入学号一键生成 `学号@qdu.edu.cn` + 复制 + 开通指南）；③**官网改造**：青大 Wiki 收敛为网站入口（`iceoftea.github.io/QDU-Wiki`）、「信息化与服务」组上移至第 2 位并 `featured` 突出「网上办事大厅」、新增「官方新媒体」组（微博 / 微信视频号 / 抖音，账号 qddx 已查证）；④**贴吧趋势交互**：柱子 hover/点击显示当日帖数（`activeTrend` + tip），窄屏 `.trend` 横向滚动；⑤**手机端修复**：体测页 `.split-row` input 溢出（flex:1 min-width:0，scrollWidth 421→375）、首页 wiki 按钮竖排（`.wiki-links` flex-wrap + nowrap）；⑥应用顺序与底部导航 `NAV_APPS` 调整为指定顺序（首页 / 动态 / 官网 / 生活费 / 体测 / 教室 / 校历）。验证：构建通过、Python 单测 18/18、回归 v12–v19 全绿（v15 顺序断言适配、v18 新增官网/邮箱断言、手机视口 375px 溢出检测通过）。 |
| 2026-08-17 | v1.2.2 | **界面增强**。①课程表班级列表**每页 10 条**（原 50 条，短列表更清爽），页码选页 + 展开全部/收起不变；②**贴吧舆情界面图表化丰富**（参考数据洞察）：新增 KPI 概览卡（抓取帖数 / 最热帖回复 / 话题覆盖 / 近 14 天发帖与日均）、自动文字洞察、「热帖榜」改回复数条形图 + 作者/日期副标题、关键词改**标签云**（字号随热度放大）、话题分布显示占比百分比、趋势柱状图标注日均。验证：构建通过、回归 v12–v19 共 119 项全绿（v18 新增 KPI/洞察/标签云断言，v19 分页断言 50→10，v17 分页断言适配）。 |
| 2026-08-17 | v1.2.1 | **维护增强**。①修复 **GitHub Actions 部署失败**：`tests/test_tieba.py` 解析样本仍为桌面版 HTML，与贴吧手机版 `mo/q/threadlist` 解析不一致 → `parse_threads` 返回 0 导致 unittest 失败、deploy 的 `python3 -m unittest discover` 步骤中断；已把样本更新为手机版结构，单测恢复 18/18；②**数据洞察附带列数据恢复**：本机重新抓取 jwc 课程总表生成快照，`snapshot.json` rows 恢复 `col/campus/kind/cat/credit/weeks` 附带列，`course_stats.json` 的 kindDist（课程 50014/实践 407/美育 194）/ campusDist（浮山 33604/金家岭 16234/松山 790）/ colDist 恢复真实分布（未标注仅剩 2 条）；③数据洞察**界面增强**：新增 KPI 概览卡（最忙校区 / 最忙星期 / 开课学院）、自动生成文字洞察、「每天节次分布」面板（1-2 至 9-10 节）；④课程表**周课表单元格显示校区**。验证：Python 单测 18/18、构建通过、回归 v12–v19 共 115 项全绿（v17 分布断言更新为「显示真实分布 + KPI + 节次分布」）。 |
| 2026-08-17 | v1.2.0 | **功能迭代**。①新增**贡献者墙**：`Contributors.vue` 词云式展示项目贡献者（IceofTea / Huanuyn / qdu-nav-bot），点击跳转 GitHub 主页，头像直链 `avatars.githubusercontent.com`（无需 API key，加载失败自动回退 emoji 徽章），首页「关于本站」面板与首页网格双入口；②**贴吧舆情**：改用百度贴吧**手机版 `mo/q/threadlist` 接口**（iPhone/Android 移动 UA，规避桌面版 WAF 403），真实抓取青岛大学吧帖子产出热帖榜 / 关键词 / 话题分布 / 14 天趋势（本机实测成功 119 帖，GitHub Actions 定时任务同步生效）；抓取失败时前端显示如实空态而非报错，并保留 status:empty 空结构防 HTTP 404；③课程表班级列表**分页**：默认每页 50 条 + 页码选页 + 「展开全部/收起」，搜索与筛选自动回到第 1 页，解决 1470+ 班级全量渲染卡顿；④数据洞察**分布科学化**：课程性质 / 校区 / 学院分布仅在存在真实标注数据时展示，过滤「未标注」项，占比按「已标注样本数」计算（未标注拉低占比的问题消除），旧快照无附带列时显示提示面板并隐藏空分布；⑤**奖学金金额校准**（Budget.vue）：优秀奖学金 1500/1000/500→**1000/600/400**、国家助学金 4400/3300→**2300/3300/4300**（青大学字〔2021〕27号），并增补竞赛奖学金（挑战杯·国特 30000 / A类·国一 5000）与博学奖学金（发明专利 5000）预设，附来源说明。验证：Python 单测 18/18、构建通过、回归 v12–v19 全绿（v18 版本断言放宽为 v1\.\d+）；另修复 PR #1 网页合并时被冲掉的两处实现（server `PY` 平台适配定义、快照附带列），本地三文件与自研实现逐字节一致。 |
| 2026-08-17 | v1.1.1 | **社区修复版**（合入贡献 PR #1，致谢 huanuyn）。①`server/index.mjs` 课程接口报错：`PARSE_PY` 原本指向 `os.tmpdir()/qdu_parse_kcb.py`（不存在），改为 `server/parse_kcb.py`，并按平台选择 `python`（win32）/`python3`（类 Unix）；②`FoodWheel.vue` 美食轮盘第二次起指针停靠角与抽取结果不一致：将当前旋转角归一化后补足到目标扇区中心，而非把绝对目标角直接累加；③PR 还独立修复了「快照保留 kind/campus」——与 v1.1.0 已有实现重复且实现较简（未含 col/cat/credit/weeks 与 colDist），**未重复合入**。验证：Python 单测 18/18、构建通过、回归 v12–v18 全绿。 |
| 2026-08-17 | v1.1.0（2 次提交） | **功能迭代**。①数据链路修复：快照保留 `col/campus/kind/credit/weeks` 附带列，`analysis.py` 新增 `colDist`，数据洞察新增课程性质 / 校区 / 学院开课分布与解读（旧快照为「未标注」，下次定时抓取自动补齐）；②课程表班级列表全量展示（移除 40 条截断）；③生活费计数器增强：类别扩充 + 微信/支付宝账单 CSV 导入自动归类 + 奖学金/助学金预设一键带出 + 结余情绪分档与月对比；④青大知多少题库扩至 102 题 + 选项徽章 + 成绩页错题回顾与本机排行榜；⑤今天吃什么支持校区筛选；⑥**新增贴吧舆情**：`crawler/tieba.py` + `scripts/tieba.mjs` 尽力抓取「青岛大学吧」公开列表页，产出 `tieba_stats.json`（热帖榜 / 关键词 / 话题分布 / 近 14 天趋势），前端 `TiebaSentiment.vue`，接入 snapshot.yml（失败不阻塞，旧数据保留），删除原「评论区」本地演示应用（纯本地无社交意义）；⑦学校官网：学院官网按「人文社科 / 理工 / 医学 / 艺术与体育 / 合作办学」分类展示，社区与资源组新增青岛大学吧链接。验证：Python 单测 18/18，构建通过，回归 88/88 + 新增 v18（贴吧舆情 / 学院分类 / 贴吧入口）。 |
| 2026-08-17 | v1.1.0（1st） | 本日志之前记录于会话内。含：数据链路修复、课程表全量、生活费增强、题库 102 题、今天吃什么校区筛选。（见 README 版本历史 v1.1.0） |
| 2026-08-16 | v1.0.0 | 前端工程化重构为可移植模板（config/site.js、router.js、utils/），版本号体系建立。详见 README 版本历史。 |
