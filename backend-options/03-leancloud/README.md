# 方案 03：LeanCloud（国内直达）

**价格**：开发版免费（3 万 API/天）。**国内**：✅ 免梯子。

1. leancloud.cn 建应用 → 记 AppID/AppKey/REST 域名
2. 建 Class `DynDoc`：`key`(String) / `data`(Object)；Class 权限读=所有、写收紧
3. 接入：
   ```js
   configure({ type:'leancloud', base:'https://xxx.lc-cn-n1-shared.com', appId:'…', appKey:'…', class:'DynDoc' });
   await pull('announcements');
   ```

⚠️ AppKey 进前端即公开——写务必在 LeanCloud 侧 ACL 收紧或只走控制台/服务端。
