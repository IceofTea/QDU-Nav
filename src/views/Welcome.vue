<script setup>
const emit = defineEmits(['enter'])
</script>

<template>
  <div class="welcome">
    <div class="welcome-bg"></div>
    <div class="welcome-inner">
      <div class="welcome-logo"><span>QDU-Nav</span></div>
      <h1 class="welcome-title">QDU 校园导航</h1>
      <p class="welcome-sub">青岛大学 · 校园服务聚合入口</p>
      <div class="welcome-motto">明德 · 博学 · 守正 · 出奇</div>

      <div class="welcome-badges">
        <span class="welcome-badge">3 大校区</span>
        <span class="welcome-badge">28 个学院 + 医学部</span>
        <span class="welcome-badge">90 个本科备案专业</span>
      </div>

      <button class="welcome-btn" @click="emit('enter')">进入校园导航 →</button>

      <p class="welcome-tip">非官方校园服务聚合演示站 · 数据仅供学习交流</p>
    </div>
  </div>
</template>