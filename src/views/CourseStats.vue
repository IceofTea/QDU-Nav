<script setup>
import { ref, onMounted } from 'vue'
import { getCourseStats, EMPTY_STATS } from '../api/courseStats'
import CountUp from '../components/CountUp.vue'

const emit = defineEmits(['back'])

const stats = ref(EMPTY_STATS)
const loading = ref(true)

const maxRoom = ref(1)
const maxTeacher = ref(1)
const maxCourse = ref(1)
const maxDay = ref(1)
const maxTerm = ref(1)

function pct(v, max) {
  return max ? Math.round((v / max) * 100) : 0
}

onMounted(async () => {
  stats.value = await getCourseStats()
  const s = stats.value
  maxRoom.value = s.hotRooms.reduce((m, r) => Math.max(m, r.periods), 1)
  maxTeacher.value = s.hotTeachers.reduce((m, r) => Math.max(m, r.periods), 1)
  maxCourse.value = s.topCourses.reduce((m, r) => Math.max(m, r.sections), 1)
  maxDay.value = s.dayDist.reduce((m, r) => Math.max(m, r.count), 1)
  maxTerm.value = s.terms.reduce((m, r) => Math.max(m, r.count), 1)
  loading.value = false
})
</script>

<template>
  <div class="view-top">
    <button class="back-btn" @click="emit('back')">← 返回首页</button>
    <div class="view-title">数据洞察</div>
    <div class="view-sub">从近 7 个学期课程总表（<CountUp :value="stats.periods" /> 条排课）看校园热度</div>
  </div>

  <div v-if="loading" class="muted" style="text-align:center;padding:40px;">统计加载中…</div>
  <div v-else-if="!stats.periods" class="muted" style="text-align:center;padding:40px;">暂无统计数据</div>

  <template v-else>
    <div class="panel" style="margin-bottom:16px;">
      <div class="section-title" style="margin:0 0 12px;"><span class="bar"></span>学期趋势（近 {{ stats.terms.length }} 个学期）</div>
      <div v-for="t in stats.terms" :key="t.semester" style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
        <div style="width:130px;font-size:12px;flex-shrink:0;">{{ t.semester }}</div>
        <div style="flex:1;background:#eef3fb;border-radius:8px;overflow:hidden;">
          <div style="height:20px;background:linear-gradient(90deg,#1b66c9,#3b82f6);border-radius:8px;" :style="{ width: pct(t.count, maxTerm) + '%' }"></div>
        </div>
        <div class="muted" style="width:64px;text-align:right;font-size:12px;flex-shrink:0;">{{ t.count }}</div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:16px;margin-bottom:16px;">
      <div class="panel">
        <div class="section-title" style="margin:0 0 12px;"><span class="bar"></span>热门教室 Top</div>
        <div v-for="r in stats.hotRooms" :key="r.name" style="margin-bottom:8px;">
          <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:2px;">
            <span>{{ r.name }}</span><span class="muted">{{ r.periods }} 节次</span>
          </div>
          <div style="background:#eef3fb;border-radius:8px;overflow:hidden;">
            <div style="height:12px;background:linear-gradient(90deg,#0f766e,#14b8a6);border-radius:8px;" :style="{ width: pct(r.periods, maxRoom) + '%' }"></div>
          </div>
        </div>
      </div>

      <div class="panel">
        <div class="section-title" style="margin:0 0 12px;"><span class="bar"></span>热门教师 Top</div>
        <div v-for="r in stats.hotTeachers" :key="r.name" style="margin-bottom:8px;">
          <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:2px;">
            <span>{{ r.name }}</span><span class="muted">{{ r.periods }} 节次</span>
          </div>
          <div style="background:#eef3fb;border-radius:8px;overflow:hidden;">
            <div style="height:12px;background:linear-gradient(90deg,#b63a46,#e76f51);border-radius:8px;" :style="{ width: pct(r.periods, maxTeacher) + '%' }"></div>
          </div>
        </div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:16px;margin-bottom:16px;">
      <div class="panel">
        <div class="section-title" style="margin:0 0 12px;"><span class="bar"></span>热门课程 Top（开课段次）</div>
        <div v-for="r in stats.topCourses" :key="r.name" style="margin-bottom:8px;">
          <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:2px;">
            <span>{{ r.name }}</span><span class="muted">{{ r.sections }} 段</span>
          </div>
          <div style="background:#eef3fb;border-radius:8px;overflow:hidden;">
            <div style="height:12px;background:linear-gradient(90deg,#7c3aed,#a78bfa);border-radius:8px;" :style="{ width: pct(r.sections, maxCourse) + '%' }"></div>
          </div>
        </div>
      </div>

      <div class="panel">
        <div class="section-title" style="margin:0 0 12px;"><span class="bar"></span>周节次分布</div>
        <div v-for="r in stats.dayDist" :key="r.day" style="margin-bottom:8px;">
          <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:2px;">
            <span>{{ r.day }}</span><span class="muted">{{ r.count }} 节</span>
          </div>
          <div style="background:#eef3fb;border-radius:8px;overflow:hidden;">
            <div style="height:12px;background:linear-gradient(90deg,#d97706,#f59e0b);border-radius:8px;" :style="{ width: pct(r.count, maxDay) + '%' }"></div>
          </div>
        </div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px;margin-bottom:16px;">
      <div class="panel">
        <div class="section-title" style="margin:0 0 12px;"><span class="bar"></span>课程性质分布</div>
        <div class="tag-wrap">
          <span v-for="k in stats.kindDist" :key="k.name" class="stat-chip">{{ k.name }} · {{ k.count }}</span>
        </div>
      </div>
      <div class="panel">
        <div class="section-title" style="margin:0 0 12px;"><span class="bar"></span>校区分布</div>
        <div class="tag-wrap">
          <span v-for="k in stats.campusDist" :key="k.name" class="stat-chip">{{ k.name }} · {{ k.count }}</span>
        </div>
      </div>
    </div>

    <div class="muted" style="font-size:12px;text-align:center;padding-bottom:6px;">数据抓取自教务处公开课程总表，仅供学习参考</div>
  </template>
</template>

<style scoped>
.tag-wrap { display: flex; flex-wrap: wrap; gap: 8px; }
.stat-chip {
  font-size: 12px;
  padding: 6px 12px;
  border-radius: 999px;
  background: #f6f9ff;
  border: 1px solid var(--border);
  color: var(--text);
}
</style>