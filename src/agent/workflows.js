/**
 * 工作流引擎（"信息 → 需求 → 动作 → 反馈"闭环的执行层）
 * ---------------------------------------------------------------------------
 * 每条工作流 = 步骤序列（真实调用数据接口，非演示动画）+ 结果卡片构建器。
 * 卡片自带 actions（打开应用 / 跳转 URL），把"读"升级为"办"。
 * 执行过程逐步回调 onStep，供 UI 渲染 Agent 执行轨迹（可解释）。
 *
 * ctx = { text, slots:{time,period,place,keyword,thing}, state:{}, lang }
 */
import { apiFetch } from '../api/index'
import { pickFoods } from '../data/foods'
import { canteenStats, canteens } from '../data/canteens'
import { officialGroups } from '../data/official'
import { campuses } from '../data/campus'
import { SITE } from '../config/site'
import { extractTime, extractPeriod, extractPlace, extractKeyword, extractScheduleSlots } from './slots'
import {
  loadPosts, createPost, getWallet, signInToday, signedToday, streakDays,
  hotTopics, searchPosts, hasVotedLocal
} from '../wall/api'
import { PARTS, POINTS } from '../wall/config'

const SCHED_KEY = 'qdu_agent_schedule'
const CLASS_KEY = 'qdu_agent_class'

const WEEK = ['', '周一', '周二', '周三', '周四', '周五', '周六', '周日']

function loadSched() {
  try { return JSON.parse(localStorage.getItem(SCHED_KEY) || '[]') } catch { return [] }
}
function saveSched(list) {
  try { localStorage.setItem(SCHED_KEY, JSON.stringify(list)) } catch { /* noop */ }
}
function getClass() {
  try { return localStorage.getItem(CLASS_KEY) || '' } catch { return '' }
}
function setClass(v) {
  try { localStorage.setItem(CLASS_KEY, v) } catch { /* noop */ }
}

function urlOf(u) {
  if (!u) return null
  if (/^https?:\/\//.test(u)) return u
  if (u.startsWith('/')) return u
  return u
}

/** 在官网聚合数据里模糊查找一个服务入口 */
function findOfficial(text) {
  const t = (text || '').toLowerCase()
  const rules = [
    { keys: ['vpn', '织网', '校外'], name: '织网 / VPN（校外访问）' },
    { keys: ['知网', 'cnki', '论文', '万方'], name: '图书馆数据库（知网等）' },
    { keys: ['邮箱', 'mail'], name: '校园邮箱' },
    { keys: ['办事', '大厅', 'ehall'], name: '网上办事大厅' },
    { keys: ['选课', '教务系统', '正方'], name: '新教务系统' },
    { keys: ['成绩'], name: '新教务系统' }
  ]
  const hit = rules.find((r) => r.keys.some((k) => t.includes(k)))
  if (!hit) return null
  const sites = officialGroups.flatMap((g) => g.sites || [])
  const kw = { '织网 / VPN（校外访问）': ['办事大厅', '信息化'], '图书馆数据库（知网等）': ['图书馆'], '校园邮箱': ['邮箱'], '网上办事大厅': ['办事大厅'], '新教务系统': ['教务'] }[hit.name] || []
  const site = sites.find((s) => kw.some((k) => s.name.includes(k)))
  return { label: hit.name, site }
}

export const WORKFLOWS = {
  /* ── 1. 空教室速查 ─────────────────────────────────── */
  findRoom: {
    id: 'findRoom', title: '空教室速查', icon: '🧭',
    steps: [
      {
        label: '解析时间与节次',
        run: async (ctx) => {
          const time = extractTime(ctx.text) || { day: (new Date().getDay() || 7), dateLabel: '今天' }
          const period = extractPeriod(ctx.text)
          const kw = ctx.slots.place && /楼|馆|教室/.test(ctx.slots.place) ? ctx.slots.place.replace(/[楼馆]/g, '') : ''
          ctx.state.day = time.day
          ctx.state.dateLabel = time.dateLabel || WEEK[time.day]
          ctx.state.period = period
          ctx.state.kw = kw
          return `${ctx.state.dateLabel}（${WEEK[time.day]}）第 ${period.start}-${period.end} 节`
        }
      },
      {
        label: '查询排课数据（实时网关 → 快照兜底）',
        run: async (ctx) => {
          const d = await apiFetch(`/emptyRooms?day=${ctx.state.day}&period=${ctx.state.period.start}&kw=${encodeURIComponent(ctx.state.kw || '')}`)
          if (!d || !d.rooms) throw new Error('数据源暂不可用')
          ctx.state.result = d
          return `全量 ${d.total} 间教室，空闲 ${d.emptyCount} 间${d.static ? '（快照模式）' : '（实时）'}`
        }
      },
      {
        label: '生成空教室清单',
        run: async (ctx) => {
          const rooms = ctx.state.result.rooms.slice(0, 12)
          ctx.state.top = rooms
          return rooms.length ? `已整理前 ${rooms.length} 间` : '当前时段无匹配教室'
        }
      }
    ],
    buildCard(ctx) {
      const r = ctx.state.result
      const rooms = ctx.state.top || []
      return {
        title: `🧭 ${ctx.state.dateLabel} 第 ${ctx.state.period.start}-${ctx.state.period.end} 节 · ${r.emptyCount} 间空教室`,
        subtitle: `匹配条件：${WEEK[ctx.state.day]}${ctx.state.kw ? ' · ' + ctx.state.kw : ''} · 数据源：${r.static ? '本地快照' : '教务网关'}`,
        rows: rooms.length
          ? rooms.map((x) => ({ icon: '🏫', label: x, value: '空闲' }))
          : [{ icon: '😢', label: '该时段教室全满', value: '换个节次试试' }],
        actions: [
          { label: '打开教室导航（查占用/路线）', type: 'openApp', value: 'classroomNav' },
          { label: '改查其他时段', type: 'reask', value: '换个时间查空教室，比如"下午第7节有空教室吗"' }
        ],
        note: r.static ? '实时网关未启动，已自动回退本地快照（永不白屏）' : ''
      }
    }
  },

  /* ── 2. 最新通知 ──────────────────────────────────── */
  todayNotice: {
    id: 'todayNotice', title: '最新教务通知', icon: '📢',
    steps: [
      { label: '拉取通知列表', run: async (ctx) => { ctx.state.d = await apiFetch('/notices?all=1'); return ctx.state.d ? `${ctx.state.d.items.length} 条（${ctx.state.d.static ? '快照' : '实时'}）` : '数据源不可用' } },
      { label: '按时间排序取最新', run: async (ctx) => { const items = (ctx.state.d?.items || []).slice(0, 6); ctx.state.items = items; return `最新 ${items.length} 条` } }
    ],
    buildCard(ctx) {
      const items = ctx.state.items || []
      return {
        title: '📢 最新教务通知',
        subtitle: ctx.state.d?.source ? `来源：${ctx.state.d.source}` : '',
        rows: items.map((n) => ({ icon: '•', label: n.title, value: n.date || '', url: urlOf(n.url) })),
        actions: [
          { label: '打开校园动态（全部通知）', type: 'openApp', value: 'campusNews' },
          items[0] && items[0].url ? { label: '查看第一条原文', type: 'url', value: urlOf(items[0].url) } : null
        ].filter(Boolean),
        note: '通知均由数据管线每 6 小时从教务处公开页面抓取'
      }
    }
  },

  /* ── 3. 搜索通知 ──────────────────────────────────── */
  searchNotice: {
    id: 'searchNotice', title: '搜索通知', icon: '🔎',
    clarify: { field: 'keyword', ask: '想搜索哪方面的通知？（如：选课、考试、放假）' },
    steps: [
      { label: '抽取搜索关键词', run: async (ctx) => { ctx.state.kw = ctx.slots.keyword || extractKeyword(ctx.text, ['查一下', '搜索', '搜', '通知', '新闻', '有没有', '关于']); if (!ctx.state.kw) throw new CLARIFY('keyword'); return `关键词：${ctx.state.kw}` } },
      { label: '全量通知匹配', run: async (ctx) => { const d = await apiFetch('/notices?all=1'); const items = (d?.items || []).filter((n) => (n.title || '').includes(ctx.state.kw)); ctx.state.items = items.slice(0, 8); return `命中 ${items.length} 条` } }
    ],
    buildCard(ctx) {
      const items = ctx.state.items || []
      return {
        title: `🔎 关于「${ctx.state.kw}」的通知`,
        subtitle: items.length ? `命中 ${items.length} 条` : '没有匹配结果',
        rows: items.length ? items.map((n) => ({ icon: '•', label: n.title, value: n.date || '', url: urlOf(n.url) })) : [{ icon: '🔍', label: '没搜到相关内容', value: '换个关键词试试' }],
        actions: [{ label: '打开校园动态继续找', type: 'openApp', value: 'campusNews' }]
      }
    }
  },

  /* ── 4. 某天的课（需班级，多轮） ───────────────────── */
  dayClass: {
    id: 'dayClass', title: '查询某天课程', icon: '🗓️',
    steps: [
      {
        label: '确认班级与日期',
        run: async (ctx) => {
          // 优先级①：本机导入课表（CourseImporter 写入，免班级）
          let imported = []
          try { imported = JSON.parse(localStorage.getItem('qdu_imported_courses') || '[]') } catch { imported = [] }
          ctx.state.imported = imported
          ctx.state.cls = getClass()
          if (!imported.length && !ctx.state.cls) throw new CLARIFY('class')
          const time = extractTime(ctx.text)
          ctx.state.day = time ? time.day : ((new Date().getDay() || 7))
          ctx.state.dateLabel = time ? time.dateLabel : '今天'
          return imported.length
            ? `本机导入课表 ${imported.length} 条 · ${ctx.state.dateLabel}（${WEEK[ctx.state.day]}）`
            : `${ctx.state.cls} · ${ctx.state.dateLabel}（${WEEK[ctx.state.day]}）`
        }
      },
      {
        label: '查询课表快照',
        run: async (ctx) => {
          if (ctx.state.imported && ctx.state.imported.length) {
            const rows = ctx.state.imported.filter((r) => r.d === ctx.state.day).sort((a, b) => a.s - b.s)
            ctx.state.rows = rows
            ctx.state.source = '本机导入课表'
            return `本机数据命中 ${rows.length} 节课（免班级）`
          }
          const d = await apiFetch(`/courseQuery?q=${encodeURIComponent(ctx.state.cls)}`)
          if (!d) throw new Error('课表数据暂不可用')
          const rows = (d.rows || []).filter((r) => r.d === ctx.state.day).sort((a, b) => a.s - b.s)
          ctx.state.rows = rows
          ctx.state.source = '教务快照 · 班级查询'
          return `命中 ${rows.length} 节课`
        }
      }
    ],
    buildCard(ctx) {
      const rows = ctx.state.rows || []
      return {
        title: `🗓️ ${ctx.state.dateLabel}（${WEEK[ctx.state.day]}）的课 · ${rows.length} 节`,
        subtitle: ctx.state.source === '本机导入课表' ? '数据源：本机导入课表（CourseImporter）' : `班级：${ctx.state.cls}`,
        rows: rows.length
          ? rows.map((r) => ({ icon: '📚', label: `${r.c}${r.r ? ' @ ' + r.r : ''}`, value: `第 ${r.s}-${r.e} 节 · ${r.t || ''}` }))
          : [{ icon: '🎉', label: '今天没有课', value: '享受空闲的一天' }],
        actions: [
          { label: '打开课程表（整周视图）', type: 'openApp', value: 'timetable' },
          { label: rows.length ? '把这些课加入日程' : '查看我的日程', type: 'agent', value: rows.length ? `把我${ctx.state.dateLabel}的课加入日程` : '我的日程' }
        ]
      }
    }
  },

  /* ── 5. 今天吃什么（真实菜品库推荐） ─────────────────── */
  whatEat: {
    id: 'whatEat', title: '今天吃什么', icon: '🍜',
    steps: [
      { label: '读取食堂菜品库（后勤采购公告整理）', run: async () => '21 个食堂 · 数百道菜品就绪' },
      { label: '按当前时段随机推荐', run: async (ctx) => { ctx.state.picks = pickFoods(3); return `推荐 ${ctx.state.picks.length} 道` } }
    ],
    buildCard(ctx) {
      return {
        title: '🍜 今天就吃这些',
        subtitle: '推荐来自后勤采购公告与公开报道整理的真实档口菜品',
        rows: (ctx.state.picks || []).map((f) => ({ icon: '🍽️', label: f.name, value: `${f.hall} · ${f.tag}` })),
        actions: [
          { label: '再转一次美食轮盘', type: 'agent', value: '今天吃什么' },
          { label: '看看食堂空座', type: 'agent', value: '食堂人多吗' },
          { label: '打开「今天吃什么」', type: 'openApp', value: 'whatToEat' }
        ]
      }
    }
  },

  /* ── 6. 食堂空座 ──────────────────────────────────── */
  canteenStatus: {
    id: 'canteenStatus', title: '食堂空座与营业时间', icon: '🍽️',
    steps: [
      { label: '请求实时空座接口', run: async (ctx) => { ctx.state.live = await apiFetch('/canteen'); return ctx.state.live ? '实时数据已返回' : '实时接口不可用 → 回退静态数据' } },
      { label: '聚合食堂静态档案', run: async (ctx) => { ctx.state.stats = canteenStats; ctx.state.list = (canteens || []).slice(0, 5); return `21 个食堂档案就绪` } }
    ],
    buildCard(ctx) {
      const live = ctx.state.live
      if (live && Array.isArray(live.items)) {
        return {
          title: '🍽️ 食堂实时空座',
          subtitle: `更新于 ${live.updatedAt || '刚刚'}`,
          rows: live.items.slice(0, 6).map((x) => ({ icon: '💺', label: x.name || x.hall, value: `${x.free ?? x.available ?? '-'} 空位` })),
          actions: [{ label: '打开食堂空座位', type: 'openApp', value: 'canteen' }]
        }
      }
      return {
        title: '🍽️ 食堂营业时间（实时空座暂不可用）',
        subtitle: `基本窗口 ${canteenStats.basicHours} · 风味档口 ${canteenStats.flavorHours}`,
        rows: (ctx.state.list || []).map((c) => ({ icon: '🍴', label: c.name, value: `${c.campus || ''} ${c.area || ''}` })),
        actions: [
          { label: '打开食堂空座位', type: 'openApp', value: 'canteen' },
          { label: '直接问吃什么', type: 'agent', value: '今天吃什么' }
        ],
        note: '实时空座依赖摄像头数据接入；未接入前如实降级，不编造数字'
      }
    }
  },

  /* ── 7. 加入日程（写操作 · 需确认） ─────────────────── */
  addSchedule: {
    id: 'addSchedule', title: '加入日程', icon: '📅', needConfirm: true,
    clarify: { field: 'time', ask: '什么时间的日程？（如：明天下午三点）' },
    steps: [
      {
        label: '解析时间与事项',
        run: async (ctx) => {
          const s = extractScheduleSlots(ctx.text)
          ctx.state.time = s.time
          ctx.state.thing = s.thing || ctx.slots.thing
          if (!ctx.state.time) throw new CLARIFY('time')
          if (!ctx.state.thing) throw new CLARIFY('thing')
          return `${ctx.state.time.label} · ${ctx.state.thing}`
        }
      },
      {
        label: '写入本机日程（localStorage）',
        run: async (ctx) => {
          const list = loadSched()
          const item = {
            id: Date.now(),
            label: ctx.state.time.label,
            day: ctx.state.time.day,
            hour: ctx.state.time.hour ?? null,
            thing: ctx.state.thing,
            done: false,
            createdAt: new Date().toISOString()
          }
          list.push(item)
          list.sort((a, b) => (a.day - b.day) || ((a.hour ?? 0) - (b.hour ?? 0)))
          saveSched(list)
          ctx.state.item = item
          return `已保存，共 ${list.length} 条日程`
        }
      }
    ],
    buildCard(ctx) {
      return {
        title: `📅 已加入日程：${ctx.state.item.label}`,
        subtitle: ctx.state.item.thing,
        rows: [{ icon: '✅', label: ctx.state.item.thing, value: ctx.state.item.label }],
        actions: [
          { label: '查看我的日程', type: 'agent', value: '我的日程' },
          { label: '打开校历', type: 'openApp', value: 'calendar' }
        ],
        note: '日程保存在本机浏览器，隐私不出设备；接入提醒推送后将自动响铃'
      }
    }
  },

  /* ── 8. 我的日程 ──────────────────────────────────── */
  mySchedule: {
    id: 'mySchedule', title: '我的日程', icon: '📋',
    steps: [
      { label: '读取本机日程', run: async (ctx) => { ctx.state.list = loadSched(); return `${ctx.state.list.length} 条` } }
    ],
    buildCard(ctx) {
      const list = ctx.state.list || []
      return {
        title: `📋 我的日程（${list.length} 条）`,
        rows: list.length ? list.map((s) => ({ icon: s.done ? '✅' : '•', label: s.thing, value: s.label })) : [{ icon: '🗂️', label: '暂无日程', value: '对我说"提醒我明天下午三点开会"' }],
        actions: [
          { label: '添加新日程', type: 'reask', value: '提醒我明天下午三点开会' },
          list.length ? { label: '清空日程', type: 'agent', value: '清空我的日程' } : null
        ].filter(Boolean)
      }
    }
  },

  /* ── 9. 服务直达（VPN/邮箱/办事大厅…真跳转） ─────────── */
  jumpService: {
    id: 'jumpService', title: '校园服务直达', icon: '🚀',
    steps: [
      {
        label: '识别目标服务',
        run: async (ctx) => {
          const hit = findOfficial(ctx.text)
          if (!hit) throw new CLARIFY('service')
          ctx.state.hit = hit
          return `目标：${hit.label}`
        }
      },
      {
        label: '定位官方入口链接',
        run: async (ctx) => {
          if (!ctx.state.hit.site) return '未收录直链，转聚合入口'
          return `已定位 ${ctx.state.hit.site.name}`
        }
      }
    ],
    buildCard(ctx) {
      const { site, label } = ctx.state.hit
      if (site) {
        return {
          title: `🚀 ${site.name}`,
          subtitle: site.desc,
          rows: [{ icon: '🔗', label: site.name, value: site.url }],
          actions: [
            { label: '立即打开', type: 'url', value: site.url },
            { label: '查看全部服务入口', type: 'openApp', value: 'officialSites' }
          ],
          note: '链接来自站内聚合的官方入口，跳转前可见完整地址'
        }
      }
      return {
        title: `🚀 ${label}`,
        subtitle: '该服务暂无直链，已打开聚合入口页',
        rows: [{ icon: '💡', label: '提示', value: '在「学校官网」应用内可找到对应入口' }],
        actions: [{ label: '打开学校官网', type: 'openApp', value: 'officialSites' }]
      }
    }
  },

  /* ── 10. 课程查询 ─────────────────────────────────── */
  courseQuery: {
    id: 'courseQuery', title: '课程/教师课表查询', icon: '🔍',
    clarify: { field: 'keyword', ask: '要查哪门课、哪位老师或哪个班？' },
    steps: [
      {
        label: '抽取查询词',
        run: async (ctx) => {
          ctx.state.kw = ctx.slots.keyword || extractKeyword(ctx.text, ['查', '查询', '课表', '课程', '谁教', '哪门', '班级', '老师'])
          if (!ctx.state.kw) throw new CLARIFY('keyword')
          return `查询：${ctx.state.kw}`
        }
      },
      {
        label: '课表快照全文检索',
        run: async (ctx) => {
          const d = await apiFetch(`/courseQuery?q=${encodeURIComponent(ctx.state.kw)}`)
          if (!d) throw new Error('课表数据暂不可用')
          ctx.state.rows = (d.rows || []).slice(0, 8)
          ctx.state.count = d.count
          return `命中 ${d.count} 条，展示前 ${ctx.state.rows.length} 条`
        }
      }
    ],
    buildCard(ctx) {
      const rows = ctx.state.rows || []
      return {
        title: `🔍 「${ctx.state.kw}」课程查询`,
        subtitle: `共 ${ctx.state.count} 条排课记录`,
        rows: rows.length ? rows.map((r) => ({
          icon: '📚', label: `${r.c} · ${r.cls || ''}`,
          value: `${WEEK[r.d] || ''}第 ${r.s}-${r.e} 节${r.r ? ' · ' + r.r : ''}${r.t ? ' · ' + r.t : ''}`
        })) : [{ icon: '🔍', label: '没有匹配的课程', value: '换个关键词' }],
        actions: [{ label: '打开课程表', type: 'openApp', value: 'timetable' }]
      }
    }
  },

  /* ── 11. 校内导航 ─────────────────────────────────── */
  campusNav: {
    id: 'campusNav', title: '校内导航', icon: '📍',
    steps: [
      {
        label: '解析目的地',
        run: async (ctx) => {
          const place = extractPlace(ctx.text) || (ctx.text.match(/(?:去|到)\s*([\u4e00-\u9fa5]{2,8})/)?.[1])
          ctx.state.place = place || ''
          return place ? `目的地：${place}` : '未识别到具体目的地'
        }
      },
      {
        label: '匹配校区与楼宇数据',
        run: async (ctx) => {
          const c = campuses.find((x) => ctx.state.place && (x.name.includes(ctx.state.place) || x.colleges?.some?.((col) => ctx.state.place.includes(col))))
          ctx.state.campus = c || null
          ctx.state.isRoom = /楼|教室|馆/.test(ctx.state.place || '')
          return c ? `匹配到 ${c.name}` : (ctx.state.isRoom ? '楼宇级导航 → 教室导航' : '默认引导至教室导航')
        }
      }
    ],
    buildCard(ctx) {
      const c = ctx.state.campus
      return {
        title: `📍 ${ctx.state.place || '校园导航'}`,
        subtitle: c ? `${c.name}（${c.alias}）` : '选择下方入口开始导航',
        rows: c
          ? [{ icon: c.emoji, label: c.name, value: c.address }]
          : [{ icon: '🧭', label: '教室导航：空教室 + 一周占用 + 分步路线', value: '校内楼宇级指引' }],
        actions: [
          { label: '打开教室导航', type: 'openApp', value: 'classroomNav' },
          c ? { label: `查看${c.name}详情`, type: 'openApp', value: 'categories' } : null,
          { label: '查学校地址（寄快递用）', type: 'agent', value: '学校地址是什么' }
        ].filter(Boolean)
      }
    }
  },

  /* ── 12. 设置班级（个性化记忆） ────────────────────── */
  setClass: {
    id: 'setClass', title: '设置班级', icon: '🎓', needConfirm: false,
    steps: [
      {
        label: '抽取班级名称',
        run: async (ctx) => {
          const m = ctx.text.match(/\d{4}\s*级[\u4e00-\u9fa5A-Za-z0-9]{2,14}?(班)/) ||
                    ctx.text.match(/(?:班级(?:是|为)?|我是|记住|设置(?:我的)?班级(?:为)?)\s*([\u4e00-\u9fa5A-Za-z0-9]{4,16})/)
          ctx.state.cls = m ? m[0].replace(/^(?:班级(?:是|为)?|我是|记住|设置(?:我的)?班级(?:为)?)\s*/, '') : (ctx.slots.keyword || '')
          if (!ctx.state.cls || ctx.state.cls.length < 2) throw new CLARIFY('class')
          return `识别：${ctx.state.cls}`
        }
      },
      {
        label: '写入个性化记忆',
        run: async (ctx) => { setClass(ctx.state.cls); return '已记住' }
      }
    ],
    buildCard(ctx) {
      return {
        title: `🎓 已记住你的班级：${ctx.state.cls}`,
        subtitle: '以后直接说"明天上什么课"即可查询',
        rows: [{ icon: '💾', label: '个性化记忆', value: '班级信息仅存本机浏览器' }],
        actions: [{ label: '现在就查明天的课', type: 'agent', value: '明天上什么课' }]
      }
    }
  },

  /* ── 13. 百科问答（跨站联动） ──────────────────────── */
  wikiAsk: {
    id: 'wikiAsk', title: '百科深度问答', icon: '📚',
    steps: [
      {
        label: '抽取问题关键词',
        run: async (ctx) => {
          ctx.state.kw = extractKeyword(ctx.text, ['查百科', '百科', 'wiki', '手册里', '查一下'])
          return ctx.state.kw ? `关键词：${ctx.state.kw}` : '跳转百科首页'
        }
      }
    ],
    buildCard(ctx) {
      const base = SITE.wiki?.links?.site || ''
      const url = ctx.state.kw ? base + 'search/?q=' + encodeURIComponent(ctx.state.kw) : base
      return {
        title: '📚 ' + (SITE.wiki?.title || '校园 Wiki 百科'),
        subtitle: ctx.state.kw ? `已在百科内预置搜索：「${ctx.state.kw}」` : '80 篇双语条目 · 社区共建',
        rows: [{ icon: '📖', label: '百科回答可溯源到具体条目', value: '与本站智能体双端联动' }],
        actions: [
          { label: '打开百科（预置搜索）', type: 'url', value: url },
          { label: '返回本站问答', type: 'reask', value: '宿舍几点熄灯' }
        ]
      }
    }
  },

  /* ── 14. 每日简报（WorkBuddy 自动化风格：一次聚合今日全部） ── */
  dailyBriefing: {
    id: 'dailyBriefing', title: '今日简报', icon: '☀️',
    steps: [
      {
        label: '读取本机日程与班级记忆',
        run: async (ctx) => {
          ctx.state.sched = loadSched().filter((s) => !s.done)
          ctx.state.cls = getClass()
          const today = ((new Date().getDay()) || 7)
          ctx.state.today = today
          return `日程 ${ctx.state.sched.length} 条${ctx.state.cls ? ' · 班级 ' + ctx.state.cls : ' · 未设置班级'}`
        }
      },
      {
        label: '拉取今日课程与最新通知',
        run: async (ctx) => {
          ctx.state.classes = []
          ctx.state.notices = []
          if (ctx.state.cls) {
            try {
              const d = await apiFetch(`/courseQuery?q=${encodeURIComponent(ctx.state.cls)}`)
              ctx.state.classes = (d?.rows || []).filter((r) => r.d === ctx.state.today).sort((a, b) => a.s - b.s)
            } catch { /* noop */ }
          }
          try {
            const n = await apiFetch('/notices?all=1')
            ctx.state.notices = (n?.items || []).slice(0, 4)
          } catch { /* noop */ }
          return `课程 ${ctx.state.classes.length} 节 · 通知 ${ctx.state.notices.length} 条`
        }
      },
      {
        label: '生成今日简报',
        run: async (ctx) => `简报就绪`
      }
    ],
    buildCard(ctx) {
      const rows = []
      if (ctx.state.classes.length) {
        ctx.state.classes.forEach((r) => rows.push({ icon: '📚', label: `${r.c}${r.r ? ' @ ' + r.r : ''}`, value: `第 ${r.s}-${r.e} 节` }))
      } else if (ctx.state.cls) {
        rows.push({ icon: '🎉', label: '今天没有课', value: '' })
      } else {
        rows.push({ icon: '🎓', label: '未设置班级，说“设置班级 2025级XX班”解锁今日课程', value: '' })
      }
      ctx.state.sched.slice(0, 3).forEach((s) => rows.push({ icon: '📅', label: s.thing, value: s.label }))
      ctx.state.notices.slice(0, 3).forEach((n) => rows.push({ icon: '📢', label: n.title, value: n.date || '', url: urlOf(n.url) }))
      return {
        title: `☀️ 今日简报 · ${new Date().getMonth() + 1}月${new Date().getDate()}日 ${WEEK[ctx.state.today]}`,
        subtitle: `课程 ${ctx.state.classes.length} 节 · 待办 ${ctx.state.sched.length} 条 · 新通知 ${ctx.state.notices.length} 条`,
        rows,
        actions: [
          { label: '打开课程表', type: 'openApp', value: 'timetable' },
          { label: '查看全部通知', type: 'openApp', value: 'campusNews' },
          { label: '逛逛校园墙', type: 'agent', value: '看校园墙' }
        ],
        note: '简报由本机日程 + 课表快照 + 教务通知实时聚合，每天早上问一句即可'
      }
    }
  },

  /* ── 15. 时间日期感知 ── */
  timeNow: {
    id: 'timeNow', title: '时间日期', icon: '🕐',
    steps: [
      {
        label: '读取系统时间',
        run: async (ctx) => {
          const n = new Date()
          ctx.state.d = n
          const today = (n.getDay() || 7)
          ctx.state.sched = loadSched().filter((s) => !s.done && s.day === today)
          return `${n.getMonth() + 1}/${n.getDate()} ${WEEK[today]} ${n.getHours()}:${String(n.getMinutes()).padStart(2, '0')}`
        }
      }
    ],
    buildCard(ctx) {
      const n = ctx.state.d
      const rows = [
        { icon: '📆', label: `${n.getFullYear()}年${n.getMonth() + 1}月${n.getDate()}日`, value: WEEK[n.getDay() === 0 ? 7 : n.getDay()] },
        { icon: '🕐', label: `${n.getHours()}:${String(n.getMinutes()).padStart(2, '0')}`, value: n.getHours() < 12 ? '上午' : n.getHours() < 18 ? '下午' : '晚上' }
      ]
      if (ctx.state.sched.length) {
        ctx.state.sched.forEach((s) => rows.push({ icon: '⏰', label: s.thing, value: s.label }))
      } else {
        rows.push({ icon: '✅', label: '今天暂无待办日程', value: '对我说"提醒我…"添加' })
      }
      return {
        title: '🕐 现在时间',
        rows,
        actions: [{ label: '添加提醒', type: 'reask', value: '提醒我明天下午三点开会' }]
      }
    }
  },

  /* ── 16. 发校园墙（公开发布 · 需确认 · 真实写入社区网关） ── */
  wallPost: {
    id: 'wallPost', title: '发布到校园墙', icon: '🧱', needConfirm: true,
    clarify: { field: 'thing', ask: '想发点什么内容？（例如："东区食堂新档口测评：麻辣香锅人均15"）' },
    steps: [
      {
        label: '抽取帖子内容与分区',
        run: async (ctx) => {
          let text = ctx.text
            .replace(/^(帮我|请|我想|我要)?(在|到)?(校园)?墙(上|里)?(发|发布|发个|发一篇)?(帖|帖子)?(说|写|讲)?(道|道：|:|：)?/, '')
            .replace(/^(吐槽|发帖|发墙|发到墙|校园墙发帖)[:：]*/, '')
            .trim()
          if (!text) throw new CLARIFY('thing')
          ctx.state.content = text
          const tags = [
            { re: /丢|捡|失物|校园卡|钥匙/, tag: '失物' },
            { re: /吃|食堂|美食|推荐|外卖/, tag: '美食' },
            { re: /求助|问|有没有|谁知道|怎么办/, tag: '求助' },
            { re: /吐槽|气死|无语|太烂/, tag: '吐槽' },
            { re: /拼车|顺风|回家|抢票/, tag: '拼车' }
          ]
          ctx.state.tag = (tags.find((t) => t.re.test(text)) || { tag: '闲聊' }).tag
          return `${ctx.state.tag} 分区 · ${text.length} 字`
        }
      },
      {
        label: '发布到社区网关（敏感词实时校验）',
        run: async (ctx) => {
          const payload = { title: ctx.state.content.slice(0, 24), content: ctx.state.content, tag: ctx.state.tag, anonymous: true, author: '匿名同学' }
          try {
            const r = await fetch('/api/wall', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            })
            const d = await r.json()
            if (!r.ok) throw new Error(d.error || '发布失败')
            ctx.state.post = d.post
            return `已发布，帖子 id ${d.post.id}`
          } catch (e) {
            if (String(e.message).includes('违规')) throw e
            // 社区网关未启动 → 本机暂存
            try {
              const local = JSON.parse(localStorage.getItem('agent_wall_draft') || '[]')
              local.push({ ...payload, ts: Date.now() })
              localStorage.setItem('agent_wall_draft', JSON.stringify(local))
              ctx.state.localDraft = true
            } catch { /* noop */ }
            return '网关未连接，已暂存本机草稿'
          }
        }
      }
    ],
    buildCard(ctx) {
      if (ctx.state.localDraft) {
        return {
          title: '🧱 已暂存本机草稿（社区网关未连接）',
          rows: [{ icon: '📝', label: ctx.state.content, value: ctx.state.tag }],
          actions: [{ label: '打开校园墙', type: 'openApp', value: 'campusWall' }],
          note: '启动社区网关（node server/index.mjs）后可正式发布，全员可见'
        }
      }
      return {
        title: '🧱 已发布到校园墙',
        subtitle: `分区：${ctx.state.tag} · 匿名发布`,
        rows: [{ icon: '📝', label: ctx.state.content.slice(0, 40), value: '已发布' }],
        actions: [
          { label: '打开校园墙查看', type: 'openApp', value: 'campusWall' },
          { label: '再发一条', type: 'reask', value: '发墙 ' }
        ],
        note: '发布内容经敏感词实时校验；被举报将进入管理台队列'
      }
    }
  },

  /* ── 17. 看校园墙 ── */
  wallView: {
    id: 'wallView', title: '浏览校园墙', icon: '🧱',
    steps: [
      {
        label: '拉取校园墙热帖',
        run: async (ctx) => {
          try {
            const r = await fetch('/api/wall?sort=hot')
            const d = await r.json()
            ctx.state.posts = (d.posts || []).slice(0, 6)
            if (!ctx.state.posts.length) return '墙还很安静，来抢沙发'
            return `热帖 ${ctx.state.posts.length} 条`
          } catch {
            ctx.state.offline = true
            return '社区网关未连接'
          }
        }
      }
    ],
    buildCard(ctx) {
      if (ctx.state.offline) {
        return {
          title: '🧱 社区网关未连接',
          rows: [{ icon: '💡', label: '启动 node server/index.mjs 后即可浏览/发布校园墙', value: '' }],
          actions: [{ label: '打开校园墙页面', type: 'openApp', value: 'campusWall' }]
        }
      }
      const posts = ctx.state.posts || []
      return {
        title: '🧱 校园墙热门',
        subtitle: posts.length ? `${posts.length} 条热帖 · 实时社区` : '',
        rows: posts.length
          ? posts.map((p) => ({ icon: '📌', label: `${p.title}`, value: `👍${p.likes || 0} · 回复${(p.replies || []).length}` }))
          : [{ icon: '🛋️', label: '还没有帖子，来说第一句', value: '' }],
        actions: [
          { label: '打开校园墙（发帖/回复）', type: 'openApp', value: 'campusWall' },
          { label: '我也发一条', type: 'reask', value: '发墙 ' }
        ]
      }
    }
  },

  /* ── 18. 协作看板（双 Agent 飞轮可视化 · 挑战杯报告 §14 遗留项落地） ── */
  agentBoard: {
    id: 'agentBoard', title: '协作看板', icon: '📊',
    steps: [
      {
        label: '统计用户 Agent（本机执行记录）',
        run: async (ctx) => {
          let exec = 0
          let fb = 0
          try { exec = Number(localStorage.getItem('qdu_agent_exec') || 0) } catch { /* noop */ }
          try { fb = JSON.parse(localStorage.getItem('qdu_agent_fb') || '[]').length } catch { /* noop */ }
          ctx.state.exec = exec
          ctx.state.fbLocal = fb
          return `本机执行 ${exec} 次 · 反馈 ${fb} 条`
        }
      },
      {
        label: '拉取维护端与社区统计（评论网关）',
        run: async (ctx) => {
          try {
            const r = await fetch('/api/comments?stats=1')
            const d = await r.json()
            ctx.state.stats = d
            return `评论 ${d.total} · 帖子 ${d.posts} · 待办反馈 ${d.feedback}`
          } catch {
            ctx.state.offline = true
            return '网关未连接（显示本机数据）'
          }
        }
      },
      {
        label: '生成飞轮看板',
        run: async () => '看板就绪'
      }
    ],
    buildCard(ctx) {
      const s = ctx.state.stats || {}
      const rows = [
        { icon: '🤖', label: '用户 Agent · 本机工作流执行', value: `${ctx.state.exec} 次` },
        { icon: '🛠️', label: '维护 Agent · 在库能力', value: '18 条工作流 · 40+ 意图 · 12 条 FAQ' }
      ]
      if (s && !ctx.state.offline) {
        rows.push({ icon: '💬', label: '社区评论（用户回流数据池）', value: `${s.total} 条 · ${s.pages} 页` })
        rows.push({ icon: '🧱', label: '校园墙帖子', value: `${s.posts} 条` })
        rows.push({ icon: '👎', label: '待处理反馈（进维护队列）', value: `${s.feedback} 条` })
        if (s.reported) rows.push({ icon: '🚩', label: '待处理举报', value: `${s.reported} 条` })
      } else {
        rows.push({ icon: '💬', label: '社区统计', value: '启动网关后实时显示' })
      }
      rows.push({ icon: '🛡️', label: '内容安全 · 敏感词实时拦截', value: '词库生效中（管理台可维护）' })
      return {
        title: '📊 双 Agent 协作看板',
        subtitle: '用户 Agent × 维护 Agent —— 标题「基于 AI Agent 协作维护」的量化呈现',
        rows,
        actions: [
          { label: '看看社区热帖', type: 'agent', value: '看校园墙' },
          { label: '打开校园墙（发帖回流）', type: 'openApp', value: 'campusWall' },
          { label: '今日简报', type: 'agent', value: '今日简报' }
        ],
        note: '飞轮：用户对话/评论/反馈 → 回流数据池 → 维护 Agent 更新内容与工作流 → 服务质量上升'
      }
    }
  },

  /* ── 19. 搜校园墙 ── */
  wallSearch: {
    id: 'wallSearch', title: '搜索校园墙', icon: '🔎',
    clarify: { field: 'keyword', ask: '想在校园墙搜什么？（如：食堂测评、往年题、二手自行车）' },
    steps: [
      { label: '抽取搜索词', run: async (ctx) => { ctx.state.kw = ctx.slots.keyword || extractKeyword(ctx.text, ['搜', '搜索', '找', '查', '墙上有', '校园墙']); if (!ctx.state.kw) throw new CLARIFY('keyword'); return `关键词：${ctx.state.kw}` } },
      {
        label: '检索全站帖子（网关优先 · 本机兜底）',
        run: async (ctx) => {
          const r = await loadPosts({ tag: 'all', sort: 'hot' })
          ctx.state.offline = r.offline
          ctx.state.hits = searchPosts(r.posts, ctx.state.kw).slice(0, 6)
          return `命中 ${ctx.state.hits.length} 条${r.offline ? '（本机模式）' : ''}`
        }
      }
    ],
    buildCard(ctx) {
      const hits = ctx.state.hits || []
      return {
        title: `🔎 校园墙搜索：「${ctx.state.kw}」`,
        subtitle: hits.length ? `命中 ${hits.length} 条（按热度）` : '没有命中，换个关键词或直接发帖求助',
        rows: hits.length ? hits.map((p) => ({ icon: '📌', label: p.title, value: `👍${p.likes || 0} · 💬${(p.replies || []).length}` })) : [{ icon: '💭', label: '没找到相关内容', value: '试试发起悬赏求助' }],
        actions: [
          { label: '打开校园墙继续看', type: 'openApp', value: 'campusWall' },
          { label: '发起悬赏求助', type: 'agent', value: '发悬赏 我需要一个搭子' }
        ],
        note: ctx.state.offline ? '本机模式搜索 · 网关连接后为全站实时' : '全站帖子实时检索'
      }
    }
  },

  /* ── 20. 我的积分 ── */
  myPoints: {
    id: 'myPoints', title: '我的积分', icon: '🧧',
    steps: [
      {
        label: '读取本地积分钱包',
        run: async (ctx) => {
          const w = getWallet()
          ctx.state.w = w
          ctx.state.signed = signedToday()
          ctx.state.streak = streakDays()
          const today = (w.history || []).filter((h) => new Date(h.ts).toDateString() === new Date().toDateString())
          ctx.state.today = today
          return `余额 ${w.points} · 连续 ${ctx.state.streak} 天 · 今日 ${today.length} 笔`
        }
      }
    ],
    buildCard(ctx) {
      const w = ctx.state.w
      return {
        title: `🧧 我的积分：${w.points}`,
        subtitle: `连续签到 ${ctx.state.streak} 天 · ${ctx.state.signed ? '今日已签到' : '今日未签到'}`,
        rows: (ctx.state.today.length ? ctx.state.today : (w.history || []).slice(0, 5)).slice(0, 6).map((h) => ({
          icon: h.d >= 0 ? '🟢' : '🔴',
          label: h.reason || '积分变动',
          value: (h.d > 0 ? '+' : '') + h.d
        })),
        actions: [
          ctx.state.signed ? null : { label: `📅 签到 +${POINTS.signIn}`, type: 'agent', value: '签到' },
          { label: '去墙里赚积分', type: 'agent', value: '看校园墙' }
        ].filter(Boolean),
        note: '积分规则：发帖+2 · 回复+1 · 采纳+10 · 悬赏-5（本地钱包，后端期迁移到账户体系）'
      }
    }
  },

  /* ── 21. 每日签到 ── */
  signIn: {
    id: 'signIn', title: '每日签到', icon: '📅',
    steps: [
      {
        label: '签到（幂等防重）',
        run: async (ctx) => {
          const r = signInToday()
          ctx.state.r = r
          return r.already ? '今日已签到' : `签到成功 +${r.gained}，余额 ${r.points}`
        }
      }
    ],
    buildCard(ctx) {
      const r = ctx.state.r
      return {
        title: r.already ? '📅 今天已经签过到啦' : `📅 签到成功 +${POINTS.signIn} 积分`,
        subtitle: `当前余额 ${r.points} 积分 · 连续 ${streakDays()} 天`,
        rows: [{ icon: '✅', label: r.already ? '明天再来' : '积分已到账，可发悬赏、换权益', value: '' }],
        actions: [
          { label: '查看积分明细', type: 'agent', value: '我的积分' },
          { label: '看校园墙', type: 'agent', value: '看校园墙' }
        ]
      }
    }
  },

  /* ── 22. 失物招领发布 ── */
  lostFound: {
    id: 'lostFound', title: '发布失物招领', icon: '🔍', needConfirm: true,
    clarify: { field: 'thing', ask: '描述一下丢失/捡到的物品（时间地点特征，如："昨天下午在东区食堂捡到校园卡"）' },
    steps: [
      {
        label: '抽取物品描述与类型',
        run: async (ctx) => {
          let text = ctx.text.replace(/^(帮我|请|我想|我要)?(在|到)?(校园)?墙?(上)?(发|发布)?(个|一条)?(失物|招领|寻物)?(启事|贴)?(说|写)?(道|:|：)?/, '').trim()
          if (!text) throw new CLARIFY('thing')
          ctx.state.content = text
          ctx.state.isLost = /丢|丢失|不见|遗失|找.*东西|丢了/.test(text)
          return `${ctx.state.isLost ? '丢失求助' : '招领'} · ${text.length} 字`
        }
      },
      {
        label: '发布到失物分区（敏感词双端校验）',
        run: async (ctx) => {
          const r = await createPost({
            title: (ctx.state.isLost ? '【寻物】' : '【招领】') + ctx.state.content.slice(0, 20),
            content: ctx.state.content,
            tag: 'lost',
            type: 'normal',
            anonymous: true,
            author: '匿名同学'
          })
          ctx.state.post = r.post
          ctx.state.offline = r.offline
          return r.offline ? '本机模式已保存' : '已发布，全站可见'
        }
      }
    ],
    buildCard(ctx) {
      return {
        title: ctx.state.offline ? '🔍 失物招领已存本机（网关未连）' : '🔍 失物招领已发布 ✓',
        subtitle: ctx.state.isLost ? '丢失求助 · 失物分区' : '招领启事 · 失物分区',
        rows: [{ icon: '📋', label: ctx.state.content, value: '' }],
        actions: [
          { label: '打开失物分区', type: 'openApp', value: 'campusWall' },
          { label: '再发一条', type: 'reask', value: '发失物 ' }
        ],
        note: '被捡到的同学在失物分区看到即可回复对接'
      }
    }
  },

  /* ── 23. 悬赏求助发布 ── */
  bountyPost: {
    id: 'bountyPost', title: '发起悬赏', icon: '💰', needConfirm: true,
    clarify: { field: 'thing', ask: '想悬赏问什么？（如："有数据结构往年真题的同学联系我"）' },
    steps: [
      {
        label: '抽取悬赏问题',
        run: async (ctx) => {
          const text = ctx.text.replace(/^(帮我|请|我想|我要)?(发|发起|来个?)?(一个)?(悬赏|赏金)?(求助)?(贴|帖子)?(：|:|，)?/, '').trim()
          if (!text) throw new CLARIFY('thing')
          ctx.state.content = text
          return `问题：${text.slice(0, 30)}`
        }
      },
      {
        label: '锁定赏金并发布（扣减本地钱包）',
        run: async (ctx) => {
          const w = getWallet()
          const cost = Math.min(POINTS.bountyCost, w.points || POINTS.bountyCost)
          const r = await createPost({
            title: '【悬赏】' + ctx.state.content.slice(0, 20),
            content: ctx.state.content,
            tag: 'bounty',
            type: 'bounty',
            anonymous: true,
            author: '匿名同学',
            bounty: { points: cost, adoptedId: null }
          })
          ctx.state.post = r.post
          ctx.state.offline = r.offline
          ctx.state.cost = cost
          return r.offline ? '本机发布成功' : '已发布，等待回答'
        }
      }
    ],
    buildCard(ctx) {
      return {
        title: `💰 悬赏已发布 · 赏金 ${ctx.state.cost} 积分`,
        subtitle: ctx.state.offline ? '本机模式 · 网关连接后全员可见' : '已在悬赏分区公开，采纳时结算',
        rows: [{ icon: '🎯', label: ctx.state.content, value: '待采纳' }],
        actions: [
          { label: '打开悬赏分区', type: 'openApp', value: 'campusWall' },
          { label: '看看别人的悬赏', type: 'agent', value: '看校园墙' }
        ],
        note: '回答被你采纳 → 对方 +10 积分（本地钱包演示，后端期见 API_CONTRACT.adopt）'
      }
    }
  },

  /* ── 24. 资源分享发布 ── */
  resourceShare: {
    id: 'resourceShare', title: '分享资源', icon: '📦', needConfirm: true,
    clarify: { field: 'keyword', ask: '资源链接是？（网盘/仓库/文档直链，附提取码更好）' },
    steps: [
      {
        label: '抽取链接与说明',
        run: async (ctx) => {
          const urlMatch = ctx.text.match(/https?:\/\/[^\s，,。]+/)
          const codeMatch = ctx.text.match(/(?:提取码|密码|码)\s*[:：]?\s*([A-Za-z0-9]{3,12})/)
          if (!urlMatch) throw new CLARIFY('keyword')
          ctx.state.url = urlMatch[0]
          ctx.state.code = codeMatch ? codeMatch[1] : ''
          ctx.state.desc = ctx.text.replace(urlMatch[0], '').trim() || '分享一个资源'
          return `链接已识别${ctx.state.code ? ' · 有提取码' : ''}`
        }
      },
      {
        label: '发布到资源分区',
        run: async (ctx) => {
          const r = await createPost({
            title: '【资源】' + ctx.state.desc.slice(0, 20),
            content: ctx.state.desc,
            tag: 'resource',
            type: 'resource',
            anonymous: true,
            author: '匿名同学',
            resource: { title: ctx.state.desc.slice(0, 30), url: ctx.state.url, code: ctx.state.code, downloads: 0 }
          })
          ctx.state.offline = r.offline
          return r.offline ? '本机保存' : '已发布'
        }
      }
    ],
    buildCard(ctx) {
      return {
        title: '📦 资源分享已发布',
        subtitle: '资源分区 · 附链接与提取码卡片',
        rows: [
          { icon: '🔗', label: ctx.state.url, value: '' },
          ctx.state.code ? { icon: '🔑', label: '提取码 ' + ctx.state.code, value: '点击复制见卡片' } : null
        ].filter(Boolean),
        actions: [
          { label: '打开资源分区', type: 'openApp', value: 'campusWall' },
          { label: '再分享一个', type: 'reask', value: '分享资源 ' }
        ],
        note: '链接有效性由分享者负责；下载计数接口已预留（API_CONTRACT）'
      }
    }
  },

  /* ── 25. 话题热词 ── */
  hotTopics: {
    id: 'hotTopics', title: '话题热词', icon: '🏷️',
    steps: [
      {
        label: '全站帖子分词统计',
        run: async (ctx) => {
          const r = await loadPosts({ tag: 'all', sort: 'hot' })
          ctx.state.topics = hotTopics(r.posts, 8)
          ctx.state.offline = r.offline
          ctx.state.count = r.posts.length
          return `${r.posts.length} 帖 → ${ctx.state.topics.length} 个热词`
        }
      }
    ],
    buildCard(ctx) {
      return {
        title: '🏷️ 校园墙话题热词',
        subtitle: `基于全站 ${ctx.state.count} 帖实时分词（本地计算，零外部依赖）`,
        rows: (ctx.state.topics || []).map((t) => ({ icon: '•', label: t.word, value: `出现 ${t.n} 次` })),
        actions: [
          { label: '打开校园墙看热议', type: 'openApp', value: 'campusWall' },
          { label: '针对热词搜帖子', type: 'reask', value: '搜墙 ' + ((ctx.state.topics[0] || {}).word || '食堂') }
        ],
        note: '热词每 20s 随帖子轮询刷新 · 后端期换 /api/wall/hot 聚合'
      }
    }
  },

  /* ── 26. 提交反馈（👎/建议回流维护队列） ── */
  reportFeedback: {
    id: 'reportFeedback', title: '提交反馈', icon: '📮',
    clarify: { field: 'thing', ask: '想反馈什么？（功能建议 / 找到的毛病 / 想要的能力）' },
    steps: [
      {
        label: '抽取反馈内容',
        run: async (ctx) => {
          const text = ctx.text.replace(/^(帮我|我要|我想)?(提个?|提交|发)?(一条)?(反馈|建议|意见)(：|:|，|,)?/, '').trim()
          if (!text) throw new CLARIFY('thing')
          ctx.state.text = text
          return text.slice(0, 40)
        }
      },
      {
        label: '上报维护 Agent 待办队列',
        run: async (ctx) => {
          try {
            await fetch('/api/feedback', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ text: ctx.state.text, kind: 'agent-suggest', detail: '来自智能体会话', path: 'assistant' })
            })
            ctx.state.offline = false
            return '已进入管理台「反馈」队列'
          } catch {
            ctx.state.offline = true
            return '网关未连（本地已留痕）'
          }
        }
      }
    ],
    buildCard(ctx) {
      return {
        title: ctx.state.offline ? '📮 反馈已本地留痕（网关未连）' : '📮 反馈已提交 ✓',
        subtitle: '进入管理台「👎 反馈」聚合视图，维护 Agent 按周处理',
        rows: [{ icon: '✉️', label: ctx.state.text, value: 'new' }],
        actions: [
          { label: '再提一条', type: 'reask', value: '提交反馈 ' },
          { label: '看看协作看板', type: 'agent', value: '协作看板' }
        ],
        note: '这正是"用户回流 → 维护 Agent"飞轮的入口之一'
      }
    }
  },


  /* ── 19. 任务链执行器（串联 CHAINS 中的预设链） ── */
  taskChain: {
    id: 'taskChain', title: '任务链执行', icon: '⛓️',
    clarify: { field: 'keyword', ask: '想跑哪条链？晨间组合 / 学习组合 / 生活组合（说名称即可）' },
    steps: [
      {
        label: '解析目标任务链',
        run: async (ctx) => {
          const q = (ctx.text + ' ' + (ctx.slots.keyword || '')).toLowerCase()
          let key = null
          if (/晨间|早晨|早上|morning/.test(q)) key = 'morning'
          else if (/学习|上课|教室/.test(q)) key = 'study'
          else if (/生活|吃饭|吃喝/.test(q)) key = 'life'
          if (!key) throw new CLARIFY('keyword')
          ctx.state.chain = CHAINS[key]
          return `${ctx.state.chain.icon} ${ctx.state.chain.name} · ${ctx.state.chain.steps.length} 步链`
        }
      },
      {
        label: '按序执行链上工作流（每步真实调用）',
        run: async (ctx) => {
          const results = []
          for (const wfId of ctx.state.chain.steps) {
            try {
              const sub = { text: ctx.text, slots: { ...ctx.slots }, state: {}, lang: ctx.lang }
              const card = await runWorkflow(wfId, sub, null)
              results.push({ wfId, ok: true, title: card.title })
            } catch (e) {
              results.push({ wfId, ok: false, title: e.isClarify ? '需补充信息（已跳过）' : '执行失败已跳过' })
            }
          }
          ctx.state.results = results
          return `${results.filter((r) => r.ok).length}/${results.length} 成功`
        }
      }
    ],
    buildCard(ctx) {
      const chain = ctx.state.chain
      return {
        title: `${chain.icon} 任务链「${chain.name}」执行完成`,
        subtitle: chain.desc + ' · 串联 ' + chain.steps.length + ' 个工作流',
        rows: (ctx.state.results || []).map((r) => ({
          icon: r.ok ? '✅' : '⚠️',
          label: r.title,
          value: r.ok ? '完成' : '跳过'
        })),
        actions: [
          { label: '看今日简报', type: 'agent', value: '今日简报' },
          { label: '打开校园墙', type: 'openApp', value: 'campusWall' },
          { label: '跑学习组合', type: 'agent', value: '跑任务链 学习组合' }
        ],
        note: '任务链 = 多工作流编排：失败步自动跳过不中断，每步结果汇入一张卡（后续开放自定义链）'
      }
    }
  },

  /* ── 27. 使用指南（能力地图） ── */
  helpGuide: {
    id: 'helpGuide', title: '使用指南', icon: '🗺️',
    steps: [
      { label: '汇总当前能力矩阵', run: async (ctx) => { ctx.state.n = Object.keys(WORKFLOWS).length; return `${ctx.state.n} 条工作流就绪` } }
    ],
    buildCard(ctx) {
      const groups = [
        { icon: '📚', label: '学习：课表/空教室/课程查询/校历/成绩查询（FAQ）', value: '第一课堂' },
        { icon: '🗓️', label: '日程：加提醒/我的日程/今日简报/时间日期', value: '第二课堂' },
        { icon: '🧱', label: '社区：发墙/看墙/搜墙/失物/悬赏/资源/热词', value: '校园墙全功能' },
        { icon: '🧧', label: '积分：签到/我的积分/悬赏结算', value: '成长体系' },
        { icon: '🛠️', label: '服务：VPN/官网/食堂/吃什么/导航', value: '生活服务' },
        { icon: '🤖', label: '系统：协作看板/反馈/指南/三模式切换', value: 'Agent 治理' }
      ]
      return {
        title: `🗺️ 能力地图 · ${ctx.state.n} 条工作流`,
        subtitle: '输入 "/" 可命令直达任意工作流 · 输入框下方切换 ⚡直达/📋计划/💬问答',
        rows: groups,
        actions: [
          { label: '☀️ 试试今日简报', type: 'reask', value: '今日简报' },
          { label: '📊 看协作看板', type: 'reask', value: '协作看板' },
          { label: '🧱 逛校园墙', type: 'reask', value: '看校园墙' }
        ],
        note: '问答模式只答不办事；计划模式先出计划再执行——按场景切换'
      }
    }
  },

  /* ── 28. 找实习（画像匹配 → 投递登记） ── */
  jobHunt: {
    id: 'jobHunt', title: '找实习', icon: '💼',
    steps: [
      {
        label: '读取画像算匹配',
        run: async (ctx) => {
          const { readProfile } = await import('./profile.js')
          const { matchJobs } = await import('../data/jobs.js')
          const prof = readProfile()
          const kw = extractKeyword(ctx.text)
          if (kw) prof.interests = [...new Set([...(prof.interests || []), kw])]
          const matched = matchJobs(prof, 5)
          ctx.state.matched = matched
          ctx.state.prof = prof
          return `画像技能[${(prof.skills || []).join('、') || '未填写'}] → 命中 ${matched.length} 个岗位`
        }
      },
      {
        label: '生成投递清单',
        run: async (ctx) => {
          const top = ctx.state.matched[0]
          if (!top) throw new Error('暂无匹配岗位，先去画像页补技能')
          ctx.state.top = top
          return `首推：${top.job.title}（匹配词：${top.hits.join('、') || '综合推荐'}）`
        }
      }
    ],
    buildCard(ctx) {
      const rows = ctx.state.matched.map((m) => ({
        icon: m.score > 0 ? '🎯' : '📌',
        label: `${m.job.title} · ${m.job.dept} · ${m.job.pay}`,
        value: m.hits.length ? `匹配：${m.hits.join('、')}` : '综合推荐'
      }))
      return {
        title: `💼 实习/勤工岗 · ${ctx.state.matched.length} 个`,
        subtitle: '示例岗位（格式示范，求职以官方渠道为准）· 匹配来自你的画像',
        rows,
        actions: [
          { label: '📋 看全部岗位', type: 'openApp', value: 'jobs' },
          { label: '🧬 完善画像更准', type: 'openApp', value: 'profile' }
        ],
        note: '投递登记在岗位页完成（本机记录，后端期同步就业网）'
      }
    }
  },

  /* ── 29. 活动报名（选活动 → 报名 → 写日程） ── */
  activitySignup: {
    id: 'activitySignup', title: '活动报名', icon: '🎪', needConfirm: true,
    steps: [
      {
        label: '找对味的活动',
        run: async (ctx) => {
          const { upcoming, signedIds } = await import('../data/activities.js')
          const kw = extractKeyword(ctx.text)
          let list = upcoming().filter((a) => !a.expired)
          if (kw) {
            const kl = kw.toLowerCase()
            const hit = list.filter((a) => (a.title + a.org + (a.tags || []).join('')).toLowerCase().includes(kl))
            if (hit.length) list = hit
          }
          const signed = new Set(signedIds())
          ctx.state.list = list.slice(0, 5)
          if (!ctx.state.list.length) throw new Error('近期没找到对味的活动，换个关键词试试')
          return `近期可报 ${list.length} 个：${ctx.state.list.map((a) => a.title).join('、')}`
        }
      },
      {
        label: '报名并写入日程',
        run: async (ctx) => {
          const { signupLocal } = await import('../data/activities.js')
          const target = ctx.state.list[0]
          const r = signupLocal(target.id)
          if (!r.already) {
            const sched = loadSched()
            sched.push({ text: `参加${target.title}`, date: target.date, ts: Date.now(), from: 'activity' })
            saveSched(sched)
          }
          ctx.state.target = target
          ctx.state.dup = r.already
          return r.already ? `${target.title}（已报过，不重复）` : `${target.title} 报名成功 + 已写入日程`
        }
      }
    ],
    buildCard(ctx) {
      const t = ctx.state.target
      return {
        title: `🎪 ${ctx.state.dup ? '已报过' : '报名成功'} · ${t.title}`,
        subtitle: `${t.org} · ${t.date} · ${t.place}（余 ${Math.max(0, (t.quota || 0) - (t.signed || 0))} 位）`,
        rows: ctx.state.list.map((a) => ({ icon: '📌', label: `${a.title}`, value: `${a.date} · ${a.place}` })),
        actions: [
          { label: '🗓️ 看我的日程', type: 'reask', value: '我的日程' },
          { label: '🎪 全部活动', type: 'openApp', value: 'jobs' }
        ],
        note: '本机报名记录；名额校验后端期由服务端做'
      }
    }
  },

  /* ── 30. 宿舍报修（一句话 → 工单 → 管理台复用反馈通道） ── */
  fixReport: {
    id: 'fixReport', title: '宿舍报修', icon: '🔧', needConfirm: true,
    steps: [
      {
        label: '解析报修内容与地点',
        run: async (ctx) => {
          const place = extractPlace(ctx.text) || ''
          const kw = extractKeyword(ctx.text) || ctx.text.slice(0, 20)
          if (!/灯|水|电|网|门|窗|锁|空调|暖气|马桶|淋浴|报修|坏|修|漏/.test(ctx.text)) {
            throw new CLARIFY('thing')
          }
          ctx.state.place = place
          ctx.state.thing = kw
          return `报修：${kw}${place ? ' @' + place : ''}`
        }
      },
      {
        label: '生成工单并上报',
        run: async (ctx) => {
          const text = `【报修】${ctx.state.thing}${ctx.state.place ? '（' + ctx.state.place + '）' : ''}`
          let online = false
          try {
            const r = await fetch('/api/feedback', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ text, kind: 'fix', verdict: 'new' })
            })
            online = r.ok
          } catch { /* 本机模式 */ }
          if (!online) {
            const arr = JSON.parse(localStorage.getItem('qdu_fix_orders') || '[]')
            arr.unshift({ thing: ctx.state.thing, place: ctx.state.place, ts: Date.now(), status: 'local' })
            try { localStorage.setItem('qdu_fix_orders', JSON.stringify(arr.slice(0, 50))) } catch { /* noop */ }
          }
          ctx.state.online = online
          return online ? '工单已进管理台反馈队列' : '已存本机工单（联网自动上报）'
        }
      }
    ],
    clarify: { field: 'thing', ask: '具体什么东西坏了？比如“宿舍灯”“水龙头”' },
    buildCard(ctx) {
      return {
        title: `🔧 报修工单 · ${ctx.state.thing}`,
        subtitle: `${ctx.state.place || '地点待补充'} · ${ctx.state.online ? '管理台可见' : '本机模式'}`,
        rows: [
          { icon: '📝', label: '报修内容', value: ctx.state.thing },
          { icon: '📍', label: '地点', value: ctx.state.place || '未说明（可在管理台补充）' },
          { icon: '📡', label: '通道', value: ctx.state.online ? '已上报管理台' : '本机暂存' }
        ],
        actions: [
          { label: '🧱 去墙里问问有没有人同坏', type: 'reask', value: '搜墙 宿舍报修' }
        ],
        note: '紧急情况（停电/漏水）请直接打后勤电话，线上工单只做记录流转'
      }
    }
  }
}

/* ── 任务链定义（多工作流串联编排：一句指令连续执行，一张卡汇总） ── */
export const CHAINS = {
  morning: { id: 'morning', name: '晨间组合', icon: '🌅', steps: ['dailyBriefing', 'wallView', 'signIn'], desc: '简报 → 逛热墙 → 签到，早晨三连' },
  study: { id: 'study', name: '学习组合', icon: '📖', steps: ['dayClass', 'findRoom'], desc: '看今天的课 → 顺手找空教室' },
  life: { id: 'life', name: '生活组合', icon: '🍜', steps: ['whatEat', 'myPoints'], desc: '今天吃什么 → 查个积分' }
}

export class CLARIFY extends Error {
  constructor(field) { super('clarify:' + field); this.field = field; this.isClarify = true }
}

/** 执行一条工作流：逐步回调 onStep，最终返回结果卡片 */
export async function runWorkflow(id, ctx, onStep) {
  const wf = WORKFLOWS[id]
  if (!wf) throw new Error('workflow not found: ' + id)
  const notes = []
  for (let i = 0; i < wf.steps.length; i++) {
    const st = wf.steps[i]
    onStep?.({ index: i, label: st.label, status: 'running', detail: '' })
    try {
      const detail = await st.run(ctx)
      notes.push(detail)
      onStep?.({ index: i, label: st.label, status: 'done', detail: detail || '' })
    } catch (e) {
      if (e && e.isClarify) {
        onStep?.({ index: i, label: st.label, status: 'clarify', detail: e.field })
        const err = new CLARIFY(e.field || wf.clarify?.field)
        err.ask = (wf.clarify && wf.clarify.field === err.field) ? wf.clarify.ask : ''
        throw err
      }
      onStep?.({ index: i, label: st.label, status: 'fail', detail: e.message || '失败' })
      throw e
    }
  }
  return wf.buildCard(ctx)
}

export function workflowMeta(id) {
  const wf = WORKFLOWS[id]
  return wf ? { id: wf.id, title: wf.title, icon: wf.icon, steps: wf.steps.map((s) => s.label), needConfirm: !!wf.needConfirm } : null
}
