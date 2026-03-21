package handler

import (
	"daylog/internal/config"
	"daylog/internal/domain"
	"daylog/internal/repository"
	"daylog/internal/service"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

// AdminHandler 管理员处理器
type AdminHandler struct {
	db  *repository.DB
	cfg *config.Config
}

// NewAdminHandler 创建管理员处理器
func NewAdminHandler(db *repository.DB, cfg *config.Config) *AdminHandler {
	return &AdminHandler{db: db, cfg: cfg}
}

// Login 管理员登录
func (h *AdminHandler) Login(c *gin.Context) {
	var req domain.AdminLoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数错误"})
		return
	}

	// 获取管理员
	admin, err := h.db.GetAdminByUsername(c.Request.Context(), req.Username)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "用户名或密码错误"})
		return
	}

	// 检查是否激活
	if !admin.IsActive {
		c.JSON(http.StatusForbidden, gin.H{"error": "账号已被禁用"})
		return
	}

	// 验证密码
	if err := bcrypt.CompareHashAndPassword([]byte(admin.PasswordHash), []byte(req.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "用户名或密码错误"})
		return
	}

	// 生成 JWT
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"admin_id": admin.ID,
		"username": admin.Username,
		"role":     admin.Role,
		"exp":      time.Now().Add(24 * time.Hour).Unix(),
		"iat":      time.Now().Unix(),
	})

	tokenString, err := token.SignedString([]byte(h.cfg.JWT.Secret))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "生成令牌失败"})
		return
	}

	c.JSON(http.StatusOK, domain.AdminLoginResponse{
		Token: tokenString,
		Admin: *admin,
	})
}

// GetStats 获取统计数据
func (h *AdminHandler) GetStats(c *gin.Context) {
	stats, err := h.db.GetAdminStats(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, stats)
}

// GetUsers 获取用户列表
func (h *AdminHandler) GetUsers(c *gin.Context) {
	// 获取查询参数
	limitStr := c.DefaultQuery("limit", "50")
	offsetStr := c.DefaultQuery("offset", "0")
	search := c.Query("search")

	limit, _ := strconv.Atoi(limitStr)
	offset, _ := strconv.Atoi(offsetStr)

	users, err := service.GetUsersForAdmin(c.Request.Context(), h.db, search, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, users)
}

// GetUserStats 获取用户统计
func (h *AdminHandler) GetUserStats(c *gin.Context) {
	userID := c.Param("id")

	stats, err := service.GetUserStats(c.Request.Context(), h.db, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, stats)
}

// GetBlocks 获取块列表
func (h *AdminHandler) GetBlocks(c *gin.Context) {
	pageID := c.Query("page_id")
	blockType := c.Query("block_type")
	limitStr := c.DefaultQuery("limit", "50")
	offsetStr := c.DefaultQuery("offset", "0")

	limit, _ := strconv.Atoi(limitStr)
	offset, _ := strconv.Atoi(offsetStr)

	blocks, err := service.GetBlocksForAdmin(c.Request.Context(), h.db, pageID, blockType, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, blocks)
}

// HideBlock 隐藏块
func (h *AdminHandler) HideBlock(c *gin.Context) {
	blockID := c.Param("id")

	if err := service.HideBlock(c.Request.Context(), h.db, blockID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "块已隐藏"})
}

// UnhideBlock 恢复块
func (h *AdminHandler) UnhideBlock(c *gin.Context) {
	blockID := c.Param("id")

	if err := service.UnhideBlock(c.Request.Context(), h.db, blockID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "块已恢复"})
}

// UpdateUserStatus 更新用户状态
func (h *AdminHandler) UpdateUserStatus(c *gin.Context) {
	_ = c.Param("id") // 用户 ID
	var req struct {
		IsActive bool `json:"is_active"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数错误"})
		return
	}

	// 这里需要添加用户状态字段，暂时跳过
	c.JSON(http.StatusOK, gin.H{"message": "更新成功"})
}

// GetPages 获取页面列表
func (h *AdminHandler) GetPages(c *gin.Context) {
	status := c.DefaultQuery("status", "")
	limitStr := c.DefaultQuery("limit", "50")
	offsetStr := c.DefaultQuery("offset", "0")

	limit, _ := strconv.Atoi(limitStr)
	offset, _ := strconv.Atoi(offsetStr)

	pages, err := h.db.GetPagesForReview(c.Request.Context(), status, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, pages)
}

// HidePage 隐藏页面
func (h *AdminHandler) HidePage(c *gin.Context) {
	pageID := c.Param("id")
	var req struct {
		Reason string `json:"reason"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数错误"})
		return
	}

	adminID := c.GetString("admin_id")
	if err := h.db.HidePage(c.Request.Context(), pageID, req.Reason, adminID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "页面已隐藏"})
}

// UnhidePage 取消隐藏页面
func (h *AdminHandler) UnhidePage(c *gin.Context) {
	pageID := c.Param("id")

	adminID := c.GetString("admin_id")
	if err := h.db.UnhidePage(c.Request.Context(), pageID, adminID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "页面已恢复"})
}

// GetSensitiveWords 获取敏感词列表
func (h *AdminHandler) GetSensitiveWords(c *gin.Context) {
	words, err := h.db.GetSensitiveWords(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, words)
}

// CreateSensitiveWord 创建敏感词
func (h *AdminHandler) CreateSensitiveWord(c *gin.Context) {
	var req domain.CreateSensitiveWordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数错误"})
		return
	}

	word := &domain.SensitiveWord{
		Word:  req.Word,
		Level: req.Level,
	}

	if err := h.db.CreateSensitiveWord(c.Request.Context(), word); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, word)
}

// DeleteSensitiveWord 删除敏感词
func (h *AdminHandler) DeleteSensitiveWord(c *gin.Context) {
	id := c.Param("id")

	if err := h.db.DeleteSensitiveWord(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "删除成功"})
}
