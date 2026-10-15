/**
 * 安全存储封装 —— localStorage / sessionStorage 的「永不抛异常」薄壳
 *
 * 为什么需要：浏览器在**隐私模式**、**禁用站点数据**、**配额写满**、**跨域 iframe 沙箱**
 * 等情况下，`localStorage.setItem` 会直接抛 `QuotaExceededError` / `SecurityError`。
 * 站内有大量 `localStorage.setItem(...)` 裸调用（`.vue` 里逐处 try 覆盖不全），
 * 一旦抛出就会中断当前交互（表现为「点了没反应」或整段渲染失败）。
 *
 * 本模块统一兜底：
 *   · 读写全部 try/catch，失败时返回默认值 / false，绝不抛；
 *   · 提供 JSON 便捷方法（`getJson` / `setJson`），解析失败回退默认值；
 *   · `available` 暴露可用性探测结果，便于 UI 给出「本机存储不可用」的诚实提示；
 *   · `makeStore(prefix)` 生成带命名空间的实例，避免各模块各自拼 key。
 */

/** 探测某类 storage 是否真的可写（写入-删除一个哨兵键） */
function probe(kind) {
  try {
    const s = kind === 'session' ? globalThis.sessionStorage : globalThis.localStorage
    if (!s) return false
    const k = '__probe__'
    s.setItem(k, '1')
    s.removeItem(k)
    return true
  } catch {
    return false
  }
}

const LS_OK = probe('local')
const SS_OK = probe('session')

function backend(kind) {
  try {
    return kind === 'session' ? globalThis.sessionStorage : globalThis.localStorage
  } catch {
    return null
  }
}

/** 存储可用性（模块加载时探测一次，页面生命周期内足够稳定） */
export const storageAvailable = { local: LS_OK, session: SS_OK }

/** 安全读字符串；不存在或失败返回 fallback */
export function safeGet(key, fallback = null, { session = false } = {}) {
  try {
    const s = backend(session ? 'session' : 'local')
    const v = s ? s.getItem(String(key)) : null
    return v == null ? fallback : v
  } catch {
    return fallback
  }
}

/** 安全写字符串；成功返回 true。可选返回失败原因（用于埋点/提示） */
export function safeSet(key, value, { session = false } = {}) {
  try {
    const s = backend(session ? 'session' : 'local')
    if (!s) return false
    s.setItem(String(key), String(value))
    return true
  } catch {
    return false
  }
}

/** 安全删除 */
export function safeRemove(key, { session = false } = {}) {
  try {
    const s = backend(session ? 'session' : 'local')
    if (s) s.removeItem(String(key))
    return true
  } catch {
    return false
  }
}

/** 安全读 JSON；解析失败/不存在返回 fallback */
export function getJson(key, fallback = null, { session = false } = {}) {
  const raw = safeGet(key, null, { session })
  if (raw == null) return fallback
  try {
    const v = JSON.parse(raw)
    return v == null ? fallback : v
  } catch {
    return fallback
  }
}

/** 安全写 JSON；成功返回 true（循环引用等序列化失败也吞掉） */
export function setJson(key, value, { session = false } = {}) {
  try {
    return safeSet(key, JSON.stringify(value), { session })
  } catch {
    return false
  }
}

/**
 * 生成带命名空间的存储实例。
 * @param prefix 键前缀（如 'qdu_budget'）
 * @returns { get, set, remove, getJson, setJson, key, available }
 */
export function makeStore(prefix) {
  const ns = String(prefix || '').replace(/_+$/, '')
  const key = (k) => (ns ? `${ns}_${k}` : String(k))
  return {
    prefix: ns,
    key,
    available: { local: LS_OK, session: SS_OK },
    get: (k, fb = null, o) => safeGet(key(k), fb, o),
    set: (k, v, o) => safeSet(key(k), v, o),
    remove: (k, o) => safeRemove(key(k), o),
    getJson: (k, fb = null, o) => getJson(key(k), fb, o),
    setJson: (k, v, o) => setJson(key(k), v, o)
  }
}

export default { safeGet, safeSet, safeRemove, getJson, setJson, makeStore, storageAvailable }
