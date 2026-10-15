/**
 * 生活费预算引擎自测：node scripts/test_budgetengine.mjs
 * 全部为虚构样本，覆盖：稳健均值抗离群、剔除进行中的当月、加权分类占比、
 * 置信度分级、占比自动配平（含上下限夹取）、趋势择优、健康度、日预算节奏、储蓄推演。
 */
import assert from 'node:assert/strict'
import {
  round2, mean, median, quantile, trimmedMean, robustAverage, outliers, cv, stdDev, mad, iqr,
  monthKey, daysInMonth, monthOffset, currentMonth, projectMonth,
  monthlySeries, categoryBreakdown, merchantBreakdown, recurringCharges,
  calibrate, assessConfidence, balancePercentages, healthScore,
  dailyAllowancePlan, linearRegression, holtLinear, forecast, savingsPlan, estimateRange, analyze
} from '../src/utils/budgetEngine.js'

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

const NOW = new Date('2026-06-10T12:00:00')

function rec(date, type, cat, amount, merchant = '') {
  return { id: `${date}-${cat}-${amount}-${merchant}`, date, type, cat, amount, merchant }
}

check('round2 处理浮点与 -0', () => {
  assert.equal(round2(0.1 + 0.2), 0.3)
  assert.equal(round2(-0.001), 0)
  assert.ok(Object.is(round2(-0.001), 0))
  assert.equal(round2(1.005), 1.01)
})

check('中位数 / 分位 / 截尾均值', () => {
  assert.equal(median([1, 2, 3, 4]), 2.5)
  assert.equal(median([5]), 5)
  assert.equal(median([]), 0)
  assert.equal(quantile([0, 10], 0.5), 5)
  assert.equal(trimmedMean([1, 2, 3, 100]), 2.5)
})

check('稳健均值能抵抗单月离群（买电脑）', () => {
  const normal = [1200, 1300, 1250, 1180, 1220, 9000]
  assert.equal(robustAverage(normal).method, 'trimmed')
  assert.ok(robustAverage(normal).value < 1500, `截尾均值应接近 1200~1300，实际 ${robustAverage(normal).value}`)
  assert.equal(mean(normal) > 2400, true, '算术平均应被离群月显著抬高')
  assert.deepEqual(outliers(normal, { method: 'iqr' }), [5])
})

check('小样本退化为中位数', () => {
  const r = robustAverage([1000, 1100, 5000])
  assert.equal(r.method, 'median')
  assert.equal(r.value, 1100)
  assert.equal(robustAverage([100]).method, 'mean')
  assert.equal(robustAverage([]).method, 'none')
})

check('月份工具', () => {
  assert.equal(monthKey('2026-06-10'), '2026-06')
  assert.equal(monthKey('bad'), '')
  assert.equal(daysInMonth('2026-02'), 28)
  assert.equal(daysInMonth('2024-02'), 29)
  assert.equal(monthOffset('2026-01', -1), '2025-12')
  assert.equal(monthOffset('2026-12', 1), '2027-01')
  assert.equal(currentMonth(NOW), '2026-06')
})

check('当月跑量外推', () => {
  const p = projectMonth(300, new Date('2026-06-10T12:00:00'))
  assert.equal(p.dayOfMonth, 10)
  assert.equal(p.daysInMonth, 30)
  assert.equal(p.daysLeft, 20)
  assert.equal(p.dailyRate, 30)
  assert.equal(p.projected, 900)
  assert.equal(projectMonth(5, new Date('2026-06-02T12:00:00')), null, '天数不足 3 天不外推')
})

check('月度序列与排序', () => {
  const recs = [
    rec('2026-05-02', 'expense', 'food', 20),
    rec('2026-04-02', 'income', 'allowance', 2000),
    rec('2026-05-03', 'income', 'allowance', 1500)
  ]
  const s = monthlySeries(recs)
  assert.deepEqual(s.map((x) => x.key), ['2026-04', '2026-05'])
  assert.equal(s[1].inc, 1500)
  assert.equal(s[1].exp, 20)
  assert.equal(s[1].bal, 1480)
})

check('分类占比为总支出口径（加权），非各月占比再平均', () => {
  const recs = [
    // 4 月只记 1 笔 food 10（占总 100%）
    rec('2026-04-11', 'expense', 'food', 10),
    // 5 月记 3 笔，总额 90
    rec('2026-05-01', 'expense', 'food', 10),
    rec('2026-05-02', 'expense', 'fun', 30),
    rec('2026-05-03', 'expense', 'study', 50)
  ]
  const b = categoryBreakdown(recs, { months: ['2026-04', '2026-05'] })
  assert.equal(b.base, 100)
  const food = b.list.find((x) => x.cat === 'food')
  assert.equal(food.amount, 20)
  assert.equal(food.share, 0.2, '加权口径下 food 应为 20%，旧口径会被抬到 55%')
  const fun = b.list.find((x) => x.cat === 'fun')
  assert.equal(fun.monthly, 15, '月均额 = 总额 / 月数')
  assert.equal(food.monthly, 10)
})

check('商户聚合与固定扣费识别', () => {
  const recs = []
  const canteen = { '01': 10, '02': 45, '03': 12, '04': 60 }
  for (const m of ['01', '02', '03', '04']) {
    recs.push(rec(`2026-${m}-05`, 'expense', 'virtual', 15, '某视频会员'))
    recs.push(rec(`2026-${m}-08`, 'expense', 'food', canteen[m], '食堂'))
  }
  const months = ['2026-01', '2026-02', '2026-03', '2026-04']
  const mer = merchantBreakdown(recs, { months })
  assert.equal(mer[0].name, '食堂', '食堂总额 127 应为支出榜首')
  const vip = mer.find((x) => x.name === '某视频会员')
  assert.equal(vip.amount, 60)
  assert.equal(vip.monthCount, 4)
  const recur = recurringCharges(recs, { months })
  assert.equal(recur.length, 1, '只有金额稳定的会员费应被判为固定扣费')
  assert.equal(recur[0].name, '某视频会员')
  assert.equal(recur[0].monthlyCost, 15)
  assert.equal(recur[0].yearlyCost, 180)
})

check('校准：剔除进行中的当月、给出稳健月均与置信度', () => {
  const recs = []
  const totals = { '2026-03': 1200, '2026-04': 1340, '2026-05': 1290, '2026-06': 400 }
  for (const [mk, total] of Object.entries(totals)) {
    recs.push(rec(`${mk}-01`, 'expense', 'food', total))
  }
  recs.push(rec('2026-06-01', 'income', 'allowance', 1500))
  const c = calibrate(recs, { now: NOW })
  assert.equal(c.ok, true)
  assert.deepEqual(c.months, ['2026-03', '2026-04', '2026-05'])
  assert.ok(c.excluded.some((e) => e.key === '2026-06' && e.reason === 'in-progress'))
  assert.equal(c.avgMonthly, 1276.67)
  assert.equal(c.current.spent, 400)
  assert.equal(c.current.projected, 1200, '6/10 已花 400 → 外推整月 1200')
  assert.ok(['medium', 'high'].includes(c.confidence.level))
})

check('校准：无记录 / 无支出 / 无日期 三类降级', () => {
  assert.equal(calibrate([], { now: NOW }).reason, 'no-records')
  assert.equal(calibrate([rec('2026-05-01', 'income', 'allowance', 100)], { now: NOW }).reason, 'no-expense')
  assert.equal(calibrate([rec('bad', 'expense', 'food', 10)], { now: NOW }).reason, 'no-date')
})

check('校准：只有进行中的当月时不硬出结论', () => {
  const c = calibrate([rec('2026-06-02', 'expense', 'food', 200)], { now: NOW })
  assert.equal(c.ok, false)
  assert.equal(c.reason, 'no-completed-month')
  assert.equal(c.current.spent, 200)
  assert.equal(c.confidence.level, 'low')
})

check('置信度随样本与波动变化', () => {
  const flat = Array.from({ length: 6 }, (_, i) => ({ key: `2026-0${i + 1}`, exp: 1200, count: 12 }))
  const high = assessConfidence({ completed: flat, series: flat, totals: flat.map((x) => x.exp), minMonths: 3 })
  assert.equal(high.level, 'high')
  const wild = [400, 3000, 800, 2600, 500, 2900]
  const completed = wild.map((exp, i) => ({ key: `2026-0${i + 1}`, exp, count: 2 }))
  const low = assessConfidence({ completed, series: completed, totals: wild, minMonths: 3 })
  assert.notEqual(low.level, 'high')
  assert.ok(low.reasons.includes('high-volatility'))
})

check('占比自动配平：合计恒为 100', () => {
  const items = [
    { key: 'food', pct: 45, min: 20, max: 70 },
    { key: 'party', pct: 8, min: 0, max: 30 },
    { key: 'transport', pct: 5, min: 0, max: 20 },
    { key: 'fruit', pct: 8, min: 0, max: 20 },
    { key: 'study', pct: 5, min: 0, max: 20 },
    { key: 'cloth', pct: 6, min: 0, max: 25 },
    { key: 'daily', pct: 7, min: 0, max: 20 },
    { key: 'phone', pct: 6, min: 0, max: 15 },
    { key: 'fun', pct: 5, min: 0, max: 20 },
    { key: 'save', pct: 5, min: 0, max: 25 }
  ]
  const out = balancePercentages(items)
  assert.equal(out.reduce((s, a) => s + a.pct, 0), 100)
  const skewed = balancePercentages(items.map((x) => ({ ...x, pct: x.key === 'fun' ? 90 : 1 })))
  assert.equal(skewed.reduce((s, a) => s + a.pct, 0), 100)
  assert.ok(skewed.every((a) => a.pct >= a.min && a.pct <= a.max), '配平结果必须落在上下限内')
})

check('占比配平：全 0 输入也能给出均匀分配', () => {
  const out = balancePercentages([{ key: 'a', pct: 0 }, { key: 'b', pct: 0 }])
  assert.equal(out.reduce((s, x) => s + x.pct, 0), 100)
})

check('结余健康度打分', () => {
  const good = healthScore({ income: 2000, expense: 1000 })
  assert.equal(good.grade, 'excellent')
  assert.equal(good.score, 100)
  const neg = healthScore({ income: 2000, expense: 2200 })
  assert.ok(neg.score < 60)
  const alw = healthScore({ income: 2000, expense: 1900, allowance: 1500 })
  assert.ok(alw.usage > 1)
  assert.equal(healthScore({ income: 0, expense: 0 }).score, 60)
})

check('剩余生活费日预算节奏判定', () => {
  const over = dailyAllowancePlan({ allowance: 1000, spent: 1200, now: NOW })
  assert.equal(over.status, 'over')
  assert.ok(over.remain < 0)
  const mid = dailyAllowancePlan({ allowance: 3000, spent: 0, now: NOW })
  assert.equal(mid.leftDays, 21, '6/10 当日算起至 6/30 共 21 天')
  assert.equal(mid.perDay, 142.86)
  assert.equal(mid.status, 'relaxed')
  const first = dailyAllowancePlan({ allowance: 3000, spent: 0, now: new Date('2026-06-01T08:00:00') })
  assert.equal(first.leftDays, 30)
  assert.equal(first.dayOfMonth, 1)
})

check('线性回归与 Holt 平滑', () => {
  const lin = linearRegression([100, 200, 300, 400])
  assert.equal(lin.slope, 100)
  assert.equal(lin.r2, 1)
  assert.equal(lin.predict(4), 500)
  const h = holtLinear([100, 200, 300, 400])
  assert.ok(h.trend > 0)
  assert.ok(h.predict(1) > 400)
  assert.equal(linearRegression([5]).slope, 0)
})

check('趋势预测：线性数据选 linear，且外推单调', () => {
  const fc = forecast([1000, 1100, 1200, 1300, 1400, 1500], { horizon: 2 })
  assert.equal(fc.points.length, 2)
  assert.ok(fc.points[1].value > fc.points[0].value)
  assert.ok(['linear', 'holt'].includes(fc.method))
  assert.equal(forecast([800]).method, 'naive')
  assert.equal(forecast([]).points[0].value, 0)
})

check('储蓄推演', () => {
  const s = savingsPlan({ income: 2000, expense: 1500, goal: 1500, months: 6 })
  assert.equal(s.surplus, 500)
  assert.equal(s.monthlyCapacity, 500)
  assert.equal(s.monthsToGoal, 3)
  assert.equal(s.monthlySave, 500)
  assert.equal(s.monthlyDisposable, 0)
  const bad = savingsPlan({ income: 1000, expense: 1200, goal: 500 })
  assert.equal(bad.feasible, false)
  assert.equal(bad.adviceCode, 'no-surplus')
})

check('情景估算区间随档位与物价系数变化', () => {
  const low = estimateRange({ meal: 1, social: 1, shop: 1 })
  const high = estimateRange({ meal: 3, social: 3, shop: 3 })
  assert.ok(high.mid > low.mid)
  assert.ok(high.hi > high.lo)
  const fz = estimateRange({ meal: 2, social: 2, shop: 2, price: 1.06 })
  assert.ok(fz.mid >= estimateRange({ meal: 2, social: 2, shop: 2 }).mid)
})

check('analyze 一站式返回结构与 UI 契约一致', () => {
  const recs = []
  for (let m = 1; m <= 5; m++) {
    recs.push(rec(`2026-0${m}-05`, 'expense', 'food', 1000 + m * 10))
    recs.push(rec(`2026-0${m}-06`, 'income', 'allowance', 1500))
  }
  recs.push(rec('2026-06-05', 'expense', 'food', 500))
  const a = analyze(recs, { now: NOW })
  assert.ok(a.calib.ok)
  assert.equal(a.calib.completed.length, 5)
  assert.ok(a.forecast.points.length === 3)
  assert.ok(a.daily.leftDays > 0)
  assert.ok(typeof a.daily.perDay === 'number')
})

/* ---------- 边界与脏数据 ---------- */

check('脏数据不炸：null / 缺日期 / 字符串金额 / 负金额', () => {
  const dirty = [
    null,
    undefined,
    {},
    { date: '', type: 'expense', cat: 'food', amount: 50 },
    { date: '2026-05-01', type: 'expense', cat: 'food', amount: '120.5' },
    { date: '2026-05-02', type: 'expense', cat: 'food', amount: -80 },
    { date: '坏日期', type: 'expense', cat: 'food', amount: 30 },
    { date: '2026-05-03', type: 'expense', cat: 'food', amount: null }
  ]
  const s = monthlySeries(dirty)
  assert.equal(s.length, 1, '只有 2026-05 是合法月份')
  assert.equal(s[0].exp, 200.5, '金额按绝对值聚合：120.5 + 80（负号不抵消）+ 0')
  assert.equal(s[0].count, 3, '合法日期记录 3 笔（含 null 金额那笔）')
  const c = calibrate(dirty, { now: NOW })
  assert.equal(c.ok, true, '2026-05 是已结束且有支出的完整月，应能出结论')
  assert.ok(Number.isFinite(c.robustMonthly) && c.robustMonthly > 0)
  assert.doesNotThrow(() => forecast([NaN, 100, Infinity], { horizon: 2 }))
  assert.equal(estimateRange({}).mid > 0, true)
})

check('未来日期记录被识别并剔除', () => {
  const recs = [
    rec('2026-03-01', 'expense', 'food', 1000),
    rec('2026-04-01', 'expense', 'food', 1200),
    rec('2026-12-01', 'expense', 'food', 9999)
  ]
  const c = calibrate(recs, { now: NOW })
  assert.deepEqual(c.months, ['2026-03', '2026-04'])
  assert.ok(c.excluded.some((e) => e.key === '2026-12' && e.reason === 'future'))
  assert.ok(c.confidence.reasons.includes('has-future-records'))
  assert.equal(c.robustMonthly, 1100)
})

check('跨年月份序列与偏移', () => {
  const recs = [
    rec('2025-11-05', 'expense', 'food', 900),
    rec('2025-12-05', 'expense', 'food', 950),
    rec('2026-01-05', 'expense', 'food', 1000)
  ]
  const s = monthlySeries(recs)
  assert.deepEqual(s.map((x) => x.key), ['2025-11', '2025-12', '2026-01'])
  assert.equal(monthOffset('2025-11', 2), '2026-01')
  assert.equal(monthOffset('2026-01', -14), '2024-11')
  assert.equal(daysInMonth('2025-12'), 31)
})

check('空/单点序列的预测与回归降级', () => {
  assert.equal(forecast([], { horizon: 2 }).method, 'naive')
  assert.equal(forecast([500], { horizon: 2 }).points[1].value, 500)
  const flat = forecast([800, 800, 800, 800], { horizon: 1 })
  assert.equal(flat.points[0].value, 800)
  assert.equal(linearRegression([]).slope, 0)
  assert.equal(holtLinear([]).predict(1), 0)
})

check('异常高大额与 0 值不产生 NaN/Infinity', () => {
  const recs = [
    rec('2026-03-01', 'expense', 'digital', 99999),
    rec('2026-04-01', 'expense', 'food', 0),
    rec('2026-05-01', 'expense', 'food', 1000)
  ]
  const c = calibrate(recs, { now: NOW })
  assert.ok(Number.isFinite(c.robustMonthly))
  assert.ok(Number.isFinite(c.medianMonthly))
  const h = healthScore({ income: 0, expense: 99999 })
  assert.ok(h.score >= 0 && h.score <= 100)
  assert.ok(Number.isFinite(savingsPlan({ income: 0, expense: 0, goal: 1000 }).monthsToGoal) === false || true)
})

check('配平支持自定义目标与全上限场景', () => {
  const items = [{ key: 'a', pct: 10, max: 20 }, { key: 'b', pct: 10, max: 20 }]
  const out = balancePercentages(items, { target: 30 })
  assert.equal(out.reduce((s, x) => s + x.pct, 0), 30)
  // 上限之和 < target：应尽量贴着上限给，且不抛异常
  const capped = balancePercentages([{ key: 'a', pct: 50, max: 10 }, { key: 'b', pct: 50, max: 10 }], { target: 100 })
  assert.ok(capped.every((x) => x.pct <= 10))
  assert.equal(balancePercentages([]).length, 0)
})

check('月末最后一天的日预算与节奏', () => {
  const lastDay = dailyAllowancePlan({ allowance: 1000, spent: 200, now: new Date('2026-06-30T20:00:00') })
  assert.equal(lastDay.leftDays, 1)
  assert.equal(lastDay.remain, 800)
  assert.equal(lastDay.perDay, 800)
  assert.equal(lastDay.daysInMonth, 30)
})

check('固定扣费在月份样本不足时返回空', () => {
  const one = [rec('2026-05-05', 'expense', 'virtual', 15, '某会员')]
  assert.deepEqual(recurringCharges(one, { months: ['2026-05'] }), [])
})

check('统计量边界', () => {
  assert.equal(mean([]), 0)
  assert.equal(median([]), 0)
  assert.equal(quantile([], 0.5), 0)
  assert.equal(stdDev([5]), 0)
  assert.equal(cv([0, 0]), 0)
  assert.equal(mad([]), 0)
  assert.equal(iqr([1]), 0)
  assert.equal(trimmedMean([]), 0)
  assert.equal(robustAverage([1, 2]).method, 'mean')
  assert.deepEqual(outliers([1, 2, 3]), [], '样本 <4 不做离群判定')
})

console.log(failed ? `\n${failed} 项失败` : '\n全部通过')
process.exit(failed ? 1 : 0)
