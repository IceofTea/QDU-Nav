// 食堂数据：来源青岛大学后勤管理处「饮食服务」栏目（houqin.qdu.edu.cn/fwzn/ysfw.htm）
// 现有食堂 21 个（基本伙 12 + 风味 9）。people 为实时空座人数，待摄像头数据接入后由 /api/canteen 返回。
export const canteenStats = {
  total: 21,
  basic: 12,
  flavor: 9,
  basicHours: '6:30—8:30 / 10:30—13:00 / 16:30—18:30',
  flavorHours: '6:30—21:30（全天候不间断供餐）',
  hotline: '85951342（饮食服务中心）',
  depts: [
    { name: '膳食一部', area: '浮山校区西院 · 松山校区', phone: '85951314' },
    { name: '膳食二部', area: '浮山校区东院', phone: '85953959' },
    { name: '膳食三部', area: '金家岭校区', phone: '85958003' },
  ],
}

export const canteens = [
  { name: '仁园餐厅', campus: '浮山校区', area: '西院', dept: '膳食一部', seats: 2324, people: null, note: '始建于1986年，山东省高校星级食堂，餐位2324个' },
  { name: '国际餐厅', campus: '浮山校区', area: '西院', dept: '膳食一部', seats: null, people: null, note: '' },
  { name: '文化名人餐厅', campus: '浮山校区', area: '东院', dept: '膳食二部', seats: null, people: null, note: '' },
  { name: '滢园餐厅', campus: '浮山校区', area: '东院', dept: '膳食二部', seats: null, people: null, note: '含清真窗口' },
  { name: '莘园餐厅', campus: '浮山校区', area: '东院', dept: '膳食二部', seats: null, people: null, note: '' },
  { name: '泓园餐厅', campus: '浮山校区', area: '东院', dept: '膳食二部', seats: null, people: null, note: '' },
  { name: '浩园餐厅', campus: '浮山校区', area: '浮山苑', dept: '膳食二部', seats: null, people: null, note: '' },
  { name: '浏园餐厅', campus: '浮山校区', area: '北院（师范学院）', dept: '膳食二部', seats: null, people: null, note: '' },
  { name: '浮山公寓餐厅', campus: '浮山校区', area: '浮山公寓', dept: '膳食二部', seats: null, people: null, note: '' },
  { name: '第一餐厅', campus: '金家岭校区', area: '东院（水上餐厅）', dept: '膳食三部', seats: null, people: null, note: '' },
  { name: '第二餐厅', campus: '金家岭校区', area: '西院', dept: '膳食三部', seats: null, people: null, note: '' },
  { name: '第三餐厅', campus: '金家岭校区', area: '西院（民族）', dept: '膳食三部', seats: null, people: null, note: '民族食堂' },
  { name: '第四餐厅', campus: '金家岭校区', area: '东院', dept: '膳食三部', seats: null, people: null, note: '' },
  { name: '松山餐厅', campus: '松山校区', area: '松山校区', dept: '膳食一部', seats: null, people: null, note: '' },
]
