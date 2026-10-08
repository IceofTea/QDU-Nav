/**
 * ════════════════════════════════════════════════════════════════════
 * @模块路径  src/wall/drafts.js
 * @职责      校园墙草稿箱 v2：多草稿 + 自动保存 + 7 天过期 + 定时发布检查
 *            —— 原“草稿 7 天自动保存”的多草稿升级版（单草稿逻辑保留兼容）
 * @入口      saveDraft / listDrafts / getDraft / deleteDraft / clearExpired /
 *            timeToPublish / dueDrafts / migrateLegacy
 * @依赖      无（localStorage 内聚；定时发布由 ReminderCenter 30s 引擎顺带扫）
 * @被谁用    WallComposer（编辑即存）· CampusWall（草稿箱入口）·
 *            ReminderCenter（定时发布检查）· unit-wall.mjs
 * @降级策略  localStorage 不可用 → 内存 Map 兜底（页面级有效，不抛错）
 * @后端切换  [BE] POST /api/wall/drafts（云草稿）实现后，把 save/list 换成接口，
 *            本地保留为离线缓存层即可
 * ════════════════════════════════════════════════════════════════════
 */

export const DRAFTS_VERSION = '2.1.0'

const LS_DRAFTS = 'wall_drafts_v2'
const LS_LEGACY = 'wall_composer_draft_v1' // 旧单草稿 key（自动迁移）
const MAX_DRAFTS = 20
const EXPIRE_MS = 7 * 24 * 3600 * 1000

/* 内存兜底（隐私模式 localStorage 抛错时用） */
const memFallback = new Map()
function lsGet(k, fb) {
  try { return JSON.parse(localStorage.getItem(k) || 'null') ?? fb } catch { return memFallback.get(k) ?? fb }
}
function lsSet(k, v) {
  try { localStorage.setItem(k, JSON.stringify(v)) } catch { memFallback.set(k, v) }
}
function lsDel(k) {
  try { localStorage.removeItem(k) } catch { memFallback.delete(k) }
}

function genId() {
  return 'D' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

/**
 * 草稿结构：
 * {id, title, content, tag, type, anonymous, vote, updatedAt, createdAt,
 *  scheduledAt?: number|null（定时发布）, fromAuto?: boolean}
 */

/** 列出有效草稿（默认先清过期；按更新倒序） */
export function listDrafts(opt = {}) {
  let arr = lsGet(LS_DRAFTS, [])
  if (!Array.isArray(arr)) arr = []
  const now = Date.now()
  const before = arr.length
  arr = arr.filter((d) => now - (d.updatedAt || d.createdAt || now) < EXPIRE_MS)
  if (arr.length !== before && opt.persist !== false) lsSet(LS_DRAFTS, arr)
  arr.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
  return arr
}

/** 取单条 */
export function getDraft(id) {
  return listDrafts({ persist: false }).find((d) => d.id === id) || null
}

/**
 * 保存草稿（新建或更新；空内容 → 自动删除该条，防空草稿堆积）
 * @param {object} draft {id?,title,content,tag,type,anonymous,vote,scheduledAt?}
 * @returns {object|null} 保存后的草稿（空内容返回 null 表示已删）
 */
export function saveDraft(draft) {
  const title = String(draft.title || '').slice(0, 60)
  const content = String(draft.content || '').slice(0, 2000)
  if (!title.trim() && !content.trim()) {
    if (draft.id) deleteDraft(draft.id)
    return null
  }
  let arr = listDrafts({ persist: false })
  const now = Date.now()
  if (draft.id) {
    const i = arr.findIndex((d) => d.id === draft.id)
    if (i >= 0) {
      arr[i] = { ...arr[i], title, content, tag: draft.tag || arr[i].tag || 'chat', type: draft.type || arr[i].type || 'normal', anonymous: !!draft.anonymous, vote: draft.vote ?? arr[i].vote ?? null, scheduledAt: draft.scheduledAt ?? arr[i].scheduledAt ?? null, updatedAt: now }
      lsSet(LS_DRAFTS, arr.slice(0, MAX_DRAFTS))
      return arr[i]
    }
  }
  const one = {
    id: draft.id || genId(),
    title, content,
    tag: draft.tag || 'chat',
    type: draft.type || 'normal',
    anonymous: !!draft.anonymous,
    vote: draft.vote || null,
    scheduledAt: draft.scheduledAt || null,
    createdAt: now,
    updatedAt: now
  }
  arr.unshift(one)
  lsSet(LS_DRAFTS, arr.slice(0, MAX_DRAFTS))
  return one
}

/** 删除 */
export function deleteDraft(id) {
  const arr = listDrafts({ persist: false }).filter((d) => d.id !== id)
  lsSet(LS_DRAFTS, arr)
  return arr
}

/** 清空过期（返回清掉的条数，供管理台/设置页展示） */
export function clearExpired() {
  const arr = lsGet(LS_DRAFTS, [])
  if (!Array.isArray(arr)) { lsSet(LS_DRAFTS, []); return 0 }
  const now = Date.now()
  const kept = arr.filter((d) => now - (d.updatedAt || d.createdAt || now) < EXPIRE_MS)
  lsSet(LS_DRAFTS, kept)
  return arr.length - kept.length
}

/** 草稿数量（角标用） */
export function draftCount() {
  return listDrafts({ persist: false }).length
}

// ──────────────────────── 定时发布 ─────────────────────────

/**
 * 距定时发布剩余文案（Composer 回显用）
 * @param {number|null} scheduledAt
 */
export function timeToPublish(scheduledAt) {
  if (!scheduledAt) return ''
  const diff = scheduledAt - Date.now()
  if (diff <= 0) return '已到发布时间，待发送'
  const m = Math.floor(diff / 60000)
  if (m < 1) return '不到 1 分钟后发布'
  if (m < 60) return `${m} 分钟后发布`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} 小时后发布`
  return `${Math.floor(h / 24)} 天后发布`
}

/** 到期的定时草稿（Reminder 引擎每 30s 扫一次，顺带触发） */
export function dueDrafts() {
  const now = Date.now()
  return listDrafts({ persist: false }).filter((d) => d.scheduledAt && d.scheduledAt <= now)
}

/**
 * 标记已发布（定时触发成功后调用，删草稿防重发）
 * @param {string} id
 */
export function markPublished(id) {
  return deleteDraft(id)
}

// ──────────────────────── 旧版迁移 ─────────────────────────

/**
 * 旧单草稿迁移（一次性：wall_composer_draft_v1 → drafts_v2 首条）
 * @returns {boolean} 是否发生迁移
 */
export function migrateLegacy() {
  try {
    const raw = localStorage.getItem(LS_LEGACY)
    if (!raw) return false
    const arr = listDrafts({ persist: false })
    if (arr.length > 0) { lsDel(LS_LEGACY); return false } // 已有新草稿，不覆盖
    let legacy = null
    try { legacy = JSON.parse(raw) } catch { legacy = { content: raw } }
    const content = String((legacy && legacy.content) || '').trim()
    if (!content) { lsDel(LS_LEGACY); return false }
    saveDraft({ title: (legacy && legacy.title) || '', content, tag: (legacy && legacy.tag) || 'chat' })
    lsDel(LS_LEGACY)
    return true
  } catch { return false }
}

/**
 * 自动保存防抖封装（Composer 直接用）：
 * onEdit(draft) 高频调，内部 800ms 写一次盘
 */
export function autoSaveDebounced() {
  let timer = null
  let latest = null
  const flush = () => {
    if (latest) saveDraft(latest)
    timer = null
    latest = null
  }
  return {
    edit(draft) {
      latest = draft
      clearTimeout(timer)
      timer = setTimeout(flush, 800)
    },
    flush() {
      clearTimeout(timer)
      flush()
    }
  }
}

/** 导出全量（设置页“备份草稿”用，JSON 下载） */
export function exportDrafts() {
  return { version: DRAFTS_VERSION, exportedAt: Date.now(), drafts: listDrafts({ persist: false }) }
}

/**
 * 导入（设置页“恢复”用；跳过过期与超长，返回 {imported, skipped}）
 * @param {object} data exportDrafts 产物
 */
export function importDrafts(data) {
  if (!data || !Array.isArray(data.drafts)) return { imported: 0, skipped: 0 }
  let imported = 0
  let skipped = 0
  const now = Date.now()
  for (const d of data.drafts) {
    if (!d || (now - (d.updatedAt || 0) > EXPIRE_MS)) { skipped++; continue }
    if (!String(d.content || '').trim() && !String(d.title || '').trim()) { skipped++; continue }
    saveDraft({ title: d.title, content: d.content, tag: d.tag, type: d.type, anonymous: d.anonymous, vote: d.vote })
    imported++
  }
  return { imported, skipped }
}
