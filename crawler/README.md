# QDU-Nav 爬虫（Python）

本目录提供将「QDU 校园导航」数据对接青岛大学**公开页面**的爬虫工具，**仅使用 Python 标准库**，零第三方依赖、零安装成本，CI 与本地均可直接运行。

## 模块职责

| 文件 | 职责 |
| --- | --- |
| `config.py` | 数据源地址、抓取参数、输出路径 |
| `fetcher.py` | 通用抓取（文本/二进制），带超时与重试 |
| `parsers.py` | 页面结构解析：教务通知、首页动态、通知多页合并去重 |
| `build_snapshot.py` | **快照构建器（主入口）**：抓取课程总表（xlsx 下载+解析）、通知、动态、校历，生成 `public/data/snapshot.json` |
| `validate.py` | 快照质量校验（schema/数量/一致性），CI 质量门禁 |
| `analysis.py` | 课程数据洞察：从快照聚合统计，生成 `public/data/course_stats.json` |
| `diff.py` | 快照差异摘要：对比上次快照，输出变更（通知增减等） |
| `qdu_crawler.py` | 公开公告 / 校历大图抓取（工具，演示用法） |

## 使用

```bash
# 构建快照（定时任务首选入口）
python crawler/build_snapshot.py

# 校验快照（非零退出码 = 有质量问题）
python crawler/validate.py

# 课程数据洞察
python crawler/analysis.py

# 单元测试（解析器 / schema / xlsx 解析 / 公开抓取）
python -m unittest discover -s tests

# 公告抓取工具
python crawler/qdu_crawler.py --source jwc --out output/announcements.json
python crawler/qdu_crawler.py --calendar
```

## 与 Node 版的关系

`scripts/snapshot.mjs` 为等价实现，输出格式完全一致。CI 优先使用 Python 版，失败自动回退 Node 版。

## 数据来源

全部来自青岛大学官网公开页面（`https://jwc.qdu.edu.cn` 教务处、`https://zs.qdu.edu.cn` 招生网）。本站**不抓取任何需要账号的个人数据**；早期「正方教务模拟登录」示例因合规与安全原因已移除。