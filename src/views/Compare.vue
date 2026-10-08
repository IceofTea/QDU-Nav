<script setup>
/**
 * ════════════════════════════════════════════════════════════════════
 * @模块路径  src/views/Compare.vue
 * @职责      差异化对比页：vs 学校官网 / vs 校园小程序 / vs 通用大模型
 *            三段论证 + 防御问答 —— 答辩防御的“证据页”（专家 §9.2）
 * @路由      #/app/compare（VIEWS.compare + data/apps 双登记）
 * @数据      静态论证文案（观点）+ 站内统计数（访客/工作流数，真实引用）
 * @被谁用    App.vue 路由；AboutAgent 门面互链；智能体意图直达
 * ════════════════════════════════════════════════════════════════════
 */
import { ref } from 'vue'

const emit = defineEmits(['back', 'open'])

const rows = ref([
  {
    vs: '学校官网', icon: '🏛️', verdict: '分散、慢、只能看',
    them: ['信息散在几十个二级页面，找通知靠翻页', '只读：看到 abnormal 课表也只能干瞪眼', '手机适配差，办事还得跑线下'],
    us: ['一站式聚合：通知/课表/空教室/官网直达同屏', '看到即能办：路线+食堂+加日程一条链', '移动端优先，首页一句话直达']
  },
  {
    vs: '校园小程序 / SaaS', icon: '📱', verdict: '只读查询，没有嘴和手',
    them: ['查课表/查成绩止于查询', '换学校=换一套系统，数据不互通', '按年收费，学校预算压力大'],
    us: ['说一句话就能办事的 Agent（27+3 条工作流）', '注册表架构：换校连大脑一起换', '轻量自研，MIT 开源，复制成本极低']
  },
  {
    vs: '通用大模型（豆包/DeepSeek 网页版）', icon: '🤖', verdict: '会聊天，不懂你的学校',
    them: ['不知道你的课表、宿舍、校内系统', '不会调校内接口，更不会替你确认执行', '断网即不可用，无降级'],
    us: ['27 条校内工作流：可执行、可确认、可撤销', '真实校内数据：课表/空教室/通知管线', '画像记忆 + 离线三级降级，永不干等']
  }
])
const qa = ref([
  { q: '大模型也能做，你们壁垒是什么？', a: '四样东西通用模型没有：校内工作流、真实校内数据、个人画像记忆、离线降级。嘴谁都有，手才是壁垒。' },
  { q: '换校 5 分钟是不是噱头？', a: '校级差异收敛为配置/数据/应用 3 插槽，两校验证+回归全绿。汇报一页带过，代码可查。' },
  { q: 'AI 到底在产品里做什么？', a: '用户 Agent 办事 + 维护 Agent 吃回流 + 评论区 AI 治理，三处界面可见（协作飞轮页）。' },
  { q: '数据断了怎么办？', a: '每个功能标数据可靠性等级，网关→快照→本地三级降级，永不白屏（D2/D10 可现场断网演示）。' }
])
const open = ref(-1)
</script>

<template>
  <div class="cp-wrap">
    <div class="cp-head">
      <button class="back" @click="emit('back')">‹ 返回</button>
      <b>⚔️ 为什么选我</b>
    </div>
    <div class="cp-lead">不说“界面简洁”，只摆三段对比——每个“我们”都能现场点开验证。</div>
    <div v-for="(r, i) in rows" :key="i" class="cp-card">
      <div class="cp-vs"><span>{{ r.icon }} vs {{ r.vs }}</span><em>{{ r.verdict }}</em></div>
      <div class="cp-cols">
        <div class="cp-them"><b>对方</b><ul><li v-for="(t, k) in r.them" :key="k">{{ t }}</li></ul></div>
        <div class="cp-us"><b>我们</b><ul><li v-for="(t, k) in r.us" :key="k">{{ t }}</li></ul></div>
      </div>
    </div>
    <div class="cp-qa-t">🛡️ 评委必问题（点开看标准答案）</div>
    <div v-for="(x, i) in qa" :key="i" class="cp-qa">
      <button @click="open = open === i ? -1 : i">{{ x.q }}</button>
      <p v-if="open === i">{{ x.a }}</p>
    </div>
    <div class="cp-go">
      <button class="primary" @click="emit('open', 'assistant')">🤖 现场验证：去问智能体</button>
      <button @click="emit('open', 'flywheel')">📊 看协作飞轮证据</button>
    </div>
  </div>
</template>

<style scoped>
.cp-wrap { display: flex; flex-direction: column; gap: 12px; padding-bottom: 30px; }
.cp-head { display: flex; align-items: center; gap: 10px; }
.cp-head .back { border: 1px solid #e5e5e5; background: #fafafa; border-radius: 10px; padding: 3px 10px; cursor: pointer; }
.cp-lead { font-size: 13px; color: #666; background: #f8fafc; border-radius: 8px; padding: 8px 12px; }
.cp-card { border: 1px solid #eee; border-radius: 12px; padding: 12px 14px; background: #fff; }
.cp-vs { display: flex; justify-content: space-between; align-items: center; font-weight: 800; }
.cp-vs em { font-style: normal; font-size: 12px; color: #b91c1c; background: #fef2f2; border-radius: 8px; padding: 1px 8px; }
.cp-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 8px; }
.cp-cols ul { margin: 4px 0 0; padding-left: 18px; font-size: 13px; line-height: 1.7; }
.cp-them { color: #888; }
.cp-us { color: #111; background: #f0fdf4; border-radius: 8px; padding: 6px 8px; }
.cp-qa-t { font-weight: 800; margin-top: 4px; }
.cp-qa button { width: 100%; text-align: left; border: 1px solid #e5e5e5; background: #fff; border-radius: 10px; padding: 8px 12px; cursor: pointer; font-weight: 600; }
.cp-qa p { font-size: 13px; color: #333; background: #eff6ff; border-radius: 8px; padding: 8px 12px; margin: 6px 0 0; line-height: 1.8; }
.cp-go { display: flex; gap: 8px; }
.cp-go button { flex: 1; border: 1px solid #e5e5e5; background: #fff; border-radius: 12px; padding: 9px; cursor: pointer; }
.cp-go button.primary { background: #1b66c9; color: #fff; border-color: #1b66c9; }
</style>
