/**
 * ════════════════════════════════════════════════════════════════════
 * @模块路径  src/data/campusLife.js
 * @职责      校园生活静态数据：校车时刻 + 图书馆开闭馆 + 快递点
 *            —— 首批为**示例数据**（格式示范，出行以官方最新通知为准）；
 *            对接MIS/后勤接口后替换（见底部 API_CONTRACT）
 * @入口      SHUTTLE / LIBRARY / EXPRESS / openNow
 * ════════════════════════════════════════════════════════════════════
 *
 * [BE] GET /api/shuttle → 校车实时时刻
 * [BE] GET /api/library/status → 开闭馆实时状态
 */

/** 校车（示例）： Laureate 路线为格式示范 */
export const SHUTTLE = [
  { line: '浮山校区 → 金家岭校区', times: ['07:20', '09:40', '12:30', '14:00', '16:30'], demo: true },
  { line: '金家岭校区 → 浮山校区', times: ['08:00', '10:20', '13:10', '15:00', '17:20'], demo: true },
  { line: '松山校区环线', times: ['07:40', '11:30', '14:20', '17:00'], demo: true }
]

/** 图书馆（示例开闭馆；节假日以馆方通知为准） */
export const LIBRARY = {
  name: '图书馆总馆', open: '07:30', close: '22:30', demo: true,
  rooms: [
    { name: '二楼社科借阅室', open: '08:00', close: '21:30' },
    { name: '三楼自科借阅室', open: '08:00', close: '21:30' },
    { name: '五楼自习区', open: '07:30', close: '22:30' }
  ]
}

/** 快递点（示例） */
export const EXPRESS = [
  { name: '东区菜鸟驿站', place: '东区生活服务中心一楼', hours: '09:00-20:00', demo: true },
  { name: '西区快递超市', place: '西区商业街12号', hours: '09:30-21:00', demo: true },
  { name: '顺丰校内点', place: '南门旁', hours: '10:00-19:00', demo: true }
]

/** 当前是否在开放时段内（HH:MM 字符串比较，跨天视为全天） */
export function openNow(open, close, nowH = null, nowM = null) {
  const d = new Date()
  const cur = String(nowH != null ? nowH : d.getHours()).padStart(2, '0') +
    String(nowM != null ? nowM : d.getMinutes()).padStart(2, '0')
  if (!open || !close || open >= close) return true
  return cur >= open && cur <= close
}

/** 下一班校车（给定线路 + 当前时间HH:MM，返回 null 表示收车） */
export function nextBus(times, cur) {
  const list = (times || []).slice().sort()
  return list.find((t) => t > cur) || null
}
