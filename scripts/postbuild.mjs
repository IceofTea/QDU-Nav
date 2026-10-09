/**
 * ════════════════════════════════════════════════════════════════════
 * @模块路径  scripts/postbuild.mjs
 * @职责      构建后收尾（npm run build 自动链式调用）：index.html → 404.html
 *            （GitHub Pages 深链兜底）+ 校验管理页垫片进包
 * @用法      npm run build（已链入 package.json，无需手调）
 * ════════════════════════════════════════════════════════════════════
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const DIST = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist')
let fail = 0
// 404 兜底（SPA 深链直达不挂 Pages 404）
fs.copyFileSync(path.join(DIST, 'index.html'), path.join(DIST, '404.html'))
console.log('  postbuild: 404.html ✓')
// 管理页垫片必须进包（缺了线上 /admin 必 404）
for (const f of ['admin.html', 'admin/index.html', 'console/index.html']) {
  const ok = fs.existsSync(path.join(DIST, f))
  console.log('  postbuild: dist/' + f + (ok ? ' ✓' : ' ✗ 缺失！'))
  if (!ok) fail++
}
process.exit(fail ? 1 : 0)
