package models

import (
	"time"

	"gorm.io/gorm"
)

type Role string

const (
	RoleCustomer Role = "customer"
	RoleStaff    Role = "staff"
)

type User struct {
	gorm.Model
	Name         string `json:"name" gorm:"not null"`
	Email        string `json:"email" gorm:"uniqueIndex;not null"`
	Phone        string `json:"phone"` // E.164, e.g. +2348031234567
	PasswordHash string `json:"-"`
	// Sessions issued before this moment are rejected.
	PasswordChangedAt *time.Time `json:"-"`
	Role              Role       `json:"role" gorm:"default:customer"`
}

type RegisterInput struct {
	Name     string `json:"name" binding:"required,max=100"`
	Email    string `json:"email" binding:"required,email,max=254"`
	Phone    string `json:"phone" binding:"omitempty,max=20"`
	Password string `json:"password" binding:"required,min=8,max=72"`
}

type LoginInput struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

type RegisterStaffInput struct {
	Name      string `json:"name" binding:"required,max=100"`
	Email     string `json:"email" binding:"required,email,max=254"`
	Phone     string `json:"phone" binding:"omitempty,max=20"`
	Password  string `json:"password" binding:"required,min=8,max=72"`
	StaffCode string `json:"staff_code" binding:"required"`
}

type UpdateProfileInput struct {
	Name  *string `json:"name" binding:"omitempty,min=1,max=100"`
	Phone *string `json:"phone" binding:"omitempty,max=20"`
}

type ForgotPasswordInput struct {
	Email string `json:"email" binding:"required,email"`
}

type ResetPasswordInput struct {
	Token    string `json:"token" binding:"required,max=200"`
	Password string `json:"password" binding:"required,min=8,max=72"`
}

type ChangePasswordInput struct {
	CurrentPassword string `json:"current_password" binding:"required"`
	NewPassword     string `json:"new_password" binding:"required,min=8,max=72"`
}
