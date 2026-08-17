/**
 * Vite 构建配置
 * ---------------------------------------------------------------------------
 * base 用相对路径 './'：产物可部署在任意子路径（GH Pages /QDU-Nav/ 等），
 * 配合 Hash 路由（src/router.js）无需额外配置。
 * server.proxy 将开发时的 /api 请求转发到本地网关（server/index.mjs, 8787）。
 */
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  base: './',
  server: {
    proxy: {
      '/api': 'http://localhost:8787'
    }
  }
})