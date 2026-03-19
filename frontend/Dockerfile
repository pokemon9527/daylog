# 前端 Dockerfile - 多阶段构建
# 阶段 1: 构建 React 应用
FROM docker.1ms.run/library/node:20-alpine AS builder

WORKDIR /app

# 先复制依赖文件，利用 Docker 缓存
COPY package.json package-lock.json ./
RUN npm ci

# 复制源码并构建
COPY . .
RUN npm run build

# 阶段 2: Nginx 托管静态文件
FROM docker.1ms.run/library/nginx:1.27-alpine

# 复制自定义 Nginx 配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 从构建阶段复制产物
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
