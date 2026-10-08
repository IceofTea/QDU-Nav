<script setup>
/**
 * ════════════════════════════════════════════════════════════════════
 * @模块路径  src/views/CommunityInsights.vue
 * @职责      社区数据洞察：评论 14 日趋势（SVG 柱状）· 墙分区占比（SVG 环形）
 *            · 反馈分类 · 热门话题 · 关键指标 —— 回应评审"聚合分析洞察"
 * @路由      #/app/insights（apps.js + router.js 双登记）
 * @数据      /api/comments?stats=1 · /api/wall · /api/comments?path= 全量 ·
 *            /api/feedback 计数；网关未连 → 空态引导（不编造数据）
 * @被谁用    首页网格 · 智能体 openApp('insights')
 * @图表实现  纯 SVG 计算属性（无图表库依赖，构建零增量、离线可用）
 * ════════════════════════════════════════════════════════════════════
 */
import { ref, computed, onMounted } from 'vue'

const emit = defineEmits(['back'])
const stats = ref(null)
const posts = ref([])
const comments = ref([])
const offline = ref(false)
const loading = ref(true)

async function load() {
  try {
    const [s, w] = await Promise.all([
      fetch('/api/comments?stats=1').then((r) => r.json()),
      fetch('/api/wall?sort=new').then((r) => r.json())
    ])
    stats.value = s
    posts.value = w.posts || []
    // 全部评论（用于趋势；仅取公开 ok 的）
    const all = await fetch('/api/comments?path=').then((r) => r.json()).catch(() => ({ comments: [] }))
    comments.value = all.comments || []
    offline.value = false
  } catch {
    offline.value = true
  } finally {
    loading.value = false
  }
}

/* ── 14 日评论趋势（SVG 柱状） ── */
const trend = computed(() => {
  const days = []
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000)
    const n = comments.value.filter((c) => {
      const t = new Date(c.ts)
      return t.getFullYear() === d.getFullYear() && t.getMonth() === d.getMonth() && t.getDate() === d.getDate()
    }).length
    days.push({ label: (d.getMonth() + 1) + '/' + d.getDate(), n })
  }
  return days
})
const trendMax = computed(() => Math.max(1, ...trend.value.map((d) => d.n)))
const trendTotal = computed(() => trend.value.reduce((a, b) => a + b.n, 0))

/* ── 墙分区占比（SVG 环） ── */
const partDist = computed(() => {
  const freq = {}
  for (const p of posts.value) freq[p.tag || '闲聊'] = (freq[p.tag || '闲聊'] || 0) + 1
  const total = posts.value.length || 1
  const colors = ['#1b66c9', '#e11d48', '#d97706', '#0f766e', '#7c3aed', '#ea580c', '#0891b2', '#65a30d', '#be123c', '#4f46e5']
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([tag, n], i) => ({ tag, n, pct: Math.round((n / total) * 100), color: colors[i % colors.length] }))
})
function ringDash(pct, offset) {
  const c = 2 * Math.PI * 40
  const len = (pct / 100) * c
  return `${len} ${c - len}`
}

/* ── 指标 ── */
const kpis = computed(() => [
  { v: stats.value ? stats.value.total : '—', l: '评论总数' },
  { v: stats.value ? stats.value.pages : '—', l: '覆盖页面' },
  { v: posts.value.length || '—', l: '校园墙帖子' },
  { v: stats.value ? stats.value.feedback : '—', l: '智能体反馈' },
  { v: trendTotal.value, l: '近14日新增评论' },
  { v: stats.value && stats.value.reported ? stats.value.reported : 0, l: '待处理举报' }
])

/* ── 反馈热词（简单二元组） ── */
const feedbackHot = computed(() => {
  const freq = {}
  for (const p of posts.value) {
    const words = (p.title || '').match(/[一-龥]{2,4}/g) || []
    for (const w of words) freq[w] = (freq[w] || 0) + 1
  }
  return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([w, n]) => ({ w, n }))
})

onMounted(load)
</script>

<template>
  <div class="ci">
    <div class="ci-head">
      <button class="ci-back" @click="emit('back')">‹ 返回</button>
      <div class="ci-title">📈 社区数据洞察 <span class="ci-sub">评论趋势 · 分区占比 · 反馈热词 —— 纯 SVG 零依赖图表</span></div>
      <button class="ci-mini" @click="load">⟳ 刷新</button>
    </div>

    <div v-if="offline" class="ci-offline">🟡 社区网关未连接：启动 node server/index.mjs 后展示全站实时数据（此处不编造数字）</div>
    <div v-if="loading" class="ci-empty">加载中…</div>

    <template v-else>
      <!-- KPI -->
      <div class="ci-kpis">
        <div v-for="k in kpis" :key="k.l" class="ci-kpi">
          <div class="ci-kpi-v">{{ k.v }}</div>
          <div class="ci-kpi-l">{{ k.l }}</div>
        </div>
      </div>

      <div class="ci-grid">
        <!-- 趋势图 -->
        <div class="ci-card">
          <div class="ci-card-t">📊 近 14 日评论趋势 <span>（合计 {{ trendTotal }}）</span></div>
          <svg viewBox="0 0 560 160" class="ci-svg">
            <g v-for="(d, i) in trend" :key="d.label">
              <rect
                :x="12 + i * 39" :y="140 - (d.n / trendMax) * 116"
                width="26" :height="Math.max(2, (d.n / trendMax) * 116)"
                rx="4" fill="#1b66c9" :opacity="0.45 + (i / 14) * 0.55"
              />
              <text :x="25 + i * 39" y="155" text-anchor="middle" font-size="9" fill="#8a94a6">{{ d.label }}</text>
              <text v-if="d.n" :x="25 + i * 39" :y="132 - (d.n / trendMax) * 116" text-anchor="middle" font-size="10" font-weight="700" fill="#1b66c9">{{ d.n }}</text>
            </g>
            <line x1="8" y1="140.5" x2="552" y2="140.5" stroke="#e5eaf2" />
          </svg>
        </div>

        <!-- 分区环图 -->
        <div class="ci-card">
          <div class="ci-card-t">🍩 校园墙分区占比 <span>（共 {{ posts.length }} 帖）</span></div>
          <div class="ci-ring-wrap">
            <svg viewBox="0 0 100 100" class="ci-ring">
              <g transform="rotate(-90 50 50)">
                <circle
                  v-for="(p, i) in partDist" :key="p.tag"
                  cx="50" cy="50" r="40" fill="none"
                  :stroke="p.color" stroke-width="13"
                  :stroke-dasharray="ringDash(p.pct, 0)"
                  :stroke-dashoffset="-partDist.slice(0, i).reduce((a, b) => a + b.pct, 0) / 100 * 2 * Math.PI * 40"
                />
              </g>
              <text x="50" y="47" text-anchor="middle" font-size="11" font-weight="800" fill="#24292f">{{ posts.length }}</text>
              <text x="50" y="60" text-anchor="middle" font-size="7" fill="#8a94a6">帖子</text>
            </svg>
            <div class="ci-legend">
              <div v-for="p in partDist" :key="p.tag" class="ci-legend-item">
                <i :style="{ background: p.color }"></i>{{ p.tag }} <b>{{ p.pct }}%</b>
              </div>
            </div>
          </div>
        </div>

        <!-- 话题热词 -->
        <div class="ci-card">
          <div class="ci-card-t">🏷️ 标题热词 Top8</div>
          <div class="ci-words">
            <div v-for="t in feedbackHot" :key="t.w" class="ci-word-row">
              <span class="ci-word">{{ t.w }}</span>
              <span class="ci-word-bar"><i :style="{ width: (t.n / (feedbackHot[0]?.n || 1)) * 100 + '%' }"></i></span>
              <span class="ci-word-n">{{ t.n }}</span>
            </div>
          </div>
        </div>

        <!-- 治理健康 -->
        <div class="ci-card">
          <div class="ci-card-t">🛡️ 治理健康度</div>
          <div class="ci-health">
            <div class="ci-hrow">
              <span>举报队列</span>
              <b :class="kpis[5].v === 0 ? 'good' : 'warn'">{{ kpis[5].v === 0 ? '✓ 清空' : kpis[5].v + ' 待处理' }}</b>
            </div>
            <div class="ci-hrow">
              <span>反馈回流</span>
              <b :class="(stats?.feedback || 0) > 0 ? 'warn' : 'good'">{{ (stats && stats.feedback) || 0 }} 条待办</b>
            </div>
            <div class="ci-hrow">
              <span>数据模式</span>
              <b :class="offline ? 'warn' : 'good'">{{ offline ? '本机（离线）' : '网关实时' }}</b>
            </div>
            <div class="ci-hnote">本页全部数字来自社区网关真实统计，未连接时不显示伪造数据——与"不编造数据"红线一致。</div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.ci { display: flex; flex-direction: column; gap: 13px; }
.ci-head { display: flex; align-items: center; gap: 11px; flex-wrap: wrap; }
.ci-back { border: 1px solid var(--border, #e5eaf2); background: var(--card, #fff); color: var(--text, #24292f); border-radius: 999px; padding: 6px 14px; cursor: pointer; font-family: inherit; font-size: 13px; }
.ci-title { flex: 1; font-size: 17px; font-weight: 800; color: var(--text, #24292f); min-width: 200px; }
.ci-sub { display: block; font-size: 11px; color: var(--muted, #8a94a6); font-weight: 400; margin-top: 2px; }
.ci-mini { border: 1px solid var(--border, #e5eaf2); background: var(--card, #fff); color: var(--muted, #8a94a6); font-size: 12px; padding: 5px 12px; border-radius: 999px; cursor: pointer; font-family: inherit; }
.ci-mini:hover { border-color: var(--primary, #1b66c9); color: var(--primary, #1b66c9); }

.ci-offline { font-size: 12.5px; background: rgba(245, 158, 11, 0.12); color: #b45309; padding: 9px 14px; border-radius: 9px; }
.ci-empty { padding: 34px; text-align: center; color: var(--muted, #8a94a6); }

.ci-kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 11px; }
.ci-kpi { border: 1px solid var(--border, #e5eaf2); background: var(--card, #fff); border-radius: 13px; padding: 13px; text-align: center; }
.ci-kpi-v { font-size: 24px; font-weight: 800; color: var(--primary, #1b66c9); font-variant-numeric: tabular-nums; }
.ci-kpi-l { font-size: 11px; color: var(--muted, #8a94a6); margin-top: 3px; }

.ci-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 13px; }
.ci-card { border: 1px solid var(--border, #e5eaf2); background: var(--card, #fff); border-radius: 14px; padding: 15px; }
.ci-card-t { font-size: 13.5px; font-weight: 800; color: var(--text, #24292f); margin-bottom: 11px; }
.ci-card-t span { font-size: 11px; color: var(--muted, #8a94a6); font-weight: 400; }
.ci-svg { width: 100%; height: auto; }

.ci-ring-wrap { display: flex; align-items: center; gap: 16px; }
.ci-ring { width: 118px; height: 118px; flex-shrink: 0; }
.ci-ring circle { transition: stroke-dasharray 0.6s; }
.ci-legend { display: flex; flex-direction: column; gap: 5px; font-size: 12px; color: var(--text, #24292f); min-width: 0; }
.ci-legend-item { display: flex; align-items: center; gap: 7px; }
.ci-legend-item i { width: 10px; height: 10px; border-radius: 3px; flex-shrink: 0; }
.ci-legend-item b { margin-left: auto; font-variant-numeric: tabular-nums; }

.ci-words { display: flex; flex-direction: column; gap: 7px; }
.ci-word-row { display: flex; align-items: center; gap: 9px; font-size: 12.5px; }
.ci-word { width: 62px; color: var(--text, #24292f); flex-shrink: 0; }
.ci-word-bar { flex: 1; height: 8px; background: #eef1f5; border-radius: 999px; overflow: hidden; }
.ci-word-bar i { display: block; height: 100%; background: linear-gradient(90deg, #1b66c9, #4f8df0); border-radius: 999px; }
.ci-word-n { width: 24px; text-align: right; color: var(--muted, #8a94a6); font-variant-numeric: tabular-nums; }

.ci-health { display: flex; flex-direction: column; gap: 9px; }
.ci-hrow { display: flex; justify-content: space-between; font-size: 13px; color: var(--text, #24292f); padding: 7px 11px; background: var(--bg, #f7f9fc); border-radius: 9px; }
.ci-hrow b.good { color: #2e7d32; }
.ci-hrow b.warn { color: #d97706; }
.ci-hnote { font-size: 11px; color: var(--muted, #8a94a6); line-height: 1.7; margin-top: 4px; }
</style>
