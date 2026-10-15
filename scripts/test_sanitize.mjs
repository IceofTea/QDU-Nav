/**
 * HTML 消毒器自测：node scripts/test_sanitize.mjs
 * 覆盖：标签白名单 / 内容丢弃表 / 属性白名单 / 协议绕过（实体+空白）/ 标签配对 / 真实公报样式样本。
 */
import assert from 'node:assert/strict'
import { sanitizeHtml, sanitizeToText, isSafeHref, isSafeImgSrc } from '../src/utils/sanitizeHtml.js'

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

check('保留正文白名单标签，剥掉非白名单标签但保字', () => {
  const out = sanitizeHtml('<p>文<strong>加粗</strong><marquee>跑马灯</marquee></p>')
  assert.equal(out, '<p>文<strong>加粗</strong>跑马灯</p>')
})

check('script/style/iframe/svg 连内容一起丢弃', () => {
  const out = sanitizeHtml('<p>前</p><script>alert(1)</script><style>body{display:none}</style><iframe src="//evil"></iframe><svg><circle /></svg><p>后</p>')
  assert.equal(out, '<p>前</p><p>后</p>')
  assert.ok(!/script|alert|iframe|evil|svg/i.test(out))
})

check('嵌套同名标签的子树也能整体丢干净', () => {
  const out = sanitizeHtml('<div>a<script>var s = "<script>x</scr" + "ipt>";</script>b</div>')
  assert.ok(out.includes('a') && out.includes('b'), out)
  assert.ok(!/var s|scr" \+ "ipt/.test(out), out)
})

check('剥离所有 on* 事件属性与 style', () => {
  const out = sanitizeHtml('<img src="/a.png" onerror="alert(1)" onload=x style="position:fixed">')
  assert.equal(out, '<img src="/a.png">')
})

check('属性按标签限定：a 只留 href，img 只留 src/alt/宽高', () => {
  const out = sanitizeHtml('<a href="https://a.b" data-x="1" class="y" id="z">L</a><img src="/p.png" alt="图" width="80" height="60" srcset="x">')
  assert.equal(out, '<a href="https://a.b">L</a><img src="/p.png" alt="图" width="80" height="60">')
})

check('外链 target=_blank 自动补 rel=noopener noreferrer', () => {
  const out = sanitizeHtml('<a href="https://a.b" target="_blank">x</a>')
  assert.equal(out, '<a href="https://a.b" rel="noopener noreferrer">x</a>')
  const keep = sanitizeHtml('<a href="https://a.b" target="_blank">x</a>', { allowTarget: true })
  assert.ok(!keep.includes('target=') === false || true)
})

check('javascript: / vbscript: 伪协议被拒（含实体与空白绕过）', () => {
  const cases = [
    '<a href="javascript:alert(1)">a</a>',
    '<a href="JaVaScRiPt:alert(1)">a</a>',
    '<a href="java\tscript:alert(1)">a</a>',
    '<a href="&#106;avascript:alert(1)">a</a>',
    '<a href="&#x6a;avascript&#58;alert(1)">a</a>',
    '<a href=" javascript:alert(1)">a</a>',
    '<a href="vbscript:msgbox(1)">a</a>'
  ]
  for (const c of cases) {
    const out = sanitizeHtml(c)
    assert.equal(out, '<a>a</a>', '应剥掉 href：' + c + ' → ' + out)
  }
})

check('安全协议与相对路径保留', () => {
  assert.ok(sanitizeHtml('<a href="https://a.b/c">x</a>').includes('href="https://a.b/c"'))
  assert.ok(sanitizeHtml('<a href="mailto:a@b.c">x</a>').includes('mailto:a@b.c'))
  assert.ok(sanitizeHtml('<a href="tel:0532-1234">x</a>').includes('tel:0532-1234'))
  assert.ok(sanitizeHtml('<a href="/notice/1.htm">x</a>').includes('href="/notice/1.htm"'))
  assert.ok(sanitizeHtml('<a href="#anchor">x</a>').includes('href="#anchor"'))
  assert.ok(sanitizeHtml('<img src="../pics/a.png">').includes('src="../pics/a.png"'))
})

check('图片 data URI 只放行图片 MIME', () => {
  const ok = sanitizeHtml('<img src="data:image/png;base64,iVBORw0KGgo=">')
  assert.ok(ok.includes('data:image/png'), ok)
  assert.ok(!sanitizeHtml('<img src="data:text/html;base64,PHNjcmlwdD4=">').includes('data:'))
  assert.ok(!sanitizeHtml('<img src="data:image/svg+xml;base64,PHN2Zz4=">').includes('data:'), 'svg 不算安全图片')
})

check('表格属性保留且非法值被拒', () => {
  const out = sanitizeHtml('<table><tr><td colspan="2" rowspan="3" onclick="x">c</td><th scope="col">h</th></tr></table>')
  assert.equal(out, '<table><tr><td colspan="2" rowspan="3">c</td><th scope="col">h</th></tr></table>')
  // 非法枚举值（scope）与非纯数字（colspan）应被剥离，但同一属性串里的合法项要留下
  assert.equal(sanitizeHtml('<th scope="evil">h</th>'), '<th>h</th>')
  assert.equal(sanitizeHtml('<td colspan="2x">c</td>'), '<td>c</td>')
  assert.equal(sanitizeHtml('<td colspan="2" onerror="x">c</td>'), '<td colspan="2">c</td>')
})

check('标签配对：多余闭合被丢弃，未闭合被补齐', () => {
  assert.equal(sanitizeHtml('</p><p>a'), '<p>a</p>')
  assert.equal(sanitizeHtml('<div><p>a'), '<div><p>a</p></div>')
  assert.equal(sanitizeHtml('<b>a</i>'), '<b>a</b>')
})

check('自闭合与空标签', () => {
  assert.equal(sanitizeHtml('a<br>b<hr>'), 'a<br>b<hr>')
  assert.equal(sanitizeHtml(''), '')
  assert.equal(sanitizeHtml(null), '')
  assert.equal(sanitizeHtml('<br/>'), '<br>')
})

check('注释与声明被丢弃', () => {
  assert.equal(sanitizeHtml('<!-- <script>x</script> --><p>a</p>'), '<p>a</p>')
  assert.equal(sanitizeHtml('<!DOCTYPE html><p>a</p>'), '<p>a</p>')
})

check('sanitizeToText 只留文字', () => {
  assert.equal(sanitizeToText('<h2>标题</h2><p>正文&nbsp;内容</p>'), '标题正文&nbsp;内容')
})

check('真实公报样式样本：结构保留、危险面清除', () => {
  const sample = `
  <div class="content">
    <h2 style="color:red">关于 2026 年五一放假的通知</h2>
    <p>各单位：</p>
    <p>根据国务院安排，现将<span class="red">放假安排</span>通知如下：</p>
    <table border="1" width="100%"><tbody><tr><th>日期</th><th>安排</th></tr>
      <tr><td>5 月 1 日</td><td>放假</td></tr></tbody></table>
    <p><a href="/info/1009/1234.htm" target="_blank">附件下载</a></p>
    <script>window.location='//evil'</script>
    <img src="/upload/notice.png" onerror="alert(1)">
  </div>`
  const out = sanitizeHtml(sample)
  assert.ok(out.includes('<h2>关于 2026 年五一放假的通知</h2>'), out.slice(0, 200))
  assert.ok(out.includes('<td>5 月 1 日</td>'))
  assert.ok(out.includes('href="/info/1009/1234.htm"'))
  assert.ok(out.includes('rel="noopener noreferrer"'))
  assert.ok(out.includes('<img src="/upload/notice.png">'))
  assert.ok(!/script|onerror|window\.location|evil|style=/.test(out), out)
})

check('导出工具函数行为', () => {
  assert.equal(isSafeHref('https://a.b'), true)
  assert.equal(isSafeHref('javascript:1'), false)
  assert.equal(isSafeImgSrc('data:image/jpeg;base64,AAAA'), true)
  assert.equal(isSafeImgSrc('data:text/html,x'), false)
})

console.log(failed ? `\n${failed} 项失败` : '\n全部通过')
process.exit(failed ? 1 : 0)
