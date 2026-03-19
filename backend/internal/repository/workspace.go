package repository

import (
	"context"
	"daylog/internal/domain"
	"fmt"
)

// CreateWorkspace 创建工作空间
func (db *DB) CreateWorkspace(ctx context.Context, ws *domain.Workspace) error {
	err := db.Pool.QueryRow(ctx,
		`INSERT INTO workspaces (name, icon_emoji, owner_id, settings) VALUES ($1, $2, $3, $4) RETURNING id, created_at, updated_at`,
		ws.Name, ws.IconEmoji, ws.OwnerID, ws.Settings,
	).Scan(&ws.ID, &ws.CreatedAt, &ws.UpdatedAt)
	if err != nil {
		return fmt.Errorf("创建工作空间失败: %w", err)
	}
	return nil
}

// AddWorkspaceMember 添加工作空间成员
func (db *DB) AddWorkspaceMember(ctx context.Context, member *domain.WorkspaceMember) error {
	_, err := db.Pool.Exec(ctx,
		`INSERT INTO workspace_members (workspace_id, user_id, role) VALUES ($1, $2, $3)`,
		member.WorkspaceID, member.UserID, member.Role,
	)
	if err != nil {
		return fmt.Errorf("添加成员失败: %w", err)
	}
	return nil
}

// GetWorkspaceByID 获取工作空间
func (db *DB) GetWorkspaceByID(ctx context.Context, id string) (*domain.Workspace, error) {
	ws := &domain.Workspace{}
	err := db.Pool.QueryRow(ctx,
		`SELECT id, name, icon_emoji, owner_id, settings, created_at, updated_at FROM workspaces WHERE id = $1`,
		id,
	).Scan(&ws.ID, &ws.Name, &ws.IconEmoji, &ws.OwnerID, &ws.Settings, &ws.CreatedAt, &ws.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("工作空间不存在: %w", err)
	}
	return ws, nil
}

// GetUserWorkspaces 获取用户所属的工作空间
func (db *DB) GetUserWorkspaces(ctx context.Context, userID string) ([]domain.Workspace, error) {
	rows, err := db.Pool.Query(ctx,
		`SELECT w.id, w.name, w.icon_emoji, w.owner_id, w.settings, w.created_at, w.updated_at
		 FROM workspaces w
		 JOIN workspace_members wm ON w.id = wm.workspace_id
		 WHERE wm.user_id = $1
		 ORDER BY w.created_at DESC`,
		userID,
	)
	if err != nil {
		return nil, fmt.Errorf("获取工作空间列表失败: %w", err)
	}
	defer rows.Close()

	workspaces := make([]domain.Workspace, 0)
	for rows.Next() {
		var ws domain.Workspace
		if err := rows.Scan(&ws.ID, &ws.Name, &ws.IconEmoji, &ws.OwnerID, &ws.Settings, &ws.CreatedAt, &ws.UpdatedAt); err != nil {
			return nil, err
		}
		workspaces = append(workspaces, ws)
	}
	return workspaces, nil
}

// UpdateWorkspace 更新工作空间
func (db *DB) UpdateWorkspace(ctx context.Context, id string, req *domain.UpdateWorkspaceRequest) error {
	_, err := db.Pool.Exec(ctx,
		`UPDATE workspaces SET name = COALESCE($2, name), icon_emoji = COALESCE($3, icon_emoji), updated_at = now() WHERE id = $1`,
		id, req.Name, req.IconEmoji,
	)
	if err != nil {
		return fmt.Errorf("更新工作空间失败: %w", err)
	}
	return nil
}

// GetWorkspaceMembers 获取工作空间成员列表（含用户信息）
func (db *DB) GetWorkspaceMembers(ctx context.Context, workspaceID string) ([]domain.WorkspaceMemberInfo, error) {
	rows, err := db.Pool.Query(ctx,
		`SELECT wm.workspace_id, wm.user_id, u.email, u.display_name, u.avatar_url, wm.role, wm.joined_at
		 FROM workspace_members wm
		 JOIN users u ON wm.user_id = u.id
		 WHERE wm.workspace_id = $1
		 ORDER BY wm.role, wm.joined_at`,
		workspaceID,
	)
	if err != nil {
		return nil, fmt.Errorf("获取成员列表失败: %w", err)
	}
	defer rows.Close()

	members := make([]domain.WorkspaceMemberInfo, 0)
	for rows.Next() {
		var m domain.WorkspaceMemberInfo
		if err := rows.Scan(&m.WorkspaceID, &m.UserID, &m.Email, &m.DisplayName, &m.AvatarURL, &m.Role, &m.JoinedAt); err != nil {
			return nil, err
		}
		members = append(members, m)
	}
	return members, nil
}

// UpdateMemberRole 更新成员角色
func (db *DB) UpdateMemberRole(ctx context.Context, workspaceID, userID string, role domain.WorkspaceRole) error {
	_, err := db.Pool.Exec(ctx,
		`UPDATE workspace_members SET role = $3 WHERE workspace_id = $1 AND user_id = $2`,
		workspaceID, userID, role,
	)
	if err != nil {
		return fmt.Errorf("更新角色失败: %w", err)
	}
	return nil
}

// RemoveWorkspaceMember 移除工作空间成员
func (db *DB) RemoveWorkspaceMember(ctx context.Context, workspaceID, userID string) error {
	_, err := db.Pool.Exec(ctx,
		`DELETE FROM workspace_members WHERE workspace_id = $1 AND user_id = $2`,
		workspaceID, userID,
	)
	if err != nil {
		return fmt.Errorf("移除成员失败: %w", err)
	}
	return nil
}

// CheckWorkspaceMembership 检查用户是否为工作空间成员
func (db *DB) CheckWorkspaceMembership(ctx context.Context, workspaceID, userID string) (bool, error) {
	var count int
	err := db.Pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM workspace_members WHERE workspace_id = $1 AND user_id = $2`,
		workspaceID, userID,
	).Scan(&count)
	if err != nil {
		return false, fmt.Errorf("检查成员关系失败: %w", err)
	}
	return count > 0, nil
}
