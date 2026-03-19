package handler

import (
	"daylog/internal/config"
	"daylog/internal/domain"
	"daylog/internal/repository"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// FileHandler 文件处理器
type FileHandler struct {
	db  *repository.DB
	cfg *config.UploadConfig
}

// NewFileHandler 创建文件处理器
func NewFileHandler(db *repository.DB, cfg *config.UploadConfig) *FileHandler {
	return &FileHandler{db: db, cfg: cfg}
}

// UploadFile 上传文件
func (h *FileHandler) UploadFile(c *gin.Context) {
	// 限制请求体大小
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, h.cfg.MaxSize)

	// 解析 multipart 表单
	if err := c.Request.ParseMultipartForm(h.cfg.MaxSize); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "文件过大，最大允许 10MB"})
		return
	}

	file, header, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "获取文件失败"})
		return
	}
	defer file.Close()

	// 验证文件大小
	if header.Size > h.cfg.MaxSize {
		c.JSON(http.StatusBadRequest, gin.H{"error": "文件超过 10MB 限制"})
		return
	}

	// 生成唯一文件名
	ext := filepath.Ext(header.Filename)
	filename := uuid.New().String() + ext

	// 获取 workspace_id
	workspaceID := c.PostForm("workspace_id")
	if workspaceID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "缺少 workspace_id"})
		return
	}

	// 创建存储目录
	uploadDir := filepath.Join(h.cfg.Path, workspaceID)
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "创建存储目录失败"})
		return
	}

	// 保存文件
	storagePath := filepath.Join(uploadDir, filename)
	dst, err := os.Create(storagePath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "保存文件失败"})
		return
	}
	defer dst.Close()

	if _, err := io.Copy(dst, file); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "写入文件失败"})
		return
	}

	// 创建文件记录
	userID := c.GetString("user_id")
	pageID := c.PostForm("page_id")
	var pageIDPtr *string
	if pageID != "" {
		pageIDPtr = &pageID
	}

	fileRecord := &domain.FileAttachment{
		WorkspaceID:  workspaceID,
		PageID:       pageIDPtr,
		Filename:     filename,
		OriginalName: header.Filename,
		MimeType:     header.Header.Get("Content-Type"),
		FileSize:     header.Size,
		StoragePath:  storagePath,
		UploadedBy:   userID,
	}

	if err := h.db.CreateFileAttachment(c.Request.Context(), fileRecord); err != nil {
		// 回滚：删除已保存的文件
		os.Remove(storagePath)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "创建文件记录失败"})
		return
	}

	c.JSON(http.StatusCreated, fileRecord)
}

// DownloadFile 下载文件
func (h *FileHandler) DownloadFile(c *gin.Context) {
	id := c.Param("id")
	file, err := h.db.GetFileByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "文件不存在"})
		return
	}

	// 检查文件是否存在
	if _, err := os.Stat(file.StoragePath); os.IsNotExist(err) {
		c.JSON(http.StatusNotFound, gin.H{"error": "文件已丢失"})
		return
	}

	// 设置响应头
	c.Header("Content-Description", "File Transfer")
	c.Header("Content-Transfer-Encoding", "binary")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename*=UTF-8''%s", url.PathEscape(file.OriginalName)))
	c.Header("Content-Type", file.MimeType)

	c.File(file.StoragePath)
}

// GetPageFiles 获取页面下的文件列表
func (h *FileHandler) GetPageFiles(c *gin.Context) {
	pageID := c.Query("page_id")
	if pageID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "缺少 page_id 参数"})
		return
	}

	files, err := h.db.GetFilesByPageID(c.Request.Context(), pageID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, files)
}

// ServeFile 预览文件（内联显示）
func (h *FileHandler) ServeFile(c *gin.Context) {
	id := c.Param("id")
	file, err := h.db.GetFileByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "文件不存在"})
		return
	}

	if _, err := os.Stat(file.StoragePath); os.IsNotExist(err) {
		c.JSON(http.StatusNotFound, gin.H{"error": "文件已丢失"})
		return
	}

	c.Header("Content-Type", file.MimeType)
	c.Header("Content-Disposition", fmt.Sprintf("inline; filename*=UTF-8''%s", url.PathEscape(file.OriginalName)))
	c.Header("Cache-Control", "public, max-age=31536000")
	c.File(file.StoragePath)
}

// CleanupExpiredUploads 清理过期的临时上传（可定时任务调用）
func (h *FileHandler) CleanupExpiredUploads() {
	_ = time.Now()
	// TODO: 实现定时清理逻辑
}
