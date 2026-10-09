<script setup>
/**
 * ════════════════════════════════════════════════════════════════════
 * @模块路径  src/wall/components/WallComposer.vue
 * @职责      发帖器：5 种帖子类型（普通/投票/悬赏/资源/公示）+ 分区选择 +
 *            匿名开关 + 敏感词前端预检 + 字数统计
 * @草稿      经 ../drafts.js 多草稿箱统一管理（固定位 composer-main，7 天过期，
 *            发布清空；旧 wall_draft_v1 单草稿一次性迁移）
 * @props     parts(分区列表) · words(敏感词库) · busy
 * @emits     publish(payload) · cancel
 * @被谁用    CampusWall.vue
 * @校验      提交前本地 precheck 敏感词（服务端仍二次校验，双保险）
 * ════════════════════════════════════════════════════════════════════
 */
import { ref, computed, watch, onMounted } from 'vue'
import { POST_TYPES, PARTS, POINTS } from '../config.js'
import { saveDraft as saveWallDraft, deleteDraft as deleteWallDraft, listDrafts } from '../drafts.js'

const props = defineProps({
  words: { type: Array, default: () => [] },
  busy: { type: Boolean, default: false },
  points: { type: Number, default: 0 }
})
const emit = defineEmits(['publish', 'cancel'])

const DRAFT_ID = 'composer-main' // 发帖器草稿固定位（多草稿箱 v2 统一管理，7 天过期）
const LEGACY_DRAFT_KEY = 'wall_draft_v1' // 旧单草稿键（一次性迁移后删除）
const mode = ref('normal')           // normal | vote | bounty | resource | notice
const title = ref('')
const content = ref('')
const tag = ref('chat')
const anonymous = ref(true)
const author = ref('')

/* 投票 */
const voteQ = ref('')
const voteOpts = ref(['', ''])

/* 悬赏 */
const bountyPoints = ref(POINTS.bountyCost)
const bountyNeed = ref('')

/* 资源 */
const resTitle = ref('')
const resUrl = ref('')
const resCode = ref('')

/* 公示 */
const noticeOrg = ref('')

const err = ref('')
const draftSaved = ref(false)

/* ── 草稿：经 drafts.js 多草稿箱统一管理（输入即存，打开恢复，发布后清空） ── */
function snapshot() {
  return {
    id: DRAFT_ID,
    mode: mode.value, title: title.value, content: content.value, tag: tag.value,
    type: mode.value, anonymous: anonymous.value, author: author.value,
    voteQ: voteQ.value, voteOpts: voteOpts.value, bountyNeed: bountyNeed.value,
    bountyPoints: bountyPoints.value, resTitle: resTitle.value, resUrl: resUrl.value,
    resCode: resCode.value, noticeOrg: noticeOrg.value
  }
}
function applyDraft(d) {
  mode.value = d.mode || d.type || 'normal'
  title.value = d.title || ''
  content.value = d.content || ''
  tag.value = d.tag || 'chat'
  anonymous.value = d.anonymous !== false
  author.value = d.author || ''
  voteQ.value = d.voteQ || ''
  voteOpts.value = Array.isArray(d.voteOpts) && d.voteOpts.length ? d.voteOpts : ['', '']
  bountyNeed.value = d.bountyNeed || ''
  if (d.bountyPoints) bountyPoints.value = d.bountyPoints
  resTitle.value = d.resTitle || ''
  resUrl.value = d.resUrl || ''
  resCode.value = d.resCode || ''
  noticeOrg.value = d.noticeOrg || ''
}
function saveDraft() {
  const r = saveWallDraft(snapshot())
  draftSaved.value = !!r
}
function restoreDraft() {
  try {
    // 旧单草稿一次性迁移
    const legacy = JSON.parse(localStorage.getItem(LEGACY_DRAFT_KEY) || 'null')
    if (legacy && (legacy.content || legacy.title)) {
      applyDraft({ ...legacy, id: DRAFT_ID })
      saveWallDraft({ ...snapshot(), id: DRAFT_ID })
      localStorage.removeItem(LEGACY_DRAFT_KEY)
      err.value = '♻️ 已恢复上次未发布的草稿'
      return
    }
  } catch { /* 无旧草稿 */ }
  const d = listDrafts({ persist: false }).find((x) => x.id === DRAFT_ID)
  if (!d) return
  if (Date.now() - (d.updatedAt || 0) > 7 * 86400000) { deleteWallDraft(DRAFT_ID); return } // 7 天过期
  if (!d.content && !d.title && !d.voteQ && !d.resUrl) return
  applyDraft(d)
  err.value = '♻️ 已恢复上次未发布的草稿'
}
function clearDraft() {
  deleteWallDraft(DRAFT_ID)
  draftSaved.value = false
}
const usableParts = computed(() => PARTS.filter((p) => p.id !== 'all'))

function precheck(text) {
  const t = (text || '').toLowerCase()
  return props.words.find((w) => w && t.includes(String(w).toLowerCase()))
}

function submit() {
  err.value = ''
  const payload = {
    title: title.value.trim(),
    content: content.value.trim(),
    tag: mode.value === 'notice' ? 'notice' : tag.value,
    type: mode.value,
    anonymous: anonymous.value,
    author: author.value.trim() || '匿名同学'
  }

  if (mode.value === 'vote') {
    const opts = voteOpts.value.map((o) => o.trim()).filter(Boolean)
    if (!voteQ.value.trim()) { err.value = '请填写投票问题'; return }
    if (opts.length < 2) { err.value = '投票至少需要 2 个有效选项'; return }
    payload.vote = { question: voteQ.value.trim(), options: opts }
    payload.title = payload.title || voteQ.value.trim()
    payload.content = payload.content || '（投票帖）'
  } else if (mode.value === 'bounty') {
    if (!content.value.trim()) { err.value = '悬赏需要描述你的问题'; return }
    if (!bountyNeed.value.trim()) { err.value = '说明一下需要什么样的回答'; return }
    payload.content = content.value + '\n\n🎯 需要：' + bountyNeed.value.trim()
    payload.bounty = { points: Number(bountyPoints.value) || POINTS.bountyCost, adoptedId: null }
    payload.title = payload.title || ('【悬赏】' + content.value.slice(0, 18))
  } else if (mode.value === 'resource') {
    if (!resUrl.value.trim()) { err.value = '资源分享需要填写链接'; return }
    payload.resource = {
      title: resTitle.value.trim() || '分享的资源',
      url: resUrl.value.trim(),
      code: resCode.value.trim(),
      downloads: 0
    }
    payload.title = payload.title || ('【资源】' + payload.resource.title)
    payload.content = payload.content || '分享一个资源，链接如下（有效性由分享者负责）'
  } else if (mode.value === 'notice') {
    if (!content.value.trim()) { err.value = '公示内容不能为空'; return }
    payload.title = payload.title || '信息公开'
    if (noticeOrg.value.trim()) payload.content = '【' + noticeOrg.value.trim() + '】\n' + payload.content
  } else {
    if (payload.content.length < 2 && !payload.title) { err.value = '说点什么再发～'; return }
    payload.title = payload.title || payload.content.slice(0, 20)
  }

  const all = [payload.title, payload.content, payload.vote ? payload.vote.question + payload.vote.options.join('') : ''].join(' ')
  const hit = precheck(all)
  if (hit) { err.value = '内容包含违规词「' + hit + '」，已被拦截'; return }

  emit('publish', payload)
  clearDraft()
}

function reset() {
  title.value = ''; content.value = ''; voteQ.value = ''; voteOpts.value = ['', '']
  bountyNeed.value = ''; resUrl.value = ''; resTitle.value = ''; resCode.value = ''
  noticeOrg.value = ''; err.value = ''
}
watch([title, content, voteQ], () => { if (title.value || content.value || voteQ.value) saveDraft() })
onMounted(restoreDraft)
defineExpose({ reset })
</script>

<template>
  <div class="wc">
    <div v-if="err && err.startsWith('♻️')" class="wc-hint">{{ err }} <button class="wc-x" style="width:auto;font-size:11px" @click="clearDraft(); err=''">放弃草稿</button></div>
    <div class="wc-modes">
      <button v-for="t in POST_TYPES" :key="t.id" class="wc-mode" :class="{ on: mode === t.id }" @click="mode = t.id">
        {{ t.icon }} {{ t.name }}
      </button>
    </div>
    <div v-if="POST_TYPES.find(t => t.id === mode)?.hint" class="wc-hint">{{ POST_TYPES.find(t => t.id === mode).hint }}</div>

    <input v-model="author" class="wc-input" maxlength="24" placeholder="昵称（留空 = 匿名同学）" />
    <input v-model="title" class="wc-input" maxlength="60" :placeholder="mode === 'vote' ? '标题（可选，问题会作为主标题）' : '标题（可选，默认取正文前 20 字）'" />

    <!-- 分区选择（公示固定 notice） -->
    <div v-if="mode !== 'notice'" class="wc-parts">
      <button v-for="p in usableParts" :key="p.id" class="wc-part" :class="{ on: tag === p.id }" @click="tag = p.id">
        {{ p.icon }} {{ p.name }}
      </button>
    </div>
    <div v-else class="wc-parts"><span class="wc-part on">📢 公示</span></div>

    <!-- 投票配置 -->
    <template v-if="mode === 'vote'">
      <input v-model="voteQ" class="wc-input" maxlength="100" placeholder="投票问题（如：考试周自习室应延长到几点？）" />
      <div class="wc-opts">
        <div v-for="(o, i) in voteOpts" :key="i" class="wc-opt">
          <input v-model="voteOpts[i]" class="wc-input" maxlength="40" :placeholder="'选项 ' + (i + 1)" />
          <button v-if="voteOpts.length > 2" class="wc-x" @click="voteOpts.splice(i, 1)">×</button>
        </div>
        <button v-if="voteOpts.length < 6" class="wc-add" @click="voteOpts.push('')">＋ 添加选项（2~6）</button>
      </div>
    </template>

    <!-- 悬赏配置 -->
    <template v-if="mode === 'bounty'">
      <div class="wc-bounty">
        <label>💰 赏金 <input v-model.number="bountyPoints" type="number" min="1" max="50" class="wc-num" /> 积分</label>
        <span class="wc-balance">当前积分 {{ points }}{{ points < bountyPoints ? '（不足仍可发，本地演示不强制扣款）' : '' }}</span>
      </div>
      <input v-model="bountyNeed" class="wc-input" maxlength="60" placeholder="需要什么样的回答？（如：有往年真题的同学）" />
    </template>

    <!-- 资源配置 -->
    <template v-if="mode === 'resource'">
      <input v-model="resTitle" class="wc-input" maxlength="60" placeholder="资源名称（如：数据结构期末复习包）" />
      <input v-model="resUrl" class="wc-input" maxlength="300" placeholder="资源链接（网盘/仓库/文档均可）" />
      <input v-model="resCode" class="wc-input" maxlength="20" placeholder="提取码（可选）" />
    </template>

    <textarea v-model="content" class="wc-text" rows="4" maxlength="1000"
      :placeholder="mode === 'vote' ? '补充说明（可选）…' : mode === 'resource' ? '资源介绍、适用范围、注意事项…' : '写点什么…（发布前自动敏感词校验）'"></textarea>

    <div class="wc-foot">
      <label class="wc-anon"><input type="checkbox" v-model="anonymous" /> 匿名发布</label>
      <span class="wc-count">{{ content.length }}/1000</span>
      <span v-if="err" class="wc-err">⚠ {{ err }}</span>
      <button class="wc-cancel" @click="emit('cancel'); reset()">取消</button>
      <button class="wc-submit" :disabled="busy" @click="submit">{{ busy ? '发布中…' : '发布' }}</button>
    </div>
  </div>
</template>

<style scoped>
.wc { border: 1px solid var(--border, #e5eaf2); background: var(--card, #fff); border-radius: 14px; padding: 14px; display: flex; flex-direction: column; gap: 9px; }
.wc-modes { display: flex; gap: 6px; flex-wrap: wrap; }
.wc-mode { border: 1px solid var(--border, #e5eaf2); background: transparent; color: var(--muted, #8a94a6); font-size: 12.5px; padding: 5px 13px; border-radius: 999px; cursor: pointer; font-family: inherit; }
.wc-mode.on { background: var(--primary, #1b66c9); border-color: var(--primary, #1b66c9); color: #fff; font-weight: 600; }
.wc-hint { font-size: 11.5px; color: var(--muted, #8a94a6); background: var(--bg, #f7f9fc); border-radius: 8px; padding: 6px 11px; }
.wc-input { border: 1px solid var(--border, #e5eaf2); border-radius: 9px; padding: 9px 12px; font-size: 13.5px; font-family: inherit; background: var(--bg, #fff); color: var(--text, #24292f); outline: none; }
.wc-input:focus { border-color: var(--primary, #1b66c9); }
.wc-parts { display: flex; gap: 5px; flex-wrap: wrap; }
.wc-part { border: 1px solid var(--border, #e5eaf2); background: transparent; color: var(--muted, #8a94a6); font-size: 12px; padding: 4px 10px; border-radius: 999px; cursor: pointer; font-family: inherit; }
.wc-part.on { background: var(--primary, #1b66c9); border-color: var(--primary, #1b66c9); color: #fff; }
.wc-opts { display: flex; flex-direction: column; gap: 7px; }
.wc-opt { display: flex; gap: 7px; align-items: center; }
.wc-opt .wc-input { flex: 1; }
.wc-x { border: none; background: transparent; color: var(--muted, #8a94a6); font-size: 17px; cursor: pointer; width: 26px; }
.wc-x:hover { color: #d1242f; }
.wc-add { border: 1px dashed var(--border, #e5eaf2); background: transparent; color: var(--muted, #8a94a6); font-size: 12.5px; padding: 7px; border-radius: 9px; cursor: pointer; font-family: inherit; }
.wc-add:hover { border-color: var(--primary, #1b66c9); color: var(--primary, #1b66c9); }
.wc-bounty { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; background: rgba(217, 119, 6, 0.07); border-radius: 9px; padding: 8px 12px; font-size: 13px; }
.wc-bounty label { display: flex; align-items: center; gap: 7px; font-weight: 600; color: #d97706; }
.wc-num { width: 64px; border: 1px solid var(--border, #e5eaf2); border-radius: 7px; padding: 4px 8px; font-size: 13px; font-family: inherit; background: var(--bg, #fff); }
.wc-balance { font-size: 11.5px; color: var(--muted, #8a94a6); }
.wc-text { border: 1px solid var(--border, #e5eaf2); border-radius: 9px; padding: 10px 12px; font-size: 13.5px; font-family: inherit; background: var(--bg, #fff); color: var(--text, #24292f); resize: vertical; outline: none; line-height: 1.65; }
.wc-text:focus { border-color: var(--primary, #1b66c9); }
.wc-foot { display: flex; align-items: center; gap: 11px; flex-wrap: wrap; }
.wc-anon { font-size: 12.5px; color: var(--muted, #8a94a6); display: flex; align-items: center; gap: 5px; }
.wc-count { font-size: 11.5px; color: var(--muted, #8a94a6); font-variant-numeric: tabular-nums; }
.wc-err { font-size: 12.5px; color: #d1242f; flex: 1; }
.wc-cancel { border: 1px solid var(--border, #e5eaf2); background: transparent; color: var(--muted, #8a94a6); padding: 8px 16px; border-radius: 999px; cursor: pointer; font-family: inherit; font-size: 13px; }
.wc-submit { border: none; background: var(--primary, #1b66c9); color: #fff; padding: 8px 22px; border-radius: 999px; cursor: pointer; font-family: inherit; font-size: 13.5px; font-weight: 600; }
.wc-submit:disabled { opacity: 0.5; }
</style>
