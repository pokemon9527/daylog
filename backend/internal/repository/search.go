package repository

import (
	"context"
	"daylog/internal/domain"
	"fmt"
)

// SearchPages 搜索页面标题和块内容
func (db *DB) SearchPages(ctx context.Context, workspaceID, query string) ([]domain.SearchResult, error) {
	rows, err := db.Pool.Query(ctx,
		`SELECT p.id, p.title,
		        COALESCE(
		          substring(
		            (SELECT b.content->'rich_text'->0->'text'->>'content'
		             FROM blocks b
		             WHERE b.page_id = p.id
		               AND NOT b.is_archived
		               AND b.content->'rich_text'->0->'text'->>'content' ILIKE '%' || $2 || '%'
		             LIMIT 1),
		            greatest(1, position(lower($2) in lower((SELECT b.content->'rich_text'->0->'text'->>'content' FROM blocks b WHERE b.page_id = p.id AND NOT b.is_archived AND b.content->'rich_text'->0->'text'->>'content' ILIKE '%' || $2 || '%' LIMIT 1))) - 50),
		            100
		          ),
		          ''
		        ) as preview,
		        CASE
		          WHEN p.title ILIKE '%' || $2 || '%' THEN 1.0
		          ELSE 0.5
		        END as score
		 FROM pages p
		 WHERE p.workspace_id = $1
		   AND NOT p.is_trash
		   AND NOT p.is_archived
		   AND (
		     p.title ILIKE '%' || $2 || '%'
		     OR EXISTS (
		       SELECT 1 FROM blocks b
		       WHERE b.page_id = p.id
		         AND NOT b.is_archived
		         AND b.content->'rich_text'->0->'text'->>'content' ILIKE '%' || $2 || '%'
		     )
		   )
		 ORDER BY score DESC, p.updated_at DESC
		 LIMIT 20`,
		workspaceID, query,
	)
	if err != nil {
		return nil, fmt.Errorf("搜索失败: %w", err)
	}
	defer rows.Close()

	var results []domain.SearchResult
	for rows.Next() {
		var r domain.SearchResult
		if err := rows.Scan(&r.PageID, &r.Title, &r.Preview, &r.Score); err != nil {
			return nil, err
		}
		results = append(results, r)
	}
	return results, nil
}
