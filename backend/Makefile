.PHONY: build run dev migrate-up migrate-down tidy

# 编译
build:
	go build -o bin/server cmd/server/main.go

# 运行
run: build
	./bin/server

# 开发模式
dev:
	go run cmd/server/main.go

# 数据库迁移（需要安装 golang-migrate）
migrate-up:
	migrate -path migrations -database "postgres://daylog:daylog123@localhost:5432/daylog?sslmode=disable" up

migrate-down:
	migrate -path migrations -database "postgres://daylog:daylog123@localhost:5432/daylog?sslmode=disable" down

# 整理依赖
tidy:
	go mod tidy
