<script setup>
/** 首页：欢迎语 / 应用网格 / 分类入口 / 校园数据 / 数据洞察 / 校区 / 关于本站 */
import { ref, computed, onMounted } from 'vue'
import { apps, campusStats } from '../data/apps'
import { campuses } from '../data/campus'
import { getCourseStats, EMPTY_STATS } from '../api/courseStats'
import { SITE } from '../config/site'
import VisitStats from '../components/VisitStats.vue'

const emit = defineEmits(['open'])

const keyword = ref('')

const stats = ref(EMPTY_STATS)
const maxTerm = ref(1)

function barH(v, m) {
  return m ? Math.max(6, Math.round((v / m) * 100)) : 6
}

onMounted(async () => {
  stats.value = await getCourseStats()
  maxTerm.value = stats.value.terms.reduce((m, t) => Math.max(m, t.count), 1)
})

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

const expanded = ref(null)
function toggleCampus(name) {
  expanded.value = expanded.value === name ? null : name
}
</script>

<template>
  <div class="page home">
    <section class="hero">
      <h2 class="hero-title">{{ greeting() }}</h2>
      <p class="hero-sub">欢迎回到 {{ SITE.name }}，{{ SITE.heroSub }}</p>
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
            <div class="wiki-title">{{ SITE.wiki.title }}</div>
            <div class="wiki-desc">{{ SITE.wiki.desc }}</div>
          </div>
        </div>
        <div class="wiki-links">
          <a class="wiki-link" :href="SITE.wiki.links.site" target="_blank" rel="noopener">网站 ↗</a>
          <a class="wiki-link" :href="SITE.wiki.links.github" target="_blank" rel="noopener">GitHub ↗</a>
          <a class="wiki-link" :href="SITE.wiki.links.gitee" target="_blank" rel="noopener">Gitee ↗</a>
          <a class="wiki-link" :href="SITE.wiki.links.docs" target="_blank" rel="noopener">腾讯文档 ↗</a>
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
        <button class="section-link" @click="emit('open', 'categories')">查看全部分类 ›</button>
      </div>
      <div class="hint">按学习、生活、游戏等分组浏览全部 {{ apps.length }} 个应用</div>
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
    </section>

    <section class="section">
      <div class="section-head">
        <h3 class="section-title">数据洞察</h3>
        <button class="section-link" @click="emit('open', 'courseStats')">查看完整统计 ›</button>
      </div>
      <div class="insight-card">
        <div class="insight-main">
          <div class="insight-title">📊 校园热度 · 课程数据洞察</div>
          <div v-if="stats.periods" class="insight-desc">
            近 {{ stats.terms.length }} 个学期共 <b>{{ stats.periods }}</b> 条排课：最热教室
            <b>{{ stats.hotRooms[0] && stats.hotRooms[0].name }}</b>（{{ stats.hotRooms[0] && stats.hotRooms[0].periods }} 节次）、
            最热教师 <b>{{ stats.hotTeachers[0] && stats.hotTeachers[0].name }}</b>
          </div>
          <div v-else class="insight-desc muted">统计数据暂不可用</div>
        </div>
        <div class="insight-bars">
          <div v-for="t in stats.terms.slice(0, 5)" :key="t.semester" class="insight-bar" :title="t.semester + ' · ' + t.count">
            <div class="insight-bar-fill" :style="{ height: barH(t.count, maxTerm) + '%' }"></div>
          </div>
        </div>
      </div>
    </section>

    <section class="section">
      <h3 class="section-title">三大校区</h3>
      <div class="campus-cards">
        <button
          v-for="c in campuses"
          :key="c.name"
          class="campus-card"
          :class="{ open: expanded === c.name }"
          @click="toggleCampus(c.name)"
        >
          <div class="campus-head">
            <div class="campus-emoji">{{ c.emoji }}</div>
            <div class="campus-main">
              <div class="campus-name">{{ c.name }}</div>
              <div class="campus-alias">{{ c.alias }}</div>
            </div>
            <span class="campus-toggle">{{ expanded === c.name ? '收起 ▴' : '展开 ▾' }}</span>
          </div>
          <div class="campus-addr">{{ c.address }}</div>
          <div v-if="expanded === c.name" class="campus-detail">
            <div class="campus-desc">{{ c.desc }}</div>
            <div class="campus-colleges">
              <span v-for="col in c.colleges" :key="col" class="campus-tag">{{ col }}</span>
            </div>
            <div class="campus-links">
              <button v-for="l in c.links" :key="l.label" class="btn ghost small" @click.stop="emit('open', l.app)">
                {{ l.label }} ›
              </button>
            </div>
          </div>
        </button>
      </div>
    </section>

    <section class="section">
      <h3 class="section-title">关于本站</h3>
      <div class="about-card">
        <VisitStats />
        <div class="about-line"><b>网站开发者：</b>{{ SITE.developer }}</div>
        <div class="about-line"><b>网站版本：</b>v{{ SITE.version }}</div>
        <div class="about-line"><b>数据来源：</b>{{ SITE.aboutSource }}</div>
        <div class="about-line"><b>抓取方式：</b>{{ SITE.aboutCrawl }}</div>
        <div class="about-line"><b>用途与版权：</b>{{ SITE.aboutUsage }}</div>
        <button class="btn ghost small" style="margin-top:10px;" @click="emit('open', 'contributors')">🏆 查看贡献者墙 ›</button>
      </div>
    </section>
  </div>
</template>