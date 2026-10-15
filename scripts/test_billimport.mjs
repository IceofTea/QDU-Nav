/**
 * 账单导入解析器自测：node scripts/test_billimport.mjs
 * 样本均为虚构数据（不含任何真实个人信息），覆盖支付宝 CSV / 微信 CSV 两种真实结构：
 * 表头识别、GBK/UTF-8 解码、收/支区分、中性交易与关闭交易过滤、交易分类映射、金额与日期解析。
 */
import assert from 'node:assert/strict'
import { parseBillFile } from '../src/utils/billImport.js'

function fakeFile(name, text, type = 'text/csv') {
  return {
    name,
    type,
    arrayBuffer: async () => {
      const bytes = new TextEncoder().encode(text)
      return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
    }
  }
}

const ALIPAY = `------------------------------------------------------------------------------------
导出信息：
起始时间：[2026-01-01 00:00:00]    终止时间：[2026-01-31 23:59:59]
共6笔记录
特别提示：
1.本回单内容可表明支付宝受理了相应支付交易申请；
------------------------支付宝支付科技有限公司  电子客户回单------------------------
交易时间,交易分类,交易对方,对方账号,商品说明,收/支,金额,收/付款方式,交易状态,交易订单单号,商家订单号,备注,
2026-01-03 12:30:00,餐饮美食,青大风味食堂,/,麻辣香锅,支出,15.50,余额宝,交易成功,1001,2001,,
2026-01-03 08:00:00,投资理财,建信基金管理有限公司,/,余额宝-收益发放,不计收支,0.65,余额宝,交易成功,1002,2002,,
2026-01-05 09:00:00,日用百货,楼下超市,/,洗衣液一箱,支出,36.90,余额宝&红包,交易成功,1003,2003,,
2026-01-06 20:00:00,转账红包,舍友小李,/,AA饭钱,支出,50.00,余额宝,交易成功,1004,2004,,
2026-01-08 11:00:00,餐饮美食,肯德基,/,外卖订单,支出,33.00,余额宝,交易关闭,1005,2005,,
2026-01-10 09:00:00,投资理财,余额宝,/,银行卡定时转入,不计收支,1.00,余额宝,交易成功,1006,2006,,
2026-01-12 15:00:00,服饰装扮,优衣库,/,条纹T恤,支出,79.00,余额宝,交易成功,1007,2007,,
2026-01-15 10:00:00,充值缴费,中国移动,/,话费充值,支出,50.00,余额宝,交易成功,1008,2008,,
`

const WECHAT = `微信支付账单明细
微信昵称：[测试用户]
起始时间：[2026-01-01 00:00:00] 终止时间：[2026-01-31 23:59:59]
导出类型：[全部]
共7笔记录
注：
1. 充值/提现/理财通购买等交易，将计入中性交易
----------------------微信支付账单明细列表--------------------
交易时间|交易类型|交易对方|商品|收/支|金额(元)|支付方式|当前状态|交易单号|商户单号|备注
2026-01-02 08:30:00|商户消费|青大第二食堂|麻辣香锅|支出|12.00|零钱|支付成功|W1001|M2001|/
2026-01-04 12:00:00|二维码收款|室友小红|收款方备注:二维码收款|收入|5.20|零钱|已收钱|W1002|M2002|/
2026-01-05 14:00:00|转账|同班同学|转账备注:电影票AA|支出|30.00|零钱|对方已收钱|W1003|M2003|/
2026-01-06 09:00:00|零钱提现|建设银行(0000)|/|/|100.00|零钱|提现已到账|W1004|/|服务费¥0.00
2026-01-07 18:00:00|商户消费|猫眼|订单编号:8888|支出|45.00|零钱|支付成功|W1005|M2005|/
2026-01-08 10:00:00|商户消费|中国移动营业厅|话费充值|支出|50.00|零钱|支付成功|W1006|M2006|/
2026-01-10 16:00:00|其他|平台现金奖励|/|收入|0.50|/|已到账|W1007|M2007|平台现金奖励
`

let failed = 0
async function check(name, fn) {
  try {
    await fn()
    console.log('✔', name)
  } catch (e) {
    failed++
    console.error('✘', name, '\n   ', e.message)
  }
}

function sum(list, type) {
  return Math.round(list.filter((r) => r.type === type).reduce((s, r) => s + r.amount, 0) * 100) / 100
}

await check('支付宝 CSV：识别为 alipay，正确区分收支与过滤', async () => {
  const res = await parseBillFile(fakeFile('alipay.csv', ALIPAY))
  assert.equal(res.ok, true)
  assert.equal(res.brand, 'alipay')
  assert.equal(res.source, 'text')
  // 有效记录：支出 4（香锅/洗衣液/AA/优衣库/话费），收入 0（投资理财不计收支被过滤）
  // 交易关闭的肯德基被跳过，余额宝收益/定时转入不计收支被跳过
  assert.equal(res.added.length, 5)
  assert.equal(sum(res.added, 'expense'), Math.round((15.5 + 36.9 + 50 + 79 + 50) * 100) / 100)
  assert.equal(res.skipped.neutral, 2)
  assert.equal(res.skipped.closed, 1)
  assert.equal(res.added.find((r) => r.note.includes('麻辣香锅')).cat, 'food')
  assert.equal(res.added.find((r) => r.note.includes('洗衣液')).cat, 'daily')
  assert.equal(res.added.find((r) => r.note.includes('AA饭钱')).cat, 'transfer')
  assert.equal(res.added.find((r) => r.note.includes('条纹T恤')).cat, 'cloth')
  assert.equal(res.added.find((r) => r.note.includes('话费充值')).cat, 'phone')
  assert.equal(res.added[0].date, '2026-01-03')
})

await check('微信 CSV（竖线分隔）：识别为 wechat，正确处理交易类型', async () => {
  const res = await parseBillFile(fakeFile('wechat.csv', WECHAT))
  assert.equal(res.ok, true)
  assert.equal(res.brand, 'wechat')
  assert.equal(res.source, 'text')
  // 收入 2（二维码收款/平台现金奖励），支出 4（香锅/转账AA/猫眼/话费），中性 1（零钱提现）
  assert.equal(res.added.length, 6)
  assert.equal(sum(res.added, 'income'), 5.7)
  assert.equal(sum(res.added, 'expense'), 137)
  assert.equal(res.skipped.neutral, 1)
  assert.equal(res.added.find((r) => r.note.includes('麻辣香锅')).cat, 'food')
  assert.equal(res.added.find((r) => r.note.includes('电影票AA')).cat, 'transfer')
  assert.equal(res.added.find((r) => r.note.includes('猫眼')).cat, 'fun')
  assert.equal(res.added.find((r) => r.note.includes('话费充值')).cat, 'phone')
  assert.equal(res.added.find((r) => r.type === 'income' && r.cat === 'transfer').cat, 'transfer')
  assert.equal(res.added[0].date, '2026-01-02')
})

await check('非账单文件：给出明确提示', async () => {
  const res = await parseBillFile(fakeFile('no.csv', '姓名,年龄\n张三,20\n'))
  assert.equal(res.ok, false)
  assert.match(res.msg, /未识别到账单表头/)
})

await check('微信退款自动冲抵同商户原支出', async () => {
  const csv = `微信支付账单明细
----------------------微信支付账单明细列表--------------------
交易时间|交易类型|交易对方|商品|收/支|金额(元)|支付方式|当前状态|交易单号|商户单号|备注
2026-08-10 12:00:00|商户消费|麦当劳|麦当劳巨无霸套餐|支出|30.00|零钱|支付成功|W1|M1|/
2026-08-12 10:00:00|退款|麦当劳|退款-麦当劳巨无霸套餐|收入|30.00|零钱|退款成功|W2|M2|/
2026-08-13 09:00:00|商户消费|华莱士|华莱士套餐|支出|25.00|零钱|支付成功|W3|M3|/
`
  const res = await parseBillFile(fakeFile('refund.csv', csv))
  assert.equal(res.ok, true)
  assert.equal(res.added.length, 2)
  const refunded = res.added.find((r) => r.merchant === '麦当劳巨无霸套餐')
  assert.ok(refunded, '麦当劳支出应保留')
  assert.equal(refunded.refunded, true, '麦当劳支出应被标记为已退款')
  assert.ok(!res.added.some((r) => r.cat === 'refund'), '退款记录应被移除')
  assert.ok(res.added.find((r) => r.merchant === '华莱士套餐'))
})

/* ---------- 以下为 v1.7 解析器升级新增能力 ---------- */

await check('通用银行 CSV（单金额列 + 负号表示支出）', async () => {
  const csv = `交易日期,摘要,对方户名,交易金额,余额
2026-03-01,消费,某超市,-36.50,1000.00
2026-03-02,工资代发,某某公司,5000.00,6000.00
2026-03-03,余额宝转入,本人支付宝,-200.00,5800.00
2026-03-04,消费,青大食堂,-15.00,5785.00
`
  const res = await parseBillFile(fakeFile('icbc.csv', csv))
  assert.equal(res.ok, true)
  assert.equal(res.brand, 'bank')
  assert.equal(res.source, 'text')
  assert.equal(res.added.length, 3)
  assert.equal(sum(res.added, 'expense'), 51.5)
  assert.equal(sum(res.added, 'income'), 5000)
  assert.equal(res.skipped.neutral, 1, '余额宝转入属账户内部移动，应被剔除')
  assert.equal(res.added.find((r) => r.merchant === '某超市').cat, 'daily')
  assert.equal(res.added.find((r) => r.type === 'income').cat, 'transfer')
  assert.equal(res.added.find((r) => r.amount === 15).cat, 'food')
})

await check('通用银行 CSV（借方/贷方 双列 + 退款冲抵同样生效）', async () => {
  const csv = `记账日期,交易说明,借方发生额,贷方发生额,对方账户名
2026-04-01,网上银行支付,88.80,,美团
2026-04-02,退款,,88.80,美团
2026-04-03,充值提现,,500.00,本人
2026-04-04,结息,,1.20,中国银行
`
  const res = await parseBillFile(fakeFile('ccb2.csv', csv))
  assert.equal(res.ok, true)
  assert.equal(res.skipped.neutral, 1, '充值提现应被剔除')
  assert.equal(res.added.length, 2, '退款与同商户同金额支出配对被冲抵移除')
  const paid = res.added.find((r) => r.amount === 88.8)
  assert.equal(paid.refunded, true)
  const interest = res.added.find((r) => r.cat === 'invest')
  assert.ok(interest && interest.amount === 1.2, '结息应归入理财收益')
})

await check('收入分类使用独立词表（退款/利息不再被误判为购物类）', async () => {
  const csv = `交易时间|交易类型|交易对方|商品|收/支|金额(元)|支付方式|当前状态|交易单号|商户单号|备注
2026-05-01 10:00:00|退款|优衣库|退款-优衣库T恤|收入|99.00|零钱|退款成功|W1|M1|/
2026-05-02 10:00:00|其他|某平台|活动奖励|收入|8.88|零钱|已到账|W2|M2|/
`
  const res = await parseBillFile(fakeFile('income.csv', csv))
  assert.equal(res.ok, true)
  const refund = res.added.find((r) => r.amount === 99)
  assert.equal(refund.cat, 'refund', '退款应归入 refund，而非 cloth')
  assert.equal(res.added.find((r) => r.amount === 8.88).cat, 'prize')
})

await check('recordFingerprint 可用于幂等去重且不含易变字段', async () => {
  const { recordFingerprint } = await import('../src/utils/billImport.js')
  const a = { id: 1, date: '2026-01-01', time: '08:00:00', amount: 12.5, type: 'expense', cat: 'food', note: '早餐', merchant: '食堂' }
  const b = { id: 999, date: '2026-01-01', time: '08:00:00', amount: 12.5, type: 'expense', cat: 'food', note: '早餐', merchant: '第一食堂' }
  const c = { ...a, amount: 13 }
  assert.equal(recordFingerprint(a), recordFingerprint(b))
  assert.notEqual(recordFingerprint(a), recordFingerprint(c))
})

console.log(failed ? `\n${failed} 项失败` : '\n全部通过')
process.exit(failed ? 1 : 0)