/**
 * ════════════════════════════════════════════════════════════════════
 * @模块路径  src/utils/studyPlan.js
 * @职责      学习计划算法层：番茄钟状态机 + 艾宾浩斯复习排期 + 空教室
 *            推荐 + 学习周报聚合 —— ReminderCenter/任务链的“大脑”
 *            —— 红线：推荐必须基于真实课表/教室数据，缺数据即空态
 * @入口      Pomodoro（类）· ebbinghaus / planReviews · recommendRooms ·
 *            weeklyReport · taskChainExpand
 * @依赖      无（课表/教室由调用方透传；localStorage 只存番茄记录）
 * @被谁用    views/FocusTimer.vue · views/ReminderCenter.vue ·
 *            Agent workflows（任务链/学习计划）· scripts/unit-im.mjs
 * @后端切换  无需后端；全部本地计算 + 本机持久化
 * ════════════════════════════════════════════════════════════════════
 */

export const STUDY_VERSION = '1.0.0'

const LS_FOCUS = 'study_focus_v1'   // 番茄记录 [{startMin, endTs, label}]
const LS_PLAN = 'study_plan_v1'     // 复习卡 [{id, subject, firstTs, done:{1:ts,...}}]
const MAX_KEEP = 200

function lsGet(k, fb) {
  try { return JSON.parse(localStorage.getItem(k) || 'null') ?? fb } catch { return fb }
}
function lsSet(k, v) {
  try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* noop */ }
}
function genId() {
  return 'S' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

/* ──────────────────────── 1. 番茄钟状态机 ─────────────────────────
 * focus(25) → short(5) ×3 → long(15) → 下一轮；可配置，纯逻辑无定时器
 * （定时器由视图层 setInterval 驱动，本模块只管状态转移，保证可单测）
 */

export const POMO_PRESETS = {
  classic: { focus: 25, short: 5, long: 15, round: 4, name: '经典 25+5' },
  deep: { focus: 50, short: 10, long: 20, round: 3, name: '深度 50+10' },
  sprint: { focus: 15, short: 3, long: 10, round: 4, name: '冲刺 15+3' }
}

export class Pomodoro {
  constructor(preset = 'classic') {
    const p = POMO_PRESETS[preset] || POMO_PRESETS.classic
    this.preset = preset
    this.focusMin = p.focus
    this.shortMin = p.short
    this.longMin = p.long
    this.roundLen = p.round
    this.phase = 'idle'     // idle | focus | short | long
    this.doneInRound = 0    // 本轮已完成 focus 数
    this.totalFocus = 0     // 累计 focus 数
    this.leftSec = 0
  }
  /** 开始一个 focus（返回总秒数，视图层倒计时） */
  startFocus() {
    this.phase = 'focus'
    this.leftSec = this.focusMin * 60
    return this.leftSec
  }
  /** 当前阶段结束 → 自动转移，返回 {next, nextSec, roundDone} */
  finish() {
    if (this.phase === 'focus') {
      this.doneInRound++
      this.totalFocus++
      logFocus(this.focusMin)
      if (this.doneInRound >= this.roundLen) {
        this.phase = 'long'
        this.leftSec = this.longMin * 60
        this.doneInRound = 0
        return { next: 'long', nextSec: this.leftSec, roundDone: true }
      }
      this.phase = 'short'
      this.leftSec = this.shortMin * 60
      return { next: 'short', nextSec: this.leftSec, roundDone: false }
    }
    this.phase = 'idle'
    this.leftSec = 0
    return { next: 'idle', nextSec: 0, roundDone: false }
  }
  /** 中断（不计入完成，记录尝试时长供周报“坚持度”参考） */
  abort(elapsedSec) {
    logFocus(0, Math.max(0, Math.round(elapsedSec / 60)))
    this.phase = 'idle'
    this.leftSec = 0
  }
  label() {
    return { idle: '待开始', focus: '专注中', short: '短休息', long: '长休息' }[this.phase] || this.phase
  }
}

/** 落盘一条专注记录（min=0 为中断尝试） */
export function logFocus(min, abortMin = 0) {
  const arr = lsGet(LS_FOCUS, [])
  arr.unshift({ min, abortMin, ts: Date.now() })
  lsSet(LS_FOCUS, arr.slice(0, MAX_KEEP))
  return arr.length
}
/** 今日专注分钟（含中断折半？不，中断不计，只计完成，红线真实） */
export function todayFocusMin() {
  const ds = new Date().toDateString()
  return lsGet(LS_FOCUS, [])
    .filter((r) => new Date(r.ts).toDateString() === ds)
    .reduce((a, r) => a + (r.min || 0), 0)
}
/** 近 7 天专注序列（周报柱状图用） */
export function weekFocus() {
  const out = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000)
    const ds = d.toDateString()
    const min = lsGet(LS_FOCUS, [])
      .filter((r) => new Date(r.ts).toDateString() === ds)
      .reduce((a, r) => a + (r.min || 0), 0)
    out.push({ label: (d.getMonth() + 1) + '/' + d.getDate(), min })
  }
  return out
}

// ──────────────────────── 2. 艾宾浩斯复习排期 ─────────────────────────

/** 艾宾浩斯间隔（天）：1/2/4/7/15/30 */
export const EBB_STEPS = [1, 2, 4, 7, 15, 30]

/**
 * 新建复习卡（学完当天即第 0 天）
 * @param {string} subject 学科/章节
 */
export function addReviewCard(subject) {
  const s = String(subject || '').trim().slice(0, 60)
  if (!s) throw new Error('学科不能为空')
  const cards = lsGet(LS_PLAN, [])
  const card = { id: genId(), subject: s, firstTs: Date.now(), done: {} }
  cards.unshift(card)
  lsSet(LS_PLAN, cards.slice(0, MAX_KEEP))
  return card
}

/** 某卡的全部应复习日期（含已完成标记） */
export function cardSchedule(card) {
  const out = EBB_STEPS.map((gap, i) => {
    const step = i + 1
    const due = new Date(card.firstTs + gap * 86400000)
    return { step, gap, dueTs: due.getTime(), label: due.getMonth() + 1 + '/' + due.getDate(), done: !!(card.done && card.done[step]) }
  })
  return out
}

/** 今日到期（跨全部卡片，未完成且 due<=今天） */
export function dueReviews() {
  const today = new Date()
  today.setHours(23, 59, 59, 999)
  const out = []
  for (const c of lsGet(LS_PLAN, [])) {
    for (const s of cardSchedule(c)) {
      if (!s.done && s.dueTs <= today.getTime()) out.push({ card: c, ...s })
    }
  }
  return out.sort((a, b) => a.dueTs - b.dueTs)
}

/** 标记完成某步 */
export function doneReviewStep(cardId, step) {
  const cards = lsGet(LS_PLAN, [])
  const c = cards.find((x) => x.id === cardId)
  if (!c) return false
  c.done = c.done || {}
  c.done[step] = Date.now()
  lsSet(LS_PLAN, cards)
  return true
}
/** 删除复习卡 */
export function delReviewCard(cardId) {
  lsSet(LS_PLAN, lsGet(LS_PLAN, []).filter((x) => x.id !== cardId))
  return true
}
/** 全部复习卡（含排期，视图直接渲染） */
export function listReviewCards() {
  return lsGet(LS_PLAN, []).map((c) => ({ ...c, schedule: cardSchedule(c) }))
}

// ──────────────────────── 3. 空教室推荐 ─────────────────────────

/**
 * 空教室推荐（基于调用方传入的真实空教室列表 + 用户偏好排序）
 * @param {string[]} emptyRooms 真实空教室（/api/emptyRooms 或快照）
 * @param {object} pref {building: '博文楼'?, floor?: number, quiet?: boolean}
 *  quiet=true 时优先高楼层（经验规则，视图层注明“按高楼层优先排序”）
 */
export function recommendRooms(emptyRooms, pref = {}) {
  let list = (emptyRooms || []).map(String)
  if (pref.building) list = [...list.filter((r) => r.includes(pref.building)), ...list.filter((r) => !r.includes(pref.building))]
  if (pref.floor) {
    const f = Number(pref.floor)
    list = [...list.filter((r) => new RegExp(f + '\\d{2}').test(r)), ...list.filter((r) => !new RegExp(f + '\\d{2}').test(r))]
  }
  if (pref.quiet) {
    // 高楼层优先：提取房间号前 1-2 位楼层数（启示录：无编号规则时保持原序）
    const floorOf = (r) => {
      const m = r.match(/(\d)(\d{2})/)
      return m ? Number(m[1]) : 0
    }
    const head = pref.building ? list.filter((r) => r.includes(pref.building)) : list
    const rest = pref.building ? list.filter((r) => !r.includes(pref.building)) : []
    head.sort((a, b) => floorOf(b) - floorOf(a))
    list = [...head, ...rest]
  }
  return list.slice(0, 20).map((room, i) => ({ rank: i + 1, room }))
}

// ──────────────────────── 4. 学习周报 ─────────────────────────

/** 学习周报聚合（专注 + 复习完成率 + 一句话） */
export function weeklyReport() {
  const week = weekFocus()
  const totalMin = week.reduce((a, d) => a + d.min, 0)
  const cards = lsGet(LS_PLAN, [])
  let stepsDone = 0
  let stepsTotal = 0
  for (const c of cards) {
    stepsTotal += EBB_STEPS.length
    stepsDone += Object.keys(c.done || {}).length
  }
  const rate = stepsTotal ? Math.round((stepsDone / stepsTotal) * 100) : 0
  const best = week.reduce((a, b) => (b.min > a.min ? b : a), week[0])
  return {
    week, totalMin,
    hours: Math.round((totalMin / 60) * 10) / 10,
    reviewRate: rate,
    cards: cards.length,
    summary: totalMin === 0
      ? '本周还没有专注记录，开一个番茄试试 🍅'
      : `本周专注 ${totalMin} 分钟（${Math.round((totalMin / 60) * 10) / 10} 小时），${best.label} 最投入（${best.min} 分钟）；复习完成率 ${rate}%。`
  }
}

// ──────────────────────── 6. ICS 日历导出 ─────────────────────────
// 把站内日程导出为系统日历可订阅的 ICS（RFC 5545 最小子集，无依赖）

/** ICS 文本转义（反斜杠/逗号/分号/换行） */
function icsEsc(s) {
  return String(s ?? '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n').slice(0, 200)
}
function icsDate(d) {
  const p = (n) => String(n).padStart(2, '0')
  return d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + 'T' + p(d.getHours()) + p(d.getMinutes()) + '00'
}

/**
 * 生成单事件 ICS（day: 1-7 周一到周日；hour: 0-23，缺省 9 点；durMin 默认 60）
 * @param {object} ev {title, desc, day, hour, durMin}
 */
export function toICS(ev = {}) {
  const now = new Date()
  const cur = now.getDay() || 7
  const day = ev.day >= 1 && ev.day <= 7 ? ev.day : cur
  const hour = ev.hour >= 0 && ev.hour <= 23 ? ev.hour : 9
  const target = new Date(now)
  target.setDate(now.getDate() + ((day - cur + 7) % 7))
  target.setHours(hour, 0, 0, 0)
  if (target <= now) target.setDate(target.getDate() + 7)
  const uid = Date.now().toString(36) + Math.random().toString(36).slice(2, 8) + '@campus-nav'
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//campus-nav//schedule//CN',
    'BEGIN:VEVENT', 'UID:' + uid, 'DTSTAMP:' + icsDate(now), 'DTSTART:' + icsDate(target),
    'DURATION:PT' + (ev.durMin || 60) + 'M',
    'SUMMARY:' + icsEsc(ev.title || '校园日程'), 'DESCRIPTION:' + icsEsc(ev.desc || ''),
    'END:VEVENT', 'END:VCALENDAR'].join('\r\n')
}

// ──────────────────────── 5. 任务链扩展 ─────────────────────────

/**
 * 任务链一语连跑扩展：把“晨间/学习/生活”模板展开为可执行步骤
 * @param {string} chainId 'morning' | 'study' | 'life'
 * @param {object} ctx {emptyRooms?: string[], reviews?: object[]}
 */
export function taskChainExpand(chainId, ctx = {}) {
  const reviews = ctx.reviews || dueReviews()
  const rooms = (ctx.emptyRooms || []).slice(0, 3)
  const CHAINS = {
    morning: [
      { act: '查今日课程', run: '打开课表应用，确认前两节在哪上' },
      { act: '空教室占座', run: rooms.length ? `推荐 ${rooms.join('、')}（真实空教室数据）` : '先查空教室再出发' },
      { act: '今日复习', run: reviews.length ? `到期 ${reviews.length} 项：${reviews.slice(0, 2).map((r) => r.card.subject).join('、')}` : '今日无到期复习' }
    ],
    study: [
      { act: '开番茄', run: '经典 25+5，先来两轮' },
      { act: '复习打卡', run: reviews.length ? `先清 ${reviews.length} 项到期` : '按艾宾浩斯表预习新章节' },
      { act: '复盘', run: '专注记录自动落盘，周报可见' }
    ],
    life: [
      { act: '食堂', run: '看墙美食区热帖，避雷' },
      { act: '失物', run: '搜墙失物区，丢东西先去那' },
      { act: '提醒', run: '提醒中心建一条，桌面通知防忘' }
    ]
  }
  return CHAINS[chainId] || CHAINS.morning
}
