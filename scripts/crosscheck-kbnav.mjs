/**
 * ════════════════════════════════════════════════════════════════════
 * @模块路径  scripts/crosscheck-kbnav.mjs
 * @职责      kb-nav.json 出处交叉审计：「应用/工作流」出处 ⊆ 本仓注册表；
 *            「…百科 · 分类/页」类出处若设 WIKI_KB=<wiki/site/assets/kb.json>
 *            则再校验其在 Wiki kb chunks 中真实存在（分类 c + 页标题 p 前缀匹配）
 * @用法      node scripts/crosscheck-kbnav.mjs
 *            WIKI_KB=../QDU-Wiki/site/assets/kb.json node scripts/crosscheck-kbnav.mjs
 * @退出码    0 = 全部命中；1 = 有出处悬空
 * @背景      2026-10-10 第四棒审计发现 kb-nav 陈旧 4 个月 + 2 条俗称页名悬空，
 *            本脚本为该审计的固化版（与 gen_kb_nav 配套例行跑）
 * ════════════════════════════════════════════════════════════════════
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (p) => fs.readFileSync(p, 'utf8')
const kb = JSON.parse(read(path.join(ROOT, 'src', 'agent', 'kb-nav.json')))
const docs = kb.docs || []

const appIds = new Set([...read(path.join(ROOT, 'src', 'data', 'apps.js')).matchAll(/\{ id: '(\w+)',/g)].map((m) => m[1]))
const viewIds = new Set([...read(path.join(ROOT, 'src', 'router.js')).matchAll(/(\w+):\s*\(\)\s*=>\s*import\('\.\/views\//g)].map((m) => m[1]))
const wfIds = new Set([...read(path.join(ROOT, 'src', 'agent', 'workflows.js')).matchAll(/^  (\w+): \{/gm)].map((m) => m[1]))

let fail = 0
function check(name, bad) {
  if (bad.length) { fail++; console.log('  FAIL  ' + name + ' → ' + bad.join(', ')) }
  else console.log('  PASS  ' + name)
}

const appSrcs = docs.filter((d) => (d.src || '').startsWith('应用 ')).map((d) => d.src.slice(3).trim())
check('应用出处全部存在于 apps/router（' + appSrcs.length + ' 条）', appSrcs.filter((id) => !appIds.has(id) && !viewIds.has(id)))

const wfSrcs = docs.filter((d) => (d.src || '').startsWith('工作流 ')).map((d) => d.src.slice(3).trim())
check('工作流出处全部存在于 workflows.js（' + wfSrcs.length + ' 条）', wfSrcs.filter((id) => !wfIds.has(id)))

const wikiSrcs = docs.filter((d) => (d.src || '').includes('百科 · '))
const kbPath = process.env.WIKI_KB
if (!kbPath) {
  console.log('  SKIP  Wiki 出处核对（设 WIKI_KB=<wiki/site/assets/kb.json> 启用）：涉及 ' + wikiSrcs.length + ' 条')
} else {
  const chunks = JSON.parse(read(path.resolve(kbPath))).chunks || []
  const bad = []
  for (const d of wikiSrcs) {
    const tail = d.src.split('百科 · ')[1] || ''
    const i = tail.indexOf('/')
    const cat = i < 0 ? tail : tail.slice(0, i)
    const page = i < 0 ? '' : tail.slice(i + 1)
    const hit = chunks.some((c) => c.c === cat && (c.p === page || (c.p || '').startsWith(page)))
    if (!hit) bad.push(d.src)
  }
  check('Wiki 百科出处全部命中 kb chunks（' + wikiSrcs.length + ' 条）', bad)
}

console.log('\ncrosscheck-kbnav: ' + (fail ? 'fail=' + fail : '全部命中'))
process.exit(fail ? 1 : 0)
