// 食堂数据：官方名单与营业时间据后勤管理处「饮食服务」（houqin.qdu.edu.cn/fwzn/ysfw.htm，21个食堂：基本伙12+风味9）
// 特色档口/招牌菜据青岛大学采购中心「学生食堂特色品牌档口物资采购项目」（2026）与观海新闻等公开报道整理
// people 为实时在座人数，待摄像头数据接入后由 /api/canteen 返回。
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

export const campusMap = {
  '浮山校区': 'Fushan',
  '金家岭校区': 'Jinjialing',
  '松山校区': 'Songshan'
}

export const areaMap = {
  '西院': 'West',
  '东院': 'East',
  '北院': 'North',
  '浮山苑': 'Fushan Garden',
  '浮山公寓': 'Fushan Dorm'
}

export const canteens = [
  { name: '仁园餐厅', nameEn: 'Renyuan Canteen', campus: '浮山校区', area: '西院', dept: '膳食一部', type: 'basic', seats: 2324, note: '始建于1986年 · 山东省高校星级食堂', noteEn: 'Established in 1986 · Star-rated canteen in Shandong', foods: ['自选菜', '烤鸭饭', '麻辣烫', '麻辣香锅', '甜品面包', '馄饨炉包', '羊肉汤', '湘菜小炒', '二楼小阿傣米线', '二楼11号烤盘饭', '四食堂牛肉汤', '四食堂黄焖鸡', '五食堂粗粮捞面', '盖饭套餐', '小炒肉面', '枣庄辣子鸡', '炒年糕', '水饺'], foodsEn: ['Buffet', 'Roast duck rice', 'Malatang', 'Mala Xiang Guo', 'Dessert & bread', 'Wonton & baked buns', 'Lamb soup', 'Hunan stir-fry', 'Dai rice noodles', 'Tray-baked rice', 'Beef soup', 'Braised chicken', 'Whole grain noodles', 'Rice set meals', 'Stir-fried pork noodles', 'Spicy chicken', 'Stir-fried rice cake', 'Dumplings'] },
  { name: '国际餐厅', nameEn: 'International Canteen', campus: '浮山校区', area: '西院', dept: '膳食一部', type: 'basic', foods: ['煎饼果子', '蒸鸡蛋羹', '冒菜', '脆皮鸡拌饭', '自选窗口'], foodsEn: ['Jianbing crepe', 'Steamed egg', 'Maocai', 'Crispy chicken rice', 'Buffet'] },
  { name: '文化名人餐厅', nameEn: 'Celebrity Canteen', campus: '浮山校区', area: '东院', dept: '膳食二部', type: 'basic', foods: ['自选菜', '砂锅', '特色窗口'], foodsEn: ['Buffet', 'Clay pot', 'Specialty counter'] },
  { name: '滢园餐厅', nameEn: 'Yingyuan Canteen', campus: '浮山校区', area: '东院', dept: '膳食二部', type: 'basic', note: '含清真窗口', noteEn: 'Halal window available', foods: ['麦多馅饼', '鸭血粉丝汤', '老北京爆肚', '烤鸭拌饭', '重庆小面', '一食堂辣椒炒肉', '一食堂螺蛳粉', '二食堂轻食简餐', '水饺'], foodsEn: ['Stuffed pancake', 'Duck blood soup', 'Beijing tripe', 'Roast duck rice', 'Chongqing noodles', 'Stir-fried chili pork', 'Luosifen noodles', 'Light meals', 'Dumplings'] },
  { name: '莘园餐厅', nameEn: 'Xinyuan Canteen', campus: '浮山校区', area: '东院', dept: '膳食二部', type: 'basic', foods: ['酸菜肥牛', '鸡排咖喱饭', '馄饨', '烤肠炸鸡', '一食堂炸鸡汉堡', '二食堂烤鸭饭', '二食堂牛肉饭', '三食堂大姨馄饨', '水饺'], foodsEn: ['Sauerkraut beef', 'Chicken curry rice', 'Wonton', 'Sausage & fried chicken', 'Fried chicken burger', 'Roast duck rice', 'Beef rice', 'Homestyle wonton', 'Dumplings'] },
  { name: '泓园餐厅', nameEn: 'Hongyuan Canteen', campus: '浮山校区', area: '东院', dept: '膳食二部', type: 'basic', foods: ['一楼1234号快餐档口', '八宝饭', '特色窗口'], foodsEn: ['Fast food counters 1-4', 'Eight-treasure rice', 'Specialty counter'] },
  { name: '浩园餐厅', nameEn: 'Haoyuan Canteen', campus: '浮山校区', area: '浮山苑', dept: '膳食二部', type: 'basic', foods: ['炸刀鱼', '宫保鸡丁', '黄焖鸡', '尖椒肉丝', '红烧狮子头', '干煸鸡块', '一食堂掉渣饼', '一食堂牛肉面', '一食堂水饺', '二食堂牛肉饭'], foodsEn: ['Fried hairtail', 'Kung Pao chicken', 'Braised chicken', 'Chili shredded pork', 'Braised lion head', 'Dry-fried chicken', 'Crispy flatbread', 'Beef noodles', 'Dumplings', 'Beef rice'] },
  { name: '浏园餐厅', nameEn: 'Liuyuan Canteen', campus: '浮山校区', area: '北院（师范学院）', dept: '膳食二部', type: 'basic', foods: ['掉渣饼', '麻辣烫', '水吧', '花式面点'], foodsEn: ['Crispy flatbread', 'Malatang', 'Drink bar', 'Fancy pastries'] },
  { name: '浮山公寓餐厅', nameEn: 'Fushan Dorm Canteen', campus: '浮山校区', area: '浮山公寓', dept: '膳食二部', type: 'basic', foods: ['水饺', '大众窗口'], foodsEn: ['Dumplings', 'Regular counter'] },
  { name: '第一餐厅', nameEn: 'Canteen No.1', campus: '金家岭校区', area: '东院（水上餐厅）', dept: '膳食三部', type: 'basic', foods: ['自选菜', '五谷粥', '鸡排饭', '热干面', '牛肉汤', '烤肉拌饭', '一食堂水饺', '一食堂米线', '一食堂麻辣烫', '一食堂咖喱饭', '一食堂重庆小面', '二食堂轻食简餐', '三食堂吊炉烤肉', '三食堂骨汤面', '三食堂滑蛋饭', '汤圆'], foodsEn: ['Buffet', 'Five-grain porridge', 'Chicken steak rice', 'Hot dry noodles', 'Beef soup', 'Grilled meat rice', 'Dumplings', 'Rice noodles', 'Malatang', 'Curry rice', 'Chongqing noodles', 'Light meals', 'Roasted meat', 'Bone broth noodles', 'Egg rice', 'Tangyuan'] },
  { name: '第二餐厅', nameEn: 'Canteen No.2', campus: '金家岭校区', area: '西院', dept: '膳食三部', type: 'basic', foods: ['石锅拌饭', '麻辣香锅', '油条', '特色焖锅', '酸菜鱼', '酸辣粉', '牛肉饭', '烤盘饭', '包子粥馅料', '水饺'], foodsEn: ['Stone pot bibimbap', 'Mala Xiang Guo', 'Fried dough sticks', 'Braised pot', 'Sauerkraut fish', 'Hot & sour noodles', 'Beef rice', 'Tray-baked rice', 'Steamed buns & porridge', 'Dumplings'] },
  { name: '第三餐厅', nameEn: 'Canteen No.3', campus: '金家岭校区', area: '西院（民族）', dept: '膳食三部', type: 'flavor', note: '民族食堂', noteEn: 'Ethnic canteen', foods: ['新疆烤馕', '自选菜', '早餐', '八宝饭', '酒酿圆子', '水饺'], foodsEn: ['Xinjiang naan', 'Buffet', 'Breakfast', 'Eight-treasure rice', 'Fermented rice balls', 'Dumplings'] },
  { name: '第四餐厅', nameEn: 'Canteen No.4', campus: '金家岭校区', area: '东院', dept: '膳食三部', type: 'basic', foods: ['酱香鸭', '香酥鸭', '三杯鸡', '咖喱鸡', '炸鸡汉堡', '牛肉盖浇饭', '螺蛳粉', '包子粥馅饼', '汤圆'], foodsEn: ['Braised duck', 'Crispy duck', 'Three-cup chicken', 'Curry chicken', 'Fried chicken burger', 'Beef rice', 'Luosifen noodles', 'Steamed buns & porridge', 'Tangyuan'] },
  { name: '松山餐厅', nameEn: 'Songshan Canteen', campus: '松山校区', area: '松山校区', dept: '膳食一部', type: 'basic', foods: ['大众窗口', '特色档口', '水饺'], foodsEn: ['Regular counter', 'Specialty counter', 'Dumplings'] },
  { name: '滢园民族餐厅', nameEn: 'Yingyuan Ethnic Canteen', campus: '浮山校区', area: '东院', dept: '膳食二部', type: 'flavor', note: '民族风味', noteEn: 'Ethnic cuisine', foods: ['汉堡炸鸡', '超级牛堡', '经典鱼堡', '幸运咖饮品', '水果捞'], foodsEn: ['Burger & fried chicken', 'Super beef burger', 'Classic fish burger', 'Lucky Coffee drinks', 'Fresh fruit bowl'] },
]