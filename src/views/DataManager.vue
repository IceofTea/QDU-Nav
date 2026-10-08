<script setup>
/**
 * ════════════════════════════════════════════════════════════════════
 * @模块路径  src/views/DataManager.vue
 * @职责      数据管家：网关地址设置（一键切线上版）+ 本机数据备份/恢复
 *            （草稿/私信/积分钱包）+ 存储用量 —— 无后端依赖，纯本机操作
 * @路由      #/app/data（VIEWS.data + data/apps 双登记）
 * @数据      wall/apiBase（get/set/probe）· wall/drafts（导出导入）·
 *            im/api（私信导出）· localStorage（钱包/用量直读）
 * @交互      测试连接 8s 超时 · ?api= 深链一键填入 · 备份 JSON 下载 ·
 *            恢复前二次确认（覆盖式）· 手机端可用（线上版入口）
 * @被谁用    App.vue 路由；Wiki/评论区“去设置网关”深链本页 ?api=
 * ════════════════════════════════════════════════════════════════════
 */
import { ref, onMounted } from 'vue'
import {
  getApiBase, setApiBase, probeGateway, describeMode, apiFromQuery
} from '../wall/apiBase'
import { getCloud, setCloud, probeCloud } from '../wall/cloud'
import { exportDrafts, importDrafts, draftCount } from '../wall/drafts'
import { exportThreads, unreadTotal } from '../im/api'
import { getWallet } from '../wall/api'

const emit = defineEmits(['back'])

const apiInput = ref('')
const modeText = ref('')
const probeMsg = ref('')
const probing = ref(false)
const backupMsg = ref('')
const usage = ref([])
const sbUrl = ref('')
const sbKey = ref('')
const sbMsg = ref('')
const sbProbing = ref(false)

function refreshMode() {
  try {
    modeText.value = describeMode().text
    apiInput.value = getApiBase()
  } catch { modeText.value = '（读取失败）' }
}
async function testConn() {
  probing.value = true
  probeMsg.value = '测试中…'
  const r = await probeGateway(apiInput.value)
  probing.value = false
  probeMsg.value = r.ok ? `✅ 连接成功（${r.ms}ms），保存后全站走线上版` : `❌ ${r.error}`
}
function saveApi() {
  setApiBase(apiInput.value.trim())
  // ?api= 一次性参数用完即清理，避免分享链接泄露网关地址
  try {
    if (apiFromQuery()) {
      const u = new URL(location.href)
      u.searchParams.delete('api')
      history.replaceState(null, '', u.toString())
    }
  } catch { /* noop */ }
  refreshMode()
  probeMsg.value = '已保存' + (apiInput.value ? '，刷新页面即生效' : '（已切回同源/自动模式）')
}
function clearApi() { apiInput.value = ''; saveApi() }

/* ── 公有云共享（Supabase）：填好即全员共享墙帖子，手机同样生效 ── */
function refreshCloud() {
  try {
    const c = getCloud()
    sbUrl.value = c ? c.url : ''
    sbKey.value = c ? c.key : ''
  } catch { /* noop */ }
}
async function testCloud() {
  sbProbing.value = true
  sbMsg.value = '测试中…'
  const r = await probeCloud({ url: sbUrl.value.trim(), key: sbKey.value.trim() })
  sbProbing.value = false
  sbMsg.value = r.ok ? `✅ 云端连通（${r.ms}ms），保存后发帖全员可见` : `❌ ${r.error}`
}
function saveCloud() {
  const ok = setCloud(sbUrl.value.trim(), sbKey.value.trim())
  sbMsg.value = ok ? '已保存，刷新页面即走公有云（清空两格即关闭）' : '已关闭公有云，回退网关/本机模式'
  refreshMode()
}

/* ── 备份 / 恢复 ── */
function download(name, obj) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 5000)
}
function backupAll() {
  const data = {
    app: 'qdu-nav-backup', version: 1, exportedAt: Date.now(),
    drafts: exportDrafts(), threads: exportThreads(), wallet: getWallet()
  }
  download('nav-backup-' + new Date().toISOString().slice(0, 10) + '.json', data)
  backupMsg.value = `已导出：草稿 ${data.drafts.drafts.length} · 会话 ${Object.keys(data.threads.threads || {}).length} · 积分 ${data.wallet.points || 0}`
}
function restoreFile(e) {
  const f = (e.target.files || [])[0]
  if (!f) return
  const rd = new FileReader()
  rd.onload = () => {
    try {
      const d = JSON.parse(String(rd.result || ''))
      if (d.app !== 'qdu-nav-backup') throw new Error('不是本站备份文件')
      if (!confirm('恢复将合并草稿/覆盖钱包，继续？')) return
      const r1 = importDrafts(d.drafts || { drafts: [] })
      if (d.wallet && typeof d.wallet.points === 'number') {
        try { localStorage.setItem('wall_points_v1', JSON.stringify(d.wallet)) } catch { /* noop */ }
      }
      backupMsg.value = `已恢复：草稿 +${r1.imported}（跳过${r1.skipped}）· 私信请在原会话查看（会话随网关走）`
      refreshUsage()
    } catch (err) { backupMsg.value = '恢复失败：' + err.message }
  }
  rd.readAsText(f)
  e.target.value = ''
}

/* ── 用量 ── */
function refreshUsage() {
  const keys = ['wall_posts_v1', 'wall_drafts_v2', 'im_threads_v1', 'wall_points_v1', 'wall_search_hist_v2', 'study_focus_v1', 'study_plan_v1']
  usage.value = keys.map((k) => {
    let bytes = 0
    let n = ''
    try {
      const v = localStorage.getItem(k)
      bytes = v ? new Blob([v]).size : 0
      const j = v ? JSON.parse(v) : null
      n = Array.isArray(j) ? j.length + ' 条' : (j && typeof j === 'object' ? Object.keys(j).length + ' 项' : (v ? '有' : '空'))
    } catch { n = '—' }
    return { key: k, n, kb: (bytes / 1024).toFixed(1) + ' KB' }
  })
}

onMounted(() => {
  // ?api= 深链：扫码/分享一点即填好地址，点保存就行（手机配网关入口）
  const q = apiFromQuery()
  if (q) apiInput.value = q
  refreshMode()
  refreshCloud()
  refreshUsage()
})
</script>

<template>
  <div class="dm-wrap">
    <div class="dm-head">
      <button class="back" @click="emit('back')">‹ 返回</button>
      <b>🗄️ 数据管家</b>
    </div>

    <section class="dm-card">
      <b>🌐 网关地址（手机上线上版的总开关）</b>
      <div class="dm-mode">{{ modeText }}</div>
      <div class="dm-row">
        <input v-model="apiInput" placeholder="https://你的网关.onrender.com（留空=自动）" />
      </div>
      <div class="dm-row">
        <button @click="testConn" :disabled="probing">测试连接</button>
        <button class="primary" @click="saveApi">保存</button>
        <button @click="clearApi">清除回自动</button>
      </div>
      <div v-if="probeMsg" class="dm-msg">{{ probeMsg }}</div>
      <div class="dm-hint">部署完网关（见 Dockerfile/render.yaml）后，把公网地址填这里点保存：墙/私信/评论即走线上版；Wiki 页用 <code>?api=地址</code> 同样生效。</div>
    </section>

    <section class="dm-card">
      <b>☁️ 公有云共享（Supabase · 免自建服务器）</b>
      <div class="dm-row">
        <input v-model="sbUrl" placeholder="https://xxx.supabase.co" />
      </div>
      <div class="dm-row">
        <input v-model="sbKey" placeholder="anon key（设置→API 里复制）" type="password" />
      </div>
      <div class="dm-row">
        <button @click="testCloud" :disabled="sbProbing">测试云端</button>
        <button class="primary" @click="saveCloud">保存</button>
      </div>
      <div v-if="sbMsg" class="dm-msg">{{ sbMsg }}</div>
      <div class="dm-hint">建表跑一次 <code>supabase/schema.sql</code>；保存后墙帖子全员共享（含手机）。清空两格保存即关闭。</div>
    </section>

    <section class="dm-card">
      <b>💾 本机备份 / 恢复</b>
      <div class="dm-row">
        <button class="primary" @click="backupAll">导出备份 JSON</button>
        <label class="dm-file">恢复备份<input type="file" accept=".json" hidden @change="restoreFile" /></label>
      </div>
      <div v-if="backupMsg" class="dm-msg">{{ backupMsg }}</div>
      <div class="dm-hint">备份含：墙草稿 {{ draftCount() }} · 私信未读 {{ unreadTotal() }}。换手机时导出再导入即可迁移。</div>
    </section>

    <section class="dm-card">
      <b>📦 本机存储用量</b>
      <div v-for="u in usage" :key="u.key" class="dm-use">
        <span>{{ u.key }}</span><span>{{ u.n }}</span><span>{{ u.kb }}</span>
      </div>
    </section>
  </div>
</template>

<style scoped>
.dm-wrap { display: flex; flex-direction: column; gap: 12px; padding-bottom: 30px; }
.dm-head { display: flex; align-items: center; gap: 10px; }
.dm-head .back { border: 1px solid #e5e5e5; background: #fafafa; border-radius: 10px; padding: 3px 10px; cursor: pointer; }
.dm-card { border: 1px solid #eee; border-radius: 12px; padding: 12px 14px; background: #fff; display: flex; flex-direction: column; gap: 8px; }
.dm-mode { font-size: 13px; color: #166534; background: #f0fdf4; border-radius: 8px; padding: 6px 10px; }
.dm-row { display: flex; gap: 6px; flex-wrap: wrap; }
.dm-row input { flex: 1; min-width: 200px; border: 1px solid #ddd; border-radius: 10px; padding: 7px 12px; font-size: 13px; }
.dm-row button, .dm-file { border: 1px solid #e5e5e5; background: #fafafa; border-radius: 10px; padding: 6px 14px; cursor: pointer; font-size: 13px; }
.dm-row button.primary { background: #1b66c9; color: #fff; border-color: #1b66c9; }
.dm-msg { font-size: 13px; color: #1b66c9; }
.dm-hint { font-size: 12px; color: #888; line-height: 1.7; }
.dm-hint code { background: #f3f4f6; border-radius: 4px; padding: 0 5px; }
.dm-use { display: flex; justify-content: space-between; font-size: 12px; color: #555; font-family: ui-monospace, monospace; border-bottom: 1px dashed #f0f0f0; padding: 3px 0; }
</style>
