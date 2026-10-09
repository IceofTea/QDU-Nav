/**
 * ════════════════════════════════════════════════════════════════════
 * @模块路径  scripts/audit-refs.mjs
 * @职责      模板引用审计（防白屏）：扫描全部 .vue，揪出模板中使用但
 *            <script setup> 未定义的标识符 + 无扩展名的相对 import
 *            —— 2026-10-08 FJNU 白屏事故（navLabel 断头引用）的制度化复盘
 * @用法      node scripts/audit-refs.mjs [--strict]
 *            缺省只报错（exit 1），--strict 把警告也算失败（CI 门禁）
 * @设计      纯正则近似（非全量 AST），宁可误报不可漏报；误报用
 *            KNOWN_FALSE_POS 全局名单 + 文件内 `<!-- audit-ok: xxx -->` 压制
 * ════════════════════════════════════════════════════════════════════
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src')
const STRICT = process.argv.includes('--strict')

const JS_KEYWORDS = new Set([
  'true', 'false', 'null', 'undefined', 'typeof', 'instanceof', 'in', 'of', 'new',
  'if', 'else', 'for', 'while', 'return', 'function', 'const', 'let', 'var',
  'this', 'void', 'delete', 'await', 'async', 'import', 'export', 'default',
  'try', 'catch', 'finally', 'throw', 'switch', 'case', 'break', 'continue', 'do'
])
const GLOBALS = new Set([
  'Math', 'Date', 'JSON', 'String', 'Number', 'Boolean', 'Array', 'Object',
  'Promise', 'Error', 'RegExp', 'Map', 'Set', 'console', 'window', 'document',
  'localStorage', 'sessionStorage', 'navigator', 'location', 'history',
  'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval',
  'requestAnimationFrame', 'fetch', 'parseInt', 'parseFloat', 'isNaN',
  'encodeURIComponent', 'decodeURIComponent', 'Intl', 'URL', 'URLSearchParams',
  'FormData', 'FileReader', 'Blob', 'Notification', 'EventSource', 'alert',
  'confirm', 'prompt', 'getComputedStyle', 'requestIdleCallback', 'index'
])
// 误报名单（人工复核后登记）：“文件::标识”
const KNOWN_FALSE_POS = new Set([])

const errors = []
const warns = []

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walk(p, out)
    else if (e.name.endsWith('.vue')) out.push(p)
  }
  return out
}

function definedIn(script) {
  const defs = new Set()
  // import { a, b as c } / import X / import * as N
  for (const m of script.matchAll(/import\s+(?:(\w+)\s*,)?\s*(?:\{([^}]*)\}|\*\s*as\s+(\w+)|(\w+))\s*from/g)) {
    if (m[1]) defs.add(m[1])
    if (m[2]) for (const s of m[2].split(',')) { const a = s.trim().split(/\s+as\s+/).pop().trim(); if (a) defs.add(a) }
    if (m[3]) defs.add(m[3])
    if (m[4]) defs.add(m[4])
  }
  // const { a, b: c } = … 解构（模板 setup 的主要定义方式）
  for (const m of script.matchAll(/(?:const|let|var)\s*\{([^}]*)\}\s*=/g)) {
    for (const s of m[1].split(',')) {
      const parts = s.trim().split(':').map((x) => x.trim())
      const id = parts[parts.length - 1].split('=')[0].trim()
      if (/^[A-Za-z_$][\w$]*$/.test(id)) defs.add(id)
    }
  }
  for (const m of script.matchAll(/(?:const|let|var|function)\s+([A-Za-z_$][\w$]*)/g)) defs.add(m[1])
  // defineProps(['a','b']) 数组式 / defineProps({a: T}) 对象式 → 模板可直用
  for (const m of script.matchAll(/defineProps\(\s*\[([\s\S]*?)\]/g)) {
    for (const s of m[1].matchAll(/['"]([A-Za-z_$][\w$]*)['"]/g)) defs.add(s[1])
  }
  for (const m of script.matchAll(/defineProps\(\s*\{([\s\S]*?)\}\s*\)/g)) {
    for (const s of m[1].matchAll(/([A-Za-z_$][\w$]*)\s*:/g)) defs.add(s[1])
  }
  return defs
}

function checkFile(file) {
  const name = path.basename(file)
  const raw = fs.readFileSync(file, 'utf8')
  const tpl = (raw.match(/<template>([\s\S]*)<\/template>/) || [])[1] || ''
  const sc = (raw.match(/<script setup>([\s\S]*)<\/script>/) || [])[1] || ''
  if (!tpl) return
  const defs = definedIn(sc)
  // v-for 别名：v-for="(x, i) in" / v-for="x in" / v-for="[g, list] in" → 别名视为已定义
  for (const m of tpl.matchAll(/v-for="([^"]*)"/g)) {
    const left = m[1].split(/\s+in\s+/)[0].replace(/[()[\]]/g, '')
    for (const a of left.split(',')) { const id = a.trim(); if (/^[A-Za-z_$][\w$]*$/.test(id)) defs.add(id) }
  }
  // 内联箭头函数参数：@click="(id) => …" / @vote="(p, i) => …" → 参数视为已定义
  for (const m of tpl.matchAll(/(?:\(\s*([A-Za-z_$][\w$]*(?:\s*,\s*[A-Za-z_$][\w$]*)*)\s*\)|([A-Za-z_$][\w$]*))\s*=>/g)) {
    const params = (m[1] || m[2] || '').split(',').map((s) => s.trim()).filter(Boolean)
    for (const p of params) defs.add(p)
  }
  // 收集模板表达式：{{ }} 与指令值
  const exprs = []
  for (const m of tpl.matchAll(/\{\{([\s\S]*?)\}\}/g)) exprs.push(m[1])
  for (const m of tpl.matchAll(/(?:v-if|v-else-if|v-show|v-for|v-model|:[A-Za-z0-9_-]+|@[A-Za-z0-9_.-]+)="([^"]*)"/g)) exprs.push(m[1])
  // 文件内压制：<!-- audit-ok: foo, bar -->
  const suppress = new Set()
  const sup = raw.match(/<!--\s*audit-ok:([^>]*)-->/)
  if (sup) for (const s of sup[1].split(',')) suppress.add(s.trim())
  const seen = new Set()
  for (const ex of exprs) {
    // 去掉字符串字面量，避免 'xxx' 里的词误报
    let code = ex.replace(/'([^'\\]|\\.)*'|"([^"\\]|\\.)*"|`([^`\\]|\\.)*`/g, "''")
    // 去掉正则/转义里的 unicode（/[\u4e00-\u9fa5]/ 会被误读成标识 u4e00）
    code = code.replace(/\\u[0-9a-fA-F]{4}/g, '')
    // 去掉对象字面量键（{ type: x } 的 type 不是变量引用）
    code = code.replace(/[{,]\s*[A-Za-z_$][\w$]*\s*:/g, (s) => s[0])
    for (const m of code.matchAll(/\.?([A-Za-z_$][\w$]*)/g)) {
      const full = m[0], id = m[1]
      if (full.startsWith('.')) continue // 属性访问 a.b → 只查 a（a 本身会被单独匹配到）
      if (seen.has(id)) continue
      seen.add(id)
      if (JS_KEYWORDS.has(id) || GLOBALS.has(id)) continue
      if (id.startsWith('$')) continue // $event 等
      if (defs.has(id) || suppress.has(id) || KNOWN_FALSE_POS.has(name + '::' + id)) continue
      // $开头的 props（:foo）已在上过滤；剩余即嫌疑
      errors.push(`${name}::${id}（模板使用但 setup 未定义）`)
    }
  }
}

/* ── 无扩展名相对 import 审计（.js 全文件） ── */
function walkJs(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) { if (!/node_modules|dist/.test(p)) walkJs(p, out) }
    else if (/\.m?js$/.test(e.name)) out.push(p)
  }
  return out
}
function checkImports(file) {
  const raw = fs.readFileSync(file, 'utf8')
  for (const m of raw.matchAll(/(?:import|export)[^'"]*from\s*['"]([^'"]+)['"]/g)) {
    const p = m[1]
    if (p.startsWith('.') && !/\.(js|mjs|vue|json|css)(\?|$)/.test(p)) {
      warns.push(`${path.relative(ROOT, file)}: 无扩展名相对引用 '${p}'（vite 可跑，node ESM 不可，建议补 .js）`)
    }
  }
}

for (const f of walk(ROOT)) checkFile(f)
for (const f of walkJs(ROOT)) checkImports(f)

console.log(`── audit-refs: ${errors.length} 错误 / ${warns.length} 警告 ──`)
for (const w of warns.slice(0, 40)) console.log('  WARN  ' + w)
if (warns.length > 40) console.log(`  …还有 ${warns.length - 40} 条警告`)
for (const e of errors) console.log('  FAIL  ' + e)
if (!errors.length && !warns.length) console.log('  全部干净 ✓')
const failed = errors.length > 0 || (STRICT && warns.length > 0)
process.exit(failed ? 1 : 0)
