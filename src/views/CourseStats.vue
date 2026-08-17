<script setup>
/** 数据洞察：课程大数据统计页
 *  数据来自 crawler/analysis.py 生成的 course_stats.json。
 *  统计维度：学期趋势 / 热门教室 / 热门教师 / 热门课程 / 周节次分布 /
 *            课程性质分布 / 校区分布 / 学院开课分布 */
import { ref, computed, onMounted } from 'vue'
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
const maxKind = ref(1)
const maxCampus = ref(1)
const maxCol = ref(1)

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
  maxKind.value = s.kindDist.reduce((m, r) => Math.max(m, r.count), 1)
  maxCampus.value = s.campusDist.reduce((m, r) => Math.max(m, r.count), 1)
  maxCol.value = s.colDist.reduce((m, r) => Math.max(m, r.count), 1)
  loading.value = false
})

/** 课程性质/校区/学院等「附带列」是否已随抓取写入（旧快照可能全部为「未标注」） */
const hasDist = computed(() =>
  stats.value.kindDist.some((k) => k.name !== '未标注') &&
  stats.value.campusDist.some((k) => k.name !== '未标注')
)

const total = computed(() => stats.value.periods || 1)
const share = (v) => Math.round((v / total.value) * 1000) / 10
</script>

<template>
  <div class="view-top">
    <button class="back-btn" @click="emit('back')">← 返回首页</button>
    <div class="view-title">数据洞察</div>
    <div class="view-sub">从近 {{ stats.terms.length || 7 }} 个学期课程总表（<CountUp :value="stats.periods" /> 条排课）看校园热度</div>
  </div>

  <div v-if="loading" class="muted" style="text-align:center;padding:40px;">统计加载中…</div>
  <div v-else-if="!stats.periods" class="muted" style="text-align:center;padding:40px;">暂无统计数据</div>

  <template v-else>
    <div v-if="!hasDist" class="panel" style="margin-bottom:16px;background:#fff8ec;border-color:#f5d79a;">
      <div style="font-size:13px;font-weight:700;color:#92400e;">📌 课程性质 / 校区 / 学院分布数据将在下一次定时抓取后自动补充</div>
      <p class="muted" style="font-size:12px;margin:6px 0 0;">历史快照未包含这些字段，重新抓取（每 6 小时一次）后本页会展示真实分布。</p>
    </div>

    <div class="panel" style="margin-bottom:16px;">
      <div class="section-title" style="margin:0 0 12px;"><span class="bar"></span>学期趋势（近 {{ stats.terms.length }} 个学期）</div>
      <div v-for="t in stats.terms" :key="t.semester" style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
        <div style="width:130px;font-size:12px;flex-shrink:0;">{{ t.semester }}</div>
        <div style="flex:1;background:#eef3fb;border-radius:8px;overflow:hidden;">
          <div style="height:20px;background:linear-gradient(90deg,#1b66c9,#3b82f6);border-radius:8px;" :style="{ width: pct(t.count, maxTerm) + '%' }"></div>
        </div>
        <div class="muted" style="width:64px;text-align:right;font-size:12px;flex-shrink:0;">{{ t.count }}</div>
      </div>
      <p class="muted" style="font-size:12px;margin-top:8px;">课程总表随学期更替更新，可以看到开课规模的变化。</p>
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:16px;margin-bottom:16px;">
      <div class="panel">
        <div class="section-title" style="margin:0 0 12px;"><span class="bar"></span>热门教室 Top</div>
        <div v-for="r in stats.hotRooms" :key="r.name" style="margin-bottom:8px;">
          <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:2px;">
            <span>{{ r.name }}</span><span class="muted">{{ r.periods }} 节次 · {{ share(r.periods) }}%</span>
          </div>
          <div style="background:#eef3fb;border-radius:8px;overflow:hidden;">
            <div style="height:12px;background:linear-gradient(90deg,#0f766e,#14b8a6);border-radius:8px;" :style="{ width: pct(r.periods, maxRoom) + '%' }"></div>
          </div>
        </div>
        <p class="muted" style="font-size:12px;margin-top:8px;">排课最满的教室，想去自习可以避开这些时段。</p>
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
        <p class="muted" style="font-size:12px;margin-top:8px;">教学任务最重的老师，选课遇上的概率也高。</p>
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
        <p class="muted" style="font-size:12px;margin-top:8px;">开课段次多的课程覆盖的班级面更广。</p>
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
        <p class="muted" style="font-size:12px;margin-top:8px;">周一到周五开课密集，周末最少。</p>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px;margin-bottom:16px;">
      <div class="panel">
        <div class="section-title" style="margin:0 0 12px;"><span class="bar"></span>课程性质分布</div>
        <div v-for="k in stats.kindDist" :key="k.name" style="margin-bottom:8px;">
          <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:2px;">
            <span>{{ k.name }}</span><span class="muted">{{ k.count }} 条 · {{ share(k.count) }}%</span>
          </div>
          <div style="background:#eef3fb;border-radius:8px;overflow:hidden;">
            <div style="height:12px;background:linear-gradient(90deg,#0d9488,#2dd4bf);border-radius:8px;" :style="{ width: pct(k.count, maxKind) + '%' }"></div>
          </div>
        </div>
        <p class="muted" style="font-size:12px;margin-top:8px;">来自课程总表「课程性质」列：专业课 / 美育课 / 实践环节等构成。</p>
      </div>

      <div class="panel">
        <div class="section-title" style="margin:0 0 12px;"><span class="bar"></span>校区分布</div>
        <div v-for="k in stats.campusDist" :key="k.name" style="margin-bottom:8px;">
          <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:2px;">
            <span>{{ k.name }}</span><span class="muted">{{ k.count }} 条 · {{ share(k.count) }}%</span>
          </div>
          <div style="background:#eef3fb;border-radius:8px;overflow:hidden;">
            <div style="height:12px;background:linear-gradient(90deg,#2563eb,#60a5fa);border-radius:8px;" :style="{ width: pct(k.count, maxCampus) + '%' }"></div>
          </div>
        </div>
        <p class="muted" style="font-size:12px;margin-top:8px;">各校区开课规模一目了然，跨校区上课记得算好通勤。</p>
      </div>
    </div>

    <div v-if="stats.colDist.length" class="panel" style="margin-bottom:16px;">
      <div class="section-title" style="margin:0 0 12px;"><span class="bar"></span>学院开课分布 Top 12</div>
      <div v-for="k in stats.colDist" :key="k.name" style="margin-bottom:8px;">
        <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:2px;">
          <span>{{ k.name }}</span><span class="muted">{{ k.count }} 条 · {{ share(k.count) }}%</span>
        </div>
        <div style="background:#eef3fb;border-radius:8px;overflow:hidden;">
          <div style="height:12px;background:linear-gradient(90deg,#be185d,#ec4899);border-radius:8px;" :style="{ width: pct(k.count, maxCol) + '%' }"></div>
        </div>
      </div>
      <p class="muted" style="font-size:12px;margin-top:8px;">哪些学院开课多，选课竞争程度就能看出个大概。</p>
    </div>

    <div class="muted" style="font-size:12px;text-align:center;padding-bottom:6px;">数据抓取自教务处公开课程总表，仅供学习参考</div>
  </template>
</template>

<style scoped></style>