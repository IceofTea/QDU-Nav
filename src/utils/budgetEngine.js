/**
 * 生活费预算引擎 —— 纯函数 · 零依赖 · 可在 Node 下直接单测
 *
 * 本模块把「生活费计数器 / 模拟器 / 专业版」中所有涉及统计口径的计算集中到一处，
 * 使两个站点的同一功能使用**完全一致的算法**，差异只保留在文案与城市物价表。
 *
 * 与旧实现（各视图内联 `reduce + 简单平均`）相比，本引擎修正了 6 个统计缺陷：
 *   ① 剔除「进行中的当月」——月中查看不再被未走完的月份系统性低估；
 *   ② 用**截尾均值 / 中位数**替代简单算术平均，抵抗离群月（某月买电脑不污染基线）；
 *   ③ 分类占比改为**总支出口径加权**，不再让只记 1 笔的月份与记满一月的月份等权；
 *   ④ 输出**样本充分性 + 置信度**，样本不足时明确降级提示而非给假结论；
 *   ⑤ 参考区间与估算/分配器同源（由调用方传入，不再各自硬编码一套常量）；
 *   ⑥ 新增**当月跑量外推**与**趋势预测**（线性回归 vs Holt 指数平滑，按样本内误差择优）。
 *
 * 设计约定：
 *   - 全部函数无副作用；输入输出均为普通对象 / 数组，便于序列化与快照测试；
 *   - 金额统一 `round2`（保留 2 位、银行家舍入之外的常规四舍五入），避免浮点累积误差；
 *   - 返回体中的 `reason` / `level` / `code` 均为**机器可读枚举**，由各站自行映射文案（本模块不含 i18n）。
 */

/* ============================ 一、数值基础 ============================ */

/** 四舍五入到分（2 位小数），并把 -0 归一为 0。 */
export function round2(n) {
  const v = Math.round((Number(n) + Number.EPSILON) * 100) / 100
  return Object.is(v, -0) ? 0 : v
}

/** 安全数值转换：非法 / 空值一律归 0，不抛异常。 */
export function toNum(v) {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : 0
}

/** 按取值函数求和后 round2。 */
export function sumBy(list, fn = (x) => x) {
  return round2((list || []).reduce((s, x) => s + toNum(fn(x)), 0))
}

/**
 * 记录金额的规范取值：**金额一律取绝对值**。
 * 方向由 `type`（income / expense）表达，金额只表示大小；
 * 这样即使账单解析或手工录入混入负号（如 -80 的支出），也不会静默「抵消」掉其他支出。
 */
export function amountOf(r) {
  return Math.abs(toNum(r && r.amount))
}

/** 求和后 round2（数组直接求和）。 */
export function sum(list) {
  return sumBy(list, (x) => x)
}

/* ============================ 二、稳健统计量 ============================ */

/** 算术平均；空数组返回 0。 */
export function mean(arr) {
  const a = (arr || []).map(toNum)
  return a.length ? round2(a.reduce((s, x) => s + x, 0) / a.length) : 0
}

/** 中位数（偶数个取中间两者均值）。 */
export function median(arr) {
  const a = (arr || []).map(toNum).slice().sort((x, y) => x - y)
  if (!a.length) return 0
  const mid = a.length >> 1
  return a.length % 2 ? a[mid] : round2((a[mid - 1] + a[mid]) / 2)
}

/** 任意分位（线性插值，q ∈ [0,1]）。 */
export function quantile(arr, q) {
  const a = (arr || []).map(toNum).slice().sort((x, y) => x - y)
  if (!a.length) return 0
  const pos = Math.min(1, Math.max(0, q)) * (a.length - 1)
  const lo = Math.floor(pos)
  const hi = Math.ceil(pos)
  if (lo === hi) return a[lo]
  return round2(a[lo] + (a[hi] - a[lo]) * (pos - lo))
}

/** 总体标准差。 */
export function stdDev(arr) {
  const a = (arr || []).map(toNum)
  if (a.length < 2) return 0
  const m = a.reduce((s, x) => s + x, 0) / a.length
  const v = a.reduce((s, x) => s + (x - m) ** 2, 0) / a.length
  return Math.round(Math.sqrt(v) * 100) / 100
}

/** 变异系数（标准差 / 均值），衡量波动性；均值为 0 时返回 0。 */
export function cv(arr) {
  const m = mean(arr)
  if (!m) return 0
  return Math.round((stdDev(arr) / Math.abs(m)) * 1000) / 1000
}

/** 中位数绝对偏差 MAD（对离群值极不敏感）。 */
export function mad(arr) {
  const a = (arr || []).map(toNum)
  if (!a.length) return 0
  const med = median(a)
  return round2(median(a.map((x) => Math.abs(x - med))))
}

/** 四分位距 IQR = Q3 - Q1。 */
export function iqr(arr) {
  return round2(quantile(arr, 0.75) - quantile(arr, 0.25))
}

/**
 * 截尾均值：去掉两端各 `trimRatio` 比例后求平均。
 * 默认各去 1 个极值（在样本 < 5 时退化为中位数以外不做处理）。
 */
export function trimmedMean(arr, trimRatio = null) {
  const a = (arr || []).map(toNum).slice().sort((x, y) => x - y)
  if (!a.length) return 0
  let k = trimRatio == null ? 1 : Math.floor(a.length * trimRatio)
  if (a.length - 2 * k < 1) k = 0
  const kept = k > 0 ? a.slice(k, a.length - k) : a
  return mean(kept)
}

/**
 * Tukey 离群值检测：返回离群点的下标。
 * method='iqr' → 超出 [Q1-1.5IQR, Q3+1.5IQR]；
 * method='mad' → |x-median| > k*MAD（k 默认 3，MAD 为 0 时改用 IQR）。
 */
export function outliers(arr, { method = 'iqr', k = 1.5, z = 3 } = {}) {
  const a = (arr || []).map(toNum)
  const idx = []
  if (a.length < 4) return idx
  if (method === 'mad') {
    const med = median(a)
    const m = mad(a)
    if (m === 0) return iqrOutliers(a, k)
    a.forEach((x, i) => { if (Math.abs(x - med) > z * m) idx.push(i) })
    return idx
  }
  return iqrOutliers(a, k)
}

function iqrOutliers(a, k) {
  const q1 = quantile(a, 0.25)
  const q3 = quantile(a, 0.75)
  const w = q3 - q1
  const lo = q1 - k * w
  const hi = q3 + k * w
  const idx = []
  a.forEach((x, i) => { if (x < lo || x > hi) idx.push(i) })
  return idx
}

/**
 * 稳健月均：在「截尾均值 / 中位数 / 算术均值」中按样本量取最合适者。
 *   n ≥ 5 → 先剔 Tukey 离群月，再对剩余取均值（保留 ≥3 个样本时）
 *   n ≥ 3 → 中位数
 *   n < 3 → 算术均值（并会由置信度层标记样本不足）
 */
export function robustAverage(values) {
  const a = (values || []).map(toNum)
  const n = a.length
  if (!n) return { value: 0, method: 'none', used: 0, excluded: [] }
  if (n >= 5) {
    const ex = outliers(a, { method: 'iqr' })
    const kept = a.filter((_, i) => !ex.includes(i))
    if (kept.length >= 3) {
      return { value: mean(kept), method: 'trimmed', used: kept.length, excluded: ex.map((i) => a[i]) }
    }
  }
  if (n >= 3) return { value: median(a), method: 'median', used: n, excluded: [] }
  return { value: mean(a), method: 'mean', used: n, excluded: [] }
}

/* ============================ 三、时间与月份 ============================ */

/** 取 "YYYY-MM"；非法输入返回空串。 */
export function monthKey(dateStr) {
  const m = String(dateStr || '').match(/^(\d{4})-(\d{2})/)
  return m ? `${m[1]}-${m[2]}` : ''
}

/** 某月的天数；非法 key 返回 30。 */
export function daysInMonth(key) {
  const m = String(key || '').match(/^(\d{4})-(\d{2})$/)
  if (!m) return 30
  return new Date(Number(m[1]), Number(m[2]), 0).getDate()
}

/** 月份偏移，offset 可为负。 */
export function monthOffset(key, offset) {
  const m = String(key || '').match(/^(\d{4})-(\d{2})$/)
  if (!m) return ''
  const d = new Date(Number(m[1]), Number(m[2]) - 1 + toNum(offset), 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/** 当前月份 key（本地时区）。 */
export function currentMonth(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

/** 当月在自然月中的第几天（1..31）。 */
export function dayOfMonth(now = new Date()) {
  return now.getDate()
}

/** 按月分组。 */
export function groupByMonth(records) {
  const map = new Map()
  for (const r of records || []) {
    const mk = monthKey(r && r.date)
    if (!mk) continue
    if (!map.has(mk)) map.set(mk, [])
    map.get(mk).push(r)
  }
  return map
}

/**
 * 生成按月时间序列。
 * @returns [{ key, inc, exp, bal, count }]，按 key 升序
 */
export function monthlySeries(records) {
  const byMonth = groupByMonth(records)
  return [...byMonth.keys()].sort().map((key) => {
    const list = byMonth.get(key)
    const inc = sumBy(list.filter((r) => r.type === 'income'), amountOf)
    const exp = sumBy(list.filter((r) => r.type === 'expense'), amountOf)
    return { key, inc, exp, bal: round2(inc - exp), count: list.length }
  })
}

/**
 * 当月跑量外推：用「已发生支出 ÷ 已过天数 × 当月天数」估算整月支出。
 * 已过天数不足 3 天时不做外推（样本太薄），返回 null 交由调用方降级。
 */
export function projectMonth(spent, now = new Date()) {
  const dom = dayOfMonth(now)
  const dim = daysInMonth(currentMonth(now))
  if (dom < 3) return null
  const daily = toNum(spent) / dom
  return {
    spent: round2(spent),
    dayOfMonth: dom,
    daysInMonth: dim,
    daysLeft: Math.max(0, dim - dom),
    dailyRate: round2(daily),
    projected: round2(daily * dim)
  }
}

/* ============================ 四、分类聚合（加权口径） ============================ */

/**
 * 分类聚合。
 * @param records 记录数组
 * @param opts.type 'expense' | 'income'
 * @param opts.months 若给出，则只统计这些月份
 * 口径说明：`share` 恒为「该项总额 ÷ 区间总支出」（加权口径，不会因某月只记 1 笔而失真）；
 *          `monthly` 恒为「该项总额 ÷ 参与统计的月份数」（用于月均额展示）。
 */
export function categoryBreakdown(records, { type = 'expense', months = null } = {}) {
  const keep = months ? new Set(months) : null
  const map = new Map()
  let base = 0
  const monthSet = keep ? new Set(keep) : new Set()
  for (const r of records || []) {
    if (!r || r.type !== type) continue
    const mk = monthKey(r.date)
    if (keep && !keep.has(mk)) continue
    if (!keep && mk) monthSet.add(mk)
    map.set(r.cat, round2((map.get(r.cat) || 0) + amountOf(r)))
    base = round2(base + amountOf(r))
  }
  const divisor = Math.max(1, monthSet.size)
  const list = [...map.entries()]
    .map(([cat, amount]) => ({
      cat,
      amount,
      monthly: round2(amount / divisor),
      share: base > 0 ? Math.round((amount / base) * 1000) / 1000 : 0
    }))
    .sort((a, b) => b.amount - a.amount)
  return { list, base, hasData: list.length > 0 }
}

/** 商户聚合（支出 / 收入通用）。 */
export function merchantBreakdown(records, { type = 'expense', months = null, clean = (x) => x } = {}) {
  const keep = months ? new Set(months) : null
  const map = new Map()
  for (const r of records || []) {
    if (!r || r.type !== type) continue
    const mk = monthKey(r.date)
    if (keep && !keep.has(mk)) continue
    const name = clean(r.merchant) || ''
    if (!name) continue
    const cur = map.get(name) || { name, amount: 0, count: 0, months: new Set() }
    cur.amount = round2(cur.amount + amountOf(r))
    cur.count += 1
    cur.months.add(mk)
    map.set(name, cur)
  }
  return [...map.values()]
    .map((m) => ({ name: m.name, amount: m.amount, count: m.count, monthCount: m.months.size }))
    .sort((a, b) => b.amount - a.amount)
}

/**
 * 固定开销 / 订阅体检：某商户在 ≥`minRatio` 的月份出现、且金额波动 < `tolRatio`，
 * 判定为「疑似固定扣费」，用于提醒学生检查自动续费。
 */
export function recurringCharges(records, { months = null, minRatio = 0.6, tolRatio = 0.2, clean = (x) => x } = {}) {
  const keep = months ? new Set(months) : null
  const byMerchant = new Map()
  for (const r of records || []) {
    if (!r || r.type !== 'expense') continue
    const mk = monthKey(r.date)
    if (keep && !keep.has(mk)) continue
    const name = clean(r.merchant)
    if (!name) continue
    if (!byMerchant.has(name)) byMerchant.set(name, [])
    byMerchant.get(name).push({ mk, amount: amountOf(r) })
  }
  const monthCount = keep ? keep.size : new Set([...groupByMonth(records).keys()]).size
  if (monthCount < 2) return []
  const out = []
  for (const [name, items] of byMerchant) {
    const distinct = new Set(items.map((i) => i.mk))
    if (distinct.size / monthCount < minRatio) continue
    if (items.length < 2) continue
    const amounts = items.map((i) => i.amount)
    const med = median(amounts)
    if (med <= 0) continue
    const spread = mad(amounts) / med
    if (spread > tolRatio) continue
    out.push({
      name,
      months: distinct.size,
      typical: med,
      monthlyCost: round2(med),
      yearlyCost: round2(med * 12),
      occurrences: items.length
    })
  }
  return out.sort((a, b) => b.monthlyCost - a.monthlyCost)
}

/* ============================ 五、月度校准（核心） ============================ */

/**
 * 账单校准：把本机记账记录折算成「可用于做预算」的稳健数字。
 *
 * @param records 记账记录（含 {date,type,cat,amount,merchant}）
 * @param opts.now 参考时间（默认当前）
 * @param opts.minMonths 认为结论可信所需的最少完整月份（默认 3）
 * @returns {object}
 *   ok         是否具备出结论的最小条件
 *   reason     机器可读原因：'no-records' | 'no-expense' | 'no-date' | null
 *   completed  参与统计的完整月份（已剔除进行中的当月）[{ key, exp, inc, bal, count }]
 *   excluded   被剔除的月份 [{ key, reason }]
 *   robustMonthly / avgMonthly / medianMonthly / trimmedMonthly   多种口径月均
 *   categories 加权口径的分类构成
 *   current    当月跑量外推（可为 null）
 *   confidence { level, score, reasons[] }
 *   series     完整月度序列（含进行中的当月，供图表使用）
 */
export function calibrate(records, { now = new Date(), minMonths = 3 } = {}) {
  const all = Array.isArray(records) ? records : []
  const base = {
    ok: false,
    reason: null,
    completed: [],
    excluded: [],
    robustMonthly: 0,
    avgMonthly: 0,
    medianMonthly: 0,
    trimmedMonthly: 0,
    avgMethod: 'none',
    avgExcluded: [],
    categories: { list: [], base: 0, hasData: false },
    current: null,
    confidence: { level: 'none', score: 0, reasons: [] },
    series: []
  }
  if (!all.length) return { ...base, reason: 'no-records' }
  const exp = all.filter((r) => r && r.type === 'expense')
  if (!exp.length) return { ...base, reason: 'no-expense' }
  if (!exp.some((r) => monthKey(r.date))) return { ...base, reason: 'no-date' }

  const cur = currentMonth(now)
  const series = monthlySeries(all)
  const completed = []
  const excluded = []
  for (const s of series) {
    if (s.key > cur) { excluded.push({ key: s.key, reason: 'future' }); continue }
    if (s.key === cur) { excluded.push({ key: s.key, reason: 'in-progress' }); continue }
    if (s.exp <= 0) { excluded.push({ key: s.key, reason: 'no-expense' }); continue }
    completed.push(s)
  }

  const totals = completed.map((s) => s.exp)
  const avg = mean(totals)
  const med = median(totals)
  const trim = trimmedMean(totals)
  const robust = robustAverage(totals)
  const months = completed.map((s) => s.key)
  const categories = categoryBreakdown(records, { type: 'expense', months })

  const curSeries = series.find((s) => s.key === cur)
  const current = curSeries ? projectMonth(curSeries.exp, now) : null

  const confidence = assessConfidence({ completed, series, totals, minMonths })

  return {
    ok: completed.length > 0,
    reason: completed.length ? null : 'no-completed-month',
    completed,
    excluded,
    months,
    robustMonthly: robust.value,
    avgMonthly: avg,
    medianMonthly: med,
    trimmedMonthly: trim,
    avgMethod: robust.method,
    avgExcluded: robust.excluded,
    categories,
    current,
    confidence,
    series
  }
}

/** 置信度评估：样本月数、波动性、记录密度三项加权，输出 low/medium/high。 */
export function assessConfidence({ completed = [], series = [], totals = [], minMonths = 3 } = {}) {
  const reasons = []
  const n = completed.length
  let score = 0

  if (n >= minMonths + 3) score += 45
  else if (n >= minMonths) score += 35
  else if (n === 2) score += 18
  else if (n === 1) score += 8
  else reasons.push('too-few-months')

  const variability = cv(totals)
  if (n >= 2) {
    if (variability <= 0.15) score += 30
    else if (variability <= 0.3) score += 22
    else if (variability <= 0.45) score += 12
    else { score += 5; reasons.push('high-volatility') }
  }

  const days = completed.reduce((s, m) => s + (m.count || 0), 0)
  if (days >= 45) score += 25
  else if (days >= 20) score += 18
  else if (days >= 8) score += 10
  else { score += 3; reasons.push('sparse-records') }

  const inProgress = series.some((s) => s.key > currentMonth())
  if (inProgress) reasons.push('has-future-records')

  const level = score >= 75 ? 'high' : score >= 45 ? 'medium' : 'low'
  return { level, score: Math.min(100, score), reasons }
}

/* ============================ 六、预算分配 ============================ */

/**
 * 占比自动配平（最大余额法 / 汉密尔顿法）。
 * 把任意一组占比归一到 `target`（默认 100），并可用 min/max 夹取（超限项迭代重分配）。
 * @param items [{ key, pct, min?, max? }]
 * @returns 与输入等长、顺序一致的新数组（附带 `pct` 已配平）
 */
export function balancePercentages(items, { target = 100 } = {}) {
  const arr = (items || []).map((it) => ({
    ...it,
    pct: Math.max(toNum(it.min) || 0, Math.min(toNum(it.max) || Infinity, toNum(it.pct)))
  }))
  if (!arr.length) return arr

  for (let pass = 0; pass < 6; pass++) {
    const total = arr.reduce((s, a) => s + toNum(a.pct), 0)
    if (!total) {
      const each = target / arr.length
      arr.forEach((a) => { a.pct = Math.round(each * 100) / 100 })
      return arr
    }
    const scaled = arr.map((a) => (a.pct / total) * target)
    const floored = scaled.map((v) => Math.floor(v))
    let remain = Math.round(target - floored.reduce((s, v) => s + v, 0))
    const order = scaled
      .map((v, i) => ({ i, frac: v - Math.floor(v) }))
      .sort((a, b) => b.frac - a.frac)
    for (let k = 0; k < order.length && remain > 0; k++, remain--) floored[order[k].i] += 1
    arr.forEach((a, i) => { a.pct = floored[i] })
    // 校验夹取边界，超界则夹紧后继续迭代
    let fixed = false
    for (const a of arr) {
      const min = toNum(a.min)
      const max = a.max == null ? Infinity : toNum(a.max)
      if (a.pct < min) { a.pct = min; fixed = true }
      if (a.pct > max) { a.pct = max; fixed = true }
    }
    if (!fixed) break
  }
  return arr
}

/**
 * 结余健康度打分（0~100）。
 * 规则：以「结余率」为主轴，叠加「生活费消耗率」与「超支幅度」修正。
 */
export function healthScore({ income = 0, expense = 0, allowance = 0 } = {}) {
  const inc = toNum(income)
  const exp = toNum(expense)
  const alw = toNum(allowance)
  const bal = round2(inc - exp)
  let score
  if (inc <= 0) {
    score = bal >= 0 ? 60 : Math.max(0, 60 - Math.min(60, (exp / 100) * 5))
    return { score: Math.round(score), grade: gradeOf(score), balance: bal, rate: 0, usage: 0 }
  }
  const rate = bal / inc
  if (rate >= 0.5) score = 100
  else if (rate >= 0.3) score = 85
  else if (rate >= 0.15) score = 72
  else if (rate >= 0) score = 60
  else score = Math.max(0, 60 - Math.min(60, Math.abs(rate) * 100))
  let usage = 0
  if (alw > 0) {
    usage = exp / alw
    if (usage > 1) score = Math.max(0, score - Math.min(25, (usage - 1) * 50))
    else if (usage > 0.9) score = Math.max(0, score - 8)
  }
  return {
    score: Math.round(score),
    grade: gradeOf(score),
    balance: bal,
    rate: Math.round(rate * 1000) / 1000,
    usage: Math.round(usage * 1000) / 1000
  }
}

function gradeOf(score) {
  if (score >= 85) return 'excellent'
  if (score >= 70) return 'good'
  if (score >= 50) return 'fair'
  if (score >= 30) return 'tight'
  return 'danger'
}

/**
 * 剩余生活费日预算：把「本月剩余生活费 ÷ 剩余天数」拆成建议日限额，
 * 并给出「已超支 / 需收紧 / 从容」三种节奏判定。
 */
export function dailyAllowancePlan({ allowance = 0, spent = 0, now = new Date() } = {}) {
  const dim = daysInMonth(currentMonth(now))
  const dom = dayOfMonth(now)
  const leftDays = Math.max(1, dim - dom + 1)
  const remain = round2(toNum(allowance) - toNum(spent))
  const perDay = round2(remain / leftDays)
  const elapsed = Math.max(1, dom - 1)
  const pace = round2(toNum(spent) / elapsed)
  let status = 'on-track'
  if (remain < 0) status = 'over'
  else if (perDay < pace * 0.6) status = 'tighten'
  else if (perDay > pace * 1.4) status = 'relaxed'
  return { remain, leftDays, perDay, pace, status, daysInMonth: dim, dayOfMonth: dom }
}

/* ============================ 七、趋势预测 ============================ */

/** 一元线性回归，返回斜率 / 截距 / 拟合优度 R²。 */
export function linearRegression(ys) {
  const a = (ys || []).map(toNum)
  const n = a.length
  if (n < 2) return { slope: 0, intercept: n ? a[0] : 0, r2: 0, predict: (x) => (n ? a[0] : 0) }
  const xs = a.map((_, i) => i)
  const mx = xs.reduce((s, x) => s + x, 0) / n
  const my = a.reduce((s, y) => s + y, 0) / n
  let sxy = 0; let sxx = 0; let syy = 0
  for (let i = 0; i < n; i++) {
    sxy += (xs[i] - mx) * (a[i] - my)
    sxx += (xs[i] - mx) ** 2
    syy += (a[i] - my) ** 2
  }
  const slope = sxx ? sxy / sxx : 0
  const intercept = my - slope * mx
  const r2 = syy ? Math.max(0, Math.min(1, (sxy * sxy) / (sxx * syy))) : 0
  return {
    slope: Math.round(slope * 100) / 100,
    intercept: Math.round(intercept * 100) / 100,
    r2: Math.round(r2 * 1000) / 1000,
    predict: (x) => round2(intercept + slope * x)
  }
}

/**
 * Holt 线性指数平滑（含水平与趋势双平滑），返回拟合值与预测函数。
 * α 控制水平跟随、β 控制趋势跟随；默认取经验值 0.5 / 0.3。
 */
export function holtLinear(ys, { alpha = 0.5, beta = 0.3 } = {}) {
  const a = (ys || []).map(toNum)
  if (a.length < 2) {
    const v = a[0] || 0
    return { fitted: a.slice(), predict: () => round2(v), level: v, trend: 0 }
  }
  let level = a[0]
  let trend = a[1] - a[0]
  const fitted = [a[0]]
  for (let i = 1; i < a.length; i++) {
    const prevLevel = level
    level = alpha * a[i] + (1 - alpha) * (level + trend)
    trend = beta * (level - prevLevel) + (1 - beta) * trend
    fitted.push(round2(level))
  }
  return { fitted, level: round2(level), trend: round2(trend), predict: (h = 1) => round2(level + trend * h) }
}

/** 平均绝对百分比误差（忽略真值为 0 的点）。 */
export function mape(actual, fitted) {
  let s = 0
  let n = 0
  for (let i = 0; i < actual.length; i++) {
    const a = toNum(actual[i])
    if (!a) continue
    s += Math.abs(a - toNum(fitted[i])) / Math.abs(a)
    n++
  }
  return n ? Math.round((s / n) * 1000) / 1000 : 0
}

/**
 * 趋势预测：在线性回归与 Holt 平滑之间按样本内 MAPE 择优，外推 horizon 个月。
 * @returns { method, points:[{h, value}], trend, confidence, slope, r2, mape }
 */
export function forecast(ys, { horizon = 1 } = {}) {
  const a = (ys || []).map(toNum)
  if (a.length < 2) {
    const v = a.length ? a[a.length - 1] : 0
    return {
      method: 'naive',
      points: Array.from({ length: horizon }, (_, i) => ({ h: i + 1, value: round2(v) })),
      slope: 0, r2: 0, mape: 0, confidence: 'low'
    }
  }
  const lin = linearRegression(a)
  const holt = holtLinear(a)
  const mapeLin = mape(a, a.map((_, i) => lin.predict(i)))
  const mapeHolt = mape(a, holt.fitted)
  const useHolt = mapeHolt < mapeLin
  const points = Array.from({ length: horizon }, (_, i) => {
    const h = i + 1
    const value = useHolt ? holt.predict(h) : lin.predict(a.length - 1 + h)
    return { h, value: round2(Math.max(0, value)) }
  })
  const err = useHolt ? mapeHolt : mapeLin
  const confidence = a.length >= 6 && err <= 0.12 ? 'high' : a.length >= 4 && err <= 0.25 ? 'medium' : 'low'
  return {
    method: useHolt ? 'holt' : 'linear',
    points,
    slope: lin.slope,
    r2: lin.r2,
    mape: err,
    confidence
  }
}

/* ============================ 八、目标与情景推演 ============================ */

/**
 * 攒钱目标推演：每月先扣固定储蓄，再看剩余可支配额是否够花。
 * @returns { monthlySave, monthlyDisposable, monthsToGoal, feasible, gap, adviceCode }
 */
export function savingsPlan({ income = 0, expense = 0, goal = 0, months = 12 } = {}) {
  const inc = toNum(income)
  const exp = toNum(expense)
  const surplus = round2(inc - exp)
  const monthlyCapacity = Math.max(0, surplus)
  const monthsToGoal = monthlyCapacity > 0 ? Math.ceil(toNum(goal) / monthlyCapacity) : Infinity
  const targetSave = toNum(goal) > 0 && Number.isFinite(monthsToGoal) && monthlyCapacity > 0
    ? round2(toNum(goal) / Math.min(months, monthsToGoal))
    : 0
  const disposable = round2(inc - exp - targetSave)
  return {
    surplus,
    monthlyCapacity,
    monthlySave: targetSave,
    monthlyDisposable: disposable,
    monthsToGoal: Number.isFinite(monthsToGoal) ? monthsToGoal : null,
    feasible: monthlyCapacity > 0,
    gap: round2(Math.max(0, exp + targetSave - inc)),
    adviceCode: monthlyCapacity <= 0 ? 'no-surplus' : disposable < 0 ? 'tight' : 'ok'
  }
}

/**
 * 情景推演：给定三项习惯档位（伙食/社交/购物，各 1~3）与城市系数，
 * 用「基准 + 增量」模型给出建议区间，替代旧版的硬编码查表。
 * @param price 城市物价系数（1 = 基准；青岛/福州 1.0 / 1.05 之类）
 */
export function estimateRange({ meal = 2, social = 2, shop = 2, base = 1250, price = 1, semesterBoost = 0 } = {}) {
  const MI = { 1: 0, 2: 95, 3: 210 }
  const SI = { 1: -70, 2: 0, 3: 130 }
  const PI = { 1: -60, 2: 0, 3: 150 }
  const mid = Math.round((base + (MI[meal] || 0) + (SI[social] || 0) + (PI[shop] || 0)) * price * (1 + semesterBoost))
  const lo = Math.round((mid * 0.86) / 10) * 10
  const hi = Math.round((mid * 1.16) / 10) * 10
  return { mid, lo, hi }
}

/* ============================ 九、导出聚合（供 UI 直接消费） ============================ */

/**
 * 一站式分析：UI 只需调用一次。
 */
export function analyze(records, { now = new Date(), minMonths = 3 } = {}) {
  const calib = calibrate(records, { now, minMonths })
  const expSeries = calib.series.filter((s) => s.exp > 0 || s.count > 0).map((s) => s.exp)
  const fc = expSeries.length >= 2 ? forecast(expSeries, { horizon: 3 }) : { method: 'none', points: [], slope: 0, r2: 0, mape: 0, confidence: 'low' }
  const currentExpense = calib.current ? calib.current.spent : 0
  const allowance = sumBy((records || []).filter((r) => r.type === 'income' && r.cat === 'allowance' && monthKey(r.date) === currentMonth(now)), amountOf)
  const daily = dailyAllowancePlan({ allowance, spent: currentExpense, now })
  return { calib, forecast: fc, daily }
}

export default {
  round2, toNum, sumBy, sum, mean, median, quantile, stdDev, cv, mad, iqr, trimmedMean,
  outliers, robustAverage, monthKey, daysInMonth, monthOffset, currentMonth, dayOfMonth,
  groupByMonth, monthlySeries, projectMonth, categoryBreakdown, merchantBreakdown,
  recurringCharges, calibrate, assessConfidence, balancePercentages, healthScore,
  dailyAllowancePlan, linearRegression, holtLinear, mape, forecast, savingsPlan,
  estimateRange, analyze, amountOf
}
