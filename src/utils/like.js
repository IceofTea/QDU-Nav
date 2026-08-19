/**
 * 点赞工具：给首页 / 各应用点赞并计数（数据走自建计数服务 counter，与本站舆情同一套）
 *  - 每人每应用限赞 1 次，可取消、可再点回去（toggle）
 *  - 点赞身份用匿名访客 ID（visitorId），服务端按 vid 去重，本地 localStorage 记忆点赞状态
 *  - counter 不可达时：本地状态仍生效（点赞态保留），计数降级为「未知」由调用方处理
 */
import { SITE } from '../config/site'
import { visitorId } from './visitor'

const api = (SITE.counter && SITE.counter.api) || ''
const LIKED_KEY = 'qdu_liked'

function likedMap() {
  try {
    const m = JSON.parse(localStorage.getItem(LIKED_KEY)) || {}
    return typeof m === 'object' ? m : {}
  } catch { return {} }
}
function saveLiked(map) {
  try { localStorage.setItem(LIKED_KEY, JSON.stringify(map)) } catch { /* noop */ }
}

/** 本地是否已赞 */
export function likedByMe(appId) {
  return !!likedMap()[appId]
}

/** 拉取各应用点赞数 { appId: count }，失败返回 {}（调用方按降级处理） */
export async function fetchLikes() {
  if (!api) return {}
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 6000)
    const r = await fetch(api + '/api/stats', { signal: ctrl.signal })
    clearTimeout(timer)
    if (!r.ok) return {}
    const d = await r.json()
    const out = {}
    for (const x of d.likes || []) out[x.name] = x.v
    return out
  } catch { return {} }
}

/**
 * 点赞 / 取消（toggle）：on 缺省时自动取反
 * 返回 { liked, likes }，likes 为 null 表示计数不可知（counter 不可达，本地状态已生效）
 */
export async function toggleLike(appId, on) {
  const map = likedMap()
  const target = on != null ? !!on : !map[appId]
  map[appId] = target ? 1 : 0
  saveLiked(map)
  if (!api) return { liked: target, likes: null }
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 6000)
    const r = await fetch(
      `${api}/api/like?app=${encodeURIComponent(appId)}&vid=${encodeURIComponent(visitorId())}&on=${target ? 1 : 0}`,
      { signal: ctrl.signal }
    )
    clearTimeout(timer)
    if (r.ok) {
      const d = await r.json()
      return { liked: target, likes: d.likes != null ? d.likes : null }
    }
  } catch { /* noop */ }
  return { liked: target, likes: null }
}