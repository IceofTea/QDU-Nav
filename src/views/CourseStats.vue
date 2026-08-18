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
  maxKind.value = labeledDist(s.kindDist).reduce((m, r) => Math.max(m, r.count), 1)
  maxCampus.value = labeledDist(s.campusDist).reduce((m, r) => Math.max(m, r.count), 1)
  maxCol.value = labeledDist(s.colDist).reduce((m, r) => Math.max(m, r.count), 1)
  loading.value = false
})

/** 课程性质/校区/学院等「附带列」是否已随抓取写入（旧快照可能全部为「未标注」） */
const hasDist = computed(() =>
  stats.value.kindDist.some((k) => k.name !== '未标注') &&
  stats.value.campusDist.some((k) => k.name !== '未标注')
)

const total = computed(() => stats.value.periods || 1)
const share = (v) => Math.round((v / total.value) * 1000) / 10

/** 过滤「未标注」项：历史快照无附带列时不应展示 100% 未标注的无效分布 */
const labeledDist = (arr) => (arr || []).filter((k) => k.name !== '未标注')

/** 分布占比基于该分布自身的「已标注样本数」计算，避免未标注拉低真实占比 */
const distShare = (arr) => {
  const tot = labeledDist(arr).reduce((s, k) => s + k.count, 0)
  return (v) => (tot ? Math.round((v / tot) * 1000) / 10 : 0)
}

/** 概览 KPI */
const topCampus = computed(() => stats.value.campusDist[0] || null)
const topDay = computed(() => stats.value.dayDist[0] || null)
const colCount = computed(() => labeledDist(stats.value.colDist).length)
const maxPeriod = computed(() => stats.value.periodDist.reduce((m, r) => Math.max(m, r.count), 1))
const periodLabel = (start) => `第 ${start}–${start + 1} 节`

/** 自动生成的文字洞察（数据驱动，无统计时自动降级为空） */
const insights = computed(() => {
  const list = []
  if (topCampus.value) list.push(`开课最集中在 ${topCampus.value.name}，占已标注排课的 ${distShare(stats.value.campusDist)(topCampus.value.count)}%`)
  if (topDay.value) list.push(`${topDay.value}是全校排课最满的一天（${topDay.value.count} 节），图书馆/自习室会更紧张`)
  const busy = stats.value.periodDist.reduce((a, b) => (b.count > a.count ? b : a), stats.value.periodDist[0] || null)
  if (busy) list.push(`每天 ${periodLabel(busy.start)} 是排课高峰（${busy.count} 节次），想要抢空教室可以避开这些时段`)
  if (stats.value.terms.length >= 2) {
    const [latest, prev] = stats.value.terms
    const d = latest.count - prev.count
    list.push(d >= 0 ? `本学期开课规模比上学期增加 ${d} 段，选课竞争略升` : `本学期开课规模比上学期减少 ${-d} 段`)
  }
  return list
})
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
    <div v-if="!hasDist" class="panel" style="margin-bottom:16px;background: var(--notice-bg);border-color:var(--notice-border);">
      <div style="font-size:13px;font-weight:700;color:var(--notice-text);">📌 课程性质 / 校区 / 学院分布数据将在下一次定时抓取后自动补充</div>
      <p class="muted" style="font-size:12px;margin:6px 0 0;">历史快照未包含这些字段，重新抓取（每 6 小时一次）后本页会展示真实分布。</p>
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:16px;">
      <div class="panel" style="margin:0;">
        <div class="muted" style="font-size:12px;">已标注校区</div>
        <div style="font-size:22px;font-weight:800;margin-top:4px;"><CountUp :value="colCount ? stats.campusDist.length : 0" /></div>
        <div class="muted" style="font-size:12px;">浮山 / 金家岭 / 松山</div>
      </div>
      <div class="panel" style="margin:0;">
        <div class="muted" style="font-size:12px;">最忙校区</div>
        <div style="font-size:18px;font-weight:800;margin-top:6px;">{{ topCampus ? topCampus.name : '—' }}</div>
        <div class="muted" style="font-size:12px;">{{ topCampus ? topCampus.count + ' 条 · ' + share(topCampus.count) + '%' : '—' }}</div>
      </div>
      <div class="panel" style="margin:0;">
        <div class="muted" style="font-size:12px;">最忙星期</div>
        <div style="font-size:18px;font-weight:800;margin-top:6px;">{{ topDay ? topDay.day : '—' }}</div>
        <div class="muted" style="font-size:12px;">{{ topDay ? topDay.count + ' 节' : '—' }}</div>
      </div>
      <div class="panel" style="margin:0;">
        <div class="muted" style="font-size:12px;">开课学院</div>
        <div style="font-size:22px;font-weight:800;margin-top:4px;"><CountUp :value="colCount" /></div>
        <div class="muted" style="font-size:12px;">开课最忙的是「{{ (labeledDist(stats.colDist)[0] || {}).name || '—' }}」</div>
      </div>
    </div>

    <div v-if="insights.length" class="panel" style="margin-bottom:16px;background:var(--soft-blue);border-color:var(--bar-bright);">
      <div class="section-title" style="margin:0 0 10px;"><span class="bar"></span>一眼看懂这些数据</div>
      <ul style="margin:0;padding-left:18px;font-size:13px;line-height:2;color:var(--text);">
        <li v-for="s in insights" :key="s">{{ s }}</li>
      </ul>
    </div>

    <div class="panel" style="margin-bottom:16px;">
      <div class="section-title" style="margin:0 0 12px;"><span class="bar"></span>学期趋势（近 {{ stats.terms.length }} 个学期）</div>
      <div v-for="t in stats.terms" :key="t.semester" style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
        <div style="width:130px;font-size:12px;flex-shrink:0;">{{ t.semester }}</div>
        <div style="flex:1;background:var(--bar);border-radius:8px;overflow:hidden;">
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
          <div style="background:var(--bar);border-radius:8px;overflow:hidden;">
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
          <div style="background:var(--bar);border-radius:8px;overflow:hidden;">
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
          <div style="background:var(--bar);border-radius:8px;overflow:hidden;">
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
          <div style="background:var(--bar);border-radius:8px;overflow:hidden;">
            <div style="height:12px;background:linear-gradient(90deg,#d97706,#f59e0b);border-radius:8px;" :style="{ width: pct(r.count, maxDay) + '%' }"></div>
          </div>
        </div>
        <p class="muted" style="font-size:12px;margin-top:8px;">周一到周五开课密集，周末最少。</p>
      </div>

      <div v-if="stats.periodDist.length" class="panel">
        <div class="section-title" style="margin:0 0 12px;"><span class="bar"></span>每天节次分布</div>
        <div v-for="r in stats.periodDist" :key="r.start" style="margin-bottom:8px;">
          <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:2px;">
            <span>{{ periodLabel(r.start) }}</span><span class="muted">{{ r.count }} 节 · {{ share(r.count) }}%</span>
          </div>
          <div style="background:var(--bar);border-radius:8px;overflow:hidden;">
            <div style="height:12px;background:linear-gradient(90deg,#4d7c0f,#84cc16);border-radius:8px;" :style="{ width: pct(r.count, maxPeriod) + '%' }"></div>
          </div>
        </div>
        <p class="muted" style="font-size:12px;margin-top:8px;">每天上午 3-4 节最满，早八之后、晚课之前是高峰。</p>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px;margin-bottom:16px;">
      <div v-if="labeledDist(stats.kindDist).length" class="panel">
        <div class="section-title" style="margin:0 0 12px;"><span class="bar"></span>课程性质分布</div>
        <div v-for="k in labeledDist(stats.kindDist)" :key="k.name" style="margin-bottom:8px;">
          <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:2px;">
            <span>{{ k.name }}</span><span class="muted">{{ k.count }} 条 · {{ distShare(stats.kindDist)(k.count) }}%</span>
          </div>
          <div style="background:var(--bar);border-radius:8px;overflow:hidden;">
            <div style="height:12px;background:linear-gradient(90deg,#0d9488,#2dd4bf);border-radius:8px;" :style="{ width: pct(k.count, maxKind) + '%' }"></div>
          </div>
        </div>
        <p class="muted" style="font-size:12px;margin-top:8px;">来自课程总表「课程性质」列：专业课 / 美育课 / 实践环节等构成。</p>
      </div>

      <div v-if="labeledDist(stats.campusDist).length" class="panel">
        <div class="section-title" style="margin:0 0 12px;"><span class="bar"></span>校区分布</div>
        <div v-for="k in labeledDist(stats.campusDist)" :key="k.name" style="margin-bottom:8px;">
          <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:2px;">
            <span>{{ k.name }}</span><span class="muted">{{ k.count }} 条 · {{ distShare(stats.campusDist)(k.count) }}%</span>
          </div>
          <div style="background:var(--bar);border-radius:8px;overflow:hidden;">
            <div style="height:12px;background:linear-gradient(90deg,#2563eb,#60a5fa);border-radius:8px;" :style="{ width: pct(k.count, maxCampus) + '%' }"></div>
          </div>
        </div>
        <p class="muted" style="font-size:12px;margin-top:8px;">各校区开课规模一目了然，跨校区上课记得算好通勤。</p>
      </div>
    </div>

    <div v-if="labeledDist(stats.colDist).length" class="panel" style="margin-bottom:16px;">
      <div class="section-title" style="margin:0 0 12px;"><span class="bar"></span>学院开课分布 Top 12</div>
      <div v-for="k in labeledDist(stats.colDist)" :key="k.name" style="margin-bottom:8px;">
        <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:2px;">
          <span>{{ k.name }}</span><span class="muted">{{ k.count }} 条 · {{ distShare(stats.colDist)(k.count) }}%</span>
        </div>
        <div style="background:var(--bar);border-radius:8px;overflow:hidden;">
          <div style="height:12px;background:linear-gradient(90deg,#be185d,#ec4899);border-radius:8px;" :style="{ width: pct(k.count, maxCol) + '%' }"></div>
        </div>
      </div>
      <p class="muted" style="font-size:12px;margin-top:8px;">哪些学院开课多，选课竞争程度就能看出个大概。</p>
    </div>

    <div class="muted" style="font-size:12px;text-align:center;padding-bottom:6px;">数据抓取自教务处公开课程总表，仅供学习参考</div>
  </template>
</template>

<style scoped></style>