-- 启用必要的扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 用户表
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           TEXT UNIQUE NOT NULL,
    password_hash   TEXT NOT NULL,
    display_name    TEXT NOT NULL,
    avatar_url      TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 工作空间表
CREATE TABLE workspaces (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT NOT NULL,
    icon_emoji      TEXT,
    owner_id        UUID NOT NULL REFERENCES users(id),
    settings        JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 工作空间角色枚举
CREATE TYPE workspace_role AS ENUM ('owner', 'admin', 'member', 'guest');

-- 工作空间成员表
CREATE TABLE workspace_members (
    workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role            workspace_role NOT NULL DEFAULT 'member',
    joined_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (workspace_id, user_id)
);

-- 页面表
CREATE TABLE pages (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    parent_page_id  UUID REFERENCES pages(id) ON DELETE CASCADE,
    title           TEXT NOT NULL DEFAULT '',
    icon_emoji      TEXT,
    sort_order      DOUBLE PRECISION NOT NULL DEFAULT 0,
    is_archived     BOOLEAN NOT NULL DEFAULT FALSE,
    is_trash        BOOLEAN NOT NULL DEFAULT FALSE,
    created_by      UUID NOT NULL REFERENCES users(id),
    last_edited_by  UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pages_workspace ON pages(workspace_id);
CREATE INDEX idx_pages_parent ON pages(parent_page_id) WHERE parent_page_id IS NOT NULL;

-- 块类型枚举
CREATE TYPE block_type AS ENUM (
    'paragraph', 'heading_1', 'heading_2', 'heading_3',
    'bulleted_list_item', 'numbered_list_item', 'to_do', 'toggle',
    'code', 'quote', 'callout', 'divider', 'image', 'video',
    'file', 'bookmark', 'canvas'
);

-- 块表
CREATE TABLE blocks (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_id         UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
    parent_block_id UUID REFERENCES blocks(id) ON DELETE CASCADE,
    block_type      block_type NOT NULL,
    sort_order      DOUBLE PRECISION NOT NULL DEFAULT 0,
    content         JSONB NOT NULL DEFAULT '{}',
    props           JSONB NOT NULL DEFAULT '{}',
    is_archived     BOOLEAN NOT NULL DEFAULT FALSE,
    created_by      UUID NOT NULL REFERENCES users(id),
    last_edited_by  UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_blocks_page ON blocks(page_id);
CREATE INDEX idx_blocks_parent ON blocks(parent_block_id) WHERE parent_block_id IS NOT NULL;
CREATE INDEX idx_blocks_page_sort ON blocks(page_id, sort_order) WHERE NOT is_archived;

-- 文件附件表
CREATE TABLE file_attachments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    page_id         UUID REFERENCES pages(id) ON DELETE SET NULL,
    filename        TEXT NOT NULL,
    original_name   TEXT NOT NULL,
    mime_type       TEXT NOT NULL,
    file_size       BIGINT NOT NULL,
    storage_path    TEXT NOT NULL,
    uploaded_by     UUID NOT NULL REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_files_workspace ON file_attachments(workspace_id);
CREATE INDEX idx_files_page ON file_attachments(page_id) WHERE page_id IS NOT NULL;

-- 页面权限表
CREATE TYPE page_permission_level AS ENUM ('full_access', 'can_edit', 'can_comment', 'can_view');

CREATE TABLE page_permissions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_id         UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
    role_granted    workspace_role,
    level           page_permission_level NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_page_permissions_page ON page_permissions(page_id);
CREATE INDEX idx_page_permissions_user ON page_permissions(user_id) WHERE user_id IS NOT NULL;

-- CRDT 文档状态表
CREATE TABLE crdt_documents (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_id         UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
    state_vector    BYTEA NOT NULL DEFAULT '\x',
    document_state  BYTEA NOT NULL DEFAULT '\x',
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (page_id)
);

CREATE INDEX idx_crdt_page ON crdt_documents(page_id);

-- CRDT 更新日志表
CREATE TABLE crdt_updates (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    crdt_doc_id     UUID NOT NULL REFERENCES crdt_documents(id) ON DELETE CASCADE,
    page_id         UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
    update_data     BYTEA NOT NULL,
    client_id       TEXT NOT NULL,
    clock           BIGINT NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_crdt_updates_doc ON crdt_updates(crdt_doc_id, clock);
CREATE INDEX idx_crdt_updates_page ON crdt_updates(page_id, created_at);
