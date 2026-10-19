<script setup>
/** 贡献者墙：词云式展示项目贡献者，点击跳转 GitHub 主页
 *  社区代码贡献（含已合入的 Pull Request）都会在此致谢。 */
import { reactive, ref, computed } from 'vue'
import { contributors } from '../data/contributors.js'
import { useI18n } from '../i18n/index.js'

const { t, lang } = useI18n()

const emit = defineEmits(['back'])

/** 版本编年史（数据化渲染：v=版本 tag=里程碑标 d=日期 t=中文 te=英文；按 semver 降序，8 条/页） */
const CHANGELOG = [
  {"v":"v1.7.15","d":"2026-10-20","t":"版本历史规范化：编年史迁移为数据数组（版本号/日期/「大版本」徽标），semver 降序、8 条/页分页；公告中心补齐大版本与重点更新说明；修复分类页应用名被挤压隐藏（补上缺失的标题容器），移动端改为两列竖版卡片。","te":"Changelog normalized into a data array with dates and milestone badges, semver-sorted with 8-per-page pagination; announcements backfilled for major releases; fixed category tiles hiding app names."},
  {"v":"v1.7.14","d":"2026-10-20","t":"夜间模式徽标修正：底色与边框压暗，品牌字切换鎏金（替代上一版整底换金的方案）。"},
  {"v":"v1.7.13","d":"2026-10-20","t":"修复左上角品牌徽标点击不回首页（内联处理漏写调用括号）；徽标改版为深蓝底白字，夜间模式自动切换鎏金配色。"},
  {"v":"v1.7.12","d":"2026-10-20","t":"首页减负：首页网格只留实用功能并按日频排序，换校向导/移植/演示向页面沉入分类最底「关于」组（搜索仍可达）。"},
  {"v":"v1.7.11","d":"2026-10-19","t":"Agent 新工具：内联计算器（纯算式直出结果）、「帮我做决定」随机抽选、相对时间快速提醒入提醒中心；Ctrl+K/Alt+A 全局唤起；番茄钟/绩点直达意图。"},
  {"v":"v1.7.10","d":"2026-10-18","t":"Agent 智能升级：复合指令拆句执行、时段感知建议、近似意图「猜你想说」、未命中话术本机看板；本地存储键统一中立命名自动迁移。"},
  {"v":"v1.7.1","d":"2026-10-15","t":"备份与恢复：记账数据可导出 JSON 自行保管、清缓存/换设备后导入恢复（追加去重 + 整体替换双模式）；新增预算页真机冒烟 12 项与部署前端单测门禁。"},
  {"v":"v1.7.0","d":"2026-10-15","t":"生活费预算引擎：新增共享统计内核（稳健月均 / 剔除进行中当月 + 跑量外推 / 加权分类占比 / 样本置信度 / 趋势预测 / 订阅体检 / 占比一键配平）；账单导入扩展银行通用流水与独立收入词表。"},
  {"v":"v1.6.21","d":"2026-10-15","t":"账单导入修复：pdfjs 改为按需加载 + 同版本本地 worker，Budget 分包 599KB→127KB。"},
  {"v":"v1.6.20","d":"2026-10-12","t":"冗余精简：徽章计数单一化为前端直连 GitHub，删除网关 gh-count 死路径。"},
  {"v":"v1.6.19","d":"2026-10-12","t":"gh-count 全网评论计数端点：Wiki 徽章显示 GitHub 评论数（本地评论未上线不再显 0）。"},
  {"v":"v1.6.18","d":"2026-10-12","t":"GitHub 评论敏感词巡检：管理员一键扫 Discussions 最新内容命中站内词表，直达处置。"},
  {"v":"v1.6.17","d":"2026-10-11","t":"评论网关：管理员删除评论多级子孙收敛加固（孙级楼中楼不再悬空）。"},
  {"v":"v1.6.16","d":"2026-10-11","t":"评论网关：删除自己的评论 owner 鉴权 API + GET 防盗删过滤（配套 Wiki 评论增强）。"},
  {"v":"v1.6.15","d":"2026-10-11","t":"视觉走查：私信空态一行/洞察柱防挤出/Wiki 卡按钮一行/顶栏短名（真机截图 22 张肉眼审查）。"},
  {"v":"v1.6.14","d":"2026-10-11","t":"复盘修复：gen_kb_nav 逐行解析加固 + 单测周日边界公式修正（24/0）。"},
  {"v":"v1.6.13","d":"2026-10-10","t":"防复发门禁：kb-nav 新鲜度 + i18n 键对等 + COMMUNITY_DATA 测试隔离 + crosscheck/sync-diff 脚本 + 375 全应用扫描。"},
  {"v":"v1.6.12","d":"2026-10-10","t":"智能体知识库重生成（80→104 条）+ QDU-Wiki kb 交叉审计零失效 + faq 出处页名修正。"},
  {"v":"v1.6.11","d":"2026-10-09","t":"不蒜子第三方实时统计：首页「关于本站」访问统计卡新增 busuanzi 实时行（首页浏览/站点浏览/站点访客），按页面路径独立计数，失败优雅降级。"},
  {"v":"v1.6.10","d":"2026-10-09","t":"i18n/E2E/收尾：姊妹仓全应用注册表英文字段 + 浏览器 E2E 脚本 + 树形回复视图切换 + 多草稿箱 UI + RichEditor 进私信。"},
  {"v":"v1.6.9","d":"2026-10-09","t":"智能体高级感：富文本渲染/语音播报/ICS日历+8新工作流；Wiki知识图谱/纠错看板/阅读包/PWA。"},
  {"v":"v1.6.8","d":"2026-10-09","t":"代码治理：草稿统一/洞察去重/统一出口/测试脚手架统一/审计零告警。"},
  {"v":"v1.6.7","d":"2026-10-09","t":"暗门口令先验后开 + 用户面去管理字样 + 裸解析加固 + 定时器清理。"},
  {"v":"v1.6.6","d":"2026-10-09","t":"管理端入口鉴权修复（/admin 绝对路径改 adminUrl）+ 评论区整容由 Wiki 侧承接。"},
  {"v":"v1.6.5","d":"2026-10-09","t":"Supabase 开箱共享：仓库缺省配置 + 云网并集不断存量 + loadPosts 重构。"},
  {"v":"v1.6.4","d":"2026-10-09","t":"技能数据看板 + 帖子详情抽屉 + 发布完整性门禁进CI + Wiki 死链清零。"},
  {"v":"v1.6.3","d":"2026-10-08","t":"管理端线上可用：/admin 跳转垫片进包 + 云端直连模式（看帖删帖）+ console 垫片。"},
  {"v":"v1.6.2","d":"2026-10-08","t":"全局渲染保险：模板运行时错误显式报错盒，不再静默白屏。","te":"Global render guard: template errors show a message box instead of a blank page."},
  {"v":"v1.6.1","d":"2026-10-08","t":"智能体交互升级：上下文追问、主动问候、打字机回复、专属追问 chips；/admin 跳转垫片。","te":"Smarter agent: context follow-ups, proactive greeting, typewriter replies, per-workflow chips; /admin redirect shim."},
  {"v":"v1.6.0","tag":"大版本","d":"2026-10-08","t":"冲奖大版本：找实习/活动报名/报修三工作流、画像推送、招聘板块、对比/飞轮/移植/画像五应用、AI 评论治理。","te":"National-prize push: 3 new agent workflows, profile push, jobs board, compare/flywheel/transplant/profile apps, AI comment governance."},
  {"v":"v1.5.0","tag":"大版本","d":"2026-10-08","t":"在线化大版本：路由懒加载（首屏 3 倍）、网关地址一键切换、数据管家、私信+番茄钟、SSE 退避、Docker/Render 部署物、E2E 场景包 10/10。","te":"Online-ready: lazy routes (3x first load), API base switch, Data Manager, DM + Focus apps, SSE backoff, Docker/Render deploy, E2E scenes 10/10."},
  {"v":"v1.4.1","d":"2026-10-08","t":"技能市场、信任等级徽章、课表导入器、智能体介绍页、草稿保存、AI 帖子摘要。","te":"Skill market, trust levels & badges, course importer, about-agent page, drafts, AI summary."},
  {"v":"v1.4.0","tag":"大版本","d":"2026-10-08","t":"对话式智能体 × 超级论坛：27 工作流一句话办事、BM25 知识层、12 分区论坛、隐秘管理台。","te":"Conversational agent x super forum: 27 workflows, BM25 knowledge, 12-partition forum, hidden console."},
  {"v":"v1.3.24","d":"2026-10-08","t":"换校 bat 启动器 + 网站工坊：表单编辑、样式实时生效、生成 site.js。","te":"Rebrand .bat launcher + site workshop: form editing, live styles, site.js generator."},
  {"v":"v1.3.23","d":"2026-10-08","t":"BM25 知识层、FAQ 30、四白皮书与 27 剧本、冒烟测试与防卡执行器。","te":"BM25 knowledge layer, FAQ 30, four whitepapers & 27 playbooks, smoke tests."},
  {"v":"v1.3.22","d":"2026-10-08","t":"超级论坛（12 分区/悬赏投票资源/积分广告位）+ 三新应用。","te":"Super forum (12 partitions, bounty/vote/resource, points & ads) + 3 new apps."},
  {"v":"v1.3.21","d":"2026-10-07","t":"智能体 v2（三模式/计划卡/计时/命令面板）+ 社区安全治理。","te":"Agent v2 (3 modes, plan cards, timer, command palette) + community security."},
  {"v":"v1.3.20","d":"2026-10-07","t":"智能体首版：对话入口、40+ 意图、13 工作流、评论网关。","te":"Agent first release: chat entry, 40+ intents, 13 workflows, comment gateway."},
  {"v":"v1.3.19","t":"全站新手引导系统：TourOverlay 覆盖层、19 页步骤、localStorage 记忆。","te":"Site-wide onboarding tour: overlay, 19 pages, localStorage memory."},
  {"v":"v1.3.18","d":"2026-08-25","t":"中英文切换：顶部栏一键切换，首页/校历/分类等核心页面全英文，底部导航同步，模块化 i18n 架构（src/i18n/）。","te":"Bilingual toggle: one-click EN/CN switch, core pages fully translated, modular i18n."},
  {"v":"v1.3.17","d":"2026-08-25","t":"校历原图预览：每学年校历本地预览（按钮/下拉/拖动滑动切换 + 丝滑滑动动画），全屏查看器支持缩放平移与键盘翻页，附 PDF 原件直链。","te":"Calendar preview: local image preview per year, fullscreen viewer with zoom/drag/swipe, PDF link."},
  {"v":"v1.3.16","d":"2026-08-24","t":"全局搜索索引：首页/分类页搜索升级为「应用名 + 别名关键词 + 功能点」三层匹配，支持多词组合与命中标签展示。","te":"Global search index: app name + alias keywords + feature points, multi-word matching."},
  {"v":"v1.3.15","d":"2026-08-22","t":"计数服务降耗（轻量接口/数据瘦身/会话节流）与点赞跨浏览器同步修复。","te":"Counter optimization (lightweight API, throttling) + cross-browser like sync fix."},
  {"v":"v1.3.14","d":"2026-08-19","t":"首页公告（部署与安全说明）、顶部栏移动端适配、点赞交互调整。","te":"Homepage announcements, mobile header fixes, like interaction tweaks."},
  {"v":"v1.3.13","d":"2026-08-19","t":"点赞系统：首页/各应用点赞与计数，同本站舆情计数服务。","te":"Like system: per-app likes with counter service."},
  {"v":"v1.3.12","d":"2026-08-19","t":"收支分析增强：结余负半轴、收入构成/收入商户、明细大分类、Excel 分析导出、建行导入增强。","te":"Enhanced analytics: negative balance axis, income breakdown, Excel export, CCB import."},
  {"v":"v1.3.8","tag":"–v1.3.11","d":"2026-08-19","t":"专业版图表、数据/舆情统计页、工具与分类、饼图与折线展示体系优化。","te":"Pro charts, analytics pages, pie/line display system, tool & category optimization."},
  {"v":"v1.3.5","tag":"–v1.3.7","d":"2026-08-19","t":"生活费全面升级：微信/支付宝/建行账单导入、模拟三合一、批量记账、成就墙与彩蛋、默哀模式、专业版。","te":"Budget upgrade: WeChat/Alipay/CCB import, simulator, achievements, pro version."},
  {"v":"v1.3.4","d":"2026-08-18","t":"独立访客统计修正：UV 去重改访客 ID。","te":"Visitor stats fix: UV dedup via visitor ID."},
  {"v":"v1.3.3","d":"2026-08-18","t":"代码质量加固：真实 Bug 修复、公共组件抽取、tieba 对齐手机版。","te":"Code quality: real bug fixes, shared components, Tieba mobile alignment."},
  {"v":"v1.3.2","d":"2026-08-18","t":"深色模式全面修复 + 系列 Bug 修复。","te":"Dark mode fixes + series bug fixes."},
  {"v":"v1.3.1","d":"2026-08-17","t":"校领导测试：35 题多维比对。","te":"Leader test: 35-question multi-dimensional matching."},
  {"v":"v1.3.0","d":"2026-08-17","t":"本站舆情：多维访问统计可视化。","te":"Site analytics: multi-dimensional visit statistics."},
  {"v":"v1.2.1","tag":"–v1.2.10","d":"2026-08-17","t":"系列维护迭代：数据洞察与课表性能、贴吧舆情图表化、校园邮箱、官网改造等。","te":"Maintenance: insights, timetable perf, Tieba charts, campus email, portal revamp, etc."},
  {"v":"v1.2.0","d":"2026-08-17","t":"课程表分页、数据洞察分布科学化、奖学金金额校准、贡献者墙上线。","te":"Timetable pagination, data insights, scholarship calibration, contributors wall."},
  {"v":"v1.1.1","d":"2026-08-17","t":"社区 PR #1（huanuyn）：修复课程接口解析路径、美食轮盘指针偏差。","te":"Community PR #1 (huanuyn): fix course API path & food wheel pointer."},
  {"v":"v1.1.0","d":"2026-08-17","t":"数据链路附带列、贴吧舆情、官网分类等多项功能迭代。","te":"Data pipeline, Tieba sentiment, college portal grouping, and more."}
]
const LOG_PAGE = 8
const logPageIdx = ref(0)
const logPages = computed(() => Math.ceil(CHANGELOG.length / LOG_PAGE))
const logPage = computed(() => CHANGELOG.slice(logPageIdx.value * LOG_PAGE, (logPageIdx.value + 1) * LOG_PAGE))

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
    <button class="back-btn" @click="emit('back')">{{ t('common.back') }}</button>
    <div class="view-title">{{ t('contributors.title') }}</div>
    <div class="view-sub">{{ t('contributors.subFull') }}</div>
  </div>

  <div class="panel" style="margin-bottom:16px;">
    <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
      <span style="font-size:30px;">🏆</span>
      <div style="flex:1;min-width:200px;">
        <div style="font-weight:700;font-size:14px;">{{ t('contributors.communityTitle') }}</div>
        <div class="muted" style="font-size:12px;margin-top:2px;">
          {{ t('contributors.communityDesc') }}
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
      <span class="cloud-role">{{ lang === 'en' && c.roleEn ? c.roleEn : c.role }}</span>
    </a>
  </div>

  <div class="panel" style="margin-top:16px;">
    <div class="section-title" style="margin:0 0 10px;"><span class="bar"></span>{{ t('contributors.community') }}</div>
    <ul class="changelog">
      <li v-for="e in logPage" :key="e.v">
        <b>{{ e.v }}</b><span v-if="e.tag" class="cl-tag">{{ e.tag }}</span><span v-if="e.d" class="cl-date">{{ e.d }}</span> — {{ lang === 'en' && e.te ? e.te : e.t }}
      </li>
    </ul>
    <div class="cl-pager" v-if="logPages > 1">
      <button type="button" class="cl-btn" :disabled="logPageIdx === 0" @click="logPageIdx--">‹ {{ lang === 'en' ? 'Prev' : '上一页' }}</button>
      <span class="cl-info">{{ logPageIdx + 1 }} / {{ logPages }}</span>
      <button type="button" class="cl-btn" :disabled="logPageIdx >= logPages - 1" @click="logPageIdx++">{{ lang === 'en' ? 'Next' : '下一页' }} ›</button>
    </div>
    <p class="muted" style="font-size:12px;margin-top:10px;">
      {{ t('contributors.fullHistory') }} <a href="https://github.com/IceofTea/QDU-Nav/blob/main/README.md" target="_blank" rel="noopener">{{ t('contributors.fullHistoryEnd') }}</a>。
    </p>
    <p class="muted" style="font-size:12px;margin-top:6px;">
      {{ t('contributors.wantJoin') }}
      <a href="https://github.com/IceofTea/QDU-Nav" target="_blank" rel="noopener">QDU-Nav</a>
      {{ t('contributors.wantJoinEnd') }}
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
.cl-tag {
  display: inline-block;
  margin-left: 6px;
  padding: 0 7px;
  font-size: 10px;
  font-weight: 700;
  border-radius: 999px;
  background: rgba(245, 158, 11, 0.14);
  color: #d97706;
  vertical-align: 1px;
}
.cl-date { margin-left: 8px; font-size: 11px; color: var(--text-sub); }
.cl-pager {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px dashed var(--border);
}
.cl-btn {
  padding: 5px 14px;
  font-size: 12.5px;
  font-weight: 600;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--card, #fff);
  color: var(--primary);
  cursor: pointer;
  font-family: inherit;
}
.cl-btn:disabled { opacity: 0.4; cursor: default; }
.cl-btn:not(:disabled):hover { border-color: var(--primary); }
.cl-info { font-size: 12px; color: var(--text-sub); }
</style>