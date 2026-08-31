<script setup>
import { ref, computed, onMounted } from 'vue'
import { apps, appGroups, appGroupsEn, groupColors } from '../data/apps'
import { searchApps } from '../data/searchIndex'
import { fetchLikes, toggleLike, likedByMe } from '../utils/like'
import { useI18n } from '../i18n'

const { t, lang } = useI18n()
const emit = defineEmits(['back', 'open'])
const kw = ref('')

const appName = (a) => lang.value === 'en' && a.titleEn ? a.titleEn : a.title
const appDesc = (a) => lang.value === 'en' && a.descEn ? a.descEn : a.desc
const groupName = (g) => {
  if (lang.value === 'en') {
    const idx = appGroups.indexOf(g)
    return idx >= 0 && appGroupsEn[idx] ? appGroupsEn[idx] : g
  }
  return g
}

const grouped = computed(() => {
  const k = kw.value.trim()
  const hitIds = k ? new Set(searchApps(k).map((r) => r.app.id)) : null
  return appGroups
    .map((g) => ({ group: g, items: apps.filter((a) => a.group === g && (!hitIds || hitIds.has(a.id))) }))
    .filter((x) => x.items.length)
})

const likes = ref({})
const likedState = ref({})
onMounted(async () => {
  likes.value = await fetchLikes()
  const m = {}
  for (const a of apps) m[a.id] = likedByMe(a.id)
  likedState.value = m
})
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
</script>

<template>
  <div class="view-top">
    <button class="back-btn" @click="emit('back')">{{ t('common.back') }}</button>
    <div class="view-title">{{ t('nav.categories') }}</div>
    <div class="view-sub">{{ apps.length }} {{ lang === 'en' ? 'apps grouped by study, life, games, etc.' : '个应用 · 按学习、生活、游戏等分组浏览' }}</div>
  </div>

  <div class="cat-search">
    <span class="search-icon">🔍</span>
    <input v-model="kw" class="search-input" :placeholder="lang === 'en' ? 'Search apps or features...' : '搜索应用或功能：空教室、记账、体测…'" />
  </div>

  <div v-for="g in grouped" :key="g.group" class="cat-group">
    <div class="cat-group-head">
      <span class="cat-group-dot" :style="{ background: groupColors[g.group] }"></span>
      <span class="cat-group-name">{{ groupName(g.group) }}</span>
      <span class="cat-group-count">{{ g.items.length }} {{ lang === 'en' ? '' : '个' }}</span>
    </div>
    <div class="cat-grid">
      <button v-for="a in g.items" :key="a.id" class="cat-tile" @click="emit('open', a.id)">
        <span class="cat-tile-icon" :style="{ background: a.color + '1a', color: a.color }">{{ a.icon }}</span>
        <span class="cat-tile-title">{{ appName(a) }}</span>
        <span class="cat-tile-desc">{{ appDesc(a) }}</span>
        <span class="cat-like" :class="{ on: likedState[a.id] }" :title="lang === 'en' ? 'Like / Unlike' : '点赞 / 取消'" @click.stop="tapLike(a.id)">
          👍 {{ likes[a.id] != null ? likes[a.id] : 0 }}
        </span>
      </button>
    </div>
  </div>

  <div v-if="!grouped.length" class="empty" style="margin:24px 0;">{{ lang === 'en' ? 'No matching apps' : '没有匹配的分类应用' }}</div>
</template>

<style scoped>
.cat-search {
  position: relative;
  margin-bottom: 16px;
  background: var(--card);
  border-radius: 14px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  padding: 10px 14px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.cat-search input { flex: 1; border: none; outline: none; font-size: 15px; font-family: inherit; background: none; }
.cat-group { margin-bottom: 20px; }
.cat-group-head { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
.cat-group-dot { width: 10px; height: 10px; border-radius: 50%; }
.cat-group-name { font-weight: 700; font-size: 15px; }
.cat-group-count { font-size: 12px; color: var(--text-sub); }
.cat-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 10px; }
.cat-tile {
  display: flex; align-items: center; gap: 10px;
  padding: 12px 14px; border-radius: 14px;
  background: var(--card); border: 1px solid var(--border);
  cursor: pointer; text-align: left; transition: 0.15s;
}
.cat-tile:hover { border-color: var(--primary); transform: translateY(-2px); box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08); }
.cat-tile-icon { width: 38px; height: 38px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0; }
.cat-tile-title { font-weight: 700; font-size: 14px; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cat-tile-desc { font-size: 12px; color: var(--text-sub); display: block; margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 160px; }
.cat-like { margin-left: auto; font-size: 12px; color: var(--text-sub); cursor: pointer; flex-shrink: 0; }
.cat-like.on { color: #e11d48; }
.cat-tile-body { flex: 1; min-width: 0; }
</style>
