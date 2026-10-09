/**
 * ════════════════════════════════════════════════════════════════════
 * @模块路径  src/agent/index.js
 * @职责      智能体统一出口：engine（状态机）· workflows（执行层）·
 *            intents（识别）· converse（交互）· profile（画像）·
 *            slots/faq/navAnswer（识别支撑）
 * @分层      engine 是唯一入口（handle/greeting）；工作流只经 runWorkflow 调度
 * ════════════════════════════════════════════════════════════════════
 */
export * from './engine.js'
export * from './workflows.js'
export * from './intents.js'
export * from './converse.js'
export * from './profile.js'
export * from './slots.js'
export * from './faq.js'
