<script setup>
/**
 * ════════════════════════════════════════════════════════════════════
 * @模块路径  src/views/CourseImporter.vue
 * @职责      课表导入器：粘贴课表文本/CSV → 宽松解析 → 预览校对 → 本机存储，
 *            解锁智能体「明天上什么课」免设置班级直接查询
 * @路由      #/app/importer（apps.js + router.js 双登记）
 * @数据      localStorage: qdu_imported_courses = [{d(1-7), s, e, c, t, r}]
 *            与 workflows.dayClass 打通（导入数据优先于班级查询）
 * @解析策略  宽松逐行：识别 周X/星期X + 第a-b节/数字节次 + 教室号(\d{3,4}) +
 *            教师名 + 其余为课程名；也支持逗号/制表符分列的 CSV 行
 * @隐私      全部数据仅存本机浏览器，不上传任何服务器
 * ════════════════════════════════════════════════════════════════════
 */
import { ref, computed, onMounted } from 'vue'

const emit = defineEmits(['back'])

const KEY = 'qdu_imported_courses'
const raw = ref('')
const parsed = ref([])
const saved = ref([])
const msg = ref('')
const msgErr = ref(false)

const EXAMPLE = `周一 1-2 高等数学 李老师 3号教学楼301
周一 3-4 大学英语 王老师 5号教学楼203
周三 第5-6节 数据结构 张老师 3教402
周五 7-8 体育 田径场`

function loadSaved() {
  try { saved.value = JSON.parse(localStorage.getItem(KEY) || '[]') } catch { saved.value = [] }
}
function persist(list) {
  try { localStorage.setItem(KEY, JSON.stringify(list)) } catch { /* noop */ }
  saved.value = list
}

const WEEK_MAP = { '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '日': 7, '天': 7 }

/** 宽松解析：逐行提取 周几/节次/教室/教师/课程 */
function parseLine(line) {
  const t = line.trim()
  if (!t) return null
  // 周几
  const wm = t.match(/(?:周|星期)([一二三四五六日天])/)
  if (!wm || !(wm[1] in WEEK_MAP)) return null
  const d = WEEK_MAP[wm[1]]
  // 节次：第1-2节 / 1-2 / 1~2
  let s = null; let e = null
  const pm = t.match(/第?\s*(\d{1,2})\s*[-~—到至]\s*(\d{1,2})\s*节?/)
  const pm1 = t.match(/第?\s*(\d{1,2})\s*节/)
  if (pm) { s = Number(pm[1]); e = Number(pm[2]) }
  else if (pm1) { s = Number(pm1[1]); e = s }
  if (s === null || e === null || s < 1 || e > 12 || e < s) return null
  let rest = t
    .replace(/(?:周|星期)[一二三四五六日天]/, '')
    .replace(/第?\s*\d{1,2}\s*[-~—到至]\s*\d{1,2}\s*节?/, '')
    .replace(/第?\s*\d{1,2}\s*节/, '')
    .trim()
  // 教室号（3-4位数字或"X教XXX"）
  let r = ''
  const rm = rest.match(/(\d{3,4})\b/) || rest.match(/([一-龥]?教\s*\d{3,4})/)
  if (rm) { r = rm[1] || rm[2]; rest = rest.replace(rm[0], '').trim() }
  // CSV/TSV 分列兜底：逗号或制表符切成 [课程, 教师, 教室]
  let c = ''; let teacher = ''
  if (/[,，\t]/.test(rest)) {
    const cols = rest.split(/[,，\t]/).map((x) => x.trim()).filter(Boolean)
    c = cols[0] || ''
    teacher = cols[1] || ''
    if (cols[2] && !r) r = cols[2]
  } else {
    // 中文串里提教师：匹配 "X老师/X教授/老师" 前缀或后缀
    const tm = rest.match(/([\u4e00-\u9fa5]{1,4})(?:老师|教授|讲师)/)
    if (tm) { teacher = tm[1] + (tm[0].includes('老师') ? '老师' : ''); rest = rest.replace(tm[0], '').trim() }
    c = rest
  }
  if (!c) return null
  return { d, s, e, c, t: teacher, r }
}

function parseAll() {
  msg.value = ''
  const lines = raw.value.split(/\r?\n/)
  const out = []
  const seen = new Set()
  for (const line of lines) {
    const row = parseLine(line)
    if (!row) continue
    const key = row.d + '-' + row.s + '-' + row.c
    if (seen.has(key)) continue
    seen.add(key)
    out.push(row)
  }
  parsed.value = out.sort((a, b) => a.d - b.d || a.s - b.s)
  if (!parsed.value.length) {
    msgErr.value = true
    msg.value = '未识别到课程行——每行需包含「周X」与节次（如：周一 1-2 高等数学 李老师 301）'
  } else {
    msgErr.value = false
    const dup = saved.value.length ? '（将覆盖已导入的 ' + saved.value.length + ' 条）' : ''
    msg.value = '✓ 解析出 ' + parsed.value.length + ' 门课程' + dup + '，确认无误后点「保存到本机」'
  }
}

function saveImported() {
  if (!parsed.value.length) { msgErr.value = true; msg.value = '先解析出课程再保存'; return }
  persist(parsed.value.map((x) => ({ ...x, importedAt: Date.now() })))
  msgErr.value = false
  msg.value = '✓ 已保存 ' + saved.value.length + ' 条到本机 —— 现在对智能体说「明天上什么课」即可直接查询（无需设置班级）'
  parsed.value = []
  raw.value = ''
}

function clearAll() {
  persist([])
  parsed.value = []
  msgErr.value = false
  msg.value = '已清空导入数据'
}

function fillExample() { raw.value = EXAMPLE }

const WEEK = ['', '周一', '周二', '周三', '周四', '周五', '周六', '周日']
const grouped = computed(() => {
  const g = {}
  for (const c of saved.value) { (g[c.d] = g[c.d] || []).push(c) }
  return Object.keys(g).sort((a, b) => a - b).map((d) => ({ d: Number(d), list: g[d].sort((a, b) => a.s - b.s) }))
})

function askAgent() {
  try { localStorage.setItem('qdu_agent_inbox', '明天上什么课') } catch { /* noop */ }
  emit('open', 'assistant')
}

onMounted(loadSaved)
</script>

<template>
  <div class="ci2">
    <div class="ci2-head">
      <button class="ci2-back" @click="emit('back')">‹ 返回</button>
      <div class="ci2-title">📥 课表导入器 <span class="ci2-sub">粘贴即解析 · 存本机 · 解锁免班级查课表</span></div>
      <button v-if="saved.length" class="ci2-mini" @click="askAgent">🤖 试试「明天上什么课」</button>
    </div>

    <div class="ci2-banner">
      <b>从哪里复制？</b>教务系统课表页直接全选复制 · Excel 每行粘贴 · 手打示例也行。
      每行需含「周X + 节次」，其余会自动识别课程/教师/教室。数据仅存你的浏览器。
      <button class="ci2-link" @click="fillExample">填入示例格式</button>
    </div>

    <!-- 粘贴区 -->
    <div class="ci2-card">
      <div class="ci2-card-t">① 粘贴课表文本</div>
      <textarea v-model="raw" class="ci2-text" rows="7" placeholder="周一 1-2 高等数学 李老师 301&#10;周三 第5-6节 数据结构 张老师 3教402&#10;…（支持逗号/制表符分列的 CSV 行）"></textarea>
      <div class="ci2-row">
        <button class="ci2-btn primary" @click="parseAll">🔍 解析</button>
        <button class="ci2-btn ghost" @click="raw = ''; parsed = []; msg = ''">清空</button>
        <span class="ci2-msg" :class="{ err: msgErr }">{{ msg }}</span>
      </div>
    </div>

    <!-- 预览 -->
    <div v-if="parsed.length" class="ci2-card">
      <div class="ci2-card-t">② 解析预览（{{ parsed.length }} 条）—— 确认后保存</div>
      <div class="ci2-preview">
        <div v-for="(c, i) in parsed" :key="i" class="ci2-row-item">
          <span class="ci2-week">{{ WEEK[c.d] }}</span>
          <span class="ci2-period">第 {{ c.s }}-{{ c.e }} 节</span>
          <b class="ci2-course">{{ c.c }}</b>
          <span class="ci2-teacher">{{ c.t || '—' }}</span>
          <span class="ci2-room">{{ c.r || '—' }}</span>
        </div>
      </div>
      <div class="ci2-row">
        <button class="ci2-btn primary" @click="saveImported">💾 保存到本机</button>
        <button class="ci2-btn ghost" @click="parsed = []">重新编辑</button>
      </div>
    </div>

    <!-- 已导入 -->
    <div v-if="saved.length" class="ci2-card">
      <div class="ci2-card-t">✅ 已导入课表（{{ saved.length }} 条 · 按周分组）</div>
      <div v-for="g in grouped" :key="g.d" class="ci2-group">
        <div class="ci2-group-t">{{ WEEK[g.d] }}</div>
        <div v-for="(c, i) in g.list" :key="i" class="ci2-row-item mini">
          <span class="ci2-period">第 {{ c.s }}-{{ c.e }} 节</span>
          <b class="ci2-course">{{ c.c }}</b>
          <span class="ci2-teacher">{{ c.t }}</span>
          <span class="ci2-room">{{ c.r }}</span>
        </div>
      </div>
      <div class="ci2-row">
        <button class="ci2-btn" @click="askAgent">🤖 问智能体「明天上什么课」</button>
        <button class="ci2-btn danger" @click="clearAll">清除全部</button>
      </div>
      <div class="ci2-note">查询优先级：本机导入课表 → 班级记忆查询。两条路径都失败时如实提示，不编造课表。</div>
    </div>

    <div v-else class="ci2-empty">还没有导入课表——粘贴上方文本，三步完成：粘贴 → 解析 → 保存</div>
  </div>
</template>

<style scoped>
.ci2 { display: flex; flex-direction: column; gap: 13px; }
.ci2-head { display: flex; align-items: center; gap: 11px; flex-wrap: wrap; }
.ci2-back { border: 1px solid var(--border, #e5eaf2); background: var(--card, #fff); color: var(--text, #24292f); border-radius: 999px; padding: 6px 14px; cursor: pointer; font-family: inherit; font-size: 13px; }
.ci2-title { flex: 1; font-size: 17px; font-weight: 800; color: var(--text, #24292f); min-width: 200px; }
.ci2-sub { display: block; font-size: 11px; color: var(--muted, #8a94a6); font-weight: 400; margin-top: 2px; }
.ci2-mini { border: 1px solid var(--border, #e5eaf2); background: var(--card, #fff); color: var(--primary, #1b66c9); font-size: 12.5px; padding: 6px 14px; border-radius: 999px; cursor: pointer; font-family: inherit; font-weight: 600; }

.ci2-banner { font-size: 12.5px; line-height: 1.8; background: var(--primary-soft, rgba(27, 102, 201, 0.07)); border: 1px dashed var(--primary, #1b66c9); border-radius: 11px; padding: 10px 14px; color: var(--text, #24292f); }
.ci2-link { border: none; background: var(--primary, #1b66c9); color: #fff; font-size: 11.5px; padding: 3px 12px; border-radius: 999px; cursor: pointer; font-family: inherit; margin-left: 8px; }

.ci2-card { border: 1px solid var(--border, #e5eaf2); background: var(--card, #fff); border-radius: 14px; padding: 15px 17px; }
.ci2-card-t { font-size: 13.5px; font-weight: 800; color: var(--text, #24292f); margin-bottom: 10px; }
.ci2-text { width: 100%; border: 1px solid var(--border, #e5eaf2); border-radius: 10px; padding: 11px 13px; font-size: 13px; font-family: ui-monospace, monospace; background: var(--bg, #f7f9fc); color: var(--text, #24292f); resize: vertical; outline: none; line-height: 1.7; }
.ci2-text:focus { border-color: var(--primary, #1b66c9); }
.ci2-row { display: flex; gap: 10px; align-items: center; margin-top: 10px; flex-wrap: wrap; }
.ci2-btn { border: 1px solid var(--border, #e5eaf2); background: var(--card, #fff); color: var(--text, #24292f); padding: 8px 18px; border-radius: 999px; cursor: pointer; font-family: inherit; font-size: 13px; }
.ci2-btn.primary { background: var(--primary, #1b66c9); border-color: var(--primary, #1b66c9); color: #fff; font-weight: 700; }
.ci2-btn.ghost { opacity: 0.75; }
.ci2-btn.danger { border-color: #e11d48; color: #e11d48; }
.ci2-msg { font-size: 12.5px; color: #2e7d32; }
.ci2-msg.err { color: #d1242f; }

.ci2-preview { display: flex; flex-direction: column; gap: 6px; max-height: 300px; overflow-y: auto; }
.ci2-row-item { display: flex; gap: 11px; align-items: center; background: var(--bg, #f7f9fc); border-radius: 9px; padding: 8px 12px; font-size: 13px; }
.ci2-row-item.mini { padding: 6px 11px; }
.ci2-week { background: var(--primary, #1b66c9); color: #fff; font-size: 11px; font-weight: 700; border-radius: 6px; padding: 2px 8px; flex-shrink: 0; }
.ci2-period { color: var(--muted, #8a94a6); font-size: 12px; flex-shrink: 0; }
.ci2-course { color: var(--text, #24292f); flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ci2-teacher, .ci2-room { color: var(--muted, #8a94a6); font-size: 12px; flex-shrink: 0; }

.ci2-group { margin-top: 10px; }
.ci2-group-t { font-size: 13px; font-weight: 800; color: var(--primary, #1b66c9); margin-bottom: 6px; }
.ci2-group .ci2-row-item { margin-bottom: 6px; }

.ci2-note { font-size: 11.5px; color: var(--muted, #8a94a6); margin-top: 10px; background: var(--bg, #f7f9fc); border-radius: 8px; padding: 8px 11px; line-height: 1.7; }
.ci2-empty { padding: 34px; text-align: center; color: var(--muted, #8a94a6); font-size: 13px; }
</style>
