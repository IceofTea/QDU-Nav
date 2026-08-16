<script setup>
import { ref, computed, markRaw } from 'vue'
import Welcome from './views/Welcome.vue'
import Home from './views/Home.vue'
import CampusNews from './views/CampusNews.vue'
import Timetable from './views/Timetable.vue'
import StudentId from './views/StudentId.vue'
import PhysicalTest from './views/PhysicalTest.vue'
import Calendar from './views/Calendar.vue'
import WhatToEat from './views/WhatToEat.vue'
import ClassroomNav from './views/ClassroomNav.vue'
import QuizGame from './views/QuizGame.vue'
import FoodWheel from './views/FoodWheel.vue'
import OfficialSites from './views/OfficialSites.vue'
import Canteen from './views/Canteen.vue'

const viewMap = {
  campusNews: CampusNews,
  timetable: Timetable,
  studentId: StudentId,
  physicalTest: PhysicalTest,
  calendar: Calendar,
  whatToEat: WhatToEat,
  classroomNav: ClassroomNav,
  canteen: Canteen,
  quiz: QuizGame,
  foodWheel: FoodWheel,
  officialSites: OfficialSites
}

const stage = ref(localStorage.getItem('qdu_welcome_seen') ? 'main' : 'welcome')
const current = ref('home')

function enter() {
  localStorage.setItem('qdu_welcome_seen', '1')
  stage.value = 'main'
}

function openApp(id) {
  current.value = id
  location.hash = '#/app/' + id
  window.scrollTo(0, 0)
}

function goHome() {
  current.value = 'home'
  location.hash = '#/'
  window.scrollTo(0, 0)
}

function parseHash() {
  const m = location.hash.match(/^#\/app\/(\w+)/)
  current.value = m && viewMap[m[1]] ? m[1] : 'home'
}
window.addEventListener('hashchange', parseHash)
parseHash()

const currentComp = computed(() => {
  if (current.value === 'home') return markRaw(Home)
  return markRaw(viewMap[current.value] || Home)
})

const navApps = ['campusNews', 'timetable', 'classroomNav', 'studentId', 'physicalTest', 'officialSites']
</script>

<template>
  <Welcome v-if="stage === 'welcome'" @enter="enter" />

  <div v-else class="app-shell">
    <header class="header">
      <div class="header-inner">
        <div class="brand" @click="goHome">
          <div class="brand-logo">青</div>
          <div>
            <div class="brand-name">QDU 校园导航</div>
            <div class="brand-sub">青岛大学 · 校园服务聚合入口</div>
          </div>
        </div>
        <div class="header-right">
          <button class="ghost-btn" @click="goHome">🏠 首页</button>
        </div>
      </div>
    </header>

    <main class="main">
      <component :is="currentComp" @open="openApp" @back="goHome" />
    </main>

    <footer class="footer">
      <div class="footer-legend">
        <span class="legend-item"><i class="dot live"></i>官方实时：校园动态 · 校历 · 课程总表（抓自 jwc.qdu.edu.cn）</span>
        <span class="legend-item"><i class="dot demo"></i>演示数据：课程表（个人） · 学号查询（需登录教务/招办，附官方入口）</span>
        <span class="legend-item"><i class="dot tool"></i>本地工具：体测 · 吃什么 · 问答 · 轮盘 · 教室导航（参考）</span>
      </div>
      <div class="footer-copy">QDU 校园导航 · 非官方校园服务聚合演示站，数据仅供学习交流</div>
    </footer>

    <nav class="bottom-nav">
      <button class="bottom-nav__item" :class="{ 'is-active': current === 'home' }" @click="goHome">
        <span class="bn-icon">🏠</span><span>首页</span>
      </button>
      <button
        v-for="a in navApps"
        :key="a"
        class="bottom-nav__item"
        :class="{ 'is-active': current === a }"
        @click="openApp(a)"
      >
        <span class="bn-icon">{{ ({ campusNews: '📢', timetable: '🗓️', classroomNav: '🧭', studentId: '🪪', physicalTest: '💪', officialSites: '🏛️' })[a] }}</span>
        <span>{{ ({ campusNews: '动态', timetable: '课程表', classroomNav: '教室', studentId: '学号', physicalTest: '体测', officialSites: '官网' })[a] }}</span>
      </button>
    </nav>
  </div>
</template>