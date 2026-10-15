/**
 * 记账数据备份 / 恢复 —— 纯函数 · 零依赖 · 可单测
 *
 * 背景：本站所有记账数据只存在本机 localStorage，页面上多处写着「清缓存会丢失」。
 * 一旦用户清理浏览器数据、换设备或换浏览器，几个月的记账就没了。本模块提供一条
 * 完全本地的**导出 JSON → 导入恢复**通道，让用户能把数据攥在自己手里。
 *
 * 设计原则：
 *   1. 只读不改：`buildBackup` 不改动传入的记录数组；
 *   2. 宽容导入：外部 JSON 可能来自旧版本或被手工编辑过，逐条规范化 + 丢弃非法项，绝不因一条脏数据整包失败；
 *   3. 可幂等合并：`mergeRecords` 按指纹去重，重复导入同一份备份不会翻倍；
 *   4. 无损导出：保留记录上的全部字段（含 `merchant` / `time` / `refunded` 等扩展字段）。
 */

/** 备份文件格式版本（结构变更时递增，`migrateBackup` 按此兼容旧包） */
export const BACKUP_FORMAT = 2

/** 合法分类白名单：用于把外部数据里的未知分类收敛到 other，避免污染统计 */
const EXP_CATS = ['food', 'party', 'transport', 'fruit', 'study', 'cloth', 'medical', 'daily', 'phone', 'fun', 'beauty', 'digital', 'sport', 'virtual', 'housing', 'transfer', 'trouble', 'other']
const INC_CATS = ['allowance', 'scholarship', 'parttime', 'prize', 'resale', 'refund', 'invest', 'transfer', 'other']

function round2(n) {
  const v = Math.round((Number(n) + Number.EPSILON) * 100) / 100
  return Object.is(v, -0) ? 0 : v
}

function str(v, max = 200) {
  return String(v == null ? '' : v).slice(0, max)
}

/** 日期规范化为 yyyy-mm-dd；非法日期返回空串（由调用方决定丢弃或补今天） */
export function normalizeDate(v, fallback = '') {
  const s = String(v == null ? '' : v)
  const m = s.match(/(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return fallback
  const [, y, mo, d] = m
  const mi = Number(mo)
  const di = Number(d)
  if (mi < 1 || mi > 12 || di < 1 || di > 31) return fallback
  return `${y}-${mo}-${d}`
}

/**
 * 规范化单条记录：非法返回 null（调用方过滤掉）。
 * 容忍：字符串金额、负号金额（取绝对值）、未知分类（收敛为 other）、缺少 id（补一个）。
 */
export function normalizeRecord(raw, now = Date.now()) {
  if (!raw || typeof raw !== 'object') return null
  const type = raw.type === 'income' ? 'income' : raw.type === 'expense' ? 'expense' : null
  if (!type) return null
  const amount = round2(Math.abs(Number(raw.amount)))
  if (!Number.isFinite(amount) || amount <= 0 || amount > 99999999) return null
  const date = normalizeDate(raw.date)
  if (!date) return null
  const allowed = type === 'income' ? INC_CATS : EXP_CATS
  const cat = allowed.includes(raw.cat) ? raw.cat : 'other'
  const rec = {
    id: Number.isFinite(Number(raw.id)) ? Number(raw.id) : now + Math.random(),
    type,
    cat,
    amount,
    note: str(raw.note, 120),
    date
  }
  if (raw.time) rec.time = str(raw.time, 8)
  if (raw.merchant) rec.merchant = str(raw.merchant, 40)
  if (raw.refunded) rec.refunded = true
  return rec
}

/** 记录指纹（与 billImport.recordFingerprint 同口径，用于去重；不依赖 id） */
export function fingerprint(r) {
  return [r.date, r.time || '', r.amount, r.type, r.cat, r.note || ''].join('|')
}

/** 汇总一份记录的规模信息（导出后展示给用户看「备份了什么」） */
export function summarize(records) {
  const list = records || []
  let inc = 0
  let exp = 0
  let min = ''
  let max = ''
  for (const r of list) {
    const a = Math.abs(Number(r.amount) || 0)
    if (r.type === 'income') inc = round2(inc + a)
    else exp = round2(exp + a)
    const d = normalizeDate(r.date)
    if (d) {
      if (!min || d < min) min = d
      if (!max || d > max) max = d
    }
  }
  return { count: list.length, income: inc, expense: exp, balance: round2(inc - exp), firstDate: min, lastDate: max }
}

/**
 * 构造备份对象。
 * @param records 记录数组
 * @param meta 额外元信息（如 { app: 'QDU-Nav', version: '1.7.0' }）
 */
export function buildBackup(records, meta = {}, now = new Date()) {
  const list = (records || []).map((r) => normalizeRecord(r)).filter(Boolean)
  return {
    format: BACKUP_FORMAT,
    kind: 'budget-records',
    exportedAt: now.toISOString(),
    app: str(meta.app, 40),
    version: str(meta.version, 20),
    summary: summarize(list),
    records: list
  }
}

/** 序列化成可下载的 JSON 文本（2 空格缩进，方便用户自己看/改） */
export function serializeBackup(backup) {
  return JSON.stringify(backup, null, 2)
}

/**
 * 解析备份文本。容忍三种形态：
 *   ① 本模块导出的完整备份对象（`{ records: [...] }`）；
 *   ② 直接是记录数组 `[...]`；
 *   ③ 旧版裸对象 `{ data: [...] }`。
 * @returns { ok, error?, records, meta }
 */
export function parseBackup(text) {
  let obj = null
  try {
    obj = JSON.parse(String(text || ''))
  } catch {
    return { ok: false, error: 'not-json', records: [], meta: {} }
  }
  let raw = null
  let meta = {}
  if (Array.isArray(obj)) raw = obj
  else if (obj && Array.isArray(obj.records)) {
    raw = obj.records
    meta = { format: obj.format, exportedAt: obj.exportedAt, app: obj.app, version: obj.version }
  } else if (obj && Array.isArray(obj.data)) raw = obj.data
  if (!raw) return { ok: false, error: 'no-records', records: [], meta }

  const now = Date.now()
  const seen = new Set()
  const records = []
  let dropped = 0
  let dup = 0
  for (const item of raw) {
    const r = normalizeRecord(item, now)
    if (!r) { dropped++; continue }
    const fp = fingerprint(r)
    if (seen.has(fp)) { dup++; continue }
    seen.add(fp)
    records.push(r)
  }
  if (!records.length) return { ok: false, error: 'all-invalid', records: [], meta: { ...meta, dropped } }
  return { ok: true, records, meta: { ...meta, dropped, dup } }
}

/**
 * 合并导入记录与现有记录。
 * @param mode 'append' 追加去重（默认）| 'replace' 全部替换
 * @returns { records, added, dup }
 */
export function mergeRecords(existing, incoming, { mode = 'append' } = {}) {
  const cur = (existing || []).map((r) => normalizeRecord(r)).filter(Boolean)
  const inc = (incoming || []).map((r) => normalizeRecord(r)).filter(Boolean)
  if (mode === 'replace') {
    return { records: inc, added: inc.length, dup: 0 }
  }
  const seen = new Set(cur.map(fingerprint))
  const merged = [...cur]
  let added = 0
  let dup = 0
  for (const r of inc) {
    const fp = fingerprint(r)
    if (seen.has(fp)) { dup++; continue }
    seen.add(fp)
    merged.push(r)
    added++
  }
  return { records: merged, added, dup }
}

/** 生成备份文件名（带日期，便于用户区分多份备份） */
export function backupFileName(prefix = 'budget', now = new Date()) {
  const p = (n) => String(n).padStart(2, '0')
  return `${prefix}-backup-${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}-${p(now.getHours())}${p(now.getMinutes())}.json`
}

export default {
  BACKUP_FORMAT,
  normalizeDate,
  normalizeRecord,
  fingerprint,
  summarize,
  buildBackup,
  serializeBackup,
  parseBackup,
  mergeRecords,
  backupFileName
}
