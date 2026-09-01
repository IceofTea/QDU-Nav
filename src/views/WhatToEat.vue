<script setup>
import { ref, computed, onMounted } from 'vue'
import { foods, halls } from '../data/foods'
import CountUp from '../components/CountUp.vue'
import { useI18n } from '../i18n'

const { t, lang } = useI18n()

const emit = defineEmits(['back'])

const CAMPUS_EN = { '浮山校区': 'Fushan', '金家岭校区': 'Jinjialing', '松山校区': 'Songshan' }
const AREA_EN = { '西院': 'West', '东院': 'East', '北院（师范学院）': 'North', '浮山苑': 'Fushan Garden', '浮山公寓': 'Fushan Dorm' }
const campusLabel = (c) => lang.value === 'en' ? (CAMPUS_EN[c] || c) : c
const areaLabel = (a) => lang.value === 'en' ? (AREA_EN[a] || a) : a

const picks = ref([])
const pickedCount = ref(0)
const filter = ref('全部')
const showAll = ref(false)
const campusFilter = ref('全部')

const CAMPUSES = computed(() => lang.value === 'en'
  ? ['All', 'Fushan', 'Jinjialing', 'Songshan']
  : ['全部', '浮山校区', '金家岭校区', '松山校区'])

const CAMPUS_VALUES = ['全部', '浮山校区', '金家岭校区', '松山校区']

const tags = computed(() => [t('whatToEat.all'), ...new Set(foods.map(f => lang.value === 'en' ? f.tagEn : f.tag))])

const ALL_TAG = computed(() => t('whatToEat.all'))

const filtered = computed(() => {
  const tag = lang.value === 'en' ? (ALL_TAG.value) : (ALL_TAG.value)
  if (filter.value === ALL_TAG.value || filter.value === t('whatToEat.all')) return foods
  return foods.filter(f => (lang.value === 'en' ? f.tagEn : f.tag) === filter.value)
})

const campusPool = computed(() => {
  if (campusFilter.value === '全部') return foods
  return foods.filter(f => f.campus === campusFilter.value)
})

function pickFrom(pool, count) {
  const p = [...pool]
  const res = []
  while (res.length < count && p.length) {
    const i = Math.floor(Math.random() * p.length)
    res.push(p.splice(i, 1)[0])
  }
  return res
}

function roll() {
  picks.value = pickFrom(campusPool.value, 3)
  pickedCount.value += 1
  sessionStorage.setItem('qdu_food_picked', String(pickedCount.value))
}

function pickOne() {
  picks.value = pickFrom(campusPool.value, 1)
  pickedCount.value += 1
  sessionStorage.setItem('qdu_food_picked', String(pickedCount.value))
}

function setCampus(c) {
  campusFilter.value = c
  roll()
}

onMounted(() => {
  pickedCount.value = Number(sessionStorage.getItem('qdu_food_picked')) || 0
  roll()
})
</script>

<template>
  <div class="view-top">
    <button class="back-btn" @click="emit('back')">← {{ t('common.back').slice(2) }}</button>
    <div class="view-title">{{ t('whatToEat.title') }}</div>
    <div class="view-sub">{{ t('whatToEat.subFull') }} <CountUp :value="pickedCount" /> {{ t('whatToEat.subTimes') }}</div>
  </div>

  <div class="panel" style="margin-bottom:16px;text-align:center;">
    <div class="tab-row" style="justify-content:center;margin-bottom:14px;">
      <button
        v-for="(raw, i) in CAMPUS_VALUES"
        :key="raw"
        class="tab"
        :class="{ active: campusFilter === raw }"
        @click="setCampus(raw)"
      >{{ CAMPUSES[i] }}</button>
    </div>
    <div class="muted" style="font-size:13px;margin-bottom:14px;">
      {{ t('whatToEat.recommend3') }}<template v-if="campusFilter !== '全部'">（{{ t('whatToEat.onlyCampus') }} {{ campusFilter }}）</template>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin-bottom:16px;">
      <div v-for="(f, i) in picks" :key="i" class="food-card">
        <div style="font-size:26px;">🍽️</div>
        <div style="font-weight:700;margin:6px 0;">{{ lang === 'en' ? f.nameEn : f.name }}</div>
        <div class="tag">{{ lang === 'en' ? f.tagEn : f.tag }}</div>
        <div class="muted" style="font-size:12px;margin-top:6px;">{{ f.hallEn || f.hall }} · {{ campusLabel(f.campus) }} {{ areaLabel(f.zone) }}</div>
      </div>
    </div>
    <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;">
      <button class="btn" @click="roll">{{ t('whatToEat.reRecommend') }}</button>
      <button class="btn accent" @click="pickOne">{{ t('whatToEat.decideThis') }}</button>
    </div>
    <div class="muted" style="margin-top:12px;font-size:12px;">{{ t('whatToEat.dishNote') }}</div>
  </div>

  <div class="panel" style="margin-bottom:16px;">
    <div class="section-title" style="margin:0 0 12px;"><span class="bar"></span>{{ t('whatToEat.hallList') }}<CountUp :value="halls.length" />{{ t('whatToEat.hallUnit') }}</div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px;">
      <div v-for="h in halls" :key="h.name" style="background:var(--soft-fg);border-radius:12px;padding:12px;">
        <b>{{ lang === 'en' ? h.nameEn : h.name }}</b>
        <div class="muted" style="font-size:12px;margin-top:4px;">{{ campusLabel(h.campus) }} · {{ areaLabel(h.zone) }}</div>
      </div>
    </div>
  </div>

  <div class="panel">
    <div class="section-title" style="margin:0 0 12px;">
      <span class="bar"></span>{{ t('whatToEat.stallLib') }}<CountUp :value="foods.length" />{{ t('whatToEat.stallUnit') }}
      <button class="btn ghost" style="margin-left:auto;padding:6px 12px;" @click="showAll = !showAll">{{ showAll ? t('whatToEat.toggleCollapse') : t('whatToEat.toggleExpand') }}</button>
    </div>
    <div class="tab-row">
      <button
        v-for="tagName in tags"
        :key="tagName"
        class="tab"
        :class="{ active: filter === tagName }"
        @click="filter = tagName"
      >{{ tagName }}</button>
    </div>
    <div v-if="showAll" style="overflow-x:auto;">
      <table class="data">
        <thead><tr><th>{{ t('whatToEat.tableStall') }}</th><th>{{ t('whatToEat.tableHall') }}</th><th>{{ t('whatToEat.tableCampus') }}</th><th>{{ t('whatToEat.tableType') }}</th></tr></thead>
        <tbody>
          <tr v-for="f in filtered" :key="f.hall + f.name">
            <td><b>{{ lang === 'en' ? f.nameEn : f.name }}</b></td>
            <td>{{ lang === 'en' ? f.hallEn : f.hall }}</td>
            <td>{{ campusLabel(f.campus) }} {{ areaLabel(f.zone) }}</td>
            <td>{{ lang === 'en' ? f.tagEn : f.tag }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.food-card {
  background: var(--soft-fg);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 14px;
}
</style>