/**
 * 对话引擎（多轮状态机 · 三层识别 · 云脑可选降级）
 * ---------------------------------------------------------------------------
 * handle(text, onStep) 返回统一响应：
 *   kind: meta | faq | workflow | app | fallback | confirm | clarify | cancel | cloud
 * 状态机：澄清（补槽位）→ 确认（写操作）→ 执行（工作流）→ 卡片（可执行动作）
 * 本地推理零依赖；配置 AGENT_PROFILE.cloudApi 后复杂问题升级云端，失败自动回退。
 */
import { recognize } from './intents'
import { navAnswer } from './navAnswer'
import { AGENT_PROFILE, agentText } from './config'
import { runWorkflow, workflowMeta, CLARIFY } from './workflows'
import { extractKeyword, extractScheduleSlots } from './slots'
import { detectContinue, mergeContinue, followupsFor, buildGreeting } from './converse'
import { pushList, readProfile } from './profile'
import { dueReviews } from '../utils/studyPlan'
import { upcoming } from '../data/activities'
import { matchJobs } from '../data/jobs'

const ASK = {
  time: '什么时间的日程？（例如：明天下午三点）',
  thing: '具体要做什么事呢？',
  keyword: '要查什么关键词？（例如：选课、考试、转专业）',
  class: '你所在的班级是？（例如：2025级计算机1班）——只需告诉我一次，之后"明天上什么课"就能直接查',
  service: '想直达哪个服务？（VPN、织网、邮箱、办事大厅、教务系统…）'
}

const CONFIRM_WORDS = /^(好|好的|可以|行|确认|执行|嗯|ok|OK|Ok|是|对|确认执行|开始吧|做吧|没问题|yes)$/i
const CANCEL_WORDS = /^(不|不用|算了|取消|别了|不需要|no|No|错|不是)$/

function readClass() {
  try { return localStorage.getItem('qdu_agent_class') || '' } catch { return '' }
}

export class AgentEngine {
  constructor({ lang = 'zh', mode = 'agent' } = {}) {
    this.lang = lang
    this.mode = mode // 'agent' 直达 | 'plan' 先计划后执行 | 'ask' 仅问答
    this.pending = null
    this.turns = 0
    this.lastCtx = null // 上条成功执行的工作流上下文（指代消解用）
  }

  /** 三模式切换（WorkBuddy 同款语义：直达/计划/问答） */
  setMode(m) {
    if (['agent', 'plan', 'ask'].includes(m)) {
      this.mode = m
      this.pending = null
    }
  }

  t() { return agentText(this.lang) }

  reset() { this.pending = null; this.lastCtx = null }

  /**
   * 主入口
   * @param {string} text 用户输入
   * @param {Function|Object} stepOrOpts onStep 回调，或 {onStep, mode}
   */
  async handle(text, stepOrOpts) {
    const opts = typeof stepOrOpts === 'function' ? { onStep: stepOrOpts } : (stepOrOpts || {})
    const onStep = opts.onStep
    if (opts.mode) this.setMode(opts.mode)
    const raw = (text || '').trim()
    if (!raw) return { kind: 'meta', reply: this.t().listening, chips: AGENT_PROFILE.examples.slice(0, 4) }
    this.turns++

    // ── 模式切换指令（切回直达模式 / 计划模式 / 问答模式） ──
    const modeHit = raw.match(/^(切回|切换到|打开|用)?(直达|计划|问答)?(模式)?$/)
    const modeMap = { '直达': 'agent', '计划': 'plan', '问答': 'ask' }
    if (modeHit && modeHit[2] && modeMap[modeHit[2]]) {
      this.setMode(modeMap[modeHit[2]])
      const names = { agent: '⚡直达', plan: '📋计划', ask: '💬问答' }
      return { kind: 'meta', reply: `已切换到 ${names[this.mode]} 模式。${this.mode === 'plan' ? '办事前会先给出执行计划，确认后再运行。' : this.mode === 'ask' ? '只回答问题，不执行动作。' : '识别后直接执行。'}`, mode: this.mode, chips: AGENT_PROFILE.examples.slice(0, 3) }
    }

    // ── 状态机：澄清续接 ─────────────────────────────
    if (this.pending && this.pending.kind === 'clarify') {
      const p = this.pending
      this.pending = null
      return this._resumeClarify(p, raw, onStep)
    }
    // ── 状态机：确认续接（执行确认 + 计划确认） ────────
    if (this.pending && (this.pending.kind === 'confirm' || this.pending.kind === 'plan')) {
      const p = this.pending
      if (CANCEL_WORDS.test(raw)) {
        this.pending = null
        return { kind: 'cancel', reply: '已取消，没有做任何改动。', chips: ['换个别的需求', '帮我查空教室'] }
      }
      const planGo = p.kind === 'plan' && /^(开始|执行|跑吧|按计划|开始执行|执行吧|确认执行)/.test(raw)
      if (CONFIRM_WORDS.test(raw) || planGo) {
        this.pending = null
        return this._execute(p.wfId, p.ctx, p.kind === 'plan' ? { confidence: 95, layer: 'plan-confirm' } : undefined, onStep)
      }
      // 既非确认也非取消 → 视为新请求
      this.pending = null
    }

    // ── 上下文追问（“明天呢”“换博文楼”“再查一次”）：沿用上条工作流 ──
    // 强新意图一律让路（阈值 60 分且目标不同），避免“明天有什么课”被误续成找教室
    if (!this.pending && this.lastCtx) {
      const cont = detectContinue(raw, this.lastCtx)
      if (cont) {
        const r2 = recognize(raw)
        const strongNew = r2.layer === 'intent' && r2.score >= 60 &&
          (!r2.intent || r2.intent.kind !== 'workflow' || r2.intent.wf !== cont.wfId)
        if (!strongNew) {
          const merged = mergeContinue(this.lastCtx, cont, raw, this.lang)
          return this._execute(merged.wfId, merged.ctx, { confidence: 88, layer: 'context' }, onStep)
        }
      }
    }

    // ── 三层识别 ────────────────────────────────────
    const r = recognize(raw)
    const base = { confidence: r.score, layer: r.layer }

    if (r.layer === 'intent') {
      const it = r.intent
      if (it.kind === 'meta') return { ...base, kind: 'meta', reply: it.reply, chips: AGENT_PROFILE.examples.slice(0, 4) }
      // Ask 模式：只问答不执行
      if (this.mode === 'ask' && (it.kind === 'workflow' || it.kind === 'app')) {
        return {
          ...base, kind: 'meta',
          reply: `问答模式下不执行动作。这个问题的相关知识：若要办事，请切回 ⚡直达 或 📋计划模式（输入框下方可切换）。`,
          chips: ['切回直达模式', '你能做什么']
        }
      }
      if (it.kind === 'app') return this._appDirect(it.app, base, raw)
      if (it.kind === 'workflow') {
        // Plan 模式：先出执行计划，确认后再跑
        if (this.mode === 'plan') {
          const meta = workflowMeta(it.wf)
          if (meta && !meta.needConfirm) {
            const ctx = { text: raw, slots: {}, state: {}, lang: this.lang }
            const kw = extractKeyword(raw, ['查一下', '查询', '搜索', '搜', '找', '关于', '通知', '打开'])
            if (kw) ctx.slots.keyword = kw
            const pre = this._preflight(it.wf, ctx)
            if (pre) {
              this.pending = { kind: 'clarify', wfId: it.wf, ctx, field: pre }
              return { ...base, kind: 'clarify', reply: ASK[pre] || '请补充一下信息', pendingField: pre }
            }
            this.pending = { kind: 'plan', wfId: it.wf, ctx }
            return {
              ...base, kind: 'plan',
              reply: `📋 已生成执行计划：${meta.title}（共 ${meta.steps.length} 步）。确认后开始执行。`,
              wf: meta,
              plan: { title: meta.title, icon: meta.icon, steps: meta.steps },
              confirmActions: true,
              chips: ['开始执行', '取消']
            }
          }
        }
        return this._startWorkflow(it, raw, base, onStep)
      }
    }

    if (r.layer === 'faq') {
      return {
        ...base, kind: 'faq',
        reply: r.faq.a,
        source: r.faq.source,
        card: {
          title: '💡 ' + r.faq.q,
          subtitle: '本地知识库 · 即时应答',
          rows: [{ icon: '📖', label: r.faq.a.slice(0, 60) + (r.faq.a.length > 60 ? '…' : ''), value: '' }],
          source: r.faq.source,
          actions: [
            { label: '查看百科完整条目', type: 'agent', value: '查百科 ' + r.faq.q },
            { label: '继续追问', type: 'reask', value: '' }
          ]
        },
        chips: ['还有其他注意事项吗？', '最新通知']
      }
    }

    if (r.layer === 'app') {
      return {
        ...base, kind: 'app',
        reply: `为你找到相关应用：${r.app.title}`,
        card: this._appCard(r.app, r.apps),
        chips: (r.apps || []).slice(1, 4).map((a) => '打开' + a.title)
      }
    }

    // ── 第二层升级：BM25 全库知识检索（faq 精确未中时的语义近似） ──
    if (r.layer === 'none' || r.layer === 'app') {
      const ans = navAnswer(raw, 1)
      if (ans && ans.score >= 1.2) {
        return {
          ...base, layer: 'kb-bm25', confidence: Math.min(92, 55 + Math.round(ans.score * 8)),
          kind: 'faq',
          reply: ans.s,
          source: ans.src,
          card: {
            title: '📚 ' + ans.t,
            subtitle: '本地知识库 BM25 检索（kb-nav.json ' + '47 篇语料）',
            rows: [{ icon: '📖', label: ans.s.slice(0, 60) + (ans.s.length > 60 ? '…' : ''), value: '' }],
            source: ans.src,
            actions: [
              { label: '打开智能助手（继续追问）', type: 'openApp', value: 'assistant' },
              { label: '换个说法再问', type: 'reask', value: '' }
            ],
            note: '与 Wiki 站同级的本地 BM25 检索：零外部接口、离线可用、可溯源'
          },
          chips: ['今日简报', '哪里有空教室']
        }
      }
    }

    // ── 云脑升级（管理台配置后生效；未配置时 server 秒回 501，本地兜底无感） ──
    if (true) {
      const cloud = await this._cloud(raw)
      if (cloud) return { ...base, kind: 'cloud', reply: cloud, layer: 'cloud', chips: ['最新通知', '哪里有空教室'] }
    }

    // ── 兜底 ────────────────────────────────────────
    return {
      ...base, kind: 'fallback',
      reply: this.t().fallback,
      chips: AGENT_PROFILE.examples.slice(0, 4)
    }
  }

  /* ── 意图启动 ──────────────────────────────────── */
  async _startWorkflow(it, raw, base, onStep) {
    const ctx = { text: raw, slots: {}, state: {}, lang: this.lang }
    // 轻量槽位预抽
    const kw = extractKeyword(raw, ['查一下', '查询', '搜索', '搜', '找', '关于', '通知', '打开'])
    if (kw) ctx.slots.keyword = kw

    const wf = it.wf

    // 澄清预检
    const askField = this._preflight(wf, ctx)
    if (askField) {
      this.pending = { kind: 'clarify', wfId: wf, ctx, field: askField }
      return { ...base, kind: 'clarify', reply: ASK[askField] || '请补充一下信息', pendingField: askField }
    }

    const meta = workflowMeta(wf)
    // 写操作确认
    if (meta && meta.needConfirm) {
      const what = ctx.slots.thing || ctx.slots.keyword || meta.title
      this.pending = { kind: 'confirm', wfId: wf, ctx }
      return {
        ...base, kind: 'confirm',
        reply: this.t().confirmTpl.replace('{text}', `${meta.title} · ${what}`),
        wf: meta,
        confirmActions: true,
        chips: ['确认', '取消']
      }
    }

    return this._execute(wf, ctx, base, onStep)
  }

  /* ── 澄清预检：返回缺失字段名或 null ─────────────── */
  _preflight(wfId, ctx) {
    if (wfId === 'addSchedule') {
      const s = extractScheduleSlots(ctx.text)
      ctx.slots.time = s.time
      ctx.slots.thing = s.thing
      if (!s.time) return 'time'
      if (!s.thing) return 'thing'
      return null
    }
    if (wfId === 'searchNotice') {
      if (!ctx.slots.keyword) return 'keyword'
      return null
    }
    if (wfId === 'courseQuery') {
      const kw = extractKeyword(ctx.text, ['查', '查询', '课表', '课程', '谁教', '哪门', '班级', '老师'])
      if (kw) ctx.slots.keyword = kw
      if (!ctx.slots.keyword) return 'keyword'
      return null
    }
    if (wfId === 'dayClass') {
      if (!readClass()) return 'class'
      return null
    }
    if (wfId === 'jumpService') {
      const t = ctx.text.toLowerCase()
      const known = ['vpn', '织网', '校外', '知网', '论文', '邮箱', '办事', '教务', '选课', '成绩', '图书馆', '资源']
      if (!known.some((k) => t.includes(k))) return 'service'
      return null
    }
    return null
  }

  /* ── 澄清续接 ──────────────────────────────────── */
  async _resumeClarify(p, raw, onStep) {
    // 用户可能在补槽位时又提出了新请求：若识别到全新强意图则优先新意图
    const r = recognize(raw)
    if (r.layer === 'intent' && r.score >= 60 && r.intent.kind === 'workflow') {
      return this._startWorkflow(r.intent, raw, { confidence: r.score, layer: r.layer }, onStep)
    }
    const ctx = p.ctx
    if (p.field === 'keyword') ctx.slots.keyword = extractKeyword(raw) || raw
    else if (p.field === 'thing') ctx.slots.thing = raw
    else if (p.field === 'class') ctx.slots.keyword = raw
    else if (p.field === 'service') ctx.text = raw
    else if (p.field === 'time') {
      const s = extractScheduleSlots(raw)
      ctx.text = ctx.text + ' ' + raw
      if (s.time) ctx.slots.time = s.time
      if (s.thing && !ctx.slots.thing) ctx.slots.thing = s.thing
      if (!ctx.slots.time) { this.pending = { kind: 'clarify', wfId: p.wfId, ctx, field: 'time' }; return { kind: 'clarify', reply: ASK.time } }
    } else if (p.field === 'thing') ctx.slots.thing = raw

    // 班级记忆落库
    if (p.field === 'class') {
      try { localStorage.setItem('qdu_agent_class', raw.trim()) } catch { /* noop */ }
      ctx.text = `班级是${raw.trim()}`
    }

    const meta = workflowMeta(p.wfId)
    if (meta && meta.needConfirm && p.wfId !== 'addSchedule') {
      this.pending = { kind: 'confirm', wfId: p.wfId, ctx }
      return { kind: 'confirm', reply: this.t().confirmTpl.replace('{text}', meta.title), wf: meta, confirmActions: true, chips: ['确认', '取消'] }
    }
    if (p.wfId === 'addSchedule') {
      const again = this._preflight('addSchedule', ctx)
      if (again) { this.pending = { kind: 'clarify', wfId: 'addSchedule', ctx, field: again }; return { kind: 'clarify', reply: ASK[again] } }
      this.pending = { kind: 'confirm', wfId: 'addSchedule', ctx }
      return {
        kind: 'confirm',
        reply: this.t().confirmTpl.replace('{text}', `加入日程：${ctx.slots.thing} · ${ctx.slots.time.label}`),
        wf: meta, confirmActions: true, chips: ['确认', '取消']
      }
    }
    return this._execute(p.wfId, ctx, { confidence: 80, layer: 'clarify-resume' }, onStep)
  }

  /* ── 执行工作流 ────────────────────────────────── */
  async _execute(wfId, ctx, baseOrOnStep, maybeOnStep) {
    // 兼容 (id, ctx, base, onStep) 与 (id, ctx, onStep) 两种调用
    const base = (baseOrOnStep && typeof baseOrOnStep === 'object' && !('index' in baseOrOnStep)) ? baseOrOnStep : { confidence: 90, layer: 'intent' }
    const onStep = typeof baseOrOnStep === 'function' ? baseOrOnStep : maybeOnStep
    const meta = workflowMeta(wfId)
    try {
      const card = await runWorkflow(wfId, ctx, onStep)
      // 记住本次成功执行（供下一轮指代消解；失败不记，避免错上加错）
      try {
        this.lastCtx = { wfId, slots: JSON.parse(JSON.stringify(ctx.slots || {})), text: ctx.text }
      } catch { this.lastCtx = { wfId, slots: {}, text: ctx.text } }
      return {
        ...base, kind: 'workflow',
        reply: `${meta.icon} ${meta.title} 执行完成`,
        wf: meta, card,
        chips: followupsFor(wfId)
      }
    } catch (e) {
      if (e && e.isClarify) {
        const field = e.field
        this.pending = { kind: 'clarify', wfId, ctx, field }
        return { ...base, kind: 'clarify', reply: e.ask || ASK[field] || '请补充一下信息', pendingField: field }
      }
      return {
        ...base, kind: 'workflow',
        reply: `执行遇到问题：${e.message || '未知错误'}。已保留你的请求，可重试或换个说法。`,
        wf: meta,
        error: true,
        chips: ['重试', '换个说法']
      }
    }
  }

  /* ── 应用直达卡片 ──────────────────────────────── */
  _appDirect(appId, base, raw) {
    return {
      ...base, kind: 'app',
      reply: `打开「${appId}」——也可以直接说需求，我来替你选应用。`,
      card: this._appCardById(appId),
      chips: ['你能做什么', '今天吃什么']
    }
  }

  _appCard(app, list) {
    return {
      title: `📱 ${app.title}`,
      subtitle: app.desc,
      rows: [{ icon: app.icon, label: app.title, value: app.desc }],
      actions: [
        { label: `打开「${app.title}」`, type: 'openApp', value: app.id },
        ...(list || []).slice(1, 3).map((a) => ({ label: `或打开「${a.title}」`, type: 'openApp', value: a.id }))
      ]
    }
  }

  _appCardById(id) {
    const r = recognize(id)
    if (r.layer === 'app') return this._appCard(r.app, r.apps)
    return { title: `📱 ${id}`, rows: [], actions: [{ label: '打开', type: 'openApp', value: id }] }
  }

  /* ── 主动问候（助手页空会话开场：时段 + 画像推送，不打扰老会话） ── */
  greeting() {
    let pushes = []
    try {
      pushes = pushList({
        dueReviews: dueReviews(),
        activities: upcoming(),
        jobs: matchJobs(readProfile(), 2).map((m) => m.job)
      })
    } catch { pushes = [] }
    const g = buildGreeting({ agentName: AGENT_PROFILE.agentName, pushes })
    return { kind: 'meta', layer: 'greeting', confidence: 100, reply: g.reply, card: g.card, chips: g.chips }
  }

  /* ── 云脑（走本机 /api/chat 代理：密钥只存 server，前端零暴露） ── */
  async _cloud(text) {
    try {
      const ctrl = new AbortController()
      const timer = setTimeout(() => ctrl.abort(), 16000)
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: ctrl.signal,
        body: JSON.stringify({
          messages: [
            { role: 'system', content: `你是${AGENT_PROFILE.schoolShort}校园智能助手，回答简洁、只谈校园相关话题、不编造数据、不发挥无关内容。` },
            { role: 'user', content: text }
          ]
        })
      })
      clearTimeout(timer)
      const d = await res.json().catch(() => ({}))
      if (!res.ok || !d.ok) return null // 未配置(501)/上游失败(502) → 静默回退本地
      return d.content || null
    } catch {
      return null
    }
  }
}

export function createEngine(lang) {
  return new AgentEngine({ lang })
}
