<script setup>
import { ref, computed, onMounted } from 'vue'
import { apps, campusStats } from '../data/apps'
import { searchApps } from '../data/searchIndex'
import { campuses } from '../data/campus'
import { getCourseStats, EMPTY_STATS } from '../api/courseStats'
import { SITE } from '../config/site'
import VisitStats from '../components/VisitStats.vue'
import { fetchLikes, toggleLike, likedByMe } from '../utils/like'
import { useI18n } from '../i18n'

const { t, lang } = useI18n()
const emit = defineEmits(['open'])

const keyword = ref('')

const stats = ref(EMPTY_STATS)
const maxTerm = ref(1)

const likes = ref({})
const likedState = ref({})
async function initLikes() {
  likes.value = await fetchLikes()
  const m = { site: likedByMe('site') }
  for (const a of apps) m[a.id] = likedByMe(a.id)
  likedState.value = m
}
async function tapLike(appId, ev) {
  if (ev) ev.stopPropagation()
  const res = await toggleLike(appId)
  likedState.value = { ...likedState.value, [appId]: res.liked }
  if (res.likes != null) likes.value = { ...likes.value, [appId]: res.likes }
  else {
    const cur = likes.value[appId] != null ? likes.value[appId] : 0
    likes.value = { ...likes.value, [appId]: Math.max(0, cur + (res.liked ? 1 : -1)) }
  }
}

function barH(v, m) { return m ? Math.max(6, Math.round((v / m) * 100)) : 6 }

onMounted(async () => {
  stats.value = await getCourseStats()
  maxTerm.value = stats.value.terms.reduce((m, t) => Math.max(m, t.count), 1)
  initLikes()
})

function greeting() {
  if (lang.value === 'en') {
    const h = new Date().getHours()
    if (h < 6) return 'Good night, rest early'
    if (h < 12) return 'Good morning, QDU!'
    if (h < 14) return 'Good noon, QDU!'
    if (h < 18) return 'Good afternoon, QDU!'
    return 'Good evening, QDU!'
  }
  const h = new Date().getHours()
  if (h < 6) return '夜深了，早点休息'
  if (h < 12) return '早上好，青大人'
  if (h < 14) return '中午好，青大人'
  if (h < 18) return '下午好，青大人'
  return '晚上好，青大人'
}

const appName = (a) => lang.value === 'en' && a.titleEn ? a.titleEn : a.title
const appDesc = (a) => lang.value === 'en' && a.descEn ? a.descEn : a.desc

const filtered = computed(() => {
  const kw = keyword.value.trim()
  if (!kw) return apps.map((a) => ({ app: a, score: 0, hits: [] }))
  return searchApps(kw)
})

const expanded = ref(null)
function toggleCampus(name) { expanded.value = expanded.value === name ? null : name }
</script>

<template>
  <div class="page home">
    <section class="hero">
      <h2 class="hero-title">{{ greeting() }}</h2>
      <p class="hero-sub">{{ lang === 'en' ? 'Welcome to' : '欢迎回到' }} {{ t('site.name') }}，{{ t('site.heroSub') }}</p>
      <div class="search-bar">
        <span class="search-icon">🔍</span>
        <input v-model="keyword" class="search-input" :placeholder="lang === 'en' ? 'Search apps or features...' : '搜索应用或功能：空教室、记账、体测…'" />
      </div>
    </section>

    <section class="section">
      <div class="wiki-card">
        <div class="wiki-main">
          <div class="wiki-emoji">📚</div>
          <div>
            <div class="wiki-title">{{ t('site.wikiTitle') }}</div>
            <div class="wiki-desc">{{ t('site.wikiDesc') }}</div>
          </div>
        </div>
        <div class="wiki-links">
          <a class="wiki-link" :href="SITE.wiki.links.site" target="_blank" rel="noopener">{{ lang === 'en' ? 'Site' : '网站' }} ↗</a>
          <a class="wiki-link" :href="SITE.wiki.links.github" target="_blank" rel="noopener">GitHub ↗</a>
          <a class="wiki-link" :href="SITE.wiki.links.gitee" target="_blank" rel="noopener">Gitee ↗</a>
          <a class="wiki-link" :href="SITE.wiki.links.docs" target="_blank" rel="noopener">{{ lang === 'en' ? 'Docs' : '腾讯文档' }} ↗</a>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="section-head">
        <h3 class="section-title">{{ lang === 'en' ? 'Public Apps' : '公开应用' }}</h3>
        <div class="section-head-right">
          <span class="section-sub">{{ lang === 'en' ? 'Quick access to popular apps' : '高频应用一键直达' }}</span>
          <button class="section-link" @click="emit('open', 'categories')">{{ t('home.viewAllCats') }}</button>
        </div>
      </div>
      <div v-if="filtered.length" class="tile-grid">
        <button v-for="r in filtered" :key="r.app.id" class="service-tile" @click="emit('open', r.app.id)">
          <span class="tile-icon" :style="{ background: r.app.color + '1a', color: r.app.color }">{{ r.app.icon }}</span>
          <span class="tile-body">
            <span class="tile-title">{{ appName(r.app) }}</span>
            <span v-if="r.hits.length" class="tile-hit">{{ lang === 'en' ? 'Match' : '匹配' }}：{{ r.hits.join(' · ') }}</span>
            <span v-else class="tile-desc">{{ appDesc(r.app) }}</span>
          </span>
        </button>
      </div>
      <div v-else class="empty">{{ lang === 'en' ? 'No results for "' + keyword + '"' : '没有找到「' + keyword + '」相关内容' }}，{{ t('home.tryHint') }}</div>
      <div class="hint">{{ t('home.catHint') }} {{ apps.length }} {{ t('home.apps') }}</div>
    </section>

    <section class="section stats">
      <div class="stat" v-for="s in [
        { v: campusStats.campuses, l: lang === 'en' ? 'Campuses' : '大校区' },
        { v: campusStats.colleges, l: lang === 'en' ? 'Colleges' : '个学院 + 医学部' },
        { v: campusStats.majors, l: lang === 'en' ? 'Programs' : '个本科备案专业' },
        { v: campusStats.apps, l: lang === 'en' ? 'Apps' : '个校园应用' }
      ]" :key="s.l">
        <div class="stat-value">{{ s.v }}</div>
        <div class="stat-label">{{ s.l }}</div>
      </div>
    </section>

    <section class="section">
      <div class="section-head">
        <h3 class="section-title">{{ lang === 'en' ? 'Course Insights' : '数据洞察' }}</h3>
        <button class="section-link" @click="emit('open', 'courseStats')">{{ lang === 'en' ? 'Full Stats' : '查看完整统计' }} ›</button>
      </div>
      <div class="insight-card">
        <div class="insight-main">
          <div class="insight-title">📊 {{ lang === 'en' ? 'Campus Popularity · Course Data Insights' : '校园热度 · 课程数据洞察' }}</div>
          <div v-if="stats.periods" class="insight-desc">
            {{ lang === 'en' ? 'Last' : '近' }} {{ stats.terms.length }} {{ lang === 'en' ? 'semesters, ' : '个学期共' }} <b>{{ stats.periods }}</b> {{ lang === 'en' ? 'courses. Top room: ' : '条排课：最热教室' }}
            <b>{{ stats.hotRooms[0] && stats.hotRooms[0].name }}</b> ({{ stats.hotRooms[0] && stats.hotRooms[0].periods }} {{ lang === 'en' ? 'periods' : '节次' }}),
            {{ lang === 'en' ? 'Top teacher: ' : '最热教师' }} <b>{{ stats.hotTeachers[0] && stats.hotTeachers[0].name }}</b>
          </div>
          <div v-else class="insight-desc muted">{{ lang === 'en' ? 'Stats temporarily unavailable' : '统计数据暂不可用' }}</div>
        </div>
        <div class="insight-bars">
          <div v-for="t in stats.terms.slice(0, 5)" :key="t.semester" class="insight-bar" :title="t.semester + ' · ' + t.count">
            <div class="insight-bar-fill" :style="{ height: barH(t.count, maxTerm) + '%' }"></div>
          </div>
        </div>
      </div>
    </section>

    <section class="section">
      <h3 class="section-title">{{ lang === 'en' ? 'Three Campuses' : '三大校区' }}</h3>
      <div class="campus-cards">
        <button v-for="c in campuses" :key="c.name" class="campus-card" :class="{ open: expanded === c.name }" @click="toggleCampus(c.name)">
          <div class="campus-head">
            <div class="campus-emoji">{{ c.emoji }}</div>
            <div class="campus-main">
              <div class="campus-name">{{ c.name }}</div>
              <div class="campus-alias">{{ c.alias }}</div>
            </div>
            <span class="campus-toggle">{{ expanded === c.name ? (lang === 'en' ? 'Collapse ▴' : '收起 ▴') : (lang === 'en' ? 'Expand ▾' : '展开 ▾') }}</span>
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
      <h3 class="section-title">{{ lang === 'en' ? 'About' : '关于本站' }}</h3>
      <div class="about-card">
        <div class="about-line"><b>{{ lang === 'en' ? 'Developer:' : '网站开发者：' }}</b>{{ SITE.developer }}</div>
        <div class="about-line"><b>{{ lang === 'en' ? 'Version:' : '网站版本：' }}</b>v{{ SITE.version }}</div>
        <div class="about-line"><b>{{ lang === 'en' ? 'Data Source:' : '数据来源：' }}</b>{{ t('site.aboutSource') }}</div>
        <div class="about-line"><b>{{ lang === 'en' ? 'Crawling:' : '抓取方式：' }}</b>{{ t('site.aboutCrawl') }}</div>
        <div class="about-line"><b>{{ lang === 'en' ? 'Usage:' : '用途与版权：' }}</b>{{ t('site.aboutUsage') }}</div>
        <div class="about-actions">
          <button class="btn ghost small" @click="emit('open', 'contributors')">🏆 {{ lang === 'en' ? 'Contributors' : '查看贡献者墙' }} ›</button>
          <button class="site-like" :class="{ on: likedState.site }" @click="tapLike('site')">
            <span class="sl-icon">👍</span>
            <span class="sl-text">{{ t('like.site') }}</span>
            <b class="sl-num">{{ likes.site != null ? likes.site : 0 }}</b>
          </button>
        </div>
        <VisitStats />
      </div>
    </section>
  </div>
</template>

<style scoped>
.tile-hit {
  font-size: 11px;
  color: var(--primary);
  background: var(--primary-soft);
  border-radius: 999px;
  padding: 2px 8px;
  width: fit-content;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.site-like {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 16px;
  border: 1px solid var(--border);
  background: var(--card);
  border-radius: 999px;
  font-family: inherit;
  font-size: 13px;
  color: var(--text);
  cursor: pointer;
  transition: transform 0.15s, box-shadow 0.15s;
}
.site-like:hover { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(0, 0, 0, 0.1); }
.site-like.on { border-color: #e11d48; background: rgba(225, 29, 72, 0.08); }
.site-like .sl-icon { font-size: 16px; }
.site-like .sl-num { font-weight: 800; color: var(--primary); min-width: 12px; text-align: left; }
.site-like.on .sl-num { color: #e11d48; }
.section-head-right { display: flex; align-items: center; gap: 10px; }
.about-actions { display: flex; align-items: center; gap: 10px; margin-top: 10px; flex-wrap: wrap; }
</style>
