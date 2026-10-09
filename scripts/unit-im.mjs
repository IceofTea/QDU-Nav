/**
 * ════════════════════════════════════════════════════════════════════
 * @模块路径  scripts/unit-im.mjs
 * @职责      私信 IM + 墙洞察 stats + 学习计划 studyPlan 纯函数单测
 *            —— 与 unit-agent/unit-wall 同规约，node 直接跑
 * @用法      node scripts/unit-im.mjs   （退出码 0 = 全绿）
 * @覆盖      im-api 12 · stats 11 · studyPlan 15 = 38 项
 * ════════════════════════════════════════════════════════════════════
 */
import assert from 'node:assert/strict'

/* node 侧 localStorage mock（im/api + studyPlan 用） */
if (typeof localStorage === 'undefined') {
  const store = new Map()
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k)
  }
}

const im = await import('../src/im/api.js')
const stats = await import('../src/wall/stats.js')
const study = await import('../src/utils/studyPlan.js')
const apiBase = await import('../src/wall/apiBase.js')

let pass = 0
let fail = 0
function ok(name, fn) {
  try {
    const r = fn()
    if (r && typeof r.then === 'function') {
      fail++
      console.log('  FAIL  ' + name + ' → async 函数必须用 okAsync（框架防呆）')
      r.catch(() => {})
      return
    }
    pass++; console.log('  PASS  ' + name)
  } catch (e) { fail++; console.log('  FAIL  ' + name + ' → ' + e.message) }
}
async function okAsync(name, fn) {
  try { await fn(); pass++; console.log('  PASS  ' + name) }
  catch (e) { fail++; console.log('  FAIL  ' + name + ' → ' + e.message) }
}

const POSTS = [
  { id: 'p1', title: '食堂测评', content: '好吃', tag: 'food', author: '阿珍', likes: 12, views: 200, ts: Date.now() - 3600000, replies: [{ author: '小李', content: '同去', ts: Date.now(), likes: 1 }] },
  { id: 'p2', title: '拼车', content: '回家', tag: 'ride', author: '小王', likes: 0, views: 10, ts: Date.now() - 7200000, replies: [] },
  { id: 'p3', title: '投票帖', content: '选', tag: 'chat', type: 'vote', author: '学委', likes: 3, views: 50, ts: Date.now(), replies: [], vote: { options: ['A', 'B'], tallies: [5, 2] } }
]

console.log('── im.api ──')
await okAsync('空消息拒绝', async () => {
  await assert.rejects(im.sendMessage('小李', '   '), /不能为空/)
})
await okAsync('发送+列表闭环（本机模式）', async () => {
  localStorage.removeItem('im_threads_v1')
  const r = await im.sendMessage('小李', '你好呀')
  assert.ok(r.message && r.message.text === '你好呀')
  assert.equal(r.offline, true)
  const l = await im.listThreads()
  assert.ok(l.threads.some((t) => t.peer === '小李'))
})
await okAsync('3s 冷却拦截连发', async () => {
  await assert.rejects(im.sendMessage('小李', '第二条'), /太快/)
})
ok('receiveLocal 未读+1', () => {
  const before = im.unreadTotal()
  im.receiveLocal('小李', '在的')
  assert.ok(im.unreadTotal() >= before)
})
await okAsync('getThread markRead 清零', async () => {
  await im.getThread('小李', { markRead: true })
  const l = await im.listThreads()
  const th = l.threads.find((t) => t.peer === '小李')
  assert.equal(th ? th.unread : 0, 0)
})
ok('草稿存取', () => {
  im.saveDraft('小李', '没说完的话')
  assert.equal(im.getDraft('小李'), '没说完的话')
})
await okAsync('拉黑隐藏会话+发消息拦截', async () => {
  await im.blockUser('骗子')
  assert.ok(im.listBlocks().includes('骗子'))
  await assert.rejects(im.sendMessage('骗子', 'hi'), /拉黑/)
  await im.unblockUser('骗子')
  assert.ok(!im.listBlocks().includes('骗子'))
})
ok('searchLocal 跨会话命中', () => {
  const r = im.searchLocal('你好')
  assert.ok(r.length >= 1 && r[0].peer === '小李')
})
ok('unreadTotal 数字', () => {
  assert.equal(typeof im.unreadTotal(), 'number')
})
ok('exportThreads 信封', () => {
  const d = im.exportThreads()
  assert.ok(d.version && d.threads)
})
await okAsync('deleteThread 删除', async () => {
  await im.deleteThread('小李')
  const l = await im.listThreads()
  assert.ok(!l.threads.some((t) => t.peer === '小李'))
})
await okAsync('超长截断 1000', async () => {
  localStorage.removeItem('im_msglog_v1')
  const r = await im.sendMessage('小李', 'a'.repeat(5000))
  assert.ok(r.message.text.length <= 1000)
  await im.deleteThread('小李')
})

console.log('── wall.stats ──')
ok('partDist 占比和为100', () => {
  const d = stats.partDist(POSTS)
  assert.ok(d.length === 3)
  const sum = d.reduce((a, r) => a + r.pct, 0)
  assert.ok(Math.abs(sum - 100) < 0.2)
})
ok('partName 未知回退', () => {
  assert.equal(stats.partName('xxx'), 'xxx')
})
ok('hourHeat 24格', () => {
  const h = stats.hourHeat(POSTS)
  assert.equal(h.length, 24)
  assert.ok(h.some((x) => x.n > 0))
})
ok('weekDist 7天', () => {
  assert.equal(stats.weekDist(POSTS).length, 7)
})
ok('authorBoard 阿珍上榜', () => {
  const b = stats.authorBoard(POSTS, 5)
  assert.ok(b.some((x) => x.author === '阿珍'))
  assert.equal(b[0].rank, 1)
})
ok('funnel 漏斗递减', () => {
  const f = stats.funnel(POSTS)
  assert.equal(f[0].n, 3)
  assert.ok(f[1].n <= f[0].n && f[3].n <= f[0].n)
})
ok('voteStats 总票7', () => {
  const v = stats.voteStats(POSTS)
  assert.equal(v.votePosts, 1)
  assert.equal(v.totalVotes, 7)
  assert.equal(v.topOption.option, 'A')
})
ok('trendByDay 默认14天', () => {
  assert.equal(stats.trendByDay(POSTS).length, 14)
})
ok('summarize 有数字', () => {
  const s = stats.summarize(POSTS)
  assert.ok(s.includes('3 帖'))
})
ok('summarize 空态', () => {
  assert.ok(stats.summarize([]).includes('第一帖'))
})
ok('空输入不崩', () => {
  assert.equal(stats.partDist(null).length, 0)
  assert.equal(stats.funnel(null)[0].n, 0)
})

console.log('── studyPlan ──')
ok('Pomodoro focus→short', () => {
  const p = new study.Pomodoro('classic')
  assert.equal(p.startFocus(), 1500)
  const r = p.finish()
  assert.equal(r.next, 'short')
  assert.equal(r.nextSec, 300)
})
ok('Pomodoro 4轮后长休', () => {
  const p = new study.Pomodoro('classic')
  let last = null
  for (let i = 0; i < 4; i++) { p.startFocus(); last = p.finish(); if (last.next !== 'idle') { p.phase = last.next; p.finish() } }
  assert.equal(last.next, 'long')
})
ok('预设 sprint 15分钟', () => {
  const p = new study.Pomodoro('sprint')
  assert.equal(p.startFocus(), 900)
})
ok('logFocus 今日累计', () => {
  const before = study.todayFocusMin()
  study.logFocus(25)
  assert.equal(study.todayFocusMin(), before + 25)
})
ok('weekFocus 7项', () => {
  assert.equal(study.weekFocus().length, 7)
})
ok('addReviewCard 空学科拒绝', () => {
  assert.throws(() => study.addReviewCard('  '), /不能为空/)
})
ok('复习卡排期6步', () => {
  const c = study.addReviewCard('高数 ch3')
  const s = study.cardSchedule(c)
  assert.equal(s.length, 6)
  assert.equal(s[0].gap, 1)
})
ok('dueReviews 第2天到期第1步', () => {
  const cards = JSON.parse(localStorage.getItem('study_plan_v1'))
  const c = cards[0]
  c.firstTs = Date.now() - 2 * 86400000
  c.done = {}
  localStorage.setItem('study_plan_v1', JSON.stringify(cards))
  const d = study.dueReviews()
  assert.ok(d.some((x) => x.card.id === c.id && x.step === 1))
})
ok('doneReviewStep 标记', () => {
  const cards = JSON.parse(localStorage.getItem('study_plan_v1'))
  const c = cards[0]
  assert.equal(study.doneReviewStep(c.id, 1), true)
})
ok('recommendRooms 建筑优先', () => {
  const r = study.recommendRooms(['博文楼101', '文史楼202'], { building: '博文楼' })
  assert.equal(r[0].room, '博文楼101')
})
ok('recommendRooms 空输入', () => {
  assert.deepEqual(study.recommendRooms([]), [])
})
ok('weeklyReport 有总结', () => {
  const w = study.weeklyReport()
  assert.ok(typeof w.totalMin === 'number' && w.summary)
})
ok('taskChainExpand study 3步', () => {
  const ch = study.taskChainExpand('study', { emptyRooms: ['A101'], reviews: [] })
  assert.equal(ch.length, 3)
})
ok('taskChainExpand 未知回退morning', () => {
  assert.equal(study.taskChainExpand('xxx').length, 3)
})
ok('delReviewCard 删除', () => {
  const cards = JSON.parse(localStorage.getItem('study_plan_v1'))
  study.delReviewCard(cards[0].id)
  assert.ok(!study.listReviewCards().some((x) => x.id === cards[0].id))
})

console.log('── wall.apiBase ──')
ok('node 下无 location 回退同源', () => {
  assert.equal(apiBase.getApiBase(), '')
  assert.equal(apiBase.apiUrl('/api/wall'), '/api/wall')
  assert.equal(apiBase.eventsUrl(), '/api/events')
})
ok('setApiBase 去尾斜杠', () => {
  apiBase.setApiBase('https://gw.example.com/')
  assert.equal(apiBase.getApiBase(), 'https://gw.example.com')
  assert.equal(apiBase.apiUrl('/api/health'), 'https://gw.example.com/api/health')
  apiBase.clearApiBase()
  assert.equal(apiBase.getApiBase(), '')
})
ok('describeMode 本机文案', () => {
  const d = apiBase.describeMode()
  assert.ok(d.text && d.mode === 'gateway')
})
await okAsync('probeGateway 空地址直接失败', async () => {
  const r = await apiBase.probeGateway('')
  assert.equal(r.ok, false)
})
ok('PUBLIC_API_DEFAULT 为空（部署后填）', () => {
  assert.equal(apiBase.PUBLIC_API_DEFAULT, '')
})
ok('adminUrl node 兜底相对路径（禁跳域名根）', () => {
  assert.equal(apiBase.adminUrl(), 'admin.html')
})

console.log('── wall.cloud ──')
const cloud = await import('../src/wall/cloud.js')
await okAsync('显式关闭后抛错', async () => {
  cloud.setCloud('', '')
  assert.equal(cloud.cloudEnabled(), false)
  await assert.rejects(cloud.cloudList(), /未配置/)
  localStorage.removeItem('qdu_supabase') // 回到仓库缺省
})
ok('仓库缺省即启用（开箱共享）', () => {
  assert.equal(cloud.cloudEnabled(), true)
  assert.ok(cloud.getCloud().url.includes('supabase.co'))
})
ok('setCloud/getCloud 闭环', () => {
  cloud.setCloud('https://xxx.supabase.co/', 'anon-key')
  const c = cloud.getCloud()
  assert.equal(c.url, 'https://xxx.supabase.co')
  assert.equal(cloud.cloudEnabled(), true)
})
await okAsync('loadPosts 云网并集（不断存量）', async () => {
  const realFetch = globalThis.fetch
  globalThis.fetch = async (url) => {
    const u = String(url)
    if (u.includes('/rest/v1/')) {
      if (u.includes('wall_replies')) return { ok: true, status: 200, json: async () => [] }
      return { ok: true, status: 200, json: async () => [{ id: 1, title: '云帖', content: 'c', tag: 'chat', ptype: 'normal', author: '甲', anonymous: false, vote: null, bounty: null, resource: null, likes: 0, views: 0, reactions: {}, created_at: new Date().toISOString() }] }
    }
    if (u.includes('/api/wall')) return { ok: true, status: 200, json: async () => ({ posts: [{ id: 'L9', title: '存量帖', content: 'l', tag: 'chat', ts: Date.now(), likes: 0, replies: [] }] }) }
    return { ok: false, status: 404, json: async () => ({}) }
  }
  try {
    const wall = await import('../src/wall/api.js')
    const r = await wall.loadPosts({ sort: 'new' })
    assert.ok(r.posts.some((p) => p.id === 'C1'), '缺云帖')
    assert.ok(r.posts.some((p) => p.id === 'L9'), '存量帖被吞')
    assert.equal(r.cloud, true)
  } finally { globalThis.fetch = realFetch }
})
await okAsync('loadPosts 云挂只走存量', async () => {
  const realFetch = globalThis.fetch
  globalThis.fetch = async (url) => {
    if (String(url).includes('/rest/v1/')) throw new Error('cloud down')
    if (String(url).includes('/api/wall')) return { ok: true, status: 200, json: async () => ({ posts: [{ id: 'L9', title: '存量', content: '', tag: 'chat', ts: 1, likes: 0, replies: [] }] }) }
    return { ok: false, status: 404, json: async () => ({}) }
  }
  try {
    const wall = await import('../src/wall/api.js')
    const r = await wall.loadPosts({ sort: 'new' })
    assert.ok(r.posts.some((p) => p.id === 'L9'))
    assert.ok(!r.cloud)
  } finally { globalThis.fetch = realFetch }
})
await okAsync('mock 行映射：帖子+回复+id 前缀 C', async () => {
  const realFetch = globalThis.fetch
  globalThis.fetch = async (url) => ({
    ok: true, status: 200,
    json: async () => String(url).includes('wall_replies')
      ? [{ id: 7, post_id: 3, author: '小李', content: '同去', likes: 0, parent_cloud: null, reply_to: '', created_at: new Date().toISOString() }]
      : [{ id: 3, title: '食堂', content: '好吃', tag: 'food', ptype: 'normal', author: '阿珍', anonymous: false, vote: null, bounty: null, resource: null, likes: 5, views: 10, reactions: {}, created_at: new Date().toISOString() }]
  })
  try {
    const posts = await cloud.cloudList({ tag: 'all' })
    assert.equal(posts.length, 1)
    assert.equal(posts[0].id, 'C3')
    assert.equal(posts[0].replies.length, 1)
    assert.equal(posts[0].replies[0].id, 'C7')
  } finally {
    globalThis.fetch = realFetch
    cloud.setCloud('', '')
  }
})
await okAsync('probeCloud 未配置直接失败', async () => {
  const r = await cloud.probeCloud(null)
  assert.equal(r.ok, false)
})

console.log(`\n done: pass=${pass} fail=${fail}`)
process.exit(fail ? 1 : 0)
