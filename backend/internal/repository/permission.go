package repository

import (
	"context"
	"daylog/internal/domain"
	"fmt"
)

// AddPagePermission 添加页面权限
func (db *DB) AddPagePermission(ctx context.Context, perm *domain.PagePermissionRecord) error {
	err := db.Pool.QueryRow(ctx,
		`INSERT INTO page_permissions (page_id, user_id, role_granted, level) VALUES ($1, $2, $3, $4) RETURNING id, created_at`,
		perm.PageID, perm.UserID, perm.Role, perm.Level,
	).Scan(&perm.ID, &perm.CreatedAt)
	if err != nil {
		return fmt.Errorf("添加权限失败: %w", err)
	}
	return nil
}

// GetPagePermissions 获取页面权限列表
func (db *DB) GetPagePermissions(ctx context.Context, pageID string) ([]domain.PagePermissionRecord, error) {
	rows, err := db.Pool.Query(ctx,
		`SELECT id, page_id, user_id, role_granted, level, created_at
		 FROM page_permissions WHERE page_id = $1 ORDER BY created_at`,
		pageID,
	)
	if err != nil {
		return nil, fmt.Errorf("获取权限列表失败: %w", err)
	}
	defer rows.Close()

	var perms []domain.PagePermissionRecord
	for rows.Next() {
		var p domain.PagePermissionRecord
		if err := rows.Scan(&p.ID, &p.PageID, &p.UserID, &p.Role, &p.Level, &p.CreatedAt); err != nil {
			return nil, err
		}
		perms = append(perms, p)
	}
	return perms, nil
}

// RemovePagePermission 移除页面权限
func (db *DB) RemovePagePermission(ctx context.Context, permID string) error {
	_, err := db.Pool.Exec(ctx,
		`DELETE FROM page_permissions WHERE id = $1`,
		permID,
	)
	if err != nil {
		return fmt.Errorf("移除权限失败: %w", err)
	}
	return nil
}

// GetUserPagePermission 获取用户对页面的权限级别
func (db *DB) GetUserPagePermission(ctx context.Context, pageID, userID string) (*domain.PagePermission, error) {
	// 先获取页面所在的工作空间
	var workspaceID string
	err := db.Pool.QueryRow(ctx,
		`SELECT workspace_id FROM pages WHERE id = $1`, pageID,
	).Scan(&workspaceID)
	if err != nil {
		return nil, fmt.Errorf("页面不存在: %w", err)
	}

	// 获取用户在工作空间中的角色
	var role domain.WorkspaceRole
	err = db.Pool.QueryRow(ctx,
		`SELECT role FROM workspace_members WHERE workspace_id = $1 AND user_id = $2`,
		workspaceID, userID,
	).Scan(&role)
	if err != nil {
		// 用户不是工作空间成员
		perm := domain.PermissionCanView
		return &perm, nil
	}

	// owner 和 admin 默认有完全访问权限
	if role == domain.RoleOwner || role == domain.RoleAdmin {
		perm := domain.PermissionFullAccess
		return &perm, nil
	}

	// 查询页面级别的权限
	var level domain.PagePermission
	err = db.Pool.QueryRow(ctx,
		`SELECT level FROM page_permissions
		 WHERE page_id = $1 AND (user_id = $2 OR role_granted = $3)
		 ORDER BY
		   CASE level
		     WHEN 'full_access' THEN 4
		     WHEN 'can_edit' THEN 3
		     WHEN 'can_comment' THEN 2
		     WHEN 'can_view' THEN 1
		   END DESC
		 LIMIT 1`,
		pageID, userID, role,
	).Scan(&level)
	if err != nil {
		// 没有特定权限，默认为可编辑（成员）或可查看（访客）
		if role == domain.RoleGuest {
			perm := domain.PermissionCanView
			return &perm, nil
		}
		perm := domain.PermissionCanEdit
		return &perm, nil
	}

	return &level, nil
}
