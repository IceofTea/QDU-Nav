/**
 * 账单导入解析器：兼容真实微信 / 支付宝 / 建设银行账单文件
 *   - 自动识别 xlsx（zip）、xls（OLE2/BIFF8）与文本（CSV/竖线/制表符分隔）
 *   - 文本自动探测编码（UTF-8 BOM / UTF-8 / GBK）与分隔符
 *   - 按「收/支」区分收支，忽略「不计收支 / 中性交易 / 关闭 / 失败 / 提现充值」等无效记录
 *   - 优先用支付宝「交易分类」归类，微信 / 建行退化为关键词猜测
 *   - 每条记录附带 merchant（商户名）供「同商户聚合」分析
 *   - 退款自动冲抵同商户同金额的原支出，避免虚增收支
 *   纯前端本地解析：不发起任何网络请求，数据仅存本机浏览器。
 */
import { parseXls } from './xlsReader.js'
const ALIPAY_CAT_MAP = {
  '餐饮美食': 'food',
  '日用百货': 'daily',
  '交通出行': 'transport',
  '爱车养车': 'transport',
  '服饰装扮': 'cloth',
  '美容美发': 'beauty',
  '休闲娱乐': 'fun',
  '医疗健康': 'medical',
  '教育文化': 'study',
  '网络虚拟': 'virtual',
  '数码家电': 'digital',
  '房屋住宅': 'housing',
  '运动户外': 'sport',
  '生活服务': 'daily',
  '充值缴费': 'phone',
  '其他': 'other'
}

const KEYWORDS = [
  { key: 'food', words: ['食堂', '餐', '饭', '外卖', '奶茶', '咖啡', '果', '零食', '面', '饺', '烧烤', '火锅', '汉堡', '小吃', '买菜', '菜场', '餐厅', '麦乐送', '烘焙', '蛋糕', '早餐', '粉', '麻辣', '香锅', '米线', '肠', '饼', '牛奶', '甜品', '糖'] },
  { key: 'party', words: ['聚餐', '团建', '约饭', '啤酒', '宵夜', '串串', '烧烤店', '火锅店'] },
  { key: 'transport', words: ['公交', '地铁', '打车', '滴滴', '高铁', '火车', '共享', '加油', '停车', '飞机', '高速', '停车费', '地铁卡', '公交卡', '铁路', '航空', '加油卡'] },
  { key: 'beauty', words: ['理发', '美发', '美容', '美甲', '护肤', '面膜', '造型', '染发', '剪发', 'spa'] },
  { key: 'digital', words: ['手机', '电脑', '数码', '耳机', '充电', '硬盘', '键盘', '家电', '电器', '显示器', '平板', '摄像头', '路由器', '智能', '华为支付'] },
  { key: 'sport', words: ['健身', '运动', '球', '羽毛球', '乒乓球', '跑步', '瑜伽', '游泳', '健身房', '户外', '登山', '篮球', '足球', '骑行'] },
  { key: 'virtual', words: ['游戏', 'steam', '会员', '点卡', 'vip', '王者', '原神', '皮肤', '月卡', '视频会员'] },
  { key: 'housing', words: ['房租', '水费', '电费', '燃气', '物业', '宿舍', '宽带', '热水', '酒店', '如家', '民宿', '公寓', '宾馆', '汉庭'] },
  { key: 'study', words: ['书', '教材', '打印', '文具', '资料', '报名', '考研', '考证', '学费', '课程'] },
  { key: 'cloth', words: ['衣', '服', '鞋', '裤', '帽', '穿搭', '卫衣', '外套', '裙'] },
  { key: 'medical', words: ['药', '医院', '挂号', '体检', '口罩', '诊所', '门诊', '药店'] },
  { key: 'daily', words: ['洗发', '纸巾', '洗衣', '牙膏', '毛巾', '日用', '生活', '洗涤', '纸'] },
  { key: 'phone', words: ['话费', '流量', '移动', '联通', '电信', '校园网', '宽带', '缴费'] },
  { key: 'fun', words: ['电影', 'ktv', '演出', '门票', '密室', '桌游', '景区', '乐园', '猫眼', '大麦', '影院', 'ktv'] },
  { key: 'transfer', words: ['转账', '红包'] }
]

const STATUS_DROP = ['关闭', '失败', '超时', '作废', '撤销', '已退款', '取消']
const KIND_DROP = ['不计收支', '中性交易', '/', '-', '']

const HEADER_ALIASES = {
  time: ['交易时间', '交易创建时间'],
  kind: ['收/支'],
  amount: ['金额(元)', '金额（元）', '金额'],
  name: ['商品名称', '商品说明', '商品'],
  party: ['交易对方', '对方账号'],
  status: ['当前状态', '交易状态'],
  note: ['备注'],
  category: ['交易分类', '交易类型'],
  orderNo: ['交易单号', '商户单号']
}

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function cleanCell(v) {
  return String(v == null ? '' : v).replace(/^=/, '').trim()
}

function parseAmount(raw) {
  const m = String(raw == null ? '' : raw).match(/[\d.]+/)
  const n = m ? Number(m[0]) : NaN
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0
}

function parseDate(raw) {
  if (raw == null || raw === '') return todayStr()
  const s = String(raw)
  const m = s.match(/\d{4}-\d{2}-\d{2}/)
  if (m) return m[0]
  const n = Number(s)
  if (Number.isFinite(n) && n > 20000 && n < 60000) {
    const d = new Date(Date.UTC(1899, 11, 30) + n * 86400000)
    if (!Number.isNaN(d.getTime())) {
      return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
    }
  }
  return todayStr()
}

function dropStatus(status) {
  const s = String(status == null ? '' : status)
  if (!s) return false
  return STATUS_DROP.some((k) => s.includes(k))
}

function guessCat(text, category) {
  if (category) {
    const mapped = ALIPAY_CAT_MAP[category]
    if (mapped && mapped !== 'other') return mapped
  }
  const t = (text || '').toLowerCase()
  for (const kw of KEYWORDS) {
    if (kw.words.some((w) => t.includes(w))) return kw.key
  }
  return 'other'
}

/** 从商品名 / 备注中提取「商户名」用于同商户聚合（去掉订单编号/外卖订单/括号门店等噪声） */
const MERCHANT_STOP = ['外卖订单', '订单编号', '订单', '收款方备注', '转账备注', '二维码收款', '经营码', '到店支付', '红包', '返现', '退款', '账单', '付款']
function cleanMerchant(text) {
  let s = String(text || '').trim()
  s = s.replace(/^[·•:：\-—_——\s]+/, '')
  s = s.replace(/^(退款|退货|售后退款|退款成功)[-—:：\s]*/i, '')
  for (const w of MERCHANT_STOP) {
    const i = s.indexOf(w)
    if (i > 0) s = s.slice(0, i)
  }
  s = s.replace(/[（(][^）)]*[）)]/g, '').replace(/[（(].*$/, '')
  return s.trim().slice(0, 24)
}
function extractMerchant(note, party) {
  return cleanMerchant(note) || cleanMerchant(party) || ''
}

/** 建行账单：识别账户内部中转 / 充值 / 投资等污染项（不应计入收支）。
 *  仅跳过「账户自身资金移动」（余额宝/零钱/充值/还款/投资理财），
 *  平台收益提现（抖音/快手/平台/签到奖励等）属真实收入，予以保留。 */
function isCcbTransfer(summary, note) {
  const t = `${summary} ${note}`
  if (/余额宝|零钱通|微信零钱|零钱提现|支付宝|基金|理财|证券|股票|还款|龙支付充值|银行卡转入|银行卡转出|定期/.test(t)) return true
  if (/充值|转入|转出/.test(summary)) return true
  return false
}
/** 建行流水「交易地点/附言」提取真实商户：截取「支付」后、跳过公司/通道段 */
function ccbMerchant(note) {
  let s = String(note || '').trim()
  const pi = s.indexOf('支付')
  if (pi >= 0) s = s.slice(pi + 2)
  const segs = s.split(/[-_—]/).map((x) => x.trim()).filter(Boolean)
  if (!segs.length) return ''
  const noise = /(公司|信息|网络科技|银行|中心|平台|商户|商家|账号|卡)$/
  let pick = segs[segs.length - 1]
  for (let i = segs.length - 1; i >= 0; i--) {
    if (!noise.test(segs[i])) { pick = segs[i]; break }
  }
  return pick.slice(0, 24)
}
function parseCcbDate(raw) {
  const m = String(raw == null ? '' : raw).match(/(\d{4})(\d{2})(\d{2})/)
  return m ? `${m[1]}-${m[2]}-${m[3]}` : todayStr()
}

/** 退款冲抵：微信「退款」收入自动抵消同商户同金额的原支出（找不到原支出则丢弃退款），避免虚增收支 */
function applyRefundOffset(added) {
  const refunds = added.filter((r) => r.type === 'income' && r.cat === 'refund')
  if (!refunds.length) return 0
  let used = 0
  const result = added.filter((r) => !(r.type === 'income' && r.cat === 'refund'))
  for (const rf of refunds) {
    const idx = result.findIndex(
      (r) => r.type === 'expense' && r.cat !== 'transfer' && Math.abs(r.amount - rf.amount) < 0.01 && r.merchant && r.merchant === rf.merchant
    )
    if (idx >= 0) {
      result[idx].refunded = true
      used++
    }
  }
  if (used) {
    added.length = 0
    added.push(...result)
  }
  return used
}

/** 建行（xls）账单解析 */
async function parseCcbBill(bytes) {
  let grid
  try {
    grid = parseXls(bytes)
  } catch (e) {
    return { ok: false, msg: 'xls 文件解析失败：' + (e.message || '无法读取工作簿内容') }
  }
  const rows = grid || []
  let headIdx = -1
  for (let i = 0; i < Math.min(rows.length, 60); i++) {
    const cells = rows[i] || []
    if (cells.some((c) => String(c).includes('摘要')) && cells.some((c) => String(c).includes('交易金额'))) { headIdx = i; break }
  }
  if (headIdx < 0) {
    return { ok: false, msg: '未识别到建行账单表头（需含「摘要」「交易金额」「交易日期」）。' }
  }
  const head = rows[headIdx]
  const iSum = head.findIndex((c) => String(c).includes('摘要'))
  const iDate = head.findIndex((c) => String(c).includes('交易日期'))
  const iAmt = head.findIndex((c) => String(c).includes('交易金额'))
  const iNote = head.findIndex((c) => String(c).includes('附言'))
  const iParty = head.findIndex((c) => String(c).includes('户名'))
  const added = []
  const skipped = { neutral: 0, closed: 0 }
  for (let i = headIdx + 1; i < rows.length; i++) {
    const cell = rows[i] || []
    const get = (j) => (j >= 0 && j < cell.length ? cleanCell(cell[j]) : '')
    const summary = get(iSum)
    if (!summary) continue
    const amtNum = parseFloat(String(get(iAmt)).replace(/[,，\s¥元]/g, ''))
    if (!Number.isFinite(amtNum) || amtNum === 0) continue
    const note = get(iNote) || ''
    const party = get(iParty) || ''
    if (isCcbTransfer(summary, note)) { skipped.neutral++; continue }
    const kind = amtNum > 0 ? 'income' : 'expense'
    const amt = Math.abs(Math.round(amtNum * 100) / 100)
    let cat = 'other'
    if (kind === 'income') {
      if (/利息|结息/.test(summary)) cat = 'invest'
      else if (/转账|汇款|转入/.test(summary) && /工资|薪|代发|转账/.test(note + summary)) cat = 'transfer'
      else if (/抖音|快手|平台|签到|奖励|金币|积分|红包|提现成功|活动|佣金|收入/.test(note)) cat = 'prize'
      else cat = guessCat(`${note} ${summary}`, '')
    } else if (/转账|汇款|转出/.test(summary)) {
      cat = 'transfer'
    } else if (/取款|存取/.test(summary) && !/消费/.test(summary)) {
      cat = 'other'
    } else {
      cat = guessCat(`${note} ${summary}`, '')
    }
    added.push({
      type: kind,
      cat,
      amount: amt,
      note: note || summary,
      date: parseCcbDate(get(iDate)),
      merchant: ccbMerchant(note) || cleanMerchant(party) || cleanMerchant(summary)
    })
  }
  if (!added.length) {
    return { ok: false, msg: `建行账单中未找到可导入的收支记录（已自动跳过提现 / 充值 / 中转类 ${skipped.neutral} 笔）。` }
  }
  const refunded = applyRefundOffset(added)
  if (refunded) skipped.refunded = refunded
  return { ok: true, source: 'xls', brand: 'ccb', added, skipped }
}

function buildHeaderMap(cols) {
  const map = {}
  for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
    let found = -1
    for (const a of aliases) {
      const i = cols.findIndex((c) => cleanCell(c) === a || cleanCell(c).includes(a))
      if (i >= 0) { found = i; break }
    }
    map[field] = found
  }
  return map
}

function buildRecords(rows, headIdx, cols, maxCols) {
  const map = buildHeaderMap(cols)
  const added = []
  const skipped = { closed: 0, neutral: 0 }
  const brand = cols.some((c) => cleanCell(c) === '交易分类') ? 'alipay' : 'wechat'
  for (let i = headIdx + 1; i < rows.length; i++) {
    const cell = rows[i]
    const get = (f) => {
      const j = map[f]
      return j >= 0 && j < cell.length ? cleanCell(cell[j]) : ''
    }
    const kind = get('kind')
    if (KIND_DROP.includes(kind)) {
      skipped.neutral++
      continue
    }
    if (kind !== '收入' && kind !== '支出') continue
    const status = get('status')
    if (status && dropStatus(status)) {
      skipped.closed++
      continue
    }
    const amt = parseAmount(get('amount'))
    if (!amt || amt <= 0 || amt > 999999) continue
    const name = get('name') || ''
    const party = get('party') || ''
    const noteText = get('note')
    const category = get('category')
    let cat = 'other'
    if (brand === 'alipay') {
      if (kind === '收入') {
        if (category === '投资理财') cat = 'invest'
        else if (category === '退款') cat = 'refund'
        else if (category === '转账红包') cat = 'transfer'
        else cat = guessCat(`${name} ${party}`, category)
      } else {
        if (category === '投资理财') continue
        if (category === '转账红包') cat = 'transfer'
        else cat = guessCat(`${name} ${party}`, category)
      }
    } else {
      if (category === '转账' || category.includes('二维码收款')) cat = 'transfer'
      else if (category === '退款') cat = kind === '收入' ? 'refund' : 'other'
      else cat = guessCat(`${name} ${party}`, '')
    }
    let note = ''
    if (noteText && noteText !== '/') note = noteText
    else if (name && /^(收款方备注|转账备注)[：:]/.test(name)) note = name.replace(/^(收款方备注|转账备注)[：:]?/, '').trim() || party
    else if (name && !/^订单编号/.test(name) && name !== '/') note = name
    else note = party
    added.push({
      type: kind === '收入' ? 'income' : 'expense',
      cat,
      amount: amt,
      note: note || get('orderNo') || '',
      date: parseDate(get('time')),
      merchant: extractMerchant(name, party)
    })
  }
  return { added, skipped, brand }
}

/* ---------- 文本（CSV / 竖线 / 制表符）解析 ---------- */
function decodeText(bytes) {
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return new TextDecoder('utf-8').decode(bytes.subarray(3))
  }
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    return new TextDecoder('gbk').decode(bytes)
  }
}

function detectDelimiter(text) {
  const lines = text.split(/\r?\n/)
  const cands = [',', '|', '\t', ';']
  let best = ','
  let bestCount = 0
  for (const line of lines) {
    if (!line.includes('收/支')) continue
    for (const d of cands) {
      const c = line.split(d).length - 1
      if (c > bestCount) { bestCount = c; best = d }
    }
    break
  }
  return best
}

function parseDelimited(text, delim) {
  const rows = []
  let row = []
  let field = ''
  let inQ = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQ) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++ } else inQ = false
      } else field += ch
    } else if (ch === '"') {
      inQ = true
    } else if (ch === delim) {
      row.push(field); field = ''
    } else if (ch === '\n') {
      row.push(field)
      if (row.some((c) => c.trim() !== '')) rows.push(row)
      row = []; field = ''
    } else if (ch !== '\r') {
      field += ch
    }
  }
  if (field !== '' || row.length) {
    row.push(field)
    if (row.some((c) => c.trim() !== '')) rows.push(row)
  }
  return rows
}

function findHeader(rows, cols) {
  for (let i = 0; i < Math.min(rows.length, 80); i++) {
    if (rows[i].some((c) => cleanCell(c).includes('收/支'))) return i
  }
  return -1
}

function parseTextBill(bytes) {
  const text = decodeText(bytes)
  const delim = detectDelimiter(text)
  const rows = parseDelimited(text, delim)
  const headIdx = findHeader(rows, delim)
  if (headIdx < 0) {
    return { ok: false, msg: '未识别到账单表头（需包含「收/支」「金额」列），请确认是微信 / 支付宝导出的账单文件。' }
  }
  const cols = rows[headIdx]
  const { added, skipped, brand } = buildRecords(rows, headIdx, cols)
  const refunded = applyRefundOffset(added)
  if (refunded) skipped.refunded = refunded
  return { ok: true, source: 'text', brand, added, skipped }
}

/* ---------- xlsx（zip + XML）解析 ---------- */
function findEocd(buf) {
  const u8 = new Uint8Array(buf)
  for (let i = buf.byteLength - 22; i >= 0; i--) {
    if (u8[i] === 0x50 && u8[i + 1] === 0x4b && u8[i + 2] === 0x05 && u8[i + 3] === 0x06) return i
  }
  return -1
}

function parseZipEntries(buf) {
  const dv = new DataView(buf)
  const u8 = new Uint8Array(buf)
  const eocd = findEocd(buf)
  if (eocd < 0) return null
  const count = dv.getUint16(eocd + 10, true)
  const cdOff = dv.getUint32(eocd + 16, true)
  const entries = {}
  let p = cdOff
  for (let i = 0; i < count; i++) {
    if (dv.getUint32(p, true) !== 0x02014b50) break
    const method = dv.getUint16(p + 10, true)
    const csize = dv.getUint32(p + 20, true)
    const nameLen = dv.getUint16(p + 28, true)
    const extraLen = dv.getUint16(p + 30, true)
    const commentLen = dv.getUint16(p + 32, true)
    const lho = dv.getUint32(p + 42, true)
    let name = ''
    for (let k = 0; k < nameLen; k++) name += String.fromCharCode(u8[p + 46 + k])
    entries[name] = { method, csize, lho }
    p += 46 + nameLen + extraLen + commentLen
  }
  return entries
}

function extractEntry(buf, entry) {
  const dv = new DataView(buf)
  const lho = entry.lho
  const nameLen = dv.getUint16(lho + 26, true)
  const extraLen = dv.getUint16(lho + 28, true)
  const dataStart = lho + 30 + nameLen + extraLen
  const raw = buf.slice(dataStart, dataStart + entry.csize)
  if (entry.method === 0) return Promise.resolve(new Uint8Array(raw))
  if (entry.method !== 8) return Promise.reject(new Error('不支持的压缩方式'))
  return inflateRaw(raw)
}

async function inflateRaw(bytes) {
  const ds = new DecompressionStream('deflate-raw')
  const stream = new Blob([bytes]).stream().pipeThrough(ds)
  const ab = await new Response(stream).arrayBuffer()
  return new Uint8Array(ab)
}

function xmlDecode(s) {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
}

function parseSharedStrings(xml) {
  const out = []
  const re = /<si>([\s\S]*?)<\/si>/g
  let m
  while ((m = re.exec(xml))) {
    const tRe = /<t(?:[^>]*)>([\s\S]*?)<\/t>/g
    let parts = []
    let t
    while ((t = tRe.exec(m[1]))) parts.push(xmlDecode(t[1]))
    out.push(parts.join(''))
  }
  return out
}

function colIndex(ref) {
  const m = /^([A-Z]+)/.exec(ref || '')
  if (!m) return -1
  let n = 0
  for (const ch of m[1]) n = n * 26 + (ch.charCodeAt(0) - 64)
  return n - 1
}

function parseSheet(xml, shared) {
  const rows = []
  const rowRe = /<row[^>]*>([\s\S]*?)<\/row>/g
  let rm
  while ((rm = rowRe.exec(xml))) {
    const cells = []
    const cRe = /<c\s+([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g
    let cm
    while ((cm = cRe.exec(rm[1]))) {
      const attrs = cm[1] || ''
      const content = cm[2] || ''
      const ref = /r="([^"]*)"/.exec(attrs)
      const type = /t="([^"]*)"/.exec(attrs)
      const v = /<v>([\s\S]*?)<\/v>/.exec(content)
      const is = /<is>[\s\S]*?<t(?:[^>]*)>([\s\S]*?)<\/t>[\s\S]*?<\/is>/.exec(content)
      let val = ''
      if (type && type[1] === 's' && v) val = shared[parseInt(v[1], 10)] || ''
      else if (type && type[1] === 'inlineStr' && is) val = xmlDecode(is[1])
      else if (v) val = xmlDecode(v[1])
      const idx = colIndex(ref ? ref[1] : '')
      if (idx >= 0) cells[idx] = val
    }
    rows.push(cells)
  }
  return rows
}

async function parseXlsx(u8) {
  const buf = u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength)
  const entries = parseZipEntries(buf)
  if (!entries) return { ok: false, msg: '无法解析 xlsx 文件结构，请确认是微信账单导出的 Excel 文件。' }
  const getXml = async (name) => {
    const e = entries[name]
    if (!e) return null
    const bytes = await extractEntry(buf, e)
    return new TextDecoder('utf-8').decode(bytes)
  }
  const sharedXml = await getXml('xl/sharedStrings.xml')
  const shared = sharedXml ? parseSharedStrings(sharedXml) : []
  let sheetXml = await getXml('xl/worksheets/sheet1.xml')
  if (!sheetXml) {
    const names = Object.keys(entries).filter((n) => /^xl\/worksheets\/sheet\d+\.xml$/.test(n))
    for (const n of names.sort()) {
      sheetXml = await getXml(n)
      if (sheetXml) break
    }
  }
  if (!sheetXml) return { ok: false, msg: 'xlsx 中未找到工作表内容，请确认文件完整。' }
  const rows = parseSheet(sheetXml, shared)
  const headIdx = findHeader(rows, ',')
  if (headIdx < 0) return { ok: false, msg: '未识别到账单表头（需包含「收/支」「金额」列），请确认是微信 / 支付宝导出的账单文件。' }
  const cols = rows[headIdx]
  const { added, skipped, brand } = buildRecords(rows, headIdx, cols)
  const refunded = applyRefundOffset(added)
  if (refunded) skipped.refunded = refunded
  return { ok: true, source: 'xlsx', brand, added, skipped }
}

async function parseBillFile(file) {
  const bytes = new Uint8Array(await file.arrayBuffer())
  const isXlsx = bytes[0] === 0x50 && bytes[1] === 0x4b
  if (isXlsx) return parseXlsx(bytes)
  const isXls = bytes[0] === 0xd0 && bytes[1] === 0xcf && bytes[2] === 0x11 && bytes[3] === 0xe0
  if (isXls) return parseCcbBill(bytes)
  return parseTextBill(bytes)
}

export { parseBillFile, cleanMerchant, extractMerchant, ALIPAY_CAT_MAP, KEYWORDS }