/**
 * ════════════════════════════════════════════════════════════════════
 * @模块路径  scripts/unit-agent.mjs
 * @职责      智能体纯函数单元测试：slots 槽位抽取 / faq 匹配自洽性 /
 *            wall 热度与分区 —— 无需浏览器与网关，node 直接跑
 * @用法      node scripts/unit-agent.mjs   （退出码 0 = 全绿）
 * @设计      FAQ 采用「自洽性断言」：每条 FAQ 的首个 pattern 调 matchFaq
 *            必须命中自身 —— 该断言与校本无关，QDU/FJNU 两站通用
 * @为什么不引入测试框架  项目红线「不引入未确认依赖」；纯函数 + node:assert
 *            足够覆盖；如未来需要再评估 vitest
 * ════════════════════════════════════════════════════════════════════
 */
import assert from 'node:assert/strict'
import { extractTime, extractPeriod, extractPlace, extractKeyword, extractScheduleSlots } from '../src/agent/slots.js'
import { FAQ, matchFaq } from '../src/agent/faq.js'
import { PARTS, hotScore, partOf, POINTS } from '../src/wall/config.js'

let pass = 0
let fail = 0
function ok(name, fn) {
  try { fn(); pass++ ; console.log('  PASS  ' + name) }
  catch (e) { fail++; console.log('  FAIL  ' + name + ' → ' + e.message) }
}

console.log('── slots.extractTime ──')
ok('明天 → day 为明天(今天+1)', () => {
  const t = extractTime('明天下午开会')
  assert.ok(t, '应识别到时间')
  const today = new Date().getDay() || 7
  assert.equal(t.day, (today % 7) + 1 === 8 ? 1 : today + 1)
  assert.equal(t.dateLabel, '明天')
})
ok('周三 → dateLabel 为周三', () => {
  const t = extractTime('周三交作业')
  assert.ok(t)
  assert.equal(t.dateLabel, '周三')
})
ok('下午3点 → hour=15（PM 进位）', () => {
  const t = extractTime('明天下午3点开会')
  assert.ok(t)
  assert.equal(t.hour, 15)
})
ok('上午10点 → hour=10（不进位）', () => {
  const t = extractTime('上午10点上课')
  assert.ok(t)
  assert.equal(t.hour, 10)
})
ok('无时间无日期 → null', () => {
  assert.equal(extractTime('帮我看看这个功能'), null)
  assert.equal(extractTime('随便聊聊'), null)
})
ok('中文数字时间：下午三点 → 15', () => {
  const t = extractTime('明天下午三点开组会')
  assert.ok(t, '应识别')
  assert.equal(t.hour, 15)
})

console.log('── slots.extractPeriod ──')
ok('第3-4节 → {3,4}', () => {
  assert.deepEqual(extractPeriod('第3-4节有空教室吗'), { start: 3, end: 4 })
})
ok('第7节 → {7,8}', () => {
  assert.deepEqual(extractPeriod('第7节'), { start: 7, end: 8 })
})
ok('晚自习 → {9,11}', () => {
  assert.deepEqual(extractPeriod('晚自习'), { start: 9, end: 11 })
})
ok('无节次默认值在 1-12 范围', () => {
  const p = extractPeriod('随便看看')
  assert.ok(p.start >= 1 && p.end <= 12 && p.end >= p.start)
})

console.log('── slots.extractPlace / Keyword / Schedule ──')
ok('提取已知地点：图书馆', () => {
  assert.equal(extractPlace('怎么去图书馆'), '图书馆')
})
ok('提取"到食堂"式地点', () => {
  const p = extractPlace('怎么去食堂吃饭')
  assert.ok(p && p.includes('食堂'))
})
ok('关键词剥离停用词', () => {
  const k = extractKeyword('帮我查一下转专业的通知')
  assert.ok(k && k.includes('转专业'))
})
ok('短词返回 null（不足2字）', () => {
  assert.equal(extractKeyword('查'), null)
})
ok('日程槽位：时间与事项都抽出', () => {
  const s = extractScheduleSlots('提醒我明天下午三点开组会')
  assert.ok(s.time, '应有时间')
  assert.ok(s.time.hour === 15)
  assert.ok(s.thing && s.thing.includes('组'), '事项应含"组"：' + s.thing)
})

console.log('── faq 自洽性（校本无关 · 两站通用） ──')
ok('FAQ 数量 ≥ 8（校本下限）', () => {
  assert.ok(FAQ.length >= 8, 'FAQ=' + FAQ.length)
})
ok('每条 FAQ 首个 pattern 必命中自身', () => {
  const missed = FAQ.filter((f) => {
    const hit = matchFaq(f.patterns[0])
    return !hit || hit.id !== f.id
  }).map((f) => f.id)
  assert.deepEqual(missed, [], '未命中: ' + missed.join(','))
})
ok('每条 FAQ 必带 source（可溯源红线）', () => {
  const bad = FAQ.filter((f) => !f.source || f.source.length < 4).map((f) => f.id)
  assert.deepEqual(bad, [], '缺 source: ' + bad.join(','))
})
ok('无关句不误中（低分阈值）', () => {
  assert.equal(matchFaq('量子色动力学的格点规范理论'), null)
})

console.log('── wall/config ──')
ok('分区含 all 且 ≥ 10 个', () => {
  assert.ok(PARTS[0].id === 'all')
  assert.ok(PARTS.length >= 10, 'PARTS=' + PARTS.length)
})
ok('partOf 未知 id 回落闲聊（脏数据防护）', () => {
  assert.equal(partOf('不存在的分区').id, 'chat')
})
ok('热度分：互动多 > 互动少', () => {
  const now = Date.now()
  const a = { ts: now, likes: 10, replies: [{}, {}], views: 100 }
  const b = { ts: now, likes: 0, replies: [], views: 0 }
  assert.ok(hotScore(a) > hotScore(b))
})
ok('热度分：越新越高（同互动量）', () => {
  const old = { ts: Date.now() - 48 * 3600000, likes: 5, replies: [], views: 10 }
  const fresh = { ts: Date.now(), likes: 5, replies: [], views: 10 }
  assert.ok(hotScore(fresh) > hotScore(old))
})
ok('积分规则齐全且为正整数', () => {
  for (const k of ['signIn', 'post', 'reply', 'liked', 'adopted', 'bountyCost']) {
    assert.ok(Number.isInteger(POINTS[k]) && POINTS[k] > 0, k + '=' + POINTS[k])
  }
})

console.log('')
console.log('结果：' + pass + ' PASS / ' + fail + ' FAIL')
process.exit(fail ? 1 : 0)
