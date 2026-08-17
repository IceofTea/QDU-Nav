<script setup>
/** 首页访问统计卡片：独立访客 UV / 累计访问 PV
 *  数据来自自建计数服务（counter/server.mjs，独立于 QDU-Wiki，详见部署说明）。
 *  会话内缓存先行回填避免闪烁；服务不可用时降级显示「—」。 */
import { ref, computed, onMounted } from 'vue'
import { SITE } from '../config/site'

const STORAGE_KEY = 'qdu-nav-visit-v1'
const UV_SEEN_KEY = 'qdu_nav_uv_seen'
const api = (SITE.counter && SITE.counter.api) || ''

const uv = ref(null)
const pv = ref(null)
const todayUv = ref(null)
const todayPv = ref(null)

const fmt = (n) => (Number(n) || 0).toLocaleString('en-US')
const uvText = computed(() => (uv.value === null ? '—' : fmt(uv.value)))
const pvText = computed(() => (pv.value === null ? '—' : fmt(pv.value)))
const todayUvText = computed(() => (todayUv.value === null ? '—' : fmt(todayUv.value)))
const todayPvText = computed(() => (todayPv.value === null ? '—' : fmt(todayPv.value)))

function restore() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (raw) {
      const d = JSON.parse(raw)
      if (d && d.uv !== undefined && d.pv !== undefined) {
        uv.value = d.uv
        pv.value = d.pv
        todayUv.value = d.today ? d.today.uv : null
        todayPv.value = d.today ? d.today.pv : null
      }
    }
  } catch {
    /* noop */
  }
}

async function refresh() {
  restore()
  if (!api) return
  try {
    const isNew = !localStorage.getItem(UV_SEEN_KEY)
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 8000)
    const r = await fetch(api + '/api/hit?isNewUv=' + (isNew ? '1' : '0'), { signal: ctrl.signal })
    clearTimeout(timer)
    if (!r.ok) return
    const d = await r.json()
    if (!d || d.uv === undefined || d.pv === undefined) return
    uv.value = d.uv
    pv.value = d.pv
    todayUv.value = d.today ? d.today.uv : null
    todayPv.value = d.today ? d.today.pv : null
    if (isNew) {
      try {
        localStorage.setItem(UV_SEEN_KEY, '1')
      } catch {
        /* noop */
      }
    }
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(d))
    } catch {
      /* noop */
    }
  } catch {
    /* 服务不可用：保留「—」占位 */
  }
}

onMounted(refresh)
</script>

<template>
  <div class="visit-stats">
    <div class="vs-grid">
      <div class="vs-card">
        <span class="vs-icon">👀</span>
        <div class="vs-cell"><span class="vs-num">{{ uvText }}</span><span class="vs-label">独立访客</span></div>
      </div>
      <div class="vs-card">
        <span class="vs-icon">📈</span>
        <div class="vs-cell"><span class="vs-num">{{ pvText }}</span><span class="vs-label">累计访问</span></div>
      </div>
      <div class="vs-card">
        <span class="vs-icon">📅</span>
        <div class="vs-cell"><span class="vs-num">{{ todayUvText }}</span><span class="vs-label">今日访客</span></div>
      </div>
      <div class="vs-card">
        <span class="vs-icon">⚡</span>
        <div class="vs-cell"><span class="vs-num">{{ todayPvText }}</span><span class="vs-label">今日访问</span></div>
      </div>
    </div>
    <div class="vs-note">本站累计 · 自建独立计数</div>
  </div>
</template>

<style scoped>
.visit-stats {
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: linear-gradient(135deg, #eef6ff, #f8fbff);
  border: 1px solid #cfe3fb;
  border-radius: 12px;
  padding: 10px 14px;
  margin-top: 12px;
}
.vs-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 8px;
}
.vs-card {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  background: #fff;
  border: 1px solid #dbeafe;
  border-radius: 10px;
}
.vs-icon {
  font-size: 16px;
  flex: 0 0 auto;
}
.vs-cell {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}
.vs-num {
  font-size: 17px;
  font-weight: 800;
  color: var(--primary);
  font-variant-numeric: tabular-nums;
  line-height: 1.1;
}
.vs-label {
  font-size: 11px;
  color: var(--text-sub);
}
.vs-note {
  font-size: 11px;
  color: var(--text-light);
}
</style>