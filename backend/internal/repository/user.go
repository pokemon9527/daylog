package repository

import (
	"context"
	"daylog/internal/domain"
	"fmt"
)

// CreateUser 创建用户
func (db *DB) CreateUser(ctx context.Context, user *domain.User) error {
	err := db.Pool.QueryRow(ctx,
		`INSERT INTO users (email, password_hash, display_name) VALUES ($1, $2, $3) RETURNING id, created_at, updated_at`,
		user.Email, user.PasswordHash, user.DisplayName,
	).Scan(&user.ID, &user.CreatedAt, &user.UpdatedAt)
	if err != nil {
		return fmt.Errorf("创建用户失败: %w", err)
	}
	return nil
}

// GetUserByEmail 通过邮箱获取用户
func (db *DB) GetUserByEmail(ctx context.Context, email string) (*domain.User, error) {
	user := &domain.User{}
	err := db.Pool.QueryRow(ctx,
		`SELECT id, email, password_hash, display_name, avatar_url, created_at, updated_at FROM users WHERE email = $1`,
		email,
	).Scan(&user.ID, &user.Email, &user.PasswordHash, &user.DisplayName, &user.AvatarURL, &user.CreatedAt, &user.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("用户不存在: %w", err)
	}
	return user, nil
}

// GetUserByID 通过 ID 获取用户
func (db *DB) GetUserByID(ctx context.Context, id string) (*domain.User, error) {
	user := &domain.User{}
	err := db.Pool.QueryRow(ctx,
		`SELECT id, email, password_hash, display_name, avatar_url, created_at, updated_at FROM users WHERE id = $1`,
		id,
	).Scan(&user.ID, &user.Email, &user.PasswordHash, &user.DisplayName, &user.AvatarURL, &user.CreatedAt, &user.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("用户不存在: %w", err)
	}
	return user, nil
}
