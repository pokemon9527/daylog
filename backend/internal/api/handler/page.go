package handler

import (
	"daylog/internal/domain"
	"daylog/internal/repository"
	"net/http"

	"github.com/gin-gonic/gin"
)

// PageHandler 页面处理器
type PageHandler struct {
	db *repository.DB
}

// NewPageHandler 创建页面处理器
func NewPageHandler(db *repository.DB) *PageHandler {
	return &PageHandler{db: db}
}

// CreatePage 创建页面
func (h *PageHandler) CreatePage(c *gin.Context) {
	var req domain.CreatePageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数错误: " + err.Error()})
		return
	}

	userID := c.GetString("user_id")
	page := &domain.Page{
		WorkspaceID:  req.WorkspaceID,
		ParentPageID: req.ParentPageID,
		Title:        req.Title,
		IconEmoji:    req.IconEmoji,
		CreatedBy:    userID,
	}

	if err := h.db.CreatePage(c.Request.Context(), page); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, page)
}

// GetPage 获取页面
func (h *PageHandler) GetPage(c *gin.Context) {
	id := c.Param("id")
	page, err := h.db.GetPageByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "页面不存在"})
		return
	}
	c.JSON(http.StatusOK, page)
}

// GetWorkspacePages 获取工作空间下的页面列表
func (h *PageHandler) GetWorkspacePages(c *gin.Context) {
	workspaceID := c.Query("workspace_id")
	if workspaceID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "缺少 workspace_id 参数"})
		return
	}

	pages, err := h.db.GetWorkspacePages(c.Request.Context(), workspaceID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, pages)
}

// UpdatePage 更新页面
func (h *PageHandler) UpdatePage(c *gin.Context) {
	id := c.Param("id")
	var req domain.UpdatePageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数错误: " + err.Error()})
		return
	}

	userID := c.GetString("user_id")
	if err := h.db.UpdatePage(c.Request.Context(), id, &req, userID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "更新成功"})
}

// DeletePage 删除页面
func (h *PageHandler) DeletePage(c *gin.Context) {
	id := c.Param("id")
	if err := h.db.DeletePage(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "删除成功"})
}
