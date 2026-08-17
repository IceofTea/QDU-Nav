<script setup>
import { ref, computed, onMounted } from 'vue'

const emit = defineEmits(['back'])

const loading = ref(true)
const status = ref('loading')
const data = ref(null)
const errMsg = ref('')
/** 当前悬停/点选的趋势柱子下标（-1 表示无） */
const activeTrend = ref(-1)

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
const maxTrend = computed(() => maxCount(data.value?.weekTrend || [], 'count') || 1)
const topicTotal = computed(() => (data.value?.topics || []).reduce((s, t) => s + t.count, 0) || 1)
const weekSum = computed(() => (data.value?.weekTrend || []).reduce((s, p) => s + p.count, 0))
const topTopic = computed(() => data.value?.topics?.[0] || null)
const topKw = computed(() => data.value?.keywords?.[0] || null)

/** 自动生成的文字洞察（数据驱动，无数据时自动降级为空） */
const insights = computed(() => {
  const list = []
  const d = data.value
  if (!d) return list
  const top = d.topThreads?.[0]
  if (top) list.push(`吧内最热帖《${top.title}》已有 ${top.replies} 回复，是当前社区关注度最高的讨论`)
  if (topTopic.value) list.push(`讨论最集中的话题是「${topTopic.value.name}」（${topTopic.value.count} 条），学生最关心这类议题`)
  if (topKw.value) list.push(`高频关键词「${topKw.value.word}」在标题中出现 ${topKw.value.count} 次`)
  if (d.weekTrend?.length) list.push(`近 14 天共发帖 ${weekSum.value} 条，日均约 ${Math.round(weekSum.value / 14)} 条`)
  return list
})
</script>

<template>
  <div class="view-top">
    <button class="back-btn" @click="emit('back')">← 返回首页</button>
    <div class="view-title">贴吧舆情</div>
    <div class="view-sub">青岛大学吧热帖与话题舆情分析（数据由定时任务尽力抓取）</div>
  </div>

  <div class="panel" style="margin-bottom:16px;">
    <a class="tieba-enter" :href="(data && data.barUrl) || 'https://tieba.baidu.com/f?kw=%E9%9D%92%E5%B2%9B%E5%A4%A7%E5%AD%A6'" target="_blank" rel="noopener">
      <span class="tieba-logo">吧</span>
      <span class="tieba-main">
        <b>青岛大学吧 · 百度贴吧</b>
        <span class="muted">学生社区交流 · 学习 / 生活 / 升学 / 求助</span>
      </span>
      <span class="site-go">↗</span>
    </a>
    <p class="muted" style="font-size:12px;margin:10px 2px 0;">
      舆情数据来自贴吧公开列表页（标题 / 回复 / 发帖时间），仅做轻量聚合，版权归发帖用户与百度贴吧所有。
    </p>
  </div>

  <div v-if="loading" class="panel" style="text-align:center;color:var(--muted);padding:40px 16px;">
    正在加载贴吧数据…
  </div>

  <div v-else-if="status === 'unavailable'" class="panel" style="text-align:center;padding:32px 16px;">
    <div style="font-size:40px;margin-bottom:10px;">📭</div>
    <div style="font-weight:700;margin-bottom:6px;">贴吧数据暂未抓取成功</div>
    <p class="muted" style="font-size:13px;line-height:1.7;max-width:460px;margin:0 auto 14px;">
      百度贴吧反爬较严（常返回 403 / 验证码），云端定时任务会在每次执行时重试；
      抓取成功后此处会自动展示热帖榜、关键词与话题分布。你仍可先通过上方入口直接逛贴吧。
    </p>
    <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;">
      <a class="btn accent" :href="'https://tieba.baidu.com/f?kw=%E9%9D%92%E5%B2%9B%E5%A4%A7%E5%AD%A6'" target="_blank" rel="noopener">打开青岛大学吧</a>
      <button class="btn ghost" @click="load">🔄 重试加载</button>
    </div>
    <p v-if="errMsg" class="muted" style="font-size:11px;margin-top:10px;">{{ errMsg }}</p>
  </div>

  <template v-else-if="data">
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:16px;">
      <div class="panel" style="margin:0;">
        <div class="muted" style="font-size:12px;">抓取帖数</div>
        <div style="font-size:22px;font-weight:800;margin-top:4px;">{{ data.total }}</div>
        <div class="muted" style="font-size:12px;">{{ data.pages }} 页列表</div>
      </div>
      <div class="panel" style="margin:0;">
        <div class="muted" style="font-size:12px;">最热帖回复</div>
        <div style="font-size:22px;font-weight:800;margin-top:4px;">{{ maxReplies }}</div>
        <div class="muted" style="font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">《{{ (data.topThreads[0] || {}).title || '—' }}》</div>
      </div>
      <div class="panel" style="margin:0;">
        <div class="muted" style="font-size:12px;">话题覆盖</div>
        <div style="font-size:22px;font-weight:800;margin-top:4px;">{{ data.topics.length }}</div>
        <div class="muted" style="font-size:12px;">{{ data.keywords.length }} 个高频关键词</div>
      </div>
      <div class="panel" style="margin:0;">
        <div class="muted" style="font-size:12px;">近 14 天发帖</div>
        <div style="font-size:22px;font-weight:800;margin-top:4px;">{{ weekSum }}</div>
        <div class="muted" style="font-size:12px;">日均约 {{ Math.round(weekSum / 14) }} 条</div>
      </div>
    </div>
    <div v-if="insights.length" class="panel" style="margin-bottom:16px;background:var(--soft-blue);border-color:#bcd6f5;">
      <div class="section-title" style="margin:0 0 10px;"><span class="bar"></span>一眼看懂这些数据</div>
      <ul style="margin:0;padding-left:18px;font-size:13px;line-height:2;color:var(--text);">
        <li v-for="s in insights" :key="s">{{ s }}</li>
      </ul>
    </div>

    <div class="panel" style="margin-bottom:16px;">
      <div class="section-title" style="margin:0 0 12px;"><span class="bar"></span>🔥 热帖榜（按回复数 Top 10）</div>
      <a v-for="(t, i) in data.topThreads" :key="t.url || i" class="hot-row" :href="t.url" target="_blank" rel="noopener">
        <span class="hot-rank" :class="{ top: i < 3 }">{{ i + 1 }}</span>
        <span class="hot-main">
          <span class="hot-title">{{ t.title }}</span>
          <span class="hot-sub muted">{{ t.author || '匿名' }} · {{ t.date }}</span>
        </span>
        <span class="hot-replybar"><i :style="{ width: hotBar(t.replies) + '%' }"></i></span>
        <span class="hot-meta">{{ t.replies }} 回复</span>
      </a>
      <p class="muted" style="font-size:12px;margin:10px 2px 0;">抓取 {{ data.total }} 帖（{{ data.pages }} 页，覆盖最近发帖），更新于 {{ (data.updatedAt || '').slice(0, 10) }}</p>
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:16px;margin-bottom:16px;">
      <div class="panel">
        <div class="section-title" style="margin:0 0 12px;"><span class="bar"></span>🏷️ 关键词热度</div>
        <div class="kw-cloud" v-if="data.keywords.length">
          <span v-for="k in data.keywords" :key="k.word" class="kw-tag"
            :style="{ fontSize: (12 + Math.round((k.count / maxKw) * 14)) + 'px', opacity: 0.65 + (k.count / maxKw) * 0.35 }">
            {{ k.word }}<em>{{ k.count }}</em>
          </span>
        </div>
        <p v-else class="muted" style="font-size:13px;">暂无关键词命中。</p>
        <p class="muted" style="font-size:12px;margin-top:10px;">字号越大出现越频繁，点进热帖能对上社区最近在聊什么。</p>
      </div>

      <div class="panel">
        <div class="section-title" style="margin:0 0 12px;"><span class="bar"></span>🗂️ 话题分布</div>
        <div class="topic-row" v-for="t in data.topics" :key="t.name">
          <span class="kw-word">{{ TOPIC_ICONS[t.name] || '·' }} {{ t.name }}</span>
          <span class="kw-bar"><i :style="{ width: (t.count / maxCount(data.topics) * 100) + '%' }"></i></span>
          <span class="kw-count muted">{{ Math.round((t.count / topicTotal) * 100) }}%</span>
        </div>
        <p v-if="!data.topics.length" class="muted" style="font-size:13px;">暂无话题归类。</p>
      </div>
    </div>

    <div class="panel">
      <div class="section-title" style="margin:0 0 12px;"><span class="bar"></span>📈 近 14 天发帖趋势（日均 {{ Math.round(weekSum / 14) }} 条）</div>
<div class="trend" v-if="data.weekTrend && data.weekTrend.length">
        <div v-for="(p, i) in data.weekTrend" :key="p.label" class="trend-col"
          :title="p.label + '：' + p.count + ' 帖'" :class="{ active: activeTrend === i }"
          @mouseenter="activeTrend = i" @mouseleave="activeTrend = -1" @click="activeTrend = activeTrend === i ? -1 : i">
          <div class="trend-tip" :class="{ show: activeTrend === i }">{{ p.count }} 帖</div>
          <div class="trend-bar"><i :style="{ height: (p.count / maxTrend * 100 || 0) + '%' }"></i></div>
          <span class="trend-label muted">{{ p.label }}</span>
        </div>
      </div>
      <p v-else class="muted" style="font-size:13px;">暂无趋势数据。</p>
      <p class="muted" style="font-size:12px;margin-top:6px;">💡 鼠标悬停或点击柱子可查看当天发帖数；窄屏可左右滑动。</p>
    </div>
  </template>
</template>

<style scoped>
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
  color: #2f5fb8;
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
  color: var(--muted);
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
.kw-row,
.topic-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 0;
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
  color: var(--muted);
  font-size: 11px;
  font-weight: 500;
}
.kw-word {
  flex: 0 0 96px;
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.kw-bar {
  flex: 1;
  height: 10px;
  border-radius: 6px;
  background: var(--border);
  overflow: hidden;
}
.kw-bar i {
  display: block;
  height: 100%;
  border-radius: 6px;
  background: linear-gradient(90deg, #1677ff, #69b1ff);
}
.kw-count {
  flex: 0 0 34px;
  font-size: 12px;
  text-align: right;
}
.trend {
  display: flex;
  align-items: flex-end;
  gap: 6px;
  height: 150px;
  overflow-x: auto;
  padding-bottom: 4px;
  -webkit-overflow-scrolling: touch;
}
.trend-col {
  flex: 1;
  min-width: 34px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  gap: 3px;
  height: 100%;
  cursor: pointer;
}
.trend-col.active .trend-bar i {
  background: linear-gradient(180deg, #f59e0b, #fbbf24);
}
.trend-tip {
  font-size: 11px;
  font-weight: 700;
  color: #92400e;
  background: #fef3c7;
  border: 1px solid #f5d79a;
  border-radius: 6px;
  padding: 1px 7px;
  opacity: 0;
  transition: opacity 0.15s;
  line-height: 1.6;
  white-space: nowrap;
}
.trend-tip.show {
  opacity: 1;
}
.trend-bar {
  flex: 1;
  width: 100%;
  display: flex;
  align-items: flex-end;
}
.trend-bar i {
  display: block;
  width: 70%;
  margin: 0 auto;
  border-radius: 5px 5px 0 0;
  background: linear-gradient(180deg, #1677ff, #69b1ff);
}
.trend-label {
  font-size: 11px;
  transform: scale(0.85);
  transform-origin: center;
}
</style>
