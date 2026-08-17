/** 体测评分标准静态数据：权重 / 单项评分表 / 等级区间（来源《国家学生体质健康标准》） */
export const itemWeights = {
  bmi: 0.15,
  vitalCapacity: 0.15,
  sprint50: 0.2,
  sitReach: 0.1,
  longJump: 0.1,
  strength: 0.1,
  endurance: 0.2
}

export const itemLabels = {
  bmi: 'BMI',
  vitalCapacity: '肺活量',
  sprint50: '50 米跑',
  sitReach: '坐位体前屈',
  longJump: '立定跳远',
  strength: '力量项目',
  endurance: '耐力跑'
}

export const standards = {
  male: {
    bmi: { normal: [17.9, 23.9], overweight: 24, obese: 28, low: 17.9 },
    vitalCapacity: { unit: 'ml', higher: true, table: [[4800, 100], [4600, 95], [4400, 90], [4200, 85], [4000, 80], [3800, 75], [3600, 70], [3400, 65], [3200, 60], [2900, 50], [2600, 40], [2300, 30], [2000, 20], [1700, 10]] },
    sprint50: { unit: '秒', higher: false, table: [[6.9, 100], [7.0, 95], [7.1, 90], [7.3, 85], [7.5, 80], [7.7, 75], [7.9, 70], [8.1, 65], [8.3, 60], [8.5, 50], [8.7, 40], [8.9, 30], [9.1, 20], [9.3, 10]] },
    sitReach: { unit: 'cm', higher: true, table: [[24.9, 100], [23.1, 95], [21.3, 90], [19.5, 85], [17.7, 80], [15.8, 75], [13.9, 70], [12.0, 65], [10.1, 60], [8.3, 50], [6.5, 40], [4.7, 30], [2.9, 20], [1.1, 10]] },
    longJump: { unit: 'cm', higher: true, table: [[273, 100], [268, 95], [263, 90], [256, 85], [248, 80], [241, 75], [234, 70], [227, 65], [220, 60], [208, 50], [196, 40], [184, 30], [172, 20], [160, 10]] },
    strength: { label: '引体向上', unit: '个', higher: true, table: [[19, 100], [18, 95], [17, 90], [16, 85], [15, 80], [14, 75], [13, 70], [12, 65], [11, 60], [9, 50], [7, 40], [5, 30], [3, 20], [1, 10]] },
    endurance: { label: '1000 米', unit: '分:秒', higher: false, seconds: true, table: [[197, 100], [203, 95], [209, 90], [217, 85], [225, 80], [233, 75], [241, 70], [249, 65], [257, 60], [267, 50], [277, 40], [287, 30], [297, 20], [307, 10]] }
  },
  female: {
    bmi: { normal: [17.2, 23.9], overweight: 24, obese: 28, low: 17.2 },
    vitalCapacity: { unit: 'ml', higher: true, table: [[3350, 100], [3200, 95], [3050, 90], [2900, 85], [2750, 80], [2600, 75], [2450, 70], [2300, 65], [2150, 60], [1950, 50], [1750, 40], [1550, 30], [1350, 20], [1150, 10]] },
    sprint50: { unit: '秒', higher: false, table: [[7.7, 100], [7.8, 95], [7.9, 90], [8.1, 85], [8.3, 80], [8.5, 75], [8.7, 70], [8.9, 65], [9.1, 60], [9.3, 50], [9.5, 40], [9.7, 30], [9.9, 20], [10.1, 10]] },
    sitReach: { unit: 'cm', higher: true, table: [[26.3, 100], [24.4, 95], [22.5, 90], [21.0, 85], [19.4, 80], [17.2, 75], [15.0, 70], [12.8, 65], [10.6, 60], [8.2, 50], [5.8, 40], [3.4, 30], [1.0, 20], [-5, 10]] },
    longJump: { unit: 'cm', higher: true, table: [[207, 100], [201, 95], [195, 90], [188, 85], [181, 80], [175, 75], [169, 70], [163, 65], [157, 60], [149, 50], [141, 40], [133, 30], [125, 20], [117, 10]] },
    strength: { label: '仰卧起坐', unit: '个/分', higher: true, table: [[56, 100], [54, 95], [52, 90], [50, 85], [48, 80], [46, 75], [44, 70], [42, 65], [40, 60], [37, 50], [34, 40], [31, 30], [28, 20], [25, 10]] },
    endurance: { label: '800 米', unit: '分:秒', higher: false, seconds: true, table: [[198, 100], [204, 95], [210, 90], [219, 85], [228, 80], [237, 75], [246, 70], [255, 65], [264, 60], [275, 50], [286, 40], [297, 30], [308, 20], [319, 10]] }
  }
}

export function bmiScore(gender, bmi) {
  const rule = standards[gender].bmi
  if (bmi == null || isNaN(bmi)) return null
  if (bmi >= rule.normal[0] && bmi <= rule.normal[1]) return 100
  if (bmi >= rule.obese) return 60
  if (bmi >= rule.overweight || bmi < rule.low) return 80
  return 60
}

export function itemScore(gender, item, value) {
  if (value == null || value === '' || isNaN(value)) return null
  const st = standards[gender][item]
  const v = Number(value)
  if (st.higher) {
    for (const [min, s] of st.table) if (v >= min) return s
    return 0
  } else {
    for (const [max, s] of st.table) if (v <= max) return s
    return 0
  }
}

export function gradeOf(total) {
  if (total == null) return { label: '—', cls: '' }
  if (total >= 90) return { label: '优秀', cls: 'grade-excellent' }
  if (total >= 80) return { label: '良好', cls: 'grade-good' }
  if (total >= 60) return { label: '及格', cls: 'grade-pass' }
  return { label: '不及格', cls: 'grade-fail' }
}