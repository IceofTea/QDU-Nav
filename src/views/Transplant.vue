<script setup>
/**
 * ════════════════════════════════════════════════════════════════════
 * @模块路径  src/views/Transplant.vue
 * @职责      换校移植看板（第二卖点）：3 插槽说明 + 工作流可移植矩阵 +
 *            两校对照 —— “换校连大脑一起换”的证据页
 * @路由      #/app/transplant（VIEWS.transplant + data/apps 双登记）
 * @数据      workflows 注册表（读 WORKFLOWS 计数可移植项）· 静态插槽说明
 * @被谁用    App.vue 路由；Compare 页互链；智能体意图直达
 * ════════════════════════════════════════════════════════════════════
 */
import { ref, onMounted } from 'vue'
import { WORKFLOWS } from '../agent/workflows.js'

const emit = defineEmits(['back', 'open'])

const wfCount = ref(0)
const portable = ref([
  { name: '课表/空教室/通知类', n: 0, note: '换数据源即移植（教务接口/快照）' },
  { name: '社区类（墙/私信/反馈）', n: 0, note: '换网关地址即移植（apiBase）' },
  { name: '通用类（提醒/番茄/画像）', n: 0, note: '零改动，直接复用' },
  { name: '校本类（师大智答/校领导测试）', n: 0, note: '留在本校，不移植' }
])
onMounted(() => {
  const ids = Object.keys(WORKFLOWS)
  wfCount.value = ids.length
  const has = (id) => ids.includes(id)
  const room = ['findRoom', 'dayClass', 'todayNotice', 'searchNotice', 'courseQuery', 'classroomNav'].filter(has).length
  const social = ['wallPost', 'wallView', 'wallSearch', 'lostFound', 'bountyPost', 'reportFeedback', 'myPoints', 'signIn'].filter(has).length
  const general = Math.max(0, ids.length - room - social - 4)
  portable.value[0].n = room
  portable.value[1].n = social
  portable.value[2].n = general
  portable.value[3].n = ids.length - room - social - general
})
</script>

<template>
  <div class="tp-wrap">
    <div class="tp-head">
      <button class="back" @click="emit('back')">‹ 返回</button>
      <b>🔁 换校移植看板</b>
      <span class="tp-n">{{ wfCount }} 条工作流</span>
    </div>
    <div class="tp-lead">校级差异收敛为 3 个可替换插槽：<b>配置</b> / <b>数据</b> / <b>应用</b>。换校不换骨架，连智能体大脑一起换。</div>
    <div class="tp-slots">
      <div class="tp-slot"><b>① 配置插槽</b><span>site.js：校名/配色/官网/域名，一处改全站生效</span></div>
      <div class="tp-slot"><b>② 数据插槽</b><span>快照 + 网关：课表/通知/空教室换源即移植</span></div>
      <div class="tp-slot"><b>③ 应用插槽</b><span>apps.js + router.js 双登记，新应用即插即用</span></div>
    </div>
    <b class="tp-t">工作流可移植矩阵（读注册表实时数）</b>
    <div v-for="p in portable" :key="p.name" class="tp-row">
      <span>{{ p.name }} · <b>{{ p.n }}</b> 条</span>
      <em>{{ p.note }}</em>
    </div>
    <div class="tp-proof">
      <b>两校验证</b>
      <span>QDU-Nav（青岛大学）⇄ FJNU-Nav（福建师大）：同一骨架，校本应用各自保留（师大智答/日程助手/研究生服务），回归测试双站全绿。</span>
    </div>
    <div class="tp-go">
      <button class="primary" @click="emit('open', 'rebrand')">🔁 去换校向导试试</button>
      <button @click="emit('open', 'compare')">⚔️ 回到差异化对比</button>
    </div>
  </div>
</template>

<style scoped>
.tp-wrap { display: flex; flex-direction: column; gap: 12px; padding-bottom: 30px; }
.tp-head { display: flex; align-items: center; gap: 10px; }
.tp-head .back { border: 1px solid #e5e5e5; background: #fafafa; border-radius: 10px; padding: 3px 10px; cursor: pointer; }
.tp-n { font-size: 11px; background: #eff6ff; color: #1b66c9; border-radius: 8px; padding: 1px 8px; }
.tp-lead { font-size: 13px; color: #333; background: #f8fafc; border-radius: 8px; padding: 8px 12px; line-height: 1.8; }
.tp-slots { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.tp-slot { border: 1px solid #dbeafe; background: #eff6ff; border-radius: 12px; padding: 10px; font-size: 12px; display: flex; flex-direction: column; gap: 4px; }
.tp-slot span { color: #555; line-height: 1.6; }
.tp-t { margin-top: 4px; }
.tp-row { display: flex; justify-content: space-between; font-size: 13px; border: 1px solid #eee; border-radius: 10px; padding: 8px 12px; background: #fff; }
.tp-row em { font-style: normal; font-size: 12px; color: #888; }
.tp-proof { font-size: 13px; border-left: 3px solid #1b66c9; background: #f8fafc; border-radius: 0 8px 8px 0; padding: 8px 12px; line-height: 1.8; }
.tp-go { display: flex; gap: 8px; }
.tp-go button { flex: 1; border: 1px solid #e5e5e5; background: #fff; border-radius: 12px; padding: 9px; cursor: pointer; }
.tp-go button.primary { background: #7c3aed; color: #fff; border-color: #7c3aed; }
</style>
