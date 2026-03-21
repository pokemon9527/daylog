package service

import (
	"context"
	"daylog/internal/domain"
	"daylog/internal/repository"
	"fmt"
)

// GetUsersForAdmin 获取用户列表（管理员用）
func GetUsersForAdmin(ctx context.Context, db *repository.DB, search string, limit, offset int) ([]domain.User, error) {
	query := `SELECT id, email, display_name, avatar_url, created_at, updated_at FROM users WHERE 1=1`
	args := []interface{}{}
	argIndex := 1

	if search != "" {
		query += fmt.Sprintf(" AND (email ILIKE $%d OR display_name ILIKE $%d)", argIndex, argIndex)
		args = append(args, "%"+search+"%")
		argIndex++
	}

	query += fmt.Sprintf(" ORDER BY created_at DESC LIMIT $%d OFFSET $%d", argIndex, argIndex+1)
	args = append(args, limit, offset)

	rows, err := db.Pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("获取用户列表失败: %w", err)
	}
	defer rows.Close()

	var users []domain.User
	for rows.Next() {
		var u domain.User
		if err := rows.Scan(&u.ID, &u.Email, &u.DisplayName, &u.AvatarURL, &u.CreatedAt, &u.UpdatedAt); err != nil {
			return nil, err
		}
		users = append(users, u)
	}
	return users, nil
}

// GetUserStats 获取用户统计信息
func GetUserStats(ctx context.Context, db *repository.DB, userID string) (*UserStats, error) {
	stats := &UserStats{UserID: userID}

	// 获取用户的工作空间数
	err := db.Pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM workspace_members WHERE user_id = $1`, userID,
	).Scan(&stats.WorkspaceCount)
	if err != nil {
		return nil, fmt.Errorf("获取工作空间数失败: %w", err)
	}

	// 获取用户的页面数
	err = db.Pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM pages WHERE created_by = $1 AND is_archived = FALSE`, userID,
	).Scan(&stats.PageCount)
	if err != nil {
		return nil, fmt.Errorf("获取页面数失败: %w", err)
	}

	// 获取用户的块数
	err = db.Pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM blocks WHERE created_by = $1 AND is_archived = FALSE`, userID,
	).Scan(&stats.BlockCount)
	if err != nil {
		return nil, fmt.Errorf("获取块数失败: %w", err)
	}

	// 获取用户的文件数
	err = db.Pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM file_attachments WHERE uploaded_by = $1`, userID,
	).Scan(&stats.FileCount)
	if err != nil {
		return nil, fmt.Errorf("获取文件数失败: %w", err)
	}

	return stats, nil
}

// UserStats 用户统计信息
type UserStats struct {
	UserID         string `json:"user_id"`
	WorkspaceCount int    `json:"workspace_count"`
	PageCount      int    `json:"page_count"`
	BlockCount     int    `json:"block_count"`
	FileCount      int    `json:"file_count"`
}

// GetBlocksForAdmin 获取块列表（管理员用）
func GetBlocksForAdmin(ctx context.Context, db *repository.DB, pageID string, blockType string, limit, offset int) ([]domain.Block, error) {
	query := `SELECT id, page_id, parent_block_id, block_type, sort_order, content, props, is_archived, created_by, last_edited_by, created_at, updated_at 
	          FROM blocks WHERE is_archived = FALSE`
	args := []interface{}{}
	argIndex := 1

	if pageID != "" {
		query += fmt.Sprintf(" AND page_id = $%d", argIndex)
		args = append(args, pageID)
		argIndex++
	}

	if blockType != "" {
		query += fmt.Sprintf(" AND block_type = $%d", argIndex)
		args = append(args, blockType)
		argIndex++
	}

	query += fmt.Sprintf(" ORDER BY created_at DESC LIMIT $%d OFFSET $%d", argIndex, argIndex+1)
	args = append(args, limit, offset)

	rows, err := db.Pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("获取块列表失败: %w", err)
	}
	defer rows.Close()

	var blocks []domain.Block
	for rows.Next() {
		var b domain.Block
		if err := rows.Scan(&b.ID, &b.PageID, &b.ParentBlockID, &b.BlockType, &b.SortOrder,
			&b.Content, &b.Props, &b.IsArchived, &b.CreatedBy, &b.LastEditedBy, &b.CreatedAt, &b.UpdatedAt); err != nil {
			return nil, err
		}
		blocks = append(blocks, b)
	}
	return blocks, nil
}

// HideBlock 隐藏块
func HideBlock(ctx context.Context, db *repository.DB, blockID string) error {
	_, err := db.Pool.Exec(ctx,
		`UPDATE blocks SET is_archived = TRUE, updated_at = now() WHERE id = $1`, blockID)
	if err != nil {
		return fmt.Errorf("隐藏块失败: %w", err)
	}
	return nil
}

// UnhideBlock 恢复块
func UnhideBlock(ctx context.Context, db *repository.DB, blockID string) error {
	_, err := db.Pool.Exec(ctx,
		`UPDATE blocks SET is_archived = FALSE, updated_at = now() WHERE id = $1`, blockID)
	if err != nil {
		return fmt.Errorf("恢复块失败: %w", err)
	}
	return nil
}
