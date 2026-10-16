/**
 * @模块路径  src/i18n/index.js
 * @职责      i18n 入口与 useI18n
 *
 * 性能约定：中文包是**默认语言**，静态引入；英文包约 60KB 源码（gzip 后仍占首屏一大块），
 * 因此改为**按需动态加载**——只有真正切到英文时才拉取。为避免英文用户看到中文闪现，
 * `main.js` 在挂载前会 `await ensureLang()`（仅当上次语言是 en 时才会真正等待一次网络）。
 */
import { ref, computed } from 'vue'

import zh from './zh.js'

const messages = { zh, en: null }

const LANG_KEY = 'qdu_lang'
const lang = ref('zh')

/** 英文包加载状态：'idle' | 'loading' | 'ready' | 'failed' */
const enState = ref('idle')
let enPromise = null

/** 触发（或复用）英文包加载；返回 Promise，失败不抛（回落到中文） */
export function loadEn() {
  if (messages.en) return Promise.resolve(messages.en)
  if (enPromise) return enPromise
  enState.value = 'loading'
  enPromise = import('./en.js')
    .then((m) => {
      messages.en = m.default || m
      enState.value = 'ready'
      return messages.en
    })
    .catch(() => {
      enState.value = 'failed'
      enPromise = null
      return null
    })
  return enPromise
}

/**
 * 挂载前的语言准备：上次用英文则确保英文包就绪（失败静默回落中文）。
 * 中文用户直接 resolve，零网络开销。
 */
export async function ensureLang() {
  let saved = 'zh'
  try {
    saved = localStorage.getItem(LANG_KEY) || 'zh'
  } catch { /* 存储不可用：按默认中文 */ }
  if (saved === 'en') await loadEn()
  lang.value = messages.en && saved === 'en' ? 'en' : (saved === 'en' ? 'zh' : saved)
  try {
    document.documentElement.setAttribute('lang', lang.value)
  } catch { /* noop */ }
  return lang.value
}

/** 切换语言：切到英文时先确保英文包到位，再切换（失败则留在中文，不出现半截界面） */
export async function setLang(l) {
  if (l === 'en' && !messages.en) {
    await loadEn()
    if (!messages.en) l = 'zh'
  }
  lang.value = l
  try { localStorage.setItem(LANG_KEY, l) } catch { /* noop */ }
  try { document.documentElement.setAttribute('lang', l) } catch { /* noop */ }
}

export function toggleLang() {
  return setLang(lang.value === 'zh' ? 'en' : 'zh')
}

export function useI18n() {
  const t = (key, params) => {
    const pack = messages[lang.value] || messages.zh
    const pick = (p) => key.split('.').reduce((o, k) => (o && o[k] !== undefined ? o[k] : null), p)
    let val = pick(pack)
    if (val === null || val === undefined) val = pick(messages.zh)
    if (val === null || val === undefined) return key
    if (params && typeof val === 'string') {
      return Object.keys(params).reduce((s, k) => s.replace(new RegExp('\\{' + k + '\\}', 'g'), params[k]), val)
    }
    return val
  }
  return { t, lang: computed(() => lang.value), setLang, toggleLang, enState }
}
