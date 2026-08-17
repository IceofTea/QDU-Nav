# QDU 校园导航

> **🌐 在线访问：<https://IceofTea.github.io/QDU-Nav/>**（由 GitHub Actions 自动构建并部署到 GitHub Pages，见下方「部署」）
>
> **🏷️ 当前版本：v1.0.0**（初始模板版。版本号在 `src/config/site.js` 中维护，页脚与「关于本站」面板同步展示）

面向青岛大学的校园服务聚合入口（非官方演示站），受福师大社区项目 NextFStar 启发，亮色清新、移动端优先。**本站同时是一套可直接复用的「学习导航站」工程模板**：品牌、文案、配色、应用注册、数据源均已模块化，参考本仓库改造为其他学校 / 其他主题的导航站成本极低（见「二次开发：移植与扩展」）。

## 功能

| 应用 | 说明 |
| --- | --- |
| 📢 校园动态 | 教务处官网通知/动态，随快照定时更新 |
| 🗓️ 课程表 | **真实课表查询**（班级 / 教室 / 教师 → 周课表），支持**学期切换**与**按周次筛选**；数据来自教务处课程总表，**合并最近 7 个学期**（约 5 万条排课，教室并集 780+ 间） |
| 🧭 教室导航 | 空教室查询（结果独立页）+ 教室一周占用 + 教学楼导航指引 |
| 📅 校历 | 官方校历入口 + 学期时间线 |
| 🍽️ 食堂空座率 | 官方食堂名单 + 营业时段实时判定 + 真实档口/招牌菜 |
| 🪪 新生学号查询 | 官方录取查询入口与流程引导（录取系统需校内环境，不做代查） |
| 📊 数据洞察 | 基于近 7 学期 5 万条排课的统计：热门教室 / 教师 / 课程、学期趋势、周节次分布（Python 聚合） |
| 💪 体测计算器 · 🍜 今天吃什么 · 🎡 美食轮盘 · 🎯 青大知多少 · 🧩 教学楼速配 | 校园工具与游戏 |

## 技术栈

- **前端**：Vue 3 + Vite，静态资源部署，支持 Hash 路由分享
- **网关**：原生 Node HTTP（`server/index.mjs`，端口 8787），抓取并解析教务数据
- **Python 数据侧**：`crawler/`（仅标准库）承担**爬取 → 校验 → 测试 → 分析 → 差异**整条数据链路，与 Node 版双实现互为保障
- **数据层**：快照 `public/data/snapshot.json`（含最近 7 个学期课程总表全量排课，前端 API 请求失败时自动回退快照，保证纯静态托管可用）+ 洞察 `public/data/course_stats.json`

### 前端模块划分（`src/`）

| 目录 / 文件 | 职责 | 移植时 |
| --- | --- | --- |
| `config/site.js` | **站点唯一配置**：名称、品牌、版本、版权、来源说明、外部链接 | ✅ 改这里即可换品牌与文案 |
| `router.js` | 视图注册表（`VIEWS`）+ 底部导航（`NAV_APPS`）+ Hash 路由解析 | ✅ 新增/调整应用入口 |
| `data/` | 全部静态数据（应用注册表、校区、食堂、教室、题库等） | ✅ 换成本校数据 |
| `api/` | 网关优先 + 快照兜底的数据访问层 | 一般不动 |
| `utils/` | 公共工具（课程解析 / 格式化） | 一般不动 |
| `views/` | 各应用页面（每个 `.vue` 一个应用） | ✅ 增删应用 |
| `components/` | 可复用组件（如 `CountUp` 数字滚动） | 一般不动 |
| `styles.css` | 全局样式，`:root` CSS 变量控制主色调 | ✅ 换配色只改变量 |

### Python 数据链路（`crawler/`）

| 模块 | 职责 | 入口 |
| --- | --- | --- |
| `build_snapshot.py` | 抓取课程总表（xlsx 下载+解析）、通知、动态、校历 → 生成快照 | `python crawler/build_snapshot.py` |
| `validate.py` | 快照质量门禁（schema / 数量 / 一致性），CI 提交前强制运行 | `python crawler/validate.py` |
| `analysis.py` | 聚合课程数据 → 数据洞察页数据 | `python crawler/analysis.py` |
| `diff.py` | 对比上次快照输出变更摘要，写入 CI 提交信息 | `python crawler/diff.py` |
| `fetcher.py` / `parsers.py` / `config.py` | 通用抓取 / 页面解析 / 配置 | — |
| `qdu_crawler.py` | 公开公告与校历图片抓取（工具演示） | `python crawler/qdu_crawler.py --calendar` |
| `server/parse_kcb.py` | 课程总表 xlsx 解析（纯标准库） | — |

**质量保障**：`tests/` 含 14 个单元测试（解析器 / 快照 schema / xlsx 解析 / 公开抓取），CI 与本地 `python -m unittest discover -s tests` 均会运行；快照在任何提交前都必须通过 `validate.py`，防止学校改版导致数据静默退化。

## 数据来源与爬取原理

网站所有「实时」数据均来自**青岛大学官网公开页面**（`jwc.qdu.edu.cn` 教务处），本站不做任何数据转发/代理，仅定时抓取后静态聚合展示：

| 数据 | 来源 | 抓取内容 |
| --- | --- | --- |
| 教务通知（约 60 条） | 教务处**通知列表** `jwtz.htm` 及分页 `jwtz/N.htm`（前 4 页合并去重） | 标题 / 日期 / 原文链接 |
| 教学动态（3 条） | 教务处首页 `index.htm` | 标题 / 封面图 / 原文链接 |
| 校历（约 15 条） | 教务处校历列表 `xl.htm` | 标题 / 日期 / 原文链接 |
| 课程总表（7 学期，约 5 万条排课） | 教务处课程总表列表 `xxgk/kcap.htm` → 逐学期详情页下载 `xlsx` → `server/parse_kcb.py` 解析（纯标准库） | 课程 / 学院 / 教师 / 班级 / 周次 / 节次 / 教室 |

解析规则与上游页面结构一一对应（`notice_box` 列表项、`download.jsp` 附件链接等），学校改版时需要同步更新解析器。爬取频率克制（每 6 小时一次），仅在公开页面抓取公开信息。

## 数据更新（定时爬取）

网站数据不是「部署时的一次性快照」，而是**持续定时爬取**：

- GitHub Actions `refresh-snapshot` 工作流**每 6 小时**（北京时间 08:23 / 14:23 / 20:23 / 02:23）自动运行：**Python 版爬虫**（`crawler/build_snapshot.py`，失败自动回退 Node 版 `scripts/snapshot.mjs`）→ 重新抓取全部学期课程总表、通知（前 4 页约 60 条）、动态、校历 → 生成洞察数据（`analysis.py`）→ **质量校验**（`validate.py` + 单元测试）→ 计算差异摘要（`diff.py`）→ 有变化时提交推送 main 分支
- 推送自动触发 `deploy` 工作流重新构建并部署 GitHub Pages，因此线上站点始终反映**最近一次抓取**的数据

### 手动更新（随时触发）

**方式一：网页一键触发（推荐）**
1. 打开仓库 **Actions** 页签
2. 选中左侧 **refresh-snapshot** 工作流
3. 点 **Run workflow** → 绿色按钮，立即在 GitHub 云端重跑抓取并自动部署

**方式二：本地命令行**
```bash
python crawler/build_snapshot.py   # Python 版（首选）
python crawler/analysis.py         # 生成数据洞察统计
python crawler/validate.py         # 质量校验（可选，CI 会自动跑）
# 或
node scripts/snapshot.mjs          # Node 版（等价）
git add -A && git commit -m "data: refresh snapshot" && git push origin main
```
推送到 main 后 `deploy` 工作流会自动构建部署，线上即更新。

> 课程总表为学校定期发布的公开文件（通常每学期更新一次）；通知、动态、校历则随官网实时变化，每 6 小时抓取足够及时。若遇官网临时维护导致抓取失败，工作流会自动跳过本次、保留上次快照，不影响线上可用性。

## 本地运行

```bash
npm install
npm run dev        # 前端开发服务器
node server/index.mjs   # 数据网关 8787（可选，前端无网关时回退快照）
```

## 部署

- 推送/定时任务提交到 `main` 分支，即由 `deploy.yml`（GitHub Actions）自动执行 `npm run build`，将产物发布到 **GitHub Pages**，全程无需手动干预
- 仓库 Pages 的 **Source** 已配置为 **GitHub Actions**（由 `actions/deploy-pages` 发布），后续版本更新无需再修改任何 Pages 设置
- `refresh-snapshot`（数据）与 `deploy`（构建）两个工作流相互独立：数据变化才触发重新部署，避免无谓构建

## 目录结构

```
QDU-Nav/
├── src/                    # Vue 前端
│   ├── config/site.js      #   ★ 站点唯一配置（品牌/版本/文案/版权，移植入口）
│   ├── router.js           #   ★ 视图注册表 + 底部导航 + Hash 路由
│   ├── main.js / App.vue   #   应用入口 / 根组件（组装 Welcome + 顶栏 + 视图 + 页脚）
│   ├── styles.css          #   全局样式（:root CSS 变量控制主色调）
│   ├── api/                #   数据访问层（网关优先 / 快照兜底 / 数据洞察）
│   ├── utils/              #   公共工具（课程班级解析 / 时间格式化）
│   ├── components/         #   可复用组件（CountUp 等）
│   ├── data/               #   静态数据（应用注册表 / 校区 / 食堂 / 教室 / 题库…）
│   └── views/              #   应用页面（一个 .vue 一个应用）
├── server/
│   ├── index.mjs           # 原生 Node 网关（8787）
│   └── parse_kcb.py        # 课程总表 xlsx 解析（仅 Python 标准库）
├── crawler/                # Python 数据侧（仅标准库）
│   ├── config.py           # 数据源 / 抓取参数 / 输出路径
│   ├── fetcher.py          # 通用抓取（超时 / 重试）
│   ├── parsers.py          # 页面结构解析（通知 / 动态 / 多页合并）
│   ├── build_snapshot.py   # 快照构建器（定时任务首选入口）
│   ├── validate.py         # 快照质量校验（CI 质量门禁）
│   ├── analysis.py         # 课程数据洞察聚合
│   ├── diff.py             # 快照差异摘要
│   └── qdu_crawler.py      # 公开公告 / 校历图片抓取（工具）
├── tests/                  # Python 单元测试（解析器 / schema / xlsx / 公开抓取）
├── scripts/
│   ├── snapshot.mjs        # Node 版快照抓取脚本（等价实现，回退用）
│   └── gen-classrooms.mjs  # 楼宇/教室数据生成（从课程总表派生）
├── public/data/snapshot.json     # 定时更新的数据快照
├── public/data/course_stats.json # 定时更新的数据洞察统计
└── .github/workflows/      # snapshot.yml 定时爬取 / deploy.yml 构建部署
```

## 二次开发：移植与扩展

本站按「**改配置 → 换数据 → 增应用**」三步即可改造成任意主题的学习导航站，视图与逻辑无需改动。

### 1. 换品牌与文案（3 分钟）

编辑 `src/config/site.js` 一个文件即可：`name` / `brand` / `tagline` / `motto` / `version` / 版权与来源说明 / Wiki 社区链接。顶栏、欢迎页、页脚、首页关于面板、数据来源声明会全部同步更新。

### 2. 换主色调（1 分钟）

编辑 `src/styles.css` 顶部的 `:root` 变量（`--primary` 主色、`--accent` 强调色、`--bg` 背景等），全站配色即换，无需改任何组件。

### 3. 换成本校数据

- **静态数据**：`src/data/` 下的校区、食堂、教室、题库等直接替换为本校内容；
- **动态数据**：本仓库的爬虫链路（`crawler/` + `scripts/snapshot.mjs`）面向「教务处公开栏目」设计——把 `crawler/config.py` 的抓取 URL 与 `crawler/parsers.py` / `server/parse_kcb.py` 的解析规则换成目标站点的页面结构即可；若暂无爬虫，也可以直接准备一份符合 `snapshot.json` schema 的静态文件放进 `public/data/`（schema 定义见 `tests/test_snapshot_schema.py`），站点即可离线工作。

### 4. 新增一个应用（3 步）

1. 在 `src/views/` 新建页面组件（可仿照任一现有应用；页面内统一通过 `emit('back')` 返回、`emit('open', appId)` 跳转其他应用）；
2. 在 `src/data/apps.js` 的 `apps` 数组追加一项 `{ id, title, desc, icon, color, group, link: '#/app/<id>' }`（首页网格与应用分类会自动出现）；
3. 在 `src/router.js` 的 `VIEWS` 注册表登记 `id → 组件`；如需出现在底部导航，再在 `NAV_APPS` 加一项。

完成。移除一个应用同理：删视图、删 `apps` 条目、删 `VIEWS` 登记即可。

### 5. 版本管理约定

- 版本号只维护在 `src/config/site.js` 的 `SITE.version`，页脚与「关于本站」自动展示；README 顶部的版本行请在发版时同步更新；
- 建议语义化版本：`1.x.y`（功能迭代）/ `2.x.y`（较大重构）。

## 关于与版权

- **网站开发者**：炎黄YH
- **数据版权**：站内数据抓取自青岛大学官网公开页面，版权归青岛大学及相关版权方所有；本站仅聚合展示并在界面标注来源
- **用途**：本站为学习与校园生活便利而制作，内容仅供学习交流与实用参考，**不用于任何商业目的**
- 页面脚本均为本站原创（MIT 许可），但爬取的课程数据、通知、校历等文本版权归属原发布方

## 版本历史

| 版本 | 说明 |
| --- | --- |
| **v1.0.0** | **初始模板版**。完成前端工程化重构：站点配置（`config/site.js`）、路由注册表（`router.js`）、公共工具（`utils/`）模块化拆分，消除分散文案与重复工具函数；全文件补齐模块注释；新增版本号标注（页脚 / 关于面板 / README）与「二次开发：移植与扩展」指南。此前为无版本号的功能迭代。 |

## 免责声明

非青岛大学官方服务。数据来自学校公开渠道并定时抓取，仅供学习交流，请以学校官方最新通知为准；任何接入官方系统的自动化行为请遵守校规校纪与法律法规。