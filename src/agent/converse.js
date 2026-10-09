/**
 * ════════════════════════════════════════════════════════════════════
 * @模块路径  src/agent/converse.js
 * @职责      对话交互层（纯函数，可单测）：上下文指代消解 + 追问 chips +
 *            主动问候文案 —— 智能体“像人”的三件套
 * @入口      detectContinue / mergeContinue / CONTINUABLE /
 *            followupsFor / buildGreeting
 * @依赖      ./slots.js（分词抽取，带扩展名以便 node 单测直引）
 * @被谁用    agent/engine.js（handle 追问拦截 + _execute chips + 问候）·
 *            scripts/unit-grow.mjs
 * @设计思想  追问只在“短输入 + 延续句式 + 上条可延续”三者齐备时触发；
 *            凡命中强新意图一律让路（由 engine 复核 recognize）
 * ════════════════════════════════════════════════════════════════════
 */
import { extractTime } from './slots.js'

export const CONVERSE_VERSION = '1.0.0'

/** 可被追问延续的工作流（只读型优先；写操作走确认流，不在此续） */
export const CONTINUABLE = new Set([
  'findRoom', 'dayClass', 'whatEat', 'canteenStatus', 'searchNotice',
  'courseQuery', 'todayNotice', 'jobHunt', 'wallSearch', 'hotTopics', 'mySchedule'
])

/** 时间词（与 slots.extractTime 口径对齐，用于剥离残余判定） */
const TIME_WORDS = /今天|明天|后天|大后天|周[一二三四五六日天]|下周.|周末|上午|下午|晚上|早上|中午|\d+[点时分]|半小时/

/**
 * 识别追问类型
 * @param {string} raw 本轮输入
 * @param {object} last 上条上下文 {wfId, slots, text}
 * @returns {{kind:'again'|'time'|'change', rest:string, time:any}|null}
 */
export function detectContinue(raw, last) {
  if (!last || !CONTINUABLE.has(last.wfId)) return null
  const t = String(raw || '').trim()
  if (!t || t.length > 14) return null
  // 重查一遍：“再查/重新查/再来一次/查一下/还有吗”
  if (/^(再查(一次|一下)?|重新查(一次|一下)?|再来一次|查一下|重新来|还有吗)$/.test(t)) {
    return { kind: 'again', rest: '', time: null }
  }
  // 换条件：“换X/改成X/那X”（时间类优先判时间，避免“那明天呢”走换条件）
  const tm = extractTime(t)
  if (tm) {
    const rest = t.replace(TIME_WORDS, '').replace(/^(那|那么)/, '').trim()
    if (/^(呢|吗|怎么样|有多少|还有(吗)?)?$/.test(rest) || rest === '' || rest.length <= 3) {
      return { kind: 'time', rest: '', time: tm }
    }
  }
  const ch = /^(换|改成|换成|那)(.+)/.exec(t)
  if (ch) {
    const rest = ch[2].replace(/(呢|吗|吧|一下)$/, '').trim()
    if (rest.length >= 1) return { kind: 'change', rest, time: null }
  }
  return null
}

/**
 * 合并出续跑上下文（新条件优先：文本前置保证解析命中新的）
 * @param {object} last 上条 {wfId, slots, text}
 * @param {object} detected detectContinue 产物
 * @param {string} raw 本轮原文
 * @param {string} lang
 */
export function mergeContinue(last, detected, raw, lang = 'zh') {
  const slots = { ...(last.slots || {}) }
  if (detected.kind === 'again') {
    return { wfId: last.wfId, ctx: { text: last.text, slots, state: {}, lang } }
  }
  if (detected.kind === 'time') {
    if (detected.time) slots.time = detected.time
    return { wfId: last.wfId, ctx: { text: `${raw} ${last.text || ''}`, slots, state: {}, lang } }
  }
  // change：新地点/关键词同时写 slots.place 与 slots.keyword（工作流读哪个都中）
  slots.place = detected.rest
  slots.keyword = detected.rest
  return { wfId: last.wfId, ctx: { text: `${raw} ${last.text || ''}`, slots, state: {}, lang } }
}

/* ──────────────────────── 追问 chips ──────────────────────── */

const FOLLOWUPS = {
  findRoom: ['明天呢', '换个楼查', '加进日程'],
  dayClass: ['明天呢', '找空教室自习', '今日简报'],
  whatEat: ['换一家', '食堂人多吗', '美食轮盘'],
  canteenStatus: ['今天吃什么', '换个食堂看'],
  todayNotice: ['搜一下选课', '最新通知'],
  searchNotice: ['换个关键词', '最新通知'],
  courseQuery: ['换门课查', '明天有什么课'],
  jobHunt: ['看全部岗位', '完善画像'],
  activitySignup: ['还有什么活动', '我的日程'],
  fixReport: ['搜墙看看同类', '提交反馈'],
  wallView: ['搜墙', '发悬赏'],
  wallSearch: ['换个词搜', '看校园墙'],
  hotTopics: ['看校园墙', '今日简报'],
  myPoints: ['签到', '协作看板'],
  signIn: ['我的积分', '今日简报'],
  dailyBriefing: ['找空教室自习', '协作看板'],
  agentBoard: ['提交反馈', '能力地图'],
  mySchedule: ['加进日程', '今日简报'],
  addSchedule: ['我的日程', '今日简报']
}
/** 工作流专属追问（无专属则回通用三件） */
export function followupsFor(wfId) {
  return FOLLOWUPS[wfId] || ['还有其他需求吗？', '最新通知', '今天吃什么']
}

/* ──────────────────────── 富文本 ──────────────────────── */

/** HTML 转义（mdLite 前置，保证 v-html 安全） */
export function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * 轻量 Markdown 渲染（只支持 **加粗** / `代码` / 换行 / > 引用，
 * 不支持表格嵌套——够对话用，且零依赖；先转义后套标签，v-html 可直接用）
 */
export function mdLite(text) {
  const lines = escapeHtml(text).split('\n').map((ln) => {
    let s = ln
    s = s.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    s = s.replace(/`([^`]+?)`/g, '<code>$1</code>')
    if (s.startsWith('&gt; ')) s = '<blockquote>' + s.slice(5) + '</blockquote>'
    return s
  })
  return lines.join('<br/>')
}

/* ──────────────────────── 主动问候 ──────────────────────── */

/** 时段问候 */
export function daypart(date = new Date()) {
  const h = date.getHours()
  if (h < 6) return '凌晨好'
  if (h < 9) return '早上好'
  if (h < 12) return '上午好'
  if (h < 14) return '中午好'
  if (h < 18) return '下午好'
  return '晚上好'
}

const PUSH_LABEL = { review: '🧠 去复习', activity: '🎪 去报名', job: '💼 看岗位', onboard: '🧬 完善画像' }

/**
 * 组装主动问候（engine 传入画像推送 items，这里只做文案与卡片）
 * @param {object} opt {agentName, pushes:[{icon,text,action:{type,value},kind}]}
 */
export function buildGreeting(opt = {}) {
  const name = opt.agentName || '校园智能体'
  const pushes = (opt.pushes || []).slice(0, 3)
  const head = `${daypart()}！我是${name}，说一句话就能办事。`
  const reply = pushes.length
    ? head + `顺手看了眼，你可能要办：${pushes.map((p) => p.text).join('；')}。`
    : head + '试试“今日简报”或“哪里有空教室”。'
  const card = pushes.length ? {
    title: '📌 为你准备（点一行即办）',
    subtitle: '来自画像与到期事项 · 可在画像页调整',
    rows: pushes.map((p) => ({ icon: p.icon || '•', label: p.text, value: '' })),
    actions: pushes.map((p) => ({
      label: PUSH_LABEL[p.kind] || '去看看',
      type: p.action.type, value: p.action.value
    }))
  } : null
  const chips = pushes.length
    ? pushes.map((p) => (p.action.type === 'agent' ? p.action.value : (PUSH_LABEL[p.kind] || '看看')))
    : ['今日简报', '哪里有空教室']
  return { reply, card, chips }
}
