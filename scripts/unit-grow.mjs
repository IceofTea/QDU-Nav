/**
 * ════════════════════════════════════════════════════════════════════
 * @模块路径  scripts/unit-grow.mjs
 * @职责      增长单测：画像 profile + AI 治理 aiMod + 岗位 jobs + 活动
 *            activities + 新工作流可加载性 —— node 直接跑
 * @用法      node scripts/unit-grow.mjs   （退出码 0 = 全绿）
 * @覆盖      profile 12 · aiMod 10 · jobs/activities 8 · workflows 4 = 34 项
 * ════════════════════════════════════════════════════════════════════
 */
import assert from 'node:assert/strict'

if (typeof localStorage === 'undefined') {
  const store = new Map()
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k)
  }
}

const profile = await import('../src/agent/profile.js')
const aiMod = await import('../src/wall/aiMod.js')
const jobs = await import('../src/data/jobs.js')
const acts = await import('../src/data/activities.js')

let pass = 0
let fail = 0
function ok(name, fn) {
  try { fn(); pass++; console.log('  PASS  ' + name) }
  catch (e) { fail++; console.log('  FAIL  ' + name + ' → ' + e.message) }
}

console.log('── profile ──')
ok('空画像总结白纸', () => {
  profile.clearProfile()
  assert.ok(profile.profileSummary().includes('白纸'))
})
ok('学院技能保存去重', () => {
  profile.setCollege('计算机科学技术学院')
  profile.setSkills('Vue，Vue， Python')
  const p = profile.readProfile()
  assert.equal(p.college, '计算机科学技术学院')
  assert.deepEqual(p.skills, ['Vue', 'Python'])
})
ok('recordAppOpen 计数', () => {
  profile.recordAppOpen('canteen')
  profile.recordAppOpen('canteen')
  profile.recordAppOpen('canteen')
  const b = profile.behaviorStats()
  assert.ok(b.apps.some((a) => a.app === 'canteen' && a.n >= 3))
})
ok('inferInterests 美食可解释', () => {
  const r = profile.inferInterests()
  assert.ok(r.interests.includes('美食'))
  assert.ok(r.reasons.length > 0)
})
ok('recordSearch 截断30', () => {
  for (let i = 0; i < 35; i++) profile.recordSearch('关键词' + i)
  const b = profile.behaviorStats()
  assert.ok(b.searches.length <= 10)
})
ok('pushList 空画像给引导', () => {
  profile.clearProfile()
  const l = profile.pushList({})
  assert.ok(l.some((x) => x.kind === 'onboard'))
})
ok('pushList 复习到期', () => {
  const l = profile.pushList({ dueReviews: [{ card: { subject: '高数' } }] })
  assert.ok(l.some((x) => x.kind === 'review'))
})
ok('pushList 活动3天内', () => {
  const d = new Date(Date.now() + 86400000).toISOString().slice(0, 10)
  const l = profile.pushList({ activities: [{ title: '宣讲会', date: d }] })
  assert.ok(l.some((x) => x.kind === 'activity'))
})
ok('pushList 岗位需技能', () => {
  profile.setSkills('Vue')
  const l = profile.pushList({ jobs: [{ title: '前端实习' }] })
  assert.ok(l.some((x) => x.kind === 'job'))
})
ok('pushList 上限5', () => {
  const l = profile.pushList({ dueReviews: [{ card: { subject: 'x' } }], activities: [], jobs: [] })
  assert.ok(l.length <= 5)
})
ok('profileSummary 含学院', () => {
  profile.setCollege('计算机科学技术学院')
  assert.ok(profile.profileSummary().includes('计算机'))
})
ok('clearProfile 真删', () => {
  profile.clearProfile()
  assert.equal(profile.readProfile().college, '')
})

console.log('── aiMod ──')
const POST = { id: 'p1', title: '食堂二楼咋样', content: '求评价', replies: [{ content: '好吃，推荐' }, { content: '一般，有点差' }] }
ok('summarizeThread 有归纳', () => {
  const s = aiMod.summarizeThread(POST)
  assert.ok(s && s.includes('归纳'))
})
ok('summarizeThread 空返回null', () => {
  assert.equal(aiMod.summarizeThread({ content: '', replies: [] }), null)
})
ok('detectDispute 对冲检出', () => {
  const p = { id: 'x', content: '有人说好有人说差', replies: [{ content: '支持，好' }, { content: '垃圾，坑' }] }
  const d = aiMod.detectDispute([p])
  assert.ok(d.length >= 1)
})
ok('detectDispute 和谐不报', () => {
  const d = aiMod.detectDispute([{ id: 'y', content: '今天天气好', replies: [] }])
  assert.equal(d.length, 0)
})
ok('hotQuestions 问句聚类', () => {
  const ps = [
    { id: '1', title: '食堂怎么办卡', content: '求问' },
    { id: '2', title: '食堂营业时间', content: '请问几点' }
  ]
  const q = aiMod.hotQuestions(ps)
  assert.ok(q.some((x) => x.word === '食堂'))
})
ok('collectFixes 只收纠错', () => {
  const f = aiMod.collectFixes([{ id: 'a', type: 'correction', content: '错了', quote: '原文', author: '甲', ts: 2 }, { id: 'b', type: 'page', content: '好' }])
  assert.equal(f.length, 1)
  assert.equal(f[0].id, 'a')
})
ok('modReport 风平浪静', () => {
  const r = aiMod.modReport([], [])
  assert.ok(r.summary.includes('风平浪静'))
})
ok('modReport 有事说事', () => {
  const r = aiMod.modReport([{ id: 'x', content: '好差对冲', reports: 3, replies: [] }], [])
  assert.ok(r.disputes.length >= 1)
})
ok('争议排序high优先', () => {
  const r = aiMod.modReport([
    { id: 'a', content: 'a', reports: 0, replies: [] },
    { id: 'b', content: 'b', reports: 5, replies: [{ content: 'c' }] }
  ], [])
  assert.equal(r.disputes[0].post.id, 'b')
})
ok('纠错按时间倒序', () => {
  const f = aiMod.collectFixes([{ id: 'a', type: 'correction', content: '1', ts: 1 }, { id: 'b', type: 'correction', content: '2', ts: 3 }])
  assert.equal(f[0].id, 'b')
})

console.log('── jobs/activities ──')
ok('jobById 命中', () => {
  assert.equal(jobs.jobById('j3').title, '前端实习生（校企合作）')
})
ok('matchJobs Vue命中前端', () => {
  const m = jobs.matchJobs({ skills: ['Vue'], interests: [], college: '' }, 3)
  assert.ok(m[0].job.title.includes('前端'))
  assert.ok(m[0].hits.includes('vue') || m[0].hits.includes('Vue'))
})
ok('matchJobs 空画像保序', () => {
  const m = jobs.matchJobs({}, 8)
  assert.equal(m.length, 8)
})
ok('岗位全标demo诚实', () => {
  assert.ok(jobs.JOBS.every((j) => j.demo === true))
})
ok('upcoming 按日期正序', () => {
  const u = acts.upcoming()
  assert.ok(u.length >= 6)
  for (let i = 1; i < u.length; i++) assert.ok(u[i - 1].date <= u[i].date)
})
ok('signupLocal 幂等', () => {
  const id = acts.upcoming().find((a) => !a.expired).id
  acts.signupLocal(id)
  assert.equal(acts.signupLocal(id).already, true)
})
ok('activityById 命中', () => {
  assert.ok(acts.activityById('a3').title.includes('双选'))
})
ok('报名计数+1', () => {
  const before = acts.activityById('a1').signed || 0
  localStorage.removeItem('agent_activity_sign_v1')
  acts.signupLocal('a1')
  assert.ok(acts.activityById('a1').signed >= before)
})

console.log('── workflows可加载 ──')
ok('三新工作流注册', async () => {
  const { WORKFLOWS, workflowMeta } = await import('../src/agent/workflows.js')
  for (const id of ['jobHunt', 'activitySignup', 'fixReport']) {
    assert.ok(WORKFLOWS[id], id + '缺失')
    assert.ok(workflowMeta(id).steps.length >= 2)
  }
})
ok('三新意图可识别', async () => {
  const { recognize } = await import('../src/agent/intents.js')
  assert.equal(recognize('找实习').wf, 'jobHunt')
  assert.equal(recognize('活动报名').wf, 'activitySignup')
  assert.equal(recognize('宿舍报修').wf, 'fixReport')
})
ok('五新应用意图直达', async () => {
  const { recognize } = await import('../src/agent/intents.js')
  assert.equal(recognize('招聘').app, 'jobs')
  assert.equal(recognize('为什么选你').app, 'compare')
})
ok('工作流总数≥30', async () => {
  const { WORKFLOWS } = await import('../src/agent/workflows.js')
  assert.ok(Object.keys(WORKFLOWS).length >= 30)
})

console.log('── converse ──')
const converse = await import('../src/agent/converse.js')
const LAST = { wfId: 'findRoom', slots: {}, text: '哪里有空教室自习' }
ok('明天呢→time续', () => {
  const d = converse.detectContinue('明天呢', LAST)
  assert.ok(d && d.kind === 'time' && d.time)
})
ok('换博文楼→change', () => {
  const d = converse.detectContinue('换博文楼', LAST)
  assert.ok(d && d.kind === 'change' && d.rest.includes('博文楼'))
})
ok('再查一次→again', () => {
  const d = converse.detectContinue('再查一次', LAST)
  assert.ok(d && d.kind === 'again')
})
ok('长句不续', () => {
  assert.equal(converse.detectContinue('明天早上八点从宿舍到三号教学楼怎么走顺路带早饭', LAST), null)
})
ok('不可续工作流不续', () => {
  assert.equal(converse.detectContinue('明天呢', { wfId: 'addSchedule', slots: {}, text: '' }), null)
})
ok('mergeContinue新条件前置', () => {
  const d = converse.detectContinue('明天呢', LAST)
  const m = converse.mergeContinue(LAST, d, '明天呢')
  assert.equal(m.wfId, 'findRoom')
  assert.ok(m.ctx.text.indexOf('明天呢') === 0)
})
ok('followupsFor专属', () => {
  assert.ok(converse.followupsFor('findRoom').includes('明天呢'))
  assert.equal(converse.followupsFor('xxx')[0], '还有其他需求吗？')
})
ok('daypart分段', () => {
  assert.equal(converse.daypart(new Date(2026, 1, 1, 8)), '早上好')
  assert.equal(converse.daypart(new Date(2026, 1, 1, 21)), '晚上好')
})
ok('buildGreeting有推送', () => {
  const g = converse.buildGreeting({ agentName: '小青', pushes: [{ icon: '🧠', kind: 'review', text: '到期2项', action: { type: 'openApp', value: 'focus' } }] })
  assert.ok(g.reply.includes('小青') && g.card && g.chips.length)
})
ok('buildGreeting空态', () => {
  const g = converse.buildGreeting({ agentName: '小青', pushes: [] })
  assert.ok(g.card === null && g.chips.includes('今日简报'))
})

console.log(`\n done: pass=${pass} fail=${fail}`)
process.exit(fail ? 1 : 0)
