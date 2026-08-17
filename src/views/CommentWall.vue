<script setup>
/** 评论区：纯静态站点无后端，本应用为「本地评论墙」
 *  评论与昵称仅保存在本机浏览器（localStorage），无法跨设备/跨访客同步；
 *  发表时内置敏感词过滤（命中词以 *** 代替），用于演示轻量内容安全思路。 */
import { ref, computed, onMounted } from 'vue'

const emit = defineEmits(['back'])

const STORAGE = 'qdu_comment_wall'
const NAME_KEY = 'qdu_comment_name'

const SENSITIVE = ['代考', '刷课', '作弊', '代刷', '枪支', '迷药', '赌博', '博彩', '诈骗', '刷单', '传销', '色情', '裸聊', '卖淫', '毒品', '冰毒', '嫖娼', '私服', '外挂', '代练']

const comments = ref([])
const name = ref('')
const text = ref('')
const warn = ref('')

function now() {
  const d = new Date()
  return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function load() {
  try {
    const d = JSON.parse(localStorage.getItem(STORAGE))
    comments.value = Array.isArray(d) ? d : []
  } catch { comments.value = [] }
  name.value = localStorage.getItem(NAME_KEY) || ''
}

function persist() {
  localStorage.setItem(STORAGE, JSON.stringify(comments.value))
  localStorage.setItem(NAME_KEY, name.value)
}

function post() {
  const t = text.value.trim()
  if (!t) return
  if (t.length > 500) {
    warn.value = '内容太长啦，请控制在 500 字以内'
    return
  }
  const filtered = filterText(t)
  if (filtered.masked) {
    warn.value = '检测到敏感词，已用 *** 代替并发表'
  } else {
    warn.value = ''
  }
  const nick = name.value.trim() || '游客'
  comments.value.unshift({
    id: Date.now() + Math.random(),
    nick,
    guest: !name.value.trim(),
    text: filtered.text,
    time: now(),
    likes: 0
  })
  text.value = ''
  persist()
  setTimeout(() => { warn.value = '' }, 2500)
}

function filterText(t) {
  let masked = false
  let out = t
  for (const w of SENSITIVE) {
    if (out.includes(w)) {
      masked = true
      out = out.split(w).join('***')
    }
  }
  return { text: out, masked }
}

function remove(id) {
  comments.value = comments.value.filter((c) => c.id !== id)
  persist()
}

function like(id) {
  const c = comments.value.find((c) => c.id === id)
  if (c) c.likes += 1
  persist()
}

function clearAll() {
  if (window.confirm('确定清空本机全部评论？此操作不可恢复。')) {
    comments.value = []
    persist()
  }
}

const counts = computed(() => comments.value.length)

onMounted(load)
</script>

<template>
  <div class="view-top">
    <button class="back-btn" @click="emit('back')">← 返回首页</button>
    <div class="view-title">评论区</div>
    <div class="view-sub">本机评论墙 · 纯静态站点，评论仅保存在你的浏览器</div>
  </div>

  <div class="panel" style="margin-bottom:16px;">
    <div class="section-title" style="margin:0 0 10px;"><span class="bar"></span>💬 发表评论</div>
    <div class="input-row">
      <input v-model="name" class="input" style="flex:1;" maxlength="16" placeholder="昵称（留空则为「游客」）" />
    </div>
    <textarea
      v-model="text"
      class="input"
      style="margin-top:10px;width:100%;box-sizing:border-box;min-height:90px;resize:vertical;font-family:inherit;"
      maxlength="500"
      placeholder="说点什么…（支持 500 字以内）"
    ></textarea>
    <div v-if="warn" style="font-size:12px;margin-top:8px;color:#92400e;background:#fff8ec;border:1px solid #f5d79a;border-radius:10px;padding:8px 10px;">{{ warn }}</div>
    <button class="btn accent" style="margin-top:12px;width:100%;" :disabled="!text.trim()" @click="post">＋ 发表评论</button>
    <p class="muted" style="font-size:11px;margin-top:10px;">
      说明：本站为纯静态页面、无后端服务，真正的「公共评论区 / 登录」无法实现；此应用为本地评论墙演示，评论与昵称仅存于本机浏览器（localStorage），刷新不丢、清缓存即清空。发表时内置敏感词过滤（命中词以 *** 代替）。
    </p>
  </div>

  <div class="panel">
    <div class="section-head" style="align-items:center;margin:0 0 10px;">
      <h3 class="section-title" style="margin:0;">全部评论（{{ counts }}）</h3>
      <button v-if="comments.length" class="btn ghost small" @click="clearAll">清空本机</button>
    </div>
    <div v-if="!comments.length" class="muted" style="text-align:center;padding:20px;">还没有评论，来抢个沙发 🛋️</div>
    <div v-else class="cm-list">
      <div v-for="c in comments" :key="c.id" class="cm-item">
        <div class="cm-head">
          <span class="cm-nick">{{ c.nick }}<em v-if="c.guest" class="cm-guest">游客</em></span>
          <span class="muted" style="font-size:11px;">{{ c.time }}</span>
        </div>
        <div class="cm-text">{{ c.text }}</div>
        <div class="cm-ops">
          <button class="cm-like" @click="like(c.id)">👍 {{ c.likes || '' }}</button>
          <button class="cm-del" @click="remove(c.id)">删除</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.cm-list { display: flex; flex-direction: column; }
.cm-item { padding: 12px 0; border-bottom: 1px solid var(--border); }
.cm-item:last-child { border-bottom: none; }
.cm-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.cm-nick { font-size: 13px; font-weight: 700; }
.cm-guest {
  font-style: normal;
  font-size: 10px;
  color: var(--text-sub);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 1px 5px;
  margin-left: 6px;
  vertical-align: 1px;
}
.cm-text {
  font-size: 14px;
  line-height: 1.65;
  margin: 6px 0 8px;
  word-break: break-word;
}
.cm-ops { display: flex; gap: 14px; }
.cm-like, .cm-del {
  border: none;
  background: none;
  font-family: inherit;
  font-size: 12px;
  cursor: pointer;
  padding: 0;
}
.cm-like { color: var(--text-sub); }
.cm-like:hover { color: var(--primary); }
.cm-del { color: #b9c2d0; }
.cm-del:hover { color: #b63a46; }
</style>