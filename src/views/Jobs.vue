<script setup>
/**
 * ════════════════════════════════════════════════════════════════════
 * @模块路径  src/views/Jobs.vue
 * @职责      招聘求职页：岗位列表（示例+预留）+ 画像匹配排序 + 投递登记 +
 *            活动报名tab —— 专家点名缺失的“招聘板块”（§8.2）
 * @路由      #/app/jobs（VIEWS.jobs + data/apps 双登记）
 * @数据      data/jobs.js（示例岗）· data/activities.js · agent/profile.js
 * @交互      类型筛/搜索/画像匹配一键排/投递登记（本机幂等）/活动报名
 * @诚实标注  示例岗位页内明示“格式示范，求职以官方渠道为准”
 * ════════════════════════════════════════════════════════════════════
 */
import { ref, computed, onMounted } from 'vue'
import { JOBS, matchJobs } from '../data/jobs.js'
import { upcoming, signupLocal, signedIds } from '../data/activities.js'
import { readProfile } from '../agent/profile.js'

const emit = defineEmits(['back', 'open'])
const tab = ref('jobs') // jobs | activities
const typeFilter = ref('all')
const keyword = ref('')
const toast = ref('')
const prof = ref(readProfile())
const mySigns = ref(signedIds())

function showToast(m) { toast.value = m; setTimeout(() => { toast.value = '' }, 2600) }

const matchedIds = computed(() => {
  const m = matchJobs(prof.value, 8)
  const order = new Map(m.map((x, i) => [x.job.id, i]))
  return order
})
const jobList = computed(() => {
  let list = JOBS.slice()
  if (typeFilter.value !== 'all') list = list.filter((j) => j.type === typeFilter.value)
  const kw = keyword.value.trim().toLowerCase()
  if (kw) list = list.filter((j) => (j.title + j.dept + (j.tags || []).join('')).toLowerCase().includes(kw))
  // 画像匹配优先（有命中词的置顶，其余保序）
  const order = matchedIds.value
  return list.slice().sort((a, b) => {
    const ai = order.has(a.id) ? order.get(a.id) : 99
    const bi = order.has(b.id) ? order.get(b.id) : 99
    return ai - bi
  })
})
const acts = computed(() => upcoming())

const APPLIED_KEY = 'agent_job_applied_v1'
function appliedIds() {
  try { return JSON.parse(localStorage.getItem(APPLIED_KEY) || '[]') } catch { return [] }
}
const applied = ref(appliedIds())
function apply(job) {
  if (applied.value.includes(job.id)) { showToast('已投递过，不重复登记'); return }
  if (!confirm(`投递登记：${job.title}？（本机记录，正式投递请走官方渠道）`)) return
  applied.value.push(job.id)
  try { localStorage.setItem(APPLIED_KEY, JSON.stringify(applied.value)) } catch { /* noop */ }
  showToast('已登记 ✓ 记得去官方渠道正式投递')
}
function signup(a) {
  const r = signupLocal(a.id)
  mySigns.value = signedIds()
  showToast(r.already ? '已报过名' : '报名成功 ✓ 已写入日程（提醒中心可见）')
}
onMounted(() => { prof.value = readProfile(); mySigns.value = signedIds() })
</script>

<template>
  <div class="jb-wrap">
    <div class="jb-head">
      <button class="back" @click="emit('back')">‹ 返回</button>
      <b>💼 求职招聘</b>
      <span class="jb-demo">示例岗·格式示范</span>
    </div>
    <div class="jb-note">首批为示例岗位（对接就业网后替换真数据）；求职请以官方渠道为准。</div>
    <div v-if="toast" class="jb-toast">{{ toast }}</div>
    <div class="jb-tabs">
      <button :class="{ on: tab === 'jobs' }" @click="tab = 'jobs'">岗位 ({{ JOBS.length }})</button>
      <button :class="{ on: tab === 'activities' }" @click="tab = 'activities'">活动报名</button>
    </div>

    <template v-if="tab === 'jobs'">
      <div class="jb-bar">
        <button :class="{ on: typeFilter === 'all' }" @click="typeFilter = 'all'">全部</button>
        <button :class="{ on: typeFilter === '勤工俭学' }" @click="typeFilter = '勤工俭学'">勤工俭学</button>
        <button :class="{ on: typeFilter === '实习' }" @click="typeFilter = '实习'">实习</button>
        <input v-model="keyword" placeholder="搜岗位/部门/技能" />
      </div>
      <div v-for="j in jobList" :key="j.id" class="jb-card">
        <div class="jb-t"><b>{{ j.title }}</b><span class="jb-type">{{ j.type }}</span></div>
        <div class="jb-m">{{ j.dept }} · {{ j.pay }} · {{ j.need }}</div>
        <div class="jb-tags"><span v-for="t in j.tags" :key="t">#{{ t }}</span></div>
        <div class="jb-f">
          <span class="jb-c">📞 {{ j.contact }}</span>
          <button :disabled="applied.includes(j.id)" @click="apply(j)">{{ applied.includes(j.id) ? '已登记 ✓' : '投递登记' }}</button>
        </div>
      </div>
    </template>

    <template v-else>
      <div v-for="a in acts" :key="a.id" class="jb-card">
        <div class="jb-t"><b>{{ a.title }}</b><span v-if="a.expired" class="jb-exp">已结束</span></div>
        <div class="jb-m">{{ a.org }} · {{ a.date }} · {{ a.place }} · 余 {{ a.left }} 位</div>
        <div class="jb-f">
          <span class="jb-c">🏷️ {{ (a.tags || []).join(' ') }}</span>
          <button :disabled="a.expired || mySigns.includes(a.id)" @click="signup(a)">{{ mySigns.includes(a.id) ? '已报名 ✓' : '报名' }}</button>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.jb-wrap { display: flex; flex-direction: column; gap: 10px; padding-bottom: 30px; }
.jb-head { display: flex; align-items: center; gap: 10px; }
.jb-head .back { border: 1px solid #e5e5e5; background: #fafafa; border-radius: 10px; padding: 3px 10px; cursor: pointer; }
.jb-demo { font-size: 11px; background: #fef3c7; color: #92400e; border-radius: 8px; padding: 1px 8px; }
.jb-note { font-size: 12px; color: #888; background: #f8fafc; border-radius: 8px; padding: 6px 10px; }
.jb-toast { background: #eff6ff; color: #1b66c9; font-size: 13px; padding: 6px 12px; border-radius: 8px; }
.jb-tabs { display: flex; gap: 8px; }
.jb-tabs button { border: 1px solid #e5e5e5; background: #fff; border-radius: 14px; padding: 4px 16px; cursor: pointer; }
.jb-tabs button.on { background: #1b66c9; color: #fff; border-color: #1b66c9; }
.jb-bar { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }
.jb-bar button { border: 1px solid #e5e5e5; background: #fff; border-radius: 12px; padding: 3px 12px; cursor: pointer; font-size: 12px; }
.jb-bar button.on { background: #1b66c9; color: #fff; border-color: #1b66c9; }
.jb-bar input { flex: 1; min-width: 140px; border: 1px solid #ddd; border-radius: 10px; padding: 6px 12px; }
.jb-card { border: 1px solid #eee; border-radius: 12px; padding: 10px 12px; background: #fff; }
.jb-t { display: flex; justify-content: space-between; align-items: center; }
.jb-type { font-size: 11px; background: #eff6ff; color: #1b66c9; border-radius: 8px; padding: 1px 8px; }
.jb-exp { font-size: 11px; color: #999; }
.jb-m { font-size: 12px; color: #666; margin-top: 2px; }
.jb-tags span { font-size: 11px; background: #f3f4f6; border-radius: 8px; padding: 0 8px; margin-right: 4px; }
.jb-f { display: flex; justify-content: space-between; align-items: center; margin-top: 6px; }
.jb-c { font-size: 12px; color: #888; }
.jb-f button { border: 1px solid #bbf7d0; background: #f0fdf4; color: #166534; border-radius: 10px; padding: 4px 14px; cursor: pointer; }
.jb-f button:disabled { background: #f3f4f6; color: #999; border-color: #eee; }
</style>
