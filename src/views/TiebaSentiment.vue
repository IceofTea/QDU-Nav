<script setup>
import { ref, onMounted } from 'vue'

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
    <div class="panel" style="margin-bottom:16px;">
      <div class="section-title" style="margin:0 0 12px;"><span class="bar"></span>🔥 热帖榜（按回复数 Top 10）</div>
      <a v-for="(t, i) in data.topThreads" :key="t.url || i" class="hot-row" :href="t.url" target="_blank" rel="noopener">
        <span class="hot-rank" :class="{ top: i < 3 }">{{ i + 1 }}</span>
        <span class="hot-title">{{ t.title }}</span>
        <span class="hot-meta muted">{{ t.replies }} 回复 · {{ t.author || '匿名' }} · {{ t.date }}</span>
      </a>
      <p class="muted" style="font-size:12px;margin:10px 2px 0;">抓取 {{ data.total }} 帖（{{ data.pages }} 页，覆盖最近发帖），更新于 {{ (data.updatedAt || '').slice(0, 10) }}</p>
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:16px;margin-bottom:16px;">
      <div class="panel">
        <div class="section-title" style="margin:0 0 12px;"><span class="bar"></span>🏷️ 关键词热度</div>
        <div class="kw-row" v-for="k in data.keywords" :key="k.word">
          <span class="kw-word">{{ k.word }}</span>
          <span class="kw-bar"><i :style="{ width: (k.count / maxCount(data.keywords) * 100) + '%' }"></i></span>
          <span class="kw-count muted">{{ k.count }}</span>
        </div>
        <p v-if="!data.keywords.length" class="muted" style="font-size:13px;">暂无关键词命中。</p>
      </div>

      <div class="panel">
        <div class="section-title" style="margin:0 0 12px;"><span class="bar"></span>🗂️ 话题分布</div>
        <div class="topic-row" v-for="t in data.topics" :key="t.name">
          <span class="kw-word">{{ TOPIC_ICONS[t.name] || '·' }} {{ t.name }}</span>
          <span class="kw-bar"><i :style="{ width: (t.count / maxCount(data.topics) * 100) + '%' }"></i></span>
          <span class="kw-count muted">{{ t.count }}</span>
        </div>
        <p v-if="!data.topics.length" class="muted" style="font-size:13px;">暂无话题归类。</p>
      </div>
    </div>

    <div class="panel">
      <div class="section-title" style="margin:0 0 12px;"><span class="bar"></span>📈 近 14 天发帖趋势</div>
      <div class="trend" v-if="data.weekTrend && data.weekTrend.length">
        <div v-for="p in data.weekTrend" :key="p.label" class="trend-col" :title="p.label + '：' + p.count + ' 帖'">
          <div class="trend-bar"><i :style="{ height: (p.count / maxCount(data.weekTrend) * 100 || 0) + '%' }"></i></div>
          <span class="trend-label muted">{{ p.label }}</span>
        </div>
      </div>
      <p v-else class="muted" style="font-size:13px;">暂无趋势数据。</p>
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
  background: #fff;
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
  align-items: baseline;
  gap: 10px;
  padding: 9px 2px;
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
.hot-title {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 14px;
}
.hot-meta {
  font-size: 12px;
  flex: 0 0 auto;
  max-width: 40%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.kw-row,
.topic-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 0;
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
  height: 140px;
}
.trend-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
  height: 100%;
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
