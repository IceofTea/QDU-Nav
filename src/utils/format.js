/**
 * 通用格式化工具
 */

/**
 * 将 ISO 时间串格式化为本地中文时间（24 小时制）。
 * @param {string} iso ISO 8601 时间串
 * @returns {string} 例：2026/8/17 09:30:00
 */
export const fmtTime = (iso) => new Date(iso).toLocaleString('zh-CN', { hour12: false })