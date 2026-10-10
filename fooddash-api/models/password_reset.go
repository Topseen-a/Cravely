package models

import (
	"time"

	"gorm.io/gorm"
)

// PasswordReset is a one-time password reset link. Only a SHA-256 hash of
// the token is stored, so a database leak can't be used to reset passwords.
type PasswordReset struct {
	gorm.Model
	UserID    uint   `gorm:"index;not null"`
	TokenHash string `gorm:"uniqueIndex;size:64;not null"`
	ExpiresAt time.Time
	UsedAt    *time.Time
}
