/**
 * ════════════════════════════════════════════════════════════════════
 * @模块路径  scripts/harness.mjs
 * @职责      单测脚手架唯一来源：localStorage 内存 mock + ok/okAsync
 *            （async 误用直接 FAIL 防呆）+ 汇总退出 —— 四套单测统一从
 *            这里取，杜绝脚手架漂移（2026-10-09 曾因此虚假全绿 11 项）
 * @用法      import { installStorage, createKit } from './harness.mjs'
 *            installStorage()
 *            const { ok, okAsync, done } = createKit()
 *            …测试…
 *            done()
 * ════════════════════════════════════════════════════════════════════
 */

/** node 无 DOM 时装内存 localStorage（浏览器里是 no-op） */
export function installStorage() {
  if (typeof localStorage !== 'undefined') return false
  const store = new Map()
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k)
  }
  return true
}

export function createKit() {
  let pass = 0
  let fail = 0
  function ok(name, fn) {
    try {
      const r = fn()
      if (r && typeof r.then === 'function') {
        fail++
        console.log('  FAIL  ' + name + ' → async 函数必须用 okAsync（框架防呆）')
        r.catch(() => {})
        return
      }
      pass++; console.log('  PASS  ' + name)
    } catch (e) { fail++; console.log('  FAIL  ' + name + ' → ' + (e && e.message)) }
  }
  async function okAsync(name, fn) {
    try { await fn(); pass++; console.log('  PASS  ' + name) }
    catch (e) { fail++; console.log('  FAIL  ' + name + ' → ' + (e && e.message)) }
  }
  function done() {
    console.log(`\n done: pass=${pass} fail=${fail}`)
    process.exit(fail ? 1 : 0)
  }
  return { ok, okAsync, done }
}
