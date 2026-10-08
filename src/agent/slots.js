/**
 * 槽位抽取（时间 / 地点 / 关键词）
 * ---------------------------------------------------------------------------
 * 从自然语言里抽出结构化参数，供工作流直接使用；
 * 缺失槽位时由引擎发起澄清反问（多轮对话）。
 */

const WEEK_CN = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

/** 解析相对日期为 Date */
function baseDate() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

/**
 * 抽取时间槽位
 * @returns {{ day: number, dateLabel: string, hour?: number, minute?: number, raw: string }|null}
 * day: 周一=1 … 周日=7（对齐 /api/emptyRooms 的 day 参数）
 */
export function extractTime(text) {
  const t = text || ''
  const now = baseDate()
  let date = null
  let dateLabel = ''

  if (/今天|今日|今晚|今/.test(t)) {
    date = now; dateLabel = '今天'
  } else if (/明天|明日|明早|明晚/.test(t)) {
    date = new Date(now.getTime() + 86400000); dateLabel = '明天'
  } else if (/后天/.test(t)) {
    date = new Date(now.getTime() + 2 * 86400000); dateLabel = '后天'
  } else {
    const m = t.match(/(周|星期)([一二三四五六日天])/)
    if (m) {
      const map = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 日: 0, 天: 0 }
      const target = map[m[2]]
      let diff = (target - now.getDay() + 7) % 7
      if (diff === 0) diff = 0
      date = new Date(now.getTime() + diff * 86400000)
      dateLabel = m[0]
    }
  }

  let hour
  // 中文数字支持：下午三点 / 10:30 / 晚上9点（一二三...十两→0-12 映射）
  const CN_NUM = { 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10, 十一: 11, 十二: 12 }
  const cnHour = (() => {
    const m = t.match(/(上午|早上|中午|下午|晚上|夜里)?\s*(十一|十二|[一二两三四五六七八九十])\s*[点时]/)
    if (m && m[2] in CN_NUM) return { h: CN_NUM[m[2]], p: m[1] || '' }
    return null
  })()
  const hm = t.match(/(上午|早上|中午|下午|晚上|夜里)?\s*(\d{1,2})\s*[点时:：]\s*(\d{1,2})?/)
  const hm2 = !hm && !cnHour && t.match(/(上午|早上|中午|下午|晚上)?\s*(\d{1,2})\s*[点时]/)
  if (cnHour) {
    hour = cnHour.h
    if (/下午|晚上|夜里/.test(cnHour.p) && hour < 12) hour += 12
    if (/中午/.test(cnHour.p) && hour < 12) hour = 12
  } else if (hm) {
    hour = Number(hm[2])
    const period = hm[1] || ''
    if (/下午|晚上|夜里/.test(period) && hour < 12) hour += 12
    if (/中午/.test(period) && hour < 12) hour = 12
  } else if (hm2) {
    hour = Number(hm2[2])
    const period = hm2[1] || ''
    if (/下午|晚上/.test(period) && hour < 12) hour += 12
  }

  if (!date && hour === undefined) return null

  const day = date ? (date.getDay() === 0 ? 7 : date.getDay()) : (now.getDay() === 0 ? 7 : now.getDay())
  const timeLabel = hour !== undefined ? `${hour}:00` : ''
  return {
    day,
    dateLabel: dateLabel || WEEK_CN[day % 7],
    hour,
    label: [dateLabel || (date ? '近期' : '今天'), timeLabel].filter(Boolean).join(' '),
    raw: t
  }
}

/** 抽取节次（空教室场景），默认第 3-4 节 */
export function extractPeriod(text) {
  const t = text || ''
  const m = t.match(/第\s*(\d{1,2})\s*[-~—到至]\s*(\d{1,2})\s*节/)
  if (m) return { start: Number(m[1]), end: Number(m[2]) }
  const m2 = t.match(/第\s*(\d{1,2})\s*节/)
  if (m2) { const s = Number(m2[1]); return { start: s, end: Math.min(12, s + 1) } }
  if (/早自习|早读/.test(t)) return { start: 1, end: 2 }
  if (/晚自习|晚上自习/.test(t)) return { start: 9, end: 11 }
  const h = new Date().getHours()
  if (h < 12) return { start: 3, end: 4 }
  if (h < 18) return { start: 7, end: 8 }
  return { start: 9, end: 10 }
}

/** 抽取地点关键词（导航 / 教室场景） */
export function extractPlace(text) {
  const t = text || ''
  const known = ['图书馆', '体育馆', '食堂', '宿舍', '教学楼', '实验楼', '行政楼', '校医院', '操场', '礼堂', '浴池', '超市']
  for (const k of known) if (t.includes(k)) return k
  const m = t.match(/(?:去|到|导航到|怎么去|怎么走(?:到)?)\s*([\u4e00-\u9fa5A-Za-z0-9]{2,10}?)(?:怎么|如何|的)?(?:走|去|路线|$)/)
  if (m) return m[1]
  return null
}

/** 抽取自由关键词（查通知 / 查课程场景）：剥离意图常用词后剩余的内容 */
export function extractKeyword(text, stopwords = []) {
  const stop = ['帮我', '请', '查一下', '查询', '搜索', '找一下', '找', '看看', '我想', '我要', '有没有', '关于', '通知', '新闻', '的', '了', '吗', '呢', '?', '？', ' ', '什么', '哪些']
    .concat(stopwords)
  let t = (text || '').trim()
  for (const s of stop) t = t.split(s).join('')
  t = t.replace(/[？?！!。，,]/g, '').trim()
  return t.length >= 2 ? t : null
}

/** 抽取"加入日程"的完整槽位（时间 + 事项） */
export function extractScheduleSlots(text) {
  const time = extractTime(text)
  let thing = extractKeyword(text, ['提醒我', '提醒', '加个日程', '加日程', '记一下', '记个', '安排一下', '安排', '备忘', '待办', '要', '帮我'])
  if (!thing) {
    const m = text.match(/(?:提醒我|帮我记住|记着|安排)\s*(?:在|于)?\s*[^，,。]{0,12}?(?:做|开|吃|上课|考试|交|见|去)?\s*([\u4e00-\u9fa5A-Za-z0-9]{2,14})/)
    if (m) thing = m[1]
  }
  return { time, thing }
}
