package main

import (
	"log"

	"daylog/internal/api"
	"daylog/internal/config"
	"daylog/internal/repository"
	"daylog/internal/ws"
)

func main() {
	// 加载配置
	cfg := config.Load()

	// 连接数据库
	db, err := repository.NewDB(&cfg.Database)
	if err != nil {
		log.Fatalf("数据库连接失败: %v", err)
	}
	defer db.Close()
	log.Println("数据库连接成功")

	// 创建 WebSocket Hub
	hub := ws.NewHub()
	go hub.Run()
	log.Println("WebSocket Hub 已启动")

	// 设置路由
	router := api.SetupRouter(db, cfg, hub)

	// 启动服务器
	log.Printf("服务器启动在 :%s", cfg.Server.Port)
	if err := router.Run(":" + cfg.Server.Port); err != nil {
		log.Fatalf("服务器启动失败: %v", err)
	}
}
