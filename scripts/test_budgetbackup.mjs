/**
 * 记账备份/恢复工具自测：node scripts/test_budgetbackup.mjs
 * 覆盖：规范化脏数据、指纹去重、三种备份形态解析、追加/替换合并、文件名与汇总。
 */
import assert from 'node:assert/strict'
import {
  BACKUP_FORMAT, normalizeDate, normalizeRecord, fingerprint, summarize,
  buildBackup, serializeBackup, parseBackup, mergeRecords, backupFileName
} from '../src/utils/budgetBackup.js'

let failed = 0
function check(name, fn) {
  try {
    fn()
    console.log('✔', name)
  } catch (e) {
    failed++
    console.error('✘', name, '\n   ', e.message)
  }
}

check('normalizeDate 只接受合法 yyyy-mm-dd', () => {
  assert.equal(normalizeDate('2026-05-03'), '2026-05-03')
  assert.equal(normalizeDate('2026-05-03 12:30:00'), '2026-05-03')
  assert.equal(normalizeDate('2026-13-01'), '')
  assert.equal(normalizeDate('2026-00-10'), '')
  assert.equal(normalizeDate('2026-05-32'), '')
  assert.equal(normalizeDate(''), '')
  assert.equal(normalizeDate(null), '')
  assert.equal(normalizeDate('bad', '2026-01-01'), '2026-01-01')
})

check('normalizeRecord 收敛脏数据', () => {
  assert.equal(normalizeRecord(null), null)
  assert.equal(normalizeRecord({}), null)
  assert.equal(normalizeRecord({ id: 1, type: 'weird', amount: 10, date: '2026-05-01' }), null)
  assert.equal(normalizeRecord({ id: 1, type: 'expense', amount: 0, date: '2026-05-01' }), null)
  assert.equal(normalizeRecord({ id: 1, type: 'expense', amount: 10, date: 'nope' }), null)
  assert.equal(normalizeRecord({ id: 1, type: 'expense', amount: 999999999, date: '2026-05-01' }), null)

  const r = normalizeRecord({ id: 7, type: 'expense', cat: 'unknown-cat', amount: '-12.345', date: '2026-05-01', note: 'x'.repeat(300), merchant: 'M', time: '08:00:00' })
  assert.equal(r.amount, 12.35, '负号金额取绝对值并四舍五入到分')
  assert.equal(r.cat, 'other', '未知分类收敛为 other')
  assert.equal(r.note.length, 120, '备注截断')
  assert.equal(r.date, '2026-05-01')
  assert.equal(r.time, '08:00:00')
  const inc = normalizeRecord({ type: 'income', cat: 'scholarship', amount: 8000, date: '2026-05-01' })
  assert.equal(inc.cat, 'scholarship')
  const badInc = normalizeRecord({ type: 'income', cat: 'food', amount: 10, date: '2026-05-01' })
  assert.equal(badInc.cat, 'other', '收入里出现支出分类也收敛')
})

check('fingerprint 不含 id，同笔不同 id 视为重复', () => {
  const a = { id: 1, date: '2026-05-01', time: '08:00:00', amount: 10, type: 'expense', cat: 'food', note: '早餐' }
  const b = { ...a, id: 999 }
  assert.equal(fingerprint(a), fingerprint(b))
  assert.notEqual(fingerprint(a), fingerprint({ ...a, amount: 11 }))
})

check('summarize 汇总收支与日期范围', () => {
  const s = summarize([
    { type: 'expense', amount: 10, date: '2026-05-03' },
    { type: 'expense', amount: 20.5, date: '2026-05-01' },
    { type: 'income', amount: 100, date: '2026-06-01' }
  ])
  assert.equal(s.count, 3)
  assert.equal(s.expense, 30.5)
  assert.equal(s.income, 100)
  assert.equal(s.balance, 69.5)
  assert.equal(s.firstDate, '2026-05-01')
  assert.equal(s.lastDate, '2026-06-01')
})

check('buildBackup/serializeBackup 结构稳定且不改动入参', () => {
  const records = [{ id: 1, type: 'expense', cat: 'food', amount: 10, date: '2026-05-01' }]
  const snapshot = JSON.stringify(records)
  const b = buildBackup(records, { app: 'QDU-Nav', version: '1.7.0' }, new Date('2026-09-01T00:00:00Z'))
  assert.equal(b.format, BACKUP_FORMAT)
  assert.equal(b.kind, 'budget-records')
  assert.equal(b.exportedAt, '2026-09-01T00:00:00.000Z')
  assert.equal(b.records.length, 1)
  assert.equal(JSON.stringify(records), snapshot, '不得改动传入数组')
  const text = serializeBackup(b)
  assert.ok(text.includes('\n  "format"'), '应为 2 空格缩进便于阅读')
  assert.deepEqual(JSON.parse(text).records.length, 1)
})

check('parseBackup 支持完整备份 / 裸数组 / 旧版 data 三种形态', () => {
  const rec = { id: 1, type: 'expense', cat: 'food', amount: 10, date: '2026-05-01' }
  const full = JSON.stringify({ format: 2, kind: 'budget-records', records: [rec] })
  const bare = JSON.stringify([rec])
  const legacy = JSON.stringify({ data: [rec] })
  for (const [label, text] of [['完整备份', full], ['裸数组', bare], ['旧版 data', legacy]]) {
    const r = parseBackup(text)
    assert.equal(r.ok, true, label + ' 应解析成功')
    assert.equal(r.records.length, 1, label)
  }
  assert.equal(parseBackup('{oops').error, 'not-json')
  assert.equal(parseBackup('{"foo":1}').error, 'no-records')
  assert.equal(parseBackup(JSON.stringify([{ id: 1 }])).error, 'all-invalid')
})

check('parseBackup 丢弃非法项、批内去重', () => {
  const rec = { id: 1, type: 'expense', cat: 'food', amount: 10, date: '2026-05-01' }
  const text = JSON.stringify({ records: [rec, { ...rec, id: 2 }, { bad: true }, null] })
  const r = parseBackup(text)
  assert.equal(r.ok, true)
  assert.equal(r.records.length, 1, '同一笔（不同 id）应批内去重')
  assert.equal(r.meta.dup, 1)
  assert.equal(r.meta.dropped, 2)
})

check('mergeRecords：追加去重不翻倍，替换则覆盖', () => {
  const existing = [{ id: 1, type: 'expense', cat: 'food', amount: 10, date: '2026-05-01' }]
  const incoming = [
    { id: 9, type: 'expense', cat: 'food', amount: 10, date: '2026-05-01' },
    { id: 10, type: 'expense', cat: 'food', amount: 20, date: '2026-05-02' }
  ]
  const app = mergeRecords(existing, incoming)
  assert.equal(app.records.length, 2, '重复那笔不应追加')
  assert.equal(app.added, 1)
  assert.equal(app.dup, 1)
  const rep = mergeRecords(existing, incoming, { mode: 'replace' })
  assert.equal(rep.records.length, 2)
  assert.equal(rep.records[0].id, 9, '替换模式应全部来自导入包')
})

check('backupFileName 带时间戳便于区分多份', () => {
  const n = backupFileName('qdu-budget', new Date('2026-05-03T08:07:00'))
  assert.equal(n, 'qdu-budget-backup-20260503-0807.json')
  assert.match(backupFileName(), /^budget-backup-\d{8}-\d{4}\.json$/)
})

check('往返一致：导出→解析→合并 得到同一份数据', () => {
  const records = [
    { id: 1, type: 'expense', cat: 'food', amount: 15.5, date: '2026-05-01', merchant: '第一食堂', note: '午餐' },
    { id: 2, type: 'income', cat: 'allowance', amount: 1500, date: '2026-05-01' },
    { id: 3, type: 'expense', cat: 'virtual', amount: 15, date: '2026-05-05', refunded: true }
  ]
  const text = serializeBackup(buildBackup(records))
  const parsed = parseBackup(text)
  assert.equal(parsed.ok, true)
  assert.equal(parsed.records.length, 3)
  const merged = mergeRecords([], parsed.records)
  assert.equal(merged.records.length, 3)
  assert.equal(merged.records[0].merchant, '第一食堂')
  assert.equal(merged.records[2].refunded, true)
})

console.log(failed ? `\n${failed} 项失败` : '\n全部通过')
process.exit(failed ? 1 : 0)
