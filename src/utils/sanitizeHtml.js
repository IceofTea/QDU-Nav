/**
 * HTML 白名单消毒 —— 零依赖 · DOM-free · 浏览器与 Node 行为一致
 *
 * 为什么需要：`NoticeDetail.vue` 用 `v-html` 渲染教务处详情页正文，
 * 这段 HTML 来自校外服务器（`/api/notice` 抓取结果），属**外部不可信输入**。
 * 原实现只在网关侧剥掉 `on*` 事件属性（`server/index.mjs`），既没有标签白名单，
 * 也覆盖不到「纯静态托管无网关」的降级路径——`<iframe src=…>`、`<style>` 覆盖、
 * `javascript:` 伪协议链接都能穿过去。
 *
 * 本模块用**严格白名单**替代黑名单：
 *   · 标签白名单：只放行正文常用标签；不在白名单的标签被「拆壳保留文字」；
 *   · 内容丢弃表：`script/style/iframe/object/embed/svg/math/form/...` 连内部文本一起丢弃；
 *   · 属性白名单：按标签限定（`a[href]`、`img[src/alt]`、`td[colspan/rowspan]`…），其余一律剥离；
 *   · URL 协议白名单：只放行 `http/https/mailto/tel` 与相对路径；`javascript:`/`vbscript:`/
 *     `data:`（图片除外）一律拒绝——先做实体解码与空白/控制字符归一，防 `&#106;avascript:` 绕过；
 *   · 外链自动补 `rel="noopener noreferrer"`，目标强制 `target="_blank"` 之外的写法保持不变。
 *
 * 刻意**不依赖 DOMParser / document**：Node 侧可完整单测，SSR 与浏览器行为一致，
 * 也避免「浏览器一套、测试一套」的双实现漂移。
 */

/** 允许保留的标签（正文语义标签白名单） */
const ALLOW_TAGS = new Set([
  'a', 'abbr', 'b', 'blockquote', 'br', 'caption', 'cite', 'code', 'dd', 'del', 'div', 'dl', 'dt',
  'em', 'figcaption', 'figure', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr', 'i', 'img', 'ins',
  'kbd', 'li', 'mark', 'ol', 'p', 'pre', 'q', 's', 'samp', 'small', 'span', 'strong', 'sub',
  'sup', 'table', 'tbody', 'td', 'tfoot', 'th', 'thead', 'tr', 'u', 'ul'
])

/** 命中即「连内容一起丢弃」的标签（含其子树） */
const DROP_CONTENT_TAGS = new Set([
  'script', 'style', 'iframe', 'frame', 'frameset', 'object', 'embed', 'applet', 'link', 'meta',
  'base', 'noscript', 'template', 'svg', 'math', 'form', 'input', 'textarea', 'select', 'option',
  'button', 'canvas', 'audio', 'video', 'source', 'track', 'portal', 'dialog', 'slot'
])

/**
 * HTML「原始文本元素」：其内容按规范在**第一个** `</tag` 处结束，内部不解析标签。
 * 对这类标签不能做「深度配对计数」——否则 `var s = "<script>"` 这类字符串会被误判为嵌套，
 * 导致跳过失败并把脚本体当正文输出（这是真实注入面，测试里已回归）。
 */
const RAW_TEXT_TAGS = new Set(['script', 'style', 'iframe', 'noembed', 'noframes', 'xmp', 'plaintext'])

/** 自闭合标签（无需配对） */
const VOID_TAGS = new Set(['br', 'hr', 'img', 'area', 'col', 'wbr'])

/** 全局允许的属性 */
const GLOBAL_ATTRS = new Set(['title'])
/** 按标签允许的属性 */
const TAG_ATTRS = {
  a: new Set(['href']),
  img: new Set(['src', 'alt', 'width', 'height']),
  td: new Set(['colspan', 'rowspan']),
  th: new Set(['colspan', 'rowspan', 'scope']),
  ol: new Set(['start'])
}

/** 允许的 URL 协议（正则均按「归一后的小写串」匹配） */
const SAFE_URL = /^(?:https?:\/\/|mailto:|tel:|\/|#|\.{1,2}\/)/i
/** 图片额外允许内联 data（仅图片 MIME） */
const SAFE_DATA_IMG = /^data:image\/(?:png|jpe?g|gif|webp|avif);base64,[a-z0-9+/=\s]+$/i

/**
 * 归一 URL 用于协议判定：
 * ① 解码数字实体（`&#106;` / `&#x6a;`）；② 去掉所有空白与控制字符（`java\tscript:` 绕过）。
 */
function normalizeUrl(raw) {
  let s = String(raw || '')
  s = s.replace(/&#x([0-9a-f]+);?/gi, (_, h) => {
    const n = parseInt(h, 16)
    return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : ''
  })
  s = s.replace(/&#(\d+);?/g, (_, d) => {
    const n = parseInt(d, 10)
    return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : ''
  })
  s = s.replace(/&amp;/gi, '&').replace(/&colon;/gi, ':')
  return s.replace(/[\u0000-\u0020\u007f\u00a0\u2000-\u200f\u2028-\u202f\ufeff]/g, '').trim()
}

/** 是否为安全链接（供 href 使用） */
export function isSafeHref(raw) {
  const s = normalizeUrl(raw)
  if (!s) return false
  if (/^[a-z][a-z0-9+.-]*:/i.test(s)) return SAFE_URL.test(s)
  return true
}

/** 是否为安全图片地址（供 img.src 使用，额外允许图片 data URI） */
export function isSafeImgSrc(raw) {
  const s = normalizeUrl(raw)
  if (!s) return false
  if (/^data:/i.test(s)) return SAFE_DATA_IMG.test(s)
  if (/^[a-z][a-z0-9+.-]*:/i.test(s)) return /^https?:\/\//i.test(s)
  return true
}

/** 属性值是否需要 URL 协议校验 */
function checkAttr(tag, name, value) {
  if (!value) return false
  if (tag === 'a' && name === 'href') return isSafeHref(value)
  if (tag === 'img' && name === 'src') return isSafeImgSrc(value)
  if (name === 'colspan' || name === 'rowspan' || name === 'start') return /^\d{1,4}$/.test(value)
  if (name === 'width' || name === 'height') return /^\d{1,4}$/.test(value)
  if (name === 'scope') return /^(row|col|rowgroup|colgroup)$/i.test(value)
  return true
}

/** 解析属性串 → [[name, value], ...]（只做最小化解析，值统一用双引号输出） */
function parseAttrs(raw) {
  const out = []
  const re = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*(?:=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'`=<>]+)))?/g
  let m
  while ((m = re.exec(raw))) {
    const name = m[1].toLowerCase()
    const value = m[2] != null ? m[2] : m[3] != null ? m[3] : m[4] != null ? m[4] : ''
    out.push([name, value])
  }
  return out
}

function escapeAttr(v) {
  return String(v).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** 过滤单个标签，返回 `{ open, selfClose }` 形式的字符串；不允许时返回 '' */
function filterTag(tag, attrsRaw, { allowTarget = true } = {}) {
  if (!ALLOW_TAGS.has(tag)) return ''
  const allowed = TAG_ATTRS[tag] || new Set()
  const kept = []
  let hasBlankTarget = false
  for (const [name, value] of parseAttrs(attrsRaw)) {
    if (name.startsWith('on')) continue
    if (name === 'target') {
      if (allowTarget && tag === 'a' && /^_blank$/i.test(value)) hasBlankTarget = true
      continue
    }
    if (!GLOBAL_ATTRS.has(name) && !allowed.has(name)) continue
    if (!checkAttr(tag, name, value)) continue
    kept.push([name, value])
  }
  if (tag === 'a' && hasBlankTarget) kept.push(['rel', 'noopener noreferrer'])
  const attrStr = kept.map(([n, v]) => (v === '' ? ` ${n}` : ` ${n}="${escapeAttr(v)}"`)).join('')
  return `<${tag}${attrStr}>`
}

/**
 * 主入口：消毒 HTML 字符串。
 * @param html 原始 HTML
 * @param opts.allowTarget 是否保留 `target="_blank"`（默认 true）
 * @returns 消毒后的 HTML 字符串
 */
export function sanitizeHtml(html, { allowTarget = true } = {}) {
  const src = String(html == null ? '' : html)
  if (!src) return ''
  let out = ''
  let i = 0
  const stack = []
  while (i < src.length) {
    const lt = src.indexOf('<', i)
    if (lt < 0) {
      out += src.slice(i)
      break
    }
    out += src.slice(i, lt)
    // 注释 / CDATA / 声明：整段丢弃
    if (src.startsWith('<!--', lt)) {
      const end = src.indexOf('-->', lt + 4)
      i = end < 0 ? src.length : end + 3
      continue
    }
    if (src.startsWith('<!', lt) || src.startsWith('<?', lt)) {
      const end = src.indexOf('>', lt)
      i = end < 0 ? src.length : end + 1
      continue
    }
    const gt = src.indexOf('>', lt)
    if (gt < 0) { out += src.slice(lt); break }
    let inner = src.slice(lt + 1, gt)
    i = gt + 1
    const selfClose = inner.endsWith('/')
    if (selfClose) inner = inner.slice(0, -1)
    const isClose = inner.startsWith('/')
    if (isClose) inner = inner.slice(1)
    const nameMatch = inner.match(/^([a-zA-Z][a-zA-Z0-9:-]*)/)
    if (!nameMatch) continue
    const tag = nameMatch[1].toLowerCase()
    const attrRaw = inner.slice(nameMatch[1].length).trim()

    if (DROP_CONTENT_TAGS.has(tag)) {
      if (!isClose && !selfClose) {
        if (RAW_TEXT_TAGS.has(tag)) {
          // 原始文本元素：内容在第一个 `</tag` 处结束（符合 HTML 解析规范，防「字符串里再写标签」绕过）
          const close = new RegExp(`</\\s*${tag}\\b`, 'i')
          const rest = src.slice(i)
          const m = rest.match(close)
          i = m ? i + m.index + m[0].length : src.length
          // 跳到该闭合标签的 '>' 之后
          const gt2 = src.indexOf('>', i)
          i = gt2 < 0 ? src.length : gt2 + 1
        } else {
          // 其它被丢弃标签：按同名标签嵌套配对跳过整棵子树；扫不到闭合则丢弃到结尾（安全优先）
          let depth = 1
          let end = -1
          const scan = new RegExp(`<\\s*(/?)${tag}\\b[^>]*>`, 'gi')
          scan.lastIndex = i
          let m
          while ((m = scan.exec(src))) {
            if (m[1] === '/') {
              depth--
              if (depth === 0) { end = scan.lastIndex; break }
            } else if (!/\/\s*>$/.test(m[0])) {
              depth++
            }
          }
          i = end < 0 ? src.length : end
        }
      }
      continue
    }
    if (isClose) {
      // 只在确实开过该标签时输出闭合，避免产生不配对标签
      const idx = stack.lastIndexOf(tag)
      if (idx >= 0) {
        for (let k = stack.length - 1; k >= idx; k--) out += `</${stack[k]}>`
        stack.length = idx
      }
      continue
    }
    const open = filterTag(tag, attrRaw, { allowTarget })
    if (!open) continue
    out += open
    if (VOID_TAGS.has(tag) || selfClose) continue
    stack.push(tag)
  }
  while (stack.length) out += `</${stack.pop()}>`
  return out
}

/** 便捷：消毒后只保留纯文本（无标签）——部分场景（如通知摘要）只需要文字 */
export function sanitizeToText(html) {
  return sanitizeHtml(html).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
}

export default { sanitizeHtml, sanitizeToText, isSafeHref, isSafeImgSrc }
