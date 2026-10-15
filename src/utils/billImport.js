/**
 * 账单导入解析器 —— 纯前端 · 零依赖 · 信息不出本机
 *
 * 兼容真实账单文件：
 *   · 微信支付（CSV 竖线 / Excel xlsx）
 *   · 支付宝（CSV GBK / Excel xlsx）
 *   · 建设银行（xls OLE2/BIFF8 流水）
 *   · 中国银行（PDF 交易流水明细清单）
 *   · 通用银行文本（工行 / 农行 / 招行 / 交行 等导出的 CSV，单金额列或借贷双列）
 *
 * 能力清单：
 *   1. 文件类型嗅探（zip / OLE2 / PDF 魔数）+ 文本编码探测（UTF-8 BOM / UTF-8 / GBK）；
 *   2. 表头别名匹配（`HEADER_ALIASES`）+ 分隔符自动探测（`,` `|` `\t` `;`）+ RFC4180 引号解析；
 *   3. 按「收/支」记账，自动丢弃「不计收支 / 中性交易 / 关闭 / 失败 / 超时」记录；
 *   4. 支付宝优先用「交易分类」映射，微信按「交易类型」+ 关键词，银行按摘要关键词；
 *   5. 收入方向使用独立的 `INCOME_KEYWORDS`（旧版误用支出词表，会把「退款」判成「衣帽鞋」）；
 *   6. 每条记录附带 `merchant`（商户名）供同商户聚合；
 *   7. 退款自动冲抵同商户同金额原支出（`refunded` 标记），不虚增收支；
 *   8. 账户内部资金移动（余额宝 / 零钱 / 还款 / 理财 / 跨行同业划转）一律剔除；
 *   9. 导出 `recordFingerprint()` 供调用方做跨批次幂等去重。
 *
 * 有意的取舍：不做联网、不做 OCR、不替你「猜」缺失金额——解析不出就如实返回 `ok:false` 与原因。
 */
import { parseXls } from './xlsReader.js'

/* pdfjs 按需加载：仅在中行 PDF 分支触发，避免把 ~1MB 的解析库塞进 Budget 分包。
   实际加载逻辑在同版本 worker 绑定的 pdfjsLoader.js（见该文件说明）。 */
let pdfjsPromise = null
function loadPdfjs() {
  if (!pdfjsPromise) pdfjsPromise = import('./pdfjsLoader.js').then((m) => m.default || m)
  return pdfjsPromise
}

/* ============================ 一、字典与常量 ============================ */

/** 支付宝「交易分类」→ 本站支出分类 */
const ALIPAY_CAT_MAP = {
  餐饮美食: 'food',
  日用百货: 'daily',
  交通出行: 'transport',
  爱车养车: 'transport',
  服饰装扮: 'cloth',
  美容美发: 'beauty',
  休闲娱乐: 'fun',
  医疗健康: 'medical',
  教育文化: 'study',
  网络虚拟: 'virtual',
  数码家电: 'digital',
  房屋住宅: 'housing',
  运动户外: 'sport',
  生活服务: 'daily',
  充值缴费: 'phone',
  其他: 'other'
}

/** 微信「交易类型」→ 本站分类；未列出的回落到关键词猜测 */
const WECHAT_TYPE_MAP = {
  商户消费: '',
  转账: 'transfer',
  红包: 'transfer',
  二维码收款: 'transfer',
  群收款: 'transfer',
  零钱提现: '',
  零钱通转入: '',
  零钱通转出: '',
  信用卡还款: '',
  退款: 'refund',
  'AA收款': 'transfer',
  微信红包: 'transfer',
  账户提现: ''
}

/** 支出关键词表（顺序即优先级，命中即停）。含校园与主流商户品牌，减少「其它」。 */
const KEYWORDS = [
  { key: 'food', words: ['食堂', '餐', '饭', '外卖', '奶茶', '咖啡', '果', '零食', '面', '饺', '烧烤', '火锅', '汉堡', '小吃', '买菜', '菜场', '餐厅', '麦乐送', '烘焙', '蛋糕', '早餐', '粉', '麻辣', '香锅', '米线', '肠', '饼', '牛奶', '甜品', '糖', '饿了么', '美团', '肯德基', '麦当劳', '华莱士', '瑞幸', '蜜雪', '星巴克', '必胜客', '塔斯汀', '沙县', '兰州'] },
  { key: 'party', words: ['聚餐', '团建', '约饭', '啤酒', '宵夜', '串串', '烧烤店', '火锅店', 'KTV', 'ktv', '酒吧', '海底捞', '烤肉', '日料', '清吧', 'livehouse'] },
  { key: 'transport', words: ['公交', '地铁', '打车', '滴滴', '高铁', '火车', '共享', '加油', '停车', '飞机', '高速', '停车费', '地铁卡', '公交卡', '铁路', '航空', '加油卡', '高德', '哈啰', '青桔', '美团打车', 'T3出行', '曹操出行', '12306', '携程', '飞猪', '汽车票', '轮渡'] },
  { key: 'beauty', words: ['理发', '美发', '美容', '美甲', '护肤', '面膜', '造型', '染发', '剪发', 'spa', '海蓝之谜', '兰蔻', '雅诗兰黛', '屈臣氏', '丝芙兰'] },
  { key: 'digital', words: ['手机', '电脑', '数码', '耳机', '充电', '硬盘', '键盘', '家电', '电器', '显示器', '平板', '摄像头', '路由器', '智能', '华为', '苹果', '小米', '联想', '戴尔', '华硕', '京东数码', '充电宝', '数据线', '内存'] },
  { key: 'sport', words: ['健身', '运动', '球', '羽毛球', '乒乓球', '跑步', '瑜伽', '游泳', '健身房', '户外', '登山', '篮球', '足球', '骑行', '迪卡侬', '耐克', '阿迪', '李宁', '安踏', '球场', '球馆'] },
  { key: 'virtual', words: ['游戏', 'steam', '会员', '点卡', 'vip', '王者', '原神', '皮肤', '月卡', '视频会员', 'b站', 'bilibili', '腾讯视频', '爱奇艺', '优酷', '网易云', 'qq音乐', '酷狗', '充值币', '代练', '云游戏'] },
  { key: 'housing', words: ['房租', '水费', '电费', '燃气', '物业', '宿舍', '宽带', '热水', '酒店', '如家', '民宿', '公寓', '宾馆', '汉庭', '贝壳', '链家', '住宿费', '空调费', '押金'] },
  { key: 'study', words: ['书', '教材', '打印', '文具', '资料', '报名', '考研', '考证', '学费', '课程', '网课', '得到', '知乎', '慕课', '四六级', '雅思', '托福', '论文', '查重', '复印'] },
  { key: 'cloth', words: ['衣', '服', '鞋', '裤', '帽', '穿搭', '卫衣', '外套', '裙', '优衣库', 'zara', 'h&m', '李宁', '安踏', '袜子', '背包', '配饰', '羽绒服'] },
  { key: 'medical', words: ['药', '医院', '挂号', '体检', '口罩', '诊所', '门诊', '药店', '同仁堂', '海王星辰', '大参林', '校医院', '疫苗', '牙科', '眼镜'] },
  { key: 'daily', words: ['洗发', '纸巾', '洗衣', '牙膏', '毛巾', '日用', '生活', '洗涤', '纸', '超市', '便利店', '711', '全家', '罗森', '名创优品', '永辉', '大润发', '山姆', '盒马', '五折'] },
  { key: 'phone', words: ['话费', '流量', '移动', '联通', '电信', '校园网', '宽带', '缴费', '中国移动', '中国联通', '中国电信', '话费充值'] },
  { key: 'fun', words: ['电影', 'ktv', '演出', '门票', '密室', '桌游', '景区', '乐园', '猫眼', '大麦', '影院', '大众点评', '马蜂窝', '剧本杀', '演唱会', '展览', '游乐园'] },
  { key: 'transfer', words: ['转账', '红包'] }
]

/** 收入关键词表（与支出表分离，避免「退款」被误判为购物类） */
const INCOME_KEYWORDS = [
  { key: 'invest', words: ['利息', '结息', '理财', '余额宝', '零钱通', '收益', '分红', '基金', '股票', '国债'] },
  { key: 'transfer', words: ['转账', '汇款', '转入', '代发', '工资', '薪', '赡养'] },
  { key: 'prize', words: ['红包', '奖金', '奖励', '签到', '金币', '积分', '提现', '佣金', '返现', '活动', '抖音', '快手', '平台', '中奖', '返利', '好评'] },
  { key: 'parttime', words: ['兼职', '打工', '实习', '劳务', '报酬', '薪水', '日结'] },
  { key: 'scholarship', words: ['奖学金', '助学金', '补贴', '补助', '资助'] },
  { key: 'resale', words: ['闲鱼', '转转', '二手', '转让', '出售', '回收'] },
  { key: 'refund', words: ['退款', '退货', '售后', '撤销'] }
]

/** 应被丢弃的交易状态（含「已退款」——退款由 applyRefundOffset 单独处理） */
const STATUS_DROP = ['关闭', '失败', '超时', '作废', '撤销', '已退款', '取消']

/** 「收/支」列里代表不参与计算的中性值 */
const KIND_DROP = ['不计收支', '中性交易', '/', '-', '']

/** 表头别名：同一语义在不同银行 / 平台导出的列名差异 */
const HEADER_ALIASES = {
  time: ['交易时间', '交易创建时间', '交易日期', '记账日期', '日期'],
  kind: ['收/支', '收支', '借贷标志', '借贷方向'],
  amount: ['金额(元)', '金额（元）', '交易金额', '金额', '发生额'],
  name: ['商品名称', '商品说明', '商品', '摘要', '交易说明', '交易类型'],
  party: ['交易对方', '对方账号', '对方户名', '对方账户名', '收款方'],
  status: ['当前状态', '交易状态', '状态'],
  note: ['备注', '附言', '摘要说明'],
  category: ['交易分类', '交易类型'],
  orderNo: ['交易单号', '商户单号', '流水号', '凭证号'],
  /** 银行双列式流水 */
  incomeAmt: ['贷方发生额', '收入金额', '存入金额', '贷方金额'],
  expenseAmt: ['借方发生额', '支出金额', '取出金额', '借方金额'],
  balance: ['余额', '账户余额']
}

/** 银行流水里属于「账户内部资金移动」的关键词 —— 不是真实收支，必须剔除 */
const NEUTRAL_PATTERNS = [
  /余额宝|零钱通|微信零钱|零钱提现|支付宝|基金|理财|证券|股票|还款|龙支付充值/,
  /银行卡转入|银行卡转出|定期|通知存款|结构性存款/,
  /充值|转入|转出|提现|划转|内部转账/,
  /结息转存|利息转存/
]

/** 商户名清洗时截断的噪声词 */
const MERCHANT_STOP = ['外卖订单', '订单编号', '订单', '收款方备注', '转账备注', '二维码收款', '经营码', '到店支付', '红包', '返现', '退款', '账单', '付款']

/* ============================ 二、基础工具 ============================ */

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function cleanCell(v) {
  return String(v == null ? '' : v).replace(/^=/, '').trim()
}

/** 金额解析：容忍千分位、货币符号、全角符号、括号负数、尾部「元」 */
function parseAmount(raw) {
  let s = String(raw == null ? '' : raw).trim()
  if (!s) return 0
  const negative = /^[（(]/.test(s) || s.trim().startsWith('-')
  s = s.replace(/[（(）)¥￥元,\s]/g, '')
  const m = s.match(/-?\d+(\.\d+)?/)
  const n = m ? Number(m[0]) : NaN
  if (!Number.isFinite(n)) return 0
  return Math.round((negative ? -Math.abs(n) : Math.abs(n)) * 100) / 100
}

/** 日期解析：支持 yyyy-mm-dd、yyyymmdd、Excel 序列号 */
function parseDate(raw, { ccb = false } = {}) {
  if (raw == null || raw === '') return todayStr()
  const s = String(raw)
  if (ccb) {
    const m8 = s.match(/(\d{4})(\d{2})(\d{2})/)
    if (m8) return `${m8[1]}-${m8[2]}-${m8[3]}`
  }
  const m = s.match(/\d{4}-\d{2}-\d{2}/)
  if (m) return m[0]
  const m2 = s.match(/(\d{4})[/.](\d{1,2})[/.](\d{1,2})/)
  if (m2) return `${m2[1]}-${m2[2].padStart(2, '0')}-${m2[3].padStart(2, '0')}`
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

function isNeutral(text) {
  const t = String(text || '')
  return NEUTRAL_PATTERNS.some((re) => re.test(t))
}

/** 分类猜测：优先用平台给出的官方分类，其次关键词 */
function guessCat(text, category) {
  if (category) {
    const mapped = ALIPAY_CAT_MAP[category]
    if (mapped && mapped !== 'other') return mapped
    const wx = WECHAT_TYPE_MAP[category]
    if (wx) return wx
  }
  const t = (text || '').toLowerCase()
  for (const kw of KEYWORDS) {
    if (kw.words.some((w) => t.includes(w))) return kw.key
  }
  return 'other'
}

/** 收入分类猜测（独立词表） */
function guessIncomeCat(text) {
  const t = (text || '').toLowerCase()
  for (const kw of INCOME_KEYWORDS) {
    if (kw.words.some((w) => t.includes(w))) return kw.key
  }
  return 'other'
}

/** 从商品名 / 备注中提取「商户名」用于同商户聚合（去掉订单编号/外卖订单/括号门店等噪声） */
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

/**
 * 记录指纹：用于导入幂等去重。
 * 刻意不含 `id`（每次导入重新生成）与 `merchant`（清洗规则变化不应导致重复导入）。
 */
export function recordFingerprint(r) {
  const time = r && r.time ? String(r.time).slice(0, 8) : ''
  return [r && r.date, time, r && r.amount, r && r.type, r && r.cat, (r && r.note) || ''].join('|')
}

/* ============================ 三、退款冲抵 ============================ */

/**
 * 退款冲抵：把「退款」类收入与原支出配对并打上 `refunded` 标记后移除，避免虚增收支。
 * @returns 被冲抵的笔数
 */
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

/* ============================ 四、微信 / 支付宝（收/支 表） ============================ */

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

function buildRecords(rows, headIdx, cols) {
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
    const isIncome = kind === '收入'
    let cat = 'other'

    if (brand === 'alipay') {
      if (isIncome) {
        if (category === '投资理财') cat = 'invest'
        else if (category === '退款') cat = 'refund'
        else if (category === '转账红包') cat = 'transfer'
        else cat = guessIncomeCat(`${name} ${party} ${category}`)
      } else {
        if (category === '投资理财') continue
        if (category === '转账红包') cat = 'transfer'
        else cat = guessCat(`${name} ${party}`, category)
      }
    } else if (isIncome) {
      if (category === '退款') cat = 'refund'
      else if (category && WECHAT_TYPE_MAP[category]) cat = WECHAT_TYPE_MAP[category]
      else cat = guessIncomeCat(`${name} ${party} ${category} ${noteText}`)
    } else {
      if (category === '转账' || category.includes('二维码收款')) cat = 'transfer'
      else if (category === '退款') cat = 'other'
      else if (WECHAT_TYPE_MAP[category]) cat = WECHAT_TYPE_MAP[category]
      else cat = guessCat(`${name} ${party} ${category}`, '')
    }
    if (isIncome) {
      const neutralText = `${name} ${party} ${noteText}`
      if (category === '零钱提现' || (isNeutral(neutralText) && cat === 'other')) {
        skipped.neutral++
        continue
      }
    }

    let note = ''
    if (noteText && noteText !== '/') note = noteText
    else if (name && /^(收款方备注|转账备注)[：:]/.test(name)) note = name.replace(/^(收款方备注|转账备注)[：:]?/, '').trim() || party
    else if (name && !/^订单编号/.test(name) && name !== '/') note = name
    else note = party
    added.push({
      type: isIncome ? 'income' : 'expense',
      cat,
      amount: amt,
      note: note || get('orderNo') || '',
      date: parseDate(get('time')),
      merchant: extractMerchant(name, party)
    })
  }
  return { added, skipped, brand }
}

/* ============================ 五、通用银行流水（单列 / 借贷双列） ============================ */

/**
 * 通用银行文本账单解析。
 * 覆盖：工行 / 农行 / 中行 CSV / 招行 / 交行 等常见「摘要 + 交易金额」或「借方 + 贷方」结构。
 * 与微信/支付宝路径的区别：没有「收/支」列，方向来自金额正负或借贷双列。
 */
function parseGenericBank(rows, headIdx, cols) {
  const map = buildHeaderMap(cols)
  const added = []
  const skipped = { closed: 0, neutral: 0 }
  const dual = map.incomeAmt >= 0 && map.expenseAmt >= 0
  if (!dual && map.amount < 0) {
    return { ok: false, msg: '未识别到账单表头（需包含「收/支」或银行流水的「交易金额 / 借方发生额」列）。' }
  }
  for (let i = headIdx + 1; i < rows.length; i++) {
    const cell = rows[i]
    const get = (f) => {
      const j = map[f]
      return j >= 0 && j < cell.length ? cleanCell(cell[j]) : ''
    }
    const summary = get('name')
    const note = get('note')
    const party = get('party')
    const status = get('status')
    if (status && dropStatus(status)) {
      skipped.closed++
      continue
    }
    let kind = ''
    let amt = 0
    if (dual) {
      const inc = parseAmount(get('incomeAmt'))
      const exp = parseAmount(get('expenseAmt'))
      if (inc > 0) { kind = 'income'; amt = inc } else if (exp > 0) { kind = 'expense'; amt = exp }
    } else {
      const v = parseAmount(get('amount'))
      if (v > 0) { kind = 'income'; amt = v } else if (v < 0) { kind = 'expense'; amt = Math.abs(v) }
    }
    if (!kind || !amt) continue
    if (/^收入$|^支出$/.test(summary) && !note) continue
    if (isNeutral(`${summary} ${note} ${party}`)) {
      skipped.neutral++
      continue
    }
    const cat = kind === 'income'
      ? guessIncomeCat(`${summary} ${note} ${party}`)
      : guessCat(`${summary} ${note} ${party}`, '')
    added.push({
      type: kind,
      cat,
      amount: amt,
      note: (note || summary || party || '').slice(0, 60),
      date: parseDate(get('time')),
      merchant: cleanMerchant(party) || cleanMerchant(note) || cleanMerchant(summary)
    })
  }
  if (!added.length) {
    return { ok: false, msg: `银行流水中未找到可导入的收支记录（已自动跳过内部转账 / 充值 / 理财类 ${skipped.neutral} 笔）。` }
  }
  const refunded = applyRefundOffset(added)
  if (refunded) skipped.refunded = refunded
  return { ok: true, source: 'text', brand: 'bank', added, skipped }
}

/* ============================ 六、建行 xls 流水 ============================ */

/** 建行账单：识别账户内部中转 / 充值 / 投资等污染项（不应计入收支）。
 *  仅跳过「账户自身资金移动」（余额宝/零钱/充值/还款/投资理财），
 *  平台收益提现（抖音/快手/平台/签到奖励等）属真实收入，予以保留。 */
function isCcbTransfer(summary, note) {
  const t = `${summary} ${note}`
  if (isNeutral(t)) return true
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
    const amtNum = Number(String(get(iAmt)).replace(/[,，\s¥元]/g, ''))
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
      else cat = guessIncomeCat(`${note} ${summary}`)
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
      date: parseDate(get(iDate), { ccb: true }),
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

/* ============================ 七、中行 PDF 流水 ============================ */

/** 中行（pdf）账单解析 */
async function parseBocBill(bytes) {
  let pdf
  try {
    const pdfjsLib = await loadPdfjs()
    pdf = await pdfjsLib.getDocument({ data: bytes }).promise
  } catch (e) {
    return { ok: false, msg: 'PDF 文件解析失败：' + (e.message || '无法读取 PDF 内容') }
  }
  let fullText = ''
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    fullText += content.items.map((item) => item.str).join(' ') + '\n'
  }
  if (!fullText.includes('中国银行') && !fullText.includes('记账日期')) {
    return { ok: false, msg: '未识别到中国银行账单格式，请确认是中国银行导出的交易流水明细清单。' }
  }
  const lines = fullText.split('\n').map((l) => l.trim()).filter(Boolean)
  const added = []
  const skipped = { neutral: 0, closed: 0 }
  const dateRegex = /(\d{4}-\d{2}-\d{2})/
  const timeRegex = /(\d{2}:\d{2}:\d{2})/
  const amountRegex = /-?[\d,]+\.\d{2}/
  const SUMMARY_KEYS = ['网上快捷支付', '跨行转账', '银联入账', '网上支付', '无卡支付', '结息', '网上快捷提现']
  const PARTY_KEYS = ['支付宝', '财付通', '京东', '美团', '拼多多']
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const dateMatch = line.match(dateRegex)
    if (!dateMatch) continue
    const dateStr = dateMatch[1]
    const timeMatch = line.match(timeRegex)
    const timeStr = timeMatch ? timeMatch[1] : '00:00:00'
    let amountStr = ''
    for (let j = i; j < Math.min(i + 3, lines.length); j++) {
      const m = lines[j].match(amountRegex)
      if (m) { amountStr = m[0]; break }
    }
    if (!amountStr) continue
    const amtNum = Number(amountStr.replace(/,/g, ''))
    if (!Number.isFinite(amtNum) || amtNum === 0) continue
    const kind = amtNum > 0 ? 'income' : 'expense'
    const amt = Math.abs(Math.round(amtNum * 100) / 100)
    let summary = ''
    let party = ''
    for (let j = i; j < Math.min(i + 5, lines.length); j++) {
      if (SUMMARY_KEYS.some((k) => lines[j].includes(k))) { summary = lines[j]; break }
    }
    for (let j = i; j < Math.min(i + 8, lines.length); j++) {
      if (PARTY_KEYS.some((k) => lines[j].includes(k))) { party = lines[j].replace(/^-+/, '').trim(); break }
    }
    if (/余额宝提现|微信零钱提现/.test(summary + party)) { skipped.neutral++; continue }
    if (/跨行转账|跨行转出/.test(summary) && kind === 'expense') {
      // 跨行转出且对方为个人（非商户）→ 内部划转，不计入消费
      const window10 = lines.slice(i, i + 10).join(' ')
      if (/用户|个人|本人/.test(window10)) { skipped.neutral++; continue }
    }
    let cat = 'other'
    if (kind === 'income') {
      if (/结息/.test(summary)) cat = 'invest'
      else if (/银联入账|跨行转账/.test(summary)) cat = 'transfer'
      else cat = guessIncomeCat(`${party} ${summary}`)
    } else if (/转账|转出/.test(summary)) {
      cat = 'transfer'
    } else {
      cat = guessCat(`${party} ${summary}`, '')
    }
    const noteText = party || summary
    added.push({
      type: kind,
      cat,
      amount: amt,
      note: noteText.slice(0, 60),
      date: dateStr,
      time: timeStr,
      merchant: cleanMerchant(party) || cleanMerchant(summary)
    })
  }
  if (!added.length) {
    return { ok: false, msg: '中行 PDF 账单中未找到可导入的收支记录。' }
  }
  const refunded = applyRefundOffset(added)
  if (refunded) skipped.refunded = refunded
  return { ok: true, source: 'pdf', brand: 'boc', added, skipped }
}

/* ============================ 八、文本（CSV / 竖线 / 制表符） ============================ */

/** 文本编码探测：UTF-8 BOM → UTF-8（严格）→ GBK 兜底 */
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

/** 分隔符探测：找表头行里出现次数最多的候选分隔符 */
function detectDelimiter(text) {
  const lines = text.split(/\r?\n/)
  const cands = [',', '|', '\t', ';']
  let best = ','
  let bestCount = 0
  for (const line of lines) {
    if (!/收\/支|交易金额|借方发生额|金额/.test(line)) continue
    for (const d of cands) {
      const c = line.split(d).length - 1
      if (c > bestCount) { bestCount = c; best = d }
    }
    break
  }
  return best
}

/** RFC4180 风格解析（支持双引号转义与字段内换行） */
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

/** 表头行定位：优先「收/支」，其次银行流水特征列 */
function findHeader(rows) {
  for (let i = 0; i < Math.min(rows.length, 80); i++) {
    const cells = rows[i] || []
    if (cells.some((c) => cleanCell(c).includes('收/支'))) return i
  }
  for (let i = 0; i < Math.min(rows.length, 80); i++) {
    const cells = rows[i] || []
    const hasAmt = cells.some((c) => /交易金额|借方发生额|贷方发生额|金额/.test(cleanCell(c)))
    const hasDate = cells.some((c) => /交易日期|记账日期|日期/.test(cleanCell(c)))
    const hasDesc = cells.some((c) => /摘要|交易说明|交易类型|对方/.test(cleanCell(c)))
    if (hasAmt && hasDate && hasDesc) return i
  }
  return -1
}

function isBankHeader(cols) {
  return !cols.some((c) => cleanCell(c).includes('收/支'))
}

function parseTextBill(bytes) {
  const text = decodeText(bytes)
  const delim = detectDelimiter(text)
  const rows = parseDelimited(text, delim)
  const headIdx = findHeader(rows)
  if (headIdx < 0) {
    return { ok: false, msg: '未识别到账单表头（需包含「收/支」或银行流水的「交易金额 / 借方发生额」列），请确认是微信 / 支付宝 / 银行导出的账单文件。' }
  }
  const cols = rows[headIdx]
  if (isBankHeader(cols)) return parseGenericBank(rows, headIdx, cols)
  const { added, skipped, brand } = buildRecords(rows, headIdx, cols)
  const refunded = applyRefundOffset(added)
  if (refunded) skipped.refunded = refunded
  return { ok: true, source: 'text', brand, added, skipped }
}

/* ============================ 九、xlsx（zip + XML） ============================ */

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
    const parts = []
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
  const names = Object.keys(entries).filter((n) => /^xl\/worksheets\/sheet\d+\.xml$/.test(n)).sort()
  let sheetXml = await getXml('xl/worksheets/sheet1.xml')
  let rows = sheetXml ? parseSheet(sheetXml, shared) : []
  let headIdx = rows.length ? findHeader(rows) : -1
  // 多 sheet 工作簿：sheet1 无表头时继续找其它工作表，避免「换个 sheet 就解析失败」
  for (const n of names) {
    if (headIdx >= 0) break
    const xml = n === 'xl/worksheets/sheet1.xml' ? sheetXml : await getXml(n)
    if (!xml) continue
    const r = parseSheet(xml, shared)
    const h = findHeader(r)
    if (h >= 0) { sheetXml = xml; rows = r; headIdx = h }
  }
  if (headIdx < 0) return { ok: false, msg: '未识别到账单表头（需包含「收/支」「金额」列），请确认是微信 / 支付宝导出的账单文件。' }
  const cols = rows[headIdx]
  if (isBankHeader(cols)) {
    const res = parseGenericBank(rows, headIdx, cols)
    if (res.ok) res.source = 'xlsx'
    return res
  }
  const { added, skipped, brand } = buildRecords(rows, headIdx, cols)
  const refunded = applyRefundOffset(added)
  if (refunded) skipped.refunded = refunded
  return { ok: true, source: 'xlsx', brand, added, skipped }
}

/* ============================ 十、入口 ============================ */

/** 按魔数分发：zip(xlsx) / OLE2(xls) / PDF / 文本 */
async function parseBillFile(file) {
  const bytes = new Uint8Array(await file.arrayBuffer())
  if (bytes[0] === 0x50 && bytes[1] === 0x4b) return parseXlsx(bytes)
  if (bytes[0] === 0xd0 && bytes[1] === 0xcf && bytes[2] === 0x11 && bytes[3] === 0xe0) return parseCcbBill(bytes)
  if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) return parseBocBill(bytes)
  return parseTextBill(bytes)
}

export {
  parseBillFile,
  cleanMerchant,
  extractMerchant,
  ALIPAY_CAT_MAP,
  WECHAT_TYPE_MAP,
  KEYWORDS,
  INCOME_KEYWORDS
}
