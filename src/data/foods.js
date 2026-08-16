// 菜品/档口库：由 src/data/canteens.js 的真实档口与招牌菜派生（来源：后勤采购公告、观海新闻等公开报道）
// 不含价格/热量等未经证实数据。
import { canteens } from './canteens'

export const halls = canteens.map((c) => ({ name: c.name, campus: c.campus, zone: c.area }))

export const foods = []
for (const c of canteens) {
  for (const f of c.foods) {
    foods.push({ name: f, hall: c.name, campus: c.campus, zone: c.area, tag: c.type === 'basic' ? '大众窗口' : '风味档口' })
  }
}

export function pickFoods(count = 3) {
  const pool = [...foods]
  const picks = []
  while (picks.length < count && pool.length) {
    const i = Math.floor(Math.random() * pool.length)
    picks.push(pool.splice(i, 1)[0])
  }
  return picks
}