<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { apiFetch } from '../api'
import { previewTerms, defaultTermIdx } from '../data/calendarPreview'

const emit = defineEmits(['back'])

const fallbackLinks = [
  { title: '青岛大学2026~2027学年校历', date: '2026-05-01', url: 'https://jwc.qdu.edu.cn/info/1005/6515.htm' },
  { title: '青岛大学2025~2026学年校历', date: '2025-04-22', url: 'https://jwc.qdu.edu.cn/info/1005/5861.htm' },
  { title: '青岛大学教务处官网', date: '', url: 'https://jwc.qdu.edu.cn/' }
]

const calendars = ref(fallbackLinks)
const loading = ref(true)
const refreshing = ref(false)
const online = ref(false)
const fetchedAt = ref('')
const costMs = ref(null)
const cached = ref(false)

const termIdx = ref(defaultTermIdx())
const brokenImgs = ref(new Set())
const currentTerm = computed(() => previewTerms[termIdx.value])

const imgLoading = ref(true)
const imgLoaded = ref(false)
function onImgLoad() { imgLoading.value = false; imgLoaded.value = true }
function onImgError() { imgLoading.value = false; imgLoaded.value = false; brokenImgs.value.add(currentTerm.value.id) }

function switchTerm(i) {
  termIdx.value = Math.max(0, Math.min(previewTerms.length - 1, Number(i)))
  imgLoading.value = true
  imgLoaded.value = false
}

const showPreview = ref(false)
const zoom = ref(1)
const panX = ref(0)
const panY = ref(0)
const dragPx = ref(0)
let dragStart = null
const suppressClick = ref(false)

const dragging = ref(false)
let dragRawDx = 0
const trackStyle = computed(() => ({
  transform: `translateX(calc(${termIdx.value * 100}% + ${dragPx.value}px))`,
  transition: dragging.value ? 'none' : 'transform .42s cubic-bezier(.22, .9, .3, 1)',
}))
const zoomedStyle = computed(() => ({ transform: `translate(${panX.value}px, ${panY.value}px) scale(${zoom.value})` }))
function openPreview() { showPreview.value = true; resetView() }
function closePreview() { showPreview.value = false }
function resetView() { zoom.value = 1; panX.value = 0; panY.value = 0; dragPx.value = 0 }
function zoomIn() { zoom.value = Math.min(4, +(zoom.value + 0.5).toFixed(1)) }
function zoomOut() {
  zoom.value = Math.max(1, +(zoom.value - 0.5).toFixed(1))
  if (zoom.value <= 1.01) { panX.value = 0; panY.value = 0 }
}
function onDragStart(cx, cy) {
  if (zoom.value > 1) dragStart = { mode: 'pan', x: cx, y: cy, ox: panX.value, oy: panY.value }
  else { dragStart = { mode: 'swipe', x: cx, y: cy }; dragging.value = true }
}
function onDragMove(cx, cy) {
  if (!dragStart) return
  if (dragStart.mode === 'pan') {
    panX.value = dragStart.ox + (cx - dragStart.x)
    panY.value = dragStart.oy + (cy - dragStart.y)
  } else {
    const dx = cx - dragStart.x
    dragRawDx = dx
    const atFirst = termIdx.value <= 0 && dx < 0
    const atLast = termIdx.value >= previewTerms.length - 1 && dx > 0
    dragPx.value = (atFirst || atLast) ? Math.round(dx * 0.35) : dx
  }
}
function endPan() {
  if (!dragStart) return
  const wasSwipe = dragStart.mode === 'swipe'
  const moved = Math.abs(dragRawDx)
  dragStart = null
  if (wasSwipe) {
    if (moved > 8) {
      suppressClick.value = true
      setTimeout(() => { suppressClick.value = false }, 0)
    }
    if (dragRawDx > 60 && termIdx.value < previewTerms.length - 1) switchTerm(termIdx.value + 1)
    else if (dragRawDx < -60 && termIdx.value > 0) switchTerm(termIdx.value - 1)
    dragPx.value = 0
    dragRawDx = 0
    setTimeout(() => { dragging.value = false }, 450)
  }
}
function onClickCapture(e) {
  if (suppressClick.value) {
    e.stopPropagation()
    e.preventDefault()
  }
}
function stepTerm(dir) {
  if (zoom.value > 1) return
  const next = termIdx.value + dir
  if (next < 0 || next >= previewTerms.length) return
  switchTerm(next)
}
const slideDir = ref('fwd')
function goTerm(i, dir) {
  const next = Math.max(0, Math.min(previewTerms.length - 1, Number(i)))
  if (next === termIdx.value) return
  slideDir.value = dir === 'back' ? 'back' : (dir === 'fwd' ? 'fwd' : (next > termIdx.value ? 'back' : 'fwd'))
  termIdx.value = next
  imgLoading.value = false
}
function onSelectTerm(e) {
  const next = Number(e.target.value)
  goTerm(next, next > termIdx.value ? 'back' : 'fwd')
}
function onKey(e) {
  if (!showPreview.value) return
  if (e.key === 'Escape') closePreview()
  if (e.key === '+' || e.key === '=') zoomIn()
  if (e.key === '-') zoomOut()
  if (e.key === 'ArrowLeft') stepTerm(1)
  if (e.key === 'ArrowRight') stepTerm(-1)
}
onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => window.removeEventListener('keydown', onKey))

const terms = [
  {
    term: '2026-2027 学年 · 第一学期（秋季）',
    items: [
      { name: '本科新生报到', time: '以录取通知书为准（参考：9 月上旬）' },
      { name: '新生入学教育 & 军训', time: '报到后约两周' },
      { name: '秋季学期教学周', time: '约 9 月初 ～ 次年 1 月中旬' },
      { name: '期末考试周', time: '学期末最后两周' },
      { name: '寒假', time: '约 1 月中旬 ～ 2 月底' }
    ]
  },
  {
    term: '2026-2027 学年 · 第二学期（春季）',
    items: [
      { name: '春季学期开学', time: '约 2 月底 / 3 月初' },
      { name: '春季学期教学周', time: '约 3 月初 ～ 7 月初' },
      { name: '校运动会', time: '一般在四月份举行' },
      { name: '期末考试周', time: '学期末' },
      { name: '暑假', time: '约 7 月上旬 ～ 9 月' }
    ]
  }
]

const load = async (force) => {
  refreshing.value = true
  const r = await apiFetch('/calendar' + (force ? '?force=1' : ''))
  if (r && Array.isArray(r.items) && r.items.length) {
    calendars.value = r.items
    online.value = true
    fetchedAt.value = r.fetchedAt
    costMs.value = r.costMs
    cached.value = r.cached
  }
  refreshing.value = false
  loading.value = false
}

onMounted(load)
</script>
<template>
  <div class="view-top">
    <button class="back-btn" @click="emit('back')">← 返回首页</button>
    <div class="view-title">校历</div>
    <div class="view-sub">校历原图预览 · 官方页面直达 · 放假安排一览</div>
  </div>

  <div v-if="!loading" class="source-bar">
    <span class="dot" :class="online ? 'live' : 'off'"></span>
    <span>{{ online ? '官方实时数据' : '官方接口暂不可达，展示演示链接' }}</span>
    <span class="sep">·</span>
    <span>来源 jwc.qdu.edu.cn</span>
    <template v-if="online">
      <span class="sep">·</span>
      <span>抓取于 {{ new Date(fetchedAt).toLocaleTimeString('zh-CN', { hour12: false }) }}</span>
      <template v-if="costMs"><span class="sep">·</span><span>耗时 {{ costMs }}ms</span></template>
      <span v-if="cached" class="sep">·</span><span v-if="cached">命中缓存</span>
    </template>
    <button class="refresh-btn" :disabled="refreshing" @click="load(true)">{{ refreshing ? '刷新中…' : '🔄 刷新' }}</button>
  </div>

  <div class="panel" style="margin-bottom:16px;">
    <div class="section-title" style="margin:0 0 12px;"><span class="bar"></span>🗓️ 校历预览</div>

    <div class="cal-toolbar">
      <button class="cal-nav-btn" :disabled="termIdx >= previewTerms.length - 1" title="上一学年" @click="goTerm(termIdx + 1, 'back')">←</button>
      <select class="cal-term-select" :value="termIdx" @change="onSelectTerm">
        <option v-for="(t, i) in previewTerms" :key="t.id" :value="i">{{ t.label }}</option>
      </select>
      <button class="cal-nav-btn" :disabled="termIdx <= 0" title="下一学年" @click="goTerm(termIdx - 1, 'fwd')">→</button>
    </div>

    <div v-if="brokenImgs.has(currentTerm.id)" class="cal-error">
      校历图片加载失败 ·
      <a :href="currentTerm.sourceUrl" target="_blank" rel="noopener">打开教务处原文页 ↗</a>
    </div>
    <div v-else class="cal-shell" @click="openPreview()">
      <div v-if="imgLoading && !imgLoaded" class="cal-skeleton">校历加载中…</div>
      <Transition :name="'cal-' + slideDir">
        <img
          :key="currentTerm.id"
          class="cal-img"
          :src="currentTerm.image"
          :alt="currentTerm.label"
          @load="onImgLoad"
          @error="onImgError"
        />
      </Transition>
      <div class="cal-hint">🔍 点击全屏查看（缩放拖动 · 左右滑动切换学年）</div>
    </div>
    <div class="cal-src-line">
      来源：
      <a :href="currentTerm.sourceUrl" target="_blank" rel="noopener">教务处校历通知原文 ↗</a>
      <template v-if="currentTerm.pdf">
        <span class="muted"> · </span>
        <a :href="currentTerm.pdf" target="_blank" rel="noopener">PDF 原件 ↗</a>
      </template>
      <span class="muted">（图片为教务处公开发布的校历原图本地快照）</span>
    </div>
  </div>

  <div class="panel" style="margin-bottom:16px;">
    <div class="section-title" style="margin:0 0 14px;"><span class="bar"></span>📎 官方校历</div>
    <div v-if="loading" class="skeleton-list">
      <div v-for="i in 4" :key="i" class="skeleton-row">
        <div class="skeleton" style="width:80px;height:22px;"></div>
        <div class="skeleton" style="flex:1;height:14px;"></div>
      </div>
    </div>
    <div v-else class="cal-list">
      <a v-for="l in calendars" :key="l.url" class="cal-item" :href="l.url" target="_blank" rel="noopener">
        <span class="cal-title">{{ l.title }}</span>
        <span v-if="l.date" class="cal-date">{{ l.date }}</span>
        <span class="cal-go">查看官方页 ↗</span>
      </a>
    </div>
  </div>
  <div v-for="t in terms" :key="t.term" class="panel" style="margin-bottom:16px;">
    <div class="section-title" style="margin:0 0 14px;"><span class="bar"></span>{{ t.term }}</div>
    <div style="position:relative;padding-left:22px;">
      <div
        v-for="(it, i) in t.items"
        :key="it.name"
        style="position:relative;padding-bottom:16px;border-left:2px solid var(--border);padding-left:18px;margin-left:8px;"
        :style="{ borderLeft: i === t.items.length - 1 ? '2px solid transparent' : '2px solid var(--border)' }"
      >
        <span
          style="position:absolute;left:-7px;top:2px;width:12px;height:12px;border-radius:50%;background:var(--primary);"
        ></span>
        <div style="font-weight:600;">{{ it.name }}</div>
        <div class="muted" style="font-size:13px;">{{ it.time }}</div>
      </div>
    </div>
  </div>
  <div class="panel" style="background:var(--notice-bg);border-color:var(--notice-border);">
    <div style="font-weight:700;color:var(--notice-text);">💡 提示</div>
    <div class="muted" style="font-size:13px;margin-top:6px;line-height:1.8;">
      「校历预览」为教务处公开发布的校历原图本地快照（2019~2020 学年起有图，2019~2020 学年含说明页），支持左右滑动 / 按钮切换与全屏缩放；更早学年（2012~2018）请通过「官方校历」列表前往教务处页面查看。时间线为社区按往年规律整理，仅供参考；具体教学周与放假安排请以教务处官网为准。
    </div>
  </div>
  <teleport to="body">
    <div v-if="showPreview" class="cal-modal" @click.self="closePreview" @click.capture="onClickCapture">
      <div class="cal-modal-toolbar" @click.stop>
        <button class="cal-zoom-btn" @click="zoomOut">−</button>
        <span class="cal-zoom-num">{{ Math.round(zoom * 100) }}%</span>
        <button class="cal-zoom-btn" @click="zoomIn">＋</button>
        <button class="cal-zoom-btn" @click="resetView">1:1</button>
        <span class="cal-modal-term">{{ currentTerm.label }}</span>
        <button class="cal-close-btn" @click="closePreview">✕ 关闭</button>
      </div>
      <div
        class="cal-modal-body"
        @click.self="closePreview"
        @mousedown.prevent="onDragStart($event.clientX, $event.clientY)"
        @mousemove="onDragMove($event.clientX, $event.clientY)"
        @mouseup="endPan"
        @mouseleave="endPan"
      >
        <button class="cal-side-btn left" :disabled="termIdx >= previewTerms.length - 1" @click.stop="stepTerm(1)" title="上一学年">‹</button>
        <div class="cal-viewport" @touchstart.prevent="onDragStart($event.touches[0].clientX, $event.touches[0].clientY)" @touchmove.prevent="onDragMove($event.touches[0].clientX, $event.touches[0].clientY)" @touchend="endPan">
          <div v-if="zoom > 1" class="cal-zoom-layer" @wheel.prevent>
            <img class="cal-modal-img zoomed" :src="currentTerm.image" :alt="currentTerm.label" :style="zoomedStyle" draggable="false" />
          </div>
          <div v-else class="cal-track" :style="trackStyle">
            <div v-for="(t, i) in previewTerms" :key="t.id" class="cal-slide">
              <img
                :class="{ active: i === termIdx }"
                :src="t.image"
                :alt="t.label"
                loading="lazy"
                draggable="false"
                @load="i === termIdx && (imgLoading = false, imgLoaded = true)"
                @error="i === termIdx && (imgLoading = false, imgLoaded = false, brokenImgs.add(t.id))"
              />
            </div>
          </div>
        </div>
        <button class="cal-side-btn right" :disabled="termIdx <= 0" @click.stop="stepTerm(-1)" title="下一学年">›</button>
      </div>
      <div class="cal-modal-tip" @click.stop>💡 未放大时左右拖动丝滑切换学年 · 点击 ＋ 放大后可拖动查看细节</div>
    </div>
  </teleport>
</template>
<style scoped>
.cal-toolbar { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
.cal-nav-btn { width: 36px; height: 36px; border-radius: 50%; border: 1px solid var(--border); background: var(--card); color: var(--text); font-size: 16px; cursor: pointer; transition: all .15s; flex-shrink: 0; }
.cal-nav-btn:hover:not(:disabled) { border-color: var(--primary); color: var(--primary); }
.cal-nav-btn:disabled { opacity: .35; cursor: not-allowed; }
.cal-term-select { flex: 1; min-width: 0; padding: 8px 12px; border: 1px solid var(--border); border-radius: var(--radius); background: var(--card); color: var(--text); font-size: 13px; outline: none; }

.cal-shell { position: relative; border-radius: var(--radius); overflow: hidden; border: 1px solid var(--border); background: var(--soft-fg); cursor: zoom-in; min-height: 120px; display: flex; align-items: center; justify-content: center; }
.cal-skeleton { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 13px; color: var(--text-sub); z-index: 1; }
.cal-img { width: 100%; height: auto; max-height: 420px; object-fit: contain; display: block; }
.cal-back-enter-active, .cal-back-leave-active, .cal-fwd-enter-active, .cal-fwd-leave-active { transition: transform .42s cubic-bezier(.22, .9, .3, 1), opacity .42s ease; }
.cal-back-leave-active, .cal-fwd-leave-active { position: absolute; top: 0; left: 0; }
.cal-back-enter-from { transform: translateX(-45%); opacity: 0; }
.cal-back-leave-to { transform: translateX(45%); opacity: 0; }
.cal-fwd-enter-from { transform: translateX(45%); opacity: 0; }
.cal-fwd-leave-to { transform: translateX(-45%); opacity: 0; }
.cal-hint { position: absolute; left: 0; right: 0; bottom: 0; text-align: center; font-size: 11px; color: #fff; background: linear-gradient(transparent, rgba(0,0,0,.55)); padding: 18px 0 8px; pointer-events: none; opacity: 0; transition: opacity .2s; }
.cal-shell:hover .cal-hint { opacity: 1; }
.cal-error { padding: 24px 12px; text-align: center; font-size: 13px; color: var(--text-sub); background: var(--soft-fg); border: 1px dashed var(--border); border-radius: var(--radius); }
.cal-src-line { margin-top: 8px; font-size: 12px; color: var(--text-sub); }
.cal-src-line a { color: var(--primary); }

.cal-modal { position: fixed; inset: 0; z-index: 999; background: rgba(0,0,0,.88); display: flex; flex-direction: column; }
.cal-modal-toolbar { display: flex; align-items: center; gap: 10px; justify-content: center; padding: 12px; flex-wrap: wrap; }
.cal-zoom-btn { min-width: 40px; height: 36px; padding: 0 12px; border-radius: 999px; border: 1px solid rgba(255,255,255,.35); background: rgba(255,255,255,.12); color: #fff; font-size: 15px; cursor: pointer; transition: all .15s; }
.cal-zoom-btn:hover { background: rgba(255,255,255,.25); }
.cal-zoom-num { color: #fff; font-size: 13px; min-width: 48px; text-align: center; }
.cal-close-btn { height: 36px; padding: 0 16px; border-radius: 999px; border: none; background: var(--primary); color: #fff; font-size: 13px; cursor: pointer; }
.cal-modal-body { flex: 1; overflow: hidden; display: flex; align-items: center; justify-content: center; position: relative; touch-action: none; }
.cal-viewport { width: 100%; height: 100%; overflow: hidden; display: flex; align-items: center; }
.cal-track { display: flex; flex-direction: row-reverse; height: 100%; width: 100%; will-change: transform; }
.cal-slide { flex: 0 0 100%; display: flex; align-items: center; justify-content: center; min-width: 0; padding: 0 8px; }
.cal-slide img { max-width: 100%; max-height: 88vh; object-fit: contain; user-select: none; box-shadow: 0 12px 48px rgba(0,0,0,.5); opacity: .45; transform: scale(.94); transition: opacity .35s ease, transform .35s ease; }
.cal-slide img.active { opacity: 1; transform: scale(1); }
.cal-zoom-layer { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; overflow: hidden; }
.cal-modal-img.zoomed { cursor: grab; }
.cal-modal-img.zoomed:active { cursor: grabbing; }
.cal-side-btn { position: absolute; top: 50%; transform: translateY(-50%); z-index: 3; width: 44px; height: 60px; border: none; border-radius: 12px; background: rgba(255,255,255,.14); color: #fff; font-size: 28px; cursor: pointer; transition: all .15s; line-height: 1; }
.cal-side-btn:hover:not(:disabled) { background: rgba(255,255,255,.3); }
.cal-side-btn:disabled { opacity: .2; cursor: not-allowed; }
.cal-side-btn.left { left: 10px; }
.cal-side-btn.right { right: 10px; }
.cal-modal-term { color: #fff; font-size: 13px; font-weight: 700; min-width: 0; max-width: 40vw; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cal-modal-tip { text-align: center; color: rgba(255,255,255,.65); font-size: 11px; padding: 8px 12px 12px; }
</style>
