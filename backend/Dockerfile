# 后端 Dockerfile - 多阶段构建
# 阶段 1: 编译 Go 应用
FROM docker.1ms.run/library/golang:1.23-alpine AS builder

WORKDIR /app

# 安装编译依赖
RUN apk add --no-cache git

# 先复制依赖文件，利用 Docker 缓存
COPY go.mod go.sum ./
ENV GOTOOLCHAIN=auto
ENV GOPROXY=https://goproxy.cn,direct
RUN go mod download

# 复制源码并编译
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /server cmd/server/main.go

# 阶段 2: 最小运行镜像
FROM docker.1ms.run/library/alpine:3.20

RUN apk add --no-cache ca-certificates tzdata

WORKDIR /app

# 从构建阶段复制二进制
COPY --from=builder /server ./server

# 创建上传目录
RUN mkdir -p /app/uploads

EXPOSE 8080

CMD ["./server"]
