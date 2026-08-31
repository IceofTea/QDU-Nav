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
  const t = (key, fallback) => {
    const pack = messages[lang.value] || messages.zh
    const val = key.split('.').reduce((o, k) => (o && o[k] !== undefined ? o[k] : null), pack)
    if (val !== null && val !== undefined) return val
    const fb = messages.zh
    const fbVal = key.split('.').reduce((o, k) => (o && o[k] !== undefined ? o[k] : null), fb)
    return fbVal !== null && fbVal !== undefined ? fbVal : (fallback || key)
  }
  return { t, lang: computed(() => lang.value), setLang, toggleLang }
}
