<script setup>
/** 首页访问统计卡片：Vercount（免费、无登录）站点级独立访客 / 累计访问
 *  会话内缓存先行回填避免闪烁；直连其 API 拉取，节流防连发；不可用时优雅降级。 */
import { ref, computed, onMounted } from 'vue'

const STORAGE_KEY = 'qdu-nav-visit-v1'
const API_URL = 'https://events.vercount.one/api/v2/log'
const UV_PREFIX = 'vercount_uv_'
const REFRESH_MS = 5000

const uv = ref(null)
const pv = ref(null)
const failed = ref(false)
let lastRefresh = 0

const hostKey = () => (location.host || 'unknown-host').replace(/[^a-zA-Z0-9_-]/g, '_')
const hasUvCookie = () => document.cookie.split('; ').includes(UV_PREFIX + hostKey() + '=1')
const setUvCookie = () => {
  document.cookie = UV_PREFIX + hostKey() + '=1; path=/; max-age=31536000; samesite=lax'
}

const fmt = (n) => (Number(n) || 0).toLocaleString('en-US')
const uvText = computed(() => (uv.value === null ? '—' : fmt(uv.value)))
const pvText = computed(() => (pv.value === null ? '—' : fmt(pv.value)))

function restore() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (raw) {
      const d = JSON.parse(raw)
      if (d && d.uv !== undefined && d.pv !== undefined) {
        uv.value = d.uv
        pv.value = d.pv
      }
    }
  } catch {
    /* noop */
  }
}

async function fetchVisit() {
  const url = location.href
  if (!url || !url.startsWith('http')) return null
  const isNewUv = !hasUvCookie()
  if (isNewUv) setUvCookie()
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 8000)
    const r = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, isNewUv }),
      signal: ctrl.signal
    })
    clearTimeout(timer)
    if (!r.ok) return null
    const res = await r.json()
    const data = (res && res.data) || res
    if (!data || data.site_pv === undefined) return null
    return { pv: String(data.site_pv), uv: String(data.site_uv) }
  } catch {
    return null
  }
}

async function refresh() {
  restore()
  const now = Date.now()
  if (now - lastRefresh < REFRESH_MS) return
  lastRefresh = now
  const d = await fetchVisit()
  if (!d) {
    failed.value = true
    return
  }
  uv.value = d.uv
  pv.value = d.pv
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(d))
  } catch {
    /* noop */
  }
}

onMounted(refresh)
</script>

<template>
  <div v-if="uv !== null || pv !== null || !failed" class="visit-stats">
    <div class="vs-item">
      <span class="vs-icon">👀</span>
      <span class="vs-num">{{ uvText }}</span>
      <span class="vs-label">独立访客</span>
    </div>
    <span class="vs-divider"></span>
    <div class="vs-item">
      <span class="vs-icon">📈</span>
      <span class="vs-num">{{ pvText }}</span>
      <span class="vs-label">累计访问</span>
    </div>
    <span class="vs-note">本站累计 · 由 Vercount 统计</span>
  </div>
</template>

<style scoped>
.visit-stats {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
  background: linear-gradient(135deg, #eef6ff, #f8fbff);
  border: 1px solid #cfe3fb;
  border-radius: 12px;
  padding: 10px 14px;
  margin-top: 12px;
}
.vs-item {
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
}
.vs-icon {
  font-size: 15px;
}
.vs-num {
  font-size: 20px;
  font-weight: 800;
  color: var(--primary);
  font-variant-numeric: tabular-nums;
}
.vs-label {
  font-size: 12px;
  color: var(--text-sub);
}
.vs-divider {
  width: 1px;
  height: 22px;
  background: var(--border);
}
.vs-note {
  font-size: 11px;
  color: var(--text-light);
  margin-left: auto;
}
</style>