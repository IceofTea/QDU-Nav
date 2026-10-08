/**
 * ════════════════════════════════════════════════════════════════════
 * @模块路径  scripts/smoke-community.mjs
 * @职责      社区网关冒烟测试：一条命令回归评论/墙/投票/敏感词/反馈/
 *            云脑未配置降级/管理鉴权 全链路（CI 或改完必跑）
 * @运行前提  node server/index.mjs 已启动（默认 :8787）
 * @用法      node scripts/smoke-community.mjs [baseUrl]
 * @输出      PASS/FAIL 清单 + 退出码（0=全绿）
 * @为什么    社区是跨用户基础设施：接口一旦回归，Wiki 评论与校园墙同时
 *            受损——用本脚本 10 秒内定位问题，替代手工点一遍
 * ════════════════════════════════════════════════════════════════════
 */
const BASE = process.argv[2] || 'http://localhost:8787'
const ADMIN = process.env.ADMIN_TOKEN || 'qdu-agent-2026'
let pass = 0
let fail = 0

function ok(name, cond, extra = '') {
  if (cond) { pass++; console.log(`  PASS  ${name}${extra ? ' → ' + extra : ''}`) }
  else { fail++; console.log(`  FAIL  ${name}${extra ? ' → ' + extra : ''}`) }
}

async function j(path, opts = {}) {
  const r = await fetch(BASE + path, {
    method: opts.method || 'GET',
    headers: Object.assign({ 'Content-Type': 'application/json' }, opts.headers || {}),
    body: opts.body ? JSON.stringify(opts.body) : undefined
  })
  let d = {}
  try { d = await r.json() } catch { /* noop */ }
  return { status: r.status, d }
}

const TAG = '[smoke ' + Date.now().toString(36) + ']'

async function main() {
  console.log(`社区网关冒烟 → ${BASE}\n`)

  // 1 健康
  const h = await j('/api/health')
  ok('健康检查 /api/health', h.status === 200 && h.d.ok)

  // 2 正常评论
  const c1 = await j('/api/comments', { method: 'POST', body: { path: '/smoke/', author: '冒烟机器人', content: TAG + ' 正常评论链路' } })
  ok('发表评论', c1.status === 200 && c1.d.ok, 'id=' + (c1.d.comment?.id || '?'))
  const cid = c1.d.comment?.id

  // 3 敏感词拦截
  const c2 = await j('/api/comments', { method: 'POST', body: { path: '/smoke/', content: TAG + ' 加微信 领取资料' } })
  ok('敏感词拦截(400)', c2.status === 400 && !c2.d.ok, c2.d.error || '')

  // 4 评论列表（含新评论 + 楼中楼字段可用）
  const list = await j('/api/comments?path=/smoke/')
  ok('评论列表含新评论', list.status === 200 && (list.d.comments || []).some((x) => x.id === cid))

  // 5 楼中楼回复
  const c3 = await j('/api/comments', { method: 'POST', body: { path: '/smoke/', content: TAG + ' 楼中楼回复', parent: cid, replyTo: '冒烟机器人' } })
  ok('楼中楼回复', c3.status === 200 && c3.d.comment?.parent === cid)

  // 6 表情
  const r1 = await j('/api/react', { method: 'POST', body: { type: 'comments', id: cid, emoji: '👍' } })
  ok('表情表态', r1.status === 200 && r1.d.ok)

  // 7 举报
  const rp = await j('/api/comments/report', { method: 'POST', body: { id: cid, reason: 'smoke-test' } })
  ok('举报', rp.status === 200 && rp.d.ok)

  // 8 投票帖
  const v1 = await j('/api/wall', { method: 'POST', body: { title: TAG + ' 投票', content: '（冒烟投票帖）', tag: '投票', anonymous: true, vote: { question: '冒烟测试选哪个？', options: ['A', 'B'] } } })
  ok('发投票帖', v1.status === 200 && v1.d.ok)
  const vid = v1.d.post?.id
  if (vid) {
    const v2 = await j('/api/wall/vote', { method: 'POST', body: { id: vid, index: 0 } })
    ok('投票计数', v2.status === 200 && Array.isArray(v2.d.tallies))
    const v3 = await j('/api/wall/vote', { method: 'POST', body: { id: vid, index: 1 } })
    ok('重复投票拦截(409)', v3.status === 409)
  }

  // 9 反馈
  const f1 = await j('/api/feedback', { method: 'POST', body: { text: TAG + ' 冒烟反馈', kind: 'smoke' } })
  ok('提交反馈', f1.status === 200 && f1.d.ok)

  // 10 云脑未配置降级（501）
  const ch = await j('/api/chat', { method: 'POST', body: { messages: [{ role: 'user', content: 'hi' }] } })
  ok('云脑未配置→501或已配置200', ch.status === 501 || ch.status === 200, 'status=' + ch.status)

  // 11 管理鉴权
  const a1 = await j('/api/admin/overview')
  ok('管理API无鉴权→401', a1.status === 401)
  const a2 = await j('/api/admin/login', { method: 'POST', body: { token: ADMIN } })
  ok('管理登录', a2.status === 200 && a2.d.ok)
  const a3 = await j('/api/admin/overview', { headers: { 'x-admin-token': ADMIN } })
  ok('管理概览', a3.status === 200 && a3.d.comments !== undefined)

  // 12 审计与反馈列表
  const a4 = await j('/api/admin/items?type=feedback', { headers: { 'x-admin-token': ADMIN } })
  ok('反馈队列', a4.status === 200 && Array.isArray(a4.d.items))
  const a5 = await j('/api/admin/audit', { headers: { 'x-admin-token': ADMIN } })
  ok('审计日志', a5.status === 200 && Array.isArray(a5.d.audit))

  // 13 清理：删除冒烟产生的评论（含楼中楼级联）与投票帖
  if (cid) await j('/api/admin/moderate', { method: 'POST', headers: { 'x-admin-token': ADMIN }, body: { type: 'comments', id: cid, action: 'delete' } })
  if (vid) await j('/api/admin/moderate', { method: 'POST', headers: { 'x-admin-token': ADMIN }, body: { type: 'posts', id: vid, action: 'delete' } })
  await j('/api/admin/moderate', { method: 'POST', headers: { 'x-admin-token': ADMIN }, body: { type: 'feedback', id: f1.d.id, action: 'delete' } })
  const list2 = await j('/api/comments?path=/smoke/')
  ok('冒烟数据已清理', !(list2.d.comments || []).some((x) => (x.content || '').includes(TAG)))

  console.log(`\n结果：${pass} PASS / ${fail} FAIL`)
  process.exit(fail ? 1 : 0)
}

main().catch((e) => { console.error('冒烟脚本异常:', e.message); process.exit(2) })
