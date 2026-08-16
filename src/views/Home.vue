<script setup>
import { ref, computed } from 'vue'
import { apps, appGroups, campusStats } from '../data/apps'
import { campuses } from '../data/campus'

const emit = defineEmits(['open'])

const keyword = ref('')
const showAll = ref(false)

function greeting() {
  const h = new Date().getHours()
  if (h < 6) return '夜深了，早点休息'
  if (h < 12) return '早上好，青大人'
  if (h < 14) return '中午好，青大人'
  if (h < 18) return '下午好，青大人'
  return '晚上好，青大人'
}

const filtered = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  if (!kw) return apps
  return apps.filter((a) => (a.title + a.desc).toLowerCase().includes(kw))
})

const grouped = computed(() => {
  return appGroups
    .map((g) => ({ group: g, items: filtered.value.filter((a) => a.group === g) }))
    .filter((x) => x.items.length)
})
</script>

<template>
  <div class="page home">
    <section class="hero">
      <h2 class="hero-title">{{ greeting() }}</h2>
      <p class="hero-sub">欢迎回到 QDU 校园导航，聚合你所需的校园服务</p>
      <div class="search-bar">
        <span class="search-icon">🔍</span>
        <input v-model="keyword" class="search-input" placeholder="搜一搜你想要的应用" />
      </div>
    </section>

    <section class="section">
      <div class="wiki-card">
        <div class="wiki-main">
          <div class="wiki-emoji">📚</div>
          <div>
            <div class="wiki-title">青大 Wiki · 学习资料社区</div>
            <div class="wiki-desc">课程笔记、考研复试经验、校园攻略文档，与本站配套的维基仓库，欢迎贡献</div>
          </div>
        </div>
        <div class="wiki-links">
          <a class="wiki-link" href="https://github.com/IceofTea/QDU-Wiki" target="_blank" rel="noopener">GitHub ↗</a>
          <a class="wiki-link" href="https://gitee.com/iceoftea/QDU-Wiki" target="_blank" rel="noopener">Gitee ↗</a>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="section-head">
        <h3 class="section-title">公开应用</h3>
        <span class="section-sub">高频应用一键直达</span>
      </div>
      <div v-if="filtered.length" class="tile-grid">
        <button
          v-for="a in filtered"
          :key="a.id"
          class="service-tile"
          @click="emit('open', a.id)"
        >
          <span class="tile-icon" :style="{ background: a.color + '1a', color: a.color }">{{ a.icon }}</span>
          <span class="tile-body">
            <span class="tile-title">{{ a.title }}</span>
            <span class="tile-desc">{{ a.desc }}</span>
          </span>
        </button>
      </div>
      <div v-else class="empty">没有找到相关应用，换个关键词试试</div>
    </section>

    <section class="section">
      <div class="section-head">
        <h3 class="section-title">应用分类</h3>
        <button class="section-link" @click="showAll = !showAll">{{ showAll ? '收起分类 ▲' : '查看全部分类 ▼' }}</button>
      </div>
      <div v-if="showAll" class="group-list">
        <div v-for="g in grouped" :key="g.group" class="group-block">
          <h4 class="group-name">{{ g.group }}</h4>
          <div class="mini-grid">
            <button v-for="a in g.items" :key="a.id" class="mini-tile" @click="emit('open', a.id)">
              <span class="mini-icon" :style="{ background: a.color + '1a', color: a.color }">{{ a.icon }}</span>
              <span class="mini-title">{{ a.title }}</span>
            </button>
          </div>
        </div>
      </div>
      <div v-else class="hint">点击「查看全部分类」按学习、生活、游戏等分组浏览全部应用</div>
    </section>

    <section class="section stats">
      <div class="stat" v-for="s in [
        { v: campusStats.campuses, l: '大校区' },
        { v: campusStats.colleges, l: '个学院 + 医学部' },
        { v: campusStats.majors, l: '个本科备案专业' },
        { v: campusStats.apps, l: '个校园应用' }
      ]" :key="s.l">
        <div class="stat-value">{{ s.v }}</div>
        <div class="stat-label">{{ s.l }}</div>
      </div>
      <div class="stats-note">{{ campusStats.statsNote }}</div>
    </section>

    <section class="section">
      <h3 class="section-title">三大校区</h3>
      <div class="campus-cards">
        <div v-for="c in campuses" :key="c.name" class="campus-card">
          <div class="campus-emoji">{{ c.emoji }}</div>
          <div class="campus-name">{{ c.name }}</div>
          <div class="campus-alias">{{ c.alias }}</div>
          <div class="campus-addr">{{ c.address }}</div>
        </div>
      </div>
    </section>
  </div>
</template>