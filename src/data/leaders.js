export const DIMS = [
  { key: 'power', label: '决策魄力', labelEn: 'Decisiveness' },
  { key: 'logic', label: '规划理性', labelEn: 'Planning' },
  { key: 'conflict', label: '改革锐气', labelEn: 'Reform' },
  { key: 'emotion', label: '情怀感召', labelEn: 'Empathy' },
  { key: 'order', label: '制度规范', labelEn: 'Regulation' },
  { key: 'ideology', label: '育人理念', labelEn: 'Education' },
  { key: 'mobilization', label: '师生动员', labelEn: 'Mobilization' },
  { key: 'force', label: '执行强度', labelEn: 'Execution' },
  { key: 'development', label: '发展导向', labelEn: 'Development' }
]

export const leaders = [
  {
    name: '竺苗龙',
    slug: 'zhu_miaolong',
    period: '1993–1997 任校长',
    periodEn: 'President 1993–1997',
    role: '学者型 · 学术奠基',
    roleEn: 'Scholar Type · Academic Foundation',
    bio: '学术深耕、专注治学。',
    bioEn: 'Deep academic focus, dedicated to scholarship.',
    summary:
      '航天力学专家，长期担任名誉校长，是我国著名航天力学专家与学术带头人。淡泊行政权力、沉潜基础研究，以专业造诣和学术声望引领学校发展，属于典型的学者型领导。',
    summaryEn: 'An expert in aerospace mechanics and long-time honorary president, he is a renowned academic leader. Detached from administrative power, he focused on fundamental research, guiding the university through professional expertise and academic reputation — a quintessential scholar-type leader.',
    vec: { power: 4, logic: 9, conflict: 3, emotion: 4, order: 7, ideology: 6, mobilization: 3, force: 2, development: 4 },
    weight: { power: 1.0, logic: 1.5, conflict: 0.7, emotion: 0.8, order: 1.0, ideology: 0.9, mobilization: 0.7, force: 0.7, development: 0.9 },
    photo: 'leader/竺苗龙.png'
  },
  {
    name: '徐建培',
    slug: 'xu_jianpei',
    period: '1999–2004 任校长',
    periodEn: 'President 1999–2004',
    role: '跨界型 · 行政通达',
    roleEn: 'Cross-boundary · Administrative Versatility',
    bio: '跨界开拓、行政通达。',
    bioEn: 'Cross-boundary pioneer, administratively versatile.',
    summary:
      '由青岛大学校长起步，后进入国家部委及地方政府担任要职，行事风格偏向从教育管理向更广阔行政领域拓展，长于整合资源、打通渠道，属于跨界发展的管理者。',
    summaryEn: 'Starting as QDU president, he later held key positions in national ministries and local government. His style leaned toward expanding from educational administration into broader governance — skilled at integrating resources and opening channels, a cross-boundary manager.',
    vec: { power: 7, logic: 8, conflict: 4, emotion: 4, order: 7, ideology: 5, mobilization: 6, force: 5, development: 8 },
    weight: { power: 1.2, logic: 1.3, conflict: 0.8, emotion: 0.7, order: 1.1, ideology: 0.9, mobilization: 1.1, force: 1.0, development: 1.4 },
    photo: 'leader/徐建培.png'
  },
  {
    name: '夏临华',
    slug: 'xia_linhua',
    period: '2004–2011 任校长',
    periodEn: 'President 2004–2011',
    role: '专家型 · 科研立校',
    roleEn: 'Expert Type · Research-Based',
    bio: '专家治校、科研立校。',
    bioEn: 'Expert governance, research-driven university.',
    summary:
      '理论物理学家、「百千万人才工程」人选，长期深耕理论物理前沿研究。以科研视野和学术判断管理学校，强调内涵与基础研究，属于典型的专家治校。',
    summaryEn: 'A theoretical physicist and "Hundred-Thousand-Talent Project" selectee, he has long been immersed in frontier theoretical physics research. Managing the university with a scientific vision and academic judgment, emphasizing substance and fundamental research — a quintessential expert-type leader.',
    vec: { power: 5, logic: 9, conflict: 2, emotion: 4, order: 7, ideology: 5, mobilization: 3, force: 2, development: 6 },
    weight: { power: 0.9, logic: 1.6, conflict: 0.6, emotion: 0.8, order: 1.1, ideology: 0.9, mobilization: 0.6, force: 0.5, development: 1.0 },
    photo: 'leader/夏临华.png'
  },
  {
    name: '王安民',
    slug: 'wang_anmin',
    period: '2011–2015 任校长',
    periodEn: 'President 2011–2015',
    role: '结合型 · 经验治理',
    roleEn: 'Hybrid · Experience-Based Governance',
    bio: '政学兼修、经验治理。',
    bioEn: 'Blending politics and academia, governance by experience.',
    summary:
      '兼具发改委、科技局等政府工作经历后回归高校，善于把行政管理经验与教育管理结合，注重流程、资源与务实落地，属于政学结合的实践者。',
    summaryEn: 'With government experience in development and technology bureaus before returning to academia, he excels at combining administrative management with educational governance — emphasizing process, resources, and pragmatic execution. A practitioner bridging government and academia.',
    vec: { power: 7, logic: 8, conflict: 4, emotion: 5, order: 8, ideology: 5, mobilization: 6, force: 5, development: 7 },
    weight: { power: 1.2, logic: 1.3, conflict: 0.8, emotion: 0.9, order: 1.5, ideology: 0.9, mobilization: 1.0, force: 1.0, development: 1.3 },
    photo: 'leader/王安民.png'
  },
  {
    name: '范跃进',
    slug: 'fan_yuejin',
    period: '2015–2018 任书记 / 校长',
    periodEn: 'Party Secretary / President 2015–2018',
    role: '改革派 · 奠基人',
    roleEn: 'Reformist · Foundational Builder',
    bio: '锐意改革、大刀阔斧。',
    bioEn: 'Bold reforms, sweeping changes.',
    summary:
      '以大刀阔斧的改革著称，曾主政三所高校。在青大任内提出「对标苏大」等目标，推行管理体制与人事改革，为后续发展奠定基础，属于改革派奠基人。',
    summaryEn: 'Known for bold reforms, he previously led three universities. At QDU, he set goals like "benchmarking Soochow University," pushed management and personnel reforms, laying the groundwork for future development — a reformist foundational builder.',
    vec: { power: 9, logic: 6, conflict: 8, emotion: 7, order: 6, ideology: 5, mobilization: 8, force: 8, development: 9 },
    weight: { power: 1.5, logic: 1.0, conflict: 1.4, emotion: 1.1, order: 0.9, ideology: 0.9, mobilization: 1.4, force: 1.4, development: 1.6 },
    photo: 'leader/范跃进.png'
  },
  {
    name: '夏东伟',
    slug: 'xia_dongwei',
    period: '2018–2024 任校长',
    periodEn: 'President 2018–2024',
    role: '实干型 · 成果导向',
    roleEn: 'Pragmatic · Results-Oriented',
    bio: '成果导向、指标驱动。',
    bioEn: 'Results-oriented, metric-driven.',
    summary:
      '任期注重学术指标提升，强调本研贯通培养与科研训练，习惯用软科排名、自然指数等具体数据衡量学校进步，务实推进每一项可量化的目标，属于成果导向的实干家。',
    summaryEn: 'During his tenure, he focused on improving academic metrics, emphasizing integrated undergraduate-graduate education and research training. Using concrete data like ShanghaiRanking and Nature Index to measure progress, he pragmatically advanced every quantifiable goal — a results-oriented doer.',
    vec: { power: 7, logic: 8, conflict: 5, emotion: 4, order: 8, ideology: 5, mobilization: 5, force: 6, development: 9 },
    weight: { power: 1.2, logic: 1.4, conflict: 0.9, emotion: 0.7, order: 1.4, ideology: 0.9, mobilization: 0.9, force: 1.1, development: 1.7 },
    photo: 'leader/夏东伟.png'
  },
  {
    name: '胡金焱',
    slug: 'hu_jinyan',
    period: '2018 至今 任书记',
    periodEn: 'Party Secretary since 2018',
    role: '战略家 · 思想者',
    roleEn: 'Strategist · Visionary Thinker',
    bio: '顶层设计、思想引领。',
    bioEn: 'Top-level design, thought leadership.',
    summary:
      '注重顶层设计，提出「一二三四五」育人体系，主持「书记下午茶」，风格亲民。强调把个人发展融入国家战略，鼓励学生立志与创新，属于战略家与思想者。',
    summaryEn: 'Focused on top-level design, he proposed the "1-2-3-4-5" education system and hosts "Secretary\'s Afternoon Tea," a grassroots style. He emphasizes integrating personal development with national strategy, encouraging students to set ambitions and innovate — a strategist and visionary thinker.',
    vec: { power: 6, logic: 8, conflict: 4, emotion: 8, order: 6, ideology: 8, mobilization: 8, force: 4, development: 8 },
    weight: { power: 1.0, logic: 1.3, conflict: 0.8, emotion: 1.5, order: 1.0, ideology: 1.5, mobilization: 1.5, force: 0.8, development: 1.3 },
    photo: 'leader/胡金焱.png'
  },
  {
    name: '魏志强',
    slug: 'wei_zhiqiang',
    period: '2024 至今 任校长',
    periodEn: 'President since 2024',
    role: '实干派 · 强驱动',
    roleEn: 'Pragmatic · Strong Drive',
    bio: '务实果断、数据驱动。',
    bioEn: 'Pragmatic and decisive, data-driven.',
    summary:
      '风格务实果断，目标直指「双一流」与 A 类学科，提出「111」计划与「系统+、纺织+、医学+」板块思路，强调数据驱动与产教融合，行事充满紧迫感，属于实干派与强驱动者。',
    summaryEn: 'Pragmatic and decisive in style, he targets "Double First-Class" and A-category disciplines, proposing the "111 Plan" and "System+, Textile+, Medical+" framework. Emphasizing data-driven approaches and industry-education integration, his pace is urgent — a pragmatic strong-drive leader.',
    vec: { power: 8, logic: 7, conflict: 7, emotion: 5, order: 7, ideology: 6, mobilization: 6, force: 8, development: 9 },
    weight: { power: 1.5, logic: 1.2, conflict: 1.3, emotion: 0.9, order: 1.2, ideology: 1.1, mobilization: 1.1, force: 1.5, development: 1.7 },
    photo: 'leader/魏志强.png'
  },
  {
    name: '孔伟金',
    slug: 'kong_weijin',
    period: '现任副校长',
    periodEn: 'Current Vice President',
    role: '执行型 · 学术创新',
    roleEn: 'Execution · Academic Innovation',
    bio: '学术创新、深耕研教。',
    bioEn: 'Academic innovation, deep research and teaching.',
    summary:
      '现任副校长，侧重研究生教育与学术创新，重视学术训练与创新氛围的营造，属于学术与管理并重、在分管领域扎实执行的推动者。',
    summaryEn: 'Current vice president focusing on graduate education and academic innovation. He values research training and fostering an innovation culture — a balanced academic-manager and solid executor in his domain.',
    vec: { power: 5, logic: 9, conflict: 4, emotion: 5, order: 7, ideology: 6, mobilization: 5, force: 4, development: 8 },
    weight: { power: 0.9, logic: 1.6, conflict: 0.8, emotion: 0.9, order: 1.2, ideology: 1.1, mobilization: 0.9, force: 0.8, development: 1.5 },
    photo: 'leader/孔伟金.png'
  },
  {
    name: '李建波',
    slug: 'li_jianbo',
    period: '现任副校长',
    periodEn: 'Current Vice President',
    role: '改革型 · 创新创业',
    roleEn: 'Reformist · Innovation & Entrepreneurship',
    bio: '创新创业、服务驱动。',
    bioEn: 'Innovation and entrepreneurship, service-driven.',
    summary:
      '现任副校长，强势推动创新创业教育改革，强调「刀刃向内」与服务驱动，鼓励师生把创意变成项目、把服务做进一线，属于改革驱动的执行推动者。',
    summaryEn: 'Current vice president forcefully promoting innovation and entrepreneurship education reform. He emphasizes "turning the blade inward" and service-driven approaches, encouraging students and faculty to turn ideas into projects and serve at the frontlines — a reform-driven execution promoter.',
    vec: { power: 6, logic: 7, conflict: 7, emotion: 6, order: 6, ideology: 6, mobilization: 7, force: 6, development: 9 },
    weight: { power: 1.1, logic: 1.2, conflict: 1.3, emotion: 1.0, order: 1.0, ideology: 1.1, mobilization: 1.3, force: 1.1, development: 1.6 },
    photo: 'leader/李建波.png'
  }
]

export const questions = [
  {
    id: 'r1', type: 'single', kicker: '单选题', kickerEn: 'Single',
    title: '当一个团队陷入混乱时，你更倾向：',
    titleEn: 'When a team falls into chaos, you tend to:',
    desc: '请选择更接近你真实倾向的一项。',
    descEn: 'Choose the option closest to your true preference.',
    weight: 1.0,
    options: [
      { label: '先由一个人迅速拍板，把局面稳住', labelEn: 'Have one person make a quick call to stabilize', score: { power: 2 } },
      { label: '尽快明确规则分工，让大家按机制协作', labelEn: 'Quickly define rules and roles for coordinated work', score: { order: 2 } }
    ]
  },
  {
    id: 'r2', type: 'single', kicker: '单选题', kickerEn: 'Single',
    title: '你觉得推动一件大事最可靠的是：',
    titleEn: 'What do you think is most reliable for driving a big initiative?',
    desc: '请选择更接近你真实倾向的一项。',
    descEn: 'Choose the option closest to your true preference.',
    weight: 1.0,
    options: [
      { label: '有人带头，把大家情绪和行动都调动起来', labelEn: 'Someone takes the lead, rallying emotions and action', score: { mobilization: 2, emotion: 1 } },
      { label: '把流程、规则和节奏设计好，让系统自己运转', labelEn: 'Design processes, rules, and rhythm well so the system runs itself', score: { order: 2, logic: 1 } }
    ]
  },
  {
    id: 'r3', type: 'single', kicker: '单选题', kickerEn: 'Single',
    title: '当外部环境突然变得不稳定时，你更可能：',
    titleEn: 'When the external environment suddenly becomes unstable, you are more likely to:',
    desc: '请选择最符合你第一反应的一项。',
    descEn: 'Choose the option closest to your first reaction.',
    weight: 1.0,
    options: [
      { label: '果断集中决策权，先把局面压住', labelEn: 'Decisively centralize decision-making to hold the situation', score: { power: 2 } },
      { label: '调整规则和资源配置，让系统重新恢复平衡', labelEn: 'Adjust rules and resources to restore system balance', score: { logic: 2, order: 1 } },
      { label: '迅速统一口径和情绪，让所有人朝一个方向行动', labelEn: 'Quickly align messaging and emotions so everyone moves in one direction', score: { mobilization: 2, emotion: 1 } },
      { label: '尽量减少过度干预，先观察再决定', labelEn: 'Minimize over-intervention, observe first, then decide', score: { logic: 2 } }
    ]
  },
  {
    id: 'r4', type: 'binary', kicker: '判断题', kickerEn: 'Binary',
    title: '危机时刻，你更倾向哪种处理方式？',
    titleEn: 'In a crisis, which approach do you prefer?',
    desc: '请选择更接近你真实倾向的一项。',
    descEn: 'Choose the option closest to your true preference.',
    weight: 1.4,
    options: [
      { label: '快速决策，即使不完美', labelEn: 'Quick decisions, even if imperfect', score: { power: 2, conflict: 1 } },
      { label: '慎重判断，即使错失机会', labelEn: 'Careful judgment, even if opportunities are missed', score: { logic: 2, order: 1 } }
    ]
  },
  {
    id: 'r5', type: 'binary', kicker: '判断题', kickerEn: 'Binary',
    title: '对权力的看法，你更接近？',
    titleEn: 'Which view on power is closer to yours?',
    desc: '请选择更接近你真实倾向的一项。',
    descEn: 'Choose the option closest to your true preference.',
    weight: 1.4,
    options: [
      { label: '权力必须集中', labelEn: 'Power must be centralized', score: { power: 2, order: 1 } },
      { label: '权力应分散并受约束', labelEn: 'Power should be distributed and constrained', score: { logic: 1, order: 2, power: -1 } }
    ]
  },
  {
    id: 'r6', type: 'binary', kicker: '判断题', kickerEn: 'Binary',
    title: '你如何看待冲突？',
    titleEn: 'How do you view conflict?',
    desc: '请选择更接近你真实倾向的一项。',
    descEn: 'Choose the option closest to your true preference.',
    weight: 1.4,
    options: [
      { label: '冲突是推进局势的工具', labelEn: 'Conflict is a tool for driving progress', score: { conflict: 2, power: 1 } },
      { label: '稳定比冲突更重要', labelEn: 'Stability is more important than conflict', score: { order: 2, conflict: -1 } }
    ]
  },
  {
    id: 'r7', type: 'single', kicker: '单选题', kickerEn: 'Single',
    title: '面对公开反对者，你更可能：',
    titleEn: 'When facing public opposition, you are more likely to:',
    desc: '四个选项都代表不同策略。',
    descEn: 'All four options represent different strategies.',
    weight: 1.0,
    options: [
      { label: '强硬压制', labelEn: 'Suppress firmly', score: { power: 2, conflict: 2 } },
      { label: '试图说服', labelEn: 'Try to persuade', score: { emotion: 2, mobilization: 1 } },
      { label: '暂时回避', labelEn: 'Avoid temporarily', score: { logic: 1, conflict: -1 } },
      { label: '转化利用', labelEn: 'Co-opt and leverage', score: { logic: 2, power: 1 } }
    ]
  },
  {
    id: 'r8', type: 'single', kicker: '单选题', kickerEn: 'Single',
    title: '当团队低效时，你更愿意：',
    titleEn: 'When the team is inefficient, you would rather:',
    desc: '四个选项都代表不同治理方式。',
    descEn: 'All four options represent different governance styles.',
    weight: 1.0,
    options: [
      { label: '强力整顿', labelEn: 'Strict rectification', score: { power: 2, order: 1 } },
      { label: '优化结构和流程', labelEn: 'Optimize structure and processes', score: { logic: 2, order: 2 } },
      { label: '激励沟通', labelEn: 'Motivate through communication', score: { emotion: 2, mobilization: 1 } },
      { label: '替换关键人', labelEn: 'Replace key personnel', score: { power: 1, conflict: 1 } }
    ]
  },
  {
    id: 'r9', type: 'multi', kicker: '多选题', kickerEn: 'Multi',
    title: '你认为有效的领导方式包括哪些？',
    titleEn: 'Which effective leadership styles do you believe in?',
    desc: '最多选 2 个。第一个更像主倾向，第二个是副倾向。',
    descEn: 'Select up to 2. First is primary style, second is secondary.',
    weight: 1.0, max: 2, mainWeight: 1.0, secondWeight: 0.5,
    options: [
      { label: '强势推进', labelEn: 'Strong push', score: { power: 2, conflict: 1 } },
      { label: '制度管理', labelEn: 'Systematic management', score: { order: 2, logic: 1 } },
      { label: '群众动员', labelEn: 'Mass mobilization', score: { emotion: 2, mobilization: 2 } },
      { label: '长期规划', labelEn: 'Long-term planning', score: { logic: 2, order: 1 } }
    ]
  },
  {
    id: 'r10', type: 'multi', kicker: '多选题', kickerEn: 'Multi',
    title: '办一场活动，你更看重哪个结果？',
    titleEn: 'For organizing an event, which outcome matters most?',
    desc: '最多选 2 个。',
    descEn: 'Select up to 2.',
    weight: 1.0, max: 2, mainWeight: 1.0, secondWeight: 0.5,
    options: [
      { label: '办得稳当、不出乱子', labelEn: 'Run smoothly without issues', score: { order: 2 } },
      { label: '办出成果、大家有收获', labelEn: 'Achieve results, everyone benefits', score: { development: 2, order: 1 } },
      { label: '全程掌控、说到做到', labelEn: 'Full control, deliver on promises', score: { power: 2 } },
      { label: '引起关注、扩大影响', labelEn: 'Attract attention, expand influence', score: { emotion: 1, mobilization: 2 } }
    ]
  },
  {
    id: 'r11', type: 'likert', kicker: '场景题', kickerEn: 'Scenario',
    title: '"我倾向于掌控局势。"',
    titleEn: '"I tend to take control of the situation."',
    desc: '请选择符合程度。',
    descEn: 'Choose your level of agreement.',
    weight: 1.2,
    scores: [{ power: -2 }, { power: -1 }, {}, { power: 1 }, { power: 2 }]
  },
  {
    id: 'r12', type: 'likert', kicker: '场景题', kickerEn: 'Scenario',
    title: '"我愿意承担高风险换结果。"',
    titleEn: '"I am willing to take high risks for results."',
    desc: '请选择符合程度。',
    descEn: 'Choose your level of agreement.',
    weight: 1.2,
    scores: [{ conflict: -2, logic: 1 }, { conflict: -1 }, {}, { conflict: 1, power: 1 }, { conflict: 2, force: 1 }]
  },
  {
    id: 'r13', type: 'likert', kicker: '场景题', kickerEn: 'Scenario',
    title: '"我更依赖群众支持，而不是纯体制运转。"',
    titleEn: '"I rely more on public support than pure institutional operation."',
    desc: '请选择符合程度。',
    descEn: 'Choose your level of agreement.',
    weight: 1.2,
    scores: [{ mobilization: -2, order: 1 }, { mobilization: -1 }, {}, { mobilization: 1, emotion: 1 }, { mobilization: 2, emotion: 2 }]
  },
  {
    id: 'r14', type: 'likert', kicker: '场景题', kickerEn: 'Scenario',
    title: '"规则应该被严格执行。"',
    titleEn: '"Rules should be strictly enforced."',
    desc: '请选择符合程度。',
    descEn: 'Choose your level of agreement.',
    weight: 1.2,
    scores: [{ order: -2 }, { order: -1 }, {}, { order: 1 }, { order: 2 }]
  },
  {
    id: 'r15', type: 'policy', kicker: '政策题', kickerEn: 'Policy',
    title: '班级人心有点散、活动总是冷场，你更愿意优先：',
    titleEn: 'The class is disengaged and events always flop — what would you prioritize?',
    desc: '这题区分度很高。',
    descEn: 'This question is highly discriminative.',
    weight: 1.6,
    options: [
      { label: '讲清班级的集体目标与荣誉感', labelEn: 'Clarify the class\'s collective goals and sense of honor', score: { ideology: 2, mobilization: 2, emotion: 1 } },
      { label: '立个外部目标（比如跟兄弟班比一场）', labelEn: 'Set an external goal (e.g., compete with another class)', score: { conflict: 2, power: 1, mobilization: 1 } },
      { label: '多办福利活动，改善大家体验', labelEn: 'Organize more welfare events to improve everyone\'s experience', score: { order: 2, development: 2 } },
      { label: '立规矩、严执行，先恢复秩序', labelEn: 'Set rules, enforce strictly, restore order first', score: { force: 2, power: 2, order: 1 } }
    ]
  },
  {
    id: 'r16', type: 'policy', kicker: '政策题', kickerEn: 'Policy',
    title: '你组织的活动大家不太来捧场，你更倾向：',
    titleEn: 'People don\'t show up to your events — you tend to:',
    desc: '这题区分度很高。',
    descEn: 'This question is highly discriminative.',
    weight: 1.6,
    options: [
      { label: '讲个振奋人心的故事，重新鼓劲', labelEn: 'Tell an inspiring story to rally everyone again', score: { emotion: 2, mobilization: 2, ideology: 1 } },
      { label: '搞点有话题性的新意，把焦点拉回来', labelEn: 'Create something trendy and eye-catching to recapture attention', score: { conflict: 2, mobilization: 1 } },
      { label: '加福利、发小奖品救场', labelEn: 'Add perks and small prizes to save the day', score: { order: 2, development: 2 } },
      { label: '自己带头干出效果，展示执行力', labelEn: 'Lead by example and demonstrate execution power', score: { power: 2, force: 1, conflict: 1 } }
    ]
  },
  {
    id: 'r17', type: 'policy', kicker: '政策题', kickerEn: 'Policy',
    title: '社团 / 学生会要走得远，你更愿意押注：',
    titleEn: 'For a club or student union to go far, you would bet on:',
    desc: '这题区分度很高。',
    descEn: 'This question is highly discriminative.',
    weight: 1.6,
    options: [
      { label: '建设社团文化与代代传承', labelEn: 'Build club culture and intergenerational legacy', score: { ideology: 2, emotion: 1, mobilization: 1 } },
      { label: '把管理权抓稳、令行禁止', labelEn: 'Maintain tight management control, absolute authority', score: { power: 2, force: 1 } },
      { label: '多拉资源、办有收益的活动', labelEn: 'Secure more resources, organize profitable events', score: { development: 2, order: 1 } },
      { label: '数字化创新与流程升级', labelEn: 'Digital innovation and process upgrades', score: { development: 3, logic: 1 } }
    ]
  },

  {
    id: 'q1', type: 'binary', kicker: '判断题', kickerEn: 'Binary',
    title: '小组作业组队，你更倾向哪种方式？',
    titleEn: 'For group project formation, which approach do you prefer?',
    desc: '请选择更接近你真实倾向的一项。',
    descEn: 'Choose the option closest to your true preference.',
    weight: 1.0,
    options: [
      { label: '我直接拍板分工，效率第一', labelEn: 'I call the shots on task division — efficiency first', score: { power: 2, force: 1 } },
      { label: '先定好规则和节点，按流程走', labelEn: 'Set rules and milestones first, follow the process', score: { logic: 2, order: 1 } }
    ]
  },
  {
    id: 'q2', type: 'single', kicker: '单选题', kickerEn: 'Single',
    title: '社团活动遇到分歧，你更可能：',
    titleEn: 'When disagreements arise in club activities, you are more likely to:',
    desc: '四个选项代表不同处理策略。',
    descEn: 'All four options represent different strategies.',
    weight: 1.0,
    options: [
      { label: '力排众议，定了就执行', labelEn: 'Overrule objections, execute once decided', score: { power: 2, conflict: 2 } },
      { label: '逐个谈心，争取大家理解', labelEn: 'Talk to each person individually to gain understanding', score: { emotion: 2, mobilization: 1 } },
      { label: '先冷处理，观察再定', labelEn: 'Cool it down first, observe, then decide', score: { logic: 1, conflict: -1 } },
      { label: '借势调整，把分歧变成新机会', labelEn: 'Leverage the moment, turn disagreement into new opportunity', score: { logic: 2, power: 1 } }
    ]
  },
  {
    id: 'q3', type: 'single', kicker: '单选题', kickerEn: 'Single',
    title: '对「早八」和作息管理，你的态度更接近：',
    titleEn: 'Your attitude toward 8am classes and schedule management is closer to:',
    desc: '请选择更接近你真实倾向的一项。',
    descEn: 'Choose the option closest to your true preference.',
    weight: 1.0,
    options: [
      { label: '规则就该严格执行，该起就得起', labelEn: 'Rules should be strictly enforced — get up when you must', score: { order: 2, force: 1 } },
      { label: '因人而异，尊重每个人的节奏', labelEn: 'Different for each person, respect individual rhythms', score: { emotion: 2 } },
      { label: '呼吁学校改革作息，别一刀切', labelEn: 'Advocate for schedule reform, don\'t apply one-size-fits-all', score: { conflict: 2, mobilization: 1 } },
      { label: '自己规划好就行，不管别人', labelEn: 'Plan your own well, don\'t worry about others', score: { logic: 2 } }
    ]
  },
  {
    id: 'q4', type: 'binary', kicker: '判断题', kickerEn: 'Binary',
    title: '期末复习，你更相信哪种打法？',
    titleEn: 'For final exam prep, which strategy do you trust more?',
    desc: '请选择更接近你真实倾向的一项。',
    descEn: 'Choose the option closest to your true preference.',
    weight: 1.0,
    options: [
      { label: '提前两周做计划表，稳步推进', labelEn: 'Plan two weeks ahead, progress steadily', score: { logic: 2, order: 1 } },
      { label: '考前集中冲刺，高效爆发', labelEn: 'Intensive sprint before the exam, efficient burst', score: { force: 2, development: 1 } }
    ]
  },
  {
    id: 'q5', type: 'single', kicker: '单选题', kickerEn: 'Single',
    title: '面对「内卷」，你更倾向于：',
    titleEn: 'Facing "involution," you tend to:',
    desc: '请选择更接近你真实倾向的一项。',
    descEn: 'Choose the option closest to your true preference.',
    weight: 1.0,
    options: [
      { label: '卷就卷，靠效率卷赢', labelEn: 'Compete head-on, win through efficiency', score: { development: 2, force: 1 } },
      { label: '调整心态，守住自己的节奏', labelEn: 'Adjust mindset, stay in your own rhythm', score: { emotion: 2, order: 1 } },
      { label: '换个赛道，找没人卷的蓝海', labelEn: 'Switch tracks, find an untapped blue ocean', score: { logic: 2, development: 1 } },
      { label: '集合大家，把规则改了', labelEn: 'Rally everyone and change the rules', score: { conflict: 2, mobilization: 1 } }
    ]
  },
  {
    id: 'q6', type: 'single', kicker: '单选题', kickerEn: 'Single',
    title: '宿舍出现矛盾，你的第一反应是：',
    titleEn: 'When dorm conflicts arise, your first reaction is:',
    desc: '请选择最接近你真实倾向的一项。',
    descEn: 'Choose the option closest to your true preference.',
    weight: 1.0,
    options: [
      { label: '定个宿舍公约，按规矩来', labelEn: 'Set a dorm agreement, follow the rules', score: { order: 2 } },
      { label: '拉着大家开个夜谈会，敞开心扉', labelEn: 'Organize a late-night talk to open hearts', score: { emotion: 2, mobilization: 1 } },
      { label: '请导员介入，按校规处理', labelEn: 'Ask the counselor to intervene per university rules', score: { power: 1, ideology: 1 } },
      { label: '少掺和，自己安静学习', labelEn: 'Stay out of it, study quietly', score: { logic: 2 } }
    ]
  },
  {
    id: 'q7', type: 'binary', kicker: '判断题', kickerEn: 'Binary',
    title: '保研加分，创新创业大赛 vs 传统奖学金，你更看重？',
    titleEn: 'For postgrad recommendation credits: innovation competition vs traditional scholarship — which matters more?',
    desc: '请选择更接近你真实倾向的一项。',
    descEn: 'Choose the option closest to your true preference.',
    weight: 1.0,
    options: [
      { label: '创新创业大赛：跑起来才有机会', labelEn: 'Innovation competition: you need to move to have a chance', score: { development: 2, conflict: 1 } },
      { label: '传统奖学金：扎实积累更稳妥', labelEn: 'Traditional scholarship: solid accumulation is more reliable', score: { order: 2, ideology: 1 } }
    ]
  },
  {
    id: 'q8', type: 'policy', kicker: '政策题', kickerEn: 'Policy',
    title: '如果让你当一任校领导，优先推动哪件事？',
    titleEn: 'If you were a university leader, what would you prioritize?',
    desc: '这题区分度很高。',
    descEn: 'This question is highly discriminative.',
    weight: 1.6,
    options: [
      { label: '冲刺双一流与 A 类学科，立军令状', labelEn: 'Pursue Double First-Class and A-category disciplines', score: { development: 2, force: 1, conflict: 1 } },
      { label: '推进本研贯通培养，抓学术指标', labelEn: 'Advance integrated undergrad-grad programs, improve academic metrics', score: { logic: 2, order: 1, development: 1 } },
      { label: '深化产教融合，让毕业生好就业', labelEn: 'Deepen industry-education integration for better graduate employment', score: { development: 2, ideology: 1 } },
      { label: '提升学生幸福感，办「下午茶」倾听心声', labelEn: 'Enhance student well-being, host "Afternoon Tea" to listen', score: { emotion: 2, mobilization: 2, ideology: 1 } }
    ]
  },
  {
    id: 'q9', type: 'single', kicker: '单选题', kickerEn: 'Single',
    title: '你怎么看待「第二课堂」和德育分？',
    titleEn: 'How do you view "Second Classroom" and moral education credits?',
    desc: '请选择更接近你真实倾向的一项。',
    descEn: 'Choose the option closest to your true preference.',
    weight: 1.0,
    options: [
      { label: '要有制度，量化考核才公平', labelEn: 'Must have a system; quantified assessment is fair', score: { order: 2 } },
      { label: '本质是育人，立德树人才是核心', labelEn: 'Essentially about education — nurturing character is the core', score: { ideology: 2, emotion: 1 } },
      { label: '别搞形式主义，务实点', labelEn: 'Skip the formalism, be pragmatic', score: { conflict: 2, logic: 1 } },
      { label: '给足自主空间，让学生自己长', labelEn: 'Give enough autonomy for students to grow on their own', score: { logic: 2, mobilization: 1 } }
    ]
  },
  {
    id: 'q10', type: 'single', kicker: '单选题', kickerEn: 'Single',
    title: '组织一次校庆活动，你更看重：',
    titleEn: 'For organizing a university anniversary event, you value most:',
    desc: '请选择更接近你真实倾向的一项。',
    descEn: 'Choose the option closest to your true preference.',
    weight: 1.0,
    options: [
      { label: '执行到位、场面震撼', labelEn: 'Flawless execution, stunning spectacle', score: { force: 2, order: 1 } },
      { label: '全员参与，把师生调动起来', labelEn: 'Full participation, mobilize students and faculty', score: { mobilization: 2, emotion: 1 } },
      { label: '有创意、有话题，出圈传播', labelEn: 'Creative, trending, viral impact', score: { conflict: 2, development: 1 } },
      { label: '流程规范、不出差错', labelEn: 'Standard processes, error-free', score: { order: 2, logic: 1 } }
    ]
  },
  {
    id: 'q11', type: 'likert', kicker: '场景题', kickerEn: 'Scenario',
    title: '"我愿意为集体目标承担高强度任务。"',
    titleEn: '"I am willing to take on high-intensity tasks for collective goals."',
    desc: '请选择符合程度。',
    descEn: 'Choose your level of agreement.',
    weight: 1.0,
    scores: [{ force: -2, emotion: 1 }, { force: -1 }, {}, { force: 1, development: 1 }, { force: 2, development: 2 }]
  },
  {
    id: 'q12', type: 'single', kicker: '单选题', kickerEn: 'Single',
    title: '社团换届，你更倾向自己：',
    titleEn: 'For club leadership transition, you prefer to:',
    desc: '请选择更接近你真实倾向的一项。',
    descEn: 'Choose the option closest to your true preference.',
    weight: 1.0,
    options: [
      { label: '继续留任，把盘子稳住', labelEn: 'Stay in office to keep things stable', score: { power: 2, order: 1 } },
      { label: '主动让贤，培养新人', labelEn: 'Step aside, nurture newcomers', score: { emotion: 2, mobilization: 1 } },
      { label: '换一种方式继续参与', labelEn: 'Continue participating in a different way', score: { logic: 2, conflict: 1 } },
      { label: '交给机制，谁上都是传承', labelEn: 'Leave it to the system — whoever takes over carries on', score: { order: 2, ideology: 1 } }
    ]
  },
  {
    id: 'q13', type: 'likert', kicker: '场景题', kickerEn: 'Scenario',
    title: '"我喜欢制定清晰的长期计划，并按部就班推进。"',
    titleEn: '"I like to create clear long-term plans and advance step by step."',
    desc: '请选择符合程度。',
    descEn: 'Choose your level of agreement.',
    weight: 1.0,
    scores: [{ logic: -2, order: -1 }, { logic: -1 }, {}, { logic: 1, order: 1 }, { logic: 2, order: 2 }]
  },
  {
    id: 'q14', type: 'single', kicker: '单选题', kickerEn: 'Single',
    title: '舍友半夜 emo 找你倾诉，你会：',
    titleEn: 'Your roommate comes to you late at night feeling down — you would:',
    desc: '请选择更接近你真实倾向的一项。',
    descEn: 'Choose the option closest to your true preference.',
    weight: 1.2,
    options: [
      { label: '先耐心听，共情TA的情绪', labelEn: 'Listen patiently, empathize with their feelings', score: { emotion: 2, mobilization: 1 } },
      { label: '听完理性给建议，帮TA分析', labelEn: 'Listen, then give rational advice to help them analyze', score: { logic: 2 } },
      { label: '给TA些实际帮助，做点实事', labelEn: 'Offer practical help, do something concrete', score: { order: 1, development: 1 } },
      { label: '拉上别的舍友一起陪TA', labelEn: 'Get other roommates to keep them company', score: { mobilization: 2, emotion: 1 } }
    ]
  },
  {
    id: 'q15', type: 'single', kicker: '单选题', kickerEn: 'Single',
    title: '你觉得大学最该把人培养成什么样？',
    titleEn: 'What should a university cultivate its students to become?',
    desc: '请选择最接近你真实倾向的一项。',
    descEn: 'Choose the option closest to your true preference.',
    weight: 1.2,
    options: [
      { label: '能立身做人的合格公民', labelEn: 'Competent citizens who can stand on their own', score: { ideology: 2, emotion: 1 } },
      { label: '有竞争力、能独立生活的毕业生', labelEn: 'Competitive graduates who can live independently', score: { development: 2, order: 1 } },
      { label: '有独立思考与批判精神的人', labelEn: 'Independent thinkers with critical spirit', score: { logic: 2 } },
      { label: '心怀家国、愿意服务社会的人', labelEn: 'Patriotic individuals willing to serve society', score: { ideology: 2, mobilization: 1 } }
    ]
  },
  {
    id: 'q16', type: 'single', kicker: '单选题', kickerEn: 'Single',
    title: '组织一次班级活动，你更看重：',
    titleEn: 'For organizing a class activity, you value most:',
    desc: '请选择最接近你真实倾向的一项。',
    descEn: 'Choose the option closest to your true preference.',
    weight: 1.0,
    options: [
      { label: '大家玩得开心、人人参与', labelEn: 'Everyone has fun, full participation', score: { mobilization: 2, emotion: 1 } },
      { label: '流程规范、安全不出岔子', labelEn: 'Standard processes, safe and smooth', score: { order: 2, logic: 1 } },
      { label: '办出影响力，最好出圈', labelEn: 'Create impact, ideally go viral', score: { development: 2, conflict: 1 } },
      { label: '自己牵头，办得漂亮利落', labelEn: 'Take the lead and execute beautifully', score: { power: 2, force: 1 } }
    ]
  },
  {
    id: 'q17', type: 'single', kicker: '单选题', kickerEn: 'Single',
    title: '想让一群人愿意跟着你干一件事，你更信哪招？',
    titleEn: 'To get a group to follow you, which approach do you trust most?',
    desc: '请选择最接近你真实倾向的一项。',
    descEn: 'Choose the option closest to your true preference.',
    weight: 1.2,
    options: [
      { label: '把大家情绪点燃，一起冲', labelEn: 'Ignite everyone\'s emotions and charge together', score: { mobilization: 2, emotion: 1 } },
      { label: '把目标、分工、奖励定清楚', labelEn: 'Clearly define goals, tasks, and rewards', score: { order: 2, development: 1 } },
      { label: '自己先干出成绩，用结果带人', labelEn: 'Achieve results first yourself, lead by example', score: { force: 2, power: 1 } },
      { label: '讲清楚这件事的意义和价值', labelEn: 'Clearly explain the significance and value of the task', score: { ideology: 2, emotion: 1 } }
    ]
  },
  {
    id: 'q18', type: 'single', kicker: '单选题', kickerEn: 'Single',
    title: '社团招新，你觉得最有效的是：',
    titleEn: 'For club recruitment, what do you think is most effective?',
    desc: '请选择最接近你真实倾向的一项。',
    descEn: 'Choose the option closest to your true preference.',
    weight: 1.0,
    options: [
      { label: '靠有创意的活动把人吸引来', labelEn: 'Attract people with creative activities', score: { mobilization: 2, emotion: 1 } },
      { label: '靠人脉和资源把场子撑起来', labelEn: 'Use connections and resources to build momentum', score: { power: 2 } },
      { label: '靠清晰的分工和招新计划', labelEn: 'Rely on clear task division and recruitment plan', score: { logic: 2, order: 1 } },
      { label: '靠口碑和氛围慢慢积累', labelEn: 'Build reputation and atmosphere gradually', score: { order: 1, ideology: 2 } }
    ]
  }
]

export const shareLine = (leader, lang) => {
  if (lang === 'en') return `I matched with ${leader.name} — ${leader.bioEn} Come take the test too!`
  return `我测出来最像${leader.name} —— ${leader.bio} 你也来测测看？`
}

export const BIAS = [1.0523, -0.1361, 0.4643, -0.5259, -0.4065, -0.0058, -0.4023, 0.0427, 0.0967, -0.1794]
