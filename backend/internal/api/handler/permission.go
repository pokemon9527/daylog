package handler

import (
	"daylog/internal/domain"
	"daylog/internal/repository"
	"net/http"

	"github.com/gin-gonic/gin"
)

// PermissionHandler 权限处理器
type PermissionHandler struct {
	db *repository.DB
}

// NewPermissionHandler 创建权限处理器
func NewPermissionHandler(db *repository.DB) *PermissionHandler {
	return &PermissionHandler{db: db}
}

// AddPagePermission 添加页面权限
func (h *PermissionHandler) AddPagePermission(c *gin.Context) {
	pageID := c.Param("id")
	var req domain.AddPagePermissionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数错误: " + err.Error()})
		return
	}

	perm := &domain.PagePermissionRecord{
		PageID: pageID,
		UserID: req.UserID,
		Role:   req.Role,
		Level:  req.Level,
	}

	if err := h.db.AddPagePermission(c.Request.Context(), perm); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, perm)
}

// GetPagePermissions 获取页面权限列表
func (h *PermissionHandler) GetPagePermissions(c *gin.Context) {
	pageID := c.Param("id")
	perms, err := h.db.GetPagePermissions(c.Request.Context(), pageID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, perms)
}

// RemovePagePermission 移除页面权限
func (h *PermissionHandler) RemovePagePermission(c *gin.Context) {
	permID := c.Param("permId")
	if err := h.db.RemovePagePermission(c.Request.Context(), permID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "权限已移除"})
}

// CheckPagePermission 检查当前用户对页面的权限
func (h *PermissionHandler) CheckPagePermission(c *gin.Context) {
	pageID := c.Param("id")
	userID := c.GetString("user_id")

	level, err := h.db.GetUserPagePermission(c.Request.Context(), pageID, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"page_id": pageID, "permission": level})
}
