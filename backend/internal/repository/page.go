package repository

import (
	"context"
	"daylog/internal/domain"
	"fmt"
)

// CreatePage 创建页面
func (db *DB) CreatePage(ctx context.Context, page *domain.Page) error {
	err := db.Pool.QueryRow(ctx,
		`INSERT INTO pages (workspace_id, parent_page_id, title, icon_emoji, sort_order, created_by)
		 VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, created_at, updated_at`,
		page.WorkspaceID, page.ParentPageID, page.Title, page.IconEmoji, page.SortOrder, page.CreatedBy,
	).Scan(&page.ID, &page.CreatedAt, &page.UpdatedAt)
	if err != nil {
		return fmt.Errorf("创建页面失败: %w", err)
	}
	return nil
}

// GetPageByID 获取页面
func (db *DB) GetPageByID(ctx context.Context, id string) (*domain.Page, error) {
	page := &domain.Page{}
	err := db.Pool.QueryRow(ctx,
		`SELECT id, workspace_id, parent_page_id, title, icon_emoji, sort_order, is_archived, is_trash, created_by, last_edited_by, created_at, updated_at
		 FROM pages WHERE id = $1`,
		id,
	).Scan(&page.ID, &page.WorkspaceID, &page.ParentPageID, &page.Title, &page.IconEmoji, &page.SortOrder,
		&page.IsArchived, &page.IsTrash, &page.CreatedBy, &page.LastEditedBy, &page.CreatedAt, &page.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("页面不存在: %w", err)
	}
	return page, nil
}

// GetWorkspacePages 获取工作空间下的所有页面
func (db *DB) GetWorkspacePages(ctx context.Context, workspaceID string) ([]domain.Page, error) {
	rows, err := db.Pool.Query(ctx,
		`SELECT id, workspace_id, parent_page_id, title, icon_emoji, sort_order, is_archived, is_trash, created_by, last_edited_by, created_at, updated_at
		 FROM pages WHERE workspace_id = $1 AND NOT is_trash ORDER BY sort_order`,
		workspaceID,
	)
	if err != nil {
		return nil, fmt.Errorf("获取页面列表失败: %w", err)
	}
	defer rows.Close()

	var pages []domain.Page
	for rows.Next() {
		var p domain.Page
		if err := rows.Scan(&p.ID, &p.WorkspaceID, &p.ParentPageID, &p.Title, &p.IconEmoji, &p.SortOrder,
			&p.IsArchived, &p.IsTrash, &p.CreatedBy, &p.LastEditedBy, &p.CreatedAt, &p.UpdatedAt); err != nil {
			return nil, err
		}
		pages = append(pages, p)
	}
	return pages, nil
}

// UpdatePage 更新页面
func (db *DB) UpdatePage(ctx context.Context, id string, req *domain.UpdatePageRequest, editorID string) error {
	_, err := db.Pool.Exec(ctx,
		`UPDATE pages SET title = COALESCE($2, title), icon_emoji = COALESCE($3, icon_emoji), last_edited_by = $4, updated_at = now() WHERE id = $1`,
		id, req.Title, req.IconEmoji, editorID,
	)
	if err != nil {
		return fmt.Errorf("更新页面失败: %w", err)
	}
	return nil
}

// DeletePage 软删除页面
func (db *DB) DeletePage(ctx context.Context, id string) error {
	_, err := db.Pool.Exec(ctx,
		`UPDATE pages SET is_trash = TRUE, updated_at = now() WHERE id = $1`,
		id,
	)
	if err != nil {
		return fmt.Errorf("删除页面失败: %w", err)
	}
	return nil
}
