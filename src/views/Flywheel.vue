<script setup>
/**
 * ════════════════════════════════════════════════════════════════════
 * @模块路径  src/views/Flywheel.vue
 * @职责      协作飞轮看板：用户 Agent 执行量 + 维护 Agent 能力 + 评论回流 +
 *            AI 治理日报 —— 标题“基于 AI Agent 协作维护”的可视化兑现
 * @路由      #/app/flywheel（VIEWS.flywheel + data/apps 双登记）
 * @数据      wf_usage（本机执行计数）· 网关 /api/admin/overview（需口令则降级本机）·
 *            wall 帖子（aiMod 治理）· feedback 本机 merging
 * @交互      口令填一次看全站数；无口令看本机数（诚实标注口径）
 * ════════════════════════════════════════════════════════════════════
 */
import { ref, onMounted } from 'vue'
import { loadPosts } from '../wall/api.js'
import { modReport } from '../wall/aiMod.js'

const emit = defineEmits(['back'])
const token = ref('')
const authed = ref(false)
const stats = ref({ runs: 0, posts: 0, replies: 0, feedback: 0, reports: 0 })
const weekExec = ref([])

/** 近 7 天执行柱（qdu_agent_exec_ts 本机记录，无记录即空态） */
function execWeek() {
  let arr = []
  try { arr = JSON.parse(localStorage.getItem('qdu_agent_exec_ts') || '[]') } catch { arr = [] }
  const out = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000)
    const ds = d.toDateString()
    const n = arr.filter((ts) => new Date(ts).toDateString() === ds).length
    out.push({ label: (d.getMonth() + 1) + '/' + d.getDate(), n })
  }
  return out
}
const report = ref(null)
const disputes = ref([])
const questions = ref([])
const fixes = ref([])
const err = ref('')

function wfRuns() {
  try {
    const u = JSON.parse(localStorage.getItem('qdu_wf_usage') || '{}')
    return Object.values(u).reduce((a, n) => a + (n || 0), 0)
  } catch { return 0 }
}
async function load() {
  err.value = ''
  // 本机数（永远有）
  let posts = []
  try {
    const r = await loadPosts({ sort: 'new' })
    posts = r.posts || []
  } catch { /* 空态 */ }
  const replies = posts.reduce((a, p) => a + (p.replies || []).length, 0)
  let feedback = 0
  try { feedback = (JSON.parse(localStorage.getItem('qdu_agent_fb') || '[]') || []).length } catch { /* noop */ }
  stats.value = { runs: wfRuns(), posts: posts.length, replies, feedback, reports: 0 }
  weekExec.value = execWeek()
  const rep = modReport(posts, [])
  report.value = rep.summary
  disputes.value = rep.disputes.slice(0, 5)
  questions.value = rep.questions
  fixes.value = rep.fixes.slice(0, 5)
  // 管理数（有口令才有；失败静默，本机数照展）
  if (token.value.trim()) {
    try {
      const r = await fetch('/api/admin/overview', { headers: { 'x-admin-token': token.value.trim() } })
      const d = await r.json()
      if (r.ok) {
        authed.value = true
        stats.value.reports = (d.reports || []).length
        stats.value.feedback = d.feedback ? d.feedback.total : feedback
      } else throw new Error(d.error || '口令不对')
    } catch (e) { err.value = '管理数拉取失败（本机数照常展示）：' + e.message }
  }
}
onMounted(load)
</script>

<template>
  <div class="fw-wrap">
    <div class="fw-head">
      <button class="back" @click="emit('back')">‹ 返回</button>
      <b>🔄 协作飞轮</b>
      <span class="fw-tag">用户 Agent ⇄ 维护 Agent</span>
    </div>
    <div class="fw-flow">你一句话办事 → 执行计数+1 → 反馈/纠错回流 → 维护 Agent 修 → 下次更准</div>
    <div class="fw-grid">
      <div class="fw-stat"><b>{{ stats.runs }}</b><span>Agent 执行（本机）</span></div>
      <div class="fw-stat"><b>{{ stats.posts }}</b><span>墙帖子</span></div>
      <div class="fw-stat"><b>{{ stats.replies }}</b><span>回复</span></div>
      <div class="fw-stat"><b>{{ stats.feedback }}</b><span>反馈</span></div>
      <div class="fw-stat"><b>{{ stats.reports }}</b><span>待处举报</span></div>
    </div>
    <div class="fw-card">
      <b>📈 近 7 天执行</b>
      <div v-if="!weekExec.reduce((a, d) => a + d.n, 0)" class="fw-empty">暂无执行记录，多用智能体办事即可点亮</div>
      <div v-else class="fw-week">
        <div v-for="d in weekExec" :key="d.label" class="fw-wk">
          <div class="fw-wkbar" :style="{ height: Math.min(64, d.n * 8 + 2) + 'px' }"></div>
          <span>{{ d.label }}</span><em>{{ d.n }}</em>
        </div>
      </div>
    </div>
    <div class="fw-card">
      <b>🤖 AI 治理日报</b>
      <p>{{ report || '计算中…' }}</p>
    </div>
    <div v-if="disputes.length" class="fw-card">
      <b>⚠️ 争议帖（规则检出，可解释）</b>
      <div v-for="d in disputes" :key="d.post.id" class="fw-row">
        <span>{{ (d.post.title || '(无标题)').slice(0, 18) }}</span>
        <em>{{ d.level === 'high' ? '高' : '中' }} · {{ d.reasons.join('；').slice(0, 30) }}</em>
      </div>
    </div>
    <div v-if="questions.length" class="fw-card">
      <b>💡 高频选题（维护 Agent 选题库）</b>
      <div v-for="q in questions" :key="q.word" class="fw-row">
        <span>#{{ q.word }}</span><em>问了 {{ q.n }} 次</em>
      </div>
    </div>
    <div class="fw-card">
      <b>🔑 管理口令（看全站数，可选）</b>
      <div class="fw-row2">
        <input v-model="token" type="password" placeholder="管理口令（不填只看本机数）" />
        <button @click="load">拉取</button>
      </div>
      <div v-if="err" class="fw-err">{{ err }}</div>
      <div v-if="authed" class="fw-ok">✅ 已连管理台，全站数生效</div>
    </div>
  </div>
</template>

<style scoped>
.fw-wrap { display: flex; flex-direction: column; gap: 12px; padding-bottom: 30px; }
.fw-head { display: flex; align-items: center; gap: 10px; }
.fw-head .back { border: 1px solid #e5e5e5; background: #fafafa; border-radius: 10px; padding: 3px 10px; cursor: pointer; }
.fw-tag { font-size: 11px; background: #ede9fe; color: #6d28d9; border-radius: 8px; padding: 1px 8px; }
.fw-flow { font-size: 12px; color: #666; background: #f8fafc; border-radius: 8px; padding: 8px 12px; line-height: 1.8; }
.fw-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; }
.fw-stat { border: 1px solid #eee; border-radius: 12px; padding: 10px 4px; text-align: center; background: #fff; }
.fw-stat b { display: block; font-size: 20px; color: #1b66c9; font-variant-numeric: tabular-nums; }
.fw-stat span { font-size: 11px; color: #888; }
.fw-card { border: 1px solid #eee; border-radius: 12px; padding: 12px 14px; background: #fff; }
.fw-card p { font-size: 13px; color: #333; line-height: 1.8; margin: 6px 0 0; }
.fw-row { display: flex; justify-content: space-between; font-size: 13px; padding: 5px 0; border-bottom: 1px dashed #f0f0f0; }
.fw-row em { font-style: normal; font-size: 12px; color: #b45309; }
.fw-row2 { display: flex; gap: 6px; margin-top: 6px; }
.fw-row2 input { flex: 1; border: 1px solid #ddd; border-radius: 10px; padding: 7px 12px; }
.fw-row2 button { border: 1px solid #1b66c9; background: #1b66c9; color: #fff; border-radius: 10px; padding: 7px 16px; cursor: pointer; }
.fw-err { font-size: 12px; color: #b91c1c; margin-top: 6px; }
.fw-ok { font-size: 12px; color: #166534; margin-top: 6px; }
.fw-empty { color: #999; font-size: 13px; padding: 8px 0; }
.fw-week { display: flex; gap: 8px; align-items: flex-end; margin-top: 8px; }
.fw-wk { flex: 1; text-align: center; font-size: 11px; color: #888; display: flex; flex-direction: column; gap: 2px; align-items: center; }
.fw-wkbar { width: 70%; background: linear-gradient(180deg, #7c3aed, #c4b5fd); border-radius: 4px 4px 0 0; min-height: 3px; }
.fw-wk em { font-style: normal; color: #333; font-weight: 700; }
</style>
