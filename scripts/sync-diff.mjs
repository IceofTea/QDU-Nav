/**
 * ════════════════════════════════════════════════════════════════════
 * @模块路径  scripts/sync-diff.mjs
 * @职责      校本同步盘点（QDU ↔ FJNU）：对比两仓同路径文件清单，
 *            报告「只在一边有」的文件——专抓结构性漏同步
 * @用法      node scripts/sync-diff.mjs <另一仓根目录>
 *            例：node scripts/sync-diff.mjs ../FJNU-Nav-agent
 * @忽略      node_modules / dist / site / .git / public/data / server/data /
 *            package-lock.json（快照与依赖噪音）
 * @说明      同路径不同内容是校本常态（校名/配色/接口各校不同），不逐文件报；
 *            本脚本盯的是「一边新增/删除了文件而另一边没跟上」
 * ════════════════════════════════════════════════════════════════════
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

if (!process.argv[2]) {
  console.log('用法: node scripts/sync-diff.mjs <另一仓根目录>')
  process.exit(2)
}
const OTHER = path.resolve(process.argv[2])
const SELF = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
if (!fs.existsSync(OTHER)) { console.log('目录不存在: ' + OTHER); process.exit(2) }

const IGNORE_DIRS = new Set(['node_modules', 'dist', 'site', '.git'])
const IGNORE_FILES = new Set(['package-lock.json'])
const IGNORE_PREFIX = ['public/data/', 'server/data/']

function walk(root) {
  const out = new Set()
  const skip = (rel) =>
    IGNORE_FILES.has(rel) ||
    IGNORE_PREFIX.some((p) => rel.startsWith(p)) ||
    rel.split('/').some((seg) => IGNORE_DIRS.has(seg))
  const rec = (dir, rel) => {
    for (const name of fs.readdirSync(dir)) {
      const r = rel ? rel + '/' + name : name
      if (skip(r)) continue
      const full = path.join(dir, name)
      const st = fs.statSync(full)
      if (st.isDirectory()) rec(full, r)
      else out.add(r)
    }
  }
  rec(root, '')
  return out
}

const a = walk(OTHER) // 另一仓
const b = walk(SELF)  // 本仓
const onlyOther = [...a].filter((f) => !b.has(f)).sort()
const onlySelf = [...b].filter((f) => !a.has(f)).sort()
const both = [...b].filter((f) => a.has(f))

console.log('对比: A=' + OTHER + '\n      B=' + SELF + '（本仓）')
console.log(`共通路径 ${both.length} · 仅A有 ${onlyOther.length} · 仅B有 ${onlySelf.length}`)
if (onlyOther.length) {
  console.log('\n── 仅 A 有（本仓可能漏同步）──')
  for (const f of onlyOther) console.log('  + ' + f)
}
if (onlySelf.length) {
  console.log('\n── 仅 B 有（对方可能漏同步）──')
  for (const f of onlySelf) console.log('  + ' + f)
}
if (!onlyOther.length && !onlySelf.length) console.log('文件清单完全一致 ✓')
