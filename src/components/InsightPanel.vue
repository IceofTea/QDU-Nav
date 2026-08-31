<script setup>
/**
 * 自动文字洞察面板：标题 + 要点列表
 * 供数据洞察 / 贴吧舆情 复用（浅蓝底 + 分隔标题条）。
 */
import { computed } from 'vue'
import { useI18n } from '../i18n'
const { t, lang } = useI18n()
const props = defineProps({
  items: { type: Array, default: () => [] },
  title: { type: String, default: '' }
})
const displayTitle = computed(() => props.title || t('insightPanel.defaultTitle'))
</script>

<template>
  <div v-if="items.length" class="panel insight-panel">
    <div class="section-title" style="margin:0 0 10px;"><span class="bar"></span>{{ displayTitle }}</div>
    <ul class="insight-list">
      <li v-for="s in items" :key="s">{{ s }}</li>
    </ul>
  </div>
</template>

<style scoped>
.insight-panel { margin-bottom: 16px; background: var(--soft-blue); border-color: var(--bar-bright); }
.insight-list { margin: 0; padding-left: 18px; font-size: 13px; line-height: 2; color: var(--text); }
</style>