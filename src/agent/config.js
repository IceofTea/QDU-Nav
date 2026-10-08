/**
 * 智能体配置（换校联动的"大脑配置"）
 * ---------------------------------------------------------------------------
 * 一键换校脚本 customize.py 会同步改写本文件的 AGENT_PROFILE 字段——
 * 校名、品牌、示例话术随配置切换，"换校不换大脑，大脑跟着配置走"。
 */
import { SITE } from '../config/site'

export const AGENT_PROFILE = {
  /** 智能体名称（换校落点） */
  agentName: '青大智答',
  /** 所属学校短名（换校落点） */
  schoolShort: '青大',
  /** 欢迎语（换校落点） */
  welcome: '你好，我是青大智答。直接说出你的需求，比如："明天有什么课"、"找个空教室自习"、"今天吃什么"。',
  /** 能力示例（换校落点，最多 5 条） */
  examples: [
    '明天上什么课？',
    '哪里有空教室自习？',
    '今天吃什么',
    '最新教务通知',
    '提醒我明天下午三点开会'
  ],
  /** 副标题 */
  subtitle: '对话式校园助手 · 说一句话就能办事',
  /** 云脑接口（可选）：配置后复杂问题升级云端大模型，留空则纯本地推理 */
  cloudApi: ''
}

/** 智能体文案（中英双语） */
export const AGENT_TEXT = {
  zh: {
    thinking: '思考中',
    listening: '说出你的需求…',
    send: '发送',
    confirm: '确认执行',
    cancel: '取消',
    workflowRun: '工作流执行中',
    workflowDone: '执行完成',
    workflowFail: '执行失败',
    fallback: '我暂时没听懂，试试换个说法，或点开下面的应用直达：',
    fallbackSearch: '已为你筛选相关应用，点击直达',
    clarifyTime: '请问是什么时间？（如：明天下午三点）',
    clarifyThing: '要做什么事呢？',
    confirmTpl: '即将为你执行：{text}，确认吗？',
    done: '已完成',
    localMode: '本地推理',
    cloudMode: '云端推理',
    source: '来源',
    actions: '可执行操作',
    noResult: '没有查到结果，可能数据源暂不可用',
    hint: '按 🎤 说话 · 点卡片按钮直接办事 · 每条回答可溯源'
  },
  en: {
    thinking: 'Thinking',
    listening: 'Say what you need…',
    send: 'Send',
    confirm: 'Confirm',
    cancel: 'Cancel',
    workflowRun: 'Running workflow',
    workflowDone: 'Done',
    workflowFail: 'Failed',
    fallback: "I didn't catch that. Try rephrasing, or jump to an app below:",
    fallbackSearch: 'Matching apps for you',
    clarifyTime: 'What time? (e.g. 3pm tomorrow)',
    clarifyThing: 'What would you like to do?',
    confirmTpl: 'About to run: {text}. Confirm?',
    done: 'Done',
    localMode: 'On-device',
    cloudMode: 'Cloud',
    source: 'Source',
    actions: 'Actions',
    noResult: 'No results — data source may be unavailable',
    hint: 'Voice · one-tap action cards · traceable answers'
  }
}

export function agentText(lang) {
  return AGENT_TEXT[lang === 'en' ? 'en' : 'zh']
}

export function siteLabel() {
  return AGENT_PROFILE.schoolShort || SITE.brand
}
