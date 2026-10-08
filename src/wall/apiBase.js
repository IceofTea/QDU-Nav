/**
 * ════════════════════════════════════════════════════════════════════
 * @模块路径  src/wall/apiBase.js
 * @职责      API 基地址解析（单一来源）：让同一套前端既能跑本地网关，
 *            也能指向公网部署的网关 —— 手机/纯静态 Pages 走线上版的关键
 * @入口      getApiBase / setApiBase / clearApiBase / apiUrl / eventsUrl /
 *            describeMode
 * @优先级    ?api= 查询参数 > localStorage 手工设置 > <meta> 预置 >
 *            window.QDU_AGENT_API > 同源 ''（本地 vite 代理 / 网关托管 dist）
 * @依赖      无（纯字符串逻辑，可被 unit 直接断言）
 * @被谁用    wall/api.js · im/api.js · wall/notify.js（SSE）·
 *            views/DataManager.vue（网关地址设置入口）· 管理台 ?api= 同规
 * @降级策略  未配置且同源 /api 不通 → 各调用方照常回退 localStorage 本机模式
 * @部署指南  网关部署到公网（如 Render/Railway，见 Dockerfile/render.yaml）
 *            后，把地址填进下面 PUBLIC_API_DEFAULT，或由用户在数据管家页设置，
 *            全站即切线上版，无需重新构建
 * ════════════════════════════════════════════════════════════════════
 */

/** 公网网关缺省地址（部署后填入，如 'https://qdu-nav-gateway.onrender.com'；留空=不预设） */
export const PUBLIC_API_DEFAULT = ''

const LS_KEY = 'qdu_api_base'
const META_NAME = 'qdu-agent-api'

/** 去尾斜杠 */
function trimSlash(s) {
  return String(s || '').replace(/\/+$/, '')
}

/** 从地址栏读 ?api=（与管理台 admin.html 同规，评审/手机联调用） */
export function apiFromQuery() {
  try {
    const q = new URLSearchParams(location.search).get('api')
    return q ? trimSlash(q) : ''
  } catch { return '' }
}

/** 手工设置的基地址 */
export function apiFromStore() {
  try { return trimSlash(localStorage.getItem(LS_KEY) || '') } catch { return '' }
}

/** 页面预置（<meta name="qdu-agent-api" content="https://…"> / window.QDU_AGENT_API） */
export function apiFromPage() {
  try {
    if (window.QDU_AGENT_API) return trimSlash(window.QDU_AGENT_API)
    const meta = document.querySelector('meta[name="' + META_NAME + '"]')
    if (meta && meta.content) return trimSlash(meta.content)
  } catch { /* noop */ }
  return ''
}

/**
 * 解析当前 API 基地址（'' = 同源，本地开发走 vite 代理，网关托管走同源）
 * @returns {string}
 */
export function getApiBase() {
  return apiFromQuery() || apiFromStore() || apiFromPage() || PUBLIC_API_DEFAULT || ''
}

/** 手工设置（数据管家页 / 诊断页调用；空串=清除回同源） */
export function setApiBase(url) {
  const v = trimSlash(url)
  try {
    if (v) localStorage.setItem(LS_KEY, v)
    else localStorage.removeItem(LS_KEY)
  } catch { /* 隐私模式忽略 */ }
  return v
}
export function clearApiBase() {
  return setApiBase('')
}

/**
 * 拼完整接口地址（调用方一律经此函数，不再手写 '/api/…'）
 * @param {string} path 以 /api 开头的路径
 */
export function apiUrl(path) {
  const base = getApiBase()
  return base ? base + path : path
}

/** SSE 地址（notify.bindSSE 用；同源时保持相对路径） */
export function eventsUrl() {
  return apiUrl('/api/events')
}

/**
 * 当前模式描述（诊断页/数据管家页/评论区模式行共用文案）
 * @returns {{mode:'local'|'gateway', base:string, text:string}}
 */
export function describeMode() {
  const base = getApiBase()
  if (!base) {
    const host = (() => { try { return location.hostname } catch { return '' } })()
    const isLocal = host === 'localhost' || host === '127.0.0.1' || host === ''
    return {
      mode: 'gateway',
      base: '(同源)',
      text: isLocal
        ? '🟢 网关模式：同源 API（本地网关/开发代理）'
        : '🟡 本机模式：静态站无同源网关，数据仅存本机；去数据管家设置网关地址可切线上版'
    }
  }
  return { mode: 'gateway', base, text: '🟢 网关模式：' + base }
}

/**
 * 探测网关是否可达（设置地址后“测试连接”按钮用，8s 超时）
 * @param {string} base 缺省用当前解析值
 * @returns {Promise<{ok:boolean, ms:number, error?:string}>}
 */
export async function probeGateway(base) {
  const b = trimSlash(base || getApiBase())
  if (!b) return { ok: false, ms: 0, error: '未设置网关地址（同源模式无需探测）' }
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 8000)
  const t0 = Date.now()
  try {
    const r = await fetch(b + '/api/health', { signal: ctrl.signal })
    const d = await r.json().catch(() => ({}))
    if (!r.ok || !d.ok) throw new Error('HTTP ' + r.status)
    return { ok: true, ms: Date.now() - t0 }
  } catch (e) {
    return { ok: false, ms: Date.now() - t0, error: e.name === 'AbortError' ? '连接超时（8s）' : (e.message || '连接失败') }
  } finally {
    clearTimeout(timer)
  }
}
