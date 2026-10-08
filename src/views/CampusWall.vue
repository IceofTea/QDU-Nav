<script setup>
/**
 * ════════════════════════════════════════════════════════════════════
 * @模块路径  src/views/CampusWall.vue
 * @职责      校园墙（超级论坛）装配页：分区/排序/搜索/发帖/详情/侧栏 调度中心
 *            —— 模块拆分见 src/wall/（config 配置 · api 数据层 · components UI）
 * @路由      #/app/campusWall（apps.js + router.js 双登记）
 * @数据      社区网关 /api/wall（跨用户）；网关未连 → localStorage 本机模式
 * @交互      发帖5类型 · 投票 · 悬赏采纳 · 资源分享 · 楼中楼 · 表情 · 收藏 ·
 *            签到积分 · 热榜话题 · 广告位 · 敏感词双端校验 · 20s 准实时轮询
 * @被谁用    App.vue 路由；Agent 工作流（看墙/发墙/失物/悬赏）深链本页
 * ════════════════════════════════════════════════════════════════════
 */
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { PARTS } from '../wall/config'
import {
  loadPosts, createPost, likePost, replyPost, reportPost, castVote,
  reactPost, searchPosts, getWallet, signInToday, signedToday, streakDays,
  hotTopics, hasVotedLocal, viewPost, favCount
} from '../wall/api'
import WallPostCard from '../wall/components/WallPostCard.vue'
import WallComposer from '../wall/components/WallComposer.vue'
import WallSidebar from '../wall/components/WallSidebar.vue'
import WallThread from '../wall/components/WallThread.vue'

const emit = defineEmits(['back'])

/* ── 状态 ── */
const tab = ref('all')            // 分区
const sort = ref('hot')           // hot | new | top
const keyword = ref('')           // 搜索
const posts = ref([])
const offline = ref(false)
const loading = ref(true)
const composerOpen = ref(false)
const busy = ref(false)
const toast = ref('')
const toastErr = ref(false)
const words = ref([])
const detailId = ref(null)        // 非空 = 详情模式
let timer = null

/* 积分 / 签到 */
const wallet = ref(getWallet())
const signed = ref(signedToday())
const streak = ref(streakDays())

const detailPost = computed(() => posts.value.find((p) => p.id === detailId.value) || null)
const filtered = computed(() => {
  let list = keyword.value.trim() ? searchPosts(posts.value, keyword.value) : posts.value
  return list
})
const hotPosts = computed(() =>
  posts.value.slice().sort((a, b) => hotScoreSafe(b) - hotScoreSafe(a)).slice(0, 6)
)
const topics = computed(() => hotTopics(posts.value, 6))
const favN = ref(favCount())

function hotScoreSafe(p) {
  const ageH = (Date.now() - (p.ts || 0)) / 3600000
  const engage = (p.likes || 0) * 3 + ((p.replies || []).length) * 2 + (p.views || 0) * 0.1
  return engage / Math.pow(ageH + 2, 1.1)
}

function showToast(msg, err) {
  toast.value = msg
  toastErr.value = !!err
  setTimeout(() => { toast.value = '' }, 3000)
}

/* ── 数据加载（20s 准实时轮询） ── */
async function refresh() {
  const r = await loadPosts({ tag: tab.value, sort: sort.value })
  posts.value = r.posts
  offline.value = r.offline
  loading.value = false
}
function switchTab(id) { tab.value = id; detailId.value = null; refresh() }
function switchSort(s) { sort.value = s; refresh() }

async function onPublish(payload) {
  busy.value = true
  try {
    const r = await createPost(payload)
    showToast(r.offline ? '已发布（本机模式，网关连接后全员可见）' : '已发布 ✓ 全站实时可见')
    composerOpen.value = false
    wallet.value = getWallet()
    await refresh()
    if (r.post) detailId.value = null
  } catch (e) {
    showToast(e.message, true)
  } finally {
    busy.value = false
  }
}

async function onLike(p) {
  const r = await likePost(p.id)
  p.likes = r.likes
  if (r.offline) showToast('已点赞（本机）')
}

async function onReact(p, emoji) {
  try { p.reactions = await reactPost(p.id, emoji) } catch (e) { showToast(e.message, true) }
}

async function onVote(p, index) {
  if (p.myVoted || hasVotedLocal(p.id)) { showToast('你已经投过票了', true); return }
  try {
    const r = await castVote(p.id, index)
    p.vote.tallies = r.tallies
    p.myVoted = true
    showToast('投票成功 ✓')
  } catch (e) {
    showToast(e.message, true)
  }
}

async function onReport(p) {
  const reason = prompt('举报原因（进入管理员队列）：', '疑似违规/广告')
  if (reason === null) return
  const ok = await reportPost(p.id, reason)
  showToast(ok ? '已收到举报，管理员将尽快处理 ✓' : '举报失败：网关未连接', !ok)
}

async function onReplyInThread(content, author) {
  if (!detailPost.value) return
  try {
    await replyPost(detailPost.value.id, content, author)
    showToast('回复成功 ✓')
    wallet.value = getWallet()
    await refresh()
  } catch (e) {
    showToast(e.message, true)
  }
}

function onAdopt(reply) {
  const p = detailPost.value
  if (!p || !p.bounty) return
  if (!confirm(`采纳「${reply.author}」的回答？将结算 ${p.bounty.points} 积分给对方。`)) return
  p.bounty.adoptedId = reply.id
  p.best = true
  // 本地结算演示；后端期走 POST /api/wall/:id/adopt（见 config.API_CONTRACT）
  showToast('已采纳 ✓ 赏金结算接口已预留（后端期自动切换）')
}

function onOpen(id) { detailId.value = id; const p = posts.value.find((x) => x.id === id); if (p) viewPost(id) }

function doSignIn() {
  const r = signInToday()
  if (r.already) { showToast('今天已签到'); return }
  showToast(`签到成功 +${r.gained} 积分（共 ${r.points}）`)
  signed.value = true
  streak.value = streakDays()
  wallet.value = getWallet()
}

onMounted(async () => {
  await Promise.all([refresh(), loadWords()])
  timer = setInterval(() => { if (!document.hidden && !detailId.value) refresh() }, 20000)
})
onBeforeUnmount(() => { if (timer) clearInterval(timer) })

async function loadWords() {
  try {
    const r = await fetch('/api/moderation/words')
    const d = await r.json()
    words.value = d.words || []
  } catch { words.value = [] }
}
</script>

<template>
  <div class="cw">
    <!-- 头部 -->
    <div class="cw-head">
      <button class="cw-back" @click="emit('back')">‹ 返回</button>
      <div class="cw-title">🧱 校园墙 <span class="cw-sub">论坛 · 求助悬赏 · 资源公示 · 二手拼车</span></div>
      <div class="cw-stats">
        <span class="cw-stat" title="我的积分">🧧 {{ wallet.points }}</span>
        <span class="cw-stat" title="收藏">⭐ {{ favN }}</span>
      </div>
      <input v-model="keyword" class="cw-search" placeholder="搜帖子、话题、关键词…" />
      <button class="cw-post" @click="composerOpen = !composerOpen">{{ composerOpen ? '收起' : '✏️ 发帖' }}</button>
    </div>

    <!-- 状态条 -->
    <div class="cw-status" :class="offline ? 'off' : 'on'">
      {{ offline ? '🟡 本机模式：帖子/积分仅本机保存 · 启动社区网关（node server/index.mjs）后自动并轨全员共享'
                 : '🟢 社区网关已连接 · 20 秒准实时 · 敏感词双端校验 · 管理台实时审核' }}
      <span v-if="keyword && filtered.length !== posts.length" class="cw-searchhint">搜索「{{ keyword }}」命中 {{ filtered.length }} 条</span>
    </div>

    <!-- 发帖器 -->
    <WallComposer v-if="composerOpen" :words="words" :busy="busy" :points="wallet.points"
      @publish="onPublish" @cancel="composerOpen = false" ref="composer" />

    <!-- 分区 tabs -->
    <div class="cw-tabs">
      <button v-for="p in PARTS" :key="p.id" class="cw-tab" :class="{ on: tab === p.id }" @click="switchTab(p.id)">
        {{ p.icon }} {{ p.name }}
      </button>
    </div>

    <!-- 排序 -->
    <div class="cw-sorts">
      <button class="cw-sort" :class="{ on: sort === 'hot' }" @click="switchSort('hot')">🔥 热门</button>
      <button class="cw-sort" :class="{ on: sort === 'new' }" @click="switchSort('new')">⏱ 最新</button>
      <button class="cw-sort" :class="{ on: sort === 'top' }" @click="switchSort('top')">📌 置顶/精华</button>
      <span class="cw-hint">共 {{ filtered.length }} 帖 · 楼中楼 / 投票 / 悬赏 / 资源 / 广告位全支持</span>
    </div>

    <!-- 主体：feed + 侧栏 -->
    <div class="cw-grid">
      <section class="cw-feed">
        <!-- 详情模式 -->
        <WallThread v-if="detailPost" :post="detailPost" :offline="offline" :words="words"
          @back="detailId = null" @reply="onReplyInThread" @adopt="onAdopt"
          @report="onReport" @like="onLike" @react="onReact" @vote="onVote" />

        <!-- 列表模式 -->
        <template v-else>
          <div v-if="loading" class="cw-empty">加载中…</div>
          <div v-else-if="!filtered.length" class="cw-empty">
            {{ keyword ? '没有匹配「' + keyword + '」的帖子，换个词试试' : '这个分区还很安静，来发第一帖 📮' }}
          </div>
          <template v-else>
            <WallPostCard
              v-for="(p, i) in filtered" :key="p.id" :post="p" :index="i"
              :fav="false" :my-voted="p.myVoted || hasVotedLocal(p.id)"
              @open="onOpen" @like="onLike" @react="onReact" @report="onReport"
              @vote="onVote" @reply="onOpen" @fav="showToast('已在详情页收藏')"
            />
            <!-- 离线草稿提示 -->
            <div v-if="offline" class="cw-draftnote">🟡 以上含本机草稿 · 网关连接后自动同步为全员可见</div>
          </template>
        </template>
      </section>

      <WallSidebar
        :hot-posts="hotPosts" :topics="topics" :points="wallet.points"
        :signed="signed" :streak="streak" :offline="offline"
        @sign-in="doSignIn" @open-post="onOpen" @open-part="switchTab"
      />
    </div>

    <div v-if="toast" class="cw-toast" :class="{ err: toastErr }">{{ toast }}</div>
  </div>
</template>

<style scoped>
.cw { display: flex; flex-direction: column; gap: 12px; }

.cw-head { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.cw-back { border: 1px solid var(--border, #e5eaf2); background: var(--card, #fff); color: var(--text, #24292f); border-radius: 999px; padding: 6px 14px; cursor: pointer; font-family: inherit; font-size: 13px; }
.cw-title { font-size: 17px; font-weight: 800; color: var(--text, #24292f); }
.cw-sub { font-size: 11.5px; color: var(--muted, #8a94a6); font-weight: 400; margin-left: 6px; }
.cw-stats { display: flex; gap: 8px; }
.cw-stat { font-size: 12.5px; background: var(--card, #fff); border: 1px solid var(--border, #e5eaf2); border-radius: 999px; padding: 4px 12px; color: var(--text, #24292f); font-weight: 600; }
.cw-search { flex: 1; min-width: 160px; border: 1px solid var(--border, #e5eaf2); border-radius: 999px; padding: 7px 15px; font-size: 13px; font-family: inherit; background: var(--card, #fff); color: var(--text, #24292f); outline: none; }
.cw-search:focus { border-color: var(--primary, #1b66c9); }
.cw-post { border: none; background: var(--primary, #1b66c9); color: #fff; padding: 8px 18px; border-radius: 999px; cursor: pointer; font-family: inherit; font-size: 13.5px; font-weight: 600; }

.cw-status { font-size: 12px; padding: 8px 13px; border-radius: 9px; display: flex; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
.cw-status.on { background: rgba(46, 125, 50, 0.1); color: #2e7d32; }
.cw-status.off { background: rgba(245, 158, 11, 0.12); color: #b45309; }
.cw-searchhint { font-weight: 700; }

.cw-tabs { display: flex; gap: 6px; flex-wrap: wrap; }
.cw-tab { border: 1px solid var(--border, #e5eaf2); background: var(--card, #fff); color: var(--muted, #8a94a6); font-size: 12.5px; padding: 5px 13px; border-radius: 999px; cursor: pointer; font-family: inherit; }
.cw-tab.on { background: var(--primary, #1b66c9); border-color: var(--primary, #1b66c9); color: #fff; font-weight: 600; }

.cw-sorts { display: flex; align-items: center; gap: 7px; flex-wrap: wrap; }
.cw-sort { border: 1px solid var(--border, #e5eaf2); background: var(--card, #fff); color: var(--muted, #8a94a6); font-size: 12.5px; padding: 5px 14px; border-radius: 999px; cursor: pointer; font-family: inherit; }
.cw-sort.on { border-color: var(--primary, #1b66c9); color: var(--primary, #1b66c9); font-weight: 700; }
.cw-hint { font-size: 11.5px; color: var(--muted, #8a94a6); margin-left: auto; }

.cw-grid { display: grid; grid-template-columns: 1fr 300px; gap: 14px; align-items: start; }
.cw-feed { display: flex; flex-direction: column; gap: 11px; min-width: 0; }
.cw-empty { padding: 38px 16px; text-align: center; color: var(--muted, #8a94a6); font-size: 13.5px; }
.cw-draftnote { font-size: 11.5px; color: #b45309; background: rgba(245, 158, 11, 0.1); border-radius: 9px; padding: 8px 13px; text-align: center; }

.cw-toast { position: fixed; bottom: 88px; left: 50%; transform: translateX(-50%); background: var(--primary, #1b66c9); color: #fff; padding: 10px 24px; border-radius: 999px; font-size: 13.5px; box-shadow: 0 8px 30px rgba(0, 0, 0, 0.22); z-index: 960; max-width: 86vw; text-align: center; }
.cw-toast.err { background: #d1242f; }

@media (max-width: 960px) {
  .cw-grid { grid-template-columns: 1fr; }
}
</style>
