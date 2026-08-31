<script setup>
import { SITE } from '../config/site'
import { campusStats } from '../data/apps'
import { useI18n } from '../i18n'

const { t, lang } = useI18n()
const emit = defineEmits(['enter'])
</script>

<template>
  <div class="welcome">
    <div class="welcome-bg"></div>
    <div class="welcome-inner">
      <div class="welcome-logo"><span>{{ SITE.brand }}</span></div>
      <h1 class="welcome-title">{{ t('site.name') }}</h1>
      <p class="welcome-sub">{{ t('site.tagline') }}</p>
      <div class="welcome-motto">{{ t('site.motto') }}</div>

      <div class="welcome-badges">
        <span class="welcome-badge">{{ campusStats.campuses }} {{ lang === 'en' ? 'Campuses' : '大校区' }}</span>
        <span class="welcome-badge">{{ campusStats.colleges }} {{ lang === 'en' ? 'Colleges + Medical School' : '个学院 + 医学部' }}</span>
        <span class="welcome-badge">{{ campusStats.majors }} {{ lang === 'en' ? 'Undergraduate Programs' : '个本科备案专业' }}</span>
      </div>

      <button class="welcome-btn" @click="emit('enter')">{{ t('home.enterBtn') }}</button>

      <p class="welcome-tip">{{ t('site.welcomeTip') }}</p>
    </div>
  </div>
</template>
