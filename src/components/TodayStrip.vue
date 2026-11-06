<script setup>
/**
 * 今日速览条：日期 + 今日已导入课程（nav_imported_courses，全部本机数据）
 * ---------------------------------------------------------------
 * QDU 侧与 FJNU 今日卡定位相同、口径不同：本站个人课表来自「课程导入」
 * （用户手录/粘贴，无全校周次/调休概念），因此只按星期过滤、不编造周次；
 * 未导入时给引导直达导入页，不显示伪数据。
 */
import { ref, computed, onMounted } from 'vue'
import { useI18n } from '../i18n/index.js'

const emit = defineEmits(['open'])
const { t } = useI18n()

const KEY = 'nav_imported_courses'
const courses = ref([])
onMounted(() => {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) || '[]')
    courses.value = Array.isArray(list) ? list : []
  } catch { courses.value = [] }
})

const today = new Date()
const wd = today.getDay() === 0 ? 7 : today.getDay()
const wdKey = ['common.sun', 'common.mon', 'common.tue', 'common.wed', 'common.thu', 'common.fri', 'common.sat'][today.getDay()]

const todayCourses = computed(() =>
  courses.value
    .filter((c) => c && c.d === wd)
    .sort((a, b) => (a.s || 0) - (b.s || 0)),
)

const dateLabel = `${today.getMonth() + 1}/${today.getDate()}`
const hasImported = computed(() => courses.value.length > 0)

function courseLabel(c) {
  const seg = c.s === c.e ? `${c.s}` : `${c.s}-${c.e}`
  return `${t('todayStrip.p')}${seg}${t('todayStrip.pSuffix')} ${c.c}${c.r ? ' · ' + c.r : ''}`
}
function onOpen() {
  emit('open', hasImported.value ? 'timetable' : 'importer')
}
</script>

<template>
  <section class="section">
    <div class="today-strip" role="button" tabindex="0" @click="onOpen" @keydown.enter="onOpen">
      <div class="ts-date">
        <div class="ts-day">{{ dateLabel }}</div>
        <div class="ts-wd">{{ t(wdKey) }}</div>
      </div>
      <div class="ts-main">
        <template v-if="todayCourses.length">
          <span v-for="(c, i) in todayCourses.slice(0, 4)" :key="i" class="ts-course">{{ courseLabel(c) }}</span>
          <span v-if="todayCourses.length > 4" class="ts-more">+{{ todayCourses.length - 4 }}</span>
        </template>
        <span v-else-if="hasImported" class="ts-empty">{{ t('todayStrip.none') }}</span>
        <span v-else class="ts-empty ts-cta">{{ t('todayStrip.importHint') }}</span>
      </div>
      <span class="ts-go">›</span>
    </div>
  </section>
</template>

<style scoped>
.today-strip {
  display: flex; align-items: center; gap: 14px;
  padding: 12px 16px; border-radius: 14px; cursor: pointer;
  background: linear-gradient(135deg, rgba(37, 99, 235, 0.07), rgba(37, 99, 235, 0.02));
  border: 1px solid rgba(37, 99, 235, 0.15);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.today-strip:hover { transform: translateY(-1px); box-shadow: 0 6px 18px rgba(37, 99, 235, 0.12); }
.ts-date { text-align: center; flex-shrink: 0; min-width: 52px; }
.ts-day { font-size: 17px; font-weight: 800; color: var(--text-1, #1f2937); line-height: 1.2; }
.ts-wd { font-size: 12px; color: var(--text-2, #6b7280); }
.ts-main { flex: 1; min-width: 0; display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.ts-course {
  font-size: 12.5px; font-weight: 600; padding: 3px 10px; border-radius: 999px;
  background: rgba(37, 99, 235, 0.09); color: #1d4ed8;
  max-width: 240px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.ts-more { font-size: 12px; font-weight: 700; color: #2563eb; }
.ts-empty { font-size: 13px; color: var(--text-2, #6b7280); }
.ts-cta { color: #2563eb; font-weight: 600; }
.ts-go { font-size: 20px; color: #2563eb; opacity: 0.7; flex-shrink: 0; }
html[data-theme='dark'] .today-strip { background: linear-gradient(135deg, rgba(96, 165, 250, 0.12), rgba(96, 165, 250, 0.05)); border-color: rgba(96, 165, 250, 0.22); }
html[data-theme='dark'] .ts-course { background: rgba(96, 165, 250, 0.15); color: #93c5fd; }
</style>
