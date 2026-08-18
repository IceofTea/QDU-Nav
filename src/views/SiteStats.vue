<script setup>
/** 本站舆情：独立访客 / 累计访问 + 访问行为图表
 *  数据来自自建计数服务（Deno Deploy + KV），纯自动化采集（访问/打开应用自动上报）。 */
import { ref, computed, onMounted } from 'vue'
import { getSiteStats, EMPTY_STATS } from '../api/siteStats'
import { apps } from '../data/apps'
import KpiCard from '../components/KpiCard.vue'

const emit = defineEmits(['back'])

const stats = ref(EMPTY_STATS)
const loading = ref(true)

/** appId → 中文名 */
const APP_NAMES = Object.fromEntries(apps.map((a) => [a.id, a.title]))
APP_NAMES.home = '首页'
const appName = (id) => APP_NAMES[id] || id

const max7 = computed(() => Math.max(1, ...stats.value.week.map((w) => w.pv)))
const maxHour = computed(() => Math.max(1, ...stats.value.hours.map((h) => h.v)))
const maxWd = computed(() => Math.max(1, ...stats.value.weekdays.map((w) => w.v)))
const maxBar = (arr) => Math.max(1, ...arr.map((x) => x.v))
const pct = (v, m) => Math.round((v / m) * 100)

onMounted(async () => {
  stats.value = await getSiteStats()
  loading.value = false
})
</script>

<template>
  <div class="view-top">
    <button class="back-btn" @click="emit('back')">← 返回首页</button>
    <div class="view-title">本站舆情</div>
    <div class="view-sub">本站访问与使用行为统计 · 数据由自建计数服务自动采集</div>
  </div>

  <div v-if="loading" class="skeleton-list">
    <div v-for="i in 3" :key="i" class="skeleton-row"><div class="skeleton" style="width:90%;height:80px"></div></div>
  </div>

  <template v-else>
    <div class="kpi-grid">
      <KpiCard icon="👀" :value="stats.uv" label="独立访客" />
      <KpiCard icon="📈" :value="stats.pv" label="累计访问" />
      <KpiCard icon="📅" :value="stats.today.uv" label="今日访客" />
      <KpiCard icon="⚡" :value="stats.today.pv" label="今日访问" />
    </div>

    <div class="panel" style="margin-bottom:16px;">
      <div class="section-title" style="margin:0 0 12px;"><span class="bar"></span>近 7 天访问趋势</div>
      <div class="bar-wrap" v-if="stats.week.length">
        <div v-for="w in stats.week" :key="w.label" class="bar-col">
          <div class="bar-val">{{ w.pv ? w.pv : '' }}</div>
          <div class="bar-box"><i :style="{ height: pct(w.pv, max7) + '%' }"></i></div>
          <div class="bar-label">{{ w.label }}</div>
        </div>
      </div>
      <p v-else class="muted" style="text-align:center;padding:10px;">暂无访问数据</p>
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:16px;margin-bottom:16px;">
      <div class="panel">
        <div class="section-title" style="margin:0 0 12px;"><span class="bar"></span>访问时段（24 小时）</div>
        <div class="mini-bars" v-if="stats.hours.length">
          <div v-for="h in stats.hours" :key="h.label" class="mini-col" :title="h.label + '：' + h.v">
            <div class="mini-bar"><i :style="{ height: pct(h.v, maxHour) + '%' }"></i></div>
            <span class="mini-label">{{ (h.label + '').replace('点', '') }}</span>
          </div>
        </div>
        <p v-else class="muted" style="text-align:center;padding:10px;">暂无数据</p>
      </div>

      <div class="panel">
        <div class="section-title" style="margin:0 0 12px;"><span class="bar"></span>一周分布</div>
        <div class="row-list" v-if="stats.weekdays.length">
          <div v-for="d in stats.weekdays" :key="d.label" class="row-item">
            <span style="flex:0 0 44px;font-size:12px;">{{ d.label }}</span>
            <span class="row-bar"><i :style="{ width: pct(d.v, maxWd) + '%' }"></i></span>
            <span class="muted" style="flex:0 0 30px;text-align:right;font-size:12px;">{{ d.v }}</span>
          </div>
        </div>
        <p v-else class="muted" style="text-align:center;padding:10px;">暂无数据</p>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:16px;margin-bottom:16px;">
      <div class="panel">
        <div class="section-title" style="margin:0 0 12px;"><span class="bar"></span>设备占比</div>
        <div class="row-list" v-if="stats.devices.length">
          <div v-for="d in stats.devices" :key="d.name" class="row-item">
            <span style="flex:0 0 56px;font-size:12px;">{{ d.name }}</span>
            <span class="row-bar"><i :style="{ width: pct(d.v, maxBar(stats.devices)) + '%' }"></i></span>
            <span class="muted" style="flex:0 0 40px;text-align:right;font-size:12px;">{{ d.v }}</span>
          </div>
        </div>
        <p v-else class="muted" style="text-align:center;padding:10px;">暂无数据</p>
      </div>

      <div class="panel">
        <div class="section-title" style="margin:0 0 12px;"><span class="bar"></span>系统占比</div>
        <div class="row-list" v-if="stats.os.length">
          <div v-for="d in stats.os" :key="d.name" class="row-item">
            <span style="flex:0 0 72px;font-size:12px;">{{ d.name }}</span>
            <span class="row-bar"><i :style="{ width: pct(d.v, maxBar(stats.os)) + '%' }"></i></span>
            <span class="muted" style="flex:0 0 40px;text-align:right;font-size:12px;">{{ d.v }}</span>
          </div>
        </div>
        <p v-else class="muted" style="text-align:center;padding:10px;">暂无数据</p>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:16px;margin-bottom:16px;">
      <div class="panel">
        <div class="section-title" style="margin:0 0 12px;"><span class="bar"></span>来源分布</div>
        <div class="row-list" v-if="stats.refs.length">
          <div v-for="d in stats.refs" :key="d.name" class="row-item">
            <span style="flex:0 0 80px;font-size:12px;">{{ d.name }}</span>
            <span class="row-bar"><i :style="{ width: pct(d.v, maxBar(stats.refs)) + '%' }"></i></span>
            <span class="muted" style="flex:0 0 40px;text-align:right;font-size:12px;">{{ d.v }}</span>
          </div>
        </div>
        <p v-else class="muted" style="text-align:center;padding:10px;">暂无数据</p>
      </div>

      <div class="panel">
        <div class="section-title" style="margin:0 0 12px;"><span class="bar"></span>热门应用 Top</div>
        <div v-if="stats.apps.length" class="app-top">
          <div v-for="(a, i) in stats.apps.slice(0, 6)" :key="a.name" class="app-row">
            <span class="app-rank" :class="{ top: i < 3 }">{{ i + 1 }}</span>
            <span class="app-name">{{ appName(a.name) }}</span>
            <span class="app-bar"><i :style="{ width: pct(a.v, maxBar(stats.apps)) + '%' }"></i></span>
            <span class="muted" style="font-size:12px;flex:0 0 34px;text-align:right;">{{ a.v }}</span>
          </div>
        </div>
        <p v-else class="muted" style="text-align:center;padding:10px;">暂无数据 · 打开应用后会自动记录</p>
      </div>
    </div>

    <p class="muted" style="font-size:12px;text-align:center;padding-bottom:6px;">仅统计访问聚合数据（不含个人身份信息），数据存于本站自建计数服务</p>
  </template>
</template>

<style scoped>
.kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin-bottom: 16px; }
.bar-wrap { display: flex; align-items: flex-end; gap: 8px; height: 150px; }
.bar-col { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; gap: 4px; height: 100%; }
.bar-val { font-size: 10px; color: var(--text-sub); min-height: 13px; }
.bar-box { width: 100%; height: 100px; display: flex; align-items: flex-end; background: var(--bar); border-radius: 7px; overflow: hidden; }
.bar-box i { width: 100%; background: linear-gradient(180deg, #0891b2, #06b6d4); border-radius: 7px; }
.bar-label { font-size: 11px; color: var(--text-sub); }
.mini-bars { display: flex; align-items: flex-end; gap: 3px; height: 110px; overflow-x: auto; }
.mini-col { flex: 1; min-width: 14px; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; gap: 3px; height: 100%; }
.mini-bar { width: 100%; height: 90px; display: flex; align-items: flex-end; background: var(--bar); border-radius: 4px; overflow: hidden; }
.mini-bar i { width: 100%; background: linear-gradient(180deg, #7c3aed, #a78bfa); border-radius: 4px; }
.mini-label { font-size: 9px; color: var(--text-sub); }
.row-list { display: flex; flex-direction: column; gap: 8px; }
.row-item { display: flex; align-items: center; gap: 8px; }
.row-bar { flex: 1; height: 10px; border-radius: 6px; background: var(--bar); overflow: hidden; }
.row-bar i { display: block; height: 100%; border-radius: 6px; background: linear-gradient(90deg, #0891b2, #22d3ee); }
.app-top { display: flex; flex-direction: column; }
.app-row { display: flex; align-items: center; gap: 8px; padding: 6px 0; }
.app-rank { flex: 0 0 20px; text-align: center; font-weight: 800; color: var(--text-sub); font-size: 13px; }
.app-rank.top { color: #eab308; }
.app-name { flex: 0 0 96px; font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.app-bar { flex: 1; height: 10px; border-radius: 6px; background: var(--bar); overflow: hidden; }
.app-bar i { display: block; height: 100%; border-radius: 6px; background: linear-gradient(90deg, #d97706, #f59e0b); }
</style>