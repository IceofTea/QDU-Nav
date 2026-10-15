/**
 * ════════════════════════════════════════════════════════════════════
 * @模块路径  scripts/e2e-budget.mjs
 * @职责      生活费模块真机冒烟（估算 / 分配器 / 账单校准三页 + 新引擎口径）
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

/** 记账样本：3 个完整月 + 进行中的当月。预期口径在下方 EXPECT 里手算好，用于反推引擎是否算对。 */
const SEED_RECORDS = [
  { id: 1, type: 'expense', cat: 'food', amount: 800, note: '食堂', date: '2026-03-05', merchant: '第一食堂' },
  { id: 2, type: 'expense', cat: 'fun', amount: 200, note: '电影', date: '2026-03-18', merchant: '猫眼' },
  { id: 3, type: 'expense', cat: 'food', amount: 900, note: '食堂', date: '2026-04-06', merchant: '第一食堂' },
  { id: 4, type: 'expense', cat: 'food', amount: 1000, note: '食堂', date: '2026-05-07', merchant: '第一食堂' },
  { id: 5, type: 'expense', cat: 'study', amount: 100, note: '教材', date: '2026-05-21', merchant: '书店' },
  { id: 6, type: 'expense', cat: 'food', amount: 300, note: '食堂', date: '2026-10-05', merchant: '第一食堂' },
  { id: 7, type: 'income', cat: 'allowance', amount: 1500, note: '生活费', date: '2026-10-01', merchant: '' }
]
const EXPECT = {
  robust: 1000,        // 完整月支出 [1000, 900, 1100] → n=3 → 中位数 1000
  currentSpent: 300,
  currentProjected: 620   // 10-15 当天：300 / 15 * 31
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

  await page.addInitScript(([recs, plan, k, pk, wk]) => {
    localStorage.setItem(k, JSON.stringify(recs))
    localStorage.setItem(pk, JSON.stringify(plan))
    sessionStorage.setItem(wk, '1')
  }, [SEED_RECORDS, SEED_PLAN, KEY, PLAN_KEY, WELCOME_KEY])

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
      log('  FAIL  ' + name + ' → ' + String(e && e.message).slice(0, 200))
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
      const body = (await page.locator('body').innerText()).replace(/\s+/g, ' ')
      assert(/稳健月均支出/.test(body), '未显示「稳健月均支出」：' + body.slice(0, 200))
      assert(body.includes('¥' + EXPECT.robust), `稳健月均应为 ¥${EXPECT.robust}，实际页文本：` + body.slice(0, 300))
      assert(/参与统计的月份：.*3月.*4月.*5月/.test(body), '未列出完整月份 3/4/5 月')
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
      const cur = await textOf('.calib-current')
      assert(cur.includes('¥' + EXPECT.currentSpent), '当月已支出应为 ' + EXPECT.currentSpent + '：' + cur)
      assert(cur.includes('¥' + EXPECT.currentProjected), '预计整月应为 ' + EXPECT.currentProjected + '：' + cur)
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
