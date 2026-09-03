import { ref, computed } from 'vue'

import zh from './zh.js'
import en from './en.js'

const messages = { zh, en }

const LANG_KEY = 'qdu_lang'
const lang = ref(localStorage.getItem(LANG_KEY) || 'zh')

export function setLang(l) {
  lang.value = l
  try { localStorage.setItem(LANG_KEY, l) } catch {}
  document.documentElement.setAttribute('lang', l)
}

export function toggleLang() {
  setLang(lang.value === 'zh' ? 'en' : 'zh')
}

export function useI18n() {
  const t = (key, params) => {
    const pack = messages[lang.value] || messages.zh
    let val = key.split('.').reduce((o, k) => (o && o[k] !== undefined ? o[k] : null), pack)
    if (val === null || val === undefined) {
      const fb = messages.zh
      val = key.split('.').reduce((o, k) => (o && o[k] !== undefined ? o[k] : null), fb)
    }
    if (val === null || val === undefined) return key
    if (params && typeof val === 'string') {
      return Object.keys(params).reduce((s, k) => s.replace(new RegExp('\\{' + k + '\\}', 'g'), params[k]), val)
    }
    return val
  }
  return { t, lang: computed(() => lang.value), setLang, toggleLang }
}
