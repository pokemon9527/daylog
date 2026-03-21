-- 管理员表
CREATE TABLE IF NOT EXISTS admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    display_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin', -- super_admin, admin, moderator
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 内容审核记录表
CREATE TABLE IF NOT EXISTS content_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_id UUID REFERENCES pages(id) ON DELETE CASCADE,
    block_id UUID REFERENCES blocks(id) ON DELETE CASCADE,
    reviewer_id UUID REFERENCES admins(id),
    status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected, hidden
    reason TEXT,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 敏感词表
CREATE TABLE IF NOT EXISTS sensitive_words (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    word TEXT NOT NULL,
    level TEXT NOT NULL DEFAULT 'warning', -- warning, block, delete
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 用户添加审核状态字段
ALTER TABLE pages ADD COLUMN IF NOT EXISTS review_status TEXT DEFAULT 'published';
ALTER TABLE pages ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT FALSE;

-- 索引
CREATE INDEX IF NOT EXISTS idx_admins_username ON admins(username);
CREATE INDEX IF NOT EXISTS idx_content_reviews_page ON content_reviews(page_id);
CREATE INDEX IF NOT EXISTS idx_content_reviews_status ON content_reviews(status);
CREATE INDEX IF NOT EXISTS idx_sensitive_words_word ON sensitive_words(word);
CREATE INDEX IF NOT EXISTS idx_pages_review_status ON pages(review_status);

-- 插入默认管理员 (密码: admin123)
INSERT INTO admins (username, password_hash, display_name, role) 
VALUES ('admin', '$2a$10$rDkOlaGbGcEfRFKR1vQz4OE5P8V5YQ3BVk9lFkFqYzFvqP9dYvGyS', '系统管理员', 'super_admin')
ON CONFLICT (username) DO NOTHING;
