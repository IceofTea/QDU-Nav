<script setup>
/** 贡献者墙：词云式展示项目贡献者，点击跳转 GitHub 主页
 *  社区代码贡献（含已合入的 Pull Request）都会在此致谢。 */
import { reactive } from 'vue'
import { contributors } from '../data/contributors'

const emit = defineEmits(['back'])

/** GitHub 头像直链（公开头像无需 API key），避免 github.com 302 链路波动 */
function avatarOf(c) {
  return `https://avatars.githubusercontent.com/${c.login}?size=96`
}

const broken = reactive(new Set())
function markBroken(c) {
  broken.add(c.login)
}

function fontOf(w) {
  return 18 + Math.round(w * 14)
}

function hueOf(i) {
  return 200 + i * 60
}
</script>

<template>
  <div class="view-top">
    <button class="back-btn" @click="emit('back')">← 返回首页</button>
    <div class="view-title">贡献者墙</div>
    <div class="view-sub">感谢每一位让 QDU 校园导航变得更好的人</div>
  </div>

  <div class="panel" style="margin-bottom:16px;">
    <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
      <span style="font-size:30px;">🏆</span>
      <div style="flex:1;min-width:200px;">
        <div style="font-weight:700;font-size:14px;">本项目由开源社区共同维护</div>
        <div class="muted" style="font-size:12px;margin-top:2px;">
          除了数据抓取机器人，站点代码的每一次改进都来自真实的人类贡献者 —— 点击名字可跳转 GitHub 主页。
        </div>
      </div>
    </div>
  </div>

  <div class="cloud panel">
    <a
      v-for="(c, i) in contributors"
      :key="c.name"
      class="cloud-item"
      :href="c.url"
      target="_blank"
      rel="noopener"
      :style="{ fontSize: fontOf(c.weight) + 'px', '--hue': hueOf(i) }"
    >
      <img
        v-if="c.login && !broken.has(c.login)"
        class="cloud-avatar"
        :src="avatarOf(c)"
        alt=""
        referrerpolicy="no-referrer"
        @error="markBroken(c)"
      />
      <span v-else class="cloud-emoji">{{ c.emoji }}</span>
      <span class="cloud-name">{{ c.name }}</span>
      <span class="cloud-role">{{ c.role }}</span>
    </a>
  </div>

  <div class="panel" style="margin-top:16px;">
    <div class="section-title" style="margin:0 0 10px;"><span class="bar"></span>社区贡献记录</div>
    <ul class="changelog">
      <li><b>v1.1.0</b> — 数据链路附带列、贴吧舆情、官网分类等多项功能迭代。</li>
      <li><b>v1.1.1</b> — 社区 PR #1（huanuyn）：修复课程接口解析路径、美食轮盘指针偏差。</li>
      <li><b>v1.2.0</b> — 课程表分页、数据洞察分布科学化、奖学金金额校准、贡献者墙上线。</li>
      <li><b>v1.2.1–v1.2.10</b> — 系列维护迭代：数据洞察与课表性能、贴吧舆情图表化、校园邮箱、官网改造等。</li>
      <li><b>v1.3.0</b> — 本站舆情：多维访问统计可视化。</li>
      <li><b>v1.3.1</b> — 校领导测试：35 题多维比对。</li>
      <li><b>v1.3.2</b> — 深色模式全面修复 + 系列 Bug 修复。</li>
      <li><b>v1.3.3</b> — 代码质量加固：真实 Bug 修复、公共组件抽取、tieba 对齐手机版。</li>
      <li><b>v1.3.4</b> — 独立访客统计修正：UV 去重改访客 ID。</li>
      <li><b>v1.3.5–v1.3.7</b> — 生活费全面升级：微信/支付宝/建行账单导入、模拟三合一、批量记账、成就墙与彩蛋、默哀模式、专业版。</li>
      <li><b>v1.3.8–v1.3.11</b> — 专业版图表、数据/舆情统计页、工具与分类、饼图与折线展示体系优化。</li>
      <li><b>v1.3.12</b> — 收支分析增强：结余负半轴、收入构成/收入商户、明细大分类、Excel 分析导出、建行导入增强。</li>

    </ul>
    <p class="muted" style="font-size:12px;margin-top:10px;">
      每个版本的完整改动清单见 <a href="https://github.com/IceofTea/QDU-Nav/blob/main/README.md" target="_blank" rel="noopener">README 版本历史</a>。
    </p>
    <p class="muted" style="font-size:12px;margin-top:6px;">
      想加入贡献者墙？给
      <a href="https://github.com/IceofTea/QDU-Nav" target="_blank" rel="noopener">QDU-Nav</a>
      提 Pull Request，被合入后你的名字就会出现在这里。
    </p>
  </div>
</template>

<style scoped>
.cloud {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: 14px;
  padding: 28px 16px;
  min-height: 220px;
}
.cloud-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  max-width: 250px;
  padding: 14px 16px 12px;
  border-radius: 16px;
  color: #fff;
  text-decoration: none;
  background: linear-gradient(135deg, hsl(var(--hue) 65% 45%), hsl(calc(var(--hue) + 30) 65% 60%));
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.14);
  transition: transform 0.18s ease, box-shadow 0.18s ease;
  text-align: center;
}
.cloud-item:hover {
  transform: translateY(-4px) scale(1.05);
  box-shadow: 0 12px 26px rgba(0, 0, 0, 0.2);
}
.cloud-avatar {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.75);
  object-fit: cover;
  flex: none;
}
.cloud-emoji { font-size: 26px; }
.cloud-name {
  font-weight: 800;
  font-size: 15px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}
.cloud-role {
  font-size: 11px;
  opacity: 0.95;
  line-height: 1.5;
  white-space: normal;
  max-width: 220px;
  word-break: break-word;
}
.changelog {
  margin: 0;
  padding-left: 20px;
  font-size: 13px;
  line-height: 1.8;
  color: var(--text);
}
.changelog a {
  color: var(--primary, #1b66c9);
}
</style>