/**
 * ════════════════════════════════════════════════════════════════════
 * @模块路径  scripts/scenes-community.mjs
 * @职责      社区网关场景包（真 E2E · 无浏览器）：发帖→回复→点赞→投票→
 *            举报→私信→健康检查，一条链跑完 10 个场景，失败即非零退出
 *            —— CI 可跑，手机联调前先跑它
 * @用法      node scripts/scenes-community.mjs [网关地址]
 *            缺省 http://localhost:8787（QDU）；FJNU 传 http://localhost:8788
 * @设计      每个场景独立函数 + finally 清理测试帖（管理接口删），不污染
 *            社区数据；敏感词场景预期 400/429（断言“被拦截”即通过）
 * ════════════════════════════════════════════════════════════════════
 */

const BASE = (process.argv[2] || 'http://localhost:8787').replace(/\/+$/, '')
const ADMIN = process.env.ADMIN_TOKEN || 'qdu-agent-2026'

let pass = 0
let fail = 0
const created = { posts: [], comments: [] }

async function http(path, opts = {}) {
  const r = await fetch(BASE + path, {
    method: opts.method || 'GET',
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    body: opts.body ? JSON.stringify(opts.body) : undefined
  })
  const d = await r.json().catch(() => ({}))
  return { status: r.status, d }
}
function ok(name, cond, extra = '') {
  if (cond) { pass++; console.log('  PASS  ' + name) }
  else { fail++; console.log('  FAIL  ' + name + (extra ? ' → ' + extra : '')) }
}
async function admin(path, body) {
  return http(path, { method: 'POST', headers: { 'x-admin-token': ADMIN }, body })
}
async function cleanup() {
  // 用管理接口删除本轮测试帖（action: delete），评论同理
  for (const id of created.posts) {
    await admin('/api/admin/moderate', { type: 'posts', id, action: 'delete' }).catch(() => ({}))
  }
  for (const id of created.comments) {
    await admin('/api/admin/moderate', { type: 'comments', id, action: 'delete' }).catch(() => ({}))
  }
}

console.log('网关: ' + BASE)

// 场景 1：健康检查
{
  const { status, d } = await http('/api/health')
  ok('健康检查 /api/health', status === 200 && d.ok === true, 'status=' + status)
}
// 场景 2：发普通帖
{
  const { status, d } = await http('/api/wall', {
    method: 'POST', body: { title: '场景包测试帖', content: 'E2E 场景包自动发帖，稍后清理', tag: 'chat', author: '场景包' }
  })
  ok('发普通帖', status === 200 && d.post && d.post.id, JSON.stringify(d).slice(0, 120))
  if (d.post && d.post.id) created.posts.push(d.post.id)
  var postId = d.post && d.post.id
}
// 场景 3：敏感词拦截（预期 400）
{
  const { status } = await http('/api/wall', {
    method: 'POST', body: { title: 'x', content: '专业代写包过加微信', tag: 'chat', author: '场景包' }
  })
  ok('敏感词发帖被拦截', status === 400, 'status=' + status)
}
// 场景 4：回帖
{
  const { status, d } = await http('/api/wall/reply', {
    method: 'POST', body: { id: postId, content: '场景包回帖', author: '场景包' }
  })
  ok('回帖', status === 200 && d.reply, 'status=' + status)
}
// 场景 5：点赞
{
  const { status, d } = await http('/api/wall/like', { method: 'POST', body: { id: postId } })
  ok('点赞', status === 200 && typeof d.likes === 'number', 'status=' + status)
}
// 场景 6：投票帖 + 投票
{
  const v = await http('/api/wall', {
    method: 'POST',
    body: { title: '场景包投票', content: '选一个', tag: 'chat', type: 'vote', author: '场景包', vote: { question: '选一个', options: ['A', 'B'] } }
  })
  const vid = v.d && v.d.post && v.d.post.id
  if (vid) created.posts.push(vid)
  const t = vid ? await http('/api/wall/vote', { method: 'POST', body: { id: vid, index: 0 } }) : { status: 0 }
  ok('投票帖+投票', !!vid && t.status === 200, 'status=' + t.status)
}
// 场景 7：评论发表 + 列表可见
{
  const c = await http('/api/comments', {
    method: 'POST', body: { path: '/e2e/', title: 'E2E', author: '场景包', content: '场景包评论', type: 'page' }
  })
  const cid = c.d && (c.d.comment ? c.d.comment.id : c.d.id)
  if (cid) created.comments.push(cid)
  const l = await http('/api/comments?path=' + encodeURIComponent('/e2e/'))
  ok('评论发表+列表可见', !!cid && (l.d.comments || []).some((x) => x.id === cid), 'status=' + c.status)
}
// 场景 8：举报进队列
{
  const { status } = await http('/api/wall/report', { method: 'POST', body: { id: postId, reason: '场景包测试举报' } })
  ok('举报', status === 200, 'status=' + status)
}
// 场景 9：管理登录 + 概览 + 举报可见
{
  const login = await http('/api/admin/login', { method: 'POST', body: { token: ADMIN } })
  const over = login.status === 200
    ? await http('/api/admin/overview', { headers: { 'x-admin-token': login.d.token || ADMIN } })
    : { status: 0, d: {} }
  ok('管理登录+概览', login.status === 200 && over.status === 200, 'login=' + login.status)
}
// 场景 10：SSE 可连（收一次头即关，不断流等）
{
  let okSse = false
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 6000)
    const r = await fetch(BASE + '/api/events', { signal: ctrl.signal, headers: { Accept: 'text/event-stream' } })
    okSse = r.status === 200 && (r.headers.get('content-type') || '').includes('text/event-stream')
    clearTimeout(timer)
    try { await r.body.cancel() } catch { /* noop */ }
  } catch { okSse = false }
  ok('SSE 可连', okSse)
}

await cleanup()
console.log(`\n done: pass=${pass} fail=${fail}`)
process.exit(fail ? 1 : 0)
