package config

import (
	"os"
)

// Config 应用配置
type Config struct {
	Server   ServerConfig
	Database DatabaseConfig
	JWT      JWTConfig
	Upload   UploadConfig
}

// ServerConfig 服务器配置
type ServerConfig struct {
	Port string
}

// DatabaseConfig 数据库配置
type DatabaseConfig struct {
	Host     string
	Port     string
	User     string
	Password string
	DBName   string
	SSLMode  string
}

// JWTConfig JWT 配置
type JWTConfig struct {
	Secret      string
	ExpireHours int
}

// UploadConfig 文件上传配置
type UploadConfig struct {
	MaxSize int64  // 最大文件大小（字节）
	Path    string // 上传文件存储路径
}

// Load 加载配置
func Load() *Config {
	return &Config{
		Server: ServerConfig{
			Port: getEnv("SERVER_PORT", "8080"),
		},
		Database: DatabaseConfig{
			Host:     getEnv("DB_HOST", "localhost"),
			Port:     getEnv("DB_PORT", "5432"),
			User:     getEnv("DB_USER", "daylog"),
			Password: getEnv("DB_PASSWORD", "daylog123"),
			DBName:   getEnv("DB_NAME", "daylog"),
			SSLMode:  getEnv("DB_SSLMODE", "disable"),
		},
		JWT: JWTConfig{
			Secret:      getEnv("JWT_SECRET", "daylog-secret-key-change-in-production"),
			ExpireHours: 168, // 7天
		},
		Upload: UploadConfig{
			MaxSize: 10 << 20, // 10MB
			Path:    getEnv("UPLOAD_PATH", "./uploads"),
		},
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
