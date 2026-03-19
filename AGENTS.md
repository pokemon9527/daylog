# AGENTS.md - DayLog Development Guide

DayLog is a Notion-like collaborative platform: React + TypeScript frontend, Go + Gin + PostgreSQL backend, Yjs CRDT for real-time collaboration.

## Build / Lint / Test Commands

### Frontend (`cd frontend`)

| Task | Command |
|------|---------|
| Install deps | `npm install` |
| Dev server (port 3000) | `npm run dev` |
| Type check | `npx tsc --noEmit` |
| Lint | `npm run lint` |
| Production build | `npm run build` |
| Preview build | `npm run preview` |

No test framework configured yet. If adding tests, prefer Vitest (Vite-native).

### Backend (`cd backend`)

| Task | Command |
|------|---------|
| Compile check | `go build ./...` |
| Format | `gofmt -w .` |
| Lint / vet | `go vet ./...` |
| Dev server | `go run cmd/server/main.go` |
| DB migrate up | `make migrate-up` |
| DB migrate down | `make migrate-down` |
| Tidy deps | `go mod tidy` |

No test files yet. To add tests, use `go test ./internal/...` with `_test.go` files. Run a single package: `go test ./internal/repository/...`

### Docker

```bash
docker-compose up -d postgres   # start PostgreSQL only
docker-compose up -d            # start all services
docker-compose down             # stop all
```

## Project Structure

```
daylog/
├── frontend/src/
│   ├── api/client.ts          # Axios instance + domain API objects
│   ├── components/            # editor/, canvas/, sidebar/, file-upload/
│   ├── pages/                 # LoginPage, RegisterPage, DashboardPage, EditorPage
│   ├── stores/index.ts        # Zustand stores (useAuthStore, useAppStore)
│   ├── types/index.ts         # All TypeScript interfaces & types
│   └── App.tsx                # Router with ProtectedRoute
├── backend/
│   ├── cmd/server/main.go     # Entry point
│   ├── internal/
│   │   ├── api/handler/       # Gin HTTP handlers
│   │   ├── api/middleware/     # JWT auth, CORS
│   │   ├── api/router.go      # Central route registration
│   │   ├── domain/domain.go   # All domain models + DTOs
│   │   ├── repository/        # pgx database operations
│   │   ├── service/auth.go    # Auth service (register, login, JWT)
│   │   ├── ws/hub.go          # WebSocket room manager
│   │   ├── ws/handler.go      # WebSocket Gin handler
│   │   └── config/config.go   # Env-based config
│   └── migrations/            # PostgreSQL migration files
```

## Code Style

### General

- Comments in **Chinese** (中文注释), variable/function names in **English**
- Filenames: lowercase, hyphen-separated (`file-upload/`)
- No comments in generated or trivial code
- Use meaningful names; avoid abbreviations

### TypeScript / React

- **Strict mode** enabled; `noUnusedLocals`, `noUnusedParameters` are on
- Use `import type { X }` for type-only imports (enforced by `verbatimModuleSyntax`)
- Components: `export default function ComponentName()` (named function exports)
- Hooks: standard React hooks + custom hooks in same file or `stores/`
- State: Zustand with typed interfaces (`create<Type>((set) => ({...}))`)
- API calls: import from `api/client.ts`, use destructured `{ data }` from axios
- Styling: **Tailwind CSS only** -- no custom CSS except in `index.css` for editor/canvas
- Forms: controlled inputs with `useState`, `async` handlers
- Errors: `try/catch` with `console.error` + user-facing error state; `err: any` for axios
- Callbacks: wrap in `useCallback` when passed as props
- Use `import { StrictMode } from 'react'` in entry point

### Go

- Follow `gofmt` formatting
- Errors: `fmt.Errorf("描述: %w", err)` -- always wrap with context
- Use `context.Context` as first parameter in all service/repository methods
- No global variables; inject dependencies via constructor functions
- DB queries: parameterized (`$1, $2`), never string concatenation
- Use `RETURNING` clause to get generated IDs/timestamps on INSERT
- Partial updates: `COALESCE($value, column)` pattern
- Soft deletes: `is_archived = TRUE` or `is_trash = TRUE`, never physical DELETE
- Transactions: `tx, _ := db.Pool.Begin(ctx)` / `defer tx.Rollback(ctx)` / `tx.Commit(ctx)`
- Always `defer rows.Close()` after query loops
- WebSocket: Hub pattern with channel-based registration, single-goroutine state mutations

### Naming Conventions

| Context | Convention | Example |
|---------|-----------|---------|
| Go files | lowercase, short | `user.go`, `workspace.go` |
| Go exported funcs | PascalCase | `CreateUser`, `GetPageByID` |
| Go unexported | camelCase | `getEnv`, `loadInitialState` |
| TS files | PascalCase for components, camelCase for utils | `LoginPage.tsx`, `client.ts` |
| TS interfaces | PascalCase | `AuthResponse`, `Workspace` |
| DB columns | snake_case | `created_at`, `is_archived` |
| JSON tags | `json:"snake_case"` | `json:"display_name"` |
| API paths | kebab-case | `/api/v1/page-permissions` |

## Key Constraints

- **File upload**: max 10MB (frontend pre-check + backend `MaxBytesReader`)
- **JWT**: HS256, 7-day expiry, `user_id` + `exp` + `iat` claims
- **WebSocket**: requires `page_id`, `user_id`, `client_id` query params
- **Block sorting**: `DOUBLE PRECISION` fractional insertion (+=1000 per item)
- **IDs**: UUID generated by PostgreSQL (`gen_random_uuid()`)
- **Content format**: blocks store JSON `{ rich_text: [{ type, text: { content }, plain_text }] }`

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `SERVER_PORT` | 8080 | Backend port |
| `DB_HOST` | localhost | Database host |
| `DB_PORT` | 5432 | Database port |
| `DB_USER` | daylog | Database user |
| `DB_PASSWORD` | daylog123 | Database password |
| `DB_NAME` | daylog | Database name |
| `JWT_SECRET` | (built-in) | JWT signing secret |
| `UPLOAD_PATH` | ./uploads | File storage directory |
