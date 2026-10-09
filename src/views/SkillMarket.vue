<script setup>
/**
 * ════════════════════════════════════════════════════════════════════
 * @模块路径  src/views/SkillMarket.vue
 * @职责      技能市场：27 条工作流卡片化运营位（对标智能体商店范式）——
 *            分类 Tab 筛选 · 关键词搜索 · 使用次数排序 · 收藏 ⭐ ·
 *            卡片详情弹层（触发语/步骤/降级说明）· 「立即使用」一键跳转
 *            智能体执行 · 个性化置顶（常用优先）
 * @路由      #/app/skills（apps.js + router.js 双登记）
 * @数据      WORKFLOWS 元信息 + localStorage（qdu_wf_usage 使用计数 ·
 *            qdu_wf_fav 收藏）——与 Assistant 技能面板同一数据源
 * @联动      点击「立即使用」→ 写 qdu_agent_inbox → 打开 Assistant 自动执行
 * @设计参考  智能体商店通行范式：分类标签 + 卡片网格 + 立即使用 + 使用次数
 * ════════════════════════════════════════════════════════════════════
 */
import { ref, computed, onMounted } from 'vue'
import { WORKFLOWS } from '../agent/workflows.js'
import { AGENT_PROFILE } from '../agent/config.js'

const emit = defineEmits(['back'])

/* ── 分区（技能分类） ── */
const CATS = [
  { id: 'all', name: '全部', icon: '🗂️' },
  { id: 'study', name: '学习', icon: '📚' },
  { id: 'life', name: '生活', icon: '🍜' },
  { id: 'comm', name: '社区', icon: '🧱' },
  { id: 'sys', name: '系统', icon: '🤖' }
]

/** 技能 → 分类映射（与 DIALOGUES/README 口径一致） */
const CAT_MAP = {
  findRoom: 'study', dayClass: 'study', courseQuery: 'study', wikiAsk: 'study', hotTopics: 'study',
  todayNotice: 'study', searchNotice: 'study', timeNow: 'study', helpGuide: 'sys',
  whatEat: 'life', canteenStatus: 'life', jumpService: 'life', campusNav: 'life',
  addSchedule: 'life', mySchedule: 'life', dailyBriefing: 'life', signIn: 'life', myPoints: 'life',
  wallPost: 'comm', wallView: 'comm', wallSearch: 'comm', lostFound: 'comm', bountyPost: 'comm',
  resourceShare: 'comm', reportFeedback: 'comm',
  agentBoard: 'sys', setClass: 'sys'
}

const cat = ref('all')
const kw = ref('')
const favOnly = ref(false)
const detail = ref(null)   // 详情弹层

/* ── 本地计数与收藏 ── */
const usage = ref({})
const favs = ref({})
function loadLocal() {
  try { usage.value = JSON.parse(localStorage.getItem('qdu_wf_usage') || '{}') } catch { usage.value = {} }
  try { favs.value = JSON.parse(localStorage.getItem('qdu_wf_fav') || '{}') } catch { favs.value = {} }
}
function toggleFav(id) {
  favs.value[id] = !favs.value[id]
  try { localStorage.setItem('qdu_wf_fav', JSON.stringify(favs.value)) } catch { /* noop */ }
}
function bumpUsage(id) {
  usage.value[id] = (usage.value[id] || 0) + 1
  try { localStorage.setItem('qdu_wf_usage', JSON.stringify(usage.value)) } catch { /* noop */ }
}

/* ── 卡片数据 ── */
const cards = computed(() => {
  let list = Object.values(WORKFLOWS).map((w) => ({
    id: w.id,
    title: w.title,
    icon: w.icon,
    needConfirm: !!w.needConfirm,
    steps: w.steps.map((s) => s.label),
    cat: CAT_MAP[w.id] || 'sys',
    used: usage.value[w.id] || 0,
    fav: !!favs.value[w.id]
  }))
  if (cat.value !== 'all') list = list.filter((c) => c.cat === cat.value)
  if (favOnly.value) list = list.filter((c) => c.fav)
  if (kw.value.trim()) {
    const q = kw.value.trim().toLowerCase()
    list = list.filter((c) => c.title.toLowerCase().includes(q) || c.steps.join('').toLowerCase().includes(q))
  }
  // 个性化置顶：常用优先，其次收藏，再次原序
  return list.sort((a, b) => (b.used - a.used) || (Number(b.fav) - Number(a.fav)))
})

const stats = computed(() => ({
  total: Object.keys(WORKFLOWS).length,
  used: Object.keys(usage.value).length,
  runs: Object.values(usage.value).reduce((a, b) => a + b, 0),
  favs: Object.values(favs.value).filter(Boolean).length
}))

/** 立即使用：写入智能体收件箱并跳转（与首页对话框同一协议） */
function run(w) {
  bumpUsage(w.id)
  try { localStorage.setItem('qdu_agent_inbox', w.title) } catch { /* noop */ }
  emit('open', 'assistant')
}
function openDetail(w) { detail.value = w }

onMounted(loadLocal)
</script>

<template>
  <div class="sm">
    <div class="sm-head">
      <button class="sm-back" @click="emit('back')">‹ 返回</button>
      <div class="sm-title">🧩 技能市场 <span class="sm-sub">27 条工作流 · 分类直达 · 使用统计个性化排序</span></div>
      <span class="sm-stat">已用 {{ stats.used }}/{{ stats.total }} · 累计执行 {{ stats.runs }} 次 · 收藏 {{ stats.favs }}</span>
    </div>

    <!-- 工具栏 -->
    <div class="sm-tools">
      <div class="sm-cats">
        <button v-for="c in CATS" :key="c.id" class="sm-cat" :class="{ on: cat === c.id }" @click="cat = c.id">
          {{ c.icon }} {{ c.name }}
        </button>
      </div>
      <input v-model="kw" class="sm-search" placeholder="搜索技能：简报 / 空教室 / 发帖…" />
      <button class="sm-fav" :class="{ on: favOnly }" @click="favOnly = !favOnly">⭐ 只看收藏</button>
    </div>

    <!-- 卡片网格 -->
    <div class="sm-grid">
      <div v-for="w in cards" :key="w.id" class="sm-card" :class="{ hot: w.used > 2 }">
        <div class="sm-card-top">
          <span class="sm-icon">{{ w.icon }}</span>
          <div class="sm-card-title">
            <b>{{ w.title }}</b>
            <span class="sm-badges">
              <span v-if="w.needConfirm" class="sm-badge confirm">需确认</span>
              <span class="sm-badge steps">{{ w.steps.length }} 步</span>
              <span v-if="w.used" class="sm-badge used">×{{ w.used }}</span>
            </span>
          </div>
          <button class="sm-star" :class="{ on: w.fav }" title="收藏" @click="toggleFav(w.id)">{{ w.fav ? '★' : '☆' }}</button>
        </div>
        <div class="sm-card-steps">
          <div v-for="(s, i) in w.steps.slice(0, 3)" :key="i" class="sm-step">{{ i + 1 }}. {{ s }}</div>
          <div v-if="w.steps.length > 3" class="sm-more">… 共 {{ w.steps.length }} 步</div>
        </div>
        <div class="sm-card-actions">
          <button class="sm-run" @click="run(w)">▶ 立即使用</button>
          <button class="sm-detail" @click="openDetail(w)">详情</button>
        </div>
      </div>
    </div>

    <div v-if="!cards.length" class="sm-empty">没有匹配的技能——换个关键词或切回「全部」</div>

    <!-- 详情弹层 -->
    <div v-if="detail" class="sm-mask" @click.self="detail = null">
      <div class="sm-modal">
        <div class="sm-modal-head">
          <span class="sm-icon big">{{ detail.icon }}</span>
          <div>
            <b>{{ detail.title }}</b>
            <div class="sm-modal-sub">{{ detail.cat === 'comm' ? '社区互动' : detail.cat === 'study' ? '学习学业' : detail.cat === 'life' ? '生活服务' : '系统治理' }} · 已使用 {{ detail.used }} 次</div>
          </div>
          <button class="sm-close" @click="detail = null">✕</button>
        </div>
        <div class="sm-modal-body">
          <div class="sm-block">
            <div class="sm-block-t">执行步骤</div>
            <div v-for="(s, i) in detail.steps" :key="i" class="sm-modal-step">
              <span class="sm-num">{{ i + 1 }}</span>{{ s }}
            </div>
          </div>
          <div class="sm-block">
            <div class="sm-block-t">触发方式</div>
            <div class="sm-trigger">对智能体直接说「{{ detail.title }}」，或在对话框输入 <b>/{{ detail.id }}</b> 命令直达</div>
          </div>
          <div class="sm-block">
            <div class="sm-block-t">兜底与安全</div>
            <div class="sm-trigger">
              接口失败自动降级（快照/本机提示，不编造数据）{{ detail.needConfirm ? '；涉及公开发布的写操作需你点击确认（人在回路）' : '；纯读操作直达执行' }}
            </div>
          </div>
        </div>
        <div class="sm-modal-foot">
          <button class="sm-run" @click="run(detail); detail = null">▶ 立即使用</button>
          <button class="sm-detail" @click="detail = null">关闭</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sm { display: flex; flex-direction: column; gap: 13px; }
.sm-head { display: flex; align-items: center; gap: 11px; flex-wrap: wrap; }
.sm-back { border: 1px solid var(--border, #e5eaf2); background: var(--card, #fff); color: var(--text, #24292f); border-radius: 999px; padding: 6px 14px; cursor: pointer; font-family: inherit; font-size: 13px; }
.sm-title { flex: 1; font-size: 17px; font-weight: 800; color: var(--text, #24292f); min-width: 200px; }
.sm-sub { display: block; font-size: 11px; color: var(--muted, #8a94a6); font-weight: 400; margin-top: 2px; }
.sm-stat { font-size: 12px; background: var(--card, #fff); border: 1px solid var(--border, #e5eaf2); border-radius: 999px; padding: 5px 14px; color: var(--primary, #1b66c9); font-weight: 700; }

.sm-tools { display: flex; gap: 9px; align-items: center; flex-wrap: wrap; }
.sm-cats { display: flex; gap: 6px; flex-wrap: wrap; }
.sm-cat { border: 1px solid var(--border, #e5eaf2); background: var(--card, #fff); color: var(--muted, #8a94a6); font-size: 12.5px; padding: 6px 14px; border-radius: 999px; cursor: pointer; font-family: inherit; }
.sm-cat.on { background: var(--primary, #1b66c9); border-color: var(--primary, #1b66c9); color: #fff; font-weight: 600; }
.sm-search { flex: 1; min-width: 180px; border: 1px solid var(--border, #e5eaf2); border-radius: 999px; padding: 7px 15px; font-size: 13px; font-family: inherit; background: var(--card, #fff); color: var(--text, #24292f); outline: none; }
.sm-search:focus { border-color: var(--primary, #1b66c9); }
.sm-fav { border: 1px solid var(--border, #e5eaf2); background: var(--card, #fff); color: var(--muted, #8a94a6); font-size: 12.5px; padding: 6px 14px; border-radius: 999px; cursor: pointer; font-family: inherit; }
.sm-fav.on { background: #d97706; border-color: #d97706; color: #fff; font-weight: 700; }

.sm-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(270px, 1fr)); gap: 12px; }
.sm-card { border: 1px solid var(--border, #e5eaf2); background: var(--card, #fff); border-radius: 14px; padding: 14px; display: flex; flex-direction: column; gap: 9px; transition: transform 0.15s, box-shadow 0.15s; }
.sm-card:hover { transform: translateY(-3px); box-shadow: 0 8px 22px rgba(0, 0, 0, 0.08); }
.sm-card.hot { border-color: rgba(217, 119, 6, 0.5); }
.sm-card-top { display: flex; gap: 10px; align-items: flex-start; }
.sm-icon { font-size: 26px; flex-shrink: 0; }
.sm-icon.big { font-size: 34px; }
.sm-card-title { flex: 1; min-width: 0; }
.sm-card-title b { font-size: 14.5px; color: var(--text, #24292f); display: block; }
.sm-badges { display: flex; gap: 5px; margin-top: 5px; flex-wrap: wrap; }
.sm-badge { font-size: 10px; padding: 1px 7px; border-radius: 999px; font-weight: 700; }
.sm-badge.confirm { background: rgba(225, 29, 72, 0.1); color: #e11d48; }
.sm-badge.steps { background: var(--primary-soft, rgba(27, 102, 201, 0.1)); color: var(--primary, #1b66c9); }
.sm-badge.used { background: rgba(217, 119, 6, 0.12); color: #d97706; }
.sm-star { border: none; background: transparent; font-size: 19px; cursor: pointer; color: var(--muted, #8a94a6); padding: 0; line-height: 1; }
.sm-star.on { color: #d97706; }

.sm-card-steps { background: var(--bg, #f7f9fc); border-radius: 9px; padding: 8px 11px; display: flex; flex-direction: column; gap: 3px; }
.sm-step { font-size: 11.5px; color: var(--text, #24292f); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sm-more { font-size: 10.5px; color: var(--muted, #8a94a6); }

.sm-card-actions { display: flex; gap: 8px; margin-top: auto; }
.sm-run { flex: 1; border: none; background: var(--primary, #1b66c9); color: #fff; padding: 8px; border-radius: 9px; cursor: pointer; font-family: inherit; font-size: 13px; font-weight: 700; }
.sm-run:hover { filter: brightness(1.1); }
.sm-detail { border: 1px solid var(--border, #e5eaf2); background: transparent; color: var(--muted, #8a94a6); padding: 8px 16px; border-radius: 9px; cursor: pointer; font-family: inherit; font-size: 12.5px; }
.sm-detail:hover { border-color: var(--primary, #1b66c9); color: var(--primary, #1b66c9); }

.sm-empty { padding: 40px; text-align: center; color: var(--muted, #8a94a6); }

.sm-mask { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.45); z-index: 970; display: flex; align-items: center; justify-content: center; padding: 20px; }
.sm-modal { background: var(--card, #fff); border-radius: 16px; width: min(560px, 100%); max-height: 86vh; overflow: auto; box-shadow: 0 24px 70px rgba(0, 0, 0, 0.3); }
.sm-modal-head { display: flex; gap: 12px; align-items: center; padding: 18px 20px 12px; border-bottom: 1px solid var(--border, #e5eaf2); }
.sm-modal-head b { font-size: 16px; color: var(--text, #24292f); }
.sm-modal-sub { font-size: 11.5px; color: var(--muted, #8a94a6); margin-top: 2px; }
.sm-close { margin-left: auto; border: none; background: transparent; font-size: 18px; cursor: pointer; color: var(--muted, #8a94a6); }
.sm-modal-body { padding: 14px 20px; display: flex; flex-direction: column; gap: 14px; }
.sm-block-t { font-size: 12px; font-weight: 800; color: var(--primary, #1b66c9); margin-bottom: 7px; }
.sm-modal-step { display: flex; gap: 9px; align-items: center; font-size: 13px; color: var(--text, #24292f); padding: 5px 0; }
.sm-num { width: 20px; height: 20px; border-radius: 50%; background: var(--primary, #1b66c9); color: #fff; font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.sm-trigger { font-size: 12.5px; color: var(--text, #24292f); background: var(--bg, #f7f9fc); border-radius: 9px; padding: 9px 12px; line-height: 1.7; }
.sm-trigger b { color: var(--primary, #1b66c9); }
.sm-modal-foot { display: flex; gap: 10px; padding: 12px 20px 18px; }
.sm-modal-foot .sm-run { flex: 1; }
</style>
