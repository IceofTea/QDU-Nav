<script setup>
/**
 * ════════════════════════════════════════════════════════════════════
 * @模块路径  src/views/RebrandPreview.vue（v2 · 网站工坊）
 * @职责      「白痴式」可视化换校与改站中心：
 *            ① 基本信息/校情表单 ② 站点文案编辑（hero/页脚/图例…）
 *            ③ 样式工坊（主题色/圆角/字号/自定义CSS —— 实时生效到整站）
 *            ④ 一键生成完整 site.js 源码（下载覆盖即持久化）
 *            ⑤ 导入现有 site.js 反解析回填（在原站上直接打字改）
 *            ⑥ 与智能体联动播报配置；与换校工具.bat / customize.py 闭环
 * @路由      #/app/rebrand（apps.js + router.js 双登记）
 * @联动      生成的 JSON 与 customize.py --config 同构；生成的 site.js 可
 *            直接覆盖 src/config/site.js；样式实时预览刷新即还原（提示明确）
 * @换校闭环  bat[1] 打开本页 → 打字改 → 生成下载 → 覆盖/喂脚本 → build 完成
 * ════════════════════════════════════════════════════════════════════
 */
import { ref, computed, reactive, onMounted, onBeforeUnmount } from 'vue'
import { SITE } from '../config/site'

const emit = defineEmits(['back'])

/* ── 表单状态（初值来自当前站点 =「在原站上直接改」） ── */
const form = reactive({
  university: (SITE.tagline || '').split(' · ')[0] || '',
  shortName: (SITE.name || '').replace(' 校园导航', '').replace('QDU ', '青大'),
  brand: SITE.brand || '',
  motto: SITE.motto || '',
  jwUrl: SITE.jwUrl || '',
  name: SITE.name || '',
  tagline: SITE.tagline || '',
  heroSub: SITE.heroSub || '',
  welcomeTip: SITE.welcomeTip || '',
  copy: SITE.copy || '',
  legendLive: SITE.legendLive || '',
  legendDemo: SITE.legendDemo || '',
  legendTool: SITE.legendTool || '',
  campuses: 3, colleges: 28, majors: 90
})

/* ── 样式工坊（实时生效） ── */
const primary = ref('#1b66c9')
const accent = ref('#4f8df0')
const radius = ref(16)
const fontScale = ref(0)        // 0=默认；±步进注入 html{font-size}
const customCss = ref('')
const liveApplied = ref(false)

const PRESETS = [
  { name: '青大蓝', p: '#1b66c9', a: '#4f8df0' },
  { name: '闽都红', p: '#c62828', a: '#ff5722' },
  { name: '北大红', p: '#8b0000', a: '#cc0000' },
  { name: '清华紫', p: '#6b21a8', a: '#9333ea' },
  { name: '复旦蓝', p: '#1e40af', a: '#3b82f6' },
  { name: '浙大绿', p: '#166534', a: '#22c55e' },
  { name: '交大橙', p: '#c2410c', a: '#f97316' },
  { name: '武大樱', p: '#be185d', a: '#ec4899' },
  { name: '华科灰', p: '#374151', a: '#6b7280' }
]

function applyLive() {
  const r = document.documentElement
  r.style.setProperty('--primary', primary.value)
  r.style.setProperty('--primary-dark', primary.value)
  r.style.setProperty('--accent', accent.value)
  r.style.setProperty('--radius', radius.value + 'px')
  // 字号：注入 html 级覆盖（刷新即还原）
  let st = document.getElementById('studio-live-style')
  if (!st) { st = document.createElement('style'); st.id = 'studio-live-style'; document.head.appendChild(st) }
  const baseSize = 16 + fontScale.value
  st.textContent =
    `html{font-size:${baseSize}px}` +
    (customCss.value ? '\n' + customCss.value : '')
  liveApplied.value = true
}
function resetLive() {
  const r = document.documentElement
  r.style.removeProperty('--primary')
  r.style.removeProperty('--primary-dark')
  r.style.removeProperty('--accent')
  r.style.removeProperty('--radius')
  const st = document.getElementById('studio-live-style')
  if (st) st.remove()
  primary.value = '#1b66c9'
  accent.value = '#4f8df0'
  radius.value = 16
  fontScale.value = 0
  customCss.value = ''
  liveApplied.value = false
}
function pickPreset(t) { primary.value = t.p; accent.value = t.a; applyLive() }

/* ── 生成 site.js 源码 ── */
const genMode = ref('js')   // js | json
const generated = computed(() => {
  if (genMode.value === 'json') {
    return JSON.stringify({
      university: form.university, shortName: form.shortName, brand: form.brand,
      motto: form.motto, jwUrl: form.jwUrl,
      tiebaUrl: 'https://tieba.baidu.com/f?kw=' + encodeURIComponent(form.university),
      github: 'https://github.com/your-org/' + form.brand,
      pagesUrl: 'https://your-org.github.io/' + form.brand + '/',
      campuses: Number(form.campuses), colleges: Number(form.colleges), majors: Number(form.majors),
      theme: { name: '自定义', primary: primary.value, accent: accent.value, bg: '#f7f9fc' }
    }, null, 2)
  }
  return `/**
 * 站点全局配置（单一事实来源）—— 由「网站工坊」生成 v${new Date().toISOString().slice(0, 10)}
 * 覆盖方式：全选下方代码 → 粘贴覆盖 src/config/site.js → npm run build 生效
 * 或：切换到 JSON 模式下载 → python customize.py --config <文件> 自动落盘
 */
export const SITE = {
  brand: '${form.brand}',
  name: '${form.name}',
  tagline: '${form.tagline}',
  motto: '${form.motto}',
  version: '${SITE.version}',
  developer: '${SITE.developer}',
  welcomeTip: '${form.welcomeTip}',
  heroSub: '${form.heroSub}',
  legendLive: '${form.legendLive}',
  legendDemo: '${form.legendDemo}',
  legendTool: '${form.legendTool}',
  copy: '${form.copy}',
  devLine:
    '${SITE.devLine}',
  aboutSource:
    '${(SITE.aboutSource || '').replace(/'/g, "\\'")}',
  aboutCrawl:
    '${(SITE.aboutCrawl || '').replace(/'/g, "\\'")}',
  aboutUsage:
    '${(SITE.aboutUsage || '').replace(/'/g, "\\'")}',
  wiki: ${JSON.stringify(SITE.wiki, null, 2).replace(/\n/g, '\n  ')},
  counter: ${JSON.stringify(SITE.counter, null, 2).replace(/\n/g, '\n  ')},
  jwUrl: '${form.jwUrl}'
}
`
})
const copiedFlag = ref(false)
function copyGen() {
  try { navigator.clipboard.writeText(generated.value); copiedFlag.value = true; setTimeout(() => { copiedFlag.value = false }, 1600) } catch { /* noop */ }
}
function downloadGen() {
  const isJson = genMode.value === 'json'
  const blob = new Blob([generated.value], { type: isJson ? 'application/json' : 'text/javascript' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = isJson ? form.brand.toLowerCase() + '.json' : 'site.js'
  a.click()
  URL.revokeObjectURL(a.href)
}

/* ── 导入现有 site.js 反解析（白痴操作核心：把原文件贴进来直接改） ── */
const importText = ref('')
const importMsg = ref('')
function importSite() {
  importMsg.value = ''
  const t = importText.value
  if (!t.includes('export const SITE')) { importMsg.value = '未识别到 export const SITE，请粘贴完整 src/config/site.js 内容'; return }
  const pick = (key) => {
    const m = t.match(new RegExp(key + ":\\s*'([^']*)'"))
    return m ? m[1] : null
  }
  const pairs = {
    brand: pick('brand'), name: pick('name'), tagline: pick('tagline'),
    motto: pick('motto'), jwUrl: pick('jwUrl'), heroSub: pick('heroSub'),
    welcomeTip: pick('welcomeTip'), copy: pick('copy'),
    legendLive: pick('legendLive'), legendDemo: pick('legendDemo'), legendTool: pick('legendTool')
  }
  let n = 0
  for (const k in pairs) { if (pairs[k] != null) { form[k] = pairs[k]; n++ } }
  if (pairs.brand) form.brand = pairs.brand
  if (pairs.name) { form.name = pairs.name; form.shortName = pairs.name.replace(' 校园导航', '') }
  importMsg.value = n > 0 ? `✓ 已解析 ${n} 个字段回填表单，直接打字修改即可` : '未匹配到字段'
}
function resetFromSite() {
  form.university = (SITE.tagline || '').split(' · ')[0] || ''
  form.shortName = (SITE.name || '').replace(' 校园导航', '')
  form.brand = SITE.brand
  form.motto = SITE.motto
  form.jwUrl = SITE.jwUrl
  form.name = SITE.name
  form.tagline = SITE.tagline
  form.heroSub = SITE.heroSub
  form.welcomeTip = SITE.welcomeTip
  form.copy = SITE.copy
  form.legendLive = SITE.legendLive
  form.legendDemo = SITE.legendDemo
  form.legendTool = SITE.legendTool
  importMsg.value = '已还原为当前站点配置'
}

/* ── 智能体联动 ── */
function askAgentAboutConfig() {
  const text = `介绍当前站点配置：品牌${form.brand}、学校${form.university}、主题色${primary.value}`
  try { localStorage.setItem('qdu_agent_inbox', text) } catch { /* noop */ }
  emit('open', 'assistant')
}
function tryThemeInAgent() {
  try { localStorage.setItem('qdu_agent_inbox', `换校向导 里的主题试穿怎么用`) } catch { /* noop */ }
  emit('open', 'assistant')
}

/* 离开页面自动还原实时样式（避免误伤后续浏览；持久化须生成文件） */
onBeforeUnmount(() => { /* 保留实时效果供连续编辑，用户可手动还原 */ })
onMounted(() => { /* 初值不动站点样式 */ })
</script>

<template>
  <div class="sp">
    <div class="sp-head">
      <button class="sp-back" @click="emit('back')">‹ 返回</button>
      <div class="sp-title">🎨 网站工坊 <span class="sp-sub">白痴式改站 · 打字即生效 · 生成源码一键覆盖 · 换校闭环</span></div>
      <span v-if="liveApplied" class="sp-live">● 样式实时生效中（刷新还原）</span>
      <button class="sp-mini" @click="askAgentAboutConfig">🤖 让智能体介绍本配置</button>
    </div>

    <!-- 顶部提示 -->
    <div class="sp-banner">
      <b>三种玩法：</b>
      ① 直接在下方输入框<b>打字修改</b>（原站内容已自动载入）→「生成 site.js」下载覆盖源文件；
      ② 右侧<b>点选配色/拖动字号圆角</b>——整站立即变样（所见即所得）；
      ③ 粘贴<b>原 site.js</b> 到导入框 → 字段回填 → 改完再生成（在原站上改，最稳）。
      完成后也可导出 JSON 交给 <code>customize.py --config</code> 或用根目录<b>换校工具.bat</b>一键执行。
    </div>

    <div class="sp-grid">
      <!-- 左列：表单 -->
      <section class="sp-col">
        <!-- 导入 -->
        <div class="sp-card">
          <div class="sp-card-t">📥 导入现有 site.js（可选 · 在原站基础上改）</div>
          <textarea v-model="importText" class="sp-code" rows="4" placeholder="把 src/config/site.js 全文粘贴到这里 → 点击解析"></textarea>
          <div class="sp-row">
            <button class="sp-btn" @click="importSite">解析并回填</button>
            <button class="sp-btn ghost" @click="resetFromSite">还原为当前站点</button>
            <span v-if="importMsg" class="sp-msg">{{ importMsg }}</span>
          </div>
        </div>

        <!-- 基本信息 -->
        <div class="sp-card">
          <div class="sp-card-t">📝 学校信息</div>
          <div class="sp-field"><label>学校全称</label><input v-model="form.university" class="sp-input" /></div>
          <div class="sp-field"><label>学校简称</label><input v-model="form.shortName" class="sp-input" /></div>
          <div class="sp-field"><label>品牌名</label><input v-model="form.brand" class="sp-input" /></div>
          <div class="sp-field"><label>站点名 name</label><input v-model="form.name" class="sp-input" /></div>
          <div class="sp-field"><label>副标题 tagline</label><input v-model="form.tagline" class="sp-input" /></div>
          <div class="sp-field"><label>校训 motto</label><input v-model="form.motto" class="sp-input" /></div>
          <div class="sp-field"><label>教务处网址</label><input v-model="form.jwUrl" class="sp-input" /></div>
        </div>

        <!-- 站点文案 -->
        <div class="sp-card">
          <div class="sp-card-t">✏️ 站点文案（改这里 = 改网站上的字）</div>
          <div class="sp-field"><label>首页问候副句 heroSub</label><input v-model="form.heroSub" class="sp-input" /></div>
          <div class="sp-field"><label>欢迎页提示 welcomeTip</label><input v-model="form.welcomeTip" class="sp-input" /></div>
          <div class="sp-field"><label>页脚版权 copy</label><input v-model="form.copy" class="sp-input" /></div>
          <div class="sp-field"><label>页脚图例·实时数据 legendLive</label><input v-model="form.legendLive" class="sp-input" /></div>
          <div class="sp-field"><label>页脚图例·官方通道 legendDemo</label><input v-model="form.legendDemo" class="sp-input" /></div>
          <div class="sp-field"><label>页脚图例·校园工具 legendTool</label><input v-model="form.legendTool" class="sp-input" /></div>
        </div>

        <!-- 校情 -->
        <div class="sp-card">
          <div class="sp-card-t">🏛️ 校情数据</div>
          <div class="sp-row3">
            <div class="sp-field"><label>校区</label><input v-model.number="form.campuses" type="number" class="sp-input" /></div>
            <div class="sp-field"><label>学院</label><input v-model.number="form.colleges" type="number" class="sp-input" /></div>
            <div class="sp-field"><label>专业</label><input v-model.number="form.majors" type="number" class="sp-input" /></div>
          </div>
        </div>
      </section>

      <!-- 右列：样式工坊 + 预览 + 生成 -->
      <section class="sp-col">
        <!-- 样式工坊 -->
        <div class="sp-card">
          <div class="sp-card-t">🎨 样式工坊 <span class="sp-hint">以下操作立即作用于整个网站</span></div>
          <div class="sp-presets">
            <button v-for="t in PRESETS" :key="t.name" class="sp-preset" @click="pickPreset(t)">
              <i :style="{ background: t.p }"></i>{{ t.name }}
            </button>
          </div>
          <div class="sp-row" style="margin-top:10px">
            <div class="sp-field inline"><label>主色</label><input type="color" v-model="primary" @input="applyLive" class="sp-color" /></div>
            <div class="sp-field inline"><label>强调色</label><input type="color" v-model="accent" @input="applyLive" class="sp-color" /></div>
          </div>
          <div class="sp-field"><label>卡片圆角 {{ radius }}px</label><input type="range" v-model.number="radius" min="0" max="24" @input="applyLive" class="sp-range" /></div>
          <div class="sp-field"><label>字号缩放 {{ fontScale >= 0 ? '+' : '' }}{{ fontScale }}px（基础 16px）</label><input type="range" v-model.number="fontScale" min="-3" max="4" @input="applyLive" class="sp-range" /></div>
          <div class="sp-field"><label>自定义 CSS（粘贴即生效 · 支持任意样式规则）</label>
            <textarea v-model="customCss" @input="applyLive" class="sp-code" rows="3" placeholder=".hero-title{letter-spacing:4px}  .bottom-nav{display:none} …"></textarea>
          </div>
          <div class="sp-row">
            <button class="sp-btn ghost" @click="resetLive">↺ 还原全部样式</button>
            <span class="sp-msg">实时改动刷新页面即还原；要持久化请在下方生成 site.js 或用主题变量写入 styles.css</span>
          </div>
        </div>

        <!-- 预览 -->
        <div class="sp-card">
          <div class="sp-card-t">👁️ 配置预览</div>
          <div class="sp-preview" :style="{ '--p': primary, '--a': accent, '--r': radius + 'px' }">
            <div class="sp-pv-header">
              <span class="sp-pv-logo">{{ form.brand || 'BRAND' }}</span>
              <span class="sp-pv-name">{{ form.name }}</span>
              <span class="sp-pv-tag">{{ form.tagline }}</span>
            </div>
            <div class="sp-pv-body">
              <div class="sp-pv-hero">{{ form.heroSub }}</div>
              <div class="sp-pv-stats">
                <span><b>{{ form.campuses }}</b> 校区</span><span><b>{{ form.colleges }}</b> 学院</span>
                <span><b>{{ form.majors }}</b> 专业</span><span><b>27</b> 工作流</span>
              </div>
              <div class="sp-pv-foot">{{ form.copy }}</div>
            </div>
          </div>
        </div>

        <!-- 生成 -->
        <div class="sp-card">
          <div class="sp-card-t">📦 生成配置（两种模式）</div>
          <div class="sp-row">
            <button class="sp-btn" :class="{ on: genMode === 'js' }" @click="genMode = 'js'">site.js 源码（覆盖生效）</button>
            <button class="sp-btn" :class="{ on: genMode === 'json' }" @click="genMode = 'json'">JSON（喂 customize.py）</button>
          </div>
          <pre class="sp-out">{{ generated }}</pre>
          <div class="sp-row">
            <button class="sp-btn primary" @click="downloadGen">⇩ 下载 {{ genMode === 'js' ? 'site.js' : '配置.json' }}</button>
            <button class="sp-btn" @click="copyGen">{{ copiedFlag ? '✓ 已复制' : '⧉ 复制全部' }}</button>
            <button class="sp-btn ghost" @click="tryThemeInAgent">🤖 问智能体主题玩法</button>
          </div>
          <div class="sp-note">
            <b>落盘三选一：</b>① 下载 site.js → 覆盖 <code>src/config/site.js</code> → build；
            ② 下载 JSON → <code>python customize.py --config 文件</code>（7 处落点含智能体大脑）；
            ③ 根目录双击 <b>换校工具.bat → [2]/[3]</b> 交互执行。
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.sp { display: flex; flex-direction: column; gap: 13px; }
.sp-head { display: flex; align-items: center; gap: 11px; flex-wrap: wrap; }
.sp-back { border: 1px solid var(--border, #e5eaf2); background: var(--card, #fff); color: var(--text, #24292f); border-radius: 999px; padding: 6px 14px; cursor: pointer; font-family: inherit; font-size: 13px; }
.sp-title { flex: 1; font-size: 17px; font-weight: 800; color: var(--text, #24292f); min-width: 220px; }
.sp-sub { display: block; font-size: 11px; color: var(--muted, #8a94a6); font-weight: 400; margin-top: 2px; }
.sp-live { font-size: 11.5px; color: #2e7d32; background: rgba(46, 125, 50, 0.12); padding: 4px 12px; border-radius: 999px; font-weight: 700; animation: spPulse 1.6s infinite; }
@keyframes spPulse { 0%,100% { opacity: 1; } 50% { opacity: 0.55; } }
.sp-mini { border: 1px solid var(--border, #e5eaf2); background: var(--card, #fff); color: var(--muted, #8a94a6); font-size: 12px; padding: 6px 13px; border-radius: 999px; cursor: pointer; font-family: inherit; }
.sp-mini:hover { border-color: var(--primary, #1b66c9); color: var(--primary, #1b66c9); }

.sp-banner { font-size: 12.5px; line-height: 1.85; background: linear-gradient(135deg, var(--primary-soft, rgba(27,102,201,0.08)), transparent); border: 1px dashed var(--primary, #1b66c9); border-radius: 12px; padding: 11px 15px; color: var(--text, #24292f); }
.sp-banner code { background: rgba(0,0,0,0.06); padding: 1px 7px; border-radius: 5px; font-size: 12px; }

.sp-grid { display: grid; grid-template-columns: 1fr 1.15fr; gap: 13px; align-items: start; }
.sp-col { display: flex; flex-direction: column; gap: 13px; min-width: 0; }

.sp-card { border: 1px solid var(--border, #e5eaf2); background: var(--card, #fff); border-radius: 14px; padding: 14px 16px; }
.sp-card-t { font-size: 13.5px; font-weight: 800; color: var(--text, #24292f); margin-bottom: 10px; }
.sp-hint { font-size: 11px; color: var(--muted, #8a94a6); font-weight: 400; margin-left: 6px; }
.sp-field { display: flex; flex-direction: column; gap: 4px; margin-bottom: 9px; }
.sp-field.inline { flex-direction: row; align-items: center; gap: 7px; margin-bottom: 0; }
.sp-field label { font-size: 11px; color: var(--muted, #8a94a6); }
.sp-input { border: 1px solid var(--border, #e5eaf2); border-radius: 9px; padding: 8px 12px; font-size: 13.5px; font-family: inherit; background: var(--bg, #fff); color: var(--text, #24292f); outline: none; }
.sp-input:focus { border-color: var(--primary, #1b66c9); }
.sp-code { border: 1px solid var(--border, #e5eaf2); border-radius: 9px; padding: 9px 11px; font-size: 12px; font-family: ui-monospace, monospace; background: var(--bg, #f7f9fc); color: var(--text, #24292f); outline: none; resize: vertical; line-height: 1.6; width: 100%; }
.sp-row { display: flex; gap: 9px; align-items: center; flex-wrap: wrap; margin-top: 4px; }
.sp-row3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 9px; }
.sp-msg { font-size: 11.5px; color: #2e7d32; }
.sp-btn { border: 1px solid var(--border, #e5eaf2); background: var(--card, #fff); color: var(--text, #24292f); padding: 7px 15px; border-radius: 999px; cursor: pointer; font-family: inherit; font-size: 12.5px; }
.sp-btn:hover { border-color: var(--primary, #1b66c9); color: var(--primary, #1b66c9); }
.sp-btn.primary { background: var(--primary, #1b66c9); border-color: var(--primary, #1b66c9); color: #fff; font-weight: 600; }
.sp-btn.ghost { opacity: 0.8; }
.sp-btn.on { background: var(--primary, #1b66c9); border-color: var(--primary, #1b66c9); color: #fff; font-weight: 700; }

.sp-presets { display: flex; flex-wrap: wrap; gap: 6px; }
.sp-preset { display: flex; align-items: center; gap: 6px; border: 1px solid var(--border, #e5eaf2); background: transparent; color: var(--text, #24292f); font-size: 12px; padding: 5px 11px; border-radius: 999px; cursor: pointer; font-family: inherit; }
.sp-preset i { width: 12px; height: 12px; border-radius: 50%; }
.sp-preset:hover { border-color: var(--primary, #1b66c9); }
.sp-color { width: 52px; height: 32px; border: 1px solid var(--border, #e5eaf2); border-radius: 8px; padding: 2px; background: var(--bg, #fff); cursor: pointer; }
.sp-range { width: 100%; accent-color: var(--primary, #1b66c9); }

.sp-preview { border: 1px solid var(--border, #e5eaf2); border-radius: 12px; overflow: hidden; }
.sp-pv-header { display: flex; align-items: center; gap: 9px; padding: 11px 14px; background: var(--p); color: #fff; flex-wrap: wrap; }
.sp-pv-logo { background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.5); border-radius: 8px; padding: 3px 10px; font-weight: 800; font-size: 13px; }
.sp-pv-name { font-weight: 800; font-size: 15px; }
.sp-pv-tag { font-size: 11px; opacity: 0.85; }
.sp-pv-body { padding: 14px 16px; background: var(--bg, #f7f9fc); border-radius: 0 0 var(--r) var(--r); }
.sp-pv-hero { text-align: center; font-weight: 800; color: var(--p); font-size: 15px; margin-bottom: 10px; }
.sp-pv-stats { display: flex; justify-content: center; gap: 16px; font-size: 12px; color: var(--text, #24292f); }
.sp-pv-stats b { color: var(--p); font-size: 16px; }
.sp-pv-foot { text-align: center; font-size: 10.5px; color: var(--muted, #8a94a6); margin-top: 10px; border-top: 1px dashed rgba(0,0,0,0.1); padding-top: 8px; }

.sp-out { background: #0d1117; color: #7ee787; font-size: 11px; padding: 12px; border-radius: 10px; overflow: auto; max-height: 260px; line-height: 1.55; font-family: ui-monospace, monospace; white-space: pre; margin-top: 9px; }
.sp-note { margin-top: 10px; font-size: 11.5px; color: var(--muted, #8a94a6); line-height: 1.8; background: var(--bg, #f7f9fc); border-radius: 9px; padding: 9px 12px; }
.sp-note code { background: rgba(0,0,0,0.06); padding: 1px 6px; border-radius: 4px; }

@media (max-width: 940px) { .sp-grid { grid-template-columns: 1fr; } }
</style>
