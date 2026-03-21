package handler

import (
	"daylog/internal/repository"
	"net/http"

	"github.com/gin-gonic/gin"
)

// PublicHandler 公开访问处理器
type PublicHandler struct {
	db *repository.DB
}

// NewPublicHandler 创建公开访问处理器
func NewPublicHandler(db *repository.DB) *PublicHandler {
	return &PublicHandler{db: db}
}

// GetPublicPage 获取公开页面信息
func (h *PublicHandler) GetPublicPage(c *gin.Context) {
	pageID := c.Param("id")
	if pageID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "缺少页面ID"})
		return
	}

	page, err := h.db.GetPageByID(c.Request.Context(), pageID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "页面不存在"})
		return
	}

	// 检查页面是否允许公开访问（这里简单实现，所有页面都可访问）
	// 生产环境应该检查 is_public 字段
	if page.IsArchived {
		c.JSON(http.StatusForbidden, gin.H{"error": "页面已归档"})
		return
	}

	c.JSON(http.StatusOK, page)
}

// GetPublicPageBlocks 获取公开页面的块列表
func (h *PublicHandler) GetPublicPageBlocks(c *gin.Context) {
	pageID := c.Param("id")
	if pageID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "缺少页面ID"})
		return
	}

	// 先检查页面是否存在
	page, err := h.db.GetPageByID(c.Request.Context(), pageID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "页面不存在"})
		return
	}

	if page.IsArchived {
		c.JSON(http.StatusForbidden, gin.H{"error": "页面已归档"})
		return
	}

	blocks, err := h.db.GetBlocksByPageID(c.Request.Context(), pageID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, blocks)
}
