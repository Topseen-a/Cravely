package handlers

import (
	"context"
	"fooddash-api/middleware"
	"fooddash-api/models"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// getOrCreateCart returns the user's cart, creating it on first use. Two
// concurrent first requests can race on the unique user_id; the loser simply
// reads the winner's row.
func (h *Handler) getOrCreateCart(ctx context.Context, userID uint) (models.Cart, error) {
	var cart models.Cart
	err := h.db.WithContext(ctx).Where(models.Cart{UserID: userID}).FirstOrCreate(&cart).Error
	if isDuplicate(err) {
		err = h.db.WithContext(ctx).Where(models.Cart{UserID: userID}).First(&cart).Error
	}
	return cart, err
}

// loadCart returns the cart with items and subtotal. Items whose menu item
// has since been deleted are dropped.
func (h *Handler) loadCart(ctx context.Context, cartID uint) (models.Cart, error) {
	var cart models.Cart
	err := h.db.WithContext(ctx).
		Preload("CartItems", func(tx *gorm.DB) *gorm.DB { return tx.Order("id asc") }).
		Preload("CartItems.MenuItem").
		First(&cart, cartID).Error
	if err != nil {
		return cart, err
	}

	live := cart.CartItems[:0]
	var orphaned []uint
	for _, it := range cart.CartItems {
		if it.MenuItem.ID == 0 {
			orphaned = append(orphaned, it.ID)
			continue
		}
		live = append(live, it)
	}
	if len(orphaned) > 0 {
		if err := h.db.WithContext(ctx).Delete(&models.CartItem{}, orphaned).Error; err != nil {
			return cart, err
		}
	}
	cart.CartItems = live
	cart.ComputeSubtotal()
	return cart, nil
}

func (h *Handler) respondCart(c *gin.Context, cartID uint, status int) {
	cart, err := h.loadCart(c.Request.Context(), cartID)
	if err != nil {
		serverError(c, err)
		return
	}
	c.JSON(status, gin.H{"data": cart})
}

func (h *Handler) GetCart(c *gin.Context) {
	cart, err := h.getOrCreateCart(c.Request.Context(), middleware.CurrentUser(c).ID)
	if err != nil {
		serverError(c, err)
		return
	}
	h.respondCart(c, cart.ID, http.StatusOK)
}

func (h *Handler) AddToCart(c *gin.Context) {
	ctx := c.Request.Context()
	var input models.AddToCartInput
	if !bindJSON(c, &input) {
		return
	}

	var menuItem models.MenuItem
	if err := h.db.WithContext(ctx).First(&menuItem, input.MenuItemID).Error; err != nil {
		if isNotFound(err) {
			fail(c, http.StatusNotFound, "Menu item not found")
			return
		}
		serverError(c, err)
		return
	}
	if !menuItem.IsAvailable {
		msg := menuItem.Name + " is sold out"
		if menuItem.SoldOutNote != "" {
			msg += ": " + menuItem.SoldOutNote
		}
		fail(c, http.StatusConflict, msg)
		return
	}

	cart, err := h.getOrCreateCart(ctx, middleware.CurrentUser(c).ID)
	if err != nil {
		serverError(c, err)
		return
	}

	// Insert, or add to the existing line for this item, in one atomic
	// statement so double-clicks can't create duplicate lines.
	item := models.CartItem{
		CartID:              cart.ID,
		MenuItemID:          input.MenuItemID,
		Quantity:            input.Quantity,
		SpecialInstructions: strings.TrimSpace(input.SpecialInstructions),
	}
	err = h.db.WithContext(ctx).Clauses(clause.OnConflict{
		Columns:     []clause.Column{{Name: "cart_id"}, {Name: "menu_item_id"}},
		TargetWhere: clause.Where{Exprs: []clause.Expression{clause.Expr{SQL: "deleted_at IS NULL"}}},
		DoUpdates: clause.Set{
			{Column: clause.Column{Name: "quantity"}, Value: gorm.Expr("LEAST(cart_items.quantity + excluded.quantity, ?)", models.MaxItemQuantity)},
			{Column: clause.Column{Name: "special_instructions"}, Value: gorm.Expr("COALESCE(NULLIF(excluded.special_instructions, ''), cart_items.special_instructions)")},
			{Column: clause.Column{Name: "updated_at"}, Value: gorm.Expr("excluded.updated_at")},
		},
	}).Create(&item).Error
	if err != nil {
		serverError(c, err)
		return
	}
	h.respondCart(c, cart.ID, http.StatusOK)
}

func (h *Handler) UpdateCartItem(c *gin.Context) {
	ctx := c.Request.Context()
	itemID, ok := idParam(c, "id")
	if !ok {
		return
	}
	var input models.UpdateCartItemInput
	if !bindJSON(c, &input) {
		return
	}

	cart, err := h.getOrCreateCart(ctx, middleware.CurrentUser(c).ID)
	if err != nil {
		serverError(c, err)
		return
	}
	res := h.db.WithContext(ctx).Model(&models.CartItem{}).
		Where("id = ? AND cart_id = ?", itemID, cart.ID).
		Updates(map[string]any{
			"quantity":             input.Quantity,
			"special_instructions": strings.TrimSpace(input.SpecialInstructions),
		})
	if res.Error != nil {
		serverError(c, res.Error)
		return
	}
	if res.RowsAffected == 0 {
		fail(c, http.StatusNotFound, "Cart item not found")
		return
	}
	h.respondCart(c, cart.ID, http.StatusOK)
}

func (h *Handler) RemoveCartItem(c *gin.Context) {
	ctx := c.Request.Context()
	itemID, ok := idParam(c, "id")
	if !ok {
		return
	}
	cart, err := h.getOrCreateCart(ctx, middleware.CurrentUser(c).ID)
	if err != nil {
		serverError(c, err)
		return
	}
	res := h.db.WithContext(ctx).Where("id = ? AND cart_id = ?", itemID, cart.ID).Delete(&models.CartItem{})
	if res.Error != nil {
		serverError(c, res.Error)
		return
	}
	if res.RowsAffected == 0 {
		fail(c, http.StatusNotFound, "Cart item not found")
		return
	}
	h.respondCart(c, cart.ID, http.StatusOK)
}

func (h *Handler) ClearCart(c *gin.Context) {
	ctx := c.Request.Context()
	cart, err := h.getOrCreateCart(ctx, middleware.CurrentUser(c).ID)
	if err != nil {
		serverError(c, err)
		return
	}
	if err := h.db.WithContext(ctx).Where("cart_id = ?", cart.ID).Delete(&models.CartItem{}).Error; err != nil {
		serverError(c, err)
		return
	}
	h.respondCart(c, cart.ID, http.StatusOK)
}
