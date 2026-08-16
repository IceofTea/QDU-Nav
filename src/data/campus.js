export const campuses = [
  {
    name: '浮山校区',
    alias: '主校区',
    address: '青岛市市南区宁夏路 308 号',
    postal: '266061',
    desc: '主校区（原中心校区），大部分学院在此报到',
    emoji: '🏢',
    links: [
      { label: '教学楼与教室', app: 'classroomNav' },
      { label: '课程表', app: 'timetable' },
      { label: '食堂', app: 'canteen' }
    ],
    colleges: ['马克思主义学院', '历史学院', '教育科学学院', '体育学院', '数学与统计学院', '化学化工学院', '生命科学学院', '机电工程学院', '自动化学院', '电子信息学院', '纺织服装学院', '青岛医学院', '艺术学院', '德雷克联合学院']
  },
  {
    name: '金家岭校区',
    alias: '大一新生集中校区',
    address: '崂山区科大支路 62 号（西院）/ 松岭路 93 号（东院）',
    postal: '266061',
    desc: '原东校区，大一新生集中校区',
    emoji: '🎓',
    links: [
      { label: '教学楼与教室', app: 'classroomNav' },
      { label: '食堂', app: 'canteen' },
      { label: '今天吃什么', app: 'whatToEat' }
    ],
    colleges: ['经济学院', '法学院', '政治与公共管理学院', '文学与新闻传播学院', '外语学院', '物理科学学院', '材料科学与工程学院', '电气工程学院', '计算机科学技术学院', '环境与地理科学学院', '商学院']
  },
  {
    name: '松山校区',
    alias: '医学部',
    address: '市北区登州路 38 号',
    postal: '266021',
    desc: '医学部校区',
    emoji: '🏥',
    links: [{ label: '教学楼与教室', app: 'classroomNav' }],
    colleges: ['基础医学院', '口腔医学院', '公共卫生学院', '药学院', '护理学院']
  }
]

export const collegeCampusMap = [
  { college: '马克思主义学院', campus: '浮山校区', major: '思想政治教育、马克思主义理论' },
  { college: '历史学院', campus: '浮山校区', major: '历史学（师范类/普通类）' },
  { college: '教育科学学院', campus: '浮山校区', major: '小学教育、学前教育、人工智能教育、应用心理学' },
  { college: '体育学院', campus: '浮山校区', major: '体育教育' },
  { college: '数学与统计学院', campus: '浮山校区', major: '数学与应用数学、应用统计学等' },
  { college: '化学化工学院', campus: '浮山校区', major: '应用化学、化学工程与工艺、化学（师范）等' },
  { college: '生命科学学院', campus: '浮山校区', major: '生物技术、食品科学与工程' },
  { college: '机电工程学院', campus: '浮山校区', major: '机械工程、智能制造工程、测控技术与仪器等' },
  { college: '自动化学院', campus: '浮山校区', major: '自动化、机器人工程' },
  { college: '电子信息学院', campus: '浮山校区', major: '电子信息工程、通信工程、微电子、集成电路等' },
  { college: '纺织服装学院', campus: '浮山校区', major: '纺织工程、轻化工程、服装设计等' },
  { college: '青岛医学院', campus: '浮山校区', major: '临床医学、口腔医学、医学检验、药学、护理学等' },
  { college: '艺术学院', campus: '浮山校区', major: '音乐学、音乐表演、舞蹈学、绘画、环境设计、视觉传达设计' },
  { college: '德雷克联合学院', campus: '浮山校区', major: '计算机科学与技术（中外合办）、生物技术（中外合办）' },
  { college: '经济学院', campus: '金家岭校区', major: '经济学、金融学、财政学、经济统计学、国际经济与贸易' },
  { college: '法学院', campus: '金家岭校区', major: '法学、法学（涉外法治卓越创新班）' },
  { college: '政治与公共管理学院', campus: '金家岭校区', major: '行政管理、国际政治' },
  { college: '文学与新闻传播学院', campus: '金家岭校区', major: '汉语言文学、新闻学、广播电视编导等' },
  { college: '外语学院', campus: '金家岭校区', major: '英语、日语、德语、朝鲜语、法语、西班牙语等' },
  { college: '物理科学学院', campus: '金家岭校区', major: '应用物理学、光电信息科学与工程、新能源等' },
  { college: '材料科学与工程学院', campus: '金家岭校区', major: '高分子材料、复合材料、智能材料与结构' },
  { college: '电气工程学院', campus: '金家岭校区', major: '电气工程及其自动化' },
  { college: '计算机科学技术学院', campus: '金家岭校区（大一）', major: '大二统一搬至浮山校区' },
  { college: '环境与地理科学学院', campus: '金家岭校区', major: '环境科学与工程' },
  { college: '商学院', campus: '金家岭校区', major: '工商管理、会计学、旅游管理、标准化工程等' }
]

export const landmarks = [
  { name: '学生事务大厅', place: '浮山校区博文楼一楼大厅 / 金家岭校区办公楼一楼大厅右侧' },
  { name: '保卫处', place: '浮山校区慎行楼一楼 / 金家岭校区办公楼一楼左侧' },
  { name: '学生社区服务中心', place: '浮山校区笃行楼四楼' },
  { name: '教务处', place: '浮山校区办公楼一楼' }
]