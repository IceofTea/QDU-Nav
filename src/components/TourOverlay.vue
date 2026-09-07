<script setup>
/**
 * 新手引导覆盖层组件
 * ---------------------------------------------------------------------------
 * 使用 fixed 定位确保弹窗始终在视口内可见。
 */
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useTour } from '../utils/useTour'

const { isActive, currentStep, currentStepData, totalSteps, isFirstStep, isLastStep, nextStep, prevStep, completeTour, skipTour } = useTour()

const tooltipRef = ref(null)
const highlightRect = ref({ top: 0, left: 0, width: 0, height: 0 })
const tooltipStyle = ref({})
const arrowDir = ref('bottom')
const isVisible = ref(false)

function getTargetRect(selector) {
  if (!selector) return null
  const el = document.querySelector(selector)
  if (!el) return null
  const rect = el.getBoundingClientRect()
  return { top: rect.top, left: rect.left, width: rect.width, height: rect.height, bottom: rect.bottom, right: rect.right }
}

function calculatePosition() {
  const step = currentStepData.value
  if (!step) return

  const rect = getTargetRect(step.target)
  if (!rect || rect.width === 0) {
    highlightRect.value = { top: window.innerHeight / 2 - 30, left: window.innerWidth / 2 - 100, width: 200, height: 60 }
    tooltipStyle.value = { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: Math.min(320, window.innerWidth - 32) + 'px' }
    arrowDir.value = 'none'
    return
  }

  const padding = 8
  highlightRect.value = { top: rect.top - padding, left: rect.left - padding, width: rect.width + padding * 2, height: rect.height + padding * 2 }

  const tooltipWidth = Math.min(320, window.innerWidth - 32)
  const tooltipHeight = 200
  const gap = 12
  const viewW = window.innerWidth
  const viewH = window.innerHeight
  const targetCenterX = rect.left + rect.width / 2

  const preferredDir = step.placement || 'bottom'
  let top, left, dir

  const positions = {
    bottom: { top: rect.bottom + gap, left: targetCenterX - tooltipWidth / 2, dir: 'bottom' },
    top: { top: rect.top - tooltipHeight - gap, left: targetCenterX - tooltipWidth / 2, dir: 'top' },
    left: { top: rect.top + rect.height / 2 - tooltipHeight / 2, left: rect.left - tooltipWidth - gap, dir: 'left' },
    right: { top: rect.top + rect.height / 2 - tooltipHeight / 2, left: rect.right + gap, dir: 'right' }
  }

  function isInViewport(pos) { return pos.top >= 8 && pos.top + tooltipHeight <= viewH - 8 && pos.left >= 8 && pos.left + tooltipWidth <= viewW - 8 }

  if (isInViewport(positions[preferredDir])) {
    ({ top, left, dir } = positions[preferredDir])
  } else {
    const dirs = ['bottom', 'top', 'right', 'left']
    let found = false
    for (const d of dirs) {
      if (isInViewport(positions[d])) { ({ top, left, dir } = positions[d]); found = true; break }
    }
    if (!found) {
      top = rect.bottom + gap
      left = (viewW - tooltipWidth) / 2
      dir = 'bottom'
      if (top + tooltipHeight > viewH - 8) { top = rect.top - tooltipHeight - gap; dir = 'top' }
    }
  }

  if (left < 8) left = 8
  if (left + tooltipWidth > viewW - 8) left = viewW - tooltipWidth - 8

  tooltipStyle.value = { position: 'fixed', top: top + 'px', left: left + 'px', width: tooltipWidth + 'px' }
  arrowDir.value = dir
}

function scrollToTarget() {
  const step = currentStepData.value
  if (!step?.target) return
  const el = document.querySelector(step.target)
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

watch(currentStep, () => {
  nextTick(() => {
    scrollToTarget()
    setTimeout(calculatePosition, 100)
  })
})

watch(isActive, (val) => {
  if (val) { isVisible.value = true; nextTick(calculatePosition) }
  else { isVisible.value = false }
})

function handleResize() { calculatePosition() }
function handleScroll() { calculatePosition() }
function handleKeydown(e) {
  if (e.key === 'Escape') skipTour()
  else if (e.key === 'ArrowRight' || e.key === 'Enter') { e.preventDefault(); nextStep() }
  else if (e.key === 'ArrowLeft') { e.preventDefault(); prevStep() }
}

onMounted(() => {
  window.addEventListener('resize', handleResize)
  window.addEventListener('scroll', handleScroll, true)
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  window.removeEventListener('scroll', handleScroll, true)
  window.removeEventListener('keydown', handleKeydown)
})

function handleOverlayClick(e) { if (e.target.classList.contains('tour-overlay')) skipTour() }
</script>

<template>
  <Teleport to="body">
    <div v-if="isVisible && isActive" class="tour-overlay" @click="handleOverlayClick">
      <div class="tour-mask"></div>
      <div class="tour-highlight-area" :style="{ top: highlightRect.top + 'px', left: highlightRect.left + 'px', width: highlightRect.width + 'px', height: highlightRect.height + 'px' }"></div>
      <div class="tour-highlight-border" :style="{ top: highlightRect.top + 'px', left: highlightRect.left + 'px', width: highlightRect.width + 'px', height: highlightRect.height + 'px' }"></div>
      <div ref="tooltipRef" class="tour-tooltip" :class="`tour-tooltip--${arrowDir}`" :style="tooltipStyle" @click.stop>
        <div class="tour-arrow" :class="`tour-arrow--${arrowDir}`"></div>
        <div class="tour-steps">
          <span v-for="(_, idx) in totalSteps" :key="idx" class="tour-step-dot" :class="{ 'tour-step-dot--active': idx === currentStep, 'tour-step-dot--done': idx < currentStep }"></span>
          <span class="tour-step-text">{{ currentStep + 1 }}/{{ totalSteps }}</span>
        </div>
        <div class="tour-content">
          <div class="tour-header">
            <span v-if="currentStepData?.icon" class="tour-icon">{{ currentStepData.icon }}</span>
            <h4 class="tour-title">{{ currentStepData?.title }}</h4>
          </div>
          <p class="tour-desc">{{ currentStepData?.content }}</p>
        </div>
        <div class="tour-actions">
          <button class="tour-btn tour-btn--skip" @click="skipTour">跳过</button>
          <div class="tour-actions-right">
            <button v-if="!isFirstStep" class="tour-btn tour-btn--prev" @click="prevStep">‹</button>
            <button class="tour-btn tour-btn--next" @click="nextStep">{{ isLastStep ? '完成 ✓' : '下一步 ›' }}</button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.tour-overlay { position: fixed; inset: 0; z-index: 9999; pointer-events: auto; }
.tour-mask { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.45); }
.tour-highlight-area { position: fixed; background: transparent; z-index: 1; border-radius: 12px; }
.tour-highlight-border { position: fixed; border: 3px solid var(--primary); border-radius: 12px; pointer-events: none; z-index: 2; box-shadow: 0 0 0 4px rgba(27, 102, 201, 0.2), 0 0 20px rgba(27, 102, 201, 0.15); animation: tour-pulse 2s ease-in-out infinite; }
@keyframes tour-pulse { 0%, 100% { box-shadow: 0 0 0 4px rgba(27, 102, 201, 0.2), 0 0 20px rgba(27, 102, 201, 0.15); } 50% { box-shadow: 0 0 0 8px rgba(27, 102, 201, 0.1), 0 0 30px rgba(27, 102, 201, 0.2); } }
.tour-tooltip { z-index: 1000; background: var(--card); border-radius: 14px; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25); overflow: visible; max-height: calc(100vh - 32px); overflow-y: auto; }
.tour-arrow { position: absolute; width: 14px; height: 14px; background: var(--card); transform: rotate(45deg); z-index: -1; }
.tour-arrow--bottom { top: -7px; left: 50%; margin-left: -7px; box-shadow: -2px -2px 4px rgba(0, 0, 0, 0.05); }
.tour-arrow--top { bottom: -7px; left: 50%; margin-left: -7px; box-shadow: 2px 2px 4px rgba(0, 0, 0, 0.05); }
.tour-arrow--left { right: -7px; top: 50%; margin-top: -7px; }
.tour-arrow--right { left: -7px; top: 50%; margin-top: -7px; }
.tour-steps { display: flex; align-items: center; justify-content: center; gap: 6px; padding: 14px 16px 0; }
.tour-step-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--border); transition: all 0.2s ease; }
.tour-step-dot--active { background: var(--primary); transform: scale(1.2); }
.tour-step-dot--done { background: var(--primary-soft); }
.tour-step-text { font-size: 11px; color: var(--text-light); margin-left: 8px; }
.tour-content { padding: 12px 16px 8px; }
.tour-header { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
.tour-icon { font-size: 22px; }
.tour-title { font-size: 15px; font-weight: 700; color: var(--text); margin: 0; }
.tour-desc { font-size: 13px; line-height: 1.6; color: var(--text-sub); margin: 0; }
.tour-actions { display: flex; justify-content: space-between; align-items: center; padding: 8px 14px 12px; }
.tour-actions-right { display: flex; gap: 6px; }
.tour-btn { padding: 7px 14px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; border: none; transition: all 0.15s ease; font-family: inherit; }
.tour-btn--skip { background: transparent; color: var(--text-light); padding: 7px 10px; }
.tour-btn--skip:hover { color: var(--text-sub); }
.tour-btn--prev { background: var(--soft-gray); color: var(--text-sub); width: 36px; height: 36px; padding: 0; display: flex; align-items: center; justify-content: center; font-size: 18px; }
.tour-btn--prev:hover { background: var(--hover-bg); }
.tour-btn--next { background: var(--primary); color: #fff; }
.tour-btn--next:hover { opacity: 0.9; }
@media (max-width: 480px) { .tour-tooltip { max-width: calc(100vw - 24px); } .tour-content { padding: 10px 14px 6px; } .tour-actions { padding: 6px 12px 10px; } }
</style>
