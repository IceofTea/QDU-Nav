<script setup>
import { ref, onMounted } from 'vue'
import { apiLookupStudentId } from '../api/mock'

const emit = defineEmits(['back'])

const form = ref({ kaoshenghao: '', name: '', idLast6: '', code: '' })
const captchaText = ref('')
const captchaCanvas = ref(null)
const loading = ref(false)
const result = ref(null)
const error = ref('')

function genCode() {
  let s = ''
  for (let i = 0; i < 4; i++) s += Math.floor(Math.random() * 10)
  captchaText.value = s
  drawCaptcha()
}

function drawCaptcha() {
  const canvas = captchaCanvas.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = '#eef3fa'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.font = 'bold 28px Arial'
  const colors = ['#1b66c9', '#0f766e', '#b63a46', '#d97706']
  for (let i = 0; i < captchaText.value.length; i++) {
    ctx.save()
    ctx.translate(20 + i * 26, 30)
    ctx.rotate((Math.random() - 0.5) * 0.4)
    ctx.fillStyle = colors[i % colors.length]
    ctx.fillText(captchaText.value[i], 0, 0)
    ctx.restore()
  }
  for (let i = 0; i < 5; i++) {
    ctx.strokeStyle = `rgba(27,102,201,${0.15 + Math.random() * 0.3})`
    ctx.beginPath()
    ctx.moveTo(Math.random() * canvas.width, Math.random() * canvas.height)
    ctx.lineTo(Math.random() * canvas.width, Math.random() * canvas.height)
    ctx.stroke()
  }
}

onMounted(genCode)

async function submit() {
  error.value = ''
  result.value = null
  if (!form.value.code || form.value.code.trim().toLowerCase() !== captchaText.value) {
    error.value = '验证码不正确，请重新输入'
    genCode()
    return
  }
  loading.value = true
  const r = await apiLookupStudentId(form.value)
  loading.value = false
  if (r.ok) result.value = r
  else error.value = r.msg
}
</script>

<template>
  <div class="view-top">
    <button class="back-btn" @click="emit('back')">← 返回首页</button>
    <div class="view-title">新生学号查询 <span class="demo-badge">演示数据</span></div>
    <div class="view-sub">凭录取信息查询本人学号 · 真实录取查询请用下方官方入口，本表单为演示</div>
  </div>

  <div class="panel" style="margin-bottom:16px;">
    <div style="font-weight:700;margin-bottom:10px;">🎓 官方录取查询（真实入口）</div>
    <div class="cal-list">
      <a class="cal-item" href="https://zhaosheng.qdu.edu.cn/static/front/qdu/basic/html_web/lqcx.html" target="_blank" rel="noopener">
        <span class="cal-title">本科招生录取查询</span>
        <span class="cal-go">招生官网 ↗</span>
      </a>
      <a class="cal-item" href="https://zhaosheng.qdu.edu.cn/static/front/qdu/basic/html_web/lqjczy.html" target="_blank" rel="noopener">
        <span class="cal-title">录取进程查询</span>
        <span class="cal-go">招生官网 ↗</span>
      </a>
      <a class="cal-item" href="https://mp.weixin.qq.com/s/Zk-fIw-aRk-v6h6k6xxRTA" target="_blank" rel="noopener">
        <span class="cal-title">2026 年本科招生录取查询公告（微信）</span>
        <span class="cal-go">公众号 ↗</span>
      </a>
      <a class="cal-item" href="https://zhaosheng.qdu.edu.cn" target="_blank" rel="noopener">
        <span class="cal-title">本科招生信息网</span>
        <span class="cal-go">官网 ↗</span>
      </a>
    </div>
    <div class="muted" style="margin-top:10px;font-size:12px;line-height:1.7;">
      学号需在正式报到后由教务系统分配，查询以录取通知书与官方渠道为准。
    </div>
  </div>

  <div class="panel">
    <div class="input-row">
      <input class="input" v-model="form.kaoshenghao" placeholder="考生号（14 位）" maxlength="14" />
    </div>
    <div class="input-row">
      <input class="input" v-model="form.name" placeholder="姓名" />
      <input class="input" v-model="form.idLast6" placeholder="证件号后 6 位" maxlength="6" />
    </div>
    <div class="input-row">
      <input class="input" v-model="form.code" placeholder="验证码" maxlength="4" style="flex:0 0 160px;" />
      <canvas
        ref="captchaCanvas"
        width="120"
        height="44"
        @click="genCode"
        style="cursor:pointer;border-radius:10px;border:1px solid var(--border);"
        title="点击刷新"
      ></canvas>
    </div>
    <button class="btn" :disabled="loading" @click="submit">{{ loading ? '查询中…' : '查询学号' }}</button>

    <div v-if="error" class="result-box" style="background:#fdf0f0;color:#b63a46;">{{ error }}</div>

    <div v-if="result" class="result-box">
      <div style="font-weight:700;font-size:15px;">查询成功</div>
      <div style="margin-top:10px;">
        <div class="muted">姓名</div>
        <div style="font-size:18px;font-weight:800;color:var(--primary);">{{ result.name }}</div>
      </div>
      <div style="margin-top:10px;">
        <div class="muted">学号</div>
        <div style="font-size:22px;font-weight:800;color:var(--primary);letter-spacing:1px;">{{ result.sid }}</div>
      </div>
      <div style="margin-top:10px;">
        <div class="muted">学院 / 专业</div>
        <div style="font-size:15px;font-weight:700;">{{ result.college }} · {{ result.major }}</div>
      </div>
    </div>

    <div class="muted" style="margin-top:16px;font-size:12px;line-height:1.8;">
      提示：当前为演示数据，学号按考生号模拟生成，仅供体验界面流程。
    </div>
  </div>
</template>