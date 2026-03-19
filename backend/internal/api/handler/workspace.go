package handler

import (
	"daylog/internal/domain"
	"daylog/internal/repository"
	"net/http"

	"github.com/gin-gonic/gin"
)

// WorkspaceHandler 工作空间处理器
type WorkspaceHandler struct {
	db *repository.DB
}

// NewWorkspaceHandler 创建工作空间处理器
func NewWorkspaceHandler(db *repository.DB) *WorkspaceHandler {
	return &WorkspaceHandler{db: db}
}

// CreateWorkspace 创建工作空间
func (h *WorkspaceHandler) CreateWorkspace(c *gin.Context) {
	var req domain.CreateWorkspaceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数错误: " + err.Error()})
		return
	}

	userID := c.GetString("user_id")
	ws := &domain.Workspace{
		Name:      req.Name,
		IconEmoji: req.IconEmoji,
		OwnerID:   userID,
		Settings:  "{}",
	}

	if err := h.db.CreateWorkspace(c.Request.Context(), ws); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// 将创建者添加为 owner 成员
	member := &domain.WorkspaceMember{
		WorkspaceID: ws.ID,
		UserID:      userID,
		Role:        domain.RoleOwner,
	}
	_ = h.db.AddWorkspaceMember(c.Request.Context(), member)

	c.JSON(http.StatusCreated, ws)
}

// GetMyWorkspaces 获取当前用户的工作空间列表
func (h *WorkspaceHandler) GetMyWorkspaces(c *gin.Context) {
	userID := c.GetString("user_id")
	workspaces, err := h.db.GetUserWorkspaces(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, workspaces)
}

// GetWorkspace 获取工作空间详情
func (h *WorkspaceHandler) GetWorkspace(c *gin.Context) {
	id := c.Param("id")
	ws, err := h.db.GetWorkspaceByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "工作空间不存在"})
		return
	}
	c.JSON(http.StatusOK, ws)
}

// UpdateWorkspace 更新工作空间
func (h *WorkspaceHandler) UpdateWorkspace(c *gin.Context) {
	id := c.Param("id")
	var req domain.UpdateWorkspaceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数错误: " + err.Error()})
		return
	}

	if err := h.db.UpdateWorkspace(c.Request.Context(), id, &req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "更新成功"})
}

// GetMembers 获取工作空间成员列表
func (h *WorkspaceHandler) GetMembers(c *gin.Context) {
	workspaceID := c.Param("id")
	members, err := h.db.GetWorkspaceMembers(c.Request.Context(), workspaceID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, members)
}

// AddMember 添加成员
func (h *WorkspaceHandler) AddMember(c *gin.Context) {
	workspaceID := c.Param("id")
	var req domain.AddMemberRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数错误: " + err.Error()})
		return
	}

	// 通过邮箱查找用户
	user, err := h.db.GetUserByEmail(c.Request.Context(), req.Email)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "用户不存在: " + req.Email})
		return
	}

	member := &domain.WorkspaceMember{
		WorkspaceID: workspaceID,
		UserID:      user.ID,
		Role:        req.Role,
	}

	if err := h.db.AddWorkspaceMember(c.Request.Context(), member); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "成员添加成功", "user_id": user.ID})
}

// UpdateMemberRole 更新成员角色
func (h *WorkspaceHandler) UpdateMemberRole(c *gin.Context) {
	workspaceID := c.Param("id")
	memberUserID := c.Param("userId")
	var req domain.UpdateMemberRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数错误: " + err.Error()})
		return
	}

	if err := h.db.UpdateMemberRole(c.Request.Context(), workspaceID, memberUserID, req.Role); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "角色更新成功"})
}

// RemoveMember 移除成员
func (h *WorkspaceHandler) RemoveMember(c *gin.Context) {
	workspaceID := c.Param("id")
	memberUserID := c.Param("userId")

	if err := h.db.RemoveWorkspaceMember(c.Request.Context(), workspaceID, memberUserID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "成员已移除"})
}
