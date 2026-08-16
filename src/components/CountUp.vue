<script setup>
import { ref, onMounted, watch } from 'vue'

const props = defineProps({
  value: { type: Number, default: 0 }
})

const display = ref(0)

function animate() {
  const target = props.value
  if (target === display.value) return
  if (document.hidden) { display.value = target; return }
  const start = display.value
  const diff = target - start
  const duration = 900
  const t0 = performance.now()
  function step(t) {
    const p = Math.min(1, (t - t0) / duration)
    const eased = 1 - Math.pow(1 - p, 3)
    display.value = Math.round(start + diff * eased)
    if (p < 1) requestAnimationFrame(step)
    else display.value = target
  }
  requestAnimationFrame(step)
}

onMounted(animate)
watch(() => props.value, animate)
</script>

<template>
  <span class="count-up">{{ display }}</span>
</template>