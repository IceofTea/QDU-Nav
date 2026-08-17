/**
 * 课程表数据工具
 * ---------------------------------------------------------------------------
 * 针对课程总表快照（rows）的常见解析函数。
 * 各视图（Timetable）与快照回退层（localCourse）共用，避免重复实现。
 */

/**
 * 归一化教室名：去掉「（智慧）/ (智慧)」标记并去首尾空白。
 * 课程总表中同一物理教室会出现多个带「智慧」的别名，统一后便于匹配。
 * @param {string} r 原始教室名
 * @returns {string} 归一化后的教室名
 */
export const normRoom = (r) => (r || '').replace(/[（(]智慧[)）]/g, '').trim()

/**
 * 拆分「多班合上」的班级串，并把「[01-04]班」这类范围展开成单班。
 * 课程总表的「上课班级」列常为合并串，如
 * 「24临床（5+3）[01-05]班,25体育[01-02]班,25软件03班」。
 * 范围班（如「25软件[01-04]班」）展开为 25软件01班…25软件04班，
 * 使班级列表只出现单班、合班课自动落到每个单班的课表里。
 * @param {string} cls 原始班级串
 * @returns {string[]} 拆分/展开后的单个班级名数组
 */
export const clsSplit = (cls) => {
  const out = []
  for (const s of (cls || '').split(/[,，、]/)) {
    const t = s.trim()
    if (!t) continue
    const m = t.match(/^(.+?)\[(\d{1,2})\s*[-–]\s*(\d{1,2})\](班)?$/)
    if (m) {
      const [, pre, a, b] = m
      for (let n = +a; n <= +b; n++) out.push(`${pre}${String(n).padStart(2, '0')}班`)
    } else {
      out.push(t)
    }
  }
  return out
}

/**
 * 从班级名提取「专业」关键字（用于分类浏览）。
 * 例：24临床（5+3）[01-05]班 → 临床；25体育[01-02]班 → 体育；24服装01班 → 服装
 * @param {string} cls 单个班级名
 * @returns {string} 专业关键字（可能为空串）
 */
export const profOf = (cls) =>
  cls.replace(/^2\d/, '').replace(/（[^）]*）/g, '').replace(/\[[^\]]*\]/g, '').replace(/\d+班$/, '').replace(/班$/, '').trim()

/**
 * 解析「周次」表达式为集合。
 * 支持形如「1-16」「3,5,7」「1-8,10」的教务处周次写法。
 * @param {string} w 周次表达式
 * @returns {Set<number>} 包含的具体周次
 */
export const parseWeeks = (w) => {
  const out = new Set()
  for (const m of (w || '').matchAll(/(\d+)(?:-(\d+))?/g)) {
    const a = +m[1]
    const b = m[2] ? +m[2] : a
    for (let i = a; i <= b; i++) out.add(i)
  }
  return out
}