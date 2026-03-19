package handler

import (
	"daylog/internal/repository"
	"net/http"

	"github.com/gin-gonic/gin"
)

// SearchHandler 搜索处理器
type SearchHandler struct {
	db *repository.DB
}

// NewSearchHandler 创建搜索处理器
func NewSearchHandler(db *repository.DB) *SearchHandler {
	return &SearchHandler{db: db}
}

// Search 全文搜索
func (h *SearchHandler) Search(c *gin.Context) {
	query := c.Query("q")
	workspaceID := c.Query("workspace_id")

	if query == "" || workspaceID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "缺少 q 或 workspace_id 参数"})
		return
	}

	results, err := h.db.SearchPages(c.Request.Context(), workspaceID, query)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, results)
}
