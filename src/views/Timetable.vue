<script setup>
import { ref, computed, onMounted } from 'vue'
import { apiGetTimetables } from '../api/mock'
import { apiFetch } from '../api/index'
import { sessionTimes } from '../data/timetable'
import { buildings } from '../data/classrooms'

const emit = defineEmits(['back'])

const classList = ref([])
const semesters = ref([])
const tab = ref('class')
const currentClass = ref('')
const currentBuilding = ref('')
const currentRoom = ref('')
const currentSemester = ref('')

const weeks = ['周一', '周二', '周三', '周四', '周五']

const courses = ref(null)
const coursesLoading = ref(true)
const fmtTime = (iso) => new Date(iso).toLocaleString('zh-CN', { hour12: false })

async function loadCourses(force) {
  coursesLoading.value = true
  courses.value = await apiFetch('/courses' + (force ? '?force=1' : ''))
  coursesLoading.value = false
}

const qkw = ref('')
const queryLoading = ref(false)
const queryResult = ref(null)
const dayNames = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

async function doQuery() {
  const k = qkw.value.trim()
  if (!k) return
  queryLoading.value = true
  queryResult.value = await apiFetch('/courseQuery?q=' + encodeURIComponent(k))
  queryLoading.value = false
}

onMounted(async () => {
  const r = await apiGetTimetables()
  classList.value = r.data.classes
  semesters.value = r.data.semesters
  currentClass.value = classList.value[0]?.className || ''
  currentSemester.value = semesters.value[0] || ''
  currentBuilding.value = buildings[0]?.name || ''
  loadCourses()
})

const selectedClass = computed(() => classList.value.find(c => c.className === currentClass.value))

const cellCourses = (week, time) => {
  const c = selectedClass.value
  if (!c) return []
  return c.courses.filter(co => co.week === week && co.time === time)
}

const roomsOf = computed(() => {
  const b = buildings.find(x => x.name === currentBuilding.value)
  return b ? b.floors.flatMap(f => f.rooms) : []
})

const roomCourses = computed(() => {
  if (!currentRoom.value) return []
  const out = []
  classList.value.forEach(c => {
    c.courses.forEach(co => {
      if (co.room.includes(currentBuilding.value) && co.room.trim().endsWith(currentRoom.value.trim())) {
        out.push({ ...co, className: c.className })
      }
    })
  })
  return out
})

const roomSelect = (e) => {
  currentRoom.value = e.target.value
}
</script>

<template>
  <div class="view-top">
    <button class="back-btn" @click="emit('back')">← 返回首页</button>
    <div class="view-title">课程表</div>
    <div class="view-sub">
      个人真实课表需登录教务系统 · 下方官方课程总表为教务处公开数据，可跳官方查看每学期全部课程安排
    </div>
  </div>

  <div class="panel" style="margin-bottom:16px;">
    <div class="source-bar">
      <i class="dot" :class="courses?.cached ? 'off' : 'live'"></i>
      官方课程总表 · 来源 jwc.qdu.edu.cn
      <span v-if="courses" class="sep">·</span>
      <span v-if="courses">抓取于 {{ fmtTime(courses.fetchedAt) }}</span>
      <span v-if="courses" class="sep">·</span>
      <span v-if="courses">{{ courses.cached ? '命中缓存' : '实时抓取' }}</span>
      <button class="refresh-btn" :disabled="coursesLoading" @click="loadCourses(true)">🔄 刷新</button>
    </div>
    <div v-if="coursesLoading" class="skeleton-list">
      <div v-for="i in 3" :key="i" class="skeleton-row">
        <div class="skeleton" style="width:60%;height:16px"></div>
      </div>
    </div>
    <div v-else-if="courses" class="cal-list">
      <a v-for="c in courses.items" :key="c.url" class="cal-item" :href="c.url" target="_blank" rel="noopener">
        <span class="cal-title">{{ c.title }}</span>
        <span class="cal-date">{{ c.date }}</span>
        <span class="cal-go">官方页 ↗</span>
      </a>
    </div>
    <div v-else class="muted" style="padding:16px;text-align:center;">官方课程总表暂不可用，请稍后重试</div>
  </div>

  <div class="panel" style="margin-bottom:16px;display:flex;align-items:center;gap:14px;flex-wrap:wrap;">
    <div style="flex:1;min-width:200px;">
      <div style="font-weight:700;">📖 教务系统 · 个人课表</div>
      <div class="muted" style="font-size:12px;margin-top:2px;">个人课表需登录教务系统查询（需统一身份认证，无法免登录对接）。</div>
    </div>
    <a class="btn" href="https://xjw.qdu.edu.cn/jsxsd" target="_blank" rel="noopener" style="text-decoration:none;">前往新教务综合系统 ↗</a>
  </div>

  <div class="tab-row">
    <button class="tab" :class="{ active: tab === 'class' }" @click="tab = 'class'">演示班级课表</button>
    <button class="tab" :class="{ active: tab === 'room' }" @click="tab = 'room'">演示教室课表</button>
    <button class="tab" :class="{ active: tab === 'query' }" @click="tab = 'query'">真实课表查询</button>
  </div>

  <div v-if="tab === 'class'" class="panel">
    <div class="input-row">
      <select class="input" v-model="currentClass">
        <option v-for="c in classList" :key="c.className" :value="c.className">
          {{ c.className }}（{{ c.college }}）
        </option>
      </select>
      <select class="input" v-model="currentSemester">
        <option v-for="s in semesters" :key="s" :value="s">{{ s }}</option>
      </select>
    </div>
    <p class="muted" style="font-size:12px;margin-top:0;">
      以下为演示课表（示例数据，非真实排课），真实课表请登录教务系统查询。
    </p>

    <div style="overflow-x:auto;">
      <table class="data">
        <thead>
          <tr>
            <th>节次</th>
            <th v-for="w in weeks" :key="w">{{ w }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="s in sessionTimes" :key="s.key">
            <td style="white-space:nowrap;"><b>{{ s.key }}</b><br><span class="muted">{{ s.time }}</span></td>
            <td v-for="w in weeks" :key="w">
              <div v-for="co in cellCourses(w, s.key)" :key="co.name" class="cell">
                <b>{{ co.name }}</b>
                <div>{{ co.teacher }}</div>
                <div class="muted">{{ co.room }}</div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <div v-else-if="tab === 'room'" class="panel">
    <div class="input-row">
      <select class="input" v-model="currentBuilding">
        <option v-for="b in buildings" :key="b.name" :value="b.name">{{ b.name }}（{{ b.campus }}）</option>
      </select>
      <select class="input" @change="roomSelect">
        <option value="">选择教室</option>
        <option v-for="r in roomsOf" :key="r" :value="r">{{ currentBuilding }} {{ r }}</option>
      </select>
    </div>

    <div v-if="roomCourses.length" style="overflow-x:auto;">
      <table class="data">
        <thead>
          <tr><th>班级</th><th>课程</th><th>教师</th><th>时间</th></tr>
        </thead>
        <tbody>
          <tr v-for="(co, i) in roomCourses" :key="i">
            <td>{{ co.className }}</td>
            <td><b>{{ co.name }}</b></td>
            <td>{{ co.teacher }}</td>
            <td>{{ co.week }} {{ co.time }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-else class="muted" style="padding:20px;text-align:center;">该教室当前没有安排课程</div>
  </div>

  <div v-else-if="tab === 'query'" class="panel">
    <div class="input-row">
      <input class="input" v-model="qkw" placeholder="输入班级 / 课程 / 教师，如：23高材 / 高等数学 / 王瑶" @keyup.enter="doQuery" />
      <button class="btn" :disabled="queryLoading" @click="doQuery">{{ queryLoading ? '查询中…' : '查询' }}</button>
    </div>
    <div v-if="queryResult" style="margin-top:12px;">
      <div class="muted" style="font-size:12px;margin-bottom:8px;">
        「{{ queryResult.q }}」匹配 {{ queryResult.count }} 条 · 数据源：{{ queryResult.semester }}课程总表（教务处官网）
      </div>
      <div class="cal-list">
        <div v-for="(x, i) in queryResult.rows" :key="i" class="cal-item">
          <span class="cal-title">{{ x.c }}</span>
          <span class="cal-date">{{ dayNames[x.d - 1] }} 第{{ x.s }}-{{ x.e }}节 · {{ x.r }}</span>
          <span class="cal-go">{{ x.cls }} · {{ x.t }}</span>
        </div>
      </div>
      <div v-if="queryResult.count > 200" class="muted" style="font-size:12px;margin-top:8px;">匹配较多，仅显示前 200 条，请用更精确的关键词。</div>
      <div v-if="!queryResult.rows.length" class="muted" style="padding:20px;text-align:center;">未找到匹配的课程</div>
    </div>
  </div>
</template>

<style scoped>
.cell {
  background: #eef4fd;
  border-radius: 8px;
  padding: 6px;
  margin: 3px 0;
  font-size: 12px;
  line-height: 1.5;
  border-left: 3px solid #1b66c9;
}
</style>