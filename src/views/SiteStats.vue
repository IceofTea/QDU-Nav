<script setup>
/** 本站舆情：独立访客 / 累计访问 + 访问行为图表
 *  数据来自自建计数服务（Deno Deploy + KV），纯自动化采集（访问/打开应用自动上报）。
 *  默认展示与经典版一致的柱状/条形图（含金色序号），另增「一眼看懂」洞察与折线/圆饼切换。 */
import { ref, computed, onMounted } from 'vue'
import { getSiteStats, EMPTY_STATS, isStaticMode } from '../api/siteStats'
import { apps } from '../data/apps'
import KpiCard from '../components/KpiCard.vue'
import LineChart from '../components/LineChart.vue'
import PieChart from '../components/PieChart.vue'
import BarRow from '../components/BarRow.vue'
import InsightPanel from '../components/InsightPanel.vue'
import { useI18n } from '../i18n'

const { t, lang } = useI18n()

const emit = defineEmits(['back'])

const stats = ref(EMPTY_STATS)
const loading = ref(true)
const staticMode = isStaticMode()

/** appId → display name */
const APP_NAMES = computed(() => {
  const m = Object.fromEntries(apps.map((a) => [a.id, lang.value === 'en' ? a.titleEn || a.title : a.title]))
  m.home = t('siteStats.homeApp')
  return m
})
const appName = (id) => APP_NAMES.value[id] || id

const max7 = computed(() => Math.max(1, ...stats.value.week.map((w) => w.pv)))
const maxHour = computed(() => Math.max(1, ...stats.value.hours.map((h) => h.v)))
const maxBar = (arr) => Math.max(1, ...arr.map((x) => x.v))
const pct = (v, m) => Math.round((v / m) * 100)
const sumArr = (arr) => arr.reduce((s, x) => s + x.v, 0)
const pctOf = (arr, v) => Math.round(v / Math.max(1, sumArr(arr)) * 100)
const maxItem = (arr, k) => (arr.length ? arr.reduce((a, b) => (b.v > a.v ? b : a), arr[0]) : null)

/* 图表类型：近 7 天 / 24h 支持 柱状/折线/圆饼（默认柱状）；横条类支持 条形/圆饼 */
const chartTypes = ref({ week: 'bar', hour: 'bar', week2: 'bar', device: 'bar', os: 'bar', ref: 'bar', app: 'bar' })

/* 近 7 天 / 24h 折线（可选） */
const weekLine = computed(() => ({
  labels: stats.value.week.map((w) => w.label),
  series: [{ label: t('siteStats.visitsLabel'), color: '#0891b2', data: stats.value.week.map((w) => w.pv) }]
}))
const hourLine = computed(() => ({
  labels: stats.value.hours.map((h) => h.label),
  series: [{ label: t('siteStats.visitsLabel'), color: '#7c3aed', data: stats.value.hours.map((h) => h.v) }]
}))

/* 自动洞察（一眼看懂数据） */
const insights = computed(() => {
  const arr = []
  const peakHour = maxItem(stats.value.hours, 'label')
  if (peakHour) arr.push(t('siteStats.peakHour', `访问高峰集中在 ${peakHour.label}，占全天 ${pctOf(stats.value.hours, peakHour.v)}%`).replace('{n}', peakHour.label).replace('{pct}', pctOf(stats.value.hours, peakHour.v)))
  const topDay = maxItem(stats.value.weekdays, 'label')
  if (topDay) arr.push(t('siteStats.topDay', `一周中 ${topDay.label} 访问最多（${topDay.v} 次）`).replace('{n}', topDay.label).replace('{v}', topDay.v))
  const topDev = maxItem(stats.value.devices, 'name')
  if (topDev) arr.push(t('siteStats.topDevice', `主力设备是「${topDev.name}」，占 ${pctOf(stats.value.devices, topDev.v)}%`).replace('{n}', topDev.name).replace('{pct}', pctOf(stats.value.devices, topDev.v)))
  const topOs = maxItem(stats.value.os, 'name')
  if (topOs) arr.push(t('siteStats.topOs', `最常见系统：${topOs.name}（${pctOf(stats.value.os, topOs.v)}%）`).replace('{n}', topOs.name).replace('{pct}', pctOf(stats.value.os, topOs.v)))
  const topRef = maxItem(stats.value.refs, 'name')
  if (topRef) arr.push(t('siteStats.topRef', `主要来源：${topRef.name}`).replace('{n}', topRef.name))
  const topApp = stats.value.apps[0]
  if (topApp) arr.push(t('siteStats.topApp', `最常用应用：${appName(topApp.name)}（${topApp.v} 次）`).replace('{n}', appName(topApp.name)).replace('{v}', topApp.v))
  return arr
})

onMounted(async () => {
  stats.value = await getSiteStats()
  loading.value = false
})
</script>

<template>
  <div class="view-top">
    <button class="back-btn" @click="emit('back')">← {{ t('common.back').slice(2) }}</button>
    <div class="view-title">{{ t('siteStats.title') }}</div>
    <div class="view-sub">{{ t('siteStats.subFull') }}</div>
  </div>

  <div v-if="loading" class="skeleton-list">
    <div v-for="i in 3" :key="i" class="skeleton-row"><div class="skeleton" style="width:90%;height:80px"></div></div>
  </div>

  <template v-else>
    <div v-if="staticMode" class="snapshot-tip">
      {{ t('siteStats.snapshotTip', '📌 计数服务免费额度超限暂停中，当前展示 ' + (stats.generatedAt || '最近一次') + ' 的快照数据；服务恢复后将自动回到实时统计').replace('{time}', stats.generatedAt || '最近一次') }}
    </div>
    <div class="kpi-grid">
      <KpiCard icon="👀" :value="stats.uv" :label="t('siteStats.uv')" />
      <KpiCard icon="📈" :value="stats.pv" :label="t('siteStats.pv')" />
      <KpiCard icon="📅" :value="stats.today.uv" :label="t('siteStats.todayUv')" />
      <KpiCard icon="⚡" :value="stats.today.pv" :label="t('siteStats.todayPv')" />
    </div>

    <InsightPanel :items="insights" :title="t('siteStats.insightTitle')" />

    <div class="panel" style="margin-bottom:16px;">
      <div class="section-head" style="align-items:center;margin:0 0 12px;">
        <h3 class="section-title" style="margin:0;"><span class="bar"></span>{{ t('siteStats.weekTrendTitle') }}</h3>
        <div class="chart-type">
          <button class="tab" :class="{ active: chartTypes.week === 'bar' }" @click="chartTypes.week = 'bar'">{{ t('siteStats.chartBar') }}</button>
          <button class="tab" :class="{ active: chartTypes.week === 'line' }" @click="chartTypes.week = 'line'">{{ t('siteStats.chartLine') }}</button>
          <button class="tab" :class="{ active: chartTypes.week === 'pie' }" @click="chartTypes.week = 'pie'">{{ t('siteStats.chartPie') }}</button>
        </div>
      </div>
      <div v-if="stats.week.length">
        <div v-if="chartTypes.week === 'bar'" class="bar-wrap">
          <div v-for="w in stats.week" :key="w.label" class="bar-col">
            <div class="bar-val">{{ w.pv ? w.pv : '' }}</div>
            <div class="bar-box"><i :style="{ height: Math.max(3, pct(w.pv, max7)) + '%' }"></i></div>
            <div class="bar-label">{{ w.label }}</div>
          </div>
        </div>
        <LineChart v-else-if="chartTypes.week === 'line'" :series="weekLine.series" :labels="weekLine.labels" :height="150" :max-width="720" />
        <PieChart v-else :segments="stats.week.map((w) => ({ name: w.label, icon: '', v: w.pv }))" :total="sumArr(stats.week.map((w) => ({ name: w.label, v: w.pv })))" />
      </div>
      <p v-else class="muted" style="text-align:center;padding:10px;">{{ t('siteStats.noData') }}</p>
    </div>

    <div class="duo-grid">
      <div class="panel">
        <div class="section-head" style="align-items:center;margin:0 0 12px;">
          <h3 class="section-title" style="margin:0;"><span class="bar"></span>{{ t('siteStats.hourTitle') }}</h3>
          <div class="chart-type">
            <button class="tab" :class="{ active: chartTypes.hour === 'bar' }" @click="chartTypes.hour = 'bar'">{{ t('siteStats.chartBar') }}</button>
            <button class="tab" :class="{ active: chartTypes.hour === 'line' }" @click="chartTypes.hour = 'line'">{{ t('siteStats.chartLine') }}</button>
            <button class="tab" :class="{ active: chartTypes.hour === 'pie' }" @click="chartTypes.hour = 'pie'">{{ t('siteStats.chartPie') }}</button>
          </div>
        </div>
        <div v-if="stats.hours.length">
          <div v-if="chartTypes.hour === 'bar'" class="mini-bars">
            <div v-for="h in stats.hours" :key="h.label" class="mini-col" :title="h.label + '：' + h.v">
              <div class="mini-bar"><i :style="{ height: Math.max(3, pct(h.v, maxHour)) + '%' }"></i></div>
              <span class="mini-label">{{ (h.label + '').replace('点', '') }}</span>
            </div>
          </div>
          <LineChart v-else-if="chartTypes.hour === 'line'" :series="hourLine.series" :labels="hourLine.labels" :height="150" :max-width="560" />
          <PieChart v-else :segments="stats.hours.map((h) => ({ name: h.label, icon: '', v: h.v }))" :total="sumArr(stats.hours)" />
        </div>
        <p v-else class="muted" style="text-align:center;padding:10px;">{{ t('siteStats.noData') }}</p>
      </div>

      <div class="panel">
        <div class="section-head" style="align-items:center;margin:0 0 12px;">
          <h3 class="section-title" style="margin:0;"><span class="bar"></span>{{ t('siteStats.weekDistTitle') }}</h3>
          <div class="chart-type">
            <button class="tab" :class="{ active: chartTypes.week2 === 'bar' }" @click="chartTypes.week2 = 'bar'">▥</button>
            <button class="tab" :class="{ active: chartTypes.week2 === 'pie' }" @click="chartTypes.week2 = 'pie'">◔</button>
          </div>
        </div>
        <div v-if="stats.weekdays.length">
          <div v-if="chartTypes.week2 === 'bar'" class="row-list">
            <div v-for="d in stats.weekdays" :key="d.label" class="row-item">
              <span class="row-label">{{ d.label }}</span>
              <span class="row-bar"><i :style="{ width: pct(d.v, maxBar(stats.weekdays)) + '%' }"></i></span>
              <span class="row-val">{{ d.v }}</span>
            </div>
          </div>
          <PieChart v-else :segments="stats.weekdays.map((d) => ({ name: d.label, icon: '', v: d.v }))" :total="sumArr(stats.weekdays)" />
        </div>
        <p v-else class="muted" style="text-align:center;padding:10px;">{{ t('siteStats.noData') }}</p>
      </div>
    </div>

    <div class="duo-grid">
      <div class="panel">
        <div class="section-head" style="align-items:center;margin:0 0 12px;">
          <h3 class="section-title" style="margin:0;"><span class="bar"></span>{{ t('siteStats.deviceTitle') }}</h3>
          <div class="chart-type">
            <button class="tab" :class="{ active: chartTypes.device === 'bar' }" @click="chartTypes.device = 'bar'">▥</button>
            <button class="tab" :class="{ active: chartTypes.device === 'pie' }" @click="chartTypes.device = 'pie'">◔</button>
          </div>
        </div>
        <div v-if="stats.devices.length">
          <div v-if="chartTypes.device === 'bar'" class="row-list">
            <div v-for="d in stats.devices" :key="d.name" class="row-item">
              <span class="row-label">{{ d.name }}</span>
              <span class="row-bar purple"><i :style="{ width: pct(d.v, maxBar(stats.devices)) + '%' }"></i></span>
              <span class="row-val">{{ d.v }} · {{ pctOf(stats.devices, d.v) }}%</span>
            </div>
          </div>
          <PieChart v-else :segments="stats.devices.map((d) => ({ name: d.name, icon: '', v: d.v }))" :total="sumArr(stats.devices)" />
        </div>
        <p v-else class="muted" style="text-align:center;padding:10px;">{{ t('siteStats.noData') }}</p>
      </div>

      <div class="panel">
        <div class="section-head" style="align-items:center;margin:0 0 12px;">
          <h3 class="section-title" style="margin:0;"><span class="bar"></span>{{ t('siteStats.osTitle') }}</h3>
          <div class="chart-type">
            <button class="tab" :class="{ active: chartTypes.os === 'bar' }" @click="chartTypes.os = 'bar'">▥</button>
            <button class="tab" :class="{ active: chartTypes.os === 'pie' }" @click="chartTypes.os = 'pie'">◔</button>
          </div>
        </div>
        <div v-if="stats.os.length">
          <div v-if="chartTypes.os === 'bar'" class="row-list">
            <div v-for="d in stats.os" :key="d.name" class="row-item">
              <span class="row-label">{{ d.name }}</span>
              <span class="row-bar orange"><i :style="{ width: pct(d.v, maxBar(stats.os)) + '%' }"></i></span>
              <span class="row-val">{{ d.v }} · {{ pctOf(stats.os, d.v) }}%</span>
            </div>
          </div>
          <PieChart v-else :segments="stats.os.map((d) => ({ name: d.name, icon: '', v: d.v }))" :total="sumArr(stats.os)" />
        </div>
        <p v-else class="muted" style="text-align:center;padding:10px;">{{ t('siteStats.noData') }}</p>
      </div>
    </div>

    <div class="duo-grid">
      <div class="panel">
        <div class="section-head" style="align-items:center;margin:0 0 12px;">
          <h3 class="section-title" style="margin:0;"><span class="bar"></span>{{ t('siteStats.refTitle') }}</h3>
          <div class="chart-type">
            <button class="tab" :class="{ active: chartTypes.ref === 'bar' }" @click="chartTypes.ref = 'bar'">▥</button>
            <button class="tab" :class="{ active: chartTypes.ref === 'pie' }" @click="chartTypes.ref = 'pie'">◔</button>
          </div>
        </div>
        <div v-if="stats.refs.length">
          <div v-if="chartTypes.ref === 'bar'" class="row-list">
            <div v-for="d in stats.refs" :key="d.name" class="row-item">
              <span class="row-label">{{ d.name }}</span>
              <span class="row-bar"><i :style="{ width: pct(d.v, maxBar(stats.refs)) + '%' }"></i></span>
              <span class="row-val">{{ d.v }} · {{ pctOf(stats.refs, d.v) }}%</span>
            </div>
          </div>
          <PieChart v-else :segments="stats.refs.map((d) => ({ name: d.name, icon: '', v: d.v }))" :total="sumArr(stats.refs)" />
        </div>
        <p v-else class="muted" style="text-align:center;padding:10px;">{{ t('siteStats.noData') }}</p>
      </div>

      <div class="panel">
        <div class="section-head" style="align-items:center;margin:0 0 12px;">
          <h3 class="section-title" style="margin:0;"><span class="bar"></span>{{ t('siteStats.hotAppsTitle') }}</h3>
          <div class="chart-type">
            <button class="tab" :class="{ active: chartTypes.app === 'bar' }" @click="chartTypes.app = 'bar'">▥</button>
            <button class="tab" :class="{ active: chartTypes.app === 'pie' }" @click="chartTypes.app = 'pie'">◔</button>
          </div>
        </div>
        <div v-if="stats.apps.length">
          <div v-if="chartTypes.app === 'bar'" class="app-top">
            <div v-for="(a, i) in stats.apps.slice(0, 6)" :key="a.name" class="app-row">
              <span class="app-rank" :class="{ top: i < 3 }">{{ i + 1 }}</span>
              <span class="app-name">{{ appName(a.name) }}</span>
              <span class="app-bar"><i :style="{ width: pct(a.v, maxBar(stats.apps)) + '%' }"></i></span>
              <span class="app-val">{{ a.v }}</span>
            </div>
          </div>
          <PieChart v-else :segments="stats.apps.map((a) => ({ name: appName(a.name), icon: '', v: a.v }))" :total="sumArr(stats.apps)" />
        </div>
        <p v-else class="muted" style="text-align:center;padding:10px;">{{ t('siteStats.noDataOpen') }}</p>
      </div>
    </div>

    <div class="panel">
      <div class="section-head" style="align-items:center;margin:0 0 12px;">
        <h3 class="section-title" style="margin:0;"><span class="bar"></span>{{ t('siteStats.likesTitle') }}</h3>
      </div>
      <div v-if="stats.likes.length">
        <BarRow v-for="(l, i) in stats.likes.slice(0, 8)" :key="l.name" :label="(i + 1) + '. ' + appName(l.name)" :value="l.v" :max="maxBar(stats.likes)" :text="String(l.v) + ' 👍'" color="linear-gradient(90deg,#be185d,#ec4899)" />
      </div>
      <p v-else class="muted" style="text-align:center;padding:10px;">{{ t('siteStats.noLikes') }}</p>
    </div>

    <div class="panel">
      <div class="section-title" style="margin:0 0 10px;"><span class="bar"></span>{{ t('siteStats.aboutStats') }}</div>
      <div class="muted" style="font-size:12px;line-height:1.9;">
        {{ t('siteStats.aboutNote1') }}<br>
        {{ t('siteStats.aboutNote2') }}<br>
        {{ t('siteStats.aboutNote3') }}<br>
        <template v-if="staticMode">{{ t('siteStats.snapshotNote') }}</template>
      </div>
    </div>

    <p class="muted" style="font-size:12px;text-align:center;padding-bottom:6px;">{{ t('siteStats.privacyNote') }}</p>
  </template>
</template>

<style scoped>
.snapshot-tip {
  background: var(--soft-yellow, #fef3c7);
  border: 1px solid #f59e0b;
  color: #92400e;
  border-radius: 10px;
  padding: 8px 12px;
  font-size: 12px;
  line-height: 1.7;
  margin-bottom: 14px;
}
.kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin-bottom: 16px; }
.duo-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 16px; margin-bottom: 16px; }
.chart-type { display: flex; gap: 6px; flex-wrap: wrap; justify-content: flex-end; }
.chart-type .tab { font-size: 11px; padding: 3px 8px; }

/* 近 7 天柱状（经典样式） */
.bar-wrap { display: flex; align-items: flex-end; gap: 8px; height: 150px; }
.bar-col { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; gap: 4px; height: 100%; }
.bar-val { font-size: 10px; color: var(--text-sub); min-height: 13px; }
.bar-box { width: 100%; height: 100px; display: flex; align-items: flex-end; background: var(--bar); border-radius: 7px; overflow: hidden; }
.bar-box i { width: 100%; background: linear-gradient(180deg, #0891b2, #06b6d4); border-radius: 7px; }
.bar-label { font-size: 11px; color: var(--text-sub); }
/* 24h 柱状（经典样式） */
.mini-bars { display: flex; align-items: flex-end; gap: 3px; height: 110px; overflow-x: auto; }
.mini-col { flex: 1; min-width: 14px; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; gap: 3px; height: 100%; }
.mini-bar { width: 100%; height: 90px; display: flex; align-items: flex-end; background: var(--bar); border-radius: 4px; overflow: hidden; }
.mini-bar i { width: 100%; background: linear-gradient(180deg, #7c3aed, #a78bfa); border-radius: 4px; }
.mini-label { font-size: 9px; color: var(--text-sub); }
/* 横条类（经典样式） */
.row-list { display: flex; flex-direction: column; gap: 8px; }
.row-item { display: flex; align-items: center; gap: 8px; }
.row-label { flex: 0 0 64px; font-size: 12px; color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.row-bar { flex: 1; height: 10px; border-radius: 6px; background: var(--bar); overflow: hidden; }
.row-bar i { display: block; height: 100%; border-radius: 6px; background: linear-gradient(90deg, #0891b2, #22d3ee); }
.row-bar.purple i { background: linear-gradient(90deg, #7c3aed, #a78bfa); }
.row-bar.orange i { background: linear-gradient(90deg, #d97706, #f59e0b); }
.row-val { flex: 0 0 auto; font-size: 12px; color: var(--text-sub); white-space: nowrap; }
/* 热门应用（经典样式，金色序号） */
.app-top { display: flex; flex-direction: column; }
.app-row { display: flex; align-items: center; gap: 8px; padding: 6px 0; }
.app-rank { flex: 0 0 20px; text-align: center; font-weight: 800; color: var(--text-sub); font-size: 13px; }
.app-rank.top { color: #eab308; }
.app-name { flex: 0 0 96px; font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.app-bar { flex: 1; height: 10px; border-radius: 6px; background: var(--bar); overflow: hidden; }
.app-bar i { display: block; height: 100%; border-radius: 6px; background: linear-gradient(90deg, #d97706, #f59e0b); }
.app-val { flex: 0 0 auto; font-size: 12px; color: var(--text-sub); }
</style>