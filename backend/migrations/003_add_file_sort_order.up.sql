-- 添加 sort_order 字段到 file_attachments 表
ALTER TABLE file_attachments ADD COLUMN IF NOT EXISTS sort_order DOUBLE PRECISION NOT NULL DEFAULT 0;

-- 为现有记录设置排序值（基于创建时间）
UPDATE file_attachments 
SET sort_order = EXTRACT(EPOCH FROM created_at)
WHERE sort_order = 0;

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_file_attachments_page_sort ON file_attachments(page_id, sort_order);
