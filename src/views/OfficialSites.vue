<script setup>
import { ref } from 'vue'
import { officialGroups, colleges, emergency } from '../data/official'

const emit = defineEmits(['back'])
const tab = ref('official')

const groups = officialGroups
const collegeList = colleges
</script>

<template>
  <div class="view-top">
    <button class="back-btn" @click="emit('back')">← 返回首页</button>
    <div class="view-title">学校官网</div>
    <div class="view-sub">青岛大学官方网站与各学院官网大全</div>
  </div>

  <div class="panel">
    <div class="seg">
      <button class="seg-btn" :class="{ active: tab === 'official' }" @click="tab = 'official'">🏛️ 官方网站</button>
      <button class="seg-btn" :class="{ active: tab === 'college' }" @click="tab = 'college'">🎓 学院官网</button>
      <button class="seg-btn" :class="{ active: tab === 'phone' }" @click="tab = 'phone'">📞 常用电话</button>
    </div>

    <template v-if="tab === 'official'">
      <div v-for="g in groups" :key="g.name" class="official-group">
        <h4 class="group-name">{{ g.icon }} {{ g.name }}</h4>
        <a v-for="s in g.sites" :key="s.url" class="site-link" :href="s.url" target="_blank" rel="noopener">
          <span class="site-name">{{ s.name }}</span>
          <span class="site-desc">{{ s.desc }}</span>
          <span class="site-go">↗</span>
        </a>
      </div>
    </template>

    <template v-else-if="tab === 'college'">
      <div class="college-grid">
        <a v-for="c in collegeList" :key="c.name" class="college-card" :href="c.url" target="_blank" rel="noopener">
          <span class="college-name">{{ c.name }}</span>
          <span class="college-go">↗</span>
        </a>
      </div>
      <p class="muted">学院名单依据青岛大学本科招生信息网「学院专业」整理，如有变动以学校官网为准。</p>
    </template>

    <template v-else>
      <div class="phone-list">
        <div v-for="(v, k) in emergency" :key="k" class="phone-row">
          <span class="phone-name">{{ k }}</span>
          <span class="phone-num">{{ v }}</span>
        </div>
      </div>
      <p class="muted">紧急求助请优先拨打 110 / 120 / 119。</p>
    </template>
  </div>
</template>