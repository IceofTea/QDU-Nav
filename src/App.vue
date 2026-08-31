<script setup>
import { ref, computed, onMounted } from 'vue'
import Welcome from './views/Welcome.vue'
import { SITE } from './config/site'
import { NAV_APPS, useViewState } from './router'
import { apps } from './data/apps'
import { fetchLikes, toggleLike, likedByMe } from './utils/like'
import { useI18n } from './i18n'

const { t, lang, toggleLang } = useI18n()

const stage = ref(sessionStorage.getItem('qdu_welcome_seen') ? 'main' : 'welcome')
function enter() {
  sessionStorage.setItem('qdu_welcome_seen', '1')
  stage.value = 'main'
}

const THEME_KEY = 'qdu_theme'
const theme = ref(document.documentElement.getAttribute('data-theme') || 'light')
function applyTheme(t2) {
  theme.value = t2
  document.documentElement.setAttribute('data-theme', t2)
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', t2 === 'dark' ? '#10141b' : '#1b66c9')
  try { localStorage.setItem(THEME_KEY, t2) } catch {}
}
function toggleTheme() { applyTheme(theme.value === 'dark' ? 'light' : 'dark') }
onMounted(() => {
  if (document.documentElement.getAttribute('data-theme')) return
  let t2 = 'light'
  try { t2 = localStorage.getItem(THEME_KEY) || '' } catch {}
  if (!t2) t2 = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  applyTheme(t2)
})

const { current, currentComp, openApp, goHome } = useViewState()

const appTitle = (id) => {
  const a = apps.find((x) => x.id === id)
  if (!a) return id
  return lang.value === 'en' && a.titleEn ? a.titleEn : a.title
}
const likes = ref({})
const likedState = ref({})
async function initLikes() {
  likes.value = await fetchLikes()
  const m = {}
  for (const a of apps) m[a.id] = likedByMe(a.id)
  likedState.value = m
}
async function tapLike(appId) {
  const res = await toggleLike(appId)
  likedState.value = { ...likedState.value, [appId]: res.liked }
  if (res.likes != null) likes.value = { ...likes.value, [appId]: res.likes }
  else {
    const cur = likes.value[appId] != null ? likes.value[appId] : 0
    likes.value = { ...likes.value, [appId]: Math.max(0, cur + (res.liked ? 1 : -1)) }
  }
}

const notices = ref([])
const noticeOpen = ref(false)
const noticeRead = ref(new Set(JSON.parse(localStorage.getItem('qdu_notice_read') || '[]')))
const unreadCount = computed(() => notices.value.filter((n) => !noticeRead.value.has(String(n.id))).length)
async function loadNotices() {
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 6000)
    const r = await fetch(import.meta.env.BASE_URL + 'data/announcements.json', { signal: ctrl.signal })
    clearTimeout(timer)
    if (r.ok) { const d = await r.json(); if (d && Array.isArray(d.list)) notices.value = d.list }
  } catch {}
}
function openNotices() {
  noticeOpen.value = true
  for (const n of notices.value) noticeRead.value.add(String(n.id))
  try { localStorage.setItem('qdu_notice_read', JSON.stringify([...noticeRead.value])) } catch {}
}

const mourning = ref(false)
const mourningCause = ref('')
function enableMourning(cause) {
  if (mourning.value && mourningCause.value === 'memorial') return
  mourning.value = true
  mourningCause.value = cause === 'memorial' ? 'memorial' : 'manual'
  document.documentElement.classList.add('mourning')
}
function disableMourning() { mourning.value = false; mourningCause.value = ''; document.documentElement.classList.remove('mourning') }
onMounted(() => {
  const inMemorial = () => { const n = new Date(); return n.getMonth() === 11 && n.getDate() === 13 }
  if (inMemorial()) enableMourning('memorial')
  setInterval(() => { if (inMemorial()) enableMourning('memorial'); else if (mourningCause.value === 'memorial') disableMourning() }, 60000)
  fetch(import.meta.env.BASE_URL + 'mourning').then((r) => { if (r.ok && !(r.headers.get('content-type') || '').includes('text/html')) enableMourning('manual') }).catch(() => {})
  initLikes()
  loadNotices()
})
</script>

<template>
  <Welcome v-if="stage === 'welcome'" @enter="enter" />

  <div v-else class="app-shell">
    <header class="header">
      <div class="header-inner">
        <div class="brand" @click="goHome">
          <div class="brand-logo"><span>{{ SITE.brand }}</span></div>
          <div>
            <div class="brand-name">{{ t('site.name') }}</div>
            <div class="brand-sub">{{ t('site.tagline') }}</div>
          </div>
        </div>
        <div class="header-right">
          <button class="ghost-btn notice-bell" :class="{ 'has-unread': unreadCount > 0 }" title="查看公告" @click="openNotices">
            📢<span v-if="unreadCount > 0" class="notice-dot">{{ unreadCount > 9 ? '9+' : unreadCount }}</span>
          </button>
          <button class="ghost-btn lang-btn" :title="lang === 'zh' ? 'Switch to English' : '切换到中文'" @click="toggleLang">
            <span class="lang-label">{{ lang === 'zh' ? 'EN' : '中' }}</span>
          </button>
          <button class="ghost-btn" :title="theme === 'dark' ? 'Switch to light' : 'Switch to dark'" @click="toggleTheme">{{ theme === 'dark' ? '☀️' : '🌙' }}</button>
          <button class="ghost-btn" @click="goHome">🏠 {{ t('nav.home') }}</button>
        </div>
      </div>
    </header>

    <main class="main">
      <div v-if="current && current !== 'home'" class="app-like-bar">
        <button class="app-like-btn" :class="{ on: likedState[current] }" @click="tapLike(current)">
          <span>👍</span>
          <span>{{ t('like.give').replace('{name}', appTitle(current)) }}</span>
          <b>{{ likes[current] != null ? likes[current] : 0 }}</b>
        </button>
      </div>
      <div v-if="mourning" class="mourning-bar">
        {{ mourningCause === 'memorial' ? '🕯 12月13日 · 南京大屠杀死难者国家公祭日 · 铭记历史，吾辈自强' : '🕯 今日为全国哀悼日，本站以灰白页面寄托哀思' }}
      </div>
      <component :is="currentComp" @open="openApp" @back="goHome" />
    </main>

    <footer class="footer">
      <div class="footer-legend">
        <span class="legend-item"><i class="dot live"></i>{{ t('site.legendLive') }}</span>
        <span class="legend-item"><i class="dot demo"></i>{{ t('site.legendDemo') }}</span>
        <span class="legend-item"><i class="dot tool"></i>{{ t('site.legendTool') }}</span>
      </div>
      <div class="footer-copy">{{ t('site.copy') }}<span class="footer-ver"> v{{ SITE.version }}</span></div>
      <div class="footer-dev">{{ t('site.devLine') }}</div>
    </footer>

    <nav class="bottom-nav">
      <button class="bottom-nav__item" :class="{ 'is-active': current === 'home' }" @click="goHome">
        <span class="bn-icon">🏠</span><span>{{ t('nav.home') }}</span>
      </button>
      <button
        v-for="a in NAV_APPS"
        :key="a.id"
        class="bottom-nav__item"
        :class="{ 'is-active': current === a.id }"
        @click="openApp(a.id)"
      >
        <span class="bn-icon">{{ a.icon }}</span>
        <span>{{ lang === 'en' && a.labelEn ? a.labelEn : a.label }}</span>
      </button>
    </nav>
  </div>

  <div v-if="noticeOpen" class="notice-mask" @click.self="noticeOpen = false">
    <div class="notice-modal">
      <div class="notice-modal-head">
        <span class="notice-modal-title">📢 {{ t('announcement.title').replace('📢 ', '') }}</span>
        <button class="notice-modal-close" title="关闭" @click="noticeOpen = false">✕</button>
      </div>
      <div class="notice-modal-body">
        <div v-if="!notices.length" class="muted" style="text-align:center;padding:24px;">{{ t('announcement.empty') }}</div>
        <div v-for="n in notices" :key="n.id" class="notice-item">
          <div class="notice-item-title">{{ n.title }}<span class="notice-item-date muted">{{ n.date }}</span></div>
          <div class="notice-item-content">{{ n.content }}</div>
        </div>
      </div>
    </div>
  </div>
</template>
