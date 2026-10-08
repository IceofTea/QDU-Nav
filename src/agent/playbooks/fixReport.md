# fixReport · 宿舍报修

> 意图：`报修/宿舍坏了/灯坏了/修东西` → `wf.fixReport`（写操作需确认）

## 步骤
1. 槽位：地点（`extractPlace`）+ 事项（`extractKeyword`）；无报修关键词抛 CLARIFY 追问
2. 网关 `/api/feedback` kind=fix 上报；失败则本机工单（`qdu_fix_orders`，50 条上限）
3. 结果卡：内容/地点/通道三行 + [去墙搜同类报修]

## 断言
- “你好”类无报修词输入必进澄清，不建空工单
- 紧急事项 note 必须提示打后勤电话
