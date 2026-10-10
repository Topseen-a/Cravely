package models

import (
	"fooddash-api/money"

	"gorm.io/gorm"
)

// DeliveryZone is an area the restaurant delivers to (e.g. "Yaba", "Lekki
// Phase 1") with a flat delivery fee. Flat per-area pricing is how most
// Nigerian restaurants and dispatch riders charge.
type DeliveryZone struct {
	gorm.Model
	Name             string     `json:"name" gorm:"not null"`
	Fee              money.Kobo `json:"fee" gorm:"type:bigint;not null;default:0"`
	EstimatedMinutes int        `json:"estimated_minutes"`
	IsActive         bool       `json:"is_active" gorm:"default:true"`
}

type DeliveryZoneInput struct {
	Name             string     `json:"name" binding:"required,max=80"`
	Fee              money.Kobo `json:"fee" binding:"gte=0"`
	EstimatedMinutes int        `json:"estimated_minutes" binding:"gte=0,lte=600"`
	IsActive         *bool      `json:"is_active"`
}
