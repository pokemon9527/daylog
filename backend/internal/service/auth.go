package service

import (
	"context"
	"daylog/internal/config"
	"daylog/internal/domain"
	"daylog/internal/repository"
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

// AuthService 认证服务
type AuthService struct {
	db  *repository.DB
	cfg *config.JWTConfig
}

// NewAuthService 创建认证服务
func NewAuthService(db *repository.DB, cfg *config.JWTConfig) *AuthService {
	return &AuthService{db: db, cfg: cfg}
}

// Register 用户注册
func (s *AuthService) Register(ctx context.Context, req *domain.RegisterRequest) (*domain.AuthResponse, error) {
	// 检查邮箱是否已存在
	existing, _ := s.db.GetUserByEmail(ctx, req.Email)
	if existing != nil {
		return nil, errors.New("邮箱已被注册")
	}

	// 加密密码
	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, errors.New("密码加密失败")
	}

	// 创建用户
	user := &domain.User{
		Email:        req.Email,
		PasswordHash: string(hash),
		DisplayName:  req.DisplayName,
	}
	if err := s.db.CreateUser(ctx, user); err != nil {
		return nil, err
	}

	// 创建默认工作空间（CreateUser 后 user.ID 已填充）
	ws := &domain.Workspace{
		Name:     user.DisplayName + " 的工作空间",
		OwnerID:  user.ID,
		Settings: "{}",
	}
	if err := s.db.CreateWorkspace(ctx, ws); err != nil {
		return nil, err
	}

	// 将创建者添加为 owner 成员
	member := &domain.WorkspaceMember{
		WorkspaceID: ws.ID,
		UserID:      user.ID,
		Role:        domain.RoleOwner,
	}
	_ = s.db.AddWorkspaceMember(ctx, member)

	// 生成 token
	token, err := s.generateToken(user.ID)
	if err != nil {
		return nil, err
	}

	return &domain.AuthResponse{Token: token, User: *user}, nil
}

// Login 用户登录
func (s *AuthService) Login(ctx context.Context, req *domain.LoginRequest) (*domain.AuthResponse, error) {
	user, err := s.db.GetUserByEmail(ctx, req.Email)
	if err != nil {
		return nil, errors.New("邮箱或密码错误")
	}

	// 验证密码
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		return nil, errors.New("邮箱或密码错误")
	}

	// 生成 token
	token, err := s.generateToken(user.ID)
	if err != nil {
		return nil, err
	}

	return &domain.AuthResponse{Token: token, User: *user}, nil
}

// generateToken 生成 JWT token
func (s *AuthService) generateToken(userID string) (string, error) {
	claims := jwt.MapClaims{
		"user_id": userID,
		"exp":     time.Now().Add(time.Duration(s.cfg.ExpireHours) * time.Hour).Unix(),
		"iat":     time.Now().Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(s.cfg.Secret))
}

// ValidateToken 验证 token
func (s *AuthService) ValidateToken(tokenStr string) (string, error) {
	token, err := jwt.Parse(tokenStr, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("无效的签名方法")
		}
		return []byte(s.cfg.Secret), nil
	})
	if err != nil {
		return "", err
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok || !token.Valid {
		return "", errors.New("无效的 token")
	}

	userID, ok := claims["user_id"].(string)
	if !ok {
		return "", errors.New("token 中缺少 user_id")
	}

	return userID, nil
}
