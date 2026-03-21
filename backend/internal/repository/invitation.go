package repository

import (
	"context"
	"daylog/internal/domain"
	"fmt"
)

// CreateInvitation 创建邀请
func (db *DB) CreateInvitation(ctx context.Context, inv *domain.WorkspaceInvitation) error {
	err := db.Pool.QueryRow(ctx,
		`INSERT INTO workspace_invitations (workspace_id, inviter_id, invitee_email, role, token, expires_at)
		 VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, status, created_at`,
		inv.WorkspaceID, inv.InviterID, inv.InviteeEmail, inv.Role, inv.Token, inv.ExpiresAt,
	).Scan(&inv.ID, &inv.Status, &inv.CreatedAt)
	if err != nil {
		return fmt.Errorf("创建邀请失败: %w", err)
	}
	return nil
}

// GetInvitationByToken 通过 Token 获取邀请
func (db *DB) GetInvitationByToken(ctx context.Context, token string) (*domain.WorkspaceInvitationInfo, error) {
	inv := &domain.WorkspaceInvitationInfo{}
	err := db.Pool.QueryRow(ctx,
		`SELECT i.id, i.workspace_id, w.name, w.icon_emoji, i.inviter_id, u.display_name, 
		        i.invitee_email, i.invitee_id, i.role, i.status, i.token, i.expires_at, i.created_at
		 FROM workspace_invitations i
		 JOIN workspaces w ON i.workspace_id = w.id
		 JOIN users u ON i.inviter_id = u.id
		 WHERE i.token = $1`,
		token,
	).Scan(&inv.ID, &inv.WorkspaceID, &inv.WorkspaceName, &inv.WorkspaceIcon, &inv.InviterID,
		&inv.InviterName, &inv.InviteeEmail, &inv.InviteeID, &inv.Role, &inv.Status,
		&inv.Token, &inv.ExpiresAt, &inv.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("邀请不存在: %w", err)
	}
	return inv, nil
}

// GetInvitationsByWorkspace 获取工作空间的邀请列表
func (db *DB) GetInvitationsByWorkspace(ctx context.Context, workspaceID string) ([]domain.WorkspaceInvitationInfo, error) {
	rows, err := db.Pool.Query(ctx,
		`SELECT i.id, i.workspace_id, w.name, w.icon_emoji, i.inviter_id, u.display_name, 
		        i.invitee_email, i.invitee_id, i.role, i.status, i.token, i.expires_at, i.created_at
		 FROM workspace_invitations i
		 JOIN workspaces w ON i.workspace_id = w.id
		 JOIN users u ON i.inviter_id = u.id
		 WHERE i.workspace_id = $1
		 ORDER BY i.created_at DESC`,
		workspaceID,
	)
	if err != nil {
		return nil, fmt.Errorf("获取邀请列表失败: %w", err)
	}
	defer rows.Close()

	var invitations []domain.WorkspaceInvitationInfo
	for rows.Next() {
		var inv domain.WorkspaceInvitationInfo
		if err := rows.Scan(&inv.ID, &inv.WorkspaceID, &inv.WorkspaceName, &inv.WorkspaceIcon,
			&inv.InviterID, &inv.InviterName, &inv.InviteeEmail, &inv.InviteeID, &inv.Role,
			&inv.Status, &inv.Token, &inv.ExpiresAt, &inv.CreatedAt); err != nil {
			return nil, err
		}
		invitations = append(invitations, inv)
	}
	return invitations, nil
}

// UpdateInvitationStatus 更新邀请状态
func (db *DB) UpdateInvitationStatus(ctx context.Context, id string, status domain.InvitationStatus, inviteeID *string) error {
	_, err := db.Pool.Exec(ctx,
		`UPDATE workspace_invitations SET status = $2, invitee_id = $3 WHERE id = $1`,
		id, status, inviteeID,
	)
	if err != nil {
		return fmt.Errorf("更新邀请状态失败: %w", err)
	}
	return nil
}

// DeleteInvitation 删除邀请
func (db *DB) DeleteInvitation(ctx context.Context, id string) error {
	_, err := db.Pool.Exec(ctx,
		`DELETE FROM workspace_invitations WHERE id = $1`,
		id,
	)
	if err != nil {
		return fmt.Errorf("删除邀请失败: %w", err)
	}
	return nil
}

// CheckExistingInvitation 检查是否存在未处理的邀请
func (db *DB) CheckExistingInvitation(ctx context.Context, workspaceID, email string) (*domain.WorkspaceInvitation, error) {
	inv := &domain.WorkspaceInvitation{}
	err := db.Pool.QueryRow(ctx,
		`SELECT id, workspace_id, inviter_id, invitee_email, invitee_id, role, status, token, expires_at, created_at
		 FROM workspace_invitations 
		 WHERE workspace_id = $1 AND invitee_email = $2 AND status = 'pending' AND expires_at > now()`,
		workspaceID, email,
	).Scan(&inv.ID, &inv.WorkspaceID, &inv.InviterID, &inv.InviteeEmail, &inv.InviteeID,
		&inv.Role, &inv.Status, &inv.Token, &inv.ExpiresAt, &inv.CreatedAt)
	if err != nil {
		return nil, err // 没有找到或错误
	}
	return inv, nil
}

// CreateNotification 创建通知
func (db *DB) CreateNotification(ctx context.Context, notif *domain.Notification) error {
	err := db.Pool.QueryRow(ctx,
		`INSERT INTO notifications (user_id, type, title, content, data)
		 VALUES ($1, $2, $3, $4, $5) RETURNING id, is_read, created_at`,
		notif.UserID, notif.Type, notif.Title, notif.Content, notif.Data,
	).Scan(&notif.ID, &notif.IsRead, &notif.CreatedAt)
	if err != nil {
		return fmt.Errorf("创建通知失败: %w", err)
	}
	return nil
}

// GetNotificationsByUser 获取用户的通知列表
func (db *DB) GetNotificationsByUser(ctx context.Context, userID string, limit, offset int) ([]domain.Notification, error) {
	rows, err := db.Pool.Query(ctx,
		`SELECT id, user_id, type, title, content, data, is_read, created_at
		 FROM notifications
		 WHERE user_id = $1
		 ORDER BY created_at DESC
		 LIMIT $2 OFFSET $3`,
		userID, limit, offset,
	)
	if err != nil {
		return nil, fmt.Errorf("获取通知列表失败: %w", err)
	}
	defer rows.Close()

	var notifications []domain.Notification
	for rows.Next() {
		var n domain.Notification
		if err := rows.Scan(&n.ID, &n.UserID, &n.Type, &n.Title, &n.Content, &n.Data, &n.IsRead, &n.CreatedAt); err != nil {
			return nil, err
		}
		notifications = append(notifications, n)
	}
	return notifications, nil
}

// GetUnreadNotificationCount 获取未读通知数量
func (db *DB) GetUnreadNotificationCount(ctx context.Context, userID string) (int, error) {
	var count int
	err := db.Pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = FALSE`,
		userID,
	).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("获取未读通知数量失败: %w", err)
	}
	return count, nil
}

// MarkNotificationAsRead 标记通知为已读
func (db *DB) MarkNotificationAsRead(ctx context.Context, id string) error {
	_, err := db.Pool.Exec(ctx,
		`UPDATE notifications SET is_read = TRUE WHERE id = $1`,
		id,
	)
	if err != nil {
		return fmt.Errorf("标记通知已读失败: %w", err)
	}
	return nil
}

// MarkAllNotificationsAsRead 标记所有通知为已读
func (db *DB) MarkAllNotificationsAsRead(ctx context.Context, userID string) error {
	_, err := db.Pool.Exec(ctx,
		`UPDATE notifications SET is_read = TRUE WHERE user_id = $1`,
		userID,
	)
	if err != nil {
		return fmt.Errorf("标记所有通知已读失败: %w", err)
	}
	return nil
}
