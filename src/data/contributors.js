/**
 * 贡献者名单（贡献者墙数据源）
 * ---------------------------------------------------------------------------
 * name  展示名；url  GitHub 主页；login  GitHub 用户名（用于头像）；role  贡献说明；weight  词云权重（决定字号）
 * 站点对社区的每一次代码贡献都会在此致谢。
 */
export const contributors = [
  {
    name: 'IceofTea',
    login: 'IceofTea',
    url: 'https://github.com/IceofTea',
    role: '项目创建与整体维护',
    weight: 2,
    emoji: '🧑‍💻'
  },
  {
    name: 'Huanuyn',
    login: 'Huanuyn1',
    url: 'https://github.com/Huanuyn1',
    role: '社区贡献 · 修复课程接口解析路径与美食轮盘指针',
    weight: 1.2,
    emoji: '🚀'
  },
  {
    name: 'qdu-nav-bot',
    login: 'qdu-nav-bot',
    url: 'https://github.com/IceofTea/QDU-Nav/actions',
    role: '定时数据抓取与快照提交机器人',
    weight: 0.8,
    emoji: '🤖'
  }
]