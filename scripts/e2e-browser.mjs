/**
 * ════════════════════════════════════════════════════════════════════
 * @模块路径  scripts/e2e-browser.mjs
 * @职责      浏览器真 E2E（10 关键链路）：首页→进入→助手办事→墙→搜索→
 *            抽屉→技能→管理页→404兜底（+移动端，可选）
 * @用法      E2E_BASE=http://localhost:8787 node scripts/e2e-browser.mjs
 *            缺浏览器/依赖时 SKIP 不拦本地；CI 置 E2E_STRICT=1 则缺环境也失败
 * @依赖      playwright-core（CI 现场 npm i；本地用系统 Chrome，见 CHROME_CANDIDATES）
 * @设计      用文本断言不用脆弱选择器；失败截图进系统临时目录（不污染仓库）；
 *            每个用例独立 try/catch，跑完汇总一次退出码
 * ════════════════════════════════════════════════════════════════════
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const BASE = (process.env.E2E_BASE || 'http://localhost:8787').replace(/\/+$/, '')
const STRICT = process.env.E2E_STRICT === '1'
const SKIP_MOBILE = process.env.E2E_SKIP_MOBILE === '1'
const SHOTS = path.join(os.tmpdir(), 'nav-e2e-shots')
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const IS_FJNU = fs.existsSync(path.join(ROOT, 'mobile.html'))
const APP_NAME = IS_FJNU ? 'FJNU' : 'QDU'

let pw = null
try {
  pw = await import('playwright-core')
} catch (e) {
  console.log('e2e-browser: SKIP（无 playwright-core，CI 现场安装）')
  process.exit(STRICT ? 1 : 0)
}

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  '/usr/bin/google-chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
].filter(Boolean)

let pass = 0
let fail = 0
const failures = []
async function shot(page, name) {
  try {
    if (!fs.existsSync(SHOTS)) fs.mkdirSync(SHOTS, { recursive: true })
    await page.screenshot({ path: path.join(SHOTS, name + '.png') })
  } catch { /* noop */ }
}
async function ok(page, name, fn) {
  try {
    await fn()
    pass++
    console.log('  PASS  ' + name)
  } catch (e) {
    fail++
    failures.push(name)
    console.log('  FAIL  ' + name + ' → ' + (e.message || e).toString().slice(0, 160))
    await shot(page, APP_NAME + '-' + name.replace(/[^\w]+/g, '_'))
  }
}
function assert(cond, msg) {
  if (!cond) throw new Error(msg || '断言失败')
}

let browser = null
try {
  const exe = CHROME_CANDIDATES.find((p) => { try { return fs.existsSync(p) } catch { return false } })
  if (!exe) throw new Error('找不到系统 Chrome（CHROME_PATH 可指定）')
  browser = await pw.chromium.launch({ executablePath: exe, args: ['--no-sandbox'] })
} catch (e) {
  console.log('e2e-browser: SKIP（起不来浏览器：' + e.message + '）')
  process.exit(STRICT ? 1 : 0)
}

const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
try {
  // 1. 首页（欢迎屏）
  await ok(page, '首页欢迎屏', async () => {
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.getByText(/进入校园导航/).first().waitFor({ timeout: 20000 })
  })
  // 2. 进入主界面（以应用网格为准，不依赖文案可见性）
  await ok(page, '进入主界面', async () => {
    await page.getByText(/进入校园导航/).first().click()
    await page.locator('.service-tile').first().waitFor({ state: 'visible', timeout: 20000 })
    const n = await page.locator('.service-tile').count()
    assert(n >= 10, '应用网格过少: ' + n)
  })
  // 3. 智能体办事（今日简报出卡）
  await ok(page, '智能体今日简报出卡', async () => {
    await page.goto(BASE + '/#/app/assistant', { waitUntil: 'domcontentloaded', timeout: 30000 })
    const input = page.locator('.ac-input').first()
    await input.waitFor({ timeout: 20000 })
    await input.fill('今日简报')
    await page.keyboard.press('Enter')
    await page.locator('.ac-card').first().waitFor({ timeout: 25000 })
  })
  // 4. 校园墙列表
  await ok(page, '校园墙列表', async () => {
    await page.goto(BASE + '/#/app/campusWall', { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.getByText(/校园墙/).first().waitFor({ timeout: 20000 })
  })
  // 5. 墙内搜索不崩
  await ok(page, '墙内搜索', async () => {
    const box = page.locator('.cw-search').first()
    if (await box.count()) {
      await box.fill('食堂')
      await page.waitForTimeout(1200)
    }
  })
  // 6. 帖子详情抽屉
  await ok(page, '详情抽屉开关', async () => {
    const first = page.locator('.cw-feed .msg-thread, .cw-feed .wall-post-card, .cw-feed [class*="post"]').first()
    if (await first.count()) {
      await first.click()
      await page.waitForTimeout(1500)
      await page.keyboard.press('Escape')
    }
  })
  // 7. 技能市场看板
  await ok(page, '技能市场看板', async () => {
    await page.goto(BASE + '/#/app/skills', { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.getByText(/技能市场/).first().waitFor({ timeout: 20000 })
  })
  // 8. 管理页可开（登录框）
  await ok(page, '管理页登录框', async () => {
    await page.goto(BASE + '/admin.html', { timeout: 30000 })
    await page.locator('#tokenInput, #loginView').first().waitFor({ timeout: 20000 })
  })
  // 9. 404 兜底（乱地址回应用壳）
  await ok(page, '404兜底', async () => {
    const r = await page.goto(BASE + '/nope-xyz-' + Date.now(), { timeout: 30000 })
    assert(r && r.ok(), '状态码 ' + (r && r.status()))
  })
  // 10. 移动端页（仅 FJNU 有）
  if (!SKIP_MOBILE && IS_FJNU) {
    await ok(page, '移动端课表页', async () => {
      await page.goto(BASE + '/mobile.html', { waitUntil: 'domcontentloaded', timeout: 30000 })
      await page.locator('#agent-fab, #app').first().waitFor({ timeout: 20000 })
    })
  }
} finally {
  await browser.close().catch(() => {})
}

console.log(`\ne2e-browser: pass=${pass} fail=${fail}` + (failures.length ? ' [' + failures.join(', ') + ']' : ''))
process.exit(fail ? 1 : 0)
