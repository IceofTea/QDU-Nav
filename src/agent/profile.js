/**
 * ════════════════════════════════════════════════════════════════════
 * @模块路径  src/agent/profile.js
 * @职责      访客画像（渐进式、免登录）：行为计数 → 标签推断 → 主动推送
 *            —— “上线就该知道他是谁”的工程兑现（专家 §8.4 / 卖点 8）
 * @入口      readProfile / recordAppOpen / recordSearch / setCollege /
 *            setSkills / pushList / profileSummary
 * @依赖      无（localStorage 内聚；岗位/活动数据由调用方透传，避免循环）
 * @被谁用    views/Profile.vue · agent/workflows.jobHunt · views/Jobs.vue ·
 *            Home.vue 主动提醒条（下一步）· scripts/unit-grow.mjs
 * @隐私说明  全部本机存储，不上传；画像页一键清空；未填项永不瞎猜（空态）
 * ════════════════════════════════════════════════════════════════════
 */

export const PROFILE_VERSION = '1.0.0'

const LS_PROFILE = 'agent_profile_v1' // {college, grade, skills[], interests[], fills:{}}
const LS_BEHAV = 'agent_behav_v1'     // {appId: count, searches: [kw]}

function lsGet(k, fb) {
  try { return JSON.parse(localStorage.getItem(k) || 'null') ?? fb } catch { return fb }
}
function lsSet(k, v) {
  try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* noop */ }
}

/** 空画像 */
export function blankProfile() {
  return { college: '', grade: '', skills: [], interests: [], updatedAt: 0 }
}
/** 读画像 */
export function readProfile() {
  const p = lsGet(LS_PROFILE, null)
  return p && typeof p === 'object' ? { ...blankProfile(), ...p } : blankProfile()
}
/** 写画像（合并式；skills/interests 去重截 20） */
export function saveProfile(patch) {
  const cur = readProfile()
  const next = { ...cur, ...(patch || {}), updatedAt: Date.now() }
  for (const k of ['skills', 'interests']) {
    if (Array.isArray(next[k])) next[k] = [...new Set(next[k].map((s) => String(s).trim()).filter(Boolean))].slice(0, 20)
  }
  lsSet(LS_PROFILE, next)
  return next
}
/** 清空（画像页“忘掉我”按钮） */
export function clearProfile() {
  try { localStorage.removeItem(LS_PROFILE); localStorage.removeItem(LS_BEHAV) } catch { /* noop */ }
  return blankProfile()
}
export function setCollege(college) { return saveProfile({ college: String(college || '').slice(0, 30) }) }
export function setGrade(grade) { return saveProfile({ grade: String(grade || '').slice(0, 10) }) }
export function setSkills(skills) {
  const arr = String(skills || '').split(/[,，、\s]+/).map((s) => s.trim()).filter(Boolean)
  return saveProfile({ skills: arr })
}

/* ──────────────────────── 行为记录 ──────────────────────── */

/** 打开应用记一次（router.openApp 调用，画像兴趣 Top 来源） */
export function recordAppOpen(appId) {
  if (!appId || appId === 'home') return
  const b = lsGet(LS_BEHAV, { apps: {}, searches: [] })
  b.apps = b.apps || {}
  b.apps[appId] = (b.apps[appId] || 0) + 1
  lsSet(LS_BEHAV, b)
}
/** 搜索词记一条（只留 30，画像兴趣挖掘用） */
export function recordSearch(kw) {
  const k = String(kw || '').trim().slice(0, 20)
  if (k.length < 2) return
  const b = lsGet(LS_BEHAV, { apps: {}, searches: [] })
  b.searches = [k, ...(b.searches || []).filter((x) => x !== k)].slice(0, 30)
  lsSet(LS_BEHAV, b)
}
/** 行为统计（画像页“我是这么被了解的”可解释展示） */
export function behaviorStats() {
  const b = lsGet(LS_BEHAV, { apps: {}, searches: [] })
  const apps = Object.entries(b.apps || {}).sort((a, b2) => b2[1] - a[1]).slice(0, 8)
    .map(([app, n]) => ({ app, n }))
  return { apps, searches: (b.searches || []).slice(0, 10), total: apps.reduce((a, x) => a + x.n, 0) }
}

/**
 * 兴趣推断（行为 → 兴趣词，可解释：每条兴趣标出来源）
 * @returns {{interests:string[], reasons:string[]}}
 */
export function inferInterests() {
  const APP_TAGS = {
    canteen: ['美食'], whatToEat: ['美食'], foodWheel: ['美食'],
    timetable: ['学习'], classroomNav: ['自习'], courseStats: ['学习'],
    budget: ['记账'], quiz: ['竞赛'], buildingMatch: ['竞赛'],
    campusWall: ['社交'], messages: ['社交'], jobs: ['求职'],
    focus: ['学习'], tiebaSentiment: ['吃瓜']
  }
  const b = lsGet(LS_BEHAV, { apps: {}, searches: [] })
  const score = {}
  const reasons = []
  for (const [app, n] of Object.entries(b.apps || {})) {
    for (const t of APP_TAGS[app] || []) {
      score[t] = (score[t] || 0) + n
      if (n >= 3) reasons.push(`常逛${app}（${n}次）→ ${t}`)
    }
  }
  for (const kw of b.searches || []) {
    score[kw] = (score[kw] || 0) + 2
    reasons.push(`搜过“${kw}”`)
  }
  const interests = Object.entries(score).sort((a, b2) => b2[1] - a[1]).slice(0, 8).map(([k]) => k)
  return { interests, reasons: reasons.slice(0, 6) }
}

/* ──────────────────────── 主动推送 ──────────────────────── */

/**
 * 本轮推送清单（画像 + 到期事项 → 可执行 card 行；调用方按需取前 N）
 * @param {object} ctx {dueReviews:[], activities:[], jobs:[]}
 * @returns {object[]} [{icon, text, action:{type,value}}]
 */
export function pushList(ctx = {}) {
  const out = []
  const prof = readProfile()
  const { interests } = inferInterests()
  // 复习到期（学习计划联动）
  const due = ctx.dueReviews || []
  if (due.length) {
    out.push({
      icon: '🧠', kind: 'review',
      text: `艾宾浩斯到期 ${due.length} 项：${due.slice(0, 2).map((d) => d.card.subject).join('、')}`,
      action: { type: 'openApp', value: 'focus' }
    })
  }
  // 活动截止（3 天内）
  const soon = (ctx.activities || []).filter((a) => {
    const diff = (new Date(a.date) - Date.now()) / 86400000
    return diff >= 0 && diff <= 3
  }).slice(0, 2)
  for (const a of soon) {
    out.push({ icon: '🎪', kind: 'activity', text: `活动将至：${a.title}（${a.date}）`, action: { type: 'agent', value: `活动报名 ${a.title}` } })
  }
  // 岗位匹配（画像命中）
  const jobs = (ctx.jobs || []).slice(0, 2)
  if ((prof.skills || []).length && jobs.length) {
    out.push({ icon: '💼', kind: 'job', text: `按你的技能[${prof.skills.slice(0, 3).join('、')}]推岗：${jobs[0].title}`, action: { type: 'openApp', value: 'jobs' } })
  }
  // 空画像引导（只在完全空白时出现一次）
  if (!prof.college && !prof.skills.length && !interests.length) {
    out.push({ icon: '🧬', kind: 'onboard', text: '完善画像（学院+技能），推荐和匹配会更准', action: { type: 'openApp', value: 'profile' } })
  }
  return out.slice(0, 5)
}

/** 一句话画像总结（画像页头 + Agent 口播共用） */
export function profileSummary() {
  const p = readProfile()
  const { interests } = inferInterests()
  const bits = []
  if (p.college) bits.push(p.college)
  if (p.grade) bits.push(p.grade)
  if (p.skills.length) bits.push('会' + p.skills.slice(0, 4).join('、'))
  if (interests.length) bits.push('常看' + interests.slice(0, 3).join('、'))
  return bits.length ? bits.join(' · ') : '还是白纸一张——去画像页填两笔'
}
