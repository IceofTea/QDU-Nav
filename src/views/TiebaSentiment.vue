<script setup>
import { ref, computed, onMounted } from 'vue'
import KpiCard from '../components/KpiCard.vue'
import InsightPanel from '../components/InsightPanel.vue'
import BarRow from '../components/BarRow.vue'
import LineChart from '../components/LineChart.vue'
import { useI18n } from '../i18n'

const { t, lang } = useI18n()

const emit = defineEmits(['back'])

const loading = ref(true)
const status = ref('loading')
const data = ref(null)
const errMsg = ref('')

const TOPIC_ICONS = {
  考研升学: '🎓',
  校园生活: '🏠',
  学习考试: '📖',
  校园事务: '🗂️',
  就业实习: '💼',
  吐槽求助: '💬'
}

async function load() {
  loading.value = true
  status.value = 'loading'
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 8000)
    const res = await fetch(import.meta.env.BASE_URL + 'data/tieba_stats.json', { signal: ctrl.signal })
    clearTimeout(timer)
    if (!res.ok) throw new Error('HTTP ' + res.status)
    const d = await res.json()
    if (!d || d.status !== 'ok' || !Array.isArray(d.topThreads) || !d.topThreads.length) {
      status.value = 'unavailable'
    } else {
      data.value = d
      status.value = 'ok'
    }
  } catch (e) {
    errMsg.value = e.message
    status.value = 'unavailable'
  } finally {
    loading.value = false
  }
}

onMounted(load)

function maxCount(arr, key = 'count') {
  return arr.reduce((m, x) => Math.max(m, x[key]), 0)
}

/* ---- ok 态图表化所需的派生数据 ---- */
const maxReplies = computed(() => data.value?.topThreads?.[0]?.replies || 1)
const hotBar = (r) => Math.round((r / maxReplies.value) * 100)
const maxKw = computed(() => maxCount(data.value?.keywords || [], 'count') || 1)
const maxTopic = computed(() => maxCount(data.value?.topics || [], 'count') || 1)
const topicTotal = computed(() => (data.value?.topics || []).reduce((sum, tp) => sum + tp.count, 0) || 1)
const weekSum = computed(() => (data.value?.weekTrend || []).reduce((s, p) => s + p.count, 0))
const topTopic = computed(() => data.value?.topics?.[0] || null)
/** 近 14 天趋势：默认柱状（hover 显示当天帖数），可切换折线 */
const trendChartType = ref('bar')
const trendHover = ref(-1)
const maxTrend = computed(() => maxCount(data.value?.weekTrend || [], 'count') || 1)
const trendLine = computed(() => ({
  labels: (data.value?.weekTrend || []).map((p) => p.label),
  series: [{ label: t('tiebaSentiment.posts'), color: '#0891b2', data: (data.value?.weekTrend || []).map((p) => p.count) }]
}))
const topKw = computed(() => data.value?.keywords?.[0] || null)

/** 自动生成的文字洞察（数据驱动，无数据时自动降级为空） */
const insights = computed(() => {
  const list = []
  const d = data.value
  if (!d) return list
  const top = d.topThreads?.[0]
  if (top) list.push(lang.value === 'en' ? `Hottest post "${top.title}" has ${top.replies} replies — most discussed in the community` : `吧内最热帖《${top.title}》已有 ${top.replies} 回复，是当前社区关注度最高的讨论`)
  if (topTopic.value) list.push(lang.value === 'en' ? `Top topic: "${topTopic.value.name}" (${topTopic.value.count} posts) — students care most about this` : `讨论最集中的话题是「${topTopic.value.name}」（${topTopic.value.count} 条），学生最关心这类议题`)
  if (topKw.value) list.push(lang.value === 'en' ? `Keyword "${topKw.value.word}" appears ${topKw.value.count} times in titles` : `高频关键词「${topKw.value.word}」在标题中出现 ${topKw.value.count} 次`)
  if (d.weekTrend?.length) list.push(lang.value === 'en' ? `${weekSum.value} posts in 14 days, avg ~${Math.round(weekSum.value / 14)}/day` : `近 14 天共发帖 ${weekSum.value} 条，日均约 ${Math.round(weekSum.value / 14)} 条`)
  return list
})
</script>

<template>
  <div class="view-top">
    <button class="back-btn" @click="emit('back')">{{ t('common.back') }}</button>
    <div class="view-title">{{ t('tiebaSentiment.title') }}</div>
    <div class="view-sub">{{ t('tiebaSentiment.subFull') }}</div>
  </div>

  <div class="panel" style="margin-bottom:16px;">
    <a class="tieba-enter" :href="(data && data.barUrl) || 'https://tieba.baidu.com/f?kw=%E9%9D%92%E5%B2%9B%E5%A4%A7%E5%AD%A6'" target="_blank" rel="noopener">
      <span class="tieba-logo">吧</span>
        <span class="tieba-main">
        <b>{{ t('tiebaSentiment.tiebaName') }}</b>
        <span class="muted">{{ t('tiebaSentiment.tiebaDesc') }}</span>
      </span>
      <span class="site-go">↗</span>
    </a>
    <p class="muted" style="font-size:12px;margin:10px 2px 0;">
      {{ t('tiebaSentiment.tiebaNote') }}
    </p>
  </div>

  <div v-if="loading" class="panel" style="text-align:center;color:var(--text-sub);padding:40px 16px;">
    {{ t('tiebaSentiment.loadingData') }}
  </div>

  <div v-else-if="status === 'unavailable'" class="panel" style="text-align:center;padding:32px 16px;">
    <div style="font-size:40px;margin-bottom:10px;">📭</div>
    <div style="font-weight:700;margin-bottom:6px;">{{ t('tiebaSentiment.unavailableTitle') }}</div>
    <p class="muted" style="font-size:13px;line-height:1.7;max-width:460px;margin:0 auto 14px;">
      {{ t('tiebaSentiment.unavailableDesc') }}
    </p>
    <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;">
      <a class="btn accent" :href="'https://tieba.baidu.com/f?kw=%E9%9D%92%E5%B2%9B%E5%A4%A7%E5%AD%A6'" target="_blank" rel="noopener">{{ t('tiebaSentiment.openTieba') }}</a>
      <button class="btn ghost" @click="load">{{ t('tiebaSentiment.retryLoad') }}</button>
    </div>
    <p v-if="errMsg" class="muted" style="font-size:11px;margin-top:10px;">{{ errMsg }}</p>
  </div>

  <template v-else-if="data">
    <div class="kpi-grid">
      <KpiCard :value="data.total" :label="t('tiebaSentiment.kpiPostCount')" :sub="data.pages + ' ' + t('tiebaSentiment.pagesUnit') + t('tiebaSentiment.postCount')" />
      <KpiCard :value="maxReplies" :label="t('tiebaSentiment.kpiHotReplies')" :sub="'《' + ((data.topThreads[0] || {}).title || '—') + '》'" />
      <KpiCard :value="data.topics.length" :label="t('tiebaSentiment.kpiTopicCover')" :sub="data.keywords.length + ' ' + t('tiebaSentiment.postCount')" />
      <KpiCard :value="weekSum" :label="t('tiebaSentiment.kpiRecentPosts')" :sub="t('tiebaSentiment.postsPerDay') + ' ' + Math.round(weekSum / 14)" />
    </div>
    <InsightPanel :items="insights" />

    <div class="panel" style="margin-bottom:16px;">
      <div class="section-title" style="margin:0 0 12px;"><span class="bar"></span>{{ t('tiebaSentiment.hotPostsTitle') }}</div>
      <a v-for="(thr, i) in data.topThreads" :key="thr.url || i" class="hot-row" :href="thr.url" target="_blank" rel="noopener">
        <span class="hot-rank" :class="{ top: i < 3 }">{{ i + 1 }}</span>
        <span class="hot-main">
          <span class="hot-title">{{ thr.title }}</span>
          <span class="hot-sub muted">{{ thr.author || t('tiebaSentiment.anonymous') }} · {{ thr.date }}</span>
        </span>
        <span class="hot-replybar"><i :style="{ width: hotBar(thr.replies) + '%' }"></i></span>
        <span class="hot-meta">{{ t('tiebaSentiment.replies') }}</span>
      </a>
      <p class="muted" style="font-size:12px;margin:10px 2px 0;">{{ t('tiebaSentiment.postsCount') }} {{ data.total }} {{ t('tiebaSentiment.postCount') }}（{{ data.pages }} {{ t('tiebaSentiment.pagesUnit') }}，覆盖最近发帖），更新于 {{ (data.updatedAt || '').slice(0, 10) }}</p>
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:16px;margin-bottom:16px;">
      <div class="panel">
        <div class="section-title" style="margin:0 0 12px;"><span class="bar"></span>{{ t('tiebaSentiment.keywordTitle') }}</div>
        <div class="kw-cloud" v-if="data.keywords.length">
          <span v-for="k in data.keywords" :key="k.word" class="kw-tag"
            :style="{ fontSize: (12 + Math.round((k.count / maxKw) * 14)) + 'px', opacity: 0.65 + (k.count / maxKw) * 0.35 }">
            {{ k.word }}<em>{{ k.count }}</em>
          </span>
        </div>
        <p v-else class="muted" style="font-size:13px;">{{ t('tiebaSentiment.noKeyword') }}</p>
        <p class="muted" style="font-size:12px;margin-top:10px;">{{ t('tiebaSentiment.keywordNote') }}</p>
      </div>

      <div class="panel">
        <div class="section-title" style="margin:0 0 12px;"><span class="bar"></span>{{ t('tiebaSentiment.topicTitle') }}</div>
        <div v-if="data.topics.length">
          <BarRow v-for="t in data.topics" :key="t.name" :label="(TOPIC_ICONS[t.name] || '·') + ' ' + t.name" :value="t.count" :max="maxTopic" :text="Math.round((t.count / topicTotal) * 100) + '%'" color="linear-gradient(90deg,#0d9488,#2dd4bf)" />
        </div>
        <p v-if="!data.topics.length" class="muted" style="font-size:13px;">{{ t('tiebaSentiment.noTopic') }}</p>
      </div>
    </div>

    <div class="panel">
      <div class="section-head" style="align-items:center;margin:0 0 12px;">
        <h3 class="section-title" style="margin:0;"><span class="bar"></span>{{ t('tiebaSentiment.trendTitle', { n: Math.round(weekSum / 14) }) }}</h3>
        <div class="chart-type">
          <button class="tab" :class="{ active: trendChartType === 'bar' }" @click="trendChartType = 'bar'">{{ t('siteStats.chartBar') }}</button>
          <button class="tab" :class="{ active: trendChartType === 'line' }" @click="trendChartType = 'line'">{{ t('siteStats.chartLine') }}</button>
        </div>
      </div>
      <template v-if="data.weekTrend && data.weekTrend.length">
        <div v-if="trendChartType === 'bar'" class="mini-bar-chart">
          <div v-for="(p, i) in data.weekTrend" :key="p.label" class="mb-col" @mouseenter="trendHover = i" @mouseleave="trendHover = -1">
            <div class="mb-tip" :class="{ show: trendHover === i }">{{ p.count }} {{ t('tiebaSentiment.postsUnit') }}</div>
            <div class="mb-bar" :class="{ hi: trendHover === i }"><i :style="{ height: Math.max(3, Math.round(p.count / maxTrend * 100)) + '%' }"></i></div>
            <span class="mb-label">{{ p.label }}</span>
          </div>
        </div>
        <LineChart v-else :series="trendLine.series" :labels="trendLine.labels" :height="150" :max-width="640" />
      </template>
      <p v-else class="muted" style="font-size:13px;">{{ t('tiebaSentiment.noTrend') }}</p>
      <p class="muted" style="font-size:12px;margin-top:6px;">{{ t('tiebaSentiment.trendNote') }}</p>
    </div>
  </template>
</template>

<style scoped>
.kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin-bottom: 16px; }
.tieba-enter {
  display: flex;
  align-items: center;
  gap: 12px;
  background: linear-gradient(135deg, #4b6cb7, #2f5fb8);
  color: #fff;
  border-radius: 14px;
  padding: 14px;
}
.tieba-enter:hover {
  opacity: 0.92;
}
.tieba-logo {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  background: var(--card);
  color: var(--primary);
  font-weight: 800;
  font-size: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
}
.tieba-main {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
}
.tieba-main .muted {
  color: rgba(255, 255, 255, 0.8);
}
.tieba-enter .site-go {
  font-size: 18px;
}
.hot-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 2px;
  border-bottom: 1px dashed var(--border);
  color: inherit;
  text-decoration: none;
}
.hot-row:last-child {
  border-bottom: none;
}
.hot-rank {
  font-weight: 800;
  color: var(--text-sub);
  min-width: 20px;
  text-align: center;
}
.hot-rank.top {
  color: #eab308;
}
.hot-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.hot-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 14px;
}
.hot-sub {
  font-size: 11px;
}
.hot-replybar {
  flex: 0 0 90px;
  height: 6px;
  border-radius: 4px;
  background: var(--border);
  overflow: hidden;
}
.hot-replybar i {
  display: block;
  height: 100%;
  border-radius: 4px;
  background: linear-gradient(90deg, #eab308, #f59e0b);
}
.hot-meta {
  font-size: 12px;
  flex: 0 0 auto;
  color: var(--text);
  font-weight: 700;
}
.kw-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  padding: 6px 0;
  line-height: 1.7;
}
.kw-tag {
  color: var(--text);
  display: inline-flex;
  align-items: baseline;
  gap: 3px;
  font-weight: 600;
}
.kw-tag em {
  font-style: normal;
  color: var(--text-sub);
  font-size: 11px;
  font-weight: 500;
}
.chart-type { display: flex; gap: 6px; }
.chart-type .tab { font-size: 11px; }
.mini-bar-chart { display: flex; align-items: flex-end; gap: 6px; height: 150px; overflow-x: auto; }
.mb-col { flex: 1; min-width: 34px; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; gap: 3px; height: 100%; cursor: pointer; position: relative; }
.mb-tip {
  position: absolute;
  top: 0;
  font-size: 11px;
  font-weight: 700;
  color: var(--notice-text);
  background: var(--notice-bg);
  border: 1px solid var(--notice-border);
  border-radius: 6px;
  padding: 1px 7px;
  opacity: 0;
  transition: opacity 0.15s;
  line-height: 1.6;
  white-space: nowrap;
  pointer-events: none;
}
.mb-tip.show { opacity: 1; }
.mb-bar { width: 100%; max-width: 34px; height: 118px; display: flex; align-items: flex-end; background: var(--bar); border-radius: 6px 6px 0 0; overflow: hidden; transition: background 0.15s; }
.mb-bar i { width: 100%; background: linear-gradient(180deg, #22d3ee, #0891b2); border-radius: 6px 6px 0 0; transition: background 0.15s; }
.mb-bar.hi { background: rgba(245, 158, 11, 0.25); }
.mb-bar.hi i { background: linear-gradient(180deg, #fbbf24, #f59e0b); }
.mb-label { font-size: 9px; color: var(--text-sub); }
</style>
