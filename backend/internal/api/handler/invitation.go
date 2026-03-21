package handler

import (
	"daylog/internal/domain"
	"daylog/internal/repository"
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// InvitationHandler 邀请处理器
type InvitationHandler struct {
	db *repository.DB
}

// NewInvitationHandler 创建邀请处理器
func NewInvitationHandler(db *repository.DB) *InvitationHandler {
	return &InvitationHandler{db: db}
}

// CreateInvitation 创建邀请
func (h *InvitationHandler) CreateInvitation(c *gin.Context) {
	workspaceID := c.Param("id")
	var req domain.CreateInvitationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数错误: " + err.Error()})
		return
	}

	// 检查是否已有未处理的邀请
	existing, _ := h.db.CheckExistingInvitation(c.Request.Context(), workspaceID, req.Email)
	if existing != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "该用户已有未处理的邀请"})
		return
	}

	// 检查用户是否已是成员
	userID := c.GetString("user_id")
	// 这里可以添加检查是否已是成员的逻辑

	// 创建邀请
	invitation := &domain.WorkspaceInvitation{
		WorkspaceID:  workspaceID,
		InviterID:    userID,
		InviteeEmail: req.Email,
		Role:         req.Role,
		Token:        uuid.New().String(),
		ExpiresAt:    time.Now().Add(7 * 24 * time.Hour), // 7天有效期
	}

	if err := h.db.CreateInvitation(c.Request.Context(), invitation); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// 如果用户已注册，创建通知
	inviteeUser, _ := h.db.GetUserByEmail(c.Request.Context(), req.Email)
	if inviteeUser != nil {
		// 获取工作空间信息
		workspace, _ := h.db.GetWorkspaceByID(c.Request.Context(), workspaceID)
		inviter, _ := h.db.GetUserByID(c.Request.Context(), userID)

		if workspace != nil && inviter != nil {
			notification := &domain.Notification{
				UserID:  inviteeUser.ID,
				Type:    "workspace_invitation",
				Title:   fmt.Sprintf("%s 邀请你加入工作空间", inviter.DisplayName),
				Content: &workspace.Name,
				Data: domain.JSONMap{
					"invitation_id":  invitation.ID,
					"workspace_id":   workspaceID,
					"workspace_name": workspace.Name,
					"inviter_name":   inviter.DisplayName,
					"token":          invitation.Token,
				},
			}
			h.db.CreateNotification(c.Request.Context(), notification)
		}
	}

	c.JSON(http.StatusCreated, gin.H{
		"id":     invitation.ID,
		"token":  invitation.Token,
		"status": invitation.Status,
	})
}

// GetInvitations 获取工作空间的邀请列表
func (h *InvitationHandler) GetInvitations(c *gin.Context) {
	workspaceID := c.Param("id")

	invitations, err := h.db.GetInvitationsByWorkspace(c.Request.Context(), workspaceID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, invitations)
}

// GetInvitationByToken 通过 Token 获取邀请详情
func (h *InvitationHandler) GetInvitationByToken(c *gin.Context) {
	token := c.Param("token")

	invitation, err := h.db.GetInvitationByToken(c.Request.Context(), token)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "邀请不存在或已过期"})
		return
	}

	// 检查是否过期
	if time.Now().After(invitation.ExpiresAt) {
		// 更新状态为过期
		h.db.UpdateInvitationStatus(c.Request.Context(), invitation.ID, domain.InvitationExpired, nil)
		c.JSON(http.StatusGone, gin.H{"error": "邀请已过期"})
		return
	}

	// 检查状态
	if invitation.Status != domain.InvitationPending {
		c.JSON(http.StatusGone, gin.H{"error": "邀请已被处理"})
		return
	}

	c.JSON(http.StatusOK, invitation)
}

// AcceptInvitation 接受邀请
func (h *InvitationHandler) AcceptInvitation(c *gin.Context) {
	token := c.Param("token")

	invitation, err := h.db.GetInvitationByToken(c.Request.Context(), token)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "邀请不存在"})
		return
	}

	// 检查是否过期
	if time.Now().After(invitation.ExpiresAt) {
		h.db.UpdateInvitationStatus(c.Request.Context(), invitation.ID, domain.InvitationExpired, nil)
		c.JSON(http.StatusGone, gin.H{"error": "邀请已过期"})
		return
	}

	// 检查状态
	if invitation.Status != domain.InvitationPending {
		c.JSON(http.StatusGone, gin.H{"error": "邀请已被处理"})
		return
	}

	// 获取当前用户
	userID := c.GetString("user_id")
	user, err := h.db.GetUserByID(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "用户未登录"})
		return
	}

	// 检查邮箱是否匹配
	if user.Email != invitation.InviteeEmail {
		c.JSON(http.StatusForbidden, gin.H{"error": "此邀请是发给其他用户的"})
		return
	}

	// 更新邀请状态
	if err := h.db.UpdateInvitationStatus(c.Request.Context(), invitation.ID, domain.InvitationAccepted, &userID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// 添加为成员
	member := &domain.WorkspaceMember{
		WorkspaceID: invitation.WorkspaceID,
		UserID:      userID,
		Role:        invitation.Role,
	}
	if err := h.db.AddWorkspaceMember(c.Request.Context(), member); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "添加成员失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "已成功加入工作空间"})
}

// RejectInvitation 拒绝邀请
func (h *InvitationHandler) RejectInvitation(c *gin.Context) {
	token := c.Param("token")

	invitation, err := h.db.GetInvitationByToken(c.Request.Context(), token)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "邀请不存在"})
		return
	}

	// 检查状态
	if invitation.Status != domain.InvitationPending {
		c.JSON(http.StatusGone, gin.H{"error": "邀请已被处理"})
		return
	}

	// 更新邀请状态
	if err := h.db.UpdateInvitationStatus(c.Request.Context(), invitation.ID, domain.InvitationRejected, nil); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "已拒绝邀请"})
}

// DeleteInvitation 删除/取消邀请
func (h *InvitationHandler) DeleteInvitation(c *gin.Context) {
	invitationID := c.Param("invitationId")

	if err := h.db.DeleteInvitation(c.Request.Context(), invitationID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "已取消邀请"})
}

// NotificationHandler 通知处理器
type NotificationHandler struct {
	db *repository.DB
}

// NewNotificationHandler 创建通知处理器
func NewNotificationHandler(db *repository.DB) *NotificationHandler {
	return &NotificationHandler{db: db}
}

// GetNotifications 获取通知列表
func (h *NotificationHandler) GetNotifications(c *gin.Context) {
	userID := c.GetString("user_id")

	// 获取未读数量
	unreadCount, _ := h.db.GetUnreadNotificationCount(c.Request.Context(), userID)

	// 获取通知列表
	notifications, err := h.db.GetNotificationsByUser(c.Request.Context(), userID, 50, 0)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"unread_count":  unreadCount,
		"notifications": notifications,
	})
}

// MarkAsRead 标记通知为已读
func (h *NotificationHandler) MarkAsRead(c *gin.Context) {
	id := c.Param("id")

	if err := h.db.MarkNotificationAsRead(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "已标记为已读"})
}

// MarkAllAsRead 标记所有通知为已读
func (h *NotificationHandler) MarkAllAsRead(c *gin.Context) {
	userID := c.GetString("user_id")

	if err := h.db.MarkAllNotificationsAsRead(c.Request.Context(), userID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "已标记所有通知为已读"})
}
