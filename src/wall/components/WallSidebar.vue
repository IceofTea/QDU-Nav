<script setup>
/**
 * ════════════════════════════════════════════════════════════════════
 * @模块路径  src/wall/components/WallSidebar.vue
 * @职责      论坛侧栏：俏皮话广告位轮播（后端期换真广告）· 每日签到 +
 *            积分钱包 · 热榜 · 话题热词云 · 分区公告 · 控制台暗门提示
 * @props     hotPosts · topics · points · signed · streak · offline
 * @emits     signIn · openPost(id) · openPart(id)
 * @被谁用    CampusWall.vue（桌面双栏 / 移动折叠）
 * ════════════════════════════════════════════════════════════════════
 */
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { ADS, PARTS, POINTS, levelOf, nextLevel, BADGES } from '../config'
import { getWallet, streakDays } from '../api'

const props = defineProps({
  hotPosts: { type: Array, default: () => [] },
  topics: { type: Array, default: () => [] },
  points: { type: Number, default: 0 },
  signed: { type: Boolean, default: false },
  streak: { type: Number, default: 0 },
  offline: { type: Boolean, default: false }
})
const emit = defineEmits(['signIn', 'openPost', 'openPart'])

/* ── 信任等级与徽章（Discourse 式轻量本土化） ── */
const myLevel = computed(() => levelOf(props.points))
const nextLv = computed(() => nextLevel(props.points))
const lvProgress = computed(() => {
  if (!nextLv.value) return 100
  const base = myLevel.value.min
  return Math.min(100, Math.round(((props.points - base) / (nextLv.value.min - base)) * 100))
})
const myBadges = computed(() => {
  const w = getWallet()
  const stats = {
    streak: props.streak,
    posts: (w.history || []).filter((h) => h.reason === '每日签到').length >= 1 ? 1 : 0,
    replies: 0,
    skills: 0
  }
  // posts/replies 的精确计数由父组件传入更佳，此处以可得数据近似（徽章为演示级激励）
  return BADGES.map((b) => ({ ...b, earned: b.test(w, stats) }))
})

/* 侧栏广告轮播（俏皮话占位） */
const sidebarAds = ADS.filter((a) => a.slot === 'sidebar')
const adIdx = ref(0)
let adTimer = null
const currentAd = computed(() => sidebarAds[adIdx.value % sidebarAds.length])
onMounted(() => { adTimer = setInterval(() => { adIdx.value++ }, 4800) })
onBeforeUnmount(() => { if (adTimer) clearInterval(adTimer) })

const rules = [
  '🟢 发帖 +2 · 回复 +1 · 签到 +2 积分',
  '🟢 悬赏被采纳：回答方 +10 积分',
  '🟢 敏感词实时拦截，广告仅限本栏位',
  '🟢 被举报内容进入管理员队列 24h 处理',
  '🟢 交易请当面验货，谨防任何提前转账'
]
</script>

<template>
  <aside class="ws">
    <!-- 广告位（俏皮话占位） -->
    <div class="ws-card ws-ad" :key="adIdx">
      <div class="ws-ad-head"><span class="ws-ad-tag">广告位</span><span class="ws-ad-nav">第 {{ (adIdx % sidebarAds.length) + 1 }}/{{ sidebarAds.length }} 条 · 轮播中</span></div>
      <b class="ws-ad-title">{{ currentAd.title }}</b>
      <div class="ws-ad-desc">{{ currentAd.desc }}</div>
      <div class="ws-ad-foot">{{ currentAd.tag }} · 本广告由管理员的幽默感赞助 <span class="ws-ad-label">AD</span></div>
    </div>

    <!-- 签到与积分 -->
    <div class="ws-card">
      <div class="ws-card-t">🧧 每日签到 · 积分钱包</div>
      <div class="ws-points">
        <span class="ws-points-num">{{ points }}</span>
        <span class="ws-points-label">我的积分 · 连续 {{ streak }} 天</span>
      </div>
      <div class="ws-level">
        <span class="ws-level-chip" :style="{ background: myLevel.color }">{{ myLevel.icon }} {{ myLevel.name }}</span>
        <span class="ws-level-desc">{{ myLevel.desc }}</span>
      </div>
      <div class="ws-lvbar"><i :style="{ width: lvProgress + '%' }"></i></div>
      <div class="ws-lvnext" v-if="nextLv">{{ nextLv.icon }} 距「{{ nextLv.name }}」还差 {{ nextLv.min - points }} 积分</div>
      <div class="ws-badges">
        <span v-for="b in myBadges" :key="b.id" class="ws-badge" :class="{ earned: b.earned }" :title="b.desc">
          {{ b.icon }}{{ b.earned ? b.name : '' }}
        </span>
      </div>
      <button class="ws-sign" :class="{ done: signed }" :disabled="signed" @click="emit('signIn')">
        {{ signed ? '✓ 今日已签到（+' + POINTS.signIn + '）' : '📅 签到 +' + POINTS.signIn + ' 积分' }}
      </button>
      <div class="ws-points-flow">发帖+{{ POINTS.post }} · 回复+{{ POINTS.reply }} · 采纳+{{ POINTS.adopted }} · 悬赏-{{ POINTS.bountyCost }}</div>
    </div>

    <!-- 热榜 -->
    <div class="ws-card">
      <div class="ws-card-t">🔥 本小时热榜</div>
      <div v-if="hotPosts.length" class="ws-hot">
        <div v-for="(p, i) in hotPosts.slice(0, 5)" :key="p.id" class="ws-hot-item" @click="emit('openPost', p.id)">
          <span class="ws-hot-rank" :class="{ top: i < 3 }">{{ i + 1 }}</span>
          <span class="ws-hot-title">{{ p.title }}</span>
          <span class="ws-hot-num">{{ p.likes || 0 }}</span>
        </div>
      </div>
      <div v-else class="ws-empty">暂无热帖，去发第一条</div>
    </div>

    <!-- 话题热词 -->
    <div v-if="topics.length" class="ws-card">
      <div class="ws-card-t">🏷️ 话题热词</div>
      <div class="ws-topics">
        <span v-for="t in topics" :key="t.word" class="ws-topic" :style="{ fontSize: Math.min(15, 11 + t.n * 1.5) + 'px' }">{{ t.word }}<i>{{ t.n }}</i></span>
      </div>
    </div>

    <!-- 分区导航 -->
    <div class="ws-card">
      <div class="ws-card-t">🗂️ 分区直达</div>
      <div class="ws-parts">
        <button v-for="p in PARTS.filter(x => x.id !== 'all')" :key="p.id" class="ws-part" @click="emit('openPart', p.id)">
          {{ p.icon }} {{ p.name }}
        </button>
      </div>
    </div>

    <!-- 社区公约 -->
    <div class="ws-card">
      <div class="ws-card-t">📜 社区公约（积分与治理）</div>
      <ul class="ws-rules">
        <li v-for="(r, i) in rules" :key="i">{{ r }}</li>
      </ul>
      <div class="ws-offline" v-if="offline">🟡 当前本机模式：积分/帖子仅本机保存，网关连接后自动并轨</div>
      <div class="ws-manage">🛡 管理入口：导航站首页连点 Logo 3 次 · 本站连点评论徽章 5 次</div>
    </div>
  </aside>
</template>

<style scoped>
.ws { display: flex; flex-direction: column; gap: 12px; }
.ws-card { border: 1px solid var(--border, #e5eaf2); background: var(--card, #fff); border-radius: 13px; padding: 13px 14px; }
.ws-card-t { font-size: 13px; font-weight: 800; color: var(--text, #24292f); margin-bottom: 9px; }

.ws-ad { border: 1px dashed #d9770666; background: linear-gradient(140deg, rgba(217, 119, 6, 0.06), transparent); position: relative; overflow: hidden; animation: adIn 0.4s ease; }
@keyframes adIn { from { opacity: 0.3; transform: translateY(4px); } to { opacity: 1; transform: none; } }
.ws-ad-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 7px; }
.ws-ad-tag { font-size: 10.5px; background: #d97706; color: #fff; border-radius: 999px; padding: 2px 9px; font-weight: 700; }
.ws-ad-nav { font-size: 10.5px; color: var(--muted, #8a94a6); }
.ws-ad-title { font-size: 13.5px; color: var(--text, #24292f); }
.ws-ad-desc { font-size: 12.5px; color: var(--muted, #8a94a6); line-height: 1.65; margin-top: 4px; }
.ws-ad-foot { font-size: 10.5px; color: #d97706; margin-top: 7px; display: flex; justify-content: space-between; }
.ws-ad-label { border: 1px solid #d9770655; border-radius: 4px; padding: 0 5px; }

.ws-points { display: flex; align-items: baseline; gap: 9px; }
.ws-points-num { font-size: 30px; font-weight: 800; color: #d97706; font-variant-numeric: tabular-nums; }
.ws-points-label { font-size: 11.5px; color: var(--muted, #8a94a6); }
.ws-level { display: flex; align-items: center; gap: 8px; margin-top: 9px; }
.ws-level-chip { font-size: 12px; font-weight: 800; color: #fff; border-radius: 999px; padding: 3px 12px; }
.ws-level-desc { font-size: 11px; color: var(--muted, #8a94a6); }
.ws-lvbar { height: 6px; background: #eef1f5; border-radius: 999px; overflow: hidden; margin-top: 6px; }
.ws-lvbar i { display: block; height: 100%; background: linear-gradient(90deg, var(--primary, #1b66c9), #4f8df0); border-radius: 999px; transition: width 0.5s; }
.ws-lvnext { font-size: 10.5px; color: var(--muted, #8a94a6); margin-top: 4px; }
.ws-badges { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 9px; }
.ws-badge { font-size: 11px; filter: grayscale(1); opacity: 0.4; background: var(--bg, #f7f9fc); border-radius: 999px; padding: 3px 9px; cursor: help; }
.ws-badge.earned { filter: none; opacity: 1; background: rgba(217, 119, 6, 0.12); color: #b45309; font-weight: 700; }
.ws-sign { width: 100%; margin-top: 9px; border: none; background: linear-gradient(135deg, #d97706, #f59e0b); color: #fff; padding: 9px; border-radius: 10px; font-size: 13.5px; font-weight: 700; cursor: pointer; font-family: inherit; }
.ws-sign.done { background: #21262d; color: var(--muted, #8a94a6); cursor: default; }
.ws-points-flow { font-size: 10.5px; color: var(--muted, #8a94a6); margin-top: 7px; }

.ws-hot { display: flex; flex-direction: column; gap: 7px; }
.ws-hot-item { display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 12.5px; }
.ws-hot-item:hover .ws-hot-title { color: var(--primary, #1b66c9); }
.ws-hot-rank { width: 18px; height: 18px; border-radius: 5px; background: #e5e7eb; color: #6b7280; font-size: 11px; font-weight: 800; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.ws-hot-rank.top { background: #e11d48; color: #fff; }
.ws-hot-title { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--text, #24292f); }
.ws-hot-num { color: var(--muted, #8a94a6); font-size: 11px; }

.ws-topics { display: flex; flex-wrap: wrap; gap: 7px; }
.ws-topic { color: var(--primary, #1b66c9); background: var(--primary-soft, rgba(27, 102, 201, 0.08)); border-radius: 999px; padding: 3px 11px; font-weight: 600; }
.ws-topic i { font-style: normal; font-size: 10px; color: var(--muted, #8a94a6); margin-left: 4px; }

.ws-parts { display: flex; flex-wrap: wrap; gap: 6px; }
.ws-part { border: 1px solid var(--border, #e5eaf2); background: transparent; color: var(--text, #24292f); font-size: 12px; padding: 4px 10px; border-radius: 999px; cursor: pointer; font-family: inherit; }
.ws-part:hover { border-color: var(--primary, #1b66c9); color: var(--primary, #1b66c9); }

.ws-rules { margin: 0; padding-left: 17px; font-size: 11.5px; color: var(--muted, #8a94a6); line-height: 1.9; }
.ws-offline { margin-top: 8px; font-size: 11px; color: #b45309; background: rgba(245, 158, 11, 0.1); border-radius: 7px; padding: 6px 9px; }
.ws-manage { margin-top: 8px; font-size: 10.5px; color: var(--muted, #8a94a6); border-top: 1px dashed var(--border, #e5eaf2); padding-top: 7px; }
.ws-empty { font-size: 12px; color: var(--muted, #8a94a6); padding: 4px 0; }
</style>
