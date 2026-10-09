<script setup>
/**
 * ════════════════════════════════════════════════════════════════════
 * @模块路径  src/wall/components/WallPostCard.vue
 * @职责      帖子卡片：按 type 渲染（普通/投票/悬赏/资源/公示）+ 楼层信息 +
 *            操作栏（赞/表情/回复/收藏/举报/分享）+ 广告位内嵌（feed 槽）
 * @props     post:Object（必填）· index:Number（feed 广告插入位）· compact:Boolean
 * @emits     open(帖子id) · like · react · reply · report · vote · adopt · fav
 * @被谁用    CampusWall.vue 帖子流
 * @设计      父组件管数据，本组件纯展示+事件上抛（保持可测试、可复用）
 * ════════════════════════════════════════════════════════════════════
 */
import { computed } from 'vue'
import { partOf, POST_TYPES, ADS, hotScore } from '../config.js'

const props = defineProps({
  post: { type: Object, required: true },
  index: { type: Number, default: 0 },
  compact: { type: Boolean, default: false },
  fav: { type: Boolean, default: false },
  myVoted: { type: Boolean, default: false }
})
const emit = defineEmits(['open', 'like', 'react', 'reply', 'report', 'vote', 'adopt', 'fav'])

const part = computed(() => partOf(props.post.tag))
const typeMeta = computed(() => POST_TYPES.find((t) => t.id === props.post.type) || POST_TYPES[0])
const reactions = computed(() => {
  const r = props.post.reactions || {}
  return ['👍', '😂', '🤔', '❤️', '🎉'].map((e) => ({ e, n: r[e] || 0 }))
})
const totalVotes = computed(() =>
  props.post.vote ? (props.post.vote.tallies || []).reduce((a, b) => a + b, 0) : 0
)

function fmt(ts) {
  const diff = (Date.now() - ts) / 1000
  if (diff < 60) return '刚刚'
  if (diff < 3600) return Math.floor(diff / 60) + ' 分钟前'
  if (diff < 86400) return Math.floor(diff / 3600) + ' 小时前'
  const d = new Date(ts)
  return (d.getMonth() + 1) + '-' + d.getDate()
}
function pct(i) {
  const t = props.post.vote.tallies || []
  const total = t.reduce((a, b) => a + b, 0)
  return total ? Math.round(((t[i] || 0) / total) * 100) : 0
}
function maxPct() {
  const t = props.post.vote.tallies || []
  return Math.max(...t.map((_, i) => pct(i)))
}

/** feed 位第 3、8 条插入俏皮话广告（演示密度约 15%） */
const feedAd = computed(() => {
  if (props.compact) return null
  if (props.index === 2) return ADS.filter((a) => a.slot === 'feed')[0] || null
  if (props.index === 7) return ADS.filter((a) => a.slot === 'feed')[1] || null
  return null
})
void hotScore
</script>

<template>
  <div class="pc" :class="{ compact }">
    <!-- 标题行 -->
    <div class="pc-meta">
      <span class="pc-part" :style="{ color: part.color, borderColor: part.color + '55' }">{{ part.icon }} {{ part.name }}</span>
      <b class="pc-author">{{ post.author }}</b>
      <span v-if="post.status === 'top'" class="pc-badge top">📌 置顶</span>
      <span v-if="post.best" class="pc-badge best">🌟 已采纳</span>
      <span v-if="post.type && post.type !== 'normal'" class="pc-badge type">{{ typeMeta.icon }} {{ typeMeta.name }}</span>
      <span class="pc-time">{{ fmt(post.ts) }}</span>
      <span class="pc-hot" v-if="post.views">👁 {{ post.views }}</span>
      <button class="pc-report" title="举报" @click.stop="emit('report', post)">🚩</button>
    </div>

    <!-- 标题与正文 -->
    <div class="pc-title" @click="emit('open', post.id)">{{ post.title }}</div>
    <div class="pc-content" :class="{ clamped: !compact && post.content.length > 160 }" @click="emit('open', post.id)">{{ post.content }}</div>

    <!-- 投票块 -->
    <div v-if="post.vote" class="pc-vote">
      <div class="pc-vote-q">🗳 {{ post.vote.question }}</div>
      <div v-for="(o, i) in post.vote.options" :key="i" class="pc-vote-opt" :class="{ done: myVoted }">
        <button class="pc-vote-btn" :disabled="myVoted" @click.stop="emit('vote', post, i)">
          <span>{{ o }}</span><span v-if="myVoted" class="pc-vote-pct">{{ pct(i) }}%</span>
        </button>
        <div v-if="myVoted" class="pc-vote-bar"><i :class="{ win: pct(i) === maxPct() }" :style="{ width: pct(i) + '%' }"></i></div>
      </div>
      <div class="pc-vote-foot">{{ myVoted ? '共 ' + totalVotes + ' 票 · 每人一票' : '每人每帖一票' }}</div>
    </div>

    <!-- 悬赏块 -->
    <div v-if="post.bounty" class="pc-bounty">
      <span class="pc-bounty-money">💰 赏金 {{ post.bounty.points }} 积分</span>
      <span class="pc-bounty-tip">{{ post.bounty.adoptedId ? '已采纳结算' : '回答被楼主采纳即可获得赏金（本地积分演示）' }}</span>
    </div>

    <!-- 资源块 -->
    <div v-if="post.resource" class="pc-resource">
      <div class="pc-res-row">📦 <a :href="post.resource.url" target="_blank" rel="noopener" @click.stop>{{ post.resource.title || post.resource.url }}</a></div>
      <div v-if="post.resource.code" class="pc-res-row">🔑 提取码：<code>{{ post.resource.code }}</code>
        <button class="pc-mini" @click.stop="navigator.clipboard && navigator.clipboard.writeText(post.resource.code)">复制</button>
      </div>
      <div class="pc-res-row muted">⬇️ {{ post.resource.downloads || 0 }} 次下载 · 链接有效性由分享者负责</div>
    </div>

    <!-- 信息公示强调线 -->
    <div v-if="post.type === 'notice'" class="pc-notice-line">📢 信息公开 · 内容经管理员审核可申请加精置顶</div>

    <!-- 操作栏 -->
    <div class="pc-actions">
      <button class="pc-act" @click.stop="emit('like', post)">👍 {{ post.likes || 0 }}</button>
      <span class="pc-reacts">
        <button v-for="r in reactions" :key="r.e" class="pc-react" :class="{ on: r.n }" @click.stop="emit('react', post, r.e)">
          {{ r.e }}<template v-if="r.n"> {{ r.n }}</template><template v-else>＋</template>
        </button>
      </span>
      <button class="pc-act" @click.stop="emit('open', post.id)">💬 {{ (post.replies || []).length }}</button>
      <button class="pc-act" :class="{ on: fav }" @click.stop="emit('fav', post)">⭐{{ fav ? ' 已藏' : ' 收藏' }}</button>
      <button class="pc-act" @click.stop="emit('reply', post)">↩️ 回复</button>
      <span class="pc-hot-score" title="热度分（时间衰减+互动加权）">🔥 {{ hotScore(post).toFixed(1) }}</span>
    </div>

    <!-- feed 广告位（俏皮话占位，后端期换真广告——见 config.API_CONTRACT.ads） -->
    <div v-if="feedAd" class="pc-ad">
      <span class="pc-ad-tag">{{ feedAd.tag }}</span>
      <div class="pc-ad-body">
        <b>{{ feedAd.title }}</b>
        <span>{{ feedAd.desc }}</span>
      </div>
      <span class="pc-ad-label">广告</span>
    </div>
  </div>
</template>

<style scoped>
.pc { border: 1px solid var(--border, #e5eaf2); background: var(--card, #fff); border-radius: 14px; padding: 14px 16px; transition: box-shadow 0.15s; }
.pc:hover { box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06); }
.pc.compact { padding: 11px 13px; }

.pc-meta { display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--muted, #8a94a6); flex-wrap: wrap; }
.pc-part { font-size: 11px; border: 1px solid; border-radius: 999px; padding: 1px 9px; font-weight: 600; background: transparent; }
.pc-author { color: var(--text, #24292f); font-size: 13px; }
.pc-badge { font-size: 10.5px; padding: 1px 8px; border-radius: 999px; font-weight: 700; }
.pc-badge.top { background: #e11d4818; color: #e11d48; }
.pc-badge.best { background: #d9770618; color: #d97706; }
.pc-badge.type { background: var(--primary-soft, rgba(27, 102, 201, 0.1)); color: var(--primary, #1b66c9); }
.pc-time { margin-left: auto; }
.pc-hot { font-size: 11px; }
.pc-report { border: none; background: none; cursor: pointer; font-size: 12px; opacity: 0.55; padding: 0; }
.pc-report:hover { opacity: 1; }

.pc-title { font-size: 15.5px; font-weight: 700; color: var(--text, #24292f); margin-top: 8px; line-height: 1.5; cursor: pointer; }
.pc-content { font-size: 13.5px; color: var(--text, #24292f); line-height: 1.7; margin-top: 5px; white-space: pre-wrap; word-break: break-word; cursor: pointer; }
.pc-content.clamped { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }

.pc-vote { margin-top: 10px; border: 1px solid var(--border, #e5eaf2); border-radius: 11px; padding: 10px 12px; background: var(--bg, #f7f9fc); }
.pc-vote-q { font-weight: 700; font-size: 13px; margin-bottom: 8px; color: var(--text, #24292f); }
.pc-vote-opt { position: relative; margin-bottom: 6px; }
.pc-vote-btn { width: 100%; display: flex; justify-content: space-between; border: 1px solid var(--border, #e5eaf2); background: var(--card, #fff); border-radius: 8px; padding: 7px 12px; font-size: 12.5px; font-family: inherit; color: var(--text, #24292f); cursor: pointer; position: relative; z-index: 1; }
.pc-vote-btn:not(:disabled):hover { border-color: var(--primary, #1b66c9); }
.pc-vote-btn:disabled { cursor: default; }
.pc-vote-pct { font-weight: 800; color: var(--primary, #1b66c9); }
.pc-vote-bar { position: absolute; inset: 0; border-radius: 8px; overflow: hidden; }
.pc-vote-bar i { display: block; height: 100%; background: rgba(27, 102, 201, 0.14); transition: width 0.5s; }
.pc-vote-bar i.win { background: rgba(46, 125, 50, 0.22); }
.pc-vote-foot { font-size: 11px; color: var(--muted, #8a94a6); }

.pc-bounty { margin-top: 9px; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; background: rgba(217, 119, 6, 0.08); border-radius: 9px; padding: 7px 12px; }
.pc-bounty-money { font-weight: 800; color: #d97706; font-size: 13.5px; }
.pc-bounty-tip { font-size: 11.5px; color: var(--muted, #8a94a6); }

.pc-resource { margin-top: 9px; border: 1px dashed #2563eb55; background: #2563eb08; border-radius: 10px; padding: 9px 12px; display: flex; flex-direction: column; gap: 5px; font-size: 12.5px; }
.pc-res-row a { color: var(--primary, #1b66c9); font-weight: 600; word-break: break-all; }
.pc-res-row code { background: var(--bg, #f0f2f5); padding: 1px 8px; border-radius: 5px; font-size: 12px; }
.pc-res-row .muted, .pc-res-row.muted { color: var(--muted, #8a94a6); font-size: 11.5px; }
.pc-mini { border: 1px solid var(--border, #e5eaf2); background: var(--card, #fff); border-radius: 6px; font-size: 11px; padding: 1px 8px; cursor: pointer; font-family: inherit; margin-left: 6px; }

.pc-notice-line { margin-top: 8px; font-size: 11.5px; color: #0891b2; background: #0891b20e; border-radius: 7px; padding: 5px 10px; }

.pc-actions { display: flex; align-items: center; gap: 12px; margin-top: 10px; flex-wrap: wrap; }
.pc-act { border: none; background: transparent; color: var(--muted, #8a94a6); font-size: 12.5px; cursor: pointer; font-family: inherit; padding: 0; }
.pc-act:hover, .pc-act.on { color: var(--primary, #1b66c9); }
.pc-reacts { display: inline-flex; gap: 5px; }
.pc-react { border: 1px solid var(--border, #e5eaf2); background: transparent; border-radius: 999px; font-size: 11.5px; padding: 1px 7px; cursor: pointer; font-family: inherit; color: var(--muted, #8a94a6); }
.pc-react:hover, .pc-react.on { border-color: var(--primary, #1b66c9); color: var(--primary, #1b66c9); }
.pc-hot-score { margin-left: auto; font-size: 11px; color: #d97706; font-variant-numeric: tabular-nums; }

.pc-ad { display: flex; align-items: center; gap: 10px; margin-top: 11px; border: 1px dashed #d9770666; background: linear-gradient(120deg, rgba(217, 119, 6, 0.05), rgba(217, 119, 6, 0.015)); border-radius: 11px; padding: 9px 12px; }
.pc-ad-tag { font-size: 10.5px; background: #d97706; color: #fff; border-radius: 999px; padding: 2px 9px; font-weight: 700; flex-shrink: 0; }
.pc-ad-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; font-size: 12px; color: var(--muted, #8a94a6); }
.pc-ad-body b { color: var(--text, #24292f); font-size: 13px; }
.pc-ad-label { font-size: 10px; color: #d97706; border: 1px solid #d9770655; border-radius: 4px; padding: 0 5px; flex-shrink: 0; }
</style>
