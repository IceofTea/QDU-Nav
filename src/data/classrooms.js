// 楼宇与教室分布为社区整理，以校园实地标识为准；官方楼名参考智慧校园公告与招办公告
// 金家岭西院教学楼官方名称「1号教学楼」；东院教学楼官方名称「品正楼/敏正楼/行正楼」
export const buildings = [
  {
    name: '博文楼',
    campus: '浮山校区',
    zone: '西院',
    desc: '浮山西院主要教学楼，学生事务大厅在一楼，可办各类事务',
    mapUrl: 'https://www.amap.com/search?query=%E9%9D%92%E5%B2%9B%E5%A4%A7%E5%AD%A6%E6%B5%AE%E5%B1%B1%E6%A0%A1%E5%8C%BA%E5%8D%9A%E6%96%87%E6%A5%BC',
    nearby: ['学生事务大厅', '青大园超市', '仁园餐厅'],
    route: [
      '从浮山校区正门（宁夏路 308 号）进入，沿主路直行约 200 米',
      '仁园餐厅在右手边，青大园超市在其对面',
      '穿过超市旁的道路继续直行 100 米即达博文楼',
      '一楼大厅为学生事务大厅，办事请从正门进入'
    ],
    floors: [
      { floor: '1F', rooms: ['101', '102', '103', '104', '105', '112', '大厅'] },
      { floor: '2F', rooms: ['201', '202', '203', '204', '205', '208'] },
      { floor: '3F', rooms: ['301', '302', '303', '304', '305', '306', '310'] },
      { floor: '4F', rooms: ['401', '402', '403', '404', '405', '408'] }
    ]
  },
  {
    name: '慎行楼',
    campus: '浮山校区',
    zone: '西院',
    desc: '浮山西院主要教学楼，外语课多在此上课',
    mapUrl: 'https://www.amap.com/search?query=%E9%9D%92%E5%B2%9B%E5%A4%A7%E5%AD%A6%E6%B5%AE%E5%B1%B1%E6%A0%A1%E5%8C%BA%E6%85%8E%E8%A1%8C%E6%A5%BC',
    nearby: ['西院田径场', '汇园餐厅'],
    route: [
      '从浮山校区正门沿主路直行约 250 米',
      '左前方可见西院田径场',
      '田径场旁的教学楼即慎行楼',
      '外语课程一般安排在 2-3 层，从大厅乘电梯或走楼梯即可'
    ],
    floors: [
      { floor: '1F', rooms: ['101', '102', '103', '104', '118'] },
      { floor: '2F', rooms: ['201', '202', '203', '204', '205', '206'] },
      { floor: '3F', rooms: ['301', '302', '303', '304', '305'] }
    ]
  },
  {
    name: '笃行楼',
    campus: '浮山校区',
    zone: '西院',
    desc: '工科课程与机房集中地，学生社区服务中心在四楼',
    mapUrl: 'https://www.amap.com/search?query=%E9%9D%92%E5%B2%9B%E5%A4%A7%E5%AD%A6%E6%B5%AE%E5%B1%B1%E6%A0%A1%E5%8C%BA%E7%AC%83%E8%A1%8C%E6%A5%BC',
    nearby: ['学生社区服务中心', '大学生活动中心'],
    route: [
      '从浮山校区正门沿主路直行约 200 米',
      '在博文楼路口右转',
      '直行约 150 米，右前方即笃行楼',
      '机房与工科实验室多在 3-4 层，学生社区服务中心在四楼'
    ],
    floors: [
      { floor: '1F', rooms: ['101', '102'] },
      { floor: '2F', rooms: ['201', '202', '203'] },
      { floor: '3F', rooms: ['301', '302', '303', '305', '306'] },
      { floor: '4F', rooms: ['401', '402', '403', '404', '405', '408'] }
    ]
  },
  {
    name: '博知楼',
    campus: '浮山校区',
    zone: '西院',
    desc: '计算机科学技术学院所在地',
    mapUrl: 'https://www.amap.com/search?query=%E9%9D%92%E5%B2%9B%E5%A4%A7%E5%AD%A6%E6%B5%AE%E5%B1%B1%E6%A0%A1%E5%8C%BA%E5%8D%9A%E7%9F%A5%E6%A5%BC',
    nearby: ['仁园餐厅', '博文楼'],
    route: [
      '从浮山校区正门沿主路直行约 300 米',
      '经过博文楼后继续前行',
      '仁园餐厅东南方向即为博知楼',
      '学院办公室与实验室分布在楼内各层'
    ],
    floors: [
      { floor: '1F', rooms: ['101', '102', '103'] },
      { floor: '2F', rooms: ['201', '202', '203', '205'] },
      { floor: '3F', rooms: ['301', '302', '303', '305', '306'] },
      { floor: '4F', rooms: ['401', '402', '403'] },
      { floor: '5F', rooms: ['501', '502', '503', '505', '510'] }
    ]
  },
  {
    name: '博远楼',
    campus: '浮山校区',
    zone: '西院',
    desc: '电气工程学院等工科学院所在地',
    mapUrl: 'https://www.amap.com/search?query=%E9%9D%92%E5%B2%9B%E5%A4%A7%E5%AD%A6%E6%B5%AE%E5%B1%B1%E6%A0%A1%E5%8C%BA%E5%8D%9A%E8%BF%9C%E6%A5%BC',
    nearby: ['博知楼', '笃行楼'],
    route: [
      '从浮山校区正门沿主路直行约 350 米',
      '博知楼继续向南约 100 米',
      '右前方灰白色教学楼即博远楼',
      '电气工程学院办公室在四楼'
    ],
    floors: [
      { floor: '1F', rooms: ['101', '102', '103'] },
      { floor: '2F', rooms: ['201', '202', '203', '205'] },
      { floor: '3F', rooms: ['301', '302', '303'] },
      { floor: '4F', rooms: ['401', '402', '403', '405'] }
    ]
  },
  {
    name: '办公楼',
    campus: '浮山校区',
    zone: '西院',
    desc: '学校机关办公区，教务处等在此',
    mapUrl: 'https://www.amap.com/search?query=%E9%9D%92%E5%B2%9B%E5%A4%A7%E5%AD%A6%E6%B5%AE%E5%B1%B1%E6%A0%A1%E5%8C%BA%E5%8A%9E%E5%85%AC%E6%A5%BC',
    nearby: ['仁园餐厅', '博文楼'],
    route: [
      '从浮山校区正门沿主路直行约 150 米',
      '右手边即为办公楼',
      '教务处位于一楼，请从大厅进入'
    ],
    floors: [
      { floor: '1F', rooms: ['教务处', '学生事务窗口'] },
      { floor: '2F', rooms: ['机关办公室'] }
    ]
  },
  {
    name: '滢园教学楼',
    campus: '浮山校区',
    zone: '东院',
    desc: '浮山东院教学区，紧邻滢园宿舍',
    mapUrl: 'https://www.amap.com/search?query=%E9%9D%92%E5%B2%9B%E5%A4%A7%E5%AD%A6%E6%B5%AE%E5%B1%B1%E6%A0%A1%E5%8C%BA%E6%BB%A2%E5%9B%AD',
    nearby: ['滢园餐厅', '滢园宿舍', '东院澡堂'],
    route: [
      '从浮山校区北门（东院入口）进入',
      '沿校内道路直行约 200 米',
      '滢园餐厅旁即滢园教学楼',
      '楼下设有澡堂，教室集中在 1-3 层'
    ],
    floors: [
      { floor: '1F', rooms: ['101', '102', '103', '104'] },
      { floor: '2F', rooms: ['201', '202', '203', '204'] },
      { floor: '3F', rooms: ['301', '302', '303', '304'] }
    ]
  },
  {
    name: '汇园教学楼',
    campus: '浮山校区',
    zone: '西院',
    desc: '浮山西院汇园宿舍区旁的教学楼',
    mapUrl: 'https://www.amap.com/search?query=%E9%9D%92%E5%B2%9B%E5%A4%A7%E5%AD%A6%E6%B5%AE%E5%B1%B1%E6%A0%A1%E5%8C%BA%E6%B1%87%E5%9B%AD',
    nearby: ['汇园餐厅', '汇园宿舍'],
    route: [
      '从浮山校区正门沿主路直行约 400 米',
      '左转进入汇园宿舍区方向',
      '汇园餐厅东侧即为汇园教学楼'
    ],
    floors: [
      { floor: '1F', rooms: ['101', '102', '103'] },
      { floor: '2F', rooms: ['201', '202', '203'] },
      { floor: '3F', rooms: ['301', '302', '303'] }
    ]
  },
  {
    name: '1号教学楼',
    campus: '金家岭校区',
    zone: '西院',
    desc: '金家岭西院主教学楼（官方名称：1 号教学楼）',
    mapUrl: 'https://www.amap.com/search?query=%E9%9D%92%E5%B2%9B%E5%A4%A7%E5%AD%A6%E9%87%91%E5%AE%B6%E5%B2%AD%E6%A0%A1%E5%8C%BA%E8%A5%BF%E9%99%A21%E5%8F%B7%E6%95%99%E5%AD%A6%E6%A5%BC',
    nearby: ['第二餐厅', '剑湖', '西院浴室'],
    route: [
      '从金家岭校区西院南门（科大支路 62 号）进入',
      '沿主路直行约 150 米',
      '左手边即 1 号教学楼',
      '第二餐厅在楼东侧，剑湖在校园中心'
    ],
    floors: [
      { floor: '1F', rooms: ['101', '102', '103', '112', '117', '118'] },
      { floor: '2F', rooms: ['201', '202', '203', '205', '206', '208'] },
      { floor: '3F', rooms: ['301', '302', '303', '305', '306', '308', '310'] }
    ]
  },
  {
    name: '实验楼',
    campus: '金家岭校区',
    zone: '西院',
    desc: '金家岭实验教学集中区（官方名称：实验楼），多为机房与实训教室',
    mapUrl: 'https://www.amap.com/search?query=%E9%9D%92%E5%B2%9B%E5%A4%A7%E5%AD%A6%E9%87%91%E5%AE%B6%E5%B2%AD%E6%A0%A1%E5%8C%BA%E5%AE%9E%E9%AA%8C%E6%A5%BC',
    nearby: ['第二餐厅', '剑湖'],
    route: [
      '从金家岭校区西院南门进入',
      '直行约 200 米后右转',
      '剑湖西北侧即实验楼'
    ],
    floors: [
      { floor: '1F', rooms: ['101', '102'] },
      { floor: '2F', rooms: ['201', '202', '203', '205'] },
      { floor: '3F', rooms: ['301', '302', '303', '304'] },
      { floor: '4F', rooms: ['401', '402', '403', '410'] }
    ]
  },
  {
    name: '品正楼',
    campus: '金家岭校区',
    zone: '东院',
    desc: '金家岭东院教学楼（官方名称：品正楼），紧邻图书馆',
    mapUrl: 'https://www.amap.com/search?query=%E9%9D%92%E5%B2%9B%E5%A4%A7%E5%AD%A6%E9%87%91%E5%AE%B6%E5%B2%AD%E6%A0%A1%E5%8C%BA%E5%93%81%E6%AD%A3%E6%A5%BC',
    nearby: ['图书馆', '第一餐厅', '东院运动场'],
    route: [
      '从金家岭校区东院南门（松岭路 93 号）进入',
      '沿主路直行约 150 米',
      '第一餐厅旁即品正楼（教学楼）',
      '东院运动场在楼东侧'
    ],
    floors: [
      { floor: '1F', rooms: ['101', '102', '103'] },
      { floor: '2F', rooms: ['201', '202', '203', '204', '205', '206', '208'] },
      { floor: '3F', rooms: ['301', '302', '303', '305', '306', '308', '310'] }
    ]
  },
  {
    name: '敏正楼',
    campus: '金家岭校区',
    zone: '东院',
    desc: '金家岭东院办公与教学楼，出国留学培训基地在 107 室',
    mapUrl: 'https://www.amap.com/search?query=%E9%9D%92%E5%B2%9B%E5%A4%A7%E5%AD%A6%E9%87%91%E5%AE%B6%E5%B2%AD%E6%A0%A1%E5%8C%BA%E6%95%8F%E6%AD%A3%E6%A5%BC',
    nearby: ['品正楼', '图书馆', '第一餐厅'],
    route: [
      '从金家岭校区东院南门（松岭路 93 号）进入',
      '沿主路直行约 120 米',
      '第一餐厅旁即敏正楼',
      '出国留学培训基地在 107 室'
    ],
    floors: [
      { floor: '1F', rooms: ['107（留学培训基地）'] },
      { floor: '2F', rooms: ['办公区'] }
    ]
  },
  {
    name: '行正楼',
    campus: '金家岭校区',
    zone: '东院',
    desc: '金家岭东院教学楼，招生办公在 202 室',
    mapUrl: 'https://www.amap.com/search?query=%E9%9D%92%E5%B2%9B%E5%A4%A7%E5%AD%A6%E9%87%91%E5%AE%B6%E5%B2%AD%E6%A0%A1%E5%8C%BA%E8%A1%8C%E6%AD%A3%E6%A5%BC',
    nearby: ['品正楼', '敏正楼', '图书馆'],
    route: [
      '从金家岭校区东院南门进入',
      '沿主路直行约 180 米',
      '品正楼旁即行正楼',
      '招生办公在 202 室'
    ],
    floors: [
      { floor: '2F', rooms: ['202（招生办公）'] }
    ]
  },
  {
    name: '办公楼',
    campus: '金家岭校区',
    zone: '东院',
    desc: '金家岭校区学生事务大厅与保卫处在一楼',
    mapUrl: 'https://www.amap.com/search?query=%E9%9D%92%E5%B2%9B%E5%A4%A7%E5%AD%A6%E9%87%91%E5%AE%B6%E5%B2%AD%E6%A0%A1%E5%8C%BA%E5%8A%9E%E5%85%AC%E6%A5%BC',
    nearby: ['学生事务大厅', '保卫处', '第一餐厅'],
    route: [
      '从金家岭校区东院南门进入',
      '直行约 100 米',
      '第一餐厅斜对面即办公楼',
      '学生事务大厅与保卫处在一楼左侧'
    ],
    floors: [
      { floor: '1F', rooms: ['学生事务大厅', '保卫处'] }
    ]
  },
  {
    name: '浩园教学楼',
    campus: '松山校区',
    zone: '',
    desc: '医学部（青岛医学院）教学与办公区',
    mapUrl: 'https://www.amap.com/search?query=%E9%9D%92%E5%B2%9B%E5%A4%A7%E5%AD%A6%E6%9D%BE%E5%B1%B1%E6%A0%A1%E5%8C%BA%E6%B5%A9%E5%9B%AD',
    nearby: ['医学教育综合楼', '田径场'],
    route: [
      '松山校区位于市北区登州路 38 号',
      '从校门进入后直行',
      '浩园医学教育综合楼在校园中部',
      '医学部教务与实验多在此片区'
    ],
    floors: [
      { floor: '1F', rooms: ['101', '102', '103', '104'] },
      { floor: '2F', rooms: ['201', '202', '203', '204', '205', '206'] },
      { floor: '3F', rooms: ['301', '302', '303', '305', '306'] }
    ]
  }
]

export const campusFilters = ['全部', '浮山校区', '金家岭校区', '松山校区']

export function searchRooms(keyword) {
  const k = keyword.trim()
  return buildings.filter((b) => {
    if (!k) return true
    const kw = k.replace(/\s/g, '')
    const hitName = b.name.replace(/\s/g, '').includes(kw)
    const hitCampus = b.campus.includes(k)
    const hitZone = b.zone.includes(k)
    const hitNearby = b.nearby.some((n) => n.includes(k))
    const hitRoom = b.floors.some((f) => f.rooms.some((r) => r.includes(k)))
    return hitName || hitCampus || hitZone || hitNearby || hitRoom
  })
}