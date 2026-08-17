/**
 * 路由与视图注册
 * ---------------------------------------------------------------------------
 * 单页应用使用 Hash 路由（兼容纯静态托管），本模块是「视图注册表」的单一来源：
 *  - VIEWS：应用 id → 视图组件的映射（新增应用时在此登记）
 *  - NAV_APPS：底部快捷导航配置（首页 + 高频应用）
 *  - useViewState()：组合式函数，封装打开应用 / 返回首页 / 解析地址栏 hash
 *
 * 新增一个应用页面的完整流程见 README「二次开发：新增应用」。
 */
import { ref, computed, markRaw } from 'vue'
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
import Categories from './views/Categories.vue'
import BuildingMatch from './views/BuildingMatch.vue'
import CourseStats from './views/CourseStats.vue'
import Budget from './views/Budget.vue'
import TiebaSentiment from './views/TiebaSentiment.vue'
import Contributors from './views/Contributors.vue'

/** 应用 id → 视图组件注册表 */
export const VIEWS = {
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
  officialSites: OfficialSites,
  categories: Categories,
  buildingMatch: BuildingMatch,
  courseStats: CourseStats,
  budget: Budget,
  tiebaSentiment: TiebaSentiment,
  contributors: Contributors
}

/** 底部快捷导航（首页 + 高频应用） */
export const NAV_APPS = [
  { id: 'campusNews', icon: '📢', label: '动态' },
  { id: 'officialSites', icon: '🏛️', label: '官网' },
  { id: 'budget', icon: '🧮', label: '生活费' },
  { id: 'physicalTest', icon: '💪', label: '体测' },
  { id: 'classroomNav', icon: '🧭', label: '教室' },
  { id: 'calendar', icon: '📅', label: '校历' }
]

/** 应用页路由前缀（视图需匹配 parseHash 正则 /^#\/app\/(\w+)/） */
export const APP_ROUTE = '#/app/'

/**
 * 视图状态组合式函数：供 App.vue 使用
 * @returns {{ current: import('vue').Ref<string>, currentComp: import('vue').ComputedRef, openApp: Function, goHome: Function }}
 */
export function useViewState() {
  /** 当前视图 id（'home' 表示首页） */
  const current = ref('home')

  /** 当前视图组件（markRaw 避免被 Vue 转为响应式代理） */
  const currentComp = computed(() =>
    markRaw(current.value === 'home' ? Home : VIEWS[current.value] || Home)
  )

  /** 解析地址栏 hash，决定渲染哪个视图（支持分享链接直达应用页） */
  function parseHash() {
    const m = location.hash.match(/^#\/app\/(\w+)/)
    current.value = m && VIEWS[m[1]] ? m[1] : 'home'
  }
  window.addEventListener('hashchange', parseHash)
  parseHash()

  /** 打开应用页 */
  function openApp(id) {
    current.value = id
    location.hash = APP_ROUTE + id
    window.scrollTo(0, 0)
  }

  /** 返回首页 */
  function goHome() {
    current.value = 'home'
    location.hash = '#/'
    window.scrollTo(0, 0)
  }

  return { current, currentComp, openApp, goHome }
}