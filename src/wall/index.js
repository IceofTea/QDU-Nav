/**
 * ════════════════════════════════════════════════════════════════════
 * @模块路径  src/wall/index.js
 * @职责      校园墙统一出口（接口化）：调用方只从这里 import，不再深挖
 *            子模块路径 —— 新增 wall 能力时同步登记本表
 * @入口      api（loadPosts/createPost/likePost/replyPost/…）·
 *            config（PARTS/POINTS/LEVELS/API_CONTRACT）· search（检索 v2）·
 *            moderation（治理）· notify（通知）· drafts（草稿箱 v2）·
 *            stats（洞察聚合）· aiMod（AI 治理）· cloud（公有云）·
 *            apiBase（基地址解析）
 * @分层      api.js 是唯一数据层；其余为纯函数/状态封装；组件禁直连 fetch
 * ════════════════════════════════════════════════════════════════════
 */
export * from './api.js'
export * from './config.js'
export * from './search.js'
export * from './moderation.js'
export * from './notify.js'
export * from './drafts.js'
export * from './stats.js'
export * from './aiMod.js'
export * from './cloud.js'
export * from './apiBase.js'
