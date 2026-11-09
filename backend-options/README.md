# QDU-Nav 后端备选方案（预置 · 未启用）

> 本站当前是纯前端 + GitHub Pages + `public/data/` 快照（Actions 每 6h 抓取），**保持现状即可**。
> 本目录为「将来需要动态后端时直接取用」的备选方案，**全部默认关闭**。

## 统一抽象

动态数据抽象为一组 JSON 文档：`announcements`（公告）、`featured`（推荐位）、
`tips`（运营小贴士）、`links-extra`（补充链接）。

```js
pull(key)          // → { data, rev } | null
push(key, data)    // → boolean（仅运营者持写凭据）
```

- `shared/cloud-sync.js` —— Web / uni-app 通用（ESM，fetch）
- `shared/cloud-sync.mp.js` —— 微信小程序专用（CJS，wx.request）

## 方案矩阵

| # | 方案 | 免费额度 | 国内可达 | 适用 |
| --- | --- | --- | --- | --- |
| 01 | GitHub 仓内 JSON 文件 | 完全免费 | ⚠️ 写需代理，jsDelivr 读 | 低频更新，零新基建 |
| 02 | Cloudflare Workers + KV | 10万请求/日 | ✅ 多数可通 | 公告/推荐位实时读写 |
| 03 | LeanCloud | 开发版免费 | ✅ 直达 | 控制台 + 国内稳定 |
| 04 | PocketBase + Oracle VPS | 永久免费 ARM | ✅ 自建 | 账号体系/真数据库 |

## 权限模型

- 读公开，写仅运营者（token 存本机/CI Secret，**不进代码、不进小程序包**）
- 小程序端默认只读
- 启用时选方案 → 按子目录 README 部署 → `configure()` 填 endpoint → 页面 pull 合并
