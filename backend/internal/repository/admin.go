package repository

import (
	"context"
	"daylog/internal/domain"
	"fmt"
)

// GetAdminByUsername 通过用户名获取管理员
func (db *DB) GetAdminByUsername(ctx context.Context, username string) (*domain.Admin, error) {
	admin := &domain.Admin{}
	err := db.Pool.QueryRow(ctx,
		`SELECT id, username, password_hash, display_name, role, is_active, created_at, updated_at
		 FROM admins WHERE username = $1`,
		username,
	).Scan(&admin.ID, &admin.Username, &admin.PasswordHash, &admin.DisplayName,
		&admin.Role, &admin.IsActive, &admin.CreatedAt, &admin.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("管理员不存在: %w", err)
	}
	return admin, nil
}

// GetAdminByID 通过 ID 获取管理员
func (db *DB) GetAdminByID(ctx context.Context, id string) (*domain.Admin, error) {
	admin := &domain.Admin{}
	err := db.Pool.QueryRow(ctx,
		`SELECT id, username, password_hash, display_name, role, is_active, created_at, updated_at
		 FROM admins WHERE id = $1`,
		id,
	).Scan(&admin.ID, &admin.Username, &admin.PasswordHash, &admin.DisplayName,
		&admin.Role, &admin.IsActive, &admin.CreatedAt, &admin.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("管理员不存在: %w", err)
	}
	return admin, nil
}

// GetAllAdmins 获取所有管理员
func (db *DB) GetAllAdmins(ctx context.Context) ([]domain.Admin, error) {
	rows, err := db.Pool.Query(ctx,
		`SELECT id, username, password_hash, display_name, role, is_active, created_at, updated_at
		 FROM admins ORDER BY created_at DESC`)
	if err != nil {
		return nil, fmt.Errorf("获取管理员列表失败: %w", err)
	}
	defer rows.Close()

	var admins []domain.Admin
	for rows.Next() {
		var a domain.Admin
		if err := rows.Scan(&a.ID, &a.Username, &a.PasswordHash, &a.DisplayName,
			&a.Role, &a.IsActive, &a.CreatedAt, &a.UpdatedAt); err != nil {
			return nil, err
		}
		admins = append(admins, a)
	}
	return admins, nil
}

// GetAdminStats 获取统计数据
func (db *DB) GetAdminStats(ctx context.Context) (*domain.AdminStats, error) {
	stats := &domain.AdminStats{}

	// 获取用户总数
	err := db.Pool.QueryRow(ctx, `SELECT COUNT(*) FROM users`).Scan(&stats.TotalUsers)
	if err != nil {
		return nil, fmt.Errorf("获取用户数失败: %w", err)
	}

	// 获取页面总数
	err = db.Pool.QueryRow(ctx, `SELECT COUNT(*) FROM pages WHERE is_archived = FALSE`).Scan(&stats.TotalPages)
	if err != nil {
		return nil, fmt.Errorf("获取页面数失败: %w", err)
	}

	// 获取块总数
	err = db.Pool.QueryRow(ctx, `SELECT COUNT(*) FROM blocks WHERE is_archived = FALSE`).Scan(&stats.TotalBlocks)
	if err != nil {
		return nil, fmt.Errorf("获取块数失败: %w", err)
	}

	// 获取待审核数
	err = db.Pool.QueryRow(ctx, `SELECT COUNT(*) FROM content_reviews WHERE status = 'pending'`).Scan(&stats.PendingReviews)
	if err != nil {
		return nil, fmt.Errorf("获取待审核数失败: %w", err)
	}

	// 获取已隐藏页面数
	err = db.Pool.QueryRow(ctx, `SELECT COUNT(*) FROM pages WHERE is_hidden = TRUE`).Scan(&stats.HiddenPages)
	if err != nil {
		return nil, fmt.Errorf("获取隐藏页面数失败: %w", err)
	}

	return stats, nil
}

// GetPagesForReview 获取待审核页面
func (db *DB) GetPagesForReview(ctx context.Context, status string, limit, offset int) ([]domain.PageWithReview, error) {
	query := `
		SELECT p.id, p.workspace_id, p.parent_page_id, p.title, p.icon_emoji, p.sort_order,
		       p.is_archived, p.is_trash, p.created_by, p.last_edited_by, p.created_at, p.updated_at,
		       COALESCE(p.review_status, 'published'), COALESCE(p.is_hidden, FALSE),
		       u.display_name, u.email
		FROM pages p
		JOIN users u ON p.created_by = u.id
		WHERE p.is_archived = FALSE
	`
	args := []interface{}{}
	argIndex := 1

	if status != "" {
		if status == "hidden" {
			query += fmt.Sprintf(" AND p.is_hidden = TRUE")
		} else if status == "pending" {
			query += fmt.Sprintf(" AND p.review_status = 'pending'")
		} else {
			query += fmt.Sprintf(" AND p.review_status = $%d", argIndex)
			args = append(args, status)
			argIndex++
		}
	}

	query += fmt.Sprintf(" ORDER BY p.updated_at DESC LIMIT $%d OFFSET $%d", argIndex, argIndex+1)
	args = append(args, limit, offset)

	rows, err := db.Pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("获取页面列表失败: %w", err)
	}
	defer rows.Close()

	var pages []domain.PageWithReview
	for rows.Next() {
		var p domain.PageWithReview
		if err := rows.Scan(&p.ID, &p.WorkspaceID, &p.ParentPageID, &p.Title, &p.IconEmoji, &p.SortOrder,
			&p.IsArchived, &p.IsTrash, &p.CreatedBy, &p.LastEditedBy, &p.CreatedAt, &p.UpdatedAt,
			&p.ReviewStatus, &p.IsHidden, &p.AuthorName, &p.AuthorEmail); err != nil {
			return nil, err
		}
		pages = append(pages, p)
	}
	return pages, nil
}

// HidePage 隐藏页面
func (db *DB) HidePage(ctx context.Context, pageID string, reason string, reviewerID string) error {
	tx, err := db.Pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("开始事务失败: %w", err)
	}
	defer tx.Rollback(ctx)

	// 更新页面状态
	_, err = tx.Exec(ctx,
		`UPDATE pages SET is_hidden = TRUE, review_status = 'hidden', updated_at = now() WHERE id = $1`,
		pageID)
	if err != nil {
		return fmt.Errorf("隐藏页面失败: %w", err)
	}

	// 添加审核记录
	_, err = tx.Exec(ctx,
		`INSERT INTO content_reviews (page_id, reviewer_id, status, reason, reviewed_at)
		 VALUES ($1, $2, 'hidden', $3, now())`,
		pageID, reviewerID, reason)
	if err != nil {
		return fmt.Errorf("创建审核记录失败: %w", err)
	}

	return tx.Commit(ctx)
}

// UnhidePage 取消隐藏页面
func (db *DB) UnhidePage(ctx context.Context, pageID string, reviewerID string) error {
	tx, err := db.Pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("开始事务失败: %w", err)
	}
	defer tx.Rollback(ctx)

	// 更新页面状态
	_, err = tx.Exec(ctx,
		`UPDATE pages SET is_hidden = FALSE, review_status = 'approved', updated_at = now() WHERE id = $1`,
		pageID)
	if err != nil {
		return fmt.Errorf("取消隐藏失败: %w", err)
	}

	// 添加审核记录
	_, err = tx.Exec(ctx,
		`INSERT INTO content_reviews (page_id, reviewer_id, status, reviewed_at)
		 VALUES ($1, $2, 'approved', now())`,
		pageID, reviewerID)
	if err != nil {
		return fmt.Errorf("创建审核记录失败: %w", err)
	}

	return tx.Commit(ctx)
}

// CreateSensitiveWord 创建敏感词
func (db *DB) CreateSensitiveWord(ctx context.Context, word *domain.SensitiveWord) error {
	err := db.Pool.QueryRow(ctx,
		`INSERT INTO sensitive_words (word, level) VALUES ($1, $2) RETURNING id, created_at`,
		word.Word, word.Level,
	).Scan(&word.ID, &word.CreatedAt)
	if err != nil {
		return fmt.Errorf("创建敏感词失败: %w", err)
	}
	return nil
}

// GetSensitiveWords 获取敏感词列表
func (db *DB) GetSensitiveWords(ctx context.Context) ([]domain.SensitiveWord, error) {
	rows, err := db.Pool.Query(ctx,
		`SELECT id, word, level, created_at FROM sensitive_words ORDER BY created_at DESC`)
	if err != nil {
		return nil, fmt.Errorf("获取敏感词列表失败: %w", err)
	}
	defer rows.Close()

	var words []domain.SensitiveWord
	for rows.Next() {
		var w domain.SensitiveWord
		if err := rows.Scan(&w.ID, &w.Word, &w.Level, &w.CreatedAt); err != nil {
			return nil, err
		}
		words = append(words, w)
	}
	return words, nil
}

// DeleteSensitiveWord 删除敏感词
func (db *DB) DeleteSensitiveWord(ctx context.Context, id string) error {
	_, err := db.Pool.Exec(ctx, `DELETE FROM sensitive_words WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("删除敏感词失败: %w", err)
	}
	return nil
}

// CheckSensitiveContent 检查内容是否包含敏感词
func (db *DB) CheckSensitiveContent(ctx context.Context, content string) ([]domain.SensitiveWord, error) {
	rows, err := db.Pool.Query(ctx,
		`SELECT id, word, level, created_at FROM sensitive_words WHERE $1 ILIKE '%' || word || '%'`,
		content)
	if err != nil {
		return nil, fmt.Errorf("检查敏感词失败: %w", err)
	}
	defer rows.Close()

	var matched []domain.SensitiveWord
	for rows.Next() {
		var w domain.SensitiveWord
		if err := rows.Scan(&w.ID, &w.Word, &w.Level, &w.CreatedAt); err != nil {
			return nil, err
		}
		matched = append(matched, w)
	}
	return matched, nil
}
