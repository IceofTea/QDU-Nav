# 客户端上架部署清单 · QDU-Nav

> 双端源码已就绪（`app-uniapp/` iOS、`mp-weixin/` 微信小程序）。客户端数据全部内置，**无任何网络请求**——上架最省事的一款。

## 一、微信小程序（约 10 分钟）

1. [mp.weixin.qq.com](https://mp.weixin.qq.com) 注册小程序 → 拿 **AppID**。
2. `mp-weixin/project.config.json` 换 AppID → 开发者工具导入 `mp-weixin/` 预览。
3. **域名配置：无需配置**（应用数据内置、外部链接走复制而非请求）。
4. 上传 → 版本管理提审。类目建议「教育 > 教育信息服务」。

## 二、iOS App（uni-app）

**路线 A · 零成本**：H5 发行 + 「添加到主屏幕」（详见 FJNU-Nav 仓 DEPLOY.md 同款说明）。

**路线 B · 正式 ipa**：Apple 开发者账号 $99/年 → p12 + 描述文件 → `manifest.json` 填 DCloud appid → HBuilderX 云打包。

## 三、后端（可选，默认关闭）

`backend-options/` 四套方案（GitHub文件/CF KV/LeanCloud/PocketBase）代码已内置，按各自 README 启用。

---
*客户端基建记录见 `AGENTS.md` 更新日志 2026-11-09 条目。*
