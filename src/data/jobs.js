/**
 * ════════════════════════════════════════════════════════════════════
 * @模块路径  src/data/jobs.js
 * @职责      岗位数据集：勤工俭学 + 实习（画像反向推送 + 找实习工作流的数据源）
 * @数据说明  首批 8 条为**示例岗位**（格式示范用，求职以官方渠道为准）；
 *            已预留后端接口位（见底部 API_CONTRACT），对接就业网后替换即真数据
 * @入口      JOBS / matchJobs(profile, limit) / jobById
 * @被谁用    agent/workflows.jobHunt · views/Jobs.vue · agent/profile.js 推送
 * ════════════════════════════════════════════════════════════════════
 *
 * [BE] GET /api/jobs?type=&q= → {jobs:[…]}（对接就业指导中心/校内岗位发布）
 * [BE] POST /api/jobs/:id/apply → 投递登记 {jobId, name, contact}（幂等：同人同岗一次）
 */

export const JOBS = [
  { id: 'j1', title: '图书馆流通部助理', dept: '图书馆', type: '勤工俭学', pay: '18元/时', tags: ['耐心细致', '课余'], need: '每周≥6小时', contact: '图书馆一楼服务台', demo: true },
  { id: 'j2', title: '学院办公室助管', dept: '计算机科学技术学院', type: '勤工俭学', pay: '18元/时', tags: ['Office', '认真负责'], need: '大二及以上', contact: '学院楼203', demo: true },
  { id: 'j3', title: '前端实习生（校企合作）', dept: '合作企业·青岛', type: '实习', pay: '150元/天', tags: ['Vue', 'JavaScript', '计算机'], need: '有作品', contact: '就业网岗位编号 Q2026-031', demo: true },
  { id: 'j4', title: '新媒体运营助理', dept: '校团委', type: '勤工俭学', pay: '18元/时', tags: ['排版', '摄影', '公众号'], need: '附作品', contact: '团委办公室', demo: true },
  { id: 'j5', title: '实验室设备管理员', dept: '机电工程学院', type: '勤工俭学', pay: '18元/时', tags: ['动手能力强', '守时'], need: '工科优先', contact: '实验中心', demo: true },
  { id: 'j6', title: '数据标注兼职（远程）', dept: '合作企业·远程', type: '实习', pay: '25元/时', tags: ['细心', 'AI', '远程'], need: '自备电脑', contact: '就业网岗位编号 Q2026-044', demo: true },
  { id: 'j7', title: '体育馆值班员', dept: '体育学院', type: '勤工俭学', pay: '18元/时', tags: ['晚间', '责任心'], need: '晚间有空', contact: '体育馆前台', demo: true },
  { id: 'j8', title: 'Python 助教（培训机构合作）', dept: '合作机构·市南', type: '实习', pay: '200元/天', tags: ['Python', '表达能力', '计算机'], need: 'Python 熟练', contact: '就业网岗位编号 Q2026-052', demo: true }
]

export function jobById(id) {
  return JOBS.find((j) => j.id === id) || null
}

/**
 * 画像匹配（关键词命中计分，结果可解释：返回命中词）
 * @param {object} profile {skills:[], interests:[], college:''}
 * @param {number} limit
 */
export function matchJobs(profile, limit = 5) {
  const p = profile || {}
  const keys = [...(p.skills || []), ...(p.interests || []), p.college || '']
    .map((s) => String(s || '').toLowerCase()).filter(Boolean)
  const scored = JOBS.map((j) => {
    const hay = (j.title + ' ' + j.dept + ' ' + (j.tags || []).join(' ')).toLowerCase()
    const hits = keys.filter((k) => k && hay.includes(k))
    return { job: j, score: hits.length, hits }
  })
  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, limit)
}
