# 社区网关 + 静态站一体镜像（QDU-Nav / FJNU-Nav 通用，PORT 由平台注入）
# 构建：docker build -t campus-nav .
# 本地跑：docker run -p 8787:8787 -e ADMIN_TOKEN=xxx -v navdata:/app/server/data campus-nav
FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build
ENV HOST=0.0.0.0
EXPOSE 8787
CMD ["node", "server/index.mjs"]
