<script setup>
import { ref, onMounted } from 'vue'
import { apiFetch } from '../api'
import { fallbackNotices, fallbackNews } from '../data/news'
import NoticeDetail from './NoticeDetail.vue'

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

function open(url) {
  window.open(url, '_blank', 'noopener')
}
</script>

<template>
  <div class="view-top">
    <button class="back-btn" @click="emit('back')">← 返回首页</button>
    <div class="view-title">校园动态</div>
    <div class="view-sub">教务处官方通知与动态 · {{ staticMode ? '构建时快照（静态部署）' : '由服务端实时抓取' }}</div>
  </div>

  <template v-if="selected">
    <NoticeDetail :notice="selected" @back="selected = null" />
  </template>

  <template v-else>
    <div v-if="!loading" class="source-bar">
      <span class="dot" :class="online ? 'live' : 'off'"></span>
      <span>{{ staticMode ? '官方数据快照（构建时）' : online ? '官方实时数据' : '官方接口暂不可达，展示演示数据' }}</span>
      <span class="sep">·</span>
      <span>来源 jwc.qdu.edu.cn</span>
      <template v-if="online">
        <span class="sep">·</span>
        <span>抓取于 {{ new Date(fetchedAt).toLocaleTimeString('zh-CN', { hour12: false }) }}</span>
        <template v-if="costMs"><span class="sep">·</span><span>耗时 {{ costMs }}ms</span></template>
        <span v-if="cached" class="sep">·</span><span v-if="cached">命中缓存</span>
      </template>
      <button class="refresh-btn" :disabled="refreshing" @click="refresh">{{ refreshing ? '刷新中…' : '🔄 刷新' }}</button>
    </div>

    <div class="panel" style="margin-bottom:16px;">
      <div class="seg">
        <button class="seg-btn" :class="{ active: tab === 'notice' }" @click="tab = 'notice'">
          📢 教务通知（{{ notices.length }}）
        </button>
        <button class="seg-btn" :class="{ active: tab === 'news' }" @click="tab = 'news'">
          📰 教务动态（{{ news.length }}）
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
          <span class="news-go">详情 ›</span>
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

    <div v-if="!loading && tab === 'notice'" class="panel" style="text-align:center;padding:16px;">
      <div class="muted" style="font-size:13px;">共 {{ notices.length }} 条通知（抓取自教务处通知列表页）</div>
      <a class="btn ghost" style="margin-top:10px;text-decoration:none;" href="https://jwc.qdu.edu.cn/jwtz.htm" target="_blank" rel="noopener">查看完整通知列表 ↗</a>
    </div>

    <div class="muted" style="font-size:12px;">
      数据来源：<a class="link" href="https://jwc.qdu.edu.cn" target="_blank" rel="noopener">青岛大学教务处 jwc.qdu.edu.cn</a>
    </div>
  </template>
</template>