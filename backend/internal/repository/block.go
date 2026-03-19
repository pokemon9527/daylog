package repository

import (
	"context"
	"daylog/internal/domain"
	"fmt"
)

// CreateBlock 创建块
func (db *DB) CreateBlock(ctx context.Context, block *domain.Block) error {
	err := db.Pool.QueryRow(ctx,
		`INSERT INTO blocks (page_id, parent_block_id, block_type, sort_order, content, props, created_by)
		 VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, created_at, updated_at`,
		block.PageID, block.ParentBlockID, block.BlockType, block.SortOrder, block.Content, block.Props, block.CreatedBy,
	).Scan(&block.ID, &block.CreatedAt, &block.UpdatedAt)
	if err != nil {
		return fmt.Errorf("创建块失败: %w", err)
	}
	return nil
}

// GetBlocksByPageID 获取页面下的所有块
func (db *DB) GetBlocksByPageID(ctx context.Context, pageID string) ([]domain.Block, error) {
	rows, err := db.Pool.Query(ctx,
		`SELECT id, page_id, parent_block_id, block_type, sort_order, content, props, is_archived, created_by, last_edited_by, created_at, updated_at
		 FROM blocks WHERE page_id = $1 AND NOT is_archived ORDER BY sort_order`,
		pageID,
	)
	if err != nil {
		return nil, fmt.Errorf("获取块列表失败: %w", err)
	}
	defer rows.Close()

	blocks := make([]domain.Block, 0)
	for rows.Next() {
		var b domain.Block
		if err := rows.Scan(&b.ID, &b.PageID, &b.ParentBlockID, &b.BlockType, &b.SortOrder, &b.Content, &b.Props,
			&b.IsArchived, &b.CreatedBy, &b.LastEditedBy, &b.CreatedAt, &b.UpdatedAt); err != nil {
			return nil, err
		}
		blocks = append(blocks, b)
	}
	return blocks, nil
}

// GetBlockByID 获取块
func (db *DB) GetBlockByID(ctx context.Context, id string) (*domain.Block, error) {
	block := &domain.Block{}
	err := db.Pool.QueryRow(ctx,
		`SELECT id, page_id, parent_block_id, block_type, sort_order, content, props, is_archived, created_by, last_edited_by, created_at, updated_at
		 FROM blocks WHERE id = $1`,
		id,
	).Scan(&block.ID, &block.PageID, &block.ParentBlockID, &block.BlockType, &block.SortOrder, &block.Content, &block.Props,
		&block.IsArchived, &block.CreatedBy, &block.LastEditedBy, &block.CreatedAt, &block.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("块不存在: %w", err)
	}
	return block, nil
}

// UpdateBlock 更新块
func (db *DB) UpdateBlock(ctx context.Context, id string, req *domain.UpdateBlockRequest, editorID string) error {
	_, err := db.Pool.Exec(ctx,
		`UPDATE blocks SET block_type = COALESCE($2, block_type), content = COALESCE($3, content), props = COALESCE($4, props), last_edited_by = $5, updated_at = now() WHERE id = $1`,
		id, req.BlockType, req.Content, req.Props, editorID,
	)
	if err != nil {
		return fmt.Errorf("更新块失败: %w", err)
	}
	return nil
}

// DeleteBlock 软删除块
func (db *DB) DeleteBlock(ctx context.Context, id string) error {
	_, err := db.Pool.Exec(ctx,
		`UPDATE blocks SET is_archived = TRUE, updated_at = now() WHERE id = $1`,
		id,
	)
	if err != nil {
		return fmt.Errorf("删除块失败: %w", err)
	}
	return nil
}

// ReorderBlocks 批量重排序块
func (db *DB) ReorderBlocks(ctx context.Context, blockIDs []string, sortOrders []float64) error {
	tx, err := db.Pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("开始事务失败: %w", err)
	}
	defer tx.Rollback(ctx)

	for i, id := range blockIDs {
		_, err := tx.Exec(ctx,
			`UPDATE blocks SET sort_order = $2, updated_at = now() WHERE id = $1`,
			id, sortOrders[i],
		)
		if err != nil {
			return fmt.Errorf("更新块排序失败: %w", err)
		}
	}

	return tx.Commit(ctx)
}
