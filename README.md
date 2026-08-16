# QDU 校园导航

面向青岛大学的校园服务聚合入口（非官方演示站），受福师大社区项目 NextFStar 启发，亮色清新、移动端优先。

## 功能

| 应用 | 说明 |
| --- | --- |
| 📢 校园动态 | 教务处官网通知/动态，随快照定时更新 |
| 🗓️ 课程表 | 官方课程总表 + 真实课表查询（班级 / 教室 / 教师 → 周课表），解析自教务处课程总表 xlsx |
| 🧭 教室导航 | 空教室查询（结果独立页）+ 教室一周占用 + 教学楼导航指引 |
| 📅 校历 | 官方校历入口 + 学期时间线 |
| 🍽️ 食堂空座率 | 官方食堂名单 + 营业时段实时判定 + 真实档口/招牌菜 |
| 🪪 新生学号查询 | 官方录取查询入口与流程引导（录取系统需校内环境，不做代查） |
| 💪 体测计算器 · 🍜 今天吃什么 · 🎡 美食轮盘 · 🎯 青大知多少 · 🧩 教学楼速配 | 校园工具与游戏 |

## 技术栈

- **前端**：Vue 3 + Vite，静态资源部署，支持 Hash 路由分享
- **网关**：原生 Node HTTP（`server/index.mjs`，端口 8787），抓取并解析教务数据
- **数据层**：`scripts/snapshot.mjs` 将官网数据落盘为 `public/data/snapshot.json`（约 1 MB，含课程总表全量排课），前端 API 请求失败时自动回退快照，保证纯静态托管可用

## 数据更新（定时爬取）

网站数据不是「部署时的一次性快照」，而是**持续定时爬取**：

- GitHub Actions `refresh-snapshot` 工作流**每 6 小时**（北京时间 08:23 / 14:23 / 20:23 / 02:23）自动运行 `node scripts/snapshot.mjs`，重新抓取教务处官网的课程总表、通知、动态、校历，并在数据有变化时提交推送到 main 分支
- 推送自动触发 `deploy` 工作流重新构建并部署 GitHub Pages，因此线上站点始终反映**最近一次抓取**的数据
- 也可手动触发：仓库 → Actions → `refresh-snapshot` → Run workflow；或本地执行 `node scripts/snapshot.mjs` 后提交

> 课程总表为学校定期发布的公开文件（通常每学期更新一次）；通知、动态、校历则随官网实时变化，每 6 小时抓取足够及时。

## 本地运行

```bash
npm install
npm run dev        # 前端开发服务器
node server/index.mjs   # 数据网关 8787（可选，前端无网关时回退快照）
```

## 部署

- 推送到 `main` 分支即触发 GitHub Pages 自动构建部署（`deploy.yml`）
- 首次启用需在仓库 **Settings → Pages → Source** 选择 **GitHub Actions**

## 目录结构

```
QDU-Nav/
├── src/                    # Vue 前端（views 视图 / api 数据层 / data 静态数据）
├── server/
│   ├── index.mjs           # 原生 Node 网关（8787）
│   └── parse_kcb.py        # 课程总表 xlsx 解析（仅 Python 标准库）
├── scripts/
│   └── snapshot.mjs        # 快照抓取脚本（定时任务入口）
├── public/data/snapshot.json  # 定时更新的数据快照
└── .github/workflows/      # snapshot.yml 定时爬取 / deploy.yml 构建部署
```

## 免责声明

非青岛大学官方服务。数据来自学校公开渠道并定时抓取，仅供学习交流，请以学校官方最新通知为准；任何接入官方系统的自动化行为请遵守校规校纪与法律法规。