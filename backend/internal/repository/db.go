package repository

import (
	"context"
	"daylog/internal/config"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
)

// DB 数据库连接池封装
type DB struct {
	Pool *pgxpool.Pool
}

// NewDB 创建数据库连接
func NewDB(cfg *config.DatabaseConfig) (*DB, error) {
	dsn := fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		cfg.Host, cfg.Port, cfg.User, cfg.Password, cfg.DBName, cfg.SSLMode,
	)

	pool, err := pgxpool.New(context.Background(), dsn)
	if err != nil {
		return nil, fmt.Errorf("无法连接数据库: %w", err)
	}

	if err := pool.Ping(context.Background()); err != nil {
		return nil, fmt.Errorf("数据库 ping 失败: %w", err)
	}

	return &DB{Pool: pool}, nil
}

// Close 关闭数据库连接
func (db *DB) Close() {
	db.Pool.Close()
}
