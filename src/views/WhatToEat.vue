<script setup>
import { ref, computed, onMounted } from 'vue'
import { foods, halls, pickFoods } from '../data/foods'
import CountUp from '../components/CountUp.vue'

const emit = defineEmits(['back'])

const picks = ref([])
const pickedCount = ref(0)
const filter = ref('全部')
const showAll = ref(false)

const tags = computed(() => ['全部', ...new Set(foods.map(f => f.tag))])

const filtered = computed(() => {
  if (filter.value === '全部') return foods
  return foods.filter(f => f.tag === filter.value)
})

const totalKcal = computed(() => picks.value.reduce((a, f) => a + f.heat, 0))

function roll() {
  picks.value = pickFoods(3)
  pickedCount.value += 1
  sessionStorage.setItem('qdu_food_picked', String(pickedCount.value))
}

function pickOne() {
  picks.value = pickFoods(1)
  pickedCount.value += 1
  sessionStorage.setItem('qdu_food_picked', String(pickedCount.value))
}

onMounted(() => {
  pickedCount.value = Number(sessionStorage.getItem('qdu_food_picked')) || 0
  roll()
})
</script>

<template>
  <div class="view-top">
    <button class="back-btn" @click="emit('back')">← 返回首页</button>
    <div class="view-title">今天吃什么</div>
    <div class="view-sub">选择困难？帮你随机决定 · 今日已随机 <CountUp :value="pickedCount" /> 次</div>
  </div>

  <div class="panel" style="margin-bottom:16px;text-align:center;">
    <div class="muted" style="font-size:13px;margin-bottom:14px;">随机推荐 3 个选择</div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin-bottom:16px;">
      <div v-for="(f, i) in picks" :key="i" class="food-card">
        <div style="font-size:26px;">🍽️</div>
        <div style="font-weight:700;margin:6px 0;">{{ f.name }}</div>
        <div class="tag">{{ f.tag }}</div>
        <div class="muted" style="font-size:12px;margin-top:6px;">{{ f.hall }} · ¥{{ f.price }} · {{ f.heat }} kcal</div>
      </div>
    </div>
    <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;">
      <button class="btn" @click="roll">🔄 换个推荐</button>
      <button class="btn accent" @click="pickOne">🎯 就决定这个</button>
    </div>
    <div class="muted" style="margin-top:12px;font-size:12px;">推荐合计约 {{ totalKcal }} kcal</div>
  </div>

  <div class="panel" style="margin-bottom:16px;">
    <div class="section-title" style="margin:0 0 12px;"><span class="bar"></span>食堂一览（<CountUp :value="halls.length" /> 家）</div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px;">
      <div v-for="h in halls" :key="h.name" style="background:#f6f9ff;border-radius:12px;padding:12px;">
        <b>{{ h.name }}</b>
        <div class="muted" style="font-size:12px;margin-top:4px;">{{ h.campus }}</div>
        <div class="muted" style="font-size:12px;">{{ h.note }}</div>
      </div>
    </div>
  </div>

  <div class="panel">
    <div class="section-title" style="margin:0 0 12px;">
      <span class="bar"></span>菜品库（<CountUp :value="foods.length" /> 种）
      <button class="btn ghost" style="margin-left:auto;padding:6px 12px;" @click="showAll = !showAll">{{ showAll ? '收起' : '展开' }}</button>
    </div>
    <div class="tab-row">
      <button
        v-for="t in tags"
        :key="t"
        class="tab"
        :class="{ active: filter === t }"
        @click="filter = t"
      >{{ t }}</button>
    </div>
    <div v-if="showAll" style="overflow-x:auto;">
      <table class="data">
        <thead><tr><th>菜品</th><th>分类</th><th>推荐食堂</th><th>价格</th><th>热量</th></tr></thead>
        <tbody>
          <tr v-for="f in filtered" :key="f.name">
            <td><b>{{ f.name }}</b></td>
            <td>{{ f.tag }}</td>
            <td>{{ f.hall }}</td>
            <td>¥{{ f.price }}</td>
            <td>{{ f.heat }} kcal</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.food-card {
  background: #f6f9ff;
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 14px;
}
</style>