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

/* 深色模式：localStorage 记忆 + 跟随系统偏好，<html data-theme> 驱动 */
const THEME_KEY = 'qdu_theme'
const theme = ref('light')
function applyTheme(t) {
  theme.value = t
  document.documentElement.setAttribute('data-theme', t)
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