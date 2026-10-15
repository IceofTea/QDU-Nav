/**
 * 网络与调度小工具 —— 用于「首屏不阻塞、闲时再预载」的性能策略
 *
 * 背景：本站首屏一度把整块智能体大脑（agent engine + workflows + kb-nav.json 121KB）
 * 打了进来，手机上表现为「首次加载很慢、打开就卡」。修法有两条：
 *   ① 重模块一律走**异步 chunk**（动态 import），不进首屏；
 *   ② 预载放到**浏览器空闲**时，并且在**弱网 / 省流模式**下干脆不预载。
 * 本模块提供 ② 需要的两个判断与一个调度器。
 */

/** 是否处于弱网或省流模式（2G / slow-2g / saveData）——命中则跳过预载 */
export function isSlowConnection() {
  try {
    const nav = typeof navigator !== 'undefined' ? navigator : null
    const c = nav && (nav.connection || nav.mozConnection || nav.webkitConnection)
    if (!c) return false
    if (c.saveData === true) return true
    return c.effectiveType === 'slow-2g' || c.effectiveType === '2g'
  } catch {
    return false
  }
}

/** 是否处于「省电 / 减少动效」偏好（用于跳过高开销的闲时任务） */
export function prefersReducedMotion() {
  try {
    return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

/**
 * 在浏览器空闲时执行回调；不支持 requestIdleCallback 时退化为 setTimeout。
 * @param fn 回调
 * @param timeout 最长等待（ms）
 */
export function whenIdle(fn, timeout = 2000) {
  const run = () => { try { fn() } catch { /* 预载失败不影响主流程 */ } }
  try {
    if (typeof requestIdleCallback === 'function') {
      requestIdleCallback(run, { timeout })
      return
    }
  } catch { /* 落到 setTimeout */ }
  setTimeout(run, Math.min(timeout, 1200))
}

/** 等主线程有喘息（首帧之后）再执行——用于非关键的首屏后置任务 */
export function afterPaint(fn) {
  try {
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => requestAnimationFrame(() => whenIdle(fn)))
      return
    }
  } catch { /* 落到 whenIdle */ }
  whenIdle(fn)
}

export default { isSlowConnection, prefersReducedMotion, whenIdle, afterPaint }
