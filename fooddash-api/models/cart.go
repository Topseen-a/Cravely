package models

import (
	"fooddash-api/money"

	"gorm.io/gorm"
)

type Cart struct {
	gorm.Model
	UserID    uint       `json:"user_id" gorm:"uniqueIndex"`
	CartItems []CartItem `json:"items" gorm:"foreignKey:CartID"`
	Subtotal  money.Kobo `json:"subtotal" gorm:"-"`
}

// ComputeSubtotal fills Subtotal from the currently loaded items.
func (c *Cart) ComputeSubtotal() {
	c.Subtotal = 0
	for _, it := range c.CartItems {
		c.Subtotal += it.MenuItem.Price.Mul(it.Quantity)
	}
}

type CartItem struct {
	gorm.Model
	CartID              uint     `json:"cart_id" gorm:"index"`
	MenuItemID          uint     `json:"menu_item_id"`
	MenuItem            MenuItem `json:"menu_item" gorm:"foreignKey:MenuItemID"`
	Quantity            int      `json:"quantity" gorm:"not null"`
	SpecialInstructions string   `json:"special_instructions"`
}

const MaxItemQuantity = 50

type AddToCartInput struct {
	MenuItemID          uint   `json:"menu_item_id" binding:"required"`
	Quantity            int    `json:"quantity" binding:"required,min=1,max=50"`
	SpecialInstructions string `json:"special_instructions" binding:"max=300"`
}

type UpdateCartItemInput struct {
	Quantity            int    `json:"quantity" binding:"required,min=1,max=50"`
	SpecialInstructions string `json:"special_instructions" binding:"max=300"`
}
