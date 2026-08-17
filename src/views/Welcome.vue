<script setup>
/** 欢迎初始页：品牌展示 + 进入入口（文案来自 src/config/site.js） */
import { SITE } from '../config/site'
import { campusStats } from '../data/apps'

const emit = defineEmits(['enter'])
</script>

<template>
  <div class="welcome">
    <div class="welcome-bg"></div>
    <div class="welcome-inner">
      <div class="welcome-logo"><span>{{ SITE.brand }}</span></div>
      <h1 class="welcome-title">{{ SITE.name }}</h1>
      <p class="welcome-sub">{{ SITE.tagline }}</p>
      <div class="welcome-motto">{{ SITE.motto }}</div>

      <div class="welcome-badges">
        <span class="welcome-badge">{{ campusStats.campuses }} 大校区</span>
        <span class="welcome-badge">{{ campusStats.colleges }} 个学院 + 医学部</span>
        <span class="welcome-badge">{{ campusStats.majors }} 个本科备案专业</span>
      </div>

      <button class="welcome-btn" @click="emit('enter')">进入校园导航 →</button>

      <p class="welcome-tip">{{ SITE.welcomeTip }}</p>
    </div>
  </div>
</template>