<script setup>
/**
 * 应用根组件：欢迎页 / 顶栏 / 主视图 / 页脚 / 底部导航
 * ---------------------------------------------------------------------------
 * 视图注册、路由解析、导航逻辑集中在 src/router.js；
 * 品牌、版权、文案集中在 src/config/site.js。此处只做组装。
 */
import { ref, onMounted } from 'vue'
import Welcome from './views/Welcome.vue'
import { SITE } from './config/site'
import { NAV_APPS, useViewState } from './router'

/** 会话级初始页：每次新开浏览器先展示欢迎页，进入后本会话不再打扰 */
const stage = ref(sessionStorage.getItem('qdu_welcome_seen') ? 'main' : 'welcome')
function enter() {
  sessionStorage.setItem('qdu_welcome_seen', '1')
  stage.value = 'main'
}

/* 深色模式：localStorage 记忆 + 跟随系统偏好，<html data-theme> 驱动。
 * index.html 已内联首屏脚本预置 data-theme（消除欢迎页/首屏 FOUC），
 * 此处读取其值初始化，并兜底计算（内联脚本失败时）。 */
const THEME_KEY = 'qdu_theme'
const theme = ref(document.documentElement.getAttribute('data-theme') || 'light')
function applyTheme(t) {
  theme.value = t
  document.documentElement.setAttribute('data-theme', t)
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', t === 'dark' ? '#10141b' : '#1b66c9')
  try {
    localStorage.setItem(THEME_KEY, t)
  } catch {
    /* noop */
  }
}
function toggleTheme() {
  applyTheme(theme.value === 'dark' ? 'light' : 'dark')
}
onMounted(() => {
  if (document.documentElement.getAttribute('data-theme')) return
  let t = 'light'
  try {
    t = localStorage.getItem(THEME_KEY) || ''
  } catch {
    /* noop */
  }
  if (!t) {
    t = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  applyTheme(t)
})

const { current, currentComp, openApp, goHome } = useViewState()

/* 默哀模式：灰白风格 + 顶部哀思条。
 * 触发来源：① 手动后门——部署时向 public/ 上传一个 `mourning` 文件即触发；
 *          ② 自动计时——每年 12 月 13 日南京大屠杀死难者国家公祭日自动变灰白。
 * 不依赖后端，进入/离开公祭日由每分钟定时器自动切换，可随时手动开关。 */
const mourning = ref(false)
const mourningCause = ref('')
function enableMourning(cause) {
  if (mourning.value && mourningCause.value === 'memorial') return
  mourning.value = true
  mourningCause.value = cause === 'memorial' ? 'memorial' : 'manual'
  document.documentElement.classList.add('mourning')
}
function disableMourning() {
  mourning.value = false
  mourningCause.value = ''
  document.documentElement.classList.remove('mourning')
}
onMounted(() => {
  const inMemorial = () => { const n = new Date(); return n.getMonth() === 11 && n.getDate() === 13 }
  if (inMemorial()) enableMourning('memorial')
  setInterval(() => {
    if (inMemorial()) enableMourning('memorial')
    else if (mourningCause.value === 'memorial') disableMourning()
  }, 60000)
  fetch(import.meta.env.BASE_URL + 'mourning')
    .then((r) => {
      if (r.ok && !(r.headers.get('content-type') || '').includes('text/html')) enableMourning('manual')
    })
    .catch(() => {})
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
            <div class="brand-name">{{ SITE.name }}</div>
            <div class="brand-sub">{{ SITE.tagline }}</div>
          </div>
        </div>
        <div class="header-right">
          <button class="ghost-btn" :title="theme === 'dark' ? '切换到浅色模式' : '切换到深色模式'" @click="toggleTheme">{{ theme === 'dark' ? '☀️' : '🌙' }}</button>
          <button class="ghost-btn" @click="goHome">🏠 首页</button>
        </div>
      </div>
    </header>

    <main class="main">
      <div v-if="mourning" class="mourning-bar">
        {{ mourningCause === 'memorial' ? '🕯 12月13日 · 南京大屠杀死难者国家公祭日 · 铭记历史，吾辈自强' : '🕯 今日为全国哀悼日，本站以灰白页面寄托哀思' }}
      </div>
      <component :is="currentComp" @open="openApp" @back="goHome" />
    </main>

    <footer class="footer">
      <div class="footer-legend">
        <span class="legend-item"><i class="dot live"></i>{{ SITE.legendLive }}</span>
        <span class="legend-item"><i class="dot demo"></i>{{ SITE.legendDemo }}</span>
        <span class="legend-item"><i class="dot tool"></i>{{ SITE.legendTool }}</span>
      </div>
      <div class="footer-copy">{{ SITE.copy }}<span class="footer-ver"> v{{ SITE.version }}</span></div>
      <div class="footer-dev">{{ SITE.devLine }}</div>
    </footer>

    <nav class="bottom-nav">
      <button class="bottom-nav__item" :class="{ 'is-active': current === 'home' }" @click="goHome">
        <span class="bn-icon">🏠</span><span>首页</span>
      </button>
      <button
        v-for="a in NAV_APPS"
        :key="a.id"
        class="bottom-nav__item"
        :class="{ 'is-active': current === a.id }"
        @click="openApp(a.id)"
      >
        <span class="bn-icon">{{ a.icon }}</span>
        <span>{{ a.label }}</span>
      </button>
    </nav>
  </div>
</template>