package repository

import (
	"context"
	"daylog/internal/domain"
	"fmt"
)

// CreateFileAttachment 创建文件附件记录
func (db *DB) CreateFileAttachment(ctx context.Context, file *domain.FileAttachment) error {
	err := db.Pool.QueryRow(ctx,
		`INSERT INTO file_attachments (workspace_id, page_id, filename, original_name, mime_type, file_size, storage_path, uploaded_by, sort_order)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id, created_at`,
		file.WorkspaceID, file.PageID, file.Filename, file.OriginalName, file.MimeType, file.FileSize, file.StoragePath, file.UploadedBy, file.SortOrder,
	).Scan(&file.ID, &file.CreatedAt)
	if err != nil {
		return fmt.Errorf("创建文件记录失败: %w", err)
	}
	return nil
}

// GetFileByID 获取文件附件
func (db *DB) GetFileByID(ctx context.Context, id string) (*domain.FileAttachment, error) {
	file := &domain.FileAttachment{}
	err := db.Pool.QueryRow(ctx,
		`SELECT id, workspace_id, page_id, filename, original_name, mime_type, file_size, storage_path, uploaded_by, sort_order, created_at
		 FROM file_attachments WHERE id = $1`,
		id,
	).Scan(&file.ID, &file.WorkspaceID, &file.PageID, &file.Filename, &file.OriginalName, &file.MimeType,
		&file.FileSize, &file.StoragePath, &file.UploadedBy, &file.SortOrder, &file.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("文件不存在: %w", err)
	}
	return file, nil
}

// GetFilesByPageID 获取页面下的所有文件
func (db *DB) GetFilesByPageID(ctx context.Context, pageID string) ([]domain.FileAttachment, error) {
	rows, err := db.Pool.Query(ctx,
		`SELECT id, workspace_id, page_id, filename, original_name, mime_type, file_size, storage_path, uploaded_by, sort_order, created_at
		 FROM file_attachments WHERE page_id = $1 ORDER BY sort_order ASC, created_at DESC`,
		pageID,
	)
	if err != nil {
		return nil, fmt.Errorf("获取文件列表失败: %w", err)
	}
	defer rows.Close()

	files := make([]domain.FileAttachment, 0)
	for rows.Next() {
		var f domain.FileAttachment
		if err := rows.Scan(&f.ID, &f.WorkspaceID, &f.PageID, &f.Filename, &f.OriginalName, &f.MimeType,
			&f.FileSize, &f.StoragePath, &f.UploadedBy, &f.SortOrder, &f.CreatedAt); err != nil {
			return nil, err
		}
		files = append(files, f)
	}
	return files, nil
}

// DeleteFileAttachment 删除文件附件记录
func (db *DB) DeleteFileAttachment(ctx context.Context, id string) error {
	_, err := db.Pool.Exec(ctx,
		`DELETE FROM file_attachments WHERE id = $1`,
		id,
	)
	if err != nil {
		return fmt.Errorf("删除文件记录失败: %w", err)
	}
	return nil
}

// ReorderFiles 批量重排序文件
func (db *DB) ReorderFiles(ctx context.Context, fileIDs []string, sortOrders []float64) error {
	tx, err := db.Pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("开始事务失败: %w", err)
	}
	defer tx.Rollback(ctx)

	for i, id := range fileIDs {
		_, err := tx.Exec(ctx,
			`UPDATE file_attachments SET sort_order = $2 WHERE id = $1`,
			id, sortOrders[i],
		)
		if err != nil {
			return fmt.Errorf("更新文件排序失败: %w", err)
		}
	}

	return tx.Commit(ctx)
}
