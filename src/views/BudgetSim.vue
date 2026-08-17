<script setup>
/** 生活费模拟：在青岛一个月多少生活费合适
 *  简单版：按「伙食 / 社交 / 购物」习惯粗估区间；
 *  精细版：按家庭月收入智能推荐区间、各项预算明细、省钱与兼职建议。
 *  区间与建议参考知乎 / 小红书 / 贴吧常见在校生生活成本科普讨论整理，仅供参考。 */
import { ref, computed } from 'vue'

const emit = defineEmits(['back'])

const tab = ref('simple')

/* ---- 简单版：三组生活选项（1 简朴 ~ 3 讲究） ---- */
const meal = ref(2) // 伙食：1 食堂为主 / 2 偶尔外卖 / 3 常点外卖
const social = ref(2) // 社交：1 少 / 2 一般 / 3 活跃
const shop = ref(2) // 购物：1 低 / 2 中 / 3 高
const score = computed(() => meal.value + social.value + shop.value)
const simpleRange = computed(() => {
  if (score.value <= 4) return { lo: 1100, hi: 1500, name: '简朴型', tip: '食堂为主、少社交，够用还能攒下一点' }
  if (score.value <= 6) return { lo: 1400, hi: 1900, name: '标准型', tip: '日常舒适，偶尔改善伙食，大多数同学的档位' }
  if (score.value <= 8) return { lo: 1800, hi: 2400, name: '舒适型', tip: '外卖社交比较自由，注意别月初光月末吃土' }
  return { lo: 2300, hi: 3000, name: '高配型', tip: '生活品质优先，理性消费，别让账单支配人生' }
})

/* ---- 精细版：按家庭月收入推荐 ---- */
const fam = ref(2)
const famLevels = [
  { label: '6000 元以下', lo: 1000, hi: 1400 },
  { label: '6000 – 10000 元', lo: 1200, hi: 1700 },
  { label: '10000 – 15000 元', lo: 1500, hi: 2000 },
  { label: '15000 – 25000 元', lo: 1800, hi: 2500 },
  { label: '25000 元以上', lo: 2200, hi: 3000 }
]
const mid = computed(() => Math.round((famLevels[fam.value].lo + famLevels[fam.value].hi) / 2))
const fineBudget = computed(() => {
  const m = mid.value
  return [
    { name: '🍚 食堂伙食', pct: 45, v: Math.round(m * 0.45) },
    { name: '🍕 外卖 / 聚餐', pct: 10, v: Math.round(m * 0.1) },
    { name: '🍎 水果零食', pct: 8, v: Math.round(m * 0.08) },
    { name: '🚌 交通出行', pct: 5, v: Math.round(m * 0.05) },
    { name: '🧴 日用品 + 话费', pct: 10, v: Math.round(m * 0.1) },
    { name: '📚 学习资料', pct: 5, v: Math.round(m * 0.05) },
    { name: '🎮 娱乐社交', pct: 10, v: Math.round(m * 0.1) },
    { name: '👕 衣帽鞋', pct: 7, v: Math.round(m * 0.07) },
    { name: '🛟 备用金', pct: 5, v: Math.round(m * 0.05) }
  ]
})

const SAVE_TIPS = [
  '🍚 食堂是性价比之王：一份套餐 10-15 元，比外卖省一半，还能避开「满减凑单」套路',
  '🚲 出行用公交 / 共享单车月卡，少打车；校园卡地铁学生优惠别浪费',
  '🛒 日用品趁双 11 / 618 囤，用京东校园价、淘宝学生认证、拼多多百亿补贴比价',
  '📖 教材先问学长学姐二手 / 图书馆借，打印用学校打印室比外面便宜得多',
  '💳 各种会员按需开，视频 / 音乐会员可以拼车或学生价，别一开开一排',
  '⏸ 冲动消费冷静期 24 小时：想买的东西先加入购物车，第二天还想再下单',
  '📝 坚持记账（本应用就能用），月底看「支出构成」，超支项一目了然'
]

const PARTTIME = [
  { name: '校内勤工俭学', tip: '图书馆 / 食堂 / 行政助管，时薪 15-20，安全稳定还能自习', tag: '最稳妥' },
  { name: '家教', tip: '青岛家教行情约 60-150 元/小时，一次 2 小时够一周水果', tag: '性价比高' },
  { name: '助研 / 实验室助理', tip: '跟导师做项目，既能积累经验又有补贴，还能写进简历', tag: '涨履历' },
  { name: '咖啡店 / 餐饮兼职', tip: '时薪 15-25，缺点占时间，适合周末', tag: '灵活' },
  { name: '假期实习 / 竞赛拿奖', tip: '寒暑假实习 + 奖学金（优秀奖学金 1000/600/400·学期），一次顶半年生活费', tag: '收益大' }
]
</script>

<template>
  <div class="view-top">
    <button class="back-btn" @click="emit('back')">← 返回生活费计数器</button>
    <div class="view-title">生活费模拟</div>
    <div class="view-sub">在青岛一个月多少生活费合适？按你的习惯估一估</div>
  </div>

  <div class="panel">
    <div class="seg">
      <button class="seg-btn" :class="{ active: tab === 'simple' }" @click="tab = 'simple'">⚡ 简单版</button>
      <button class="seg-btn" :class="{ active: tab === 'fine' }" @click="tab = 'fine'">🎯 精细版</button>
    </div>
  </div>

  <template v-if="tab === 'simple'">
    <div class="panel">
      <div class="sim-group">
        <div class="sim-label">🍚 伙食习惯</div>
        <div class="sim-opts">
          <button v-for="(o, i) in ['食堂为主', '偶尔外卖', '常点外卖']" :key="o" class="tab" :class="{ active: meal === i + 1 }" @click="meal = i + 1">{{ o }}</button>
        </div>
      </div>
      <div class="sim-group">
        <div class="sim-label">🎉 社交活跃度</div>
        <div class="sim-opts">
          <button v-for="(o, i) in ['独行侠', '一般', '社交达人']" :key="o" class="tab" :class="{ active: social === i + 1 }" @click="social = i + 1">{{ o }}</button>
        </div>
      </div>
      <div class="sim-group">
        <div class="sim-label">🛍️ 购物欲</div>
        <div class="sim-opts">
          <button v-for="(o, i) in ['低', '中', '高']" :key="o" class="tab" :class="{ active: shop === i + 1 }" @click="shop = i + 1">{{ o }}</button>
        </div>
      </div>

      <div class="sim-result">
        <div class="sim-result-label">{{ simpleRange.name }} · 推荐月生活费</div>
        <div class="sim-result-num">¥{{ simpleRange.lo }} ~ {{ simpleRange.hi }}</div>
        <div class="muted" style="font-size:12px;">{{ simpleRange.tip }}</div>
      </div>
    </div>
  </template>

  <template v-else>
    <div class="panel">
      <div class="sim-group">
        <div class="sim-label">🏠 家庭月收入（可选，用于智能推荐）</div>
        <div class="sim-opts" style="flex-wrap:wrap;">
          <button v-for="(f, i) in famLevels" :key="f.label" class="tab" :class="{ active: fam === i }" @click="fam = i">{{ f.label }}</button>
        </div>
      </div>

      <div class="sim-result">
        <div class="sim-result-label">智能推荐月生活费区间</div>
        <div class="sim-result-num">¥{{ famLevels[fam].lo }} ~ {{ famLevels[fam].hi }}</div>
        <div class="muted" style="font-size:12px;">按青岛在校生常见成本测算，可随学期节奏上下浮动 10%</div>
      </div>

      <div class="section-title" style="margin:18px 0 10px;"><span class="bar"></span>各项预算明细（按月 ¥{{ mid }} 估算）</div>
      <div v-for="b in fineBudget" :key="b.name" style="margin-bottom:8px;">
        <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:2px;">
          <span>{{ b.name }}</span><span class="muted">¥{{ b.v }} · {{ b.pct }}%</span>
        </div>
        <div style="background:var(--bar);border-radius:8px;overflow:hidden;">
          <div style="height:12px;background:linear-gradient(90deg,#0d9488,#2dd4bf);border-radius:8px;" :style="{ width: b.pct * 2 + '%' }"></div>
        </div>
      </div>
    </div>

    <div class="panel">
      <div class="section-title" style="margin:0 0 10px;"><span class="bar"></span>💡 省钱小技巧</div>
      <ul style="margin:0;padding-left:18px;font-size:13px;line-height:2;color:var(--text);">
        <li v-for="s in SAVE_TIPS" :key="s">{{ s }}</li>
      </ul>
    </div>

    <div class="panel">
      <div class="section-title" style="margin:0 0 10px;"><span class="bar"></span>💼 兼职怎么找</div>
      <div v-for="p in PARTTIME" :key="p.name" class="pt-row">
        <span class="pt-tag">{{ p.tag }}</span>
        <div>
          <div class="pt-name">{{ p.name }}</div>
          <div class="muted" style="font-size:12px;">{{ p.tip }}</div>
        </div>
      </div>
    </div>
  </template>

  <p class="muted" style="font-size:12px;text-align:center;padding:4px 0 8px;">区间参考知乎 / 小红书 / 贴吧在校生生活成本科普讨论整理，个体差异大，请按实际调整</p>
</template>

<style scoped>
.sim-group { margin-bottom: 16px; }
.sim-label { font-size: 13px; font-weight: 700; margin-bottom: 8px; }
.sim-opts { display: flex; gap: 8px; }
.sim-opts .tab { flex: 1; }
.sim-result {
  margin-top: 6px;
  padding: 16px;
  border-radius: 14px;
  background: linear-gradient(135deg, #0f3d33, #155e54);
  color: #fff;
  text-align: center;
}
.sim-result-label { font-size: 12px; opacity: 0.85; }
.sim-result-num { font-size: 30px; font-weight: 800; margin: 6px 0; }
.sim-result .muted { color: rgba(255, 255, 255, 0.8); }
.pt-row { display: flex; gap: 10px; padding: 9px 0; border-bottom: 1px dashed var(--border); }
.pt-row:last-child { border-bottom: none; }
.pt-tag {
  flex: 0 0 auto;
  align-self: flex-start;
  font-size: 11px;
  font-weight: 700;
  color: #0f766e;
  background: var(--soft-green);
  border-radius: 8px;
  padding: 2px 8px;
}
.pt-name { font-size: 13px; font-weight: 700; }
</style>