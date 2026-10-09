<script setup>
/**
 * ════════════════════════════════════════════════════════════════════
 * @模块路径  src/views/BuildingGallery.vue
 * @职责      楼宇图鉴：38KB 真实教务排课数据可视化——楼宇卡片（校区/楼层/
 *            教室数）→ 点开楼层房间格子图 → 房间一键复制/跳教室导航查占用
 * @路由      #/app/buildingGallery（apps.js + router.js 双登记）
 * @数据      src/data/classrooms.js（scripts/gen-classrooms.mjs 从真实
 *            课程总表生成：buildings[{name,campus,zone,desc,floors[{floor,rooms[]}],mapUrl}]）
 * @交互      校区筛选 · 楼名/房间号搜索 · 楼层切换 · 房间格子（占用状态跳转）
 *            高德地图外链 · 真实数据零编造
 * ════════════════════════════════════════════════════════════════════
 */
import { ref, computed, onMounted } from 'vue'
import { buildings } from '../data/classrooms.js'

const emit = defineEmits(['open', 'back'])

const kw = ref('')
const campus = ref('全部')
const active = ref(null)   // 选中的楼宇
const floorIdx = ref(0)

const campuses = computed(() => ['全部', ...new Set(buildings.map((b) => b.campus).filter(Boolean))])

const filtered = computed(() => {
  let list = buildings
  if (campus.value !== '全部') list = list.filter((b) => b.campus === campus.value)
  const q = kw.value.trim().toLowerCase()
  if (q) {
    list = list.filter((b) =>
      (b.name || '').toLowerCase().includes(q) ||
      (b.nameEn || '').toLowerCase().includes(q) ||
      (b.zone || '').includes(q) ||
      (b.floors || []).some((f) => (f.rooms || []).some((r) => String(r).toLowerCase().includes(q)))
    )
  }
  return list
})

const stats = computed(() => {
  const rooms = buildings.reduce((a, b) => a + (b.floors || []).reduce((x, f) => x + (f.rooms || []).length, 0), 0)
  return { buildings: buildings.length, floors: buildings.reduce((a, b) => a + (b.floors || []).length, 0), rooms }
})

const curFloor = computed(() => active.value && active.value.floors ? active.value.floors[Math.min(floorIdx.value, active.value.floors.length - 1)] : null)

function openBuilding(b, i) {
  active.value = b
  floorIdx.value = 0
  void i
}
function backToList() { active.value = null }

function copyRoom(r) {
  try {
    navigator.clipboard.writeText(String(r))
    showToast('已复制教室号 ' + r)
  } catch { /* noop */ }
}
function gotoNav(r) {
  try { localStorage.setItem('navContextRoom', String(r)) } catch { /* noop */ }
  emit('open', 'classroomNav')
}
function showToast(msg) {
  toast.value = msg
  setTimeout(() => { toast.value = '' }, 2200)
}
const toast = ref('')

function clearKw() { kw.value = ''; campus.value = '全部' }
onMounted(() => { /* 静态数据无需加载 */ })
</script>

<template>
  <div class="bg2">
    <div class="bg-head">
      <button v-if="!active" class="bg-back" @click="emit('back')">‹ 返回</button>
      <button v-else class="bg-back" @click="backToList">‹ 返回列表</button>
      <div class="bg-title">🏛️ 楼宇图鉴
        <span class="bg-sub">{{ stats.buildings }} 栋 · {{ stats.floors }} 层 · {{ stats.rooms }} 间教室（真实排课数据生成）</span>
      </div>
      <input v-model="kw" class="bg-search" placeholder="搜楼名 / 房间号，如 301 或 实验楼" />
    </div>

    <!-- ===== 列表视图 ===== -->
    <template v-if="!active">
      <div class="bg-filters">
        <button v-for="c in campuses" :key="c" class="bg-filter" :class="{ on: campus === c }" @click="campus = c">{{ c }}</button>
        <span class="bg-hint">共 {{ filtered.length }} 栋 · 点击卡片查看楼层与房间</span>
      </div>

      <div v-if="!filtered.length" class="bg-empty">没有匹配的楼宇——换个关键词或<button class="bg-inline" @click="clearKw">清除筛选</button></div>

      <div class="bg-grid">
        <div v-for="b in filtered" :key="b.name" class="bg-card" @click="openBuilding(b)">
          <div class="bg-card-head">
            <b>{{ b.name }}</b>
            <span class="bg-campus">{{ b.campus }}</span>
          </div>
          <div class="bg-card-en">{{ b.nameEn }}</div>
          <div class="bg-card-desc">{{ b.desc }}</div>
          <div class="bg-card-stats">
            <span>🏢 {{ b.zone || '—' }}</span>
            <span>📶 {{ (b.floors || []).length }} 层</span>
            <span>🚪 {{ (b.floors || []).reduce((a, f) => a + (f.rooms || []).length, 0) }} 间</span>
          </div>
        </div>
      </div>
    </template>

    <!-- ===== 详情视图 ===== -->
    <template v-else>
      <div class="bg-detail">
        <div class="bg-detail-head">
          <div>
            <div class="bg-detail-name">{{ active.name }} <span class="bg-campus">{{ active.campus }}</span></div>
            <div class="bg-detail-desc">{{ active.desc }}</div>
          </div>
          <a v-if="active.mapUrl" class="bg-map" :href="active.mapUrl" target="_blank" rel="noopener">🗺️ 高德地图 ↗</a>
        </div>

        <!-- 楼层切换 -->
        <div class="bg-floors">
          <button v-for="(f, i) in active.floors" :key="f.floor" class="bg-floor" :class="{ on: floorIdx === i }" @click="floorIdx = i">
            {{ f.floor }}<i>{{ (f.rooms || []).length }}</i>
          </button>
        </div>

        <!-- 房间格子 -->
        <div v-if="curFloor" class="bg-rooms">
          <div class="bg-rooms-title">{{ curFloor.floor }} · {{ (curFloor.rooms || []).length }} 间
            <span>点击房间 → 复制 · 双击 → 查占用与路线</span>
          </div>
          <div class="bg-roomgrid">
            <button v-for="r in curFloor.rooms" :key="r" class="bg-room"
              :class="{ hit: kw && String(r).includes(kw.trim()) }"
              @click="copyRoom(r)" @dblclick="gotoNav(r)">
              {{ r }}
            </button>
          </div>
        </div>

        <!-- 楼层指引 -->
        <div v-if="(active.route || []).length" class="bg-route">
          <div class="bg-route-t">🧭 到达指引（通用指引，以实地指示为准）</div>
          <div v-for="(r, i) in active.route" :key="i" class="bg-route-step">{{ i + 1 }}. {{ r }}</div>
        </div>
        <div class="bg-tip">💡 单击房间复制编号 · 双击直接打开教室导航查实时占用与路线 · 数据由 scripts/gen-classrooms.mjs 从课程总表生成</div>
      </div>
    </template>

    <div v-if="toast" class="bg-toast">{{ toast }}</div>
  </div>
</template>

<style scoped>
.bg2 { display: flex; flex-direction: column; gap: 13px; }
.bg-head { display: flex; align-items: center; gap: 11px; flex-wrap: wrap; }
.bg-back { border: 1px solid var(--border, #e5eaf2); background: var(--card, #fff); color: var(--text, #24292f); border-radius: 999px; padding: 6px 14px; cursor: pointer; font-family: inherit; font-size: 13px; }
.bg-title { flex: 1; font-size: 17px; font-weight: 800; color: var(--text, #24292f); min-width: 200px; }
.bg-sub { display: block; font-size: 11px; color: var(--muted, #8a94a6); font-weight: 400; margin-top: 2px; }
.bg-search { border: 1px solid var(--border, #e5eaf2); border-radius: 999px; padding: 7px 15px; font-size: 13px; font-family: inherit; background: var(--card, #fff); color: var(--text, #24292f); outline: none; min-width: 200px; flex: 1; max-width: 320px; }
.bg-search:focus { border-color: var(--primary, #1b66c9); }

.bg-filters { display: flex; gap: 7px; align-items: center; flex-wrap: wrap; }
.bg-filter { border: 1px solid var(--border, #e5eaf2); background: var(--card, #fff); color: var(--muted, #8a94a6); font-size: 12.5px; padding: 5px 14px; border-radius: 999px; cursor: pointer; font-family: inherit; }
.bg-filter.on { background: var(--primary, #1b66c9); border-color: var(--primary, #1b66c9); color: #fff; font-weight: 600; }
.bg-hint { font-size: 11.5px; color: var(--muted, #8a94a6); margin-left: auto; }
.bg-empty { padding: 40px; text-align: center; color: var(--muted, #8a94a6); }
.bg-inline { border: none; background: var(--primary, #1b66c9); color: #fff; border-radius: 999px; padding: 3px 13px; cursor: pointer; font-family: inherit; font-size: 12px; margin-left: 6px; }

.bg-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(255px, 1fr)); gap: 12px; }
.bg-card { border: 1px solid var(--border, #e5eaf2); background: var(--card, #fff); border-radius: 14px; padding: 14px 16px; cursor: pointer; transition: transform 0.15s, box-shadow 0.15s; }
.bg-card:hover { transform: translateY(-3px); box-shadow: 0 8px 22px rgba(0, 0, 0, 0.08); }
.bg-card-head { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
.bg-card-head b { font-size: 15px; color: var(--text, #24292f); }
.bg-campus { font-size: 10.5px; background: var(--primary-soft, rgba(27, 102, 201, 0.1)); color: var(--primary, #1b66c9); border-radius: 999px; padding: 2px 9px; font-weight: 700; }
.bg-card-en { font-size: 11px; color: var(--muted, #8a94a6); margin-top: 2px; }
.bg-card-desc { font-size: 12px; color: var(--text, #24292f); margin-top: 7px; line-height: 1.6; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.bg-card-stats { display: flex; gap: 12px; margin-top: 9px; font-size: 11.5px; color: var(--muted, #8a94a6); }

.bg-detail { border: 1px solid var(--border, #e5eaf2); background: var(--card, #fff); border-radius: 14px; padding: 17px 19px; }
.bg-detail-head { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; flex-wrap: wrap; }
.bg-detail-name { font-size: 18px; font-weight: 800; color: var(--text, #24292f); display: flex; align-items: center; gap: 9px; }
.bg-detail-desc { font-size: 12.5px; color: var(--muted, #8a94a6); margin-top: 5px; line-height: 1.6; }
.bg-map { font-size: 12.5px; color: var(--primary, #1b66c9); text-decoration: none; border: 1px solid var(--primary, #1b66c9); border-radius: 999px; padding: 6px 15px; }
.bg-map:hover { background: var(--primary, #1b66c9); color: #fff; }

.bg-floors { display: flex; gap: 7px; flex-wrap: wrap; margin-top: 14px; }
.bg-floor { border: 1px solid var(--border, #e5eaf2); background: var(--bg, #f7f9fc); color: var(--text, #24292f); padding: 6px 15px; border-radius: 9px; cursor: pointer; font-family: inherit; font-size: 13px; font-weight: 700; display: flex; gap: 7px; align-items: center; }
.bg-floor i { font-style: normal; font-size: 10.5px; background: var(--primary-soft, rgba(27, 102, 201, 0.12)); color: var(--primary, #1b66c9); border-radius: 999px; padding: 1px 7px; }
.bg-floor.on { background: var(--primary, #1b66c9); border-color: var(--primary, #1b66c9); color: #fff; }
.bg-floor.on i { background: rgba(255, 255, 255, 0.25); color: #fff; }

.bg-rooms { margin-top: 15px; }
.bg-rooms-title { font-size: 13.5px; font-weight: 800; color: var(--text, #24292f); margin-bottom: 9px; display: flex; justify-content: space-between; flex-wrap: wrap; }
.bg-rooms-title span { font-size: 11px; color: var(--muted, #8a94a6); font-weight: 400; }
.bg-roomgrid { display: grid; grid-template-columns: repeat(auto-fill, minmax(74px, 1fr)); gap: 8px; }
.bg-room { border: 1px solid var(--border, #e5eaf2); background: var(--bg, #f7f9fc); color: var(--text, #24292f); border-radius: 9px; padding: 10px 4px; font-size: 13.5px; font-weight: 700; cursor: pointer; font-family: inherit; transition: all 0.12s; font-variant-numeric: tabular-nums; }
.bg-room:hover { border-color: var(--primary, #1b66c9); color: var(--primary, #1b66c9); transform: translateY(-2px); }
.bg-room.hit { background: rgba(217, 119, 6, 0.15); border-color: #d97706; color: #d97706; animation: bgPulse 1s infinite; }
@keyframes bgPulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(217, 119, 6, 0.4); } 50% { box-shadow: 0 0 0 5px rgba(217, 119, 6, 0); } }

.bg-route { margin-top: 15px; background: var(--bg, #f7f9fc); border-radius: 11px; padding: 12px 14px; }
.bg-route-t { font-size: 13px; font-weight: 800; color: var(--text, #24292f); margin-bottom: 7px; }
.bg-route-step { font-size: 12.5px; color: var(--text, #24292f); line-height: 1.8; }
.bg-tip { font-size: 11.5px; color: var(--muted, #8a94a6); margin-top: 13px; line-height: 1.7; }

.bg-toast { position: fixed; bottom: 92px; left: 50%; transform: translateX(-50%); background: var(--primary, #1b66c9); color: #fff; padding: 9px 22px; border-radius: 999px; font-size: 13px; box-shadow: 0 8px 26px rgba(0, 0, 0, 0.2); z-index: 960; }
</style>
