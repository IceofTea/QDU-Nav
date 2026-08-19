/**
 * 老式 .xls（Excel 97-2003）读取器：OLE2 复合文档 + BIFF8 记录解析
 * 仅用于读取工作表的单元格二维网格（字符串 / 数字），支持 LabelSst / Number / RK / MulRK / Formula / BoolErr。
 * 纯前端实现、无第三方依赖。
 */
function concat(a, b) {
  const o = new Uint8Array(a.length + b.length)
  o.set(a, 0)
  o.set(b, a.length)
  return o
}

function rkDecode(rk) {
  const div = rk & 1
  const isInt = rk & 2
  if (isInt) {
    let v = (rk | 0) >> 2
    return div ? v / 100 : v
  }
  const buf = new ArrayBuffer(8)
  const bdv = new DataView(buf)
  bdv.setUint32(0, rk >>> 0, false)
  bdv.setUint32(4, 0, false)
  let v = bdv.getFloat64(0, false)
  return div ? v / 100 : v
}

function parseOle2(u8) {
  const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength)
  const sectorShift = dv.getUint16(0x1e, true)
  const miniShift = dv.getUint16(0x20, true)
  const sectorSize = 1 << sectorShift
  const miniSize = 1 << miniShift
  const fatCount = dv.getUint32(0x2c, true)
  const dirStart = dv.getUint32(0x30, true)
  const miniCutoff = dv.getUint32(0x38, true)
  const miniFatStart = dv.getUint32(0x3c, true)
  const difatStart = dv.getUint32(0x44, true)
  const so = (s) => (s + 1) * sectorSize

  const fatSectors = []
  for (let i = 0; i < 109; i++) {
    const s = dv.getUint32(0x4c + i * 4, true)
    if (s !== 0xffffffff) fatSectors.push(s)
  }
  let ds = difatStart
  while (ds !== 0xfffffffe && ds !== 0xffffffff && fatSectors.length <= fatCount) {
    const base = so(ds)
    if (base + sectorSize > u8.length) break
    for (let i = 0; i < sectorSize / 4 - 1; i++) {
      const s = dv.getUint32(base + i * 4, true)
      if (s !== 0xffffffff && s !== 0xfffffffe) fatSectors.push(s)
    }
    const next = dv.getUint32(base + sectorSize - 4, true)
    if (next === ds) break
    ds = next
  }
  const fat = []
  for (const fs of fatSectors) {
    const base = so(fs)
    if (base + sectorSize > u8.length) continue
    for (let i = 0; i < sectorSize / 4; i++) fat.push(dv.getUint32(base + i * 4, true))
  }
  const chain = (start) => {
    const parts = []
    let s = start
    while (s !== 0xfffffffe && s !== 0xffffffff && s < fat.length && parts.length < 100000) {
      parts.push(s)
      s = fat[s]
    }
    return parts
  }
  const readStream = (c, size) => {
    const out = new Uint8Array(c.length * sectorSize)
    c.forEach((s, i) => out.set(u8.slice(so(s), so(s) + sectorSize), i * sectorSize))
    return out.slice(0, size)
  }

  const dirData = readStream(chain(dirStart), chain(dirStart).length * sectorSize)
  const ddv = new DataView(dirData.buffer, dirData.byteOffset, dirData.byteLength)
  const entries = []
  let root = null
  for (let i = 0; i * 128 < dirData.length; i++) {
    const base = i * 128
    const type = ddv.getUint8(base + 0x42)
    if (type !== 0 && type !== 1 && type !== 2 && type !== 5) continue
    const nameLen = ddv.getUint16(base + 0x40, true) / 2
    let name = ''
    for (let k = 0; k < nameLen; k++) name += String.fromCharCode(ddv.getUint16(base + k * 2, true))
    name = name.replace(/\u0000+$/, '')
    const start = ddv.getUint32(base + 0x74, true)
    const size = ddv.getUint32(base + 0x78, true) + ddv.getUint32(base + 0x7c, true) * 4294967296
    const e = { name, type, start, size }
    if (type === 5) root = e
    entries.push(e)
  }

  let miniContainer = null
  let miniFat = null
  if (root && root.start !== 0xfffffffe) {
    const rc = chain(root.start)
    miniContainer = readStream(rc, rc.length * sectorSize)
    if (miniFatStart !== 0xfffffffe) {
      const mfChain = chain(miniFatStart)
      const mfData = readStream(mfChain, mfChain.length * sectorSize)
      miniFat = new Uint32Array(mfData.buffer.slice(0, mfData.length))
    }
  }
  const readMini = (start, size) => {
    const parts = []
    let s = start
    while (s !== 0xfffffffe && miniFat && parts.length < 100000) { parts.push(s); s = miniFat[s] }
    const out = new Uint8Array(parts.length * miniSize)
    parts.forEach((ms, i) => out.set(miniContainer.slice(ms * miniSize, ms * miniSize + miniSize), i * miniSize))
    return out.slice(0, size)
  }
  const getStream = (entry) => {
    if (entry.size >= miniCutoff) return readStream(chain(entry.start), entry.size)
    return readMini(entry.start, entry.size)
  }
  const wb = entries.find((e) => (e.name === 'Workbook' || e.name === 'Book') && e.size > 0)
  if (!wb) throw new Error('xls 中未找到 Workbook 工作簿流')
  return getStream(wb)
}

function parseWorkbook(stream) {
  const dv = new DataView(stream.buffer, stream.byteOffset, stream.byteLength)
  const recs = []
  let pos = 0
  while (pos + 4 <= stream.length) {
    const op = dv.getUint16(pos, true)
    const len = dv.getUint16(pos + 2, true)
    if (pos + 4 + len > stream.length) break
    recs.push({ op, off: pos + 4, len })
    pos += 4 + len
  }
  const parseStrings = (payload) => {
    const pdv = new DataView(payload.buffer, payload.byteOffset, payload.byteLength)
    const unique = pdv.getUint32(4, true)
    const out = []
    let p = 8
    for (let i = 0; i < unique && p + 3 <= payload.length; i++) {
      const cch = pdv.getUint16(p, true)
      const flags = payload[p + 2]
      p += 3
      let s = ''
      if (flags & 0x01) {
        for (let k = 0; k < cch; k++) s += String.fromCharCode(pdv.getUint16(p + k * 2, true))
        p += cch * 2
      } else {
        for (let k = 0; k < cch; k++) s += String.fromCharCode(payload[p + k])
        p += cch
      }
      if (flags & 0x04) p += 2 + pdv.getUint16(p, true) * 4
      if (flags & 0x08) p += 4 + pdv.getUint32(p, true)
      out.push(s)
    }
    return out
  }
  let sst = []
  for (let i = 0; i < recs.length; i++) {
    const r = recs[i]
    if (r.op === 0x00fc) {
      let payload = stream.slice(r.off, r.off + r.len)
      let j = i + 1
      while (j < recs.length && recs[j].op === 0x003c) {
        payload = concat(payload, stream.slice(recs[j].off, recs[j].off + recs[j].len))
        j++
      }
      sst = parseStrings(payload)
      break
    }
  }
  const sheets = []
  for (const r of recs) {
    if (r.op === 0x0085) {
      const p = r.off
      const sheetPos = dv.getUint32(p, true)
      const nameLen = stream[p + 6]
      let name = ''
      for (let k = 0; k < nameLen; k++) name += String.fromCharCode(dv.getUint16(p + 7 + k * 2, true))
      sheets.push({ pos: sheetPos, name: name.replace(/\u0000+$/, '') })
    }
  }
  return { sst, sheets, dv, stream }
}

function parseSheet(stream, dv, sheetPos, sst) {
  const grid = []
  let pos = sheetPos
  while (pos + 4 <= stream.length) {
    const op = dv.getUint16(pos, true)
    const len = dv.getUint16(pos + 2, true)
    const p = pos + 4
    if (op === 0x000a) break
    const row = dv.getUint16(p, true)
    const col = dv.getUint16(p + 2, true)
    let val = null
    switch (op) {
      case 0x00fd: {
        const idx = dv.getUint32(p + 6, true)
        val = sst[idx] != null ? sst[idx] : null
        break
      }
      case 0x0203: val = dv.getFloat64(p + 6, true); break
      case 0x027e: val = rkDecode(dv.getUint32(p + 6, true)); break
      case 0x00bd: {
        const colFirst = col
        const count = Math.floor((len - 6) / 6)
        for (let k = 0; k < count; k++) {
          const rk = dv.getUint32(p + 6 + k * 6, true)
          if (!grid[row]) grid[row] = []
          grid[row][colFirst + k] = rkDecode(rk)
        }
        break
      }
      case 0x0206: {
        const tb = stream[p + 13]
        if (tb === 0) val = dv.getFloat64(p + 6, true)
        else val = null
        break
      }
      case 0x0205: val = stream[p + 6] === 1; break
      default: break
    }
    if (op === 0x00fd || op === 0x0203 || op === 0x027e || op === 0x0206 || op === 0x0205) {
      if (!grid[row]) grid[row] = []
      grid[row][col] = val
    }
    pos += 4 + len
  }
  return grid
}

export function parseXls(bytes) {
  const wb = parseOle2(bytes)
  const { sst, sheets, dv, stream } = parseWorkbook(wb)
  if (!sheets.length) throw new Error('xls 中未找到工作表')
  return parseSheet(stream, dv, sheets[0].pos, sst)
}