/**
 * ════════════════════════════════════════════════════════════════════
 * @模块路径  scripts/e2e-integrity.mjs
 * @职责      发布完整性门禁（真 E2E · 无浏览器）：注册表交叉引用 +
 *            构建产物完整性 —— CI 在 npm run build 后跑它，挂了就拦部署
 * @用法      node scripts/e2e-integrity.mjs   （退出码 0 = 可发布）
 * @检查      ① apps.js id ⊆ router VIEWS（双向，home 除外）
 *            ② intents app 直行目标 ⊆ VIEWS
 *            ③ CHAINS steps ⊆ WORKFLOWS
 *            ④ dist 含各视图分包 + admin.html + admin/index.html +
 *               console/index.html + 404.html（mobile/standalone 有源码即要求产物）
 *            ⑤ kb-nav.json 与 faq/workflows/apps 源同步（gen 重生成比对，防陈旧）
 *            ⑥ i18n zh/en 键对等（双向同构；en 缺键英文模式回落中文）
 * @设计      全用正则/文件系统解析，不 import 源码（node ESM 无扩展名限制），
 *            哪里都能跑；只报 ERROR（缺东西），不拦 WARNING
 * ════════════════════════════════════════════════════════════════════
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const SRC = path.join(ROOT, 'src')
const DIST = path.join(ROOT, 'dist')
const read = (p) => fs.readFileSync(p, 'utf8')

let pass = 0
let fail = 0
function ok(name, cond, extra = '') {
  if (cond) { pass++; console.log('  PASS  ' + name) }
  else { fail++; console.log('  FAIL  ' + name + (extra ? ' → ' + extra : '')) }
}

/* ── 1. apps ↔ router ── */
const appsSrc = read(path.join(SRC, 'data', 'apps.js'))
const appIds = [...appsSrc.matchAll(/id:\s*'(\w+)'/g)].map((m) => m[1])
const routerSrc = read(path.join(SRC, 'router.js'))
const viewIds = [...routerSrc.matchAll(/(\w+):\s*\(\)\s*=>\s*import\('\.\/views\/(\w+)\.vue'\)/g)]
const viewMap = new Map(viewIds.map((m) => [m[1], m[2]]))
const missingViews = appIds.filter((id) => !viewMap.has(id))
ok('apps.js id 全部在 router 登记', missingViews.length === 0, '缺失:' + missingViews.join(','))
const orphanViews = [...viewMap.keys()].filter((id) => !appIds.includes(id) && id !== 'home')
const ORPHAN_OK = new Set(['categories'])
const badOrphans = orphanViews.filter((id) => !ORPHAN_OK.has(id))
ok('router 无孤儿视图（无入口）', badOrphans.length === 0, '孤儿:' + badOrphans.join(','))
// i18n 注册表完整（中英同构；缺词前台回落中文，不断英文模式）
const missingEn = [...appsSrc.matchAll(/\{ id: '(\w+)',[^}]*?\}/g)]
  .map((m) => m[0])
  .filter((entry, i) => {
    const id = (entry.match(/id: '(\w+)'/) || [])[1]
    return !(entry.includes('titleEn') && entry.includes('descEn') && entry.includes('groupEn')) ? id : null
  })
  .filter(Boolean)
ok('应用注册表英文字段齐全', missingEn.length === 0, '缺EN:' + missingEn.join(','))
// 视图文件存在
const missingFiles = [...viewMap.values()].filter((v) => !fs.existsSync(path.join(SRC, 'views', v + '.vue')))
ok('登记视图文件全部存在', missingFiles.length === 0, '缺文件:' + missingFiles.join(','))

/* ── 2. intents 直行目标 ── */
const intentsSrc = read(path.join(SRC, 'agent', 'intents.js'))
const appTargets = [...new Set([...intentsSrc.matchAll(/kind:\s*'app',\s*app:\s*'(\w+)'/g)].map((m) => m[1]))]
const badTargets = appTargets.filter((id) => !viewMap.has(id))
ok('意图直达应用全部可路由', badTargets.length === 0, '坏目标:' + badTargets.join(','))

/* ── 3. CHAINS 步骤 ── */
const wfSrc = read(path.join(SRC, 'agent', 'workflows.js'))
const chainsStart = wfSrc.indexOf('export const CHAINS')
const chainsEnd = wfSrc.indexOf('export class CLARIFY', chainsStart)
const chainsBlock = wfSrc.slice(chainsStart, chainsEnd < 0 ? undefined : chainsEnd)
const wfIds = new Set([...wfSrc.matchAll(/^  (\w+): \{/gm)].map((m) => m[1]))
const chainSteps = [...chainsBlock.matchAll(/'(\w+)'/g)].map((m) => m[1])
  .filter((s) => !['morning', 'study', 'life', '早晨三连', '简报'].includes(s))
const badSteps = [...new Set(chainSteps)].filter((s) => !wfIds.has(s) && /[a-zA-Z]/.test(s) && s.length > 2)
ok('任务链步骤全部是已注册工作流', badSteps.length === 0, '坏步骤:' + badSteps.join(','))
ok('工作流总数≥30（国奖厚度线）', wfIds.size >= 30, '当前' + wfIds.size)

/* ── 4. dist 产物 ── */
const distExists = fs.existsSync(DIST)
ok('dist 已构建（先 npm run build）', distExists)
if (distExists) {
  const assets = fs.existsSync(path.join(DIST, 'assets'))
    ? fs.readdirSync(path.join(DIST, 'assets')).filter((f) => f.endsWith('.js')) : []
  const missingChunks = [...viewMap.values()].filter((v) => !assets.some((a) => a.startsWith(v + '-')))
  ok('各视图分包齐全（懒加载无 404）', missingChunks.length === 0, '缺包:' + missingChunks.join(','))
  for (const f of ['admin.html', 'admin/index.html', 'console/index.html', '404.html', 'index.html']) {
    ok('dist/' + f + ' 存在', fs.existsSync(path.join(DIST, f)))
  }
  if (fs.existsSync(path.join(SRC, '..', 'mobile.html'))) {
    ok('dist/mobile.html 存在（多入口）', fs.existsSync(path.join(DIST, 'mobile.html')))
  }
}

/* ── 5. kb-nav 新鲜度（改 faq/workflows/apps 后必须重跑 gen_kb_nav） ── */
{
  const tmp = path.join(os.tmpdir(), 'kb-nav-fresh-' + process.pid + '.json')
  let same = false
  let errMsg = ''
  try {
    execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'gen_kb_nav.mjs')], {
      env: { ...process.env, KB_NAV_OUT: tmp }, stdio: 'pipe'
    })
    const norm = (s) => s.replace(/\r\n/g, '\n').trim()
    same = norm(fs.readFileSync(tmp, 'utf8')) === norm(read(path.join(SRC, 'agent', 'kb-nav.json')))
  } catch (e) { errMsg = String(e.message || e).slice(0, 140) }
  fs.rmSync(tmp, { force: true })
  ok('kb-nav.json 与 faq/workflows/apps 源同步', same, errMsg || '陈旧：重跑 node scripts/gen_kb_nav.mjs 并提交')
}

/* ── 6. i18n 键对等（zh/en 双向同构） ── */
{
  let missEn = null
  let missZh = null
  let errMsg = ''
  try {
    const zh = (await import(pathToFileURL(path.join(SRC, 'i18n', 'zh.js')).href)).default
    const en = (await import(pathToFileURL(path.join(SRC, 'i18n', 'en.js')).href)).default
    const flat = (o, p = '', acc = new Set()) => {
      if (o && typeof o === 'object' && !Array.isArray(o)) {
        for (const k of Object.keys(o)) flat(o[k], p ? p + '.' + k : k, acc)
      } else acc.add(p)
      return acc
    }
    const z = flat(zh)
    const e = flat(en)
    missEn = [...z].filter((k) => !e.has(k))
    missZh = [...e].filter((k) => !z.has(k))
  } catch (e2) { errMsg = String(e2.message || e2).slice(0, 140) }
  ok('i18n 键对等：zh⊆en（en 缺键会回落中文）', missEn !== null && missEn.length === 0, errMsg || 'en 缺:' + (missEn || []).slice(0, 8).join(','))
  ok('i18n 键对等：en⊆zh（无幽灵键）', missZh !== null && missZh.length === 0, errMsg || 'zh 缺:' + (missZh || []).slice(0, 8).join(','))
}

console.log(`\n done: pass=${pass} fail=${fail}`)
process.exit(fail ? 1 : 0)
