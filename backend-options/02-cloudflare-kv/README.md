# 方案 02：Cloudflare Workers + KV

**价格**：免费档 10 万请求/天、KV 1GB——零成本。
**国内**：`*.workers.dev` 多数可通，可绑自有域。

```bash
cd backend-options/02-cloudflare-kv
npx wrangler login && npx wrangler kv namespace create NAV_DOCS   # id 填 wrangler.toml
npx wrangler secret put WRITE_TOKEN && npx wrangler deploy
```

```js
configure({ type:'cfkv', base:'https://qdu-nav-docs.<sub>.workers.dev' });
await pull('announcements');                       // 全员读
configure({ ... , token: localStorage.nav_write_token });  // 管理端写
await push('announcements', data);
```

写由 `X-Write-Token` 服务端校验；小程序 request 域名加 workers.dev 子域。
