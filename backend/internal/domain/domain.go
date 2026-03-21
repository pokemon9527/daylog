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
	BlockTable            BlockType = "table"
	BlockEmbed            BlockType = "embed"
	BlockMap              BlockType = "map"
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
	SortOrder    float64   `json:"sort_order"`
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
	SortOrder *float64   `json:"sort_order"`
}

// ReorderBlocksRequest 重排序块请求
type ReorderBlocksRequest struct {
	BlockIDs  []string  `json:"block_ids" binding:"required"`
	SortOrder []float64 `json:"sort_order" binding:"required"`
}

// ReorderFilesRequest 重排序文件请求
type ReorderFilesRequest struct {
	FileIDs   []string  `json:"file_ids" binding:"required"`
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

// InvitationStatus 邀请状态
type InvitationStatus string

const (
	InvitationPending  InvitationStatus = "pending"
	InvitationAccepted InvitationStatus = "accepted"
	InvitationRejected InvitationStatus = "rejected"
	InvitationExpired  InvitationStatus = "expired"
)

// WorkspaceInvitation 工作空间邀请
type WorkspaceInvitation struct {
	ID           string           `json:"id"`
	WorkspaceID  string           `json:"workspace_id"`
	InviterID    string           `json:"inviter_id"`
	InviteeEmail string           `json:"invitee_email"`
	InviteeID    *string          `json:"invitee_id"`
	Role         WorkspaceRole    `json:"role"`
	Status       InvitationStatus `json:"status"`
	Token        string           `json:"token"`
	ExpiresAt    time.Time        `json:"expires_at"`
	CreatedAt    time.Time        `json:"created_at"`
}

// WorkspaceInvitationInfo 邀请详情（含关联信息）
type WorkspaceInvitationInfo struct {
	ID            string           `json:"id"`
	WorkspaceID   string           `json:"workspace_id"`
	WorkspaceName string           `json:"workspace_name"`
	WorkspaceIcon *string          `json:"workspace_icon"`
	InviterID     string           `json:"inviter_id"`
	InviterName   string           `json:"inviter_name"`
	InviteeEmail  string           `json:"invitee_email"`
	InviteeID     *string          `json:"invitee_id"`
	Role          WorkspaceRole    `json:"role"`
	Status        InvitationStatus `json:"status"`
	Token         string           `json:"token"`
	ExpiresAt     time.Time        `json:"expires_at"`
	CreatedAt     time.Time        `json:"created_at"`
}

// CreateInvitationRequest 创建邀请请求
type CreateInvitationRequest struct {
	Email string        `json:"email" binding:"required,email"`
	Role  WorkspaceRole `json:"role" binding:"required"`
}

// Notification 通知
type Notification struct {
	ID        string    `json:"id"`
	UserID    string    `json:"user_id"`
	Type      string    `json:"type"`
	Title     string    `json:"title"`
	Content   *string   `json:"content"`
	Data      JSONMap   `json:"data"`
	IsRead    bool      `json:"is_read"`
	CreatedAt time.Time `json:"created_at"`
}

// JSONMap JSON 对象类型
type JSONMap map[string]interface{}

// Admin 管理员模型
type Admin struct {
	ID           string    `json:"id"`
	Username     string    `json:"username"`
	PasswordHash string    `json:"-"`
	DisplayName  string    `json:"display_name"`
	Role         string    `json:"role"` // super_admin, admin, moderator
	IsActive     bool      `json:"is_active"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

// AdminLoginRequest 管理员登录请求
type AdminLoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

// AdminLoginResponse 管理员登录响应
type AdminLoginResponse struct {
	Token string `json:"token"`
	Admin Admin  `json:"admin"`
}

// ContentReview 内容审核记录
type ContentReview struct {
	ID         string     `json:"id"`
	PageID     *string    `json:"page_id"`
	BlockID    *string    `json:"block_id"`
	ReviewerID *string    `json:"reviewer_id"`
	Status     string     `json:"status"` // pending, approved, rejected, hidden
	Reason     *string    `json:"reason"`
	ReviewedAt *time.Time `json:"reviewed_at"`
	CreatedAt  time.Time  `json:"created_at"`
}

// ReviewContentRequest 审核内容请求
type ReviewContentRequest struct {
	Status string `json:"status" binding:"required"`
	Reason string `json:"reason"`
}

// SensitiveWord 敏感词
type SensitiveWord struct {
	ID        string    `json:"id"`
	Word      string    `json:"word"`
	Level     string    `json:"level"` // warning, block, delete
	CreatedAt time.Time `json:"created_at"`
}

// CreateSensitiveWordRequest 创建敏感词请求
type CreateSensitiveWordRequest struct {
	Word  string `json:"word" binding:"required"`
	Level string `json:"level" binding:"required"`
}

// AdminStats 管理员统计数据
type AdminStats struct {
	TotalUsers     int64 `json:"total_users"`
	TotalPages     int64 `json:"total_pages"`
	TotalBlocks    int64 `json:"total_blocks"`
	PendingReviews int64 `json:"pending_reviews"`
	HiddenPages    int64 `json:"hidden_pages"`
}

// PageWithReview 带审核状态的页面
type PageWithReview struct {
	Page
	ReviewStatus string `json:"review_status"`
	IsHidden     bool   `json:"is_hidden"`
	AuthorName   string `json:"author_name"`
	AuthorEmail  string `json:"author_email"`
}
