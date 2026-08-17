export const officialGroups = [
  {
    name: '社区与资源',
    icon: '📚',
    sites: [
      { name: '青大 Wiki', url: 'https://iceoftea.github.io/QDU-Wiki/', desc: '课程笔记 / 考研复试 / 经验文档' },
      { name: '青岛大学吧', url: 'https://tieba.baidu.com/f?kw=%E9%9D%92%E5%B2%9B%E5%A4%A7%E5%AD%A6', desc: '百度贴吧 · 学生社区交流' }
    ]
  },
  {
    name: '信息化与服务',
    icon: '🖥️',
    sites: [
      { name: '网上办事大厅', url: 'https://ehall.qdu.edu.cn', desc: '选课 / 成绩 / 缴费 / 邮箱申请等一站式服务，较重要的校园平台', featured: true },
      { name: '校园邮箱', url: 'https://mail.qdu.edu.cn', desc: '学生邮箱 Webmail · 账号：学号@qdu.edu.cn' },
      { name: '智慧校园与信息化建设中心', url: 'https://nic.qdu.edu.cn', desc: '网络 / 账号 / 智慧校园' }
    ]
  },
  {
    name: '学校主站与新闻',
    icon: '🏛️',
    sites: [
      { name: '青岛大学官网', url: 'https://www.qdu.edu.cn', desc: '学校主站，校情总览' },
      { name: '青大新闻网', url: 'https://news.qdu.edu.cn', desc: '青大要闻与校园动态' }
    ]
  },
  {
    name: '教务与教学',
    icon: '📚',
    sites: [
      { name: '教务处', url: 'https://jwc.qdu.edu.cn', desc: '通知公告 / 校历 / 培养方案' },
      { name: '正方教务系统', url: 'https://jw.qdu.edu.cn', desc: '选课 / 成绩 / 课表查询' },
      { name: '新教务系统', url: 'https://xjw.qdu.edu.cn', desc: '一体化教务服务平台' }
    ]
  },
  {
    name: '招生与研究生',
    icon: '🎓',
    sites: [
      { name: '本科招生网', url: 'https://zs.qdu.edu.cn', desc: '招生简章 / 专业目录 / 录取查询' },
      { name: '研究生院', url: 'https://grad.qdu.edu.cn', desc: '研究生培养与管理' },
      { name: '研究生招生信息网', url: 'https://grad.qdu.edu.cn/yzb/', desc: '研究生招生简章与专业目录' }
    ]
  },
  {
    name: '图书馆与资源',
    icon: '📖',
    sites: [
      { name: '图书馆', url: 'https://lib.qdu.edu.cn', desc: '馆藏检索 / 数据库 / 开馆时间' }
    ]
  },
  {
    name: '官方新媒体',
    icon: '📱',
    sites: [
      { name: '青岛大学官方微博', url: 'https://www.weibo.com/u/5726029829', desc: '官方微博 · 校园动态实时发布' },
      { name: '青岛大学官方微信', url: 'https://mp.weixin.qq.com/s/o6vjr3toGHgJjSUABA26_A', desc: '官方微信公众号 · 深度推文与通知' },
      { name: '青岛大学官方抖音', url: 'https://www.douyin.com/user/MS4wLjABAAAAYfbvDMnY0h8CqJM8vIW2bX7Lq1yCbtBKOSA3iTKj1kY4fOHZtKG3lMWG2tCGqAPP?from_tab_name=main', desc: '官方抖音 · 校园短视频' },
      { name: '青岛大学 B 站', url: 'https://space.bilibili.com/441692154?spm_id_from=333.337.0.0', desc: 'B 站官方账号 · 视频 / 直播 / 校园 Vlog' }
    ]
  },
  {
    name: '国际合作',
    icon: '🌍',
    sites: [
      { name: '国际学生招生', url: 'https://istudy.qdu.edu.cn', desc: '国际学生项目与 FAQ' },
      { name: '国际学生申请系统', url: 'https://admission.qdu.edu.cn', desc: '在线申请 / 录取查询' },
      { name: '国际教育学院', url: 'https://cie.qdu.edu.cn', desc: '国际教育学院官网' },
      { name: '出国留学培训项目', url: 'https://cglx.qdu.edu.cn', desc: '国际本科 / 硕士留学项目' }
    ]
  }
]

/**
 * 学院官网清单
 * 依据青岛大学本科招生信息网「学院专业」整理；category 用于官网页按学科分类展示。
 */
export const colleges = [
  // 理工
  { name: '材料科学与工程学院', url: 'https://clxy.qdu.edu.cn', category: '理工' },
  { name: '电气工程学院', url: 'https://ee.qdu.edu.cn', category: '理工' },
  { name: '电子信息学院', url: 'https://dzxxxy.qdu.edu.cn', category: '理工' },
  { name: '纺织服装学院', url: 'https://ctc.qdu.edu.cn', category: '理工' },
  { name: '化学化工学院', url: 'https://hxhg.qdu.edu.cn', category: '理工' },
  { name: '环境科学与工程学院', url: 'https://env.qdu.edu.cn', category: '理工' },
  { name: '机电工程学院', url: 'https://jdxy.qdu.edu.cn', category: '理工' },
  { name: '计算机科学技术学院', url: 'https://cst.qdu.edu.cn', category: '理工' },
  { name: '生命科学学院', url: 'https://smkx.qdu.edu.cn', category: '理工' },
  { name: '数学与统计学院', url: 'https://maths.qdu.edu.cn', category: '理工' },
  { name: '物理科学学院', url: 'https://physics.qdu.edu.cn', category: '理工' },
  { name: '自动化学院', url: 'https://zdh.qdu.edu.cn', category: '理工' },
  // 人文社科
  { name: '马克思主义学院', url: 'https://szhb.qdu.edu.cn', category: '人文社科' },
  { name: '历史学院', url: 'https://zxls.qdu.edu.cn', category: '人文社科' },
  { name: '法学院', url: 'https://law.qdu.edu.cn', category: '人文社科' },
  { name: '政治与公共管理学院', url: 'https://qdzgxy.qdu.edu.cn', category: '人文社科' },
  { name: '文学与新闻传播学院', url: 'https://ljc.qdu.edu.cn', category: '人文社科' },
  { name: '外语学院', url: 'https://cfl.qdu.edu.cn', category: '人文社科' },
  { name: '经济学院', url: 'https://quec.qdu.edu.cn', category: '人文社科' },
  { name: '商学院', url: 'https://ibc.qdu.edu.cn', category: '人文社科' },
  { name: '师范学院、教师教育学院', url: 'https://sf.qdu.edu.cn', category: '人文社科' },
  { name: '旅游与地理科学学院', url: 'https://tourism.qdu.edu.cn', category: '人文社科' },
  { name: '质量与标准化学院', url: 'https://bzh.qdu.edu.cn', category: '人文社科' },
  // 医学
  { name: '公共卫生学院', url: 'https://ggwsxy.qdu.edu.cn', category: '医学' },
  { name: '护理学院', url: 'https://nursing.qdu.edu.cn', category: '医学' },
  { name: '基础医学院', url: 'https://qdbms.qdu.edu.cn', category: '医学' },
  { name: '口腔医学院', url: 'https://dent.qdu.edu.cn', category: '医学' },
  { name: '药学院', url: 'https://pharma.qdu.edu.cn', category: '医学' },
  { name: '医学部（青岛医学院）', url: 'https://qmc.qdu.edu.cn', category: '医学' },
  // 艺术与体育
  { name: '美术学院', url: 'https://msxy.qdu.edu.cn', category: '艺术与体育' },
  { name: '音乐学院', url: 'https://yyxy.qdu.edu.cn', category: '艺术与体育' },
  { name: '体育学院', url: 'https://ty.qdu.edu.cn', category: '艺术与体育' },
  // 合作办学
  { name: '德雷克联合学院', url: 'https://drake.qdu.edu.cn', category: '合作办学' }
]

export const emergency = {
  campusPolice: '浮山校区保卫处 0532-85951110',
  gatePhone: '金家岭校区 0532-85959870',
  health: '校医院 0532-85951120',
  switchboard: '总机 0532-85951111'
}