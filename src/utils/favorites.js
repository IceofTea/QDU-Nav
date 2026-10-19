/**
 * 跨应用「我的快捷」收藏 —— 纯函数 · 零依赖 · 可单测
 *
 * 场景：站内有 35+ 个应用，常用的其实只有三五项（课表 / 空教室 / 生活费 / 食堂）。
 * 本模块提供一份**与具体站点无关**的收藏模型：任何页面（应用入口、教室、课程、外部链接…）
 * 都可以被收藏成一条 `favorite`，在首页「我的快捷」里一键直达。
 *
 * 设计要点：
 *   · 站点无关：存储键由调用方通过 `createFavorites(key)` 传入，同一份实现可被多站复用；
 *   · 幂等：`toggleFavorite` 以 `id` 判定，重复收藏自动取反，不会产生重复项；
 *   · 可排序：`moveFavorite` 支持上/下移，顺序即首页展示顺序；
 *   · 有上限：超出 `MAX_ITEMS` 时丢弃最旧的非置顶项，避免首页被塞爆；
 *   · 宽容导入：`importFavorites` 逐条规范化、丢弃非法项、批内去重，不因脏数据整包失败；
 *   · 全部读写经 safeStorage，隐私模式/配额满不抛异常。
 */
import { getJson, setJson } from './safeStorage.js'

/** 收藏类型白名单（用于分组展示与图标） */
export const KINDS = ['app', 'page', 'room', 'course', 'link', 'other']
/** 最多保留的收藏条数 */
export const MAX_ITEMS = 40

const KIND_ICON = {
  app: '🧩',
  page: '📄',
  room: '🏫',
  course: '📚',
  link: '🔗',
  other: '⭐'
}

function str(v, max = 60) {
  return String(v == null ? '' : v).trim().slice(0, max)
}

/** 生成稳定 id：同 kind + 同 target 视为同一项（重复收藏不会产生两条） */
export function makeFavoriteId(kind, target) {
  const k = KINDS.includes(kind) ? kind : 'other'
  const t = str(target, 200)
  return `${k}:${t}`
}

/** 规范化单条收藏；非法返回 null */
export function normalizeFavorite(raw) {
  if (!raw || typeof raw !== 'object') return null
  const target = str(raw.target, 200)
  if (!target) return null
  const kind = KINDS.includes(raw.kind) ? raw.kind : 'other'
  const label = str(raw.label, 40) || target
  return {
    id: makeFavoriteId(kind, target),
    kind,
    label,
    sub: str(raw.sub, 60),
    target,
    icon: str(raw.icon, 4) || KIND_ICON[kind],
    pinned: raw.pinned === true,
    addedAt: Number.isFinite(Number(raw.addedAt)) ? Number(raw.addedAt) : Date.now()
  }
}

/** 规范化整个列表：逐条规范化 + 按 id 去重 */
export function normalizeList(list) {
  const out = []
  const seen = new Set()
  for (const item of list || []) {
    const f = normalizeFavorite(item)
    if (!f || seen.has(f.id)) continue
    seen.add(f.id)
    out.push(f)
  }
  return out
}

/** 截断到上限：置顶项优先保留，其余按 addedAt 新的优先 */
export function pruneFavorites(list, max = MAX_ITEMS) {
  const items = normalizeList(list)
  if (items.length <= max) return items
  const pinned = items.filter((i) => i.pinned)
  const rest = items.filter((i) => !i.pinned).sort((a, b) => b.addedAt - a.addedAt)
  return [...pinned.slice(0, max), ...rest.slice(0, Math.max(0, max - pinned.length))]
}

export function isFavorite(list, id) {
  return normalizeList(list).some((i) => i.id === id)
}

/** 新增收藏（若已存在则原样返回，保证幂等） */
export function addFavorite(list, item, now = Date.now()) {
  const f = normalizeFavorite({ addedAt: now, ...item })
  if (!f) return { list: normalizeList(list), added: false }
  const cur = normalizeList(list)
  if (cur.some((i) => i.id === f.id)) return { list: cur, added: false }
  return { list: pruneFavorites([...cur, f]), added: true }
}

export function removeFavorite(list, id) {
  const cur = normalizeList(list)
  return cur.filter((i) => i.id !== id)
}

/** 收藏开关：返回新列表 + 是否已收藏 */
export function toggleFavorite(list, item, now = Date.now()) {
  const f = normalizeFavorite({ addedAt: now, ...item })
  if (!f) return { list: normalizeList(list), on: false }
  const cur = normalizeList(list)
  if (cur.some((i) => i.id === f.id)) return { list: removeFavorite(cur, f.id), on: false }
  return { list: pruneFavorites([...cur, f]), on: true }
}

/** 上/下移动（dir: -1 上移 / 1 下移），越界不动 */
export function moveFavorite(list, id, dir) {
  const cur = normalizeList(list)
  const i = cur.findIndex((x) => x.id === id)
  if (i < 0) return cur
  const j = i + dir
  if (j < 0 || j >= cur.length) return cur
  const next = cur.slice()
  const tmp = next[i]
  next[i] = next[j]
  next[j] = tmp
  return next
}

/** 置顶/取消置顶：置顶项排在最前 */
export function setPinned(list, id, pinned) {
  const cur = normalizeList(list).map((i) => (i.id === id ? { ...i, pinned: pinned === true } : i))
  return sortFavorites(cur)
}

/** 排序：置顶在前，其余保持插入顺序（stable） */
export function sortFavorites(list) {
  const items = normalizeList(list)
  const pinned = items.filter((i) => i.pinned)
  const rest = items.filter((i) => !i.pinned)
  return [...pinned, ...rest]
}

/** 按类型分组（首页/收藏页展示用） */
export function groupByKind(list) {
  const items = sortFavorites(list)
  const map = new Map()
  for (const it of items) {
    if (!map.has(it.kind)) map.set(it.kind, [])
    map.get(it.kind).push(it)
  }
  return [...map.entries()].map(([kind, items]) => ({ kind, icon: KIND_ICON[kind] || '⭐', items }))
}

/** 统计信息（空态提示 / 首页角标） */
export function summarize(list) {
  const items = normalizeList(list)
  return {
    total: items.length,
    pinned: items.filter((i) => i.pinned).length,
    kinds: [...new Set(items.map((i) => i.kind))]
  }
}

/** 导出为可下载 JSON 文本 */
export function exportFavorites(list, meta = {}, now = new Date()) {
  const items = sortFavorites(list)
  return JSON.stringify({
    kind: 'nav-favorites',
    format: 1,
    exportedAt: now.toISOString(),
    app: str(meta.app, 40),
    version: str(meta.version, 20),
    count: items.length,
    items
  }, null, 2)
}

/** 解析导入的收藏文本；兼容「完整对象 / 裸数组 / {items}」三形态 */
export function importFavorites(text) {
  let obj = null
  try {
    obj = JSON.parse(String(text || ''))
  } catch {
    return { ok: false, error: 'not-json', items: [] }
  }
  let raw = null
  if (Array.isArray(obj)) raw = obj
  else if (obj && Array.isArray(obj.items)) raw = obj.items
  else if (obj && Array.isArray(obj.favorites)) raw = obj.favorites
  if (!raw) return { ok: false, error: 'no-items', items: [] }
  const now = Date.now()
  let dropped = 0
  const items = []
  const seen = new Set()
  for (const it of raw) {
    const f = normalizeFavorite({ addedAt: now, ...it })
    if (!f) { dropped++; continue }
    if (seen.has(f.id)) { dropped++; continue }
    seen.add(f.id)
    items.push(f)
  }
  if (!items.length) return { ok: false, error: 'all-invalid', items: [] }
  return { ok: true, items, dropped }
}

/** 合并导入：mode='append'（去重追加）| 'replace'（整体替换） */
export function mergeFavorites(existing, incoming, { mode = 'append' } = {}) {
  const cur = normalizeList(existing)
  const inc = normalizeList(incoming)
  if (mode === 'replace') return { list: pruneFavorites(inc), added: inc.length, dup: 0 }
  const seen = new Set(cur.map((i) => i.id))
  let added = 0
  let dup = 0
  const merged = [...cur]
  for (const f of inc) {
    if (seen.has(f.id)) { dup++; continue }
    seen.add(f.id)
    merged.push(f)
    added++
  }
  return { list: pruneFavorites(merged), added, dup }
}

/**
 * 站点实例工厂：绑定一个存储键，返回带读写能力的收藏 store。
 * @param key 例如 'nav_favorites'
 */
export function createFavorites(key) {
  const load = () => sortFavorites(getJson(key, []))
  const save = (list) => setJson(key, pruneFavorites(list))
  return {
    key,
    load,
    save,
    toggle(item) {
      const res = toggleFavorite(load(), item)
      save(res.list)
      return res
    },
    add(item) {
      const res = addFavorite(load(), item)
      save(res.list)
      return res
    },
    remove(id) {
      const list = removeFavorite(load(), id)
      save(list)
      return list
    },
    move(id, dir) {
      const list = moveFavorite(load(), id, dir)
      save(list)
      return list
    },
    pin(id, pinned) {
      const list = setPinned(load(), id, pinned)
      save(list)
      return list
    },
    isOn(id) {
      return isFavorite(load(), id)
    },
    clear() {
      save([])
      return []
    }
  }
}

export default {
  KINDS,
  MAX_ITEMS,
  makeFavoriteId,
  normalizeFavorite,
  normalizeList,
  pruneFavorites,
  isFavorite,
  addFavorite,
  removeFavorite,
  toggleFavorite,
  moveFavorite,
  setPinned,
  sortFavorites,
  groupByKind,
  summarize,
  exportFavorites,
  importFavorites,
  mergeFavorites,
  createFavorites
}
