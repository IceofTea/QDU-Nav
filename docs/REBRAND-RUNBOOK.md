# 一键换校操作手册（Runbook）· 特色功能

> 承诺"5 分钟适配一所高校"。端到端验证：Nav 沙盒 **7/7 PASS**（含智能体大脑切换）、
> Wiki **2/2 PASS**；站内还有可视化向导（应用「🔁 换校向导」）可先导出配置再执行。

## 三种方式（任选其一）

```bash
# 1) 交互式问答
python customize.py

# 2) JSON 配置（推荐：站内「换校向导」页可视化编辑 → 导出同构 JSON → 直接喂给脚本）
python customize.py --config templates/qdu.json

# 3) TUI / Excel（需 rich / openpyxl，缺失自动降级为纯命令行）
python customize_tui.py                  # 循环菜单：交互 / Excel / JSON
python customize_tui.py --excel 模板.xlsx
python customize_tui.py --template        # 生成 Excel 模板
```

## 脚本改写落点（7 处，全部幂等正则、可重复执行）

| # | 文件 | 改什么 |
|---|---|---|
| 1 | `src/config/site.js` | brand / name / tagline / motto / copy / jwUrl |
| 2 | `src/data/apps.js` | 校区 / 学院 / 专业 统计数字 |
| 3 | `src/styles.css` | `--primary` / `--accent` 主题色 |
| 4 | `src/views/TiebaSentiment.vue` | 贴吧链接 |
| 5 | `src/data/siteSentiment.js` · `industryValue.js` | 存在才改（容错跳过） |
| 6 | **`src/agent/config.js`** | ★ **智能体大脑**：agentName / schoolShort / welcome 同步切换（"换校不换大脑，大脑跟着配置走"） |
| 7 | `index.html` | 页面 `<title>` |

## 三步移植流程（机制 → 工具 → 验收）

① **改配置**（上表脚本）→ ② **换数据**（`src/data` + `public/data` 快照，crawler 改域名后续跑）
→ ③ **增应用**（`views/` 新建 → `apps.js` 登记 → `router.js` 登记）。**全程不碰内核。**

## 验收清单（改完必跑）

```bash
python customize.py --config templates/<校>.json   # 应见 7 处 ✅ 输出（含"智能体大脑已切换"）
npm run build                                      # 构建通过
node scripts/smoke-community.mjs                   # 18/18
# 浏览器抽查：品牌色 · 校名 · 智能体欢迎语应为「<新校短名>智答」
```

## Wiki 站（百科）换校

```bash
python customize_wiki.py --config templates/qdu_wiki.json
```
落点：`mkdocs.yml`（site_name / site_url / repo_url / copyright / 贴吧社交链接）+
`docs/javascripts/chat-widget.js`（**跨站导航 NAV_URL** + 智能体名称与欢迎语）。

## 配置 JSON 模板

`templates/` 下已有三份同构配置：`pku.json`（示例）· `qdu.json` · `fjnu.json`。
字段：university / shortName / brand / motto / jwUrl / tiebaUrl / github / pagesUrl /
campuses / colleges / majors / theme{name, primary, accent, bg}。
读取兼容 UTF-8 BOM（记事本另存的 JSON 也能用）。
