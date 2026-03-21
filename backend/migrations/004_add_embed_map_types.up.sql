-- 添加 embed 和 map 类型到 block_type 枚举
ALTER TYPE block_type ADD VALUE IF NOT EXISTS 'embed';
ALTER TYPE block_type ADD VALUE IF NOT EXISTS 'map';
