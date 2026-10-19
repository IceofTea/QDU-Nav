/**
 * 内联计算器的安全表达式求值（零 eval / 零依赖 / 可单测）
 * ---------------------------------------------------------------------------
 * 支持：+ - * / × ÷ % ^ 、括号、负号、小数、常量 pi/π/e；
 * 词法白名单只允许数字与运算符，任何其他字符直接判非法——注入面为零。
 */

const CONSTS = { pi: Math.PI, 'π': Math.PI, e: Math.E }

function tokenize(src) {
  const s = src.replace(/\s+/g, '').replace(/×/g, '*').replace(/÷/g, '/').replace(/[（）]/g, (c) => (c === '（' ? '(' : ')'))
  const tokens = []
  let i = 0
  while (i < s.length) {
    const c = s[i]
    if (/[0-9.]/.test(c)) {
      let j = i
      while (j < s.length && /[0-9.]/.test(s[j])) j++
      const v = Number(s.slice(i, j))
      if (!Number.isFinite(v)) return null
      tokens.push({ t: 'num', v })
      i = j
      continue
    }
    if (/[+\-*/%^()]/.test(c)) { tokens.push({ t: 'op', v: c }); i++; continue }
    if (/[a-zπ]/i.test(c)) {
      let j = i
      while (j < s.length && /[a-z]/i.test(s[j])) j++
      const name = s.slice(i, j).toLowerCase()
      if (!(name in CONSTS)) return null
      tokens.push({ t: 'num', v: CONSTS[name] })
      i = j
      continue
    }
    return null
  }
  return tokens
}

const PREC = { '+': 1, '-': 1, '*': 2, '/': 2, '%': 2, '^': 3 }

export function evalExpr(src) {
  const tokens = tokenize(src)
  if (!tokens || !tokens.length) return { ok: false, error: '无法识别的表达式' }
  const vals = []
  const ops = []
  let prev = null
  const apply = () => {
    const op = ops.pop()
    if (op === 'u-') {
      if (!vals.length) throw new Error('bad')
      vals.push(-vals.pop())
      return
    }
    const b = vals.pop(); const a = vals.pop()
    if (a === undefined || b === undefined) throw new Error('bad')
    let r
    if (op === '+') r = a + b
    else if (op === '-') r = a - b
    else if (op === '*') r = a * b
    else if (op === '%') r = a % b
    else if (op === '^') r = Math.pow(a, b)
    else { if (b === 0) throw new Error('除数不能为 0'); r = a / b }
    if (!Number.isFinite(r)) throw new Error('结果溢出')
    vals.push(r)
  }
  try {
    for (const tk of tokens) {
      if (tk.t === 'num') { vals.push(tk.v); prev = 'num' }
      else if (tk.v === '(') { ops.push('('); prev = 'op' }
      else if (tk.v === ')') {
        while (ops.length && ops[ops.length - 1] !== '(') apply()
        if (!ops.length) throw new Error('括号不匹配')
        ops.pop(); prev = 'num'
      } else {
        if (tk.v === '-' && (prev === null || prev === 'op')) { ops.push('u-'); prev = 'op'; continue }
        if (prev !== 'num') return { ok: false, error: '表达式不完整' }
        while (ops.length && ops[ops.length - 1] !== '(' && (PREC[ops[ops.length - 1]] || 4) >= PREC[tk.v]) apply()
        ops.push(tk.v); prev = 'op'
      }
    }
    while (ops.length) {
      if (ops[ops.length - 1] === '(') throw new Error('括号不匹配')
      apply()
    }
    if (vals.length !== 1 || !Number.isFinite(vals[0])) return { ok: false, error: '表达式不完整' }
    return { ok: true, value: Math.round(vals[0] * 1e10) / 1e10 }
  } catch (e) {
    return { ok: false, error: e.message === 'bad' ? '表达式不完整' : (e.message || '计算失败') }
  }
}

/** 判断整段输入是否就是一个纯算式（供引擎在意图表之前短路命中） */
export function looksLikeExpr(text) {
  const t = (text || '').trim()
  if (t.length < 3 || t.length > 80) return false
  if (!/\d/.test(t) || !/[+\-*/×÷^%]/.test(t)) return false
  return /^[\d\s+\-*/×÷().%^a-zπe]+$/i.test(t)
}
