export const halls = [
  { name: '仁园餐厅', campus: '浮山校区', note: '西院人气餐厅，周围有篮球场' },
  { name: '滢园餐厅', campus: '浮山校区', note: '东院，靠近滢园宿舍与澡堂' },
  { name: '浏园餐厅', campus: '浮山校区', note: '北院，浏园宿舍区' },
  { name: '泓园餐厅', campus: '浮山校区', note: '西院泓园宿舍区' },
  { name: '汇园餐厅', campus: '浮山校区', note: '西院汇园宿舍南侧' },
  { name: '第一餐厅', campus: '金家岭校区', note: '东院，第一超市旁' },
  { name: '第二餐厅', campus: '金家岭校区', note: '西院，剑湖附近，饭后可绕湖散步' },
  { name: '水上餐厅', campus: '金家岭校区', note: '西院浴室东侧' }
]

export const foods = [
  { name: '鲅鱼水饺', tag: '青岛特色', hall: '浮山·仁园', price: 16, heat: 480 },
  { name: '蛤蜊疙瘩汤', tag: '青岛特色', hall: '浮山·仁园', price: 12, heat: 360 },
  { name: '流亭猪蹄饭', tag: '青岛特色', hall: '浮山·滢园', price: 18, heat: 520 },
  { name: '海菜凉粉', tag: '青岛特色', hall: '浮山·仁园', price: 8, heat: 90 },
  { name: '青岛啤酒鸭套餐', tag: '荤菜', hall: '浮山·仁园', price: 15, heat: 610 },
  { name: '黄焖鸡米饭', tag: '荤菜', hall: '金家岭·一餐', price: 14, heat: 580 },
  { name: '红烧肉套餐', tag: '荤菜', hall: '浮山·泓园', price: 15, heat: 660 },
  { name: '糖醋里脊', tag: '荤菜', hall: '浮山·仁园', price: 12, heat: 540 },
  { name: '宫保鸡丁', tag: '荤菜', hall: '金家岭·二餐', price: 11, heat: 490 },
  { name: '酸菜鱼', tag: '荤菜', hall: '浮山·滢园', price: 18, heat: 520 },
  { name: '水煮肉片', tag: '荤菜', hall: '金家岭·一餐', price: 14, heat: 580 },
  { name: '木须肉', tag: '荤菜', hall: '浮山·仁园', price: 10, heat: 420 },
  { name: '鱼香肉丝', tag: '荤菜', hall: '金家岭·二餐', price: 11, heat: 460 },
  { name: '青椒肉丝盖饭', tag: '盖饭', hall: '浮山·浏园', price: 11, heat: 500 },
  { name: '番茄炒蛋盖饭', tag: '盖饭', hall: '金家岭·一餐', price: 9, heat: 430 },
  { name: '宫保鸡丁盖饭', tag: '盖饭', hall: '金家岭·二餐', price: 11, heat: 490 },
  { name: '鸡腿饭', tag: '盖饭', hall: '浮山·仁园', price: 13, heat: 560 },
  { name: '麻辣香锅', tag: '麻辣', hall: '金家岭·一餐', price: 16, heat: 640 },
  { name: '麻辣烫', tag: '麻辣', hall: '浮山·滢园', price: 15, heat: 550 },
  { name: '兰州拉面', tag: '面食', hall: '金家岭·二餐', price: 12, heat: 480 },
  { name: '刀削面', tag: '面食', hall: '浮山·仁园', price: 11, heat: 470 },
  { name: '炸酱面', tag: '面食', hall: '浮山·汇园', price: 10, heat: 450 },
  { name: '螺蛳粉', tag: '面食', hall: '金家岭·一餐', price: 13, heat: 510 },
  { name: '砂锅土豆粉', tag: '面食', hall: '浮山·泓园', price: 12, heat: 430 },
  { name: '三鲜馄饨', tag: '面食', hall: '浮山·仁园', price: 9, heat: 380 },
  { name: '小笼包', tag: '点心', hall: '金家岭·二餐', price: 7, heat: 320 },
  { name: '肉夹馍', tag: '点心', hall: '浮山·滢园', price: 8, heat: 410 },
  { name: '煎饼果子', tag: '点心', hall: '金家岭·一餐', price: 7, heat: 390 },
  { name: '烤冷面', tag: '点心', hall: '浮山·仁园', price: 8, heat: 400 },
  { name: '石锅拌饭', tag: '韩餐', hall: '金家岭·一餐', price: 14, heat: 560 },
  { name: '蛋炒饭', tag: '简餐', hall: '浮山·仁园', price: 8, heat: 420 },
  { name: '扬州炒饭', tag: '简餐', hall: '金家岭·二餐', price: 10, heat: 470 },
  { name: '皮蛋瘦肉粥', tag: '早晚餐', hall: '浮山·仁园', price: 4, heat: 180 },
  { name: '豆浆油条', tag: '早晚餐', hall: '金家岭·一餐', price: 5, heat: 300 },
  { name: '牛肉面', tag: '面食', hall: '金家岭·二餐', price: 14, heat: 520 },
  { name: '烤肉拌饭', tag: '盖饭', hall: '浮山·仁园', price: 13, heat: 590 },
  { name: '铁板炒饭', tag: '简餐', hall: '金家岭·一餐', price: 11, heat: 520 },
  { name: '蛋包饭', tag: '简餐', hall: '浮山·滢园', price: 12, heat: 540 }
]

export function pickFoods(count = 3) {
  const pool = [...foods]
  const picks = []
  while (picks.length < count && pool.length) {
    const i = Math.floor(Math.random() * pool.length)
    picks.push(pool.splice(i, 1)[0])
  }
  return picks
}