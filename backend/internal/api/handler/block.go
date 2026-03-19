package handler

import (
	"daylog/internal/domain"
	"daylog/internal/repository"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

// BlockHandler 块处理器
type BlockHandler struct {
	db *repository.DB
}

// NewBlockHandler 创建块处理器
func NewBlockHandler(db *repository.DB) *BlockHandler {
	return &BlockHandler{db: db}
}

// CreateBlock 创建块
func (h *BlockHandler) CreateBlock(c *gin.Context) {
	var req domain.CreateBlockRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数错误: " + err.Error()})
		return
	}

	// JSONB 字段不能为空字符串，设置默认值
	if req.Content == "" {
		req.Content = "{}"
	}
	if req.Props == "" {
		req.Props = "{}"
	}

	userID := c.GetString("user_id")
	block := &domain.Block{
		PageID:        req.PageID,
		ParentBlockID: req.ParentBlockID,
		BlockType:     req.BlockType,
		Content:       req.Content,
		Props:         req.Props,
		CreatedBy:     userID,
	}

	// 计算 sort_order（放在末尾）
	blocks, _ := h.db.GetBlocksByPageID(c.Request.Context(), req.PageID)
	if len(blocks) > 0 {
		block.SortOrder = blocks[len(blocks)-1].SortOrder + 1000
	} else {
		block.SortOrder = 1000
	}

	if err := h.db.CreateBlock(c.Request.Context(), block); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, block)
}

// GetBlocks 获取页面下的块列表
func (h *BlockHandler) GetBlocks(c *gin.Context) {
	pageID := c.Query("page_id")
	if pageID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "缺少 page_id 参数"})
		return
	}

	blocks, err := h.db.GetBlocksByPageID(c.Request.Context(), pageID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, blocks)
}

// GetBlock 获取单个块
func (h *BlockHandler) GetBlock(c *gin.Context) {
	id := c.Param("id")
	block, err := h.db.GetBlockByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "块不存在"})
		return
	}
	c.JSON(http.StatusOK, block)
}

// UpdateBlock 更新块
func (h *BlockHandler) UpdateBlock(c *gin.Context) {
	id := c.Param("id")
	var req domain.UpdateBlockRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数错误: " + err.Error()})
		return
	}

	userID := c.GetString("user_id")
	if err := h.db.UpdateBlock(c.Request.Context(), id, &req, userID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "更新成功"})
}

// DeleteBlock 删除块
func (h *BlockHandler) DeleteBlock(c *gin.Context) {
	id := c.Param("id")
	if err := h.db.DeleteBlock(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "删除成功"})
}

// ReorderBlocks 重排序块
func (h *BlockHandler) ReorderBlocks(c *gin.Context) {
	var req domain.ReorderBlocksRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数错误: " + err.Error()})
		return
	}

	if len(req.BlockIDs) != len(req.SortOrder) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "block_ids 和 sort_order 长度不一致"})
		return
	}

	if err := h.db.ReorderBlocks(c.Request.Context(), req.BlockIDs, req.SortOrder); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "排序更新成功"})
}

// CreateBatchBlocks 批量创建块
func (h *BlockHandler) CreateBatchBlocks(c *gin.Context) {
	var reqs []domain.CreateBlockRequest
	if err := c.ShouldBindJSON(&reqs); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数错误: " + err.Error()})
		return
	}

	userID := c.GetString("user_id")
	var blocks []domain.Block

	for i, req := range reqs {
		// JSONB 字段不能为空字符串，设置默认值
		if req.Content == "" {
			req.Content = "{}"
		}
		if req.Props == "" {
			req.Props = "{}"
		}

		block := &domain.Block{
			PageID:        req.PageID,
			ParentBlockID: req.ParentBlockID,
			BlockType:     req.BlockType,
			Content:       req.Content,
			Props:         req.Props,
			SortOrder:     float64((i + 1) * 1000),
			CreatedBy:     userID,
		}

		if err := h.db.CreateBlock(c.Request.Context(), block); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "创建第 " + strconv.Itoa(i+1) + " 个块失败: " + err.Error()})
			return
		}
		blocks = append(blocks, *block)
	}

	c.JSON(http.StatusCreated, blocks)
}
