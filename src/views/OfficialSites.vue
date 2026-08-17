<script setup>
import { ref, computed } from 'vue'
import { officialGroups, colleges, emergency } from '../data/official'

const emit = defineEmits(['back'])
const tab = ref('official')

const groups = officialGroups
const collegeList = colleges

/** 学院按学科分类聚合（保持学科大类顺序稳定） */
const CAT_ORDER = ['人文社科', '理工', '医学', '艺术与体育', '合作办学']
const collegeGroups = CAT_ORDER
  .map((cat) => ({ cat, list: collegeList.filter((c) => c.category === cat) }))
  .filter((g) => g.list.length)

/** 邮箱助手：输入学号 → 一键生成并复制校园邮箱 */
const sid = ref('')
const copied = ref(false)
const email = computed(() => {
  const v = sid.value.trim()
  return v ? v + '@qdu.edu.cn' : ''
})
async function copyMail() {
  if (!email.value) return
  try {
    await navigator.clipboard.writeText(email.value)
    copied.value = true
    setTimeout(() => (copied.value = false), 1600)
  } catch {
    /* 剪贴板权限受限时静默忽略 */
  }
}
</script>

<template>
  <div class="view-top">
    <button class="back-btn" @click="emit('back')">← 返回首页</button>
    <div class="view-title">学校官网</div>
    <div class="view-sub">青岛大学官方网站与各学院官网大全</div>
  </div>

  <div class="panel">
    <div class="seg">
      <button class="seg-btn" :class="{ active: tab === 'official' }" @click="tab = 'official'">🏛️ 官方网站</button>
      <button class="seg-btn" :class="{ active: tab === 'college' }" @click="tab = 'college'">🎓 学院官网</button>
      <button class="seg-btn" :class="{ active: tab === 'phone' }" @click="tab = 'phone'">📞 常用电话</button>
    </div>

    <template v-if="tab === 'official'">
      <div class="mail-helper">
        <div class="mail-head">
          <span class="mail-emoji">📧</span>
          <div class="mail-head-txt">
            <div class="mail-title">邮箱助手</div>
            <div class="mail-sub">输入学号，一键生成你的校园邮箱</div>
          </div>
        </div>
        <div class="mail-row">
          <input class="input" v-model="sid" type="text" inputmode="numeric" placeholder="输入学号，如 2023XXXXXX" style="flex:1;min-width:0;" />
          <button class="btn accent" :disabled="!email" @click="copyMail">{{ copied ? '已复制 ✓' : '复制邮箱' }}</button>
        </div>
        <div class="mail-out" :class="{ empty: !email }">{{ email || '输入学号后自动生成' }}</div>
        <div class="mail-quip">💡 悄悄告诉你：校长邮箱是 <b>xiaozhang@qdu.edu.cn</b>，一般别乱发哦～</div>
        <p class="muted" style="font-size:12px;margin-top:8px;line-height:1.8;">
          校园邮箱地址：<a class="link" href="https://mail.qdu.edu.cn" target="_blank" rel="noopener">mail.qdu.edu.cn</a>（账号 <b>学号@qdu.edu.cn</b>），用于接收教务处通知、奖学金与就业信息。尚未开通？可到
          <a class="link" href="https://ehall.qdu.edu.cn" target="_blank" rel="noopener">网上办事大厅</a>「邮箱申请」开通，或咨询智慧校园服务热线 0532-85955678。
        </p>
      </div>

      <div v-for="g in groups" :key="g.name" class="official-group">
        <h4 class="group-name">{{ g.icon }} {{ g.name }}</h4>
        <a v-for="s in g.sites" :key="s.url" class="site-link" :class="{ featured: s.featured }" :href="s.url" target="_blank" rel="noopener">
          <span class="site-name">{{ s.name }}</span>
          <span class="site-desc">{{ s.desc }}</span>
          <span class="site-go">↗</span>
        </a>
      </div>
    </template>

    <template v-else-if="tab === 'college'">
      <div v-for="g in collegeGroups" :key="g.cat" class="official-group">
        <h4 class="group-name">{{ g.cat }}</h4>
        <div class="college-grid">
          <a v-for="c in g.list" :key="c.name" class="college-card" :href="c.url" target="_blank" rel="noopener">
            <span class="college-name">{{ c.name }}</span>
            <span class="college-go">↗</span>
          </a>
        </div>
      </div>
      <p class="muted">学院名单依据青岛大学本科招生信息网「学院专业」整理，按学科大类分类展示，如有变动以学校官网为准。</p>
    </template>

    <template v-else>
      <div class="phone-list">
        <div v-for="(v, k) in emergency" :key="k" class="phone-row">
          <span class="phone-name">{{ k }}</span>
          <span class="phone-num">{{ v }}</span>
        </div>
      </div>
      <p class="muted">紧急求助请优先拨打 110 / 120 / 119。</p>
    </template>
  </div>
</template>

<style scoped>
.mail-helper {
  background: linear-gradient(160deg, #eef7ff 0%, #f7fbff 60%, #fffdf4 100%);
  border: 1px solid #cfe3fb;
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 18px;
  box-shadow: 0 6px 20px rgba(27, 102, 201, 0.08);
}
.mail-head {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}
.mail-emoji {
  width: 46px;
  height: 46px;
  border-radius: 14px;
  background: linear-gradient(135deg, #1b66c9, #4f9cf5);
  color: #fff;
  font-size: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  box-shadow: 0 4px 10px rgba(27, 102, 201, 0.3);
}
.mail-title {
  font-size: 16px;
  font-weight: 800;
  color: var(--text);
}
.mail-sub {
  font-size: 12px;
  color: var(--text-sub);
  margin-top: 2px;
}
.mail-row {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
.mail-row .btn {
  flex-shrink: 0;
}
.mail-out {
  margin-top: 10px;
  padding: 10px 12px;
  border-radius: 10px;
  background: #fff;
  border: 1px dashed var(--primary);
  color: var(--primary);
  font-weight: 700;
  font-size: 15px;
  word-break: break-all;
}
.mail-out.empty {
  color: var(--muted);
  border-color: var(--border);
  font-weight: 500;
  font-size: 13px;
}
.mail-quip {
  margin-top: 10px;
  font-size: 12px;
  color: #7c5a12;
  background: #fff8e6;
  border: 1px dashed #f2c14e;
  border-radius: 10px;
  padding: 8px 12px;
  line-height: 1.7;
}
</style>