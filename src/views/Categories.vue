<script setup>
import { ref, computed } from 'vue'
import { apps, appGroups, groupColors } from '../data/apps'

const emit = defineEmits(['back', 'open'])
const kw = ref('')

const grouped = computed(() => {
  const k = kw.value.trim().toLowerCase()
  return appGroups
    .map((g) => ({ group: g, items: apps.filter((a) => a.group === g && (!k || (a.title + a.desc + a.group + g).toLowerCase().includes(k))) }))
    .filter((x) => x.items.length)
})
</script>

<template>
  <div class="view-top">
    <button class="back-btn" @click="emit('back')">← 返回首页</button>
    <div class="view-title">应用分类</div>
    <div class="view-sub">{{ apps.length }} 个应用 · 按学习、生活、游戏等分组浏览</div>
  </div>

  <div class="cat-search">
    <span class="search-icon">🔍</span>
    <input v-model="kw" class="search-input" placeholder="在分类中搜索应用" />
  </div>

  <div v-for="g in grouped" :key="g.group" class="cat-group">
    <div class="cat-group-head">
      <span class="cat-group-dot" :style="{ background: groupColors[g.group] }"></span>
      <span class="cat-group-name">{{ g.group }}</span>
      <span class="cat-group-count">{{ g.items.length }} 个</span>
    </div>
    <div class="cat-grid">
      <button v-for="a in g.items" :key="a.id" class="cat-tile" @click="emit('open', a.id)">
        <span class="cat-tile-icon" :style="{ background: a.color + '1a', color: a.color }">{{ a.icon }}</span>
        <span class="cat-tile-title">{{ a.title }}</span>
        <span class="cat-tile-desc">{{ a.desc }}</span>
      </button>
    </div>
  </div>

  <div v-if="!grouped.length" class="empty" style="margin:24px 0;">没有匹配的分类应用</div>
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
.cat-group-count { color: var(--text-light); font-size: 12px; }
.cat-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
.cat-tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 16px 10px 14px;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 14px;
  cursor: pointer;
  font-family: inherit;
  transition: transform 0.12s ease, box-shadow 0.12s ease;
}
.cat-tile:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08); }
.cat-tile-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
}
.cat-tile-title { font-weight: 700; font-size: 14px; }
.cat-tile-desc { font-size: 11px; color: var(--text-light); text-align: center; line-height: 1.4; }
</style>