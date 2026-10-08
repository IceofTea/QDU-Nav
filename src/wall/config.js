/**
 * ════════════════════════════════════════════════════════════════════
 * @模块路径  src/wall/config.js
 * @职责      校园墙（超级论坛）全局配置：分区体系 / 帖子类型 / 积分规则 /
 *            广告位与预留后端接口契约 —— 一处改、全站生效（换校亦可改）
 * @入口      导出 WALL / PARTS / POST_TYPES / POINTS / ADS / API_CONTRACT
 * @被谁用    store.js · api.js · WallComposer/WallPostCard/WallSidebar/ CampusWall.vue · Agent workflows
 * @改动指南  加分区 → PARTS 追加；加帖子类型 → POST_TYPES + 对应卡片渲染；
 *            接后端 → 按 API_CONTRACT 注释实现 api.js 对应函数即可（mock 自动切真实）
 * @设计思想  无后端期：数据走"网关优先 + localStorage 兜底"双轨；后端期：
 *            只需实现 API_CONTRACT 中标注 [BE] 的接口，前端零改动切换
 * ════════════════════════════════════════════════════════════════════
 */

/** 论坛分区（对标贴吧板块制；icon 用 emoji，color 供分区标签着色） */
export const PARTS = [
  { id: 'all', name: '全部', icon: '🗂️', color: '#1b66c9' },
  { id: 'help', name: '求助', icon: '🙋', color: '#e11d48', desc: '有问必答，答对给赞' },
  { id: 'bounty', name: '悬赏', icon: '💰', color: '#d97706', desc: '发悬赏，采纳即结算（本地积分）' },
  { id: 'lost', name: '失物', icon: '🔍', color: '#0f766e', desc: '丢的捡的都看看' },
  { id: 'food', name: '美食', icon: '🍜', color: '#ea580c', desc: '食堂测评 · 外卖避雷 · 省钱攻略' },
  { id: 'study', name: '学业', icon: '📚', color: '#7c3aed', desc: '选课 · 考试 · 经验互换' },
  { id: 'resource', name: '资源', icon: '📦', color: '#2563eb', desc: '课件 · 模板 · 工具 · 电子书（预留链接/提取码字段）' },
  { id: 'notice', name: '公示', icon: '📢', color: '#0891b2', desc: '信息公开 · 活动公示 · 组织招新' },
  { id: 'trade', name: '二手', icon: '♻️', color: '#65a30d', desc: '校内二手交易（当面交易，谨防诈骗）' },
  { id: 'ride', name: '拼车', icon: '🚗', color: '#4f46e5', desc: '回家 · 返校 · 顺风拼单' },
  { id: 'rant', name: '吐槽', icon: '🗯️', color: '#be123c', desc: '理性吐槽，拒绝人身攻击' },
  { id: 'chat', name: '闲聊', icon: '☕', color: '#78716c', desc: '随便聊聊' }
]

/** 帖子类型（决定卡片渲染形态与可用操作） */
export const POST_TYPES = [
  { id: 'normal', name: '普通', icon: '📝' },
  { id: 'vote', name: '投票', icon: '🗳️', hint: '2~6 选项，每人每帖一票' },
  { id: 'bounty', name: '悬赏', icon: '💰', hint: '设置赏金积分，采纳最佳回答自动结算' },
  { id: 'resource', name: '资源', icon: '📦', hint: '资源链接 + 提取码 + 下载计数' },
  { id: 'notice', name: '公示', icon: '📢', hint: '信息公开/招新/活动（可申请置顶）' }
]

/** 积分规则（本地钱包，跨帖子通用；后端期迁移到账户系统——见 API_CONTRACT） */
export const POINTS = {
  signIn: 2,        // 每日签到
  post: 2,          // 发帖
  reply: 1,         // 回复
  liked: 1,         // 被点赞（模拟：自己给自己+1 仅演示——后端期由对方点赞触发）
  adopted: 10,      // 悬赏被采纳（回答方）
  bountyCost: 5,    // 发悬赏扣的赏金
  download: 0       // 资源被下载（预留）
}

export const WALLET_KEY = 'wall_points_v1'
export const SIGN_KEY = 'wall_sign_v1'
export const FAV_KEY = 'wall_fav_v1'

/* ════════════════════════════════════════════════════════════════════
 * 信任等级（借鉴 Discourse Trust Level 的轻量本土化）
 * —— 以积分为唯一依据（本地钱包），等级随贡献自然晋升，
 *    徽章展示在发帖人昵称旁；能力解锁做演示级提示（后端期服务端校验）
 * ════════════════════════════════════════════════════════════════════ */
export const LEVELS = [
  { min: 0, name: '见习', icon: '🌱', color: '#8b949e', desc: '新同学，先逛逛再说话' },
  { min: 20, name: '成员', icon: '🌿', color: '#2e7d32', desc: '可以发起投票与资源分享' },
  { min: 60, name: '活跃', icon: '🌟', color: '#1b66c9', desc: '发起悬赏、帖子更易被热榜推荐' },
  { min: 150, name: '资深', icon: '🔥', color: '#d97706', desc: '昵称专属描边 + 精华帖申请通道' },
  { min: 400, name: '领袖', icon: '👑', color: '#7c3aed', desc: '社区领袖：可推荐精选（后端期置顶权）' }
]

export function levelOf(points) {
  let cur = LEVELS[0]
  for (const l of LEVELS) if ((points || 0) >= l.min) cur = l
  return cur
}
export function nextLevel(points) {
  return LEVELS.find((l) => (points || 0) < l.min) || null
}

/* 成就徽章（本地达成即点亮，展示于个人积分卡） */
export const BADGES = [
  { id: 'first_post', name: '初来乍到', icon: '🎈', desc: '发布第一篇帖子', test: (w, s) => (s.posts || 0) >= 1 },
  { id: 'streak3', name: '三日之约', icon: '📅', desc: '连续签到 3 天', test: (w, s) => (s.streak || 0) >= 3 },
  { id: 'streak7', name: '一周全勤', icon: '🗓️', desc: '连续签到 7 天', test: (w, s) => (s.streak || 0) >= 7 },
  { id: 'rich', name: '积分自由', icon: '💰', desc: '积分达到 100', test: (w) => (w.points || 0) >= 100 },
  { id: 'reply5', name: '热心同学', icon: '💬', desc: '累计回复 5 次', test: (w, s) => (s.replies || 0) >= 5 },
  { id: 'explorer', name: '技能探索者', icon: '🧩', desc: '使用过 10 个智能体技能', test: (w, s) => (s.skills || 0) >= 10 }
]

/* ════════════════════════════════════════════════════════════════════
 * 广告位：现阶段用「俏皮话」占位（真实感 + 幽默感），后端期一键换真广告
 * ────────────────────────────────────────────────────────────────────
 * adSlot API 预留（后端实现后，ADS 换成接口返回即可，卡片渲染无需改）：
 *   GET /api/ads?slot=sidebar|feed → {ads:[{id,title,desc,img,url,clicks}]}
 *   POST /api/ads/:id/click        → 点击计数（防刷：IP 限 1 次/天/广告）
 * ════════════════════════════════════════════════════════════════════ */
export const ADS = [
  { slot: 'sidebar', title: '📢 广告位招租', desc: '本栏位现价：一顿食堂二楼麻辣香锅。有意者请对暗号「我是甲方」。', tag: '招租中' },
  { slot: 'sidebar', title: '🎓 保研辅导？', desc: '不需要。好好上课就是最好的辅导。（本广告位拒绝焦虑营销）', tag: '公益' },
  { slot: 'feed', title: '🍔 深夜放毒', desc: '东区二楼新档口，人均 15，不好吃你来打我（管理员已跑路）。', tag: '美食' },
  { slot: 'feed', title: '💼 校园 AI 招聘', desc: '会用 AI 的同学已经在替 AI 打工了。本广告位虚位以待，点击率 100%（管理员自己点的）。', tag: '招聘' },
  { slot: 'sidebar', title: '🧧 充值 100 送 100', desc: '充什么？充积分！签到就能白嫖的积分，为什么要充值？（钓鱼广告模拟器）', tag: '反诈' },
  { slot: 'feed', title: '📣 出二手：九成新高数课本', desc: '含全套绝望表情，附赠学长的泪痕。走平台担保（指当面给钱当场跑）。', tag: '二手' }
]

/* ════════════════════════════════════════════════════════════════════
 * 后端接口契约 API_CONTRACT —— 新同学/新 Agent 必读
 * ────────────────────────────────────────────────────────────────────
 * 现状：本项目暂无独立后端，数据双轨：
 *   A轨（已实现）社区网关 server/community.mjs —— 真·跨用户共享（部署即用）
 *   B轨（已实现）localStorage 兜底 —— 网关未连时单机可用，联网自动并轨
 * 后端期规划：把下列 [BE] 接口实现于任意服务端（Node/Python 均可），
 *   api.js 内每个函数已按契约封装，切换时仅改 BASE，前端组件零改动。
 *
 *   [BE] POST /api/wall/:id/adopt     采纳悬赏 {answerId} → 结算积分（幂等）
 *   [BE] POST /api/wall/:id/view      浏览计数（去重：IP+UA 每帖 1 次/天）
 *   [BE] POST /api/wall/:id/favorite  收藏/取消（需登录态，预留 uid 字段）
 *   [BE] GET  /api/wall/search?q=     全文检索（标题+内容+标签，Elastic/pg 均可）
 *   [BE] GET  /api/wall/hot           热榜（时间衰减 + 互动加权：score=likes*3+replies*2+views*0.1）
 *   [BE] POST /api/points/signin      每日签到（服务端防重刷）
 *   [BE] POST /api/points/wallet      积分钱包（迁移自 localStorage）
 *   [BE] GET  /api/pm/:peer           站内私信（预留 @提及 与私信）
 *   [BE] POST /api/admin/parts        分区管理（增删改，热更新 PARTS）
 *   [BE] POST /api/ads                广告管理（替换俏皮话占位）
 *   [BE] WS   /ws/wall                实时推送（新帖/回复/投票，替代 20s 轮询）
 * ════════════════════════════════════════════════════════════════════ */
export const API_CONTRACT = {
  adopt: 'POST /api/wall/:id/adopt {answerId} [BE]',
  view: 'POST /api/wall/:id/view [BE]',
  search: 'GET /api/wall/search?q= [BE]',
  hot: 'GET /api/wall/hot [BE]',
  signin: 'POST /api/points/signin [BE]',
  wallet: 'POST /api/points/wallet [BE]',
  pm: 'GET /api/pm/:peer [BE]',
  ads: 'GET /api/ads?slot= [BE]',
  ws: 'WS /ws/wall 实时推送 [BE]'
}

/** 帖子热度分（本地先算，后端期同公式服务端计算） */
export function hotScore(p) {
  const ageH = (Date.now() - (p.ts || 0)) / 3600000
  const engage = (p.likes || 0) * 3 + ((p.replies || []).length) * 2 + (p.views || 0) * 0.1 + (p.vote ? (p.vote.tallies || []).reduce((a, b) => a + b, 0) : 0)
  return engage / Math.pow(ageH + 2, 1.1)
}

/** 分区查找（未知 id 回落闲聊，防脏数据） */
export function partOf(id) {
  return PARTS.find((p) => p.id === id) || PARTS.find((p) => p.id === 'chat')
}
