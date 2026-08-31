<script setup>
import { ref, onMounted } from 'vue'
import { apiFetch } from '../api'
import { fallbackNotices, fallbackNews } from '../data/news'
import NoticeDetail from './NoticeDetail.vue'
import { useI18n } from '../i18n'

const { t, lang } = useI18n()

const emit = defineEmits(['back'])

const tab = ref('notice')
const loading = ref(true)
const refreshing = ref(false)
const online = ref(false)
const staticMode = ref(false)
const fetchedAt = ref('')
const costMs = ref(null)
const cached = ref(false)
const notices = ref([])
const news = ref([])
const selected = ref(null)

const loadAll = async (force) => {
  refreshing.value = true
  const [n, ns, all] = await Promise.all([
    apiFetch('/notices' + (force ? '?force=1' : '')),
    apiFetch('/news' + (force ? '?force=1' : '')),
    apiFetch('/notices?all=1' + (force ? '&force=1' : ''))
  ])
  if (n && Array.isArray(n.items) && n.items.length) {
    notices.value = n.items
    online.value = true
    staticMode.value = !!n.static
    fetchedAt.value = n.fetchedAt
    costMs.value = n.costMs
    cached.value = n.cached
  } else {
    notices.value = fallbackNotices
    staticMode.value = false
  }
  if (ns && Array.isArray(ns.items) && ns.items.length) news.value = ns.items
  else news.value = fallbackNews
  if (all && Array.isArray(all.items) && all.items.length) {
    notices.value = all.items
    fetchedAt.value = all.fetchedAt
    costMs.value = all.costMs
    cached.value = all.cached
  }
  refreshing.value = false
  loading.value = false
}

const refresh = () => loadAll(true)

onMounted(loadAll)
</script>

<template>
  <div class="view-top">
    <button class="back-btn" @click="emit('back')">{{ t('common.back') }}</button>
    <div class="view-title">{{ t('campusNews.title') }}</div>
    <div class="view-sub">{{ t('campusNews.subFull') }} · {{ staticMode ? t('campusNews.snapshotMode') : t('campusNews.realtimeMode') }}</div>
  </div>

  <template v-if="selected">
    <NoticeDetail :notice="selected" @back="selected = null" />
  </template>

  <template v-else>
    <div v-if="!loading" class="source-bar">
      <span class="dot" :class="online ? 'live' : 'off'"></span>
      <span>{{ staticMode ? t('campusNews.snapshotData') : online ? t('campusNews.realtimeData') : t('campusNews.fallbackData') }}</span>
      <span class="sep">·</span>
      <span>{{ t('campusNews.dataSource') }}</span>
      <template v-if="online">
        <span class="sep">·</span>
        <span>{{ t('campusNews.fetchedAt') }} {{ new Date(fetchedAt).toLocaleTimeString('zh-CN', { hour12: false }) }}</span>
        <template v-if="costMs"><span class="sep">·</span><span>{{ t('campusNews.costTime') }} {{ costMs }}ms</span></template>
        <span v-if="cached" class="sep">·</span><span v-if="cached">{{ t('campusNews.cacheHit') }}</span>
      </template>
      <button class="refresh-btn" :disabled="refreshing" @click="refresh">{{ refreshing ? t('common.refreshing') : t('common.refresh') }}</button>
    </div>

    <div class="panel" style="margin-bottom:16px;">
      <div class="seg">
        <button class="seg-btn" :class="{ active: tab === 'notice' }" @click="tab = 'notice'">
          {{ t('campusNews.noticeTab') }}{{ notices.length }}）
        </button>
        <button class="seg-btn" :class="{ active: tab === 'news' }" @click="tab = 'news'">
          {{ t('campusNews.newsTab') }}{{ news.length }}）
        </button>
      </div>

      <div v-if="loading" class="skeleton-list">
        <div v-for="i in 6" :key="i" class="skeleton-row">
          <div class="skeleton" style="width:74px;height:22px;"></div>
          <div class="skeleton" style="flex:1;height:14px;"></div>
        </div>
      </div>

      <div v-else-if="tab === 'notice'" class="news-list">
        <button v-for="it in notices" :key="it.url" class="news-item news-click" @click="selected = it">
          <span class="news-date">{{ it.date }}</span>
          <span class="news-title">{{ it.title }}</span>
          <span class="news-go">{{ t('campusNews.detailBtn') }}</span>
        </button>
      </div>

      <div v-else class="news-list">
        <a v-for="it in news" :key="it.url" class="news-item" :href="it.url" target="_blank" rel="noopener">
          <span v-if="it.img" class="news-thumb"><img :src="it.img" alt="" loading="lazy" /></span>
          <span class="news-title">{{ it.title }}</span>
          <span class="news-go">↗</span>
        </a>
      </div>
    </div>

    <div v-if="!loading && tab === 'notice'" class="panel" style="padding:12px 16px;">
      <div style="display:flex;align-items:center;justify-content:center;gap:14px;flex-wrap:wrap;">
        <span class="muted" style="font-size:13px;">{{ t('campusNews.noticeListHint', { n: notices.length }) }}</span>
        <span class="sep" style="opacity:.4;">·</span>
        <a class="btn ghost" style="text-decoration:none;" href="https://jwc.qdu.edu.cn/jwtz.htm" target="_blank" rel="noopener">{{ t('campusNews.viewFullList') }}</a>
      </div>
    </div>

    <div class="muted" style="font-size:12px;">
      {{ t('campusNews.sourceLink') }}<a class="link" href="https://jwc.qdu.edu.cn" target="_blank" rel="noopener">{{ t('campusNews.footerSource') }}</a>
    </div>
  </template>
</template>