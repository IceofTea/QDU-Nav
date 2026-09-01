<script setup>
import { ref, computed } from 'vue'
import { officialGroups, colleges, emergency, CAT_MAP } from '../data/official'
import { useI18n } from '../i18n'

const { t, lang } = useI18n()

const emit = defineEmits(['back'])
const tab = ref('official')

const groups = officialGroups
const collegeList = colleges

/** 学院按学科分类聚合（保持学科大类顺序稳定） */
const CAT_ORDER = ['人文社科', '理工', '医学', '艺术与体育', '合作办学']
const collegeGroups = CAT_ORDER
  .map((cat) => ({ cat, catEn: CAT_MAP[cat], list: collegeList.filter((c) => c.category === cat) }))
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
    <button class="back-btn" @click="emit('back')">{{ t('common.back') }}</button>
    <div class="view-title">{{ t('officialSites.title') }}</div>
    <div class="view-sub">{{ t('officialSites.subFull') }}</div>
  </div>

  <div class="panel">
    <div class="seg">
      <button class="seg-btn" :class="{ active: tab === 'official' }" @click="tab = 'official'">{{ t('officialSites.officialTab') }}</button>
      <button class="seg-btn" :class="{ active: tab === 'college' }" @click="tab = 'college'">{{ t('officialSites.collegeTab') }}</button>
      <button class="seg-btn" :class="{ active: tab === 'phone' }" @click="tab = 'phone'">{{ t('officialSites.phoneTab') }}</button>
    </div>

    <template v-if="tab === 'official'">
      <div class="mail-helper">
        <div class="mail-head">
          <span class="mail-emoji">📧</span>
          <div class="mail-head-txt">
            <div class="mail-title">{{ t('officialSites.mailTitle') }}</div>
            <div class="mail-sub">{{ t('officialSites.mailSub') }}</div>
          </div>
        </div>
        <div class="mail-row">
          <input class="input" v-model="sid" type="text" inputmode="numeric" :placeholder="t('officialSites.mailPlaceholder')" style="flex:1;min-width:0;" />
          <button class="btn accent" :disabled="!email" @click="copyMail">{{ copied ? t('officialSites.copiedMail') : t('officialSites.copyMail') }}</button>
        </div>
        <div class="mail-out" :class="{ empty: !email }">{{ email || t('officialSites.mailOutput') }}</div>
        <div class="mail-quip">{{ t('officialSites.mailQuip') }} <b>xiaozhang@qdu.edu.cn</b>{{ t('officialSites.mailQuipEnd') }}</div>
        <p class="muted" style="font-size:12px;margin-top:8px;line-height:1.8;">
          {{ t('officialSites.mailGuide') }}<a class="link" href="https://mail.qdu.edu.cn" target="_blank" rel="noopener">mail.qdu.edu.cn</a>{{ t('officialSites.mailGuide2') }}<b>{{ lang === 'en' ? 'Student ID' + '@qdu.edu.cn' : '学号@qdu.edu.cn' }}</b>{{ t('officialSites.mailGuideEnd') }}
          <a class="link" href="https://ehall.qdu.edu.cn" target="_blank" rel="noopener">{{ lang === 'en' ? 'Online Service Hall' : '网上办事大厅' }}</a>{{ t('officialSites.mailGuideEnd2') }}
        </p>
      </div>

      <div v-for="g in groups" :key="g.name" class="official-group">
        <h4 class="group-name">{{ g.icon }} {{ lang === 'en' ? g.nameEn : g.name }}</h4>
        <a v-for="s in g.sites" :key="s.url" class="site-link" :class="{ featured: s.featured }" :href="s.url" target="_blank" rel="noopener">
          <span class="site-name">{{ lang === 'en' ? s.nameEn : s.name }}</span>
          <span class="site-desc">{{ lang === 'en' ? s.descEn : s.desc }}</span>
          <span class="site-go">↗</span>
        </a>
      </div>
    </template>

    <template v-else-if="tab === 'college'">
      <div v-for="g in collegeGroups" :key="g.cat" class="official-group">
        <h4 class="group-name">{{ lang === 'en' ? g.catEn : g.cat }}</h4>
        <div class="college-grid">
          <a v-for="c in g.list" :key="c.name" class="college-card" :href="c.url" target="_blank" rel="noopener">
            <span class="college-name">{{ lang === 'en' ? c.nameEn : c.name }}</span>
            <span class="college-go">↗</span>
          </a>
        </div>
      </div>
      <p class="muted">{{ t('officialSites.collegeNote') }}</p>
    </template>

    <template v-else>
      <div class="phone-list">
        <div v-for="(v, k) in emergency" :key="k" class="phone-row">
          <span class="phone-name">{{ k }}</span>
          <span class="phone-num">{{ v }}</span>
        </div>
      </div>
      <p class="muted">{{ t('officialSites.emergencyNote') }}</p>
    </template>
  </div>
</template>

<style scoped>
.mail-helper {
  background: linear-gradient(160deg, var(--soft-blue) 0%, var(--soft) 60%, var(--soft-yellow) 100%);
  border: 1px solid var(--border);
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
  background: var(--card);
  border: 1px dashed var(--primary);
  color: var(--primary);
  font-weight: 700;
  font-size: 15px;
  word-break: break-all;
}
.mail-out.empty {
  color: var(--text-sub);
  border-color: var(--border);
  font-weight: 500;
  font-size: 13px;
}
.mail-quip {
  margin-top: 10px;
  font-size: 12px;
  color: var(--notice-text);
  background: var(--notice-bg);
  border: 1px dashed var(--notice-border);
  border-radius: 10px;
  padding: 8px 12px;
  line-height: 1.7;
}
</style>