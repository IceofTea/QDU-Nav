# QDU 校园导航

> **🌐 在线访问：<https://IceofTea.github.io/QDU-Nav/>**（由 GitHub Actions 自动构建并部署到 GitHub Pages，见下方「部署」）

面向青岛大学的校园服务聚合入口（非官方演示站），受福师大社区项目 NextFStar 启发，亮色清新、移动端优先。

## 功能

| 应用 | 说明 |
| --- | --- |
| 📢 校园动态 | 教务处官网通知/动态，随快照定时更新 |
| 🗓️ 课程表 | **真实课表查询**（班级 / 教室 / 教师 → 周课表），支持**学期切换**与**按周次筛选**；数据来自教务处课程总表，**合并最近 7 个学期**（约 5 万条排课，教室并集 780+ 间） |
| 🧭 教室导航 | 空教室查询（结果独立页）+ 教室一周占用 + 教学楼导航指引 |
| 📅 校历 | 官方校历入口 + 学期时间线 |
| 🍽️ 食堂空座率 | 官方食堂名单 + 营业时段实时判定 + 真实档口/招牌菜 |
| 🪪 新生学号查询 | 官方录取查询入口与流程引导（录取系统需校内环境，不做代查） |
| 💪 体测计算器 · 🍜 今天吃什么 · 🎡 美食轮盘 · 🎯 青大知多少 · 🧩 教学楼速配 | 校园工具与游戏 |

## 技术栈

- **前端**：Vue 3 + Vite，静态资源部署，支持 Hash 路由分享
- **网关**：原生 Node HTTP（`server/index.mjs`，端口 8787），抓取并解析教务数据
- **爬虫**：`crawler/`（Python，仅标准库）与 `scripts/snapshot.mjs`（Node）**双实现**，输出格式一致、可互换
- **数据层**：`scripts/snapshot.mjs` / `crawler/build_snapshot.py` 将官网数据落盘为 `public/data/snapshot.json`（含最近 7 个学期课程总表全量排课，前端 API 请求失败时自动回退快照，保证纯静态托管可用）

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

- GitHub Actions `refresh-snapshot` 工作流**每 6 小时**（北京时间 08:23 / 14:23 / 20:23 / 02:23）自动运行爬虫，**优先使用 Python 版**（`crawler/build_snapshot.py`），失败时自动回退 Node 版（`node scripts/snapshot.mjs`）；重新抓取全部学期课程总表、通知（前 4 页约 60 条）、动态、校历，并在数据有变化时提交推送到 main 分支
- 推送自动触发 `deploy` 工作流重新构建并部署 GitHub Pages，因此线上站点始终反映**最近一次抓取**的数据

### 手动更新（随时触发）

**方式一：网页一键触发（推荐）**
1. 打开仓库 **Actions** 页签
2. 选中左侧 **refresh-snapshot** 工作流
3. 点 **Run workflow** → 绿色按钮，立即在 GitHub 云端重跑抓取并自动部署

**方式二：本地命令行**
```bash
python crawler/build_snapshot.py   # Python 版（首选）
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
├── src/                    # Vue 前端（views 视图 / api 数据层 / data 静态数据）
├── server/
│   ├── index.mjs           # 原生 Node 网关（8787）
│   └── parse_kcb.py        # 课程总表 xlsx 解析（仅 Python 标准库）
├── crawler/                # Python 版爬虫（仅标准库，与 Node 版等价）
│   ├── config.py           # 数据源 / 抓取参数 / 输出路径
│   ├── fetcher.py          # 通用抓取（超时 / 重试）
│   ├── parsers.py          # 页面结构解析（通知 / 动态 / 多页合并）
│   └── build_snapshot.py   # 快照构建器（定时任务首选入口）
├── scripts/
│   └── snapshot.mjs        # Node 版快照抓取脚本（等价实现）
├── public/data/snapshot.json  # 定时更新的数据快照
└── .github/workflows/      # snapshot.yml 定时爬取 / deploy.yml 构建部署
```

## 关于与版权

- **网站开发者**：炎黄YH
- **数据版权**：站内数据抓取自青岛大学官网公开页面，版权归青岛大学及相关版权方所有；本站仅聚合展示并在界面标注来源
- **用途**：本站为学习与校园生活便利而制作，内容仅供学习交流与实用参考，**不用于任何商业目的**
- 页面脚本均为本站原创（MIT 许可），但爬取的课程数据、通知、校历等文本版权归属原发布方

## 免责声明

非青岛大学官方服务。数据来自学校公开渠道并定时抓取，仅供学习交流，请以学校官方最新通知为准；任何接入官方系统的自动化行为请遵守校规校纪与法律法规。