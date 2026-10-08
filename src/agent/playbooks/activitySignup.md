# activitySignup · 活动报名

> 意图：`活动报名/报名活动/有什么活动/讲座/招新` → `wf.activitySignup`（写操作需确认）

## 步骤
1. `activities.upcoming` 取未过期；有关键词则标题+主办+标签过滤
2. 首个报名（`signupLocal` 幂等）+ 写入日程（`qdu_agent_schedule`，from=activity）
3. 结果卡：报名状态 + 名额余量 + [看我的日程] [全部活动→jobs 应用活动 tab]

## 断言
- 重复报名返回“已报过”，不写第二条日程
- 无匹配关键词时不过滤、直接列近期活动
