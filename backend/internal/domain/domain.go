package domain

import (
	"time"
)

// User 用户模型
type User struct {
	ID           string    `json:"id"`
	Email        string    `json:"email"`
	PasswordHash string    `json:"-"`
	DisplayName  string    `json:"display_name"`
	AvatarURL    *string   `json:"avatar_url"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

// Workspace 工作空间模型
type Workspace struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	IconEmoji *string   `json:"icon_emoji"`
	OwnerID   string    `json:"owner_id"`
	Settings  string    `json:"settings"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// WorkspaceRole 工作空间角色
type WorkspaceRole string

const (
	RoleOwner  WorkspaceRole = "owner"
	RoleAdmin  WorkspaceRole = "admin"
	RoleMember WorkspaceRole = "member"
	RoleGuest  WorkspaceRole = "guest"
)

// WorkspaceMember 工作空间成员
type WorkspaceMember struct {
	WorkspaceID string        `json:"workspace_id"`
	UserID      string        `json:"user_id"`
	Role        WorkspaceRole `json:"role"`
	JoinedAt    time.Time     `json:"joined_at"`
}

// Page 页面模型
type Page struct {
	ID           string    `json:"id"`
	WorkspaceID  string    `json:"workspace_id"`
	ParentPageID *string   `json:"parent_page_id"`
	Title        string    `json:"title"`
	IconEmoji    *string   `json:"icon_emoji"`
	SortOrder    float64   `json:"sort_order"`
	IsArchived   bool      `json:"is_archived"`
	IsTrash      bool      `json:"is_trash"`
	CreatedBy    string    `json:"created_by"`
	LastEditedBy *string   `json:"last_edited_by"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

// BlockType 块类型
type BlockType string

const (
	BlockParagraph        BlockType = "paragraph"
	BlockHeading1         BlockType = "heading_1"
	BlockHeading2         BlockType = "heading_2"
	BlockHeading3         BlockType = "heading_3"
	BlockBulletedListItem BlockType = "bulleted_list_item"
	BlockNumberedListItem BlockType = "numbered_list_item"
	BlockTodo             BlockType = "to_do"
	BlockToggle           BlockType = "toggle"
	BlockCode             BlockType = "code"
	BlockQuote            BlockType = "quote"
	BlockCallout          BlockType = "callout"
	BlockDivider          BlockType = "divider"
	BlockImage            BlockType = "image"
	BlockFile             BlockType = "file"
	BlockBookmark         BlockType = "bookmark"
	BlockCanvas           BlockType = "canvas"
)

// Block 块模型
type Block struct {
	ID            string    `json:"id"`
	PageID        string    `json:"page_id"`
	ParentBlockID *string   `json:"parent_block_id"`
	BlockType     BlockType `json:"block_type"`
	SortOrder     float64   `json:"sort_order"`
	Content       string    `json:"content"` // JSONB 内容
	Props         string    `json:"props"`   // JSONB 属性
	IsArchived    bool      `json:"is_archived"`
	CreatedBy     string    `json:"created_by"`
	LastEditedBy  *string   `json:"last_edited_by"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

// FileAttachment 文件附件模型
type FileAttachment struct {
	ID           string    `json:"id"`
	WorkspaceID  string    `json:"workspace_id"`
	PageID       *string   `json:"page_id"`
	Filename     string    `json:"filename"`
	OriginalName string    `json:"original_name"`
	MimeType     string    `json:"mime_type"`
	FileSize     int64     `json:"file_size"`
	StoragePath  string    `json:"storage_path"`
	UploadedBy   string    `json:"uploaded_by"`
	CreatedAt    time.Time `json:"created_at"`
}

// RegisterRequest 注册请求
type RegisterRequest struct {
	Email       string `json:"email" binding:"required,email"`
	Password    string `json:"password" binding:"required,min=6"`
	DisplayName string `json:"display_name" binding:"required"`
}

// LoginRequest 登录请求
type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

// AuthResponse 认证响应
type AuthResponse struct {
	Token string `json:"token"`
	User  User   `json:"user"`
}

// CreatePageRequest 创建页面请求
type CreatePageRequest struct {
	WorkspaceID  string  `json:"workspace_id" binding:"required"`
	ParentPageID *string `json:"parent_page_id"`
	Title        string  `json:"title"`
	IconEmoji    *string `json:"icon_emoji"`
}

// UpdatePageRequest 更新页面请求
type UpdatePageRequest struct {
	Title     *string `json:"title"`
	IconEmoji *string `json:"icon_emoji"`
}

// CreateBlockRequest 创建块请求
type CreateBlockRequest struct {
	PageID        string    `json:"page_id" binding:"required"`
	ParentBlockID *string   `json:"parent_block_id"`
	BlockType     BlockType `json:"block_type" binding:"required"`
	Content       string    `json:"content"`
	Props         string    `json:"props"`
}

// UpdateBlockRequest 更新块请求
type UpdateBlockRequest struct {
	BlockType *BlockType `json:"block_type"`
	Content   *string    `json:"content"`
	Props     *string    `json:"props"`
}

// ReorderBlocksRequest 重排序块请求
type ReorderBlocksRequest struct {
	BlockIDs  []string  `json:"block_ids" binding:"required"`
	SortOrder []float64 `json:"sort_order" binding:"required"`
}

// CreateWorkspaceRequest 创建工作空间请求
type CreateWorkspaceRequest struct {
	Name      string  `json:"name" binding:"required"`
	IconEmoji *string `json:"icon_emoji"`
}

// UpdateWorkspaceRequest 更新工作空间请求
type UpdateWorkspaceRequest struct {
	Name      *string `json:"name"`
	IconEmoji *string `json:"icon_emoji"`
}

// AddMemberRequest 添加成员请求
type AddMemberRequest struct {
	Email string        `json:"email" binding:"required,email"`
	Role  WorkspaceRole `json:"role" binding:"required"`
}

// UpdateMemberRequest 更新成员角色请求
type UpdateMemberRequest struct {
	Role WorkspaceRole `json:"role" binding:"required"`
}

// PagePermission 页面权限级别
type PagePermission string

const (
	PermissionFullAccess PagePermission = "full_access"
	PermissionCanEdit    PagePermission = "can_edit"
	PermissionCanComment PagePermission = "can_comment"
	PermissionCanView    PagePermission = "can_view"
)

// PagePermissionRecord 页面权限记录
type PagePermissionRecord struct {
	ID        string         `json:"id"`
	PageID    string         `json:"page_id"`
	UserID    *string        `json:"user_id"`
	Role      *WorkspaceRole `json:"role_granted"`
	Level     PagePermission `json:"level"`
	CreatedAt time.Time      `json:"created_at"`
}

// AddPagePermissionRequest 添加页面权限请求
type AddPagePermissionRequest struct {
	UserID *string        `json:"user_id"`
	Role   *WorkspaceRole `json:"role_granted"`
	Level  PagePermission `json:"level" binding:"required"`
}

// WorkspaceMemberInfo 工作空间成员信息（含用户详情）
type WorkspaceMemberInfo struct {
	WorkspaceID string        `json:"workspace_id"`
	UserID      string        `json:"user_id"`
	Email       string        `json:"email"`
	DisplayName string        `json:"display_name"`
	AvatarURL   *string       `json:"avatar_url"`
	Role        WorkspaceRole `json:"role"`
	JoinedAt    time.Time     `json:"joined_at"`
}

// SearchRequest 搜索请求
type SearchRequest struct {
	Query       string `form:"q" binding:"required"`
	WorkspaceID string `form:"workspace_id" binding:"required"`
}

// SearchResult 搜索结果
type SearchResult struct {
	PageID  string  `json:"page_id"`
	Title   string  `json:"title"`
	Preview string  `json:"preview"`
	Score   float64 `json:"score"`
}
