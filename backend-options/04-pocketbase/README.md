# 方案 04：PocketBase + 免费 VPS

**价格**：Oracle Always Free ARM（0 元/月）。要账号体系/管理后台时选它。

```bash
./pocketbase serve --http 0.0.0.0:8090   # systemd + Caddy 反代 HTTPS
```

Collection `dyn_docs`：`key`(text,unique) / `data`(json)；规则 list/view=`""`，写=`@request.auth.id != ""`。

```js
configure({ type:'pocketbase', base:'https://pb.example.com', collection:'dyn_docs' });
await pull('announcements');
```
