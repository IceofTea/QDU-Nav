<script setup>
import { ref, onMounted } from 'vue'
import { apiFetch } from '../api'

const emit = defineEmits(['back'])

const fallbackLinks = [
  { title: '青岛大学2026~2027学年校历', date: '2026-05-01', url: 'https://jwc.qdu.edu.cn/info/1005/6515.htm' },
  { title: '青岛大学2025~2026学年校历', date: '2025-04-22', url: 'https://jwc.qdu.edu.cn/info/1005/5861.htm' },
  { title: '青岛大学教务处官网', date: '', url: 'https://jwc.qdu.edu.cn/' }
]

const calendars = ref(fallbackLinks)
const loading = ref(true)
const refreshing = ref(false)
const online = ref(false)
const fetchedAt = ref('')
const costMs = ref(null)
const cached = ref(false)

const terms = [
  {
    term: '2026-2027 学年 · 第一学期（秋季）',
    items: [
      { name: '本科新生报到', time: '以录取通知书为准（参考：9 月上旬）' },
      { name: '新生入学教育 & 军训', time: '报到后约两周' },
      { name: '秋季学期教学周', time: '约 9 月初 ～ 次年 1 月中旬' },
      { name: '期末考试周', time: '学期末最后两周' },
      { name: '寒假', time: '约 1 月中旬 ～ 2 月底' }
    ]
  },
  {
    term: '2026-2027 学年 · 第二学期（春季）',
    items: [
      { name: '春季学期开学', time: '约 2 月底 / 3 月初' },
      { name: '春季学期教学周', time: '约 3 月初 ～ 7 月初' },
      { name: '校运动会', time: '一般在四月份举行' },
      { name: '期末考试周', time: '学期末' },
      { name: '暑假', time: '约 7 月上旬 ～ 9 月' }
    ]
  }
]

const load = async (force) => {
  refreshing.value = true
  const r = await apiFetch('/calendar' + (force ? '?force=1' : ''))
  if (r && Array.isArray(r.items) && r.items.length) {
    calendars.value = r.items
    online.value = true
    fetchedAt.value = r.fetchedAt
    costMs.value = r.costMs
    cached.value = r.cached
  }
  refreshing.value = false
  loading.value = false
}

onMounted(load)
</script>

<template>
  <div class="view-top">
    <button class="back-btn" @click="emit('back')">← 返回首页</button>
    <div class="view-title">校历</div>
    <div class="view-sub">官方校历实时同步 · 校历正文以图片附件发布，可打开官方页面查看</div>
  </div>

  <div v-if="!loading" class="source-bar">
    <span class="dot" :class="online ? 'live' : 'off'"></span>
    <span>{{ online ? '官方实时数据' : '官方接口暂不可达，展示演示链接' }}</span>
    <span class="sep">·</span>
    <span>来源 jwc.qdu.edu.cn</span>
    <template v-if="online">
      <span class="sep">·</span>
      <span>抓取于 {{ new Date(fetchedAt).toLocaleTimeString('zh-CN', { hour12: false }) }}</span>
      <template v-if="costMs"><span class="sep">·</span><span>耗时 {{ costMs }}ms</span></template>
      <span v-if="cached" class="sep">·</span><span v-if="cached">命中缓存</span>
    </template>
    <button class="refresh-btn" :disabled="refreshing" @click="load(true)">{{ refreshing ? '刷新中…' : '🔄 刷新' }}</button>
  </div>

  <div class="panel" style="margin-bottom:16px;">
    <div class="section-title" style="margin:0 0 14px;"><span class="bar"></span>📎 官方校历</div>
    <div v-if="loading" class="skeleton-list">
      <div v-for="i in 4" :key="i" class="skeleton-row">
        <div class="skeleton" style="width:80px;height:22px;"></div>
        <div class="skeleton" style="flex:1;height:14px;"></div>
      </div>
    </div>
    <div v-else class="cal-list">
      <a v-for="l in calendars" :key="l.url" class="cal-item" :href="l.url" target="_blank" rel="noopener">
        <span class="cal-title">{{ l.title }}</span>
        <span v-if="l.date" class="cal-date">{{ l.date }}</span>
        <span class="cal-go">查看官方页 ↗</span>
      </a>
    </div>
  </div>

  <div v-for="t in terms" :key="t.term" class="panel" style="margin-bottom:16px;">
    <div class="section-title" style="margin:0 0 14px;"><span class="bar"></span>{{ t.term }}</div>
    <div style="position:relative;padding-left:22px;">
      <div
        v-for="(it, i) in t.items"
        :key="it.name"
        style="position:relative;padding-bottom:16px;border-left:2px solid var(--border);padding-left:18px;margin-left:8px;"
        :style="{ borderLeft: i === t.items.length - 1 ? '2px solid transparent' : '2px solid var(--border)' }"
      >
        <span
          style="position:absolute;left:-7px;top:2px;width:12px;height:12px;border-radius:50%;background:var(--primary);"
        ></span>
        <div style="font-weight:600;">{{ it.name }}</div>
        <div class="muted" style="font-size:13px;">{{ it.time }}</div>
      </div>
    </div>
  </div>

  <div class="panel" style="background:var(--notice-bg);border-color:var(--notice-border);">
    <div style="font-weight:700;color:var(--notice-text);">💡 提示</div>
    <div class="muted" style="font-size:13px;margin-top:6px;line-height:1.8;">
      时间线为社区按往年规律整理，仅供参考；官方校历以图片/附件形式发布，请打开上方「官方校历」对应条目，在教务处页面查看并下载校历原图（附件下载需输入验证码）。具体教学周与放假安排请以教务处官网为准。
    </div>
  </div>
</template>