/**
 * 应用入口：挂载根组件与全局样式
 */
import { createApp } from 'vue'
import App from './App.vue'
import { ensureLang } from './i18n/index.js'
import './styles.css'

const app = createApp(App)
// 全局渲染保险：模板断头引用等运行时错误不再静默白屏，而是显式报错盒
// （2026-10-08 FJNU 主界面白屏事故复盘：App.vue 模板调用了未定义的 navLabel）
app.config.errorHandler = (err, instance, info) => {
  try { console.error('[app-error]', info, err) } catch { /* noop */ }
  try {
    const el = document.getElementById('app')
    if (el && !el.innerHTML.trim()) {
      el.innerHTML = '<div style="padding:40px 20px;text-align:center;font-size:14px;color:#b91c1c">'
        + '😵 页面渲染被一个错误中断了<br><span style="font-size:12px;color:#888">'
        + String((err && err.message) || err).slice(0, 120)
        + '</span><br><button onclick="location.reload()" style="margin-top:12px;padding:6px 18px;border-radius:10px;border:1px solid #ddd;background:#fff">↻ 重新加载</button></div>'
    }
  } catch { /* noop */ }
}
// 挂载前准备语言：上次若是英文则先把英文包拉下来（中文用户零网络开销），
// 避免英文用户先看到一屏中文再被替换。
(async () => {
  try { await ensureLang() } catch { /* 语言准备失败按默认中文 */ }
  app.mount('#app')
})()