<script setup>
import { ref } from 'vue'
import { useI18n } from '../i18n'

const { t, lang } = useI18n()

const emit = defineEmits(['back'])

const form = ref({ kaoshenghao: '' })
const error = ref('')

function gotoOfficial() {
  const ksh = form.value.kaoshenghao.trim()
  if (ksh && !/^\d{14}$/.test(ksh)) {
    error.value = '考生号应为 14 位数字（填错不影响前往，可清空后直接前往官方页面）'
    return
  }
  error.value = ''
  window.open('https://zhaosheng.qdu.edu.cn/static/front/qdu/basic/html_web/lqcx.html', '_blank', 'noopener')
}
</script>

<template>
  <div class="view-top">
    <button class="back-btn" @click="emit('back')">{{ t('common.back') }}</button>
    <div class="view-title">{{ t('studentId.title') }}</div>
    <div class="view-sub">{{ t('studentId.subFull') }}</div>
  </div>

  <div class="panel" style="margin-bottom:16px;">
    <div style="font-weight:700;margin-bottom:10px;">{{ t('studentId.officialTitle') }}</div>
    <div class="muted" style="font-size:12px;margin-bottom:10px;line-height:1.7;">
      {{ t('studentId.officialDesc') }}
    </div>
    <div class="cal-list">
      <a class="cal-item" href="https://zhaosheng.qdu.edu.cn/static/front/qdu/basic/html_web/lqcx.html" target="_blank" rel="noopener">
        <span class="cal-title">{{ t('studentId.admissionQuery') }}</span>
        <span class="cal-go">{{ t('studentId.portalGo') }}</span>
      </a>
      <a class="cal-item" href="https://zhaosheng.qdu.edu.cn/static/front/qdu/basic/html_web/lqjczy.html" target="_blank" rel="noopener">
        <span class="cal-title">{{ t('studentId.progressQuery') }}</span>
        <span class="cal-go">{{ t('studentId.portalGo') }}</span>
      </a>
      <a class="cal-item" href="https://mp.weixin.qq.com/s/Zk-fIw-aRk-v6h6k6xxRTA" target="_blank" rel="noopener">
        <span class="cal-title">{{ t('studentId.admissionNotice') }}</span>
        <span class="cal-go">{{ t('studentId.wechatGo') }}</span>
      </a>
      <a class="cal-item" href="https://zhaosheng.qdu.edu.cn" target="_blank" rel="noopener">
        <span class="cal-title">{{ t('studentId.admissionSite') }}</span>
        <span class="cal-go">{{ t('studentId.officialGo') }}</span>
      </a>
    </div>
  </div>

  <div class="panel">
    <div style="font-weight:700;margin-bottom:10px;">{{ t('studentId.processTitle') }}</div>
    <ol class="route-steps" style="margin:0 0 14px;padding-left:20px;">
      <li>{{ t('studentId.processStep1') }}</li>
      <li>{{ t('studentId.processStep2') }}</li>
      <li>{{ t('studentId.processStep3') }}</li>
      <li>{{ t('studentId.processStep4') }}</li>
    </ol>
    <div class="input-row">
      <input class="input" v-model="form.kaoshenghao" :placeholder="t('studentId.kshPlaceholder')" maxlength="14" />
      <button class="btn" @click="gotoOfficial">{{ t('studentId.goOfficial') }}</button>
    </div>
    <div v-if="error" class="result-box" style="background:var(--soft-red-bg);color:var(--soft-red-text);margin-top:10px;">{{ error }}</div>
    <div class="muted" style="margin-top:14px;font-size:12px;line-height:1.8;">
      {{ t('studentId.tipText') }}
    </div>
  </div>
</template>