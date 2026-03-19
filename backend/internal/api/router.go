package api

import (
	"daylog/internal/api/handler"
	"daylog/internal/api/middleware"
	"daylog/internal/config"
	"daylog/internal/repository"
	"daylog/internal/service"
	"daylog/internal/ws"

	"github.com/gin-gonic/gin"
)

// SetupRouter 设置路由
func SetupRouter(db *repository.DB, cfg *config.Config, hub *ws.Hub) *gin.Engine {
	r := gin.Default()

	// 全局中间件
	r.Use(middleware.CORS())

	// 设置最大 multipart 内存（10MB）
	r.MaxMultipartMemory = cfg.Upload.MaxSize

	// 初始化服务和处理器
	authService := service.NewAuthService(db, &cfg.JWT)
	authHandler := handler.NewAuthHandler(authService)
	pageHandler := handler.NewPageHandler(db)
	blockHandler := handler.NewBlockHandler(db)
	fileHandler := handler.NewFileHandler(db, &cfg.Upload)
	workspaceHandler := handler.NewWorkspaceHandler(db)
	permissionHandler := handler.NewPermissionHandler(db)
	searchHandler := handler.NewSearchHandler(db)

	// API 路由组
	api := r.Group("/api/v1")
	{
		// 公开路由（无需认证）
		auth := api.Group("/auth")
		{
			auth.POST("/register", authHandler.Register)
			auth.POST("/login", authHandler.Login)
		}

		// 需要认证的路由
		protected := api.Group("")
		protected.Use(middleware.AuthMiddleware(authService))
		{
			// 用户
			protected.GET("/me", authHandler.GetCurrentUser)

			// 工作空间
			workspaces := protected.Group("/workspaces")
			{
				workspaces.POST("", workspaceHandler.CreateWorkspace)
				workspaces.GET("", workspaceHandler.GetMyWorkspaces)
				workspaces.GET("/:id", workspaceHandler.GetWorkspace)
				workspaces.PUT("/:id", workspaceHandler.UpdateWorkspace)
				workspaces.GET("/:id/members", workspaceHandler.GetMembers)
				workspaces.POST("/:id/members", workspaceHandler.AddMember)
				workspaces.PUT("/:id/members/:userId", workspaceHandler.UpdateMemberRole)
				workspaces.DELETE("/:id/members/:userId", workspaceHandler.RemoveMember)
			}

			// 页面
			pages := protected.Group("/pages")
			{
				pages.POST("", pageHandler.CreatePage)
				pages.GET("", pageHandler.GetWorkspacePages)
				pages.GET("/:id", pageHandler.GetPage)
				pages.PUT("/:id", pageHandler.UpdatePage)
				pages.DELETE("/:id", pageHandler.DeletePage)
				// 页面权限
				pages.GET("/:id/permissions", permissionHandler.GetPagePermissions)
				pages.POST("/:id/permissions", permissionHandler.AddPagePermission)
				pages.DELETE("/:id/permissions/:permId", permissionHandler.RemovePagePermission)
				pages.GET("/:id/permissions/check", permissionHandler.CheckPagePermission)
			}

			// 块
			blocks := protected.Group("/blocks")
			{
				blocks.POST("", blockHandler.CreateBlock)
				blocks.POST("/batch", blockHandler.CreateBatchBlocks)
				blocks.GET("", blockHandler.GetBlocks)
				blocks.GET("/:id", blockHandler.GetBlock)
				blocks.PUT("/:id", blockHandler.UpdateBlock)
				blocks.DELETE("/:id", blockHandler.DeleteBlock)
				blocks.POST("/reorder", blockHandler.ReorderBlocks)
			}

			// 文件
			files := protected.Group("/files")
			{
				files.POST("/upload", fileHandler.UploadFile)
				files.GET("/:id", fileHandler.DownloadFile)
				files.GET("/:id/preview", fileHandler.ServeFile)
				files.GET("", fileHandler.GetPageFiles)
			}

			// 搜索
			protected.GET("/search", searchHandler.Search)

			// WebSocket
			protected.GET("/ws", ws.HandleWebSocket(hub))
		}
	}

	return r
}
