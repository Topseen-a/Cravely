package handlers

import (
	"fooddash-api/models"
	"fooddash-api/money"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func (h *Handler) GetCategories(c *gin.Context) {
	var categories []models.Category
	if err := h.db.WithContext(c.Request.Context()).Order("display_order asc, name asc").Find(&categories).Error; err != nil {
		serverError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": categories})
}

// GetFullMenu returns every category with its items. Sold-out items are
// included (flagged with is_available=false and an optional sold_out_note)
// so customers can see what is normally on offer.
func (h *Handler) GetFullMenu(c *gin.Context) {
	var categories []models.Category
	err := h.db.WithContext(c.Request.Context()).
		Order("display_order asc, name asc").
		Preload("Items", func(tx *gorm.DB) *gorm.DB {
			return tx.Order("is_available desc, name asc")
		}).
		Find(&categories).Error
	if err != nil {
		serverError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": categories})
}

func (h *Handler) GetDeliveryZones(c *gin.Context) {
	var zones []models.DeliveryZone
	if err := h.db.WithContext(c.Request.Context()).Where("is_active = ?", true).Order("name asc").Find(&zones).Error; err != nil {
		serverError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": zones})
}

// GetStoreInfo tells clients whether the kitchen is open and how orders are
// priced, so the checkout page can show the right breakdown.
func (h *Handler) GetStoreInfo(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"data": gin.H{
		"is_open":          h.cfg.IsOpenAt(time.Now()),
		"opening_time":     h.cfg.OpeningTime,
		"closing_time":     h.cfg.ClosingTime,
		"timezone":         h.cfg.Timezone.String(),
		"currency":         "NGN",
		"vat_percent":      float64(h.cfg.VATBasisPoints) / 100,
		"min_order":        money.Kobo(h.cfg.MinOrderKobo),
		"payment_methods":  h.paymentMethods(),
		"paystack_enabled": h.paystack.Enabled(),
	}})
}

func (h *Handler) paymentMethods() []models.PaymentMethod {
	methods := []models.PaymentMethod{models.PayOnDelivery}
	if h.paystack.Enabled() {
		methods = append(methods, models.PayPaystack)
	}
	return methods
}
