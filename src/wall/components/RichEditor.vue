<script setup>
/**
 * ════════════════════════════════════════════════════════════════════
 * @模块路径  src/wall/components/RichEditor.vue
 * @职责      轻量富文本输入：表情快捷 + @补全 + 图片本地压缩预览 +
 *            Markdown 极简（加粗/引用/代码）+ 字数 + 分区建议 + 草稿提示
 *            —— WallComposer 的输入内核升级版，老 Composer 可渐进替换
 * @props     modelValue:String（内容）· posts:Array（@联想数据源）·
 *            showSuggest:Boolean · placeholder:String
 * @emits     update:modelValue · submit · mention(user)
 * @被谁用    WallComposer（下一步接入）· CommentTree 回复框升级参考
 * @设计      无外部依赖；图片只做本地预览 + base64（<300KB），不直传网关，
 *            后端期换对象存储时仅改 onPickImage 的上传分支
 * ════════════════════════════════════════════════════════════════════
 */
import { ref, computed, watch } from 'vue'
import { suggest, suggestTags } from '../search.js'

const props = defineProps({
  modelValue: { type: String, default: '' },
  posts: { type: Array, default: () => [] },
  showSuggest: { type: Boolean, default: true },
  placeholder: { type: String, default: '分享新鲜事（支持 @同学，理性发言）' }
})
const emit = defineEmits(['update:modelValue', 'submit', 'mention'])

const text = ref(props.modelValue || '')
watch(() => props.modelValue, (v) => { if (v !== text.value) text.value = v || '' })
watch(text, (v) => emit('update:modelValue', v))

const taRef = ref(null)
const showEmoji = ref(false)
const showPreview = ref(false)
const images = ref([]) // {name, url, size}
const EMOJIS = ['😂', '🥹', '👍', '❤️', '🔥', '🎉', '🤔', '🙏', '🍜', '📚', '💰', '🛋️']

/* ── @ 联想 ── */
const atQuery = computed(() => {
  const m = /@([^\s@#]{0,16})$/.exec(text.value.slice(0, cursorPos.value))
  return m ? m[1] : null
})
const cursorPos = ref(0)
function onKeyup(e) {
  try { cursorPos.value = e.target.selectionStart || text.value.length } catch { cursorPos.value = text.value.length }
}
const atList = computed(() => {
  if (atQuery.value == null || !props.showSuggest) return []
  return suggest('@' + atQuery.value, props.posts, 6)
})
function pickMention(item) {
  if (item.type !== 'user') {
    insertAtCursor(item.text + ' ')
    return
  }
  const before = text.value.slice(0, cursorPos.value).replace(/@[^\s@#]{0,16}$/, item.text + ' ')
  text.value = before + text.value.slice(cursorPos.value)
  emit('mention', item.text)
  focusTa()
}

/* ── 快捷操作 ── */
function insertAtCursor(s) {
  const ta = taRef.value
  if (!ta) { text.value += s; return }
  const start = ta.selectionStart ?? text.value.length
  const end = ta.selectionEnd ?? text.value.length
  text.value = text.value.slice(0, start) + s + text.value.slice(end)
  focusTa()
  requestAnimationFrame(() => { try { ta.selectionStart = ta.selectionEnd = start + s.length } catch { /* noop */ } })
}
function focusTa() { try { taRef.value && taRef.value.focus() } catch { /* noop */ } }
function addEmoji(e) { insertAtCursor(e); showEmoji.value = false }
function addBold() { insertAtCursor('**加粗**') }
function addQuote() { insertAtCursor('\n> 引用\n') }
function addCode() { insertAtCursor('`代码`') }

/* ── 图片（本地压缩预览，<300KB 才随帖 base64，大的只记名防炸库） ── */
function onPickImage(e) {
  const files = Array.from(e.target.files || []).slice(0, 3)
  for (const f of files) {
    if (!f.type.startsWith('image/')) continue
    const reader = new FileReader()
    reader.onload = () => {
      const url = String(reader.result || '')
      // 粗略限体积：base64 >400KB 则只存占位（后端期换 OSS 直传）
      if (url.length > 400 * 1024) images.value.push({ name: f.name, url: '', size: f.size, tooBig: true })
      else images.value.push({ name: f.name, url, size: f.size })
      if (images.value.length > 3) images.value = images.value.slice(0, 3)
    }
    reader.readAsDataURL(f)
  }
  e.target.value = ''
}
function removeImage(i) { images.value.splice(i, 1) }

/* ── 统计 + 分区建议 ── */
const count = computed(() => text.value.length)
const overLimit = computed(() => count.value > 2000)
const tagTips = computed(() => {
  if (!props.showSuggest || text.value.trim().length < 4) return []
  return suggestTags('', text.value)
})
const previewHtml = computed(() => {
  let s = text.value
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>')
    .replace(/@([^\s@#]{1,16})/g, '<span style="color:#1b66c9;font-weight:600">@$1</span>')
    .replace(/\n/g, '<br/>')
  return s || '<span style="color:#999">（空）</span>'
})
function submit() { emit('submit', { content: text.value, images: images.value }) }
</script>

<template>
  <div class="re-wrap">
    <textarea
      ref="taRef"
      v-model="text"
      rows="4"
      :placeholder="placeholder"
      @keyup="onKeyup"
      @click="onKeyup"
    ></textarea>
    <div v-if="atList.length" class="re-at">
      <button v-for="(a, i) in atList" :key="i" @click="pickMention(a)">
        {{ a.type === 'user' ? '👤 ' : '🔥 ' }}{{ a.text }}
      </button>
    </div>
    <div class="re-bar">
      <button @click="showEmoji = !showEmoji">😊 表情</button>
      <button @click="addBold()">B 加粗</button>
      <button @click="addQuote()">引用</button>
      <button @click="addCode()">代码</button>
      <label class="re-imgbtn">🖼️ 图片<input type="file" accept="image/*" multiple hidden @change="onPickImage" /></label>
      <button @click="showPreview = !showPreview">{{ showPreview ? '收起预览' : '预览' }}</button>
      <span class="re-count" :class="{ over: overLimit }">{{ count }}/2000</span>
      <button class="primary" @click="submit">发布</button>
    </div>
    <div v-if="showEmoji" class="re-emoji">
      <button v-for="e in EMOJIS" :key="e" @click="addEmoji(e)">{{ e }}</button>
    </div>
    <div v-if="images.length" class="re-imgs">
      <div v-for="(im, i) in images" :key="i" class="re-img">
        <img v-if="im.url" :src="im.url" :alt="im.name" />
        <span v-else>📎 {{ im.name }}（过大，仅记名，后端期直传）</span>
        <button @click="removeImage(i)">✕</button>
      </div>
    </div>
    <div v-if="tagTips.length" class="re-tags">分区建议：
      <span v-for="t in tagTips" :key="t.tag">#{{ t.tag }}</span>
    </div>
    <div v-if="showPreview" class="re-preview" v-html="previewHtml"></div>
  </div>
</template>

<style scoped>
.re-wrap { display: flex; flex-direction: column; gap: 8px; }
.re-wrap textarea { width: 100%; border: 1px solid #ddd; border-radius: 10px; padding: 10px; font-size: 14px; line-height: 1.6; }
.re-at { display: flex; gap: 6px; flex-wrap: wrap; }
.re-at button { border: 1px solid #dbeafe; background: #eff6ff; border-radius: 12px; padding: 2px 10px; cursor: pointer; }
.re-bar { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
.re-bar button, .re-imgbtn { border: 1px solid #e5e5e5; background: #fafafa; border-radius: 12px; padding: 3px 10px; cursor: pointer; font-size: 12px; }
.re-bar button.primary { background: #1b66c9; color: #fff; border-color: #1b66c9; }
.re-count { margin-left: auto; font-size: 12px; color: #999; }
.re-count.over { color: #e11d48; font-weight: 700; }
.re-emoji { display: flex; gap: 4px; flex-wrap: wrap; background: #fafafa; border-radius: 8px; padding: 6px; }
.re-emoji button { border: none; background: none; font-size: 18px; cursor: pointer; }
.re-imgs { display: flex; gap: 8px; }
.re-img { position: relative; width: 84px; height: 84px; border: 1px solid #eee; border-radius: 8px; overflow: hidden; display: flex; align-items: center; justify-content: center; font-size: 11px; }
.re-img img { width: 100%; height: 100%; object-fit: cover; }
.re-img button { position: absolute; top: 2px; right: 2px; border: none; background: rgba(0,0,0,.5); color: #fff; border-radius: 50%; cursor: pointer; }
.re-tags { font-size: 12px; color: #666; }
.re-tags span { background: #f3f4f6; border-radius: 8px; padding: 0 8px; margin-left: 4px; }
.re-preview { border: 1px dashed #ddd; border-radius: 8px; padding: 8px 10px; font-size: 14px; line-height: 1.7; background: #fff; }
</style>
