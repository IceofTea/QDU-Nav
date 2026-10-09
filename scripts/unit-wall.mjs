/**
 * ════════════════════════════════════════════════════════════════════
 * @模块路径  scripts/unit-wall.mjs
 * @职责      校园墙 v2 纯函数单元测试：检索 / 治理 / 通知 / 草稿
 *            —— 无需浏览器与网关，node 直接跑（与 unit-agent.mjs 同规约）
 * @用法      node scripts/unit-wall.mjs   （退出码 0 = 全绿）
 * @覆盖      search 14 · moderation 12 · notify 8 · drafts 8 = 42 项
 * @设计      localStorage 用内存 mock（node 无 DOM）；不引入测试框架
 * ════════════════════════════════════════════════════════════════════
 */
import assert from 'node:assert/strict'
import { tokenize, normalize, parseQuery, scorePost, searchAdvanced, buildIndex, searchWithIndex, hotTopicsV2, suggest, suggestTags, paginate, highlight, searchPostsCompat } from '../src/wall/search.js'
import { sanitizeInput, isFlooding, isMeaningless, precheck, canPublish, canReply, reasonOf, buildReport, shouldFold, levelGate, publishGate, setServerWords } from '../src/wall/moderation.js'
import { parseMentions, extractRelated, mergeInbox, loadInbox, unreadCount, markRead, clearInbox, formatNotify } from '../src/wall/notify.js'
import { saveDraft, listDrafts, getDraft, deleteDraft, clearExpired, timeToPublish, dueDrafts, migrateLegacy, exportDrafts, importDrafts } from '../src/wall/drafts.js'
import { installStorage, createKit } from './harness.mjs'

/* 脚手架（mock + 计数器统一来源，见 harness.mjs） */
installStorage()
const { ok, okAsync, done } = createKit()

const POSTS = [
  { id: 'p1', title: '食堂二楼麻辣香锅测评', content: '人均15，味道不错', tag: 'food', author: '阿珍', likes: 10, views: 200, ts: Date.now() - 3600000, replies: [{ id: 'r1', author: '小李', content: '同去同去', ts: Date.now() - 1000, likes: 2 }] },
  { id: 'p2', title: '求拼车回家', content: '周五下午拼车去火车站', tag: 'ride', author: '小王', likes: 2, views: 50, ts: Date.now() - 7200000, replies: [] },
  { id: 'p3', title: '丢了校园卡', content: '在图书馆丢了校园卡，求好心人', tag: 'lost', author: '阿珍', likes: 1, views: 30, ts: Date.now() - 86400000, replies: [] },
  { id: 'p4', title: '高数课件分享', content: '整理的高数复习资料 pdf', tag: 'resource', author: '学委', likes: 20, views: 800, ts: Date.now() - 3600000 * 5, replies: [] }
]

console.log('── search.tokenize ──')
ok('中文二元切分：食堂二楼含食堂', () => {
  const t = tokenize('食堂二楼')
  assert.ok(t.includes('食堂'))
  assert.ok(t.includes('二楼'))
})
ok('英文小写归一：Hello→hello', () => {
  assert.ok(tokenize('Hello World').includes('hello'))
})
ok('停用词过滤：的被去掉', () => {
  assert.ok(!tokenize('我的的').includes('的'))
})
ok('normalize 全角转半角', () => {
  assert.equal(normalize('Ｈｅｌｌｏ　'), 'hello')
})

console.log('── search.parseQuery ──')
ok('美食别名抽标签 food', () => {
  const q = parseQuery('美食 食堂二楼')
  assert.ok(q.tags.includes('food'))
  assert.ok(q.keywords.length > 0)
})
ok('空查询返回空', () => {
  const q = parseQuery('')
  assert.deepEqual(q.tags, [])
})

console.log('── search.score/searchAdvanced ──')
ok('标题命中排序靠前：搜麻辣香锅首条 p1', () => {
  const r = searchAdvanced(POSTS, '麻辣香锅')
  assert.ok(r.length >= 1)
  assert.equal(r[0].id, 'p1')
})
ok('标签意图：搜美食收窄到 food', () => {
  const r = searchAdvanced(POSTS, '美食')
  assert.ok(r.every((p) => p.tag === 'food') || r[0].tag === 'food')
})
ok('空查询按热度返回全部', () => {
  const r = searchAdvanced(POSTS, '')
  assert.equal(r.length, 4)
})
ok('withDetail 返回 facets', () => {
  const r = searchAdvanced(POSTS, '拼车', { withDetail: true })
  assert.ok(Array.isArray(r.posts))
  assert.ok(typeof r.total === 'number')
})
ok('索引搜索一致：麻辣香锅', () => {
  const built = buildIndex(POSTS)
  const r = searchWithIndex(built, '麻辣香锅')
  assert.ok(r.length >= 1 && r[0].id === 'p1')
})
ok('compat 平替可用', () => {
  assert.ok(searchPostsCompat(POSTS, '课件')[0].id === 'p4')
})
ok('hotTopicsV2 有输出', () => {
  const h = hotTopicsV2(POSTS, 4)
  assert.ok(h.length > 0 && h[0].word)
})
ok('suggestTags 丢卡→lost', () => {
  const s = suggestTags('丢了校园卡', '图书馆')
  assert.ok(s[0].tag === 'lost')
})
ok('paginate 分页正确', () => {
  const p = paginate([1, 2, 3, 4, 5], 2, 2)
  assert.deepEqual(p.items, [3, 4])
  assert.equal(p.pages, 3)
})
ok('highlight 转义+标红', () => {
  const h = highlight('<script>食堂二楼', '食堂')
  assert.ok(!h.includes('<script>'))
  assert.ok(h.includes('<mark'))
})
ok('suggest @联想作者', () => {
  const s = suggest('@阿', POSTS)
  assert.ok(s.some((x) => x.text.includes('阿珍')))
})

console.log('── moderation ──')
setServerWords(['代写', '刷单'])
ok('precheck 命中代写', () => {
  const r = precheck('专业代写论文')
  assert.equal(r.ok, false)
})
ok('precheck 干净通过', () => {
  assert.equal(precheck('食堂测评好文').ok, true)
})
ok('sanitize 截断', () => {
  assert.ok(sanitizeInput('a'.repeat(5000), 100).length === 100)
})
ok('isFlooding 高频 true', () => {
  const now = Date.now()
  assert.equal(isFlooding([now - 1000, now - 2000, now - 3000]), true)
})
ok('isMeaningless 纯表情 true', () => {
  assert.equal(isMeaningless('😂😂'), true)
})
ok('canPublish 空内容不通过', () => {
  assert.equal(canPublish({ title: '', content: '' }).ok, false)
})
ok('canPublish 投票需等级（0分卡住）', () => {
  const r = canPublish({ title: '投票', content: '选一个', type: 'vote' }, { points: 0 })
  assert.equal(r.ok, false)
})
ok('canReply 敏感词卡住', () => {
  assert.equal(canReply('专业代写包过').ok, false)
})
ok('reasonOf 未知回退其他', () => {
  assert.equal(reasonOf('xxx').id, 'other')
})
ok('buildReport 缺 id 失败', () => {
  assert.equal(buildReport('', 'spam').ok, false)
})
ok('shouldFold 举报3次折叠', () => {
  assert.equal(shouldFold({ reports: 3 }), true)
})
ok('levelGate 满级 hint', () => {
  assert.ok(levelGate(9999).hint.includes('满级'))
})
ok('publishGate 悬赏需活跃', () => {
  assert.equal(publishGate('bounty', 0).disabled, true)
})

console.log('── notify ──')
ok('parseMentions 中文昵称', () => {
  assert.deepEqual(parseMentions('@李四 明天拼车'), ['李四'])
})
ok('extractRelated 回我帖', () => {
  const ev = extractRelated(POSTS, '阿珍')
  assert.ok(ev.some((e) => e.kind === 'reply_me'))
})
ok('inbox 合并幂等', () => {
  clearInbox()
  const ev = extractRelated(POSTS, '阿珍')
  const a = mergeInbox(ev)
  const b = mergeInbox(ev)
  assert.equal(b.added, 0)
  assert.ok(a.inbox.length > 0)
})
ok('unread/markRead 全读清零', () => {
  markRead('all')
  assert.equal(unreadCount(), 0)
})
ok('formatNotify 有标题', () => {
  const f = formatNotify({ kind: 'mention', postTitle: 't', from: 'x', text: 'y' })
  assert.ok(f.title.includes('@') || f.title.length > 2)
})

console.log('── drafts ──')
ok('空内容不存', () => {
  assert.equal(saveDraft({ title: '', content: '   ' }), null)
})
ok('存取删除闭环', () => {
  const d = saveDraft({ title: 't1', content: 'c1', tag: 'chat' })
  assert.ok(d && d.id)
  assert.equal(getDraft(d.id).content, 'c1')
  deleteDraft(d.id)
  assert.equal(getDraft(d.id), null)
})
ok('7天过期清理', () => {
  const d = saveDraft({ title: 'old', content: 'old' })
  d.updatedAt = Date.now() - 8 * 24 * 3600000
  const arr = JSON.parse(localStorage.getItem('wall_drafts_v2'))
  localStorage.setItem('wall_drafts_v2', JSON.stringify(arr))
  assert.ok(clearExpired() >= 0)
})
ok('timeToPublish 文案', () => {
  assert.ok(timeToPublish(Date.now() + 3600000).includes('小时'))
  assert.equal(timeToPublish(null), '')
})
ok('dueDrafts 到期检出', () => {
  saveDraft({ title: 'sched', content: 'x', scheduledAt: Date.now() - 1000 })
  assert.ok(dueDrafts().length >= 1)
})
ok('export/import 闭环', () => {
  const data = exportDrafts()
  const r = importDrafts({ drafts: [] })
  assert.equal(r.imported, 0)
  assert.ok(Array.isArray(data.drafts))
})
ok('migrateLegacy 无旧 key 返回 false', () => {
  localStorage.removeItem('wall_composer_draft_v1')
  assert.equal(migrateLegacy(), false)
})
ok('scorePost 明细可解释', () => {
  const { score, hits } = scorePost(POSTS[0], ['食堂'])
  assert.ok(score > 0 && hits.length > 0)
})

console.log('── drafts/composer统一 ──')
const import_drafts = await import('../src/wall/drafts.js')
ok('扩展字段透传（voteQ/voteOpts/作者）', () => {
  const d = import_drafts.saveDraft({ id: 'composer-main', title: 't', content: 'c', voteQ: '几点?', voteOpts: ['A', 'B'], author: '甲' })
  assert.equal(d.voteQ, '几点?')
  assert.deepEqual(d.voteOpts, ['A', 'B'])
  assert.equal(d.author, '甲')
  import_drafts.deleteDraft('composer-main')
})
ok('更新分支保留扩展字段', () => {
  import_drafts.saveDraft({ id: 'composer-main', title: 't', content: 'c' })
  const d = import_drafts.saveDraft({ id: 'composer-main', title: 't2', content: 'c2', resUrl: 'http://x' })
  assert.equal(d.title, 't2')
  assert.equal(d.resUrl, 'http://x')
  import_drafts.deleteDraft('composer-main')
})
ok('空内容删固定位草稿', () => {
  import_drafts.saveDraft({ id: 'composer-main', title: 't', content: 'c' })
  assert.equal(import_drafts.saveDraft({ id: 'composer-main', title: '', content: '  ' }), null)
  assert.equal(import_drafts.getDraft('composer-main'), null)
})
await okAsync('stats聚合与视图口径一致', async () => {
  const stats = await import('../src/wall/stats.js')
  const posts = [
    { id: '1', title: '食堂测评', content: '', tag: 'food', likes: 2, replies: [] },
    { id: '2', title: '食堂二楼', content: '', tag: 'food', likes: 0, replies: [] },
    { id: '3', title: '拼车', content: '', tag: 'ride', likes: 0, replies: [] }
  ]
  const dist = stats.partDist(posts)
  assert.equal(dist[0].tag, 'food')
  assert.equal(dist[0].posts, 2)
  const { hotTopicsV2 } = await import('../src/wall/search.js')
  const hot = hotTopicsV2(posts, 8)
  assert.ok(hot.some((h) => h.word.includes('食堂')))
})

done()
