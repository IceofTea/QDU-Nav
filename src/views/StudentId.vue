<script setup>
import { ref } from 'vue'

const emit = defineEmits(['back'])

const form = ref({ kaoshenghao: '', name: '' })
const error = ref('')

function gotoOfficial() {
  const ksh = form.value.kaoshenghao.trim()
  if (!/^\d{14}$/.test(ksh)) {
    error.value = '请输入 14 位考生号（可留空直接前往官方页面）'
    return
  }
  window.open('https://zhaosheng.qdu.edu.cn/static/front/qdu/basic/html_web/lqcx.html', '_blank', 'noopener')
}
</script>

<template>
  <div class="view-top">
    <button class="back-btn" @click="emit('back')">← 返回首页</button>
    <div class="view-title">新生学号查询</div>
    <div class="view-sub">学号由教务系统统一分配，录取结果请以学校官方录取查询系统为准</div>
  </div>

  <div class="panel" style="margin-bottom:16px;">
    <div style="font-weight:700;margin-bottom:10px;">🎓 官方录取查询（真实入口）</div>
    <div class="muted" style="font-size:12px;margin-bottom:10px;line-height:1.7;">
      录取查询系统由学校统一开放（开放时间见招生官网公告），需使用考生号、身份证号与验证码查询，官方系统无法免登录对接，本站仅提供直达入口。
    </div>
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
  </div>

  <div class="panel">
    <div style="font-weight:700;margin-bottom:10px;">📌 查询流程</div>
    <ol class="route-steps" style="margin:0 0 14px;padding-left:20px;">
      <li>录取期间留意本科招生网通知，确认查询系统开放</li>
      <li>在官方录取查询页输入考生号 + 身份证号 + 验证码</li>
      <li>查询结果显示录取专业等信息</li>
      <li>学号在正式报到、教务系统注册后分配，以录取通知书与学校通知为准</li>
    </ol>
    <div class="input-row">
      <input class="input" v-model="form.kaoshenghao" placeholder="考生号（14 位，选填）" maxlength="14" />
      <button class="btn" @click="gotoOfficial">前往官方查询 ↗</button>
    </div>
    <div v-if="error" class="result-box" style="background:#fdf0f0;color:#b63a46;margin-top:10px;">{{ error }}</div>
    <div class="muted" style="margin-top:14px;font-size:12px;line-height:1.8;">
      提示：学号查询涉及个人隐私，须由本人凭录取信息在官方系统核验后获取，本站不做任何代查。
    </div>
  </div>
</template>