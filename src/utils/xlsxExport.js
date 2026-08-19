/**
 * Excel(.xlsx) 导出器：手写 OOXML（zip store 打包 + sheet/styles XML），无第三方依赖
 *  - 汇总 sheet：支出分类 / 收入分类、商户支出 / 商户收入 并列排放，会计风格
 *  - 明细 sheet：日期/类型/分类/商户/金额/备注，带自动筛选 + 冻结首行 + 列宽 +
 *    收入行浅绿底 / 支出行浅红底（一眼看清花在哪、赚在哪）
 */
const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()
function crc32(bytes) {
  let c = 0xffffffff
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function u16(v) { return [v & 0xff, (v >> 8) & 0xff] }
function u32(v) { return [v & 0xff, (v >> 8) & 0xff, (v >> 16) & 0xff, (v >> 24) & 0xff] }
function dosDT() {
  const d = new Date()
  return {
    time: ((d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1)) & 0xffff,
    date: (((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()) & 0xffff
  }
}

function zipStore(entries) {
  const { time, date } = dosDT()
  const chunks = []
  const central = []
  let offset = 0
  for (const e of entries) {
    const name = new TextEncoder().encode(e.name)
    const data = e.data
    const crc = crc32(data)
    const lh = new Uint8Array([
      0x50, 0x4b, 0x03, 0x04, ...u16(20), ...u16(0), ...u16(0),
      ...u16(time), ...u16(date), ...u32(crc), ...u32(data.length), ...u32(data.length),
      ...u16(name.length), ...u16(0)
    ])
    chunks.push(lh, name, data)
    const ch = new Uint8Array([
      0x50, 0x4b, 0x01, 0x02, ...u16(20), ...u16(20), ...u16(0), ...u16(0),
      ...u16(time), ...u16(date), ...u32(crc), ...u32(data.length), ...u32(data.length),
      ...u16(name.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0),
      ...u32(0), ...u32(offset)
    ])
    central.push(ch, name)
    offset += lh.length + name.length + data.length
  }
  const cdSize = central.reduce((s, c) => s + c.length, 0)
  const cdOffset = offset
  const eocd = new Uint8Array([
    0x50, 0x4b, 0x05, 0x06, ...u16(0), ...u16(0), ...u16(entries.length), ...u16(entries.length),
    ...u32(cdSize), ...u32(cdOffset), ...u16(0)
  ])
  const total = chunks.concat(central, [eocd])
  const size = total.reduce((s, c) => s + c.length, 0)
  const out = new Uint8Array(size)
  let p = 0
  for (const c of total) { out.set(c, p); p += c.length }
  return out
}

const enc = (s) => new TextEncoder().encode(s)
const esc = (s) => String(s == null ? '' : s).replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[c]))
const cellStr = (r, s, v) => `<c r="${r}" s="${s}" t="inlineStr"><is><t>${esc(v)}</t></is></c>`
const cellNum = (r, s, v) => `<c r="${r}" s="${s}"><v>${v}</v></c>`
const colName = (i) => { let s = ''; i++; while (i > 0) { s = String.fromCharCode(65 + ((i - 1) % 26)) + s; i = Math.floor((i - 1) / 26) } return s }

function buildStyles() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="1"><numFmt numFmtId="164" formatCode="&quot;¥&quot;#,##0.00;&quot;¥&quot;-#,##0.00"/></numFmts>
<fonts count="5">
<font><sz val="11"/><name val="Calibri"/></font>
<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>
<font><b/><sz val="14"/><color rgb="FF1F4E79"/><name val="Calibri"/></font>
<font><b/><sz val="11"/><name val="Calibri"/></font>
<font><sz val="11"/><color rgb="FF666666"/><name val="Calibri"/></font>
</fonts>
<fills count="7">
<fill><patternFill patternType="none"/></fill>
<fill><patternFill patternType="gray125"/></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FF1F4E79"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFE7F6EC"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFFDE9E9"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFF2F2F2"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFDCE6F1"/></patternFill></fill>
</fills>
<borders count="2">
<border><left style="thin"><color rgb="FFD0D7DE"/></left><right style="thin"><color rgb="FFD0D7DE"/></right><top style="thin"><color rgb="FFD0D7DE"/></top><bottom style="thin"><color rgb="FFD0D7DE"/></bottom></border>
<border/>
</borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="8">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>
<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="164" fontId="0" fillId="3" borderId="0" xfId="0" applyFill="1" applyNumberFormat="1"/>
<xf numFmtId="164" fontId="0" fillId="4" borderId="0" xfId="0" applyFill="1" applyNumberFormat="1"/>
<xf numFmtId="164" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1" applyNumberFormat="1"/>
<xf numFmtId="0" fontId="3" fillId="5" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>
<xf numFmtId="0" fontId="0" fillId="6" borderId="1" xfId="0" applyFill="1" applyBorder="1"/>
</cellXfs>
</styleSheet>`
}

function buildSheetSummary(s) {
  const rows = []
  const push = (r) => rows.push(r)
  push('<row r="1" ht="22"><c r="A1" s="2" t="inlineStr"><is><t>QDU 生活费收支分析导出</t></is></c></row>')
  push(`<row r="2"><c r="A2" s="4" t="inlineStr"><is><t>生成时间：${new Date().toLocaleString()}</t></is></c></row>`)
  push('<row r="3"/>')
  const r4 = ['<row r="4">',
    '<c r="A4" s="6" t="inlineStr"><is><t>收入总额</t></is></c>', `<c r="B4" s="5"><v>${s.inc || 0}</v></c>`,
    '<c r="C4" s="7"/>',
    '<c r="D4" s="6" t="inlineStr"><is><t>支出总额</t></is></c>', `<c r="E4" s="5"><v>${s.exp || 0}</v></c>`,
    '</row>'].join('')
  push(r4)
  const r5 = ['<row r="5">',
    '<c r="A5" s="6" t="inlineStr"><is><t>结余</t></is></c>', `<c r="B5" s="5"><v>${s.bal || 0}</v></c>`,
    '<c r="C5" s="7"/>',
    '<c r="D5" s="6" t="inlineStr"><is><t>退款冲抵</t></is></c>', `<c r="E5" s="5"><v>${s.refundTotal || 0}</v></c>`,
    '</row>'].join('')
  push(r5)
  push('<row r="6"/>')
  const blocks = [
    { title: '支出分类', left: s.catExp || [], right: s.catInc || [], rTitle: '收入分类', nameCol: 'A', valCol: 'B', rNameCol: 'D', rValCol: 'E' },
    { title: '商户支出 Top', left: s.merExp || [], right: s.merInc || [], rTitle: '商户收入 Top', nameCol: 'A', valCol: 'B', rNameCol: 'D', rValCol: 'E' }
  ]
  let r = 7
  for (const b of blocks) {
    push(`<row r="${r}"><c r="A${r}" s="6" t="inlineStr"><is><t>${esc(b.title)}</t></is></c><c r="D${r}" s="6" t="inlineStr"><is><t>${esc(b.rTitle)}</t></is></c></row>`)
    r++
    const n = Math.max(b.left.length, b.right.length)
    for (let i = 0; i < n; i++, r++) {
      const l = b.left[i], rr = b.right[i]
      const cells = []
      cells.push(l ? `<c r="A${r}" s="7" t="inlineStr"><is><t>${esc(l.name)}</t></is></c>` : `<c r="A${r}" s="7"/>`)
      cells.push(l ? `<c r="B${r}" s="5"><v>${l.v}</v></c>` : `<c r="B${r}" s="7"/>`)
      cells.push('<c r="C' + r + '" s="7"/>')
      cells.push(rr ? `<c r="D${r}" s="7" t="inlineStr"><is><t>${esc(rr.name)}</t></is></c>` : `<c r="D${r}" s="7"/>`)
      cells.push(rr ? `<c r="E${r}" s="5"><v>${rr.v}</v></c>` : `<c r="E${r}" s="7"/>`)
      push('<row r="' + r + '">' + cells.join('') + '</row>')
    }
    r++
  }
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<dimension ref="A1:F${r - 1}"/>
<sheetViews><sheetView workbookViewId="0"/></sheetViews>
<sheetFormatPr defaultRowHeight="15"/>
<cols><col min="1" max="1" width="16" customWidth="1"/><col min="2" max="2" width="14" customWidth="1"/><col min="3" max="3" width="3"/><col min="4" max="4" width="16" customWidth="1"/><col min="5" max="5" width="14" customWidth="1"/></cols>
<sheetData>${rows.join('')}</sheetData>
</worksheet>`
}

function buildSheetDetail(rows) {
  const body = []
  const head = ['日期', '类型', '分类', '商户', '金额', '备注']
  const headCells = head.map((h, i) => cellStr(colName(i) + '1', 1, h)).join('')
  body.push(`<row r="1">${headCells}</row>`)
  rows.forEach((row, idx) => {
    const r = idx + 2
    const isInc = row.type === 'income'
    const s = isInc ? 3 : 4
    const cells = [
      cellStr('A' + r, 0, row.date || ''),
      cellStr('B' + r, s, isInc ? '收入' : '支出'),
      cellStr('C' + r, s, row.cat || ''),
      cellStr('D' + r, s, row.merchant || ''),
      cellNum('E' + r, s, row.amount || 0),
      cellStr('F' + r, 0, row.note || '')
    ].join('')
    body.push(`<row r="${r}" ht="16">${cells}</row>`)
  })
  const last = rows.length + 1
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<dimension ref="A1:F${last}"/>
<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
<sheetFormatPr defaultRowHeight="15"/>
<cols><col min="1" max="1" width="12" customWidth="1"/><col min="2" max="2" width="8" customWidth="1"/><col min="3" max="3" width="12" customWidth="1"/><col min="4" max="4" width="18" customWidth="1"/><col min="5" max="5" width="12" customWidth="1"/><col min="6" max="6" width="28" customWidth="1"/></cols>
<sheetData>${body.join('')}</sheetData>
<autoFilter ref="A1:F${last}"/>
</worksheet>`
}

function buildWorkbook() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets><sheet name="汇总" sheetId="1" r:id="rId1"/><sheet name="收支明细" sheetId="2" r:id="rId2"/></sheets>
</workbook>`
}

export function buildXlsxBlob(data) {
  const sheet1 = buildSheetSummary(data)
  const sheet2 = buildSheetDetail(data.rows || [])
  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
<Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`
  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`
  const wbRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`
  const files = [
    { name: '[Content_Types].xml', data: enc(contentTypes) },
    { name: '_rels/.rels', data: enc(rels) },
    { name: 'xl/workbook.xml', data: enc(buildWorkbook()) },
    { name: 'xl/_rels/workbook.xml.rels', data: enc(wbRels) },
    { name: 'xl/styles.xml', data: enc(buildStyles()) },
    { name: 'xl/worksheets/sheet1.xml', data: enc(sheet1) },
    { name: 'xl/worksheets/sheet2.xml', data: enc(sheet2) }
  ]
  return zipStore(files)
}

export function exportXlsx(data) {
  const blob = new Blob([buildXlsxBlob(data)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = data.fileName || '收支分析.xlsx'
  document.body.appendChild(a)
  a.click()
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove() }, 300)
}