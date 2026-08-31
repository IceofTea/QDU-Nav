<script setup>
/** 首页访问统计卡片：独立访客 UV / 累计访问 PV
 *  数据来自自建计数服务（counter/server.mjs 与 server.ts，独立于 QDU-Wiki）。
 *  UV 去重由服务端按前端匿名访客 ID（vid）完成，缺失时回退「IP + UA」指纹；
 *  每会话只上报一次 /api/hit（会话内缓存回填），其余会话读 /api/stats 显示，控制计数服务请求量；
 *  服务不可用时降级显示「—」。 */
import { ref, computed, onMounted } from 'vue'
import { SITE } from '../config/site'
import { visitorId } from '../utils/visitor'
import { getSiteStats, isStaticMode } from '../api/siteStats'
import { useI18n } from '../i18n'
const { t, lang } = useI18n()

const STORAGE_KEY = 'qdu-nav-visit-v1'
const REPORT_KEY = 'qdu-nav-visit-reported'
const api = (SITE.counter && SITE.counter.api) || ''
const STATIC_MODE = isStaticMode()

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
  // 静态降级模式：读快照展示，不向计数服务发任何请求
  if (STATIC_MODE) {
    const d = await getSiteStats()
    if (d.uv !== undefined && d.pv !== undefined) {
      uv.value = d.uv
      pv.value = d.pv
      todayUv.value = d.today ? d.today.uv : null
      todayPv.value = d.today ? d.today.pv : null
    }
    return
  }
  if (!api) return
  let reported = false
  try { reported = sessionStorage.getItem(REPORT_KEY) === '1' } catch { /* noop */ }
  // 本会话已上报过 → 只读统计不计数（/api/stats 全量或 hit 轻量均含 uv/pv/today）
  const url = reported ? '/api/stats' : '/api/hit?vid=' + encodeURIComponent(visitorId())
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 8000)
    const r = await fetch(api + url, { signal: ctrl.signal })
    clearTimeout(timer)
    if (!r.ok) return
    const d = await r.json()
    if (!d || d.uv === undefined || d.pv === undefined) return
    uv.value = d.uv
    pv.value = d.pv
    todayUv.value = d.today ? d.today.uv : null
    todayPv.value = d.today ? d.today.pv : null
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(d))
      sessionStorage.setItem(REPORT_KEY, '1')
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
        <div class="vs-cell"><span class="vs-num">{{ uvText }}</span><span class="vs-label">{{ t('visitStats.uv') }}</span></div>
      </div>
      <div class="vs-card">
        <span class="vs-icon">📈</span>
        <div class="vs-cell"><span class="vs-num">{{ pvText }}</span><span class="vs-label">{{ t('visitStats.pv') }}</span></div>
      </div>
      <div class="vs-card">
        <span class="vs-icon">📅</span>
        <div class="vs-cell"><span class="vs-num">{{ todayUvText }}</span><span class="vs-label">{{ t('visitStats.todayUv') }}</span></div>
      </div>
      <div class="vs-card">
        <span class="vs-icon">⚡</span>
        <div class="vs-cell"><span class="vs-num">{{ todayPvText }}</span><span class="vs-label">{{ t('visitStats.todayPv') }}</span></div>
      </div>
    </div>
    <div class="vs-note">{{ STATIC_MODE ? t('visitStats.staticNote') : t('visitStats.liveNote') }}</div>
  </div>
</template>

<style scoped>
.visit-stats {
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: linear-gradient(135deg, var(--soft-blue), var(--soft));
  border: 1px solid var(--border);
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
  background: var(--card);
  border: 1px solid var(--border);
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