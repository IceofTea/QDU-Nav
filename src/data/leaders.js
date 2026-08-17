/**
 * 校领导风格测试 · 数据
 * 参考 leadertest.site 的多维原型比对机制，改造为青岛大学校领导画像与校园管理场景。
 * 维度 9 项：决策魄力 / 规划理性 / 改革锐气 / 情怀感召 / 制度规范 / 育人理念 / 师生动员 / 执行强度 / 发展导向
 * 原型 vec：0-10 各维强度；weight：各维匹配权重。
 */

export const DIMS = [
  { key: 'power', label: '决策魄力' },
  { key: 'logic', label: '规划理性' },
  { key: 'conflict', label: '改革锐气' },
  { key: 'emotion', label: '情怀感召' },
  { key: 'order', label: '制度规范' },
  { key: 'ideology', label: '育人理念' },
  { key: 'mobilization', label: '师生动员' },
  { key: 'force', label: '执行强度' },
  { key: 'development', label: '发展导向' }
]

export const leaders = [
  {
    name: '竺苗龙',
    slug: 'zhu_miaolong',
    period: '1993–1997 任校长',
    role: '学者型 · 学术奠基',
    bio: '学术深耕、专注治学。',
    summary:
      '航天力学专家，长期担任名誉校长，是我国著名航天力学专家与学术带头人。淡泊行政权力、沉潜基础研究，以专业造诣和学术声望引领学校发展，属于典型的学者型领导。',
    vec: { power: 3, logic: 9, conflict: 1, emotion: 3, order: 7, ideology: 6, mobilization: 2, force: 2, development: 4 },
    weight: { power: 1.0, logic: 1.5, conflict: 0.7, emotion: 0.8, order: 1.0, ideology: 0.9, mobilization: 0.7, force: 0.7, development: 0.9 },
    photo: ''
  },
  {
    name: '徐建培',
    slug: 'xu_jianpei',
    period: '1999–2004 任校长',
    role: '跨界型 · 行政通达',
    bio: '跨界开拓、行政通达。',
    summary:
      '由青岛大学校长起步，后进入国家部委及地方政府担任要职，行事风格偏向从教育管理向更广阔行政领域拓展，长于整合资源、打通渠道，属于跨界发展的管理者。',
    vec: { power: 7, logic: 8, conflict: 4, emotion: 4, order: 7, ideology: 5, mobilization: 6, force: 5, development: 8 },
    weight: { power: 1.2, logic: 1.3, conflict: 0.8, emotion: 0.7, order: 1.1, ideology: 0.9, mobilization: 1.1, force: 1.0, development: 1.4 },
    photo: ''
  },
  {
    name: '夏临华',
    slug: 'xia_linhua',
    period: '2004–2011 任校长',
    role: '专家型 · 科研立校',
    bio: '专家治校、科研立校。',
    summary:
      '理论物理学家、「百千万人才工程」人选，长期深耕理论物理前沿研究。以科研视野和学术判断管理学校，强调内涵与基础研究，属于典型的专家治校。',
    vec: { power: 5, logic: 9, conflict: 2, emotion: 4, order: 7, ideology: 5, mobilization: 3, force: 2, development: 6 },
    weight: { power: 0.9, logic: 1.6, conflict: 0.6, emotion: 0.8, order: 1.1, ideology: 0.9, mobilization: 0.6, force: 0.5, development: 1.0 },
    photo: ''
  },
  {
    name: '王安民',
    slug: 'wang_anmin',
    period: '2011–2015 任校长',
    role: '结合型 · 经验治理',
    bio: '政学兼修、经验治理。',
    summary:
      '兼具发改委、科技局等政府工作经历后回归高校，善于把行政管理经验与教育管理结合，注重流程、资源与务实落地，属于政学结合的实践者。',
    vec: { power: 7, logic: 8, conflict: 4, emotion: 5, order: 8, ideology: 5, mobilization: 6, force: 5, development: 7 },
    weight: { power: 1.2, logic: 1.3, conflict: 0.8, emotion: 0.9, order: 1.5, ideology: 0.9, mobilization: 1.0, force: 1.0, development: 1.3 },
    photo: ''
  },
  {
    name: '范跃进',
    slug: 'fan_yuejin',
    period: '2015–2018 任书记 / 校长',
    role: '改革派 · 奠基人',
    bio: '锐意改革、大刀阔斧。',
    summary:
      '以大刀阔斧的改革著称，曾主政三所高校。在青大任内提出「对标苏大」等目标，推行管理体制与人事改革，为后续发展奠定基础，属于改革派奠基人。',
    vec: { power: 9, logic: 6, conflict: 8, emotion: 7, order: 6, ideology: 5, mobilization: 8, force: 8, development: 9 },
    weight: { power: 1.5, logic: 1.0, conflict: 1.4, emotion: 1.1, order: 0.9, ideology: 0.9, mobilization: 1.4, force: 1.4, development: 1.6 },
    photo: ''
  },
  {
    name: '夏东伟',
    slug: 'xia_dongwei',
    period: '2018–2024 任校长',
    role: '实干型 · 成果导向',
    bio: '成果导向、指标驱动。',
    summary:
      '任期注重学术指标提升，强调本研贯通培养与科研训练，习惯用软科排名、自然指数等具体数据衡量学校进步，务实推进每一项可量化的目标，属于成果导向的实干家。',
    vec: { power: 7, logic: 8, conflict: 5, emotion: 4, order: 8, ideology: 5, mobilization: 5, force: 6, development: 9 },
    weight: { power: 1.2, logic: 1.4, conflict: 0.9, emotion: 0.7, order: 1.4, ideology: 0.9, mobilization: 0.9, force: 1.1, development: 1.7 },
    photo: ''
  },
  {
    name: '胡金焱',
    slug: 'hu_jinyan',
    period: '2018 至今 任书记',
    role: '战略家 · 思想者',
    bio: '顶层设计、思想引领。',
    summary:
      '注重顶层设计，提出「一二三四五」育人体系，主持「书记下午茶」，风格亲民。强调把个人发展融入国家战略，鼓励学生立志与创新，属于战略家与思想者。',
    vec: { power: 6, logic: 8, conflict: 4, emotion: 8, order: 6, ideology: 8, mobilization: 8, force: 4, development: 8 },
    weight: { power: 1.0, logic: 1.3, conflict: 0.8, emotion: 1.5, order: 1.0, ideology: 1.5, mobilization: 1.5, force: 0.8, development: 1.3 },
    photo: ''
  },
  {
    name: '魏志强',
    slug: 'wei_zhiqiang',
    period: '2024 至今 任校长',
    role: '实干派 · 强驱动',
    bio: '务实果断、数据驱动。',
    summary:
      '风格务实果断，目标直指「双一流」与 A 类学科，提出「111」计划与「系统+、纺织+、医学+」板块思路，强调数据驱动与产教融合，行事充满紧迫感，属于实干派与强驱动者。',
    vec: { power: 8, logic: 7, conflict: 7, emotion: 5, order: 7, ideology: 6, mobilization: 6, force: 8, development: 9 },
    weight: { power: 1.5, logic: 1.2, conflict: 1.3, emotion: 0.9, order: 1.2, ideology: 1.1, mobilization: 1.1, force: 1.5, development: 1.7 },
    photo: ''
  }
]

export const questions = [
  {
    id: 'q1',
    type: 'binary',
    kicker: '判断题',
    title: '小组作业组队，你更倾向哪种方式？',
    desc: '请选择更接近你真实倾向的一项。',
    options: [
      { label: '我直接拍板分工，效率第一', score: { power: 2, force: 1 } },
      { label: '先定好规则和节点，按流程走', score: { logic: 2, order: 1 } }
    ]
  },
  {
    id: 'q2',
    type: 'single',
    kicker: '单选题',
    title: '社团活动遇到分歧，你更可能：',
    desc: '四个选项代表不同处理策略。',
    options: [
      { label: '力排众议，定了就执行', score: { power: 2, conflict: 2 } },
      { label: '逐个谈心，争取大家理解', score: { emotion: 2, mobilization: 1 } },
      { label: '先冷处理，观察再定', score: { logic: 1, conflict: -1 } },
      { label: '借势调整，把分歧变成新机会', score: { logic: 2, power: 1 } }
    ]
  },
  {
    id: 'q3',
    type: 'single',
    kicker: '单选题',
    title: '对「早八」和作息管理，你的态度更接近：',
    desc: '请选择更接近你真实倾向的一项。',
    options: [
      { label: '规则就该严格执行，该起就得起', score: { order: 2, force: 1 } },
      { label: '因人而异，尊重每个人的节奏', score: { emotion: 2 } },
      { label: '呼吁学校改革作息，别一刀切', score: { conflict: 2, mobilization: 1 } },
      { label: '自己规划好就行，不管别人', score: { logic: 2 } }
    ]
  },
  {
    id: 'q4',
    type: 'binary',
    kicker: '判断题',
    title: '期末复习，你更相信哪种打法？',
    desc: '请选择更接近你真实倾向的一项。',
    options: [
      { label: '提前两周做计划表，稳步推进', score: { logic: 2, order: 1 } },
      { label: '考前集中冲刺，高效爆发', score: { force: 2, development: 1 } }
    ]
  },
  {
    id: 'q5',
    type: 'single',
    kicker: '单选题',
    title: '面对「内卷」，你更倾向于：',
    desc: '请选择更接近你真实倾向的一项。',
    options: [
      { label: '卷就卷，靠效率卷赢', score: { development: 2, force: 1 } },
      { label: '调整心态，守住自己的节奏', score: { emotion: 2, order: 1 } },
      { label: '换个赛道，找没人卷的蓝海', score: { logic: 2, development: 1 } },
      { label: '集合大家，把规则改了', score: { conflict: 2, mobilization: 1 } }
    ]
  },
  {
    id: 'q6',
    type: 'single',
    kicker: '单选题',
    title: '宿舍出现矛盾，你的第一反应是：',
    desc: '请选择最接近你真实倾向的一项。',
    options: [
      { label: '定个宿舍公约，按规矩来', score: { order: 2 } },
      { label: '拉着大家开个夜谈会，敞开心扉', score: { emotion: 2, mobilization: 1 } },
      { label: '请导员介入，按校规处理', score: { power: 1, ideology: 1 } },
      { label: '少掺和，自己安静学习', score: { logic: 2 } }
    ]
  },
  {
    id: 'q7',
    type: 'binary',
    kicker: '判断题',
    title: '保研加分，创新创业大赛 vs 传统奖学金，你更看重？',
    desc: '请选择更接近你真实倾向的一项。',
    options: [
      { label: '创新创业大赛：跑起来才有机会', score: { development: 2, conflict: 1 } },
      { label: '传统奖学金：扎实积累更稳妥', score: { order: 2, ideology: 1 } }
    ]
  },
  {
    id: 'q8',
    type: 'policy',
    kicker: '政策题',
    title: '如果让你当一任校领导，优先推动哪件事？',
    desc: '这题区分度很高。',
    options: [
      { label: '冲刺双一流与 A 类学科，立军令状', score: { development: 2, force: 1, conflict: 1 } },
      { label: '推进本研贯通培养，抓学术指标', score: { logic: 2, order: 1, development: 1 } },
      { label: '深化产教融合，让毕业生好就业', score: { development: 2, ideology: 1 } },
      { label: '提升学生幸福感，办「下午茶」倾听心声', score: { emotion: 2, mobilization: 2, ideology: 1 } }
    ]
  },
  {
    id: 'q9',
    type: 'single',
    kicker: '单选题',
    title: '你怎么看待「第二课堂」和德育分？',
    desc: '请选择更接近你真实倾向的一项。',
    options: [
      { label: '要有制度，量化考核才公平', score: { order: 2 } },
      { label: '本质是育人，立德树人才是核心', score: { ideology: 2, emotion: 1 } },
      { label: '别搞形式主义，务实点', score: { conflict: 2, logic: 1 } },
      { label: '给足自主空间，让学生自己长', score: { logic: 2, mobilization: 1 } }
    ]
  },
  {
    id: 'q10',
    type: 'single',
    kicker: '单选题',
    title: '组织一次校庆活动，你更看重：',
    desc: '请选择更接近你真实倾向的一项。',
    options: [
      { label: '执行到位、场面震撼', score: { force: 2, order: 1 } },
      { label: '全员参与，把师生调动起来', score: { mobilization: 2, emotion: 1 } },
      { label: '有创意、有话题，出圈传播', score: { conflict: 2, development: 1 } },
      { label: '流程规范、不出差错', score: { order: 2, logic: 1 } }
    ]
  },
  {
    id: 'q11',
    type: 'likert',
    kicker: '场景题',
    title: '「我愿意为集体目标承担高强度任务。」',
    desc: '请选择符合程度。',
    scores: [
      { force: -2, emotion: 1 },
      { force: -1 },
      {},
      { force: 1, development: 1 },
      { force: 2, development: 2 }
    ]
  }
]

export const shareLine = (leader) => `我测出来最像${leader.name} —— ${leader.bio} 你也来测测看？`