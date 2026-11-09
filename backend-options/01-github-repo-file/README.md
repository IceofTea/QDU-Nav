# 方案 01：GitHub 仓内 JSON 文件

**价格**：完全免费。动态文档存 `data/dynamic/*.json`：读走 jsDelivr/raw，写走 Contents API（PAT）或网页编辑。

## 启用

```js
import { configure, pull, push } from '../backend-options/shared/cloud-sync.js';
configure({ type: 'github', repo: 'IceofTea/QDU-Nav', branch: 'main', dir: 'data/dynamic' });
const doc = await pull('announcements');
// 管理端写（PAT 只存本机 localStorage）：
configure({ type:'github', repo:'IceofTea/QDU-Nav', token: localStorage.nav_gh_token });
await push('announcements', data);
```

无 token 兜底：复制 JSON → `https://github.com/IceofTea/QDU-Nav/edit/main/data/dynamic/announcements.json` 粘贴提交。

- 读公开、写由仓库 ACL 强制；小程序侧只读（request 域名加 `cdn.jsdelivr.net`）
- jsDelivr 分钟级缓存；并发写无乐观锁，单人运营足够
