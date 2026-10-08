# 部署手册 · 社区网关 + 三站上线

> 原则：**纯静态零成本可用**（GitHub Pages），网关按需自托管（评论跨用户共享 /
> 校园墙全员可见 / 云脑代理）。两层可独立存在——没网关一切功能仍可单机跑。

## A. 纯静态层（已有能力，零运维）

| 站 | 托管 | 构建 |
|---|---|---|
| QDU-Nav | GitHub Pages | `npm run build` → `dist/` 上传（Actions 自动化见 `.github/workflows`） |
| QDU-Wiki | GitHub Pages | `py -m mkdocs gh-deploy --force`（CI 亦然） |
| FJNU-Nav | GitHub Pages | 同 QDU-Nav |

静态模式下：导航/课表/智能体本地识别/知识库问答全部可用；
评论与校园墙自动降级 🟡 本机模式（localStorage），UI 明示不撒谎。

## B. 社区网关（可选升级 · 一个 Node 进程）

```bash
node server/index.mjs            # 默认 8787；FJNU 版改用 PORT=8788
PORT=8788 node server/index.mjs  # 指定端口
ADMIN_TOKEN=<强口令> node server/index.mjs   # 管理台口令（生产必改）
```

### B1. pm2（推荐 · 开机自启 + 崩溃拉起）

```bash
npm i -g pm2
ADMIN_TOKEN=my-strong-token pm2 start server/index.mjs --name qdu-community
pm2 save && pm2 startup         # 生成 systemd/开机任务
pm2 logs qdu-community
```

### B2. systemd（Linux 服务器）

```ini
# /etc/systemd/system/qdu-community.service
[Unit]
Description=QDU Community Gateway
After=network.target
[Service]
WorkingDirectory=/opt/qdu-nav
Environment=ADMIN_TOKEN=my-strong-token
Environment=PORT=8787
ExecStart=/usr/bin/node server/index.mjs
Restart=always
User=www-data
[Install]
WantedBy=multi-user.target
```
`systemctl enable --now qdu-community`

### B3. 内网穿透（无服务器演示）

`cloudflared tunnel` / `frp` / `natapp` 将 8787 映射公网，
把地址填进 Wiki 的 `comments.js` 顶部 `CONFIG_API`（或部署时注入
`window.QDU_AGENT_API`），即完成"静态站 + 跨用户评论"组合。

## C. 接入清单

1. **Wiki 评论**：`docs/javascripts/comments.js` 的 `CONFIG_API = '<网关地址>'`
   → 推送后 CI 自动构建；本地开发留空即自动连 `http://localhost:8787`。
2. **管理台**：`https://<网关>/admin`（或 `/console`、`/.g/9f3a`；站内暗门
   导航连点 Logo×3、Wiki 连点评论徽章×5）。上线后**第一件事改 ADMIN_TOKEN**。
3. **云脑**：管理台「🧠 云脑」填 OpenAI 兼容 baseUrl + Key → ⚡测试连接。
   Key 只存网关 `server/data/community.json`（gitignore，切勿提交）。
4. **反向代理**（Nginx 示意）：

```nginx
server {
  server_name community.example.edu.cn;
  location / {
    proxy_pass http://127.0.0.1:8787;
    proxy_set_header X-Real-IP $remote_addr;   # 限流与投票防重按 IP
  }
}
```

## D. 数据备份与迁移

- 数据全在 `server/data/community.json`（评论/帖子/词库/反馈/审计/云脑配置）。
- 备份 = 复制该文件；恢复 = 放回重启。原子写保证任意时刻文件完整。
- 迁移到数据库期：按 `src/wall/config.js` 的 `API_CONTRACT` 实现后端，
  前端与本文件的接入方式**零改动**。

## E. 验收（部署后必跑）

```bash
node scripts/smoke-community.mjs https://<网关域名>   # 18 PASS
# 浏览器：Wiki 页评论横幅应为 🟢 服务器模式
# 浏览器：校园墙状态条应为 🟢 已连接
```
