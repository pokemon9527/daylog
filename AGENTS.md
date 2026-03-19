# AGENTS.md - DayLog 开发指南

本文件为 AI 编码代理提供本仓库的开发规范和操作指南。

## 项目概览

DayLog 是一个类 Notion 的在线协作平台，支持富文本编辑、画图、文件上传和多用户实时协同。

- **前端**: React 18 + TypeScript + Vite + Tailwind CSS
- **后端**: Go + Gin + PostgreSQL + WebSocket
- **协同**: Yjs CRDT + gorilla/websocket
- **数据库**: PostgreSQL 16

## 目录结构

```
daylog/
├── frontend/              # React 前端
│   ├── src/
│   │   ├── api/           # axios HTTP 客户端封装
│   │   ├── components/    # UI 组件 (editor/, canvas/, sidebar/, file-upload/)
│   │   ├── pages/         # 页面组件 (Login, Register, Dashboard, Editor)
│   │   ├── stores/        # Zustand 状态管理
│   │   ├── types/         # TypeScript 类型定义
│   │   ├── App.tsx        # 路由配置
│   │   └── main.tsx       # 入口
│   └── vite.config.ts
├── backend/               # Go 后端
│   ├── cmd/server/        # main.go 入口
│   ├── internal/
│   │   ├── api/           # HTTP 处理器和中间件
│   │   ├── ws/            # WebSocket Hub
│   │   ├── domain/        # 业务模型
│   │   ├── repository/    # 数据库操作 (pgx)
│   │   └── config/        # 配置加载
│   ├── migrations/        # PostgreSQL 迁移文件
│   └── uploads/           # 本地文件存储
├── docker-compose.yml     # PostgreSQL 容器
└── README.md
```

## 构建与运行命令

### 后端 (Go)

```bash
cd backend

# 编译检查
go build ./...

# 运行开发服务器
go run cmd/server/main.go

# 格式化代码
gofmt -w .

# 数据库迁移
migrate -path migrations -database "postgres://daylog:daylog123@localhost:5432/daylog?sslmode=disable" up
migrate -path migrations -database "postgres://daylog:daylog123@localhost:5432/daylog?sslmode=disable" down
```

### 前端 (React)

```bash
cd frontend

# 安装依赖
npm install

# 开发服务器 (端口 3000，代理到后端 8080)
npm run dev

# TypeScript 类型检查
npx tsc --noEmit

# 生产构建
npm run build

# 预览构建结果
npm run preview
```

### Docker

```bash
# 启动 PostgreSQL
docker-compose up -d postgres

# 停止
docker-compose down
```

## 代码规范

### 通用规则

- **注释语言**: 中文注释
- **变量/函数名**: 英文，使用有意义的命名
- **文件名**: 小写，用连字符或下划线分隔

### Go 代码规范

- 遵循 Go 官方规范 (`gofmt`)
- 错误处理: 使用 `fmt.Errorf("描述: %w", err)` 包装错误
- 使用 `context.Context` 传递请求上下文
- 依赖注入: 通过构造函数传入，不使用全局变量
- 数据库操作: 使用 pgx 驱动，参数化查询防止 SQL 注入
- HTTP 路由: Gin 框架，路由在 `router.go` 统一注册
- 中间件: JWT 认证、CORS 在 `middleware/` 目录

### TypeScript/React 代码规范

- 使用 TypeScript 严格模式
- 组件: 函数式组件 + Hooks
- 状态管理: Zustand (`stores/`)
- API 请求: axios 封装在 `api/client.ts`
- 样式: Tailwind CSS 类名，不写自定义 CSS（编辑器除外）
- 类型定义: 统一在 `types/index.ts`
- 路由: react-router-dom v6

### 数据库规范

- 主键: UUID (`gen_random_uuid()`)
- 时间戳: `TIMESTAMPTZ`，默认 `now()`
- JSONB 用于灵活内容存储（块内容、设置）
- 软删除: `is_archived` / `is_trash` 布尔字段
- 外键: 级联删除 (`ON DELETE CASCADE`)

## API 端点

### 认证
- `POST /api/v1/auth/register` - 注册
- `POST /api/v1/auth/login` - 登录

### 工作空间
- `POST /api/v1/workspaces` - 创建工作空间
- `GET /api/v1/workspaces` - 获取用户的工作空间列表
- `GET /api/v1/workspaces/:id` - 获取工作空间详情
- `PUT /api/v1/workspaces/:id` - 更新工作空间
- `GET /api/v1/workspaces/:id/members` - 获取成员列表
- `POST /api/v1/workspaces/:id/members` - 添加成员
- `PUT /api/v1/workspaces/:id/members/:userId` - 更新成员角色
- `DELETE /api/v1/workspaces/:id/members/:userId` - 移除成员

### 页面
- `POST /api/v1/pages` - 创建页面
- `GET /api/v1/pages?workspace_id=xxx` - 获取页面列表
- `GET /api/v1/pages/:id` - 获取页面详情
- `PUT /api/v1/pages/:id` - 更新页面
- `DELETE /api/v1/pages/:id` - 删除页面

### 页面权限
- `GET /api/v1/pages/:pageId/permissions` - 获取权限列表
- `POST /api/v1/pages/:pageId/permissions` - 添加权限
- `DELETE /api/v1/pages/:pageId/permissions/:permId` - 移除权限
- `GET /api/v1/pages/:pageId/permissions/check` - 检查当前用户权限

### 块
- `POST /api/v1/blocks` - 创建块
- `POST /api/v1/blocks/batch` - 批量创建块
- `GET /api/v1/blocks?page_id=xxx` - 获取块列表
- `GET /api/v1/blocks/:id` - 获取单个块
- `PUT /api/v1/blocks/:id` - 更新块
- `DELETE /api/v1/blocks/:id` - 删除块
- `POST /api/v1/blocks/reorder` - 重排序块

### 文件
- `POST /api/v1/files/upload` - 上传文件（最大 10MB）
- `GET /api/v1/files/:id` - 下载文件
- `GET /api/v1/files/:id/preview` - 预览文件
- `GET /api/v1/files?page_id=xxx` - 获取页面文件列表

### 搜索
- `GET /api/v1/search?q=xxx&workspace_id=xxx` - 全文搜索

### WebSocket
- `GET /api/v1/ws?page_id=xxx&client_id=xxx` - 实时协同连接

## 关键约束

- **文件上传限制**: 最大 10MB，前端 `react-dropzone` 预检 + 后端 `http.MaxBytesReader` 强制限制
- **JWT 过期**: 7 天，通过 `JWT_SECRET` 环境变量配置密钥
- **WebSocket**: 连接需要 `page_id`、`user_id`、`client_id` 参数
- **块排序**: 使用 `DOUBLE PRECISION` 的分数插入法支持拖拽排序

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `SERVER_PORT` | 8080 | 后端端口 |
| `DB_HOST` | localhost | 数据库地址 |
| `DB_PORT` | 5432 | 数据库端口 |
| `DB_USER` | daylog | 数据库用户 |
| `DB_PASSWORD` | daylog123 | 数据库密码 |
| `DB_NAME` | daylog | 数据库名 |
| `JWT_SECRET` | (内置) | JWT 签名密钥 |
| `UPLOAD_PATH` | ./uploads | 文件上传目录 |
