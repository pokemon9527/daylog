# DayLog - 类 Notion 在线协作平台

## 快速启动

### 1. 启动数据库

```bash
docker-compose up -d postgres
```

### 2. 启动后端

```bash
cd backend

# 安装依赖
go mod tidy

# 运行数据库迁移（需要安装 golang-migrate）
migrate -path migrations -database "postgres://daylog:daylog123@localhost:5432/daylog?sslmode=disable" up

# 启动服务器
go run cmd/server/main.go
```

### 3. 启动前端

```bash
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

访问 http://localhost:3000

## 技术栈

- **前端**: React 18 + TypeScript + Vite + Tailwind CSS
- **后端**: Go + Gin + PostgreSQL
- **实时协同**: Yjs + WebSocket
- **编辑器**: TipTap (ProseMirror)
- **画图**: Canvas API (可升级为 Excalidraw)
- **文件上传**: react-dropzone + Go multipart

## API 端点

### 认证
- `POST /api/v1/auth/register` - 注册
- `POST /api/v1/auth/login` - 登录

### 页面
- `POST /api/v1/pages` - 创建页面
- `GET /api/v1/pages?workspace_id=xxx` - 获取页面列表
- `GET /api/v1/pages/:id` - 获取页面详情
- `PUT /api/v1/pages/:id` - 更新页面
- `DELETE /api/v1/pages/:id` - 删除页面

### 块
- `POST /api/v1/blocks` - 创建块
- `GET /api/v1/blocks?page_id=xxx` - 获取块列表
- `PUT /api/v1/blocks/:id` - 更新块
- `DELETE /api/v1/blocks/:id` - 删除块
- `POST /api/v1/blocks/reorder` - 重排序

### 文件
- `POST /api/v1/files/upload` - 上传文件（最大 10MB）
- `GET /api/v1/files/:id` - 下载文件
- `GET /api/v1/files/:id/preview` - 预览文件

### WebSocket
- `GET /api/v1/ws?page_id=xxx&client_id=xxx` - 实时协同连接
