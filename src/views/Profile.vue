<script setup>
/**
 * ════════════════════════════════════════════════════════════════════
 * @模块路径  src/views/Profile.vue
 * @职责      我的画像页：学院/年级/技能填写 + 行为可解释展示 + 推送预览 +
 *            一键清空 —— 画像驱动反向推送的“驾驶舱”
 * @路由      #/app/profile（VIEWS.profile + data/apps 双登记）
 * @数据      agent/profile.js（本机）· data/jobs + activities（推送预览）
 * ════════════════════════════════════════════════════════════════════
 */
import { ref, onMounted } from 'vue'
import {
  readProfile, setCollege, setGrade, setSkills, clearProfile,
  behaviorStats, inferInterests, pushList, profileSummary
} from '../agent/profile.js'
import { matchJobs } from '../data/jobs.js'
import { upcoming } from '../data/activities.js'
import { dueReviews } from '../utils/studyPlan.js'

const emit = defineEmits(['back', 'open'])
const college = ref('')
const grade = ref('')
const skills = ref('')
const summary = ref('')
const behav = ref({ apps: [], searches: [], total: 0 })
const inferred = ref({ interests: [], reasons: [] })
const pushes = ref([])
const toast = ref('')

function showToast(m) { toast.value = m; setTimeout(() => { toast.value = '' }, 2200) }
function refresh() {
  const p = readProfile()
  college.value = p.college
  grade.value = p.grade
  skills.value = (p.skills || []).join('，')
  summary.value = profileSummary()
  behav.value = behaviorStats()
  inferred.value = inferInterests()
  pushes.value = pushList({ dueReviews: dueReviews(), activities: upcoming(), jobs: matchJobs(readProfile(), 2).map((m) => m.job) })
}
function save() {
  setCollege(college.value)
  setGrade(grade.value)
  setSkills(skills.value)
  refresh()
  showToast('画像已保存 ✓ 匹配和推送会更准')
}
function wipe() {
  if (!confirm('清空画像与行为记录？（不可恢复）')) return
  clearProfile()
  refresh()
  showToast('已忘掉一切 🧹')
}
function go(action) {
  if (!action) return
  if (action.type === 'openApp') emit('open', action.value)
  else if (action.type === 'agent') emit('open', 'assistant')
}
onMounted(refresh)
</script>

<template>
  <div class="pf-wrap">
    <div class="pf-head">
      <button class="back" @click="emit('back')">‹ 返回</button>
      <b>🧬 我的画像</b>
    </div>
    <div class="pf-sum">{{ summary }}</div>
    <div v-if="toast" class="pf-toast">{{ toast }}</div>
    <section class="pf-card">
      <b>📝 基本项（只存本机）</b>
      <label>学院<input v-model="college" placeholder="如：计算机科学技术学院" maxlength="30" /></label>
      <label>年级<input v-model="grade" placeholder="如：大二 / 研一" maxlength="10" /></label>
      <label>技能（逗号分隔）<input v-model="skills" placeholder="如：Vue，Python，摄影" maxlength="120" /></label>
      <div class="pf-row">
        <button class="primary" @click="save">保存画像</button>
        <button class="danger" @click="wipe">忘掉我</button>
      </div>
    </section>
    <section class="pf-card">
      <b>🔍 行为推断（可解释：每条兴趣都有来源）</b>
      <div v-if="!inferred.interests.length" class="pf-empty">暂无行为记录，多逛逛本站即可</div>
      <div class="pf-tags"><span v-for="t in inferred.interests" :key="t">#{{ t }}</span></div>
      <div v-for="r in inferred.reasons" :key="r" class="pf-reason">{{ r }}</div>
    </section>
    <section class="pf-card">
      <b>📣 给我的推送预览（{{ pushes.length }}）</b>
      <div v-if="!pushes.length" class="pf-empty">暂无推送</div>
      <div v-for="(p, i) in pushes" :key="i" class="pf-push" @click="go(p.action)">
        <span>{{ p.icon }} {{ p.text }}</span><em>去看看 ›</em>
      </div>
    </section>
    <section class="pf-card">
      <b>📊 打开统计（共 {{ behav.total }} 次）</b>
      <div v-for="a in behav.apps" :key="a.app" class="pf-rowline"><span>{{ a.app }}</span><em>{{ a.n }} 次</em></div>
      <div v-if="behav.searches.length" class="pf-tags"><span v-for="s in behav.searches" :key="s">🔎{{ s }}</span></div>
    </section>
  </div>
</template>

<style scoped>
.pf-wrap { display: flex; flex-direction: column; gap: 12px; padding-bottom: 30px; }
.pf-head { display: flex; align-items: center; gap: 10px; }
.pf-head .back { border: 1px solid #e5e5e5; background: #fafafa; border-radius: 10px; padding: 3px 10px; cursor: pointer; }
.pf-sum { font-size: 14px; font-weight: 700; background: linear-gradient(135deg,#eff6ff,#f5f3ff); border-radius: 10px; padding: 10px 14px; }
.pf-toast { background: #f0fdf4; color: #166534; font-size: 13px; padding: 6px 12px; border-radius: 8px; }
.pf-card { border: 1px solid #eee; border-radius: 12px; padding: 12px 14px; background: #fff; display: flex; flex-direction: column; gap: 8px; }
.pf-card label { display: flex; flex-direction: column; gap: 4px; font-size: 13px; color: #555; }
.pf-card input { border: 1px solid #ddd; border-radius: 10px; padding: 8px 12px; font-size: 14px; }
.pf-row { display: flex; gap: 8px; }
.pf-row button { border-radius: 10px; padding: 8px 18px; cursor: pointer; border: 1px solid #e5e5e5; background: #fafafa; }
.pf-row button.primary { background: #7c3aed; color: #fff; border-color: #7c3aed; }
.pf-row button.danger { color: #b91c1c; }
.pf-empty { color: #999; font-size: 13px; }
.pf-tags span { font-size: 12px; background: #f3f4f6; border-radius: 8px; padding: 2px 10px; margin: 0 4px 4px 0; display: inline-block; }
.pf-reason { font-size: 12px; color: #888; }
.pf-push { display: flex; justify-content: space-between; font-size: 13px; border: 1px solid #eee; border-radius: 10px; padding: 8px 12px; cursor: pointer; }
.pf-push em { font-style: normal; color: #1b66c9; font-size: 12px; }
.pf-rowline { display: flex; justify-content: space-between; font-size: 13px; font-family: ui-monospace, monospace; }
</style>
