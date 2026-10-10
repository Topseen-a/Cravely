package models

import (
	"fooddash-api/money"

	"gorm.io/gorm"
)

type Category struct {
	gorm.Model
	Name         string     `json:"name" gorm:"not null"`
	Description  string     `json:"description"`
	DisplayOrder int        `json:"display_order"`
	Items        []MenuItem `json:"items,omitempty" gorm:"foreignKey:CategoryID"`
}

type MenuItem struct {
	gorm.Model
	CategoryID  uint       `json:"category_id" gorm:"index"`
	Name        string     `json:"name" gorm:"not null"`
	Description string     `json:"description"`
	Price       money.Kobo `json:"price" gorm:"type:bigint;not null"`
	ImageURL    string     `json:"image_url"`
	IsAvailable bool       `json:"is_available" gorm:"default:true"`
	SoldOutNote string     `json:"sold_out_note" gorm:"default:''"`
}

type CreateMenuItemInput struct {
	CategoryID  uint       `json:"category_id" binding:"required"`
	Name        string     `json:"name" binding:"required,max=120"`
	Description string     `json:"description" binding:"max=1000"`
	Price       money.Kobo `json:"price" binding:"required,gt=0"`
	ImageURL    string     `json:"image_url" binding:"omitempty,url,max=2048"`
}

type CreateCategoryInput struct {
	Name         string `json:"name" binding:"required,max=80"`
	Description  string `json:"description" binding:"max=500"`
	DisplayOrder int    `json:"display_order"`
}

type SoldOutNoteInput struct {
	Note string `json:"note" binding:"max=200"`
}
