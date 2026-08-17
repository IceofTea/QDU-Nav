/**
 * 校领导风格测试 · 数据
 * 维度 9 项：决策魄力 / 规划理性 / 改革锐气 / 情怀感召 / 制度规范 / 育人理念 / 师生动员 / 执行强度 / 发展导向
 * 原型 10 位：竺苗龙 / 徐建培 / 夏临华 / 王安民 / 范跃进 / 夏东伟 / 胡金焱 / 魏志强 / 孔伟金 / 李建波
 * 题目 30 道：参考 leadertest.site 原题 17 道（治理/政治场景，一字未改）+ 青大校园特色题 13 道。
 * 照片存于 public/leader/（真实证件照，竺苗龙暂无照片则回退首字母头像）。
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
    vec: { power: 4, logic: 9, conflict: 3, emotion: 4, order: 7, ideology: 6, mobilization: 3, force: 2, development: 4 },
    weight: { power: 1.0, logic: 1.5, conflict: 0.7, emotion: 0.8, order: 1.0, ideology: 0.9, mobilization: 0.7, force: 0.7, development: 0.9 },
    photo: 'leader/竺苗龙.png'
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
    photo: 'leader/徐建培.png'
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
    photo: 'leader/夏临华.png'
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
    photo: 'leader/王安民.png'
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
    photo: 'leader/范跃进.png'
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
    photo: 'leader/夏东伟.png'
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
    photo: 'leader/胡金焱.png'
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
    photo: 'leader/魏志强.png'
  },
  {
    name: '孔伟金',
    slug: 'kong_weijin',
    period: '现任副校长',
    role: '执行型 · 学术创新',
    bio: '学术创新、深耕研教。',
    summary:
      '现任副校长，侧重研究生教育与学术创新，重视学术训练与创新氛围的营造，属于学术与管理并重、在分管领域扎实执行的推动者。',
    vec: { power: 5, logic: 9, conflict: 4, emotion: 5, order: 7, ideology: 6, mobilization: 5, force: 4, development: 8 },
    weight: { power: 0.9, logic: 1.6, conflict: 0.8, emotion: 0.9, order: 1.2, ideology: 1.1, mobilization: 0.9, force: 0.8, development: 1.5 },
    photo: 'leader/孔伟金.png'
  },
  {
    name: '李建波',
    slug: 'li_jianbo',
    period: '现任副校长',
    role: '改革型 · 创新创业',
    bio: '创新创业、服务驱动。',
    summary:
      '现任副校长，强势推动创新创业教育改革，强调「刀刃向内」与服务驱动，鼓励师生把创意变成项目、把服务做进一线，属于改革驱动的执行推动者。',
    vec: { power: 6, logic: 7, conflict: 7, emotion: 6, order: 6, ideology: 6, mobilization: 7, force: 6, development: 9 },
    weight: { power: 1.1, logic: 1.2, conflict: 1.3, emotion: 1.0, order: 1.0, ideology: 1.1, mobilization: 1.3, force: 1.1, development: 1.6 },
    photo: 'leader/李建波.png'
  }
]

export const questions = [
  /* ===== 参考站原题（leadertest.site，一字未改；axis 已映射到本站维度） ===== */
  {
    id: 'r1', type: 'single', kicker: '单选题', title: '当一个团队陷入混乱时，你更倾向：',
    desc: '请选择更接近你真实倾向的一项。', weight: 1.0,
    options: [
      { label: '先由一个人迅速拍板，把局面稳住', score: { power: 2 } },
      { label: '尽快明确规则分工，让大家按机制协作', score: { order: 2 } }
    ]
  },
  {
    id: 'r2', type: 'single', kicker: '单选题', title: '你觉得推动一件大事最可靠的是：',
    desc: '请选择更接近你真实倾向的一项。', weight: 1.0,
    options: [
      { label: '有人带头，把大家情绪和行动都调动起来', score: { mobilization: 2, emotion: 1 } },
      { label: '把流程、规则和节奏设计好，让系统自己运转', score: { order: 2, logic: 1 } }
    ]
  },
  {
    id: 'r3', type: 'single', kicker: '单选题', title: '当外部环境突然变得不稳定时，你更可能：',
    desc: '请选择最符合你第一反应的一项。', weight: 1.0,
    options: [
      { label: '果断集中决策权，先把局面压住', score: { power: 2 } },
      { label: '调整规则和资源配置，让系统重新恢复平衡', score: { logic: 2, order: 1 } },
      { label: '迅速统一口径和情绪，让所有人朝一个方向行动', score: { mobilization: 2, emotion: 1 } },
      { label: '尽量减少过度干预，先观察再决定', score: { logic: 2 } }
    ]
  },
  {
    id: 'r4', type: 'binary', kicker: '判断题', title: '危机时刻，你更倾向哪种处理方式？',
    desc: '请选择更接近你真实倾向的一项。', weight: 1.4,
    options: [
      { label: '快速决策，即使不完美', score: { power: 2, conflict: 1 } },
      { label: '慎重判断，即使错失机会', score: { logic: 2, order: 1 } }
    ]
  },
  {
    id: 'r5', type: 'binary', kicker: '判断题', title: '对权力的看法，你更接近？',
    desc: '请选择更接近你真实倾向的一项。', weight: 1.4,
    options: [
      { label: '权力必须集中', score: { power: 2, order: 1 } },
      { label: '权力应分散并受约束', score: { logic: 1, order: 2, power: -1 } }
    ]
  },
  {
    id: 'r6', type: 'binary', kicker: '判断题', title: '你如何看待冲突？',
    desc: '请选择更接近你真实倾向的一项。', weight: 1.4,
    options: [
      { label: '冲突是推进局势的工具', score: { conflict: 2, power: 1 } },
      { label: '稳定比冲突更重要', score: { order: 2, conflict: -1 } }
    ]
  },
  {
    id: 'r7', type: 'single', kicker: '单选题', title: '面对公开反对者，你更可能：',
    desc: '四个选项都代表不同策略。', weight: 1.0,
    options: [
      { label: '强硬压制', score: { power: 2, conflict: 2 } },
      { label: '试图说服', score: { emotion: 2, mobilization: 1 } },
      { label: '暂时回避', score: { logic: 1, conflict: -1 } },
      { label: '转化利用', score: { logic: 2, power: 1 } }
    ]
  },
  {
    id: 'r8', type: 'single', kicker: '单选题', title: '当团队低效时，你更愿意：',
    desc: '四个选项都代表不同治理方式。', weight: 1.0,
    options: [
      { label: '强力整顿', score: { power: 2, order: 1 } },
      { label: '优化结构和流程', score: { logic: 2, order: 2 } },
      { label: '激励沟通', score: { emotion: 2, mobilization: 1 } },
      { label: '替换关键人', score: { power: 1, conflict: 1 } }
    ]
  },
  {
    id: 'r9', type: 'multi', kicker: '多选题', title: '你认为有效的领导方式包括哪些？',
    desc: '最多选 2 个。第一个更像主倾向，第二个是副倾向。', weight: 1.0, max: 2, mainWeight: 1.0, secondWeight: 0.5,
    options: [
      { label: '强势推进', score: { power: 2, conflict: 1 } },
      { label: '制度管理', score: { order: 2, logic: 1 } },
      { label: '群众动员', score: { emotion: 2, mobilization: 2 } },
      { label: '长期规划', score: { logic: 2, order: 1 } }
    ]
  },
  {
    id: 'r10', type: 'multi', kicker: '多选题', title: '办一场活动，你更看重哪个结果？',
    desc: '最多选 2 个。', weight: 1.0, max: 2, mainWeight: 1.0, secondWeight: 0.5,
    options: [
      { label: '办得稳当、不出乱子', score: { order: 2 } },
      { label: '办出成果、大家有收获', score: { development: 2, order: 1 } },
      { label: '全程掌控、说到做到', score: { power: 2 } },
      { label: '引起关注、扩大影响', score: { emotion: 1, mobilization: 2 } }
    ]
  },
  {
    id: 'r11', type: 'likert', kicker: '场景题', title: '“我倾向于掌控局势。”',
    desc: '请选择符合程度。', weight: 1.2,
    scores: [{ power: -2 }, { power: -1 }, {}, { power: 1 }, { power: 2 }]
  },
  {
    id: 'r12', type: 'likert', kicker: '场景题', title: '“我愿意承担高风险换结果。”',
    desc: '请选择符合程度。', weight: 1.2,
    scores: [{ conflict: -2, logic: 1 }, { conflict: -1 }, {}, { conflict: 1, power: 1 }, { conflict: 2, force: 1 }]
  },
  {
    id: 'r13', type: 'likert', kicker: '场景题', title: '“我更依赖群众支持，而不是纯体制运转。”',
    desc: '请选择符合程度。', weight: 1.2,
    scores: [{ mobilization: -2, order: 1 }, { mobilization: -1 }, {}, { mobilization: 1, emotion: 1 }, { mobilization: 2, emotion: 2 }]
  },
  {
    id: 'r14', type: 'likert', kicker: '场景题', title: '“规则应该被严格执行。”',
    desc: '请选择符合程度。', weight: 1.2,
    scores: [{ order: -2 }, { order: -1 }, {}, { order: 1 }, { order: 2 }]
  },
  {
    id: 'r15', type: 'policy', kicker: '政策题', title: '班级人心有点散、活动总是冷场，你更愿意优先：',
    desc: '这题区分度很高。', weight: 1.6,
    options: [
      { label: '讲清班级的集体目标与荣誉感', score: { ideology: 2, mobilization: 2, emotion: 1 } },
      { label: '立个外部目标（比如跟兄弟班比一场）', score: { conflict: 2, power: 1, mobilization: 1 } },
      { label: '多办福利活动，改善大家体验', score: { order: 2, development: 2 } },
      { label: '立规矩、严执行，先恢复秩序', score: { force: 2, power: 2, order: 1 } }
    ]
  },
  {
    id: 'r16', type: 'policy', kicker: '政策题', title: '你组织的活动大家不太来捧场，你更倾向：',
    desc: '这题区分度很高。', weight: 1.6,
    options: [
      { label: '讲个振奋人心的故事，重新鼓劲', score: { emotion: 2, mobilization: 2, ideology: 1 } },
      { label: '搞点有话题性的新意，把焦点拉回来', score: { conflict: 2, mobilization: 1 } },
      { label: '加福利、发小奖品救场', score: { order: 2, development: 2 } },
      { label: '自己带头干出效果，展示执行力', score: { power: 2, force: 1, conflict: 1 } }
    ]
  },
  {
    id: 'r17', type: 'policy', kicker: '政策题', title: '社团 / 学生会要走得远，你更愿意押注：',
    desc: '这题区分度很高。', weight: 1.6,
    options: [
      { label: '建设社团文化与代代传承', score: { ideology: 2, emotion: 1, mobilization: 1 } },
      { label: '把管理权抓稳、令行禁止', score: { power: 2, force: 1 } },
      { label: '多拉资源、办有收益的活动', score: { development: 2, order: 1 } },
      { label: '数字化创新与流程升级', score: { development: 3, logic: 1 } }
    ]
  },

  /* ===== 青大校园特色题 ===== */
  {
    id: 'q1', type: 'binary', kicker: '判断题', title: '小组作业组队，你更倾向哪种方式？',
    desc: '请选择更接近你真实倾向的一项。', weight: 1.0,
    options: [
      { label: '我直接拍板分工，效率第一', score: { power: 2, force: 1 } },
      { label: '先定好规则和节点，按流程走', score: { logic: 2, order: 1 } }
    ]
  },
  {
    id: 'q2', type: 'single', kicker: '单选题', title: '社团活动遇到分歧，你更可能：',
    desc: '四个选项代表不同处理策略。', weight: 1.0,
    options: [
      { label: '力排众议，定了就执行', score: { power: 2, conflict: 2 } },
      { label: '逐个谈心，争取大家理解', score: { emotion: 2, mobilization: 1 } },
      { label: '先冷处理，观察再定', score: { logic: 1, conflict: -1 } },
      { label: '借势调整，把分歧变成新机会', score: { logic: 2, power: 1 } }
    ]
  },
  {
    id: 'q3', type: 'single', kicker: '单选题', title: '对「早八」和作息管理，你的态度更接近：',
    desc: '请选择更接近你真实倾向的一项。', weight: 1.0,
    options: [
      { label: '规则就该严格执行，该起就得起', score: { order: 2, force: 1 } },
      { label: '因人而异，尊重每个人的节奏', score: { emotion: 2 } },
      { label: '呼吁学校改革作息，别一刀切', score: { conflict: 2, mobilization: 1 } },
      { label: '自己规划好就行，不管别人', score: { logic: 2 } }
    ]
  },
  {
    id: 'q4', type: 'binary', kicker: '判断题', title: '期末复习，你更相信哪种打法？',
    desc: '请选择更接近你真实倾向的一项。', weight: 1.0,
    options: [
      { label: '提前两周做计划表，稳步推进', score: { logic: 2, order: 1 } },
      { label: '考前集中冲刺，高效爆发', score: { force: 2, development: 1 } }
    ]
  },
  {
    id: 'q5', type: 'single', kicker: '单选题', title: '面对「内卷」，你更倾向于：',
    desc: '请选择更接近你真实倾向的一项。', weight: 1.0,
    options: [
      { label: '卷就卷，靠效率卷赢', score: { development: 2, force: 1 } },
      { label: '调整心态，守住自己的节奏', score: { emotion: 2, order: 1 } },
      { label: '换个赛道，找没人卷的蓝海', score: { logic: 2, development: 1 } },
      { label: '集合大家，把规则改了', score: { conflict: 2, mobilization: 1 } }
    ]
  },
  {
    id: 'q6', type: 'single', kicker: '单选题', title: '宿舍出现矛盾，你的第一反应是：',
    desc: '请选择最接近你真实倾向的一项。', weight: 1.0,
    options: [
      { label: '定个宿舍公约，按规矩来', score: { order: 2 } },
      { label: '拉着大家开个夜谈会，敞开心扉', score: { emotion: 2, mobilization: 1 } },
      { label: '请导员介入，按校规处理', score: { power: 1, ideology: 1 } },
      { label: '少掺和，自己安静学习', score: { logic: 2 } }
    ]
  },
  {
    id: 'q7', type: 'binary', kicker: '判断题', title: '保研加分，创新创业大赛 vs 传统奖学金，你更看重？',
    desc: '请选择更接近你真实倾向的一项。', weight: 1.0,
    options: [
      { label: '创新创业大赛：跑起来才有机会', score: { development: 2, conflict: 1 } },
      { label: '传统奖学金：扎实积累更稳妥', score: { order: 2, ideology: 1 } }
    ]
  },
  {
    id: 'q8', type: 'policy', kicker: '政策题', title: '如果让你当一任校领导，优先推动哪件事？',
    desc: '这题区分度很高。', weight: 1.6,
    options: [
      { label: '冲刺双一流与 A 类学科，立军令状', score: { development: 2, force: 1, conflict: 1 } },
      { label: '推进本研贯通培养，抓学术指标', score: { logic: 2, order: 1, development: 1 } },
      { label: '深化产教融合，让毕业生好就业', score: { development: 2, ideology: 1 } },
      { label: '提升学生幸福感，办「下午茶」倾听心声', score: { emotion: 2, mobilization: 2, ideology: 1 } }
    ]
  },
  {
    id: 'q9', type: 'single', kicker: '单选题', title: '你怎么看待「第二课堂」和德育分？',
    desc: '请选择更接近你真实倾向的一项。', weight: 1.0,
    options: [
      { label: '要有制度，量化考核才公平', score: { order: 2 } },
      { label: '本质是育人，立德树人才是核心', score: { ideology: 2, emotion: 1 } },
      { label: '别搞形式主义，务实点', score: { conflict: 2, logic: 1 } },
      { label: '给足自主空间，让学生自己长', score: { logic: 2, mobilization: 1 } }
    ]
  },
  {
    id: 'q10', type: 'single', kicker: '单选题', title: '组织一次校庆活动，你更看重：',
    desc: '请选择更接近你真实倾向的一项。', weight: 1.0,
    options: [
      { label: '执行到位、场面震撼', score: { force: 2, order: 1 } },
      { label: '全员参与，把师生调动起来', score: { mobilization: 2, emotion: 1 } },
      { label: '有创意、有话题，出圈传播', score: { conflict: 2, development: 1 } },
      { label: '流程规范、不出差错', score: { order: 2, logic: 1 } }
    ]
  },
  {
    id: 'q11', type: 'likert', kicker: '场景题', title: '“我愿意为集体目标承担高强度任务。”',
    desc: '请选择符合程度。', weight: 1.0,
    scores: [{ force: -2, emotion: 1 }, { force: -1 }, {}, { force: 1, development: 1 }, { force: 2, development: 2 }]
  },
  {
    id: 'q12', type: 'single', kicker: '单选题', title: '社团换届，你更倾向自己：',
    desc: '请选择更接近你真实倾向的一项。', weight: 1.0,
    options: [
      { label: '继续留任，把盘子稳住', score: { power: 2, order: 1 } },
      { label: '主动让贤，培养新人', score: { emotion: 2, mobilization: 1 } },
      { label: '换一种方式继续参与', score: { logic: 2, conflict: 1 } },
      { label: '交给机制，谁上都是传承', score: { order: 2, ideology: 1 } }
    ]
  },
  {
    id: 'q13', type: 'likert', kicker: '场景题', title: '“我喜欢制定清晰的长期计划，并按部就班推进。”',
    desc: '请选择符合程度。', weight: 1.0,
    scores: [{ logic: -2, order: -1 }, { logic: -1 }, {}, { logic: 1, order: 1 }, { logic: 2, order: 2 }]
  },
  {
    id: 'q14', type: 'single', kicker: '单选题', title: '舍友半夜 emo 找你倾诉，你会：',
    desc: '请选择更接近你真实倾向的一项。', weight: 1.2,
    options: [
      { label: '先耐心听，共情TA的情绪', score: { emotion: 2, mobilization: 1 } },
      { label: '听完理性给建议，帮TA分析', score: { logic: 2 } },
      { label: '给TA些实际帮助，做点实事', score: { order: 1, development: 1 } },
      { label: '拉上别的舍友一起陪TA', score: { mobilization: 2, emotion: 1 } }
    ]
  },
  {
    id: 'q15', type: 'single', kicker: '单选题', title: '你觉得大学最该把人培养成什么样？',
    desc: '请选择最接近你真实倾向的一项。', weight: 1.2,
    options: [
      { label: '能立身做人的合格公民', score: { ideology: 2, emotion: 1 } },
      { label: '有竞争力、能独立生活的毕业生', score: { development: 2, order: 1 } },
      { label: '有独立思考与批判精神的人', score: { logic: 2 } },
      { label: '心怀家国、愿意服务社会的人', score: { ideology: 2, mobilization: 1 } }
    ]
  },
  {
    id: 'q16', type: 'single', kicker: '单选题', title: '组织一次班级活动，你更看重：',
    desc: '请选择最接近你真实倾向的一项。', weight: 1.0,
    options: [
      { label: '大家玩得开心、人人参与', score: { mobilization: 2, emotion: 1 } },
      { label: '流程规范、安全不出岔子', score: { order: 2, logic: 1 } },
      { label: '办出影响力，最好出圈', score: { development: 2, conflict: 1 } },
      { label: '自己牵头，办得漂亮利落', score: { power: 2, force: 1 } }
    ]
  },
  {
    id: 'q17', type: 'single', kicker: '单选题', title: '想让一群人愿意跟着你干一件事，你更信哪招？',
    desc: '请选择最接近你真实倾向的一项。', weight: 1.2,
    options: [
      { label: '把大家情绪点燃，一起冲', score: { mobilization: 2, emotion: 1 } },
      { label: '把目标、分工、奖励定清楚', score: { order: 2, development: 1 } },
      { label: '自己先干出成绩，用结果带人', score: { force: 2, power: 1 } },
      { label: '讲清楚这件事的意义和价值', score: { ideology: 2, emotion: 1 } }
    ]
  },
  {
    id: 'q18', type: 'single', kicker: '单选题', title: '社团招新，你觉得最有效的是：',
    desc: '请选择最接近你真实倾向的一项。', weight: 1.0,
    options: [
      { label: '靠有创意的活动把人吸引来', score: { mobilization: 2, emotion: 1 } },
      { label: '靠人脉和资源把场子撑起来', score: { power: 2 } },
      { label: '靠清晰的分工和招新计划', score: { logic: 2, order: 1 } },
      { label: '靠口碑和氛围慢慢积累', score: { order: 1, ideology: 2 } }
    ]
  }
]

export const shareLine = (leader) => `我测出来最像${leader.name} —— ${leader.bio} 你也来测测看？`

/** 出场偏移（与 leaders 顺序一一对应）：中心化加权距离 - bias 后取最小者胜，
 *  用于让 10 位原型在随机答题下出现概率接近（见 /counter 同款校准思路）。 */
export const BIAS = [1.0523, -0.1361, 0.4643, -0.5259, -0.4065, -0.0058, -0.4023, 0.0427, 0.0967, -0.1794]