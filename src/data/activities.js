/**
 * ════════════════════════════════════════════════════════════════════
 * @模块路径  src/data/activities.js
 * @职责      校园活动数据集：讲座/比赛/招新/志愿（活动报名工作流数据源）
 * @数据说明  首批 6 条为**示例活动**（格式示范）；对接第二课堂/团委发
 *            布接口后替换（见底部 API_CONTRACT）
 * @入口      ACTIVITIES / activityById / upcoming / signupLocal
 * ════════════════════════════════════════════════════════════════════
 *
 * [BE] GET /api/activities?before=<date> → {activities:[…]}
 * [BE] POST /api/activities/:id/signup → 报名 {activityId, name}（名额校验服务端做）
 */

export const ACTIVITIES = [
  { id: 'a1', title: '“挑战杯”校赛宣讲会', org: '校团委', date: '2026-10-15', place: '大学生活动中心', quota: 300, signed: 0, tags: ['竞赛', '挑战杯'], demo: true },
  { id: 'a2', title: 'AI 编程马拉松（48h）', org: '计算机学院', date: '2026-10-20', place: '机房楼', quota: 120, signed: 0, tags: ['编程', 'AI', '竞赛'], demo: true },
  { id: 'a3', title: '秋季双选会', org: '就业指导中心', date: '2026-11-02', place: '体育馆', quota: 2000, signed: 0, tags: ['就业', '招聘'], demo: true },
  { id: 'a4', title: '敬老院志愿服务', org: '青年志愿者协会', date: '2026-10-18', place: '校门口集合', quota: 40, signed: 0, tags: ['志愿', '二课'], demo: true },
  { id: 'a5', title: '英语角：AI 与未来', org: '外语学院', date: '2026-10-16', place: '图书馆三楼', quota: 60, signed: 0, tags: ['英语', '交流'], demo: true },
  { id: 'a6', title: '篮球新生杯', org: '体育学院', date: '2026-10-22', place: '东操场', quota: 16, signed: 0, tags: ['体育', '新生'], demo: true }
]

const LS_SIGN = 'agent_activity_sign_v1'

export function activityById(id) {
  return ACTIVITIES.find((a) => a.id === id) || null
}
/** 未过期活动（按日期正序；过期自动沉底标注） */
export function upcoming() {
  const today = new Date().toISOString().slice(0, 10)
  return ACTIVITIES.slice().sort((a, b) => a.date < b.date ? -1 : 1).map((a) => ({
    ...a, expired: a.date < today, left: Math.max(0, (a.quota || 0) - (a.signed || 0))
  }))
}
/** 本机报名记录（后端期换服务端；幂等：同活动一次） */
export function signedIds() {
  try { return JSON.parse(localStorage.getItem(LS_SIGN) || '[]') } catch { return [] }
}
export function signupLocal(id) {
  const arr = signedIds()
  if (arr.includes(id)) return { already: true }
  arr.push(id)
  try { localStorage.setItem(LS_SIGN, JSON.stringify(arr)) } catch { /* noop */ }
  const a = activityById(id)
  if (a) a.signed = (a.signed || 0) + 1
  return { already: false }
}
