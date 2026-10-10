/**
 * 不蒜子（busuanzi.ibruce.info）三指标共享模块
 * ---------------------------------------------------------------------------
 * 三指标语义（维护者要求「物尽其用」）：
 *  - site_pv：全站被点击总次数，重复点击累加（每次导航注入一次 JSONP → +1）
 *  - site_uv：全站独立访客，busuanzi 按域名去重
 *  - page_pv：单页阅读量（JSONP 按完整 Referer 路径计数；hash 路由下浏览器
 *    Referer 不含 #hash，各页共享站点根计数，前端按前端路由 path 缓存展示）
 *
 * 关键实现点：
 *  - 串行队列：路由快速切换时同刻只发一个 JSONP，防 span 回填竞态（in-flight 时排队）
 *  - 常驻隐藏 span：脚本按 id 回填；不放组件里，否则组件卸载后 span 消失、JSONP 空写
 *  - 注入前清空 span：否则轮询会读到上一次的旧值而过早 resolve
 *  - 失败：script.onerror / 10s 超时 → fail；成功读齐三值 → ok
 */
import { reactive } from 'vue'

const BSZ_SRC = 'https://busuanzi.ibruce.info/busuanzi/2.3/busuanzi.pure.mini.js'
const TIMEOUT_MS = 10000
const POLL_MS = 250

/** 组件只读此共享状态（勿直接改字段，走 hitBusuanzi） */
export const bsz = reactive({
  state: 'idle',   // idle | loading | ok | fail
  pagePvMap: {},   // 前端路由 path → page_pv（切页后回看不丢）
  sitePv: null,    // string | null
  siteUv: null     // string | null
})

function ensureHost() {
  // 逐个补齐缺失的 span：FJNU 站的 Vercount 会自建 site_pv/site_uv 两个 span，
  // 若按「已存在就不建」的整体判断会漏掉 page_pv → collect 永远等不齐 → 卡 loading
  const ids = ['busuanzi_value_site_pv', 'busuanzi_value_site_uv', 'busuanzi_value_page_pv']
  let host = null
  for (const id of ids) {
    if (document.getElementById(id)) continue
    if (!host) {
      host = document.getElementById('busuanzi-bsz-host')
      if (!host) {
        host = document.createElement('div')
        host.id = 'busuanzi-bsz-host'
        host.setAttribute('aria-hidden', 'true')
        host.style.cssText = 'display:none'
        document.body.appendChild(host)
      }
    }
    const s = document.createElement('span')
    s.id = id
    host.appendChild(s)
  }
}

function clearSpans() {
  ['page_pv', 'site_pv', 'site_uv'].forEach((k) => {
    const el = document.getElementById('busuanzi_value_' + k)
    if (el) el.textContent = ''
  })
}

function readSpan(key) {
  const el = document.getElementById('busuanzi_value_' + key)
  const s = el ? String(el.textContent || '').trim() : ''
  return /^\d+$/.test(s) ? s : null
}

function collect() {
  const page = readSpan('page_pv')
  const sp = readSpan('site_pv')
  const su = readSpan('site_uv')
  return page && sp && su ? { page, sp, su } : null
}

/** 注入一次 JSONP（脚本自带 referrerPolicy，按 Referer 计 page_pv） */
function injectOnce() {
  return new Promise((resolve) => {
    ensureHost()
    clearSpans()
    const sc = document.createElement('script')
    sc.async = true
    sc.src = BSZ_SRC
    let settled = false
    let poll = null
    let timer = null
    const finish = (ok) => {
      if (settled) return
      settled = true
      if (poll) clearInterval(poll)
      if (timer) clearTimeout(timer)
      sc.remove()
      resolve(ok)
    }
    sc.onerror = () => finish(false)
    poll = setInterval(() => { if (collect()) finish(true) }, POLL_MS)
    timer = setTimeout(() => finish(false), TIMEOUT_MS)
    document.head.appendChild(sc)
  })
}

// —— 串行队列 ——
const queue = []
let pumping = false

function pump() {
  if (pumping || !queue.length) return
  pumping = true
  const job = queue.shift()
  bsz.state = 'loading'
  injectOnce()
    .then((ok) => {
      if (ok) {
        const got = collect()
        if (got) {
          bsz.pagePvMap[job.path] = got.page
          bsz.sitePv = got.sp
          bsz.siteUv = got.su
          bsz.state = 'ok'
          return
        }
      }
      bsz.state = 'fail'
    })
    .catch(() => { bsz.state = 'fail' })
    .finally(() => {
      pumping = false
      if (job.done) job.done()
      pump() // 继续消化后续排队的导航
    })
}

/**
 * 导航后调用：注入一次 JSONP（site_pv +1），三值回填共享状态并缓存该 path 的 page_pv。
 * @param {string} path 前端路由口径路径（'/' = 首页，'/app/xxx' = 应用页）
 */
export function hitBusuanzi(path) {
  const p = path || '/'
  return new Promise((resolve) => {
    queue.push({ path: p, done: resolve })
    pump()
  })
}

/** 读某 path 的 page_pv（组件展示用） */
export function bszPagePv(path) {
  const v = bsz.pagePvMap[path || '/']
  return v === undefined ? null : v
}
