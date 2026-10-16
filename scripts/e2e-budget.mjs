/**
 * ════════════════════════════════════════════════════════════════════
 * @模块路径  scripts/e2e-budget.mjs
 * @职责      真机冒烟（两条链路）：① 生活费模块（估算 / 分配器 / 账单校准 + 新引擎口径）
 *            ② 首页「我的快捷」收藏（星标 → 快捷条 → 本机持久化）
 * @用法      node scripts/e2e-budget.mjs
 *            CHROME_PATH=<chrome.exe> 可覆盖；PORT=8791 可换端口
 *            依赖 playwright-core（仓库已有则直接用；无则 SKIP 不拦本地）
 * @设计      自带零依赖静态服务器直接托管 dist/（无需 python）；
 *            用 addInitScript 预置 localStorage 记账样本 → 断言引擎输出与 UI 一致；
 *            断言「文本 + 数值」而非脆弱选择器；失败截图进系统临时目录不污染仓库。
 * @为什么    预算三页里的统计口径（稳健月均 / 当月外推 / 置信度 / 配平）纯逻辑单测覆盖不到，
 *            必须有一次「真 DOM + 真 localStorage + 真路由」的端到端确认。
 * ════════════════════════════════════════════════════════════════════
 */
import fs from 'node:fs'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
/** E2E_DIST/E2E_APP 可覆盖：便于用同一个装了 playwright-core 的仓去冒烟另一个仓的 dist */
const DIST = process.env.E2E_DIST ? path.resolve(process.env.E2E_DIST) : path.join(ROOT, 'dist')
const PORT = Number(process.env.PORT || 8791)
const SHOTS = path.join(os.tmpdir(), 'nav-e2e-shots')

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain; charset=utf-8'
}

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  path.join(os.homedir(), 'AppData', 'Local', 'ms-playwright', 'chromium-1234', 'chrome-win64', 'chrome.exe'),
  path.join(os.homedir(), 'AppData', 'Local', 'ms-playwright', 'chromium-1208', 'chrome-win64', 'chrome.exe'),
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  '/usr/bin/google-chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
].filter(Boolean)

/** 记账样本：3 个完整月 + 进行中的当月。
 *  日期一律按「当前月份」动态生成——硬编码月份会让脚本一跨月就失效（本脚本踩过一次）。 */
function mk(monthOffset, day) {
  const d = new Date()
  const t = new Date(d.getFullYear(), d.getMonth() + monthOffset, 1)
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}
function monthLabelOf(monthOffset) {
  const d = new Date()
  return `${new Date(d.getFullYear(), d.getMonth() + monthOffset, 1).getMonth() + 1}月`
}
const SEED_RECORDS = [
  { id: 1, type: 'expense', cat: 'food', amount: 800, note: '食堂', date: mk(-3, 5), merchant: '第一食堂' },
  { id: 2, type: 'expense', cat: 'fun', amount: 200, note: '电影', date: mk(-3, 18), merchant: '猫眼' },
  { id: 3, type: 'expense', cat: 'food', amount: 900, note: '食堂', date: mk(-2, 6), merchant: '第一食堂' },
  { id: 4, type: 'expense', cat: 'food', amount: 1000, note: '食堂', date: mk(-1, 7), merchant: '第一食堂' },
  { id: 5, type: 'expense', cat: 'study', amount: 100, note: '教材', date: mk(-1, 21), merchant: '书店' },
  { id: 6, type: 'expense', cat: 'food', amount: 300, note: '食堂', date: mk(0, 5), merchant: '第一食堂' },
  { id: 7, type: 'income', cat: 'allowance', amount: 1500, note: '生活费', date: mk(0, 1), merchant: '' }
]
/** 期望值按当天日期推导：完整月支出 [1000, 900, 1100] → 中位数 1000；
 *  当月外推 = 300 ÷ 已过天数 × 当月天数（不足 3 天不外推） */
const NOW = new Date()
const DOM = NOW.getDate()
const DIM = new Date(NOW.getFullYear(), NOW.getMonth() + 1, 0).getDate()
const EXPECT = {
  robust: 1000,
  currentSpent: 300,
  currentProjected: DOM >= 3 ? Math.round((300 / DOM) * DIM * 100) / 100 : null
}
const EXPECT_MONTHS = [monthLabelOf(-3), monthLabelOf(-2), monthLabelOf(-1)]

/** 从仓库源码里读出「新手引导 key + 当前版本号」，一次性标记为已完成——
 *  否则首页/预算页的引导遮罩会（正确地）弹出并吞掉冒烟脚本的点击。
 *  注意各校 TOUR_VERSION 可能不同（QDU=v1 / FJNU=v2），必须从源码读，不能写死。 */
function tourSeed() {
  // 跨仓冒烟（E2E_DIST 指向另一仓 dist）时必须读**那一仓**的源码，否则版本号/键名对不上
  const SRC = process.env.E2E_DIST ? path.dirname(path.resolve(process.env.E2E_DIST)) : ROOT
  let keys = ['home', 'budget']
  let ver = 'v1'
  try {
    const src = fs.readFileSync(path.join(SRC, 'src/data/tourSteps.js'), 'utf8')
    const k = [...src.matchAll(/export const (\w+?)Tour\b/g)].map((m) => m[1])
    if (k.length) keys = k
  } catch { /* 用默认 key */ }
  try {
    const u = fs.readFileSync(path.join(SRC, 'src/utils/useTour.js'), 'utf8')
    const m = u.match(/TOUR_VERSION\s*=\s*'([^']+)'/)
    if (m) ver = m[1]
  } catch { /* 用默认版本 */ }
  return Object.fromEntries(keys.map((x) => [x, ver]))
}
/** 预置一份「合计只有 90%」的方案，用来验证「一键配平」真的把占比拉到 100% */
const SEED_PLAN = { total: 1600, pct: [40, 8, 5, 8, 5, 6, 7, 6, 5, 0] }

let pass = 0
let fail = 0
const failures = []
function log(s) { process.stdout.write(s + '\n') }

async function main() {
  if (!fs.existsSync(path.join(DIST, 'index.html'))) {
    log('e2e-budget: SKIP（dist/index.html 不存在，先 npm run build）')
    process.exit(0)
  }
  let pw = null
  try {
    pw = await import('playwright-core')
  } catch {
    log('e2e-budget: SKIP（无 playwright-core）')
    process.exit(0)
  }
  const exe = CHROME_CANDIDATES.find((p) => { try { return fs.existsSync(p) } catch { return false } })
  if (!exe) {
    log('e2e-budget: SKIP（找不到 Chrome，可用 CHROME_PATH 指定；禁止 playwright install 重新下载）')
    process.exit(0)
  }

  // ---- 零依赖静态服务器托管 dist/（SPA：未命中路径回退 index.html）----
  const server = http.createServer((req, res) => {
    const url = decodeURIComponent((req.url || '/').split('?')[0])
    let file = path.join(DIST, url)
    if (!file.startsWith(DIST)) { res.writeHead(403); res.end(); return }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html')
    if (!fs.existsSync(file)) file = path.join(DIST, 'index.html')
    const ext = path.extname(file).toLowerCase()
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' })
    fs.createReadStream(file).pipe(res)
  })
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r))
  const BASE = `http://127.0.0.1:${PORT}`

  const browser = await pw.chromium.launch({ executablePath: exe, args: ['--no-sandbox'] })
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
  const jsErrors = []
  page.on('pageerror', (e) => jsErrors.push(String(e && e.message)))
  page.on('console', (m) => { if (m.type() === 'error') jsErrors.push(m.text()) })

  const APP = process.env.E2E_APP || (fs.existsSync(path.join(ROOT, 'mobile.html')) ? 'fjnu' : 'qdu')
  const KEY = APP + '_budget_records'
  const PLAN_KEY = APP + '_budget_plan'
  const WELCOME_KEY = APP + '_welcome_seen'
  const FAV_KEY = APP + '_favorites'

  await page.addInitScript(([recs, plan, k, pk, wk, tk, done]) => {
    localStorage.setItem(k, JSON.stringify(recs))
    localStorage.setItem(pk, JSON.stringify(plan))
    sessionStorage.setItem(wk, '1')
    // 预置「所有新手引导均已完成」，避免遮罩吞掉冒烟脚本的点击
    localStorage.setItem(tk, JSON.stringify(done))
  }, [SEED_RECORDS, SEED_PLAN, KEY, PLAN_KEY, WELCOME_KEY, APP + '_tour_completed', tourSeed()])

  async function shot(name) {
    try {
      if (!fs.existsSync(SHOTS)) fs.mkdirSync(SHOTS, { recursive: true })
      await page.screenshot({ path: path.join(SHOTS, 'budget-' + name + '.png'), fullPage: true })
    } catch { /* noop */ }
  }
  async function ok(name, fn) {
    try {
      await fn()
      pass++
      log('  PASS  ' + name)
    } catch (e) {
      fail++
      failures.push(name)
      log('  FAIL  ' + name + ' → ' + String(e && e.message).slice(0, 700))
      await shot(name.replace(/[^\w\u4e00-\u9fff]+/g, '_'))
    }
  }
  function assert(cond, msg) { if (!cond) throw new Error(msg || '断言失败') }
  async function textOf(sel) {
    const el = page.locator(sel).first()
    await el.waitFor({ timeout: 15000 })
    return (await el.innerText()).replace(/\s+/g, ' ').trim()
  }
  async function clickTab(label) {
    await page.getByRole('button', { name: label }).first().click()
    await page.waitForTimeout(400)
  }
  /** 首次访问会弹新手引导（遮罩会吞掉点击）——有则跳过；最多尝试 3 次以清掉残留 */
  async function dismissTour() {
    for (let i = 0; i < 3; i++) {
      const skip = page.locator('.tour-btn--skip')
      try {
        if (!(await skip.count())) return
        await skip.first().click({ timeout: 3000 })
        await page.waitForTimeout(300)
      } catch { return }
      if (!(await page.locator('.tour-overlay').count())) return
    }
  }
  /** 页面里任意位置出现该文本 */
  async function hasText(re) {
    return (await page.locator('body').innerText()).replace(/\s+/g, ' ').match(re) !== null
  }

  try {
    // 0. 预算主页可达
    await ok('预算主页可进入', async () => {
      await page.goto(BASE + '/#/app/budget', { waitUntil: 'domcontentloaded', timeout: 30000 })
      if (await page.getByRole('button', { name: /进入校园导航/ }).count()) {
        await page.getByRole('button', { name: /进入校园导航/ }).first().click()
        await page.waitForTimeout(500)
      }
      await page.locator('.budget-root').first().waitFor({ timeout: 20000 })
      assert(await hasText(/本月结余|生活费计数器/), '预算主页未渲染')
    })

    // 1. 进「生活费模拟」
    await ok('进入生活费模拟', async () => {
      await page.getByRole('button', { name: /生活费模拟/ }).first().click()
      await page.waitForTimeout(600)
      assert(await hasText(/估算|分配器|账单校准/), '模拟页未渲染')
    })

    // 2. 校准页：稳健月均 = 期望值
    await ok('校准页显示稳健月均（引擎口径）', async () => {
      await clickTab(/账单校准/)
      const t = (await page.locator('body').innerText()).replace(/\s+/g, ' ')
      assert(/稳健月均支出/.test(t), '未显示「稳健月均支出」：' + t.slice(0, 200))
      assert(t.includes('¥' + EXPECT.robust), `稳健月均应为 ¥${EXPECT.robust}，实际页文本：` + t.slice(0, 300))
      for (const m of EXPECT_MONTHS) {
        assert(t.includes(m), `未列出完整月份 ${m}：` + t.slice(0, 200))
      }
    })

    // 3. 置信度徽标（3 月 + 低波动 + ≥8 笔 → high）
    await ok('校准页显示样本置信度徽标', async () => {
      const badge = await textOf('.conf-badge')
      assert(/样本置信度/.test(badge), '徽标文本异常: ' + badge)
      assert(/高|中|低/.test(badge), '徽标未含等级: ' + badge)
    })

    // 4. 对比三种口径都渲染出来
    await ok('三种统计口径并列展示', async () => {
      const cmp = await textOf('.calib-compare')
      assert(/算术平均/.test(cmp) && /中位数/.test(cmp) && /截尾均值/.test(cmp), '对比行不全: ' + cmp)
    })

    // 5. 当月跑量外推
    await ok('当月跑量外推数值正确', async () => {
      if (EXPECT.currentProjected === null) return // 当月不足 3 天时产品本身不外推
      const cur = await textOf('.calib-current')
      assert(cur.includes('¥' + EXPECT.currentSpent), '当月已支出应为 ' + EXPECT.currentSpent + '：' + cur)
      assert(cur.includes('¥' + EXPECT.currentProjected), `预计整月应为 ${EXPECT.currentProjected}（按当天 ${DOM} 日 / 当月 ${DIM} 天推算）：` + cur)
    })

    // 6. 支出构成为「加权占比」口径（带 % 后缀）
    await ok('支出构成显示加权占比', async () => {
      const body = (await page.locator('body').innerText()).replace(/\s+/g, ' ')
      assert(/占比按「区间总支出」加权/.test(body), '未显示加权口径说明')
    })

    // 7. 下月支出预测面板
    await ok('下月支出预测面板有数值', async () => {
      const body = (await page.locator('body').innerText()).replace(/\s+/g, ' ')
      assert(/下月支出预测/.test(body), '未显示预测面板')
      assert(/第 1 月/.test(body) || /第 1月/.test(body), '未显示预测月份')
    })

    // 8. 订阅体检面板（样本无稳定复现商户 → 空态文案）
    await ok('订阅体检面板渲染', async () => {
      const body = (await page.locator('body').innerText()).replace(/\s+/g, ' ')
      assert(/疑似固定扣费/.test(body), '未显示订阅体检面板')
    })

    // 9. 一键配平：预置 90% → 点击后必须恰好 100%
    await ok('分配器一键配平到 100%', async () => {
      await clickTab(/分配器/)
      const before = (await page.locator('body').innerText()).replace(/\s+/g, ' ')
      assert(!/已分配 100%/.test(before), '预置方案不应已是 100%（测试前提失效）')
      await page.getByRole('button', { name: /一键配平/ }).first().click()
      await page.waitForTimeout(500)
      const after = (await page.locator('body').innerText()).replace(/\s+/g, ' ')
      assert(/已分配 100%/.test(after), '配平后合计应为 100%：' + after.slice(0, 300))
      assert(/占比正好 100%/.test(after), '未给出「占比正好 100%」提示')
    })

    // 10. 真实占比抄进分配器
    await ok('把真实占比抄进分配器', async () => {
      await clickTab(/账单校准/)
      await page.getByRole('button', { name: /抄进分配器/ }).first().click()
      await page.waitForTimeout(600)
      const body = (await page.locator('body').innerText()).replace(/\s+/g, ' ')
      assert(/预算|已分配/.test(body), '未跳回分配器')
      assert(/已按真实账单的稳健月均与加权占比填入分配器/.test(body), '未提示已填充真实占比')
    })

    // 11. 全程零业务 JS 错误
    await ok('全程无 JS 运行时错误', async () => {
      const real = jsErrors.filter((m) => !/favicon|404 \(Not Found\)|Failed to load resource/i.test(m))
      assert(real.length === 0, '出现 JS 错误: ' + real.slice(0, 3).join(' | '))
    })

    // ─────────────── 绩点计算器（仅 QDU-Nav 有这个应用；FJNU 会自动跳过）───────────────
    await ok('绩点计算器：录一门课后算出加权平均与 4.0 绩点', async () => {
      await page.goto(BASE + '/#/app/gpa', { waitUntil: 'domcontentloaded', timeout: 30000 })
      await page.waitForTimeout(900)
      if (!(await page.locator('.gpa-kpi').count())) return // 该站无此应用
      await page.locator('.panel input.input').first().fill('高等数学')
      const nums = page.locator('.gpa-row input[type="number"]')
      await nums.nth(0).fill('5')
      await nums.nth(1).fill('90')
      await page.getByRole('button', { name: /加入成绩单|Add to transcript/ }).first().click()
      await page.waitForTimeout(500)
      assert(await page.locator('.gpa-item').count() === 1, '课程未加入成绩单')
      const point = (await page.locator('.gpa-point').first().innerText()).trim()
      assert(point === '4.0', '5 学分 90 分应为 4.0 绩点，实际 ' + point)
      const kpi = (await page.locator('.gpa-kpi').innerText()).replace(/\s+/g, ' ')
      assert(/90/.test(kpi), 'KPI 应显示加权平均 90：' + kpi)
    })

    await ok('绩点计算器：目标反推给出「还要拿多少分」', async () => {
      if (!(await page.locator('.gpa-kpi').count())) return
      const inputs = page.locator('.panel input[type="number"]')
      const n = await inputs.count()
      await inputs.nth(n - 2).fill('3.3')   // 目标
      await inputs.nth(n - 1).fill('30')    // 剩余学分
      await page.waitForTimeout(400)
      const plan = (await page.locator('.gpa-plan').innerText()).replace(/\s+/g, ' ')
      assert(plan.length > 6, '未给出反推结论：' + plan)
      assert(!/先录入成绩|Add some grades/.test(plan), '反推应已生效，实际：' + plan)
    })


    await ok('绩点计算器：填学期后出现分学期走势', async () => {
      if (!(await page.locator('.gpa-kpi').count())) return
      await page.locator('.gpa-item .rec-del').first().click()          // ✎ 编辑
      await page.waitForTimeout(300)
      await page.getByPlaceholder(/学期|Term/).first().fill('2026年秋季学期')
      await page.getByRole('button', { name: /保存修改|Save changes/ }).first().click()
      await page.waitForTimeout(500)
      const cells = await page.locator('.gpa-term-cell').count()
      assert(cells === 1, '应有 1 个学期卡片，实际 ' + cells)
      const cell = (await page.locator('.gpa-term-cell').first().innerText()).replace(/\s+/g, ' ')
      assert(cell.includes('26秋'), '学期短标签应为 26秋，实际：' + cell)
    })

    await ok('绩点计算器：从课表选课自动带出学分与学期', async () => {
      if (!(await page.locator('.gpa-kpi').count())) return
      await page.getByRole('button', { name: /从课表选课|Pick from timetable/ }).first().click()
      await page.locator('.gpa-dialog').waitFor({ timeout: 15000 })
      await page.getByPlaceholder(/搜课程名关键字|Search course name/).first().fill('高等数学')
      // 课表是 2MB 级 JSON（后台 Worker 解析），给足等待
      await page.locator('.gpa-pick-item').first().waitFor({ timeout: 30000 })
      await page.locator('.gpa-pick-item').first().click()
      await page.waitForTimeout(500)
      assert(await page.locator('.gpa-dialog').count() === 0, '选课后弹层应关闭')
      const credit = await page.locator('.gpa-row input[type="number"]').first().inputValue()
      assert(credit && Number(credit) > 0, '学分应自动带出，实际：' + JSON.stringify(credit))
      const termVal = await page.getByPlaceholder(/学期|Term/).first().inputValue()
      assert(termVal.length > 0, '学期应自动带出，实际：' + JSON.stringify(termVal))
    })

    // ───────── APK 下载量（仅 FJNU 有 APK；QDU 站自动跳过）─────────
    await ok('APK 下载入口始终可用（统计失败也不影响下载）', async () => {
      await page.goto(BASE + '/#/', { waitUntil: 'domcontentloaded', timeout: 30000 })
      await page.waitForTimeout(3500) // 等计数请求（成功或失败）都落定
      const card = page.locator('a.app-download-card')
      if (!(await card.count())) return // 该站没有 APK 下载入口
      const href = await card.first().getAttribute('href')
      assert(/\.apk($|[?#])/i.test(href || ''), '下载链接必须指向 .apk：' + href)
      assert(!/^https?:\/\/(?!github\.com)/i.test(href || ''), '下载链接不应指向非 GitHub 的外部地址：' + href)
      const txt = await page.locator('body').innerText()
      assert(!/home\.downloadCount|home\.downloadBtn|home\.downloadTitle/.test(txt), '出现未翻译的 i18n 键，下载区文案缺失')
    })

    await ok('首页出现「我的快捷」区块与空态', async () => {
      await page.goto(BASE + '/#/', { waitUntil: 'domcontentloaded', timeout: 30000 })
      await page.waitForTimeout(900)
      await dismissTour()
      const body = (await page.locator('body').innerText()).replace(/\s+/g, ' ')
      assert(/我的快捷/.test(body), '未渲染「我的快捷」区块：' + body.slice(0, 200))
      assert(/还没有收藏/.test(body), '应显示空态引导')
    })

    await ok('点星标收藏后快捷条出现该应用', async () => {
      await dismissTour()
      const star = page.locator('.service-tile .tile-fav').first()
      await star.waitFor({ timeout: 10000 })
      // 应用网格在首屏之下，先滚到可视区再点（Playwright 对深层容器的自动滚动不可靠）
      await star.scrollIntoViewIfNeeded()
      await page.waitForTimeout(200)
      await star.click({ timeout: 10000 })
      await page.waitForTimeout(400)
      const chips = page.locator('.fav-chip')
      assert(await chips.count() === 1, '快捷条应有 1 项，实际 ' + (await chips.count()))
      const chipText = (await chips.first().innerText()).replace(/\s+/g, ' ')
      assert(chipText.length > 0, '快捷项应有文字')
      assert(!/还没有收藏/.test((await page.locator('body').innerText())), '空态应消失')
    })

    await ok('收藏已落到本机存储且刷新后仍在', async () => {
      const raw = await page.evaluate((k) => localStorage.getItem(k), FAV_KEY)
      assert(raw && raw.includes('"kind":"app"'), '存储里应有 app 类型收藏：' + String(raw).slice(0, 120))
      await page.reload({ waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(900)
      assert(await page.locator('.fav-chip').count() >= 1, '刷新后快捷项应保留')
    })

    await ok('取消收藏后空态恢复', async () => {
      const x = page.locator('.fav-chip .fav-x').first()
      await x.scrollIntoViewIfNeeded()
      await x.click({ timeout: 10000 })
      await page.waitForTimeout(400)
      assert(await page.locator('.fav-chip').count() === 0, '取消后快捷条应为空')
      assert(/还没有收藏/.test(await page.locator('body').innerText()), '空态文案应恢复')
    })

    // ─────────────── 首屏性能：智能体大脑不进首屏，悬浮舱按需就绪 ───────────────
    await ok('首屏不请求智能体包（异步拆分生效）', async () => {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
      const p2 = await ctx.newPage()
      await p2.addInitScript(([a, done]) => {
        sessionStorage.setItem(a + '_welcome_seen', '1')
        localStorage.setItem(a + '_tour_completed', JSON.stringify(done))
        // DOMContentLoaded 时（入口模块已执行完）抓一次资源清单：
        // 若智能体被静态引入，此刻它的 chunk 必然已发出请求
        document.addEventListener('DOMContentLoaded', () => {
          window.__dclRes = performance.getEntriesByType('resource').map((r) => r.name)
        })
      }, [APP, tourSeed()])
      await p2.goto(BASE + '/#/', { waitUntil: 'domcontentloaded' })
      await p2.waitForTimeout(300)
      const res = await p2.evaluate(() => window.__dclRes || [])
      assert(res.length > 0, '未抓到首屏资源清单')
      const agent = res.filter((n) => /navAnswer|workflows|AgentChat|ChatDock/i.test(n))
      assert(agent.length === 0, '首屏就请求了智能体包：' + agent.map((x) => x.split('/').pop()).join(', '))
      // 闲时预热后悬浮舱应就绪
      await p2.waitForTimeout(4000)
      assert(await p2.locator('.cd-fab').count() >= 1, '闲时预热后悬浮舱仍未就绪（预载链路断了）')
      await ctx.close()
    })

    await ok('助手页可正常打开（懒加载链完好）', async () => {
      await page.goto(BASE + '/#/app/assistant', { waitUntil: 'domcontentloaded', timeout: 30000 })
      await page.locator('.ac-input').first().waitFor({ timeout: 20000 })
    })

    // ─────────────── i18n：英文字包按需加载 ───────────────
    await ok('首屏不请求英文包（i18n 按需加载）', async () => {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
      const p3 = await ctx.newPage()
      await p3.addInitScript(([a, done]) => {
        sessionStorage.setItem(a + '_welcome_seen', '1')
        localStorage.setItem(a + '_tour_completed', JSON.stringify(done))
        document.addEventListener('DOMContentLoaded', () => {
          window.__dclRes = performance.getEntriesByType('resource').map((r) => r.name)
        })
      }, [APP, tourSeed()])
      await p3.goto(BASE + '/#/', { waitUntil: 'domcontentloaded' })
      await p3.waitForTimeout(300)
      const res = await p3.evaluate(() => window.__dclRes || [])
      const en = res.filter((n) => /\/en-[A-Za-z0-9_-]+\.js$/.test(n))
      assert(en.length === 0, '首屏就加载了英文包：' + en.join(', '))
      await ctx.close()
    })

    // ───────── 统计防污染（本地/测试环境绝不打点）─────────
    await ok('本地/测试环境不向第三方统计打点（避免污染线上 UV）', async () => {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
      const p4 = await ctx.newPage()
      const ext = []
      p4.on('request', (r) => {
        const u = r.url()
        if (/busuanzi|vercount|iceoftea|deno\.net/i.test(u)) ext.push(r.method() + ' ' + u.slice(0, 100))
      })
      await p4.goto(BASE + '/#/', { waitUntil: 'domcontentloaded' })
      await p4.waitForTimeout(2500)
      assert(ext.length === 0, '本地测试竟向统计服务发请求（会污染线上数据）：' + ext.slice(0, 3).join(' | '))
      await ctx.close()
    })

    await ok('切到英文后界面变为英文（英文包按需加载成功）', async () => {
      await page.evaluate((k) => localStorage.setItem(k, 'en'), APP + '_lang')
      // 带上查询串 → 触发一次真正的文档加载并回到首页
      // （只改 hash 不会重新执行入口；直接 reload 会停在上一步的助手页）
      await page.goto(BASE + '/?e2e=1#/', { waitUntil: 'domcontentloaded', timeout: 30000 })
      await page.waitForTimeout(1500)
      const t = (await page.locator('body').innerText()).replace(/\s+/g, ' ')
      assert(/My Shortcuts/.test(t), '英文界面未生效（英文包可能未加载）：' + t.slice(0, 140))
    })
  } finally {
    await browser.close()
    server.close()
  }

  log('')
  log(`e2e-budget: pass=${pass} fail=${fail}`)
  if (fail) log(`失败用例：${failures.join(' / ')}\n截图目录：${SHOTS}`)
  process.exit(fail ? 1 : 0)
}

main().catch((e) => {
  log('e2e-budget: FATAL ' + (e && e.stack ? e.stack : e))
  process.exit(1)
})
