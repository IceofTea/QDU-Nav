<script setup>
import { ref, onMounted } from 'vue'
import { apiFetch } from '../api'
import { useI18n } from '../i18n'

const { t, lang } = useI18n()

const props = defineProps({ notice: { type: Object, required: true } })
const emit = defineEmits(['back'])

const loading = ref(true)
const error = ref('')
const detail = ref(null)

onMounted(async () => {
  const m = props.notice.url.match(/info\/1009\/(\d+)\.htm/)
  const id = m ? m[1] : null
  if (!id) {
    error.value = t('noticeDetail.errParse')
    loading.value = false
    return
  }
  const r = await apiFetch('/notice?id=' + id)
  if (r && r.body) {
    detail.value = r
  } else {
    error.value = t('noticeDetail.errFetch')
  }
  loading.value = false
})
</script>

<template>
  <div class="view-top">
    <button class="back-btn" @click="emit('back')">← {{ t('noticeDetail.backToList').slice(2) }}</button>
    <div class="view-title">{{ t('noticeDetail.title') }}</div>
  </div>

  <div v-if="loading" class="panel">
    <div class="skeleton" style="width:70%;height:22px;"></div>
    <div class="skeleton" style="width:40%;height:14px;margin-top:12px;"></div>
    <div class="skeleton" style="width:100%;height:14px;margin-top:22px;"></div>
    <div class="skeleton" style="width:96%;height:14px;margin-top:8px;"></div>
    <div class="skeleton" style="width:88%;height:14px;margin-top:8px;"></div>
    <div class="skeleton" style="width:100%;height:14px;margin-top:8px;"></div>
  </div>

  <div v-else-if="error" class="panel" style="text-align:center;padding:34px;">
    <div style="font-size:30px;">⚠️</div>
    <div style="margin:12px 0;">{{ error }}</div>
    <a class="btn" :href="notice.url" target="_blank" rel="noopener" style="text-decoration:none;">{{ t('noticeDetail.goToOriginal') }}</a>
  </div>

  <div v-else class="panel">
    <div class="source-bar">
      <span class="dot live"></span>
      <span>{{ t('noticeDetail.source') }}</span>
      <span class="sep">·</span>
      <span>{{ t('noticeDetail.fetchedAt') }} {{ new Date(detail.fetchedAt).toLocaleTimeString(lang === 'en' ? 'en-US' : 'zh-CN', { hour12: false }) }}</span>
      <template v-if="detail.costMs"><span class="sep">·</span><span>{{ t('noticeDetail.costMs') }} {{ detail.costMs }}ms</span></template>
    </div>

    <h1 class="detail-title">{{ detail.title }}</h1>
    <div class="detail-meta">{{ t('noticeDetail.publishDate') }}{{ notice.date }}</div>

    <article class="article-body" v-html="detail.body"></article>

    <div style="margin-top:20px;padding-top:16px;border-top:1px solid var(--border);display:flex;gap:10px;flex-wrap:wrap;">
      <a class="btn ghost" :href="notice.url" target="_blank" rel="noopener" style="text-decoration:none;">{{ t('noticeDetail.viewOriginal') }}</a>
      <a class="btn ghost" href="https://jwc.qdu.edu.cn/jwtz.htm" target="_blank" rel="noopener" style="text-decoration:none;">{{ t('noticeDetail.noticeList') }}</a>
    </div>
  </div>
</template>