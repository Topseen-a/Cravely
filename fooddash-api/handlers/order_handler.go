package handlers

import (
	"context"
	"errors"
	"fmt"
	"fooddash-api/middleware"
	"fooddash-api/models"
	"fooddash-api/money"
	"fooddash-api/phone"
	"fooddash-api/ws"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// businessError is a business-rule failure during checkout that should be
// reported to the customer as-is.
type businessError struct {
	status  int
	msg     string
	details gin.H
}

func (e *businessError) Error() string { return e.msg }

func (h *Handler) PlaceOrder(c *gin.Context) {
	ctx := c.Request.Context()
	user := middleware.CurrentUser(c)

	var input models.PlaceOrderInput
	if !bindJSON(c, &input) {
		return
	}
	if input.PaymentMethod == "" {
		input.PaymentMethod = models.PayOnDelivery
	}
	if input.PaymentMethod == models.PayPaystack && !h.paystack.Enabled() {
		fail(c, http.StatusBadRequest, "Online payment is not available right now. Please choose pay on delivery.")
		return
	}
	if !h.cfg.IsOpenAt(time.Now()) {
		fail(c, http.StatusConflict, fmt.Sprintf("We're closed right now. We take orders from %s to %s.", h.cfg.OpeningTime, h.cfg.ClosingTime))
		return
	}

	// A phone number is essential in Nigeria: riders call on arrival, and
	// addresses are often described by landmarks rather than exact numbers.
	contactPhone := strings.TrimSpace(input.ContactPhone)
	if contactPhone == "" {
		contactPhone = user.Phone
	}
	if contactPhone != "" {
		p, err := phone.Normalize(contactPhone)
		if err != nil {
			fail(c, http.StatusBadRequest, err.Error())
			return
		}
		contactPhone = p
	}

	var zone *models.DeliveryZone
	address := strings.TrimSpace(input.DeliveryAddress)
	if input.Type == models.TypeDelivery {
		if address == "" {
			fail(c, http.StatusBadRequest, "Delivery address is required")
			return
		}
		if contactPhone == "" {
			fail(c, http.StatusBadRequest, "A phone number is required for delivery so the rider can reach you")
			return
		}
		if input.DeliveryZoneID == nil {
			fail(c, http.StatusBadRequest, "Choose your delivery area")
			return
		}
		zone = &models.DeliveryZone{}
		err := h.db.WithContext(ctx).Where("id = ? AND is_active = ?", *input.DeliveryZoneID, true).First(zone).Error
		if isNotFound(err) {
			fail(c, http.StatusBadRequest, "We don't deliver to the selected area")
			return
		} else if err != nil {
			serverError(c, err)
			return
		}
	} else {
		address = ""
	}

	cart, err := h.getOrCreateCart(ctx, user.ID)
	if err != nil {
		serverError(c, err)
		return
	}

	var order models.Order
	err = h.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Lock the cart so a double-submitted checkout can't create two
		// orders: the second request waits, then finds the cart empty.
		var locked models.Cart
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&locked, cart.ID).Error; err != nil {
			return err
		}
		var items []models.CartItem
		if err := tx.Where("cart_id = ?", cart.ID).Order("id asc").Preload("MenuItem").Find(&items).Error; err != nil {
			return err
		}
		if len(items) == 0 {
			return &businessError{status: http.StatusBadRequest, msg: "Your cart is empty"}
		}

		var subtotal money.Kobo
		var unavailable []string
		for _, it := range items {
			if it.MenuItem.ID == 0 {
				unavailable = append(unavailable, "an item that is no longer on the menu")
				continue
			}
			if !it.MenuItem.IsAvailable {
				unavailable = append(unavailable, it.MenuItem.Name)
				continue
			}
			subtotal += it.MenuItem.Price.Mul(it.Quantity)
		}
		if len(unavailable) > 0 {
			return &businessError{
				status:  http.StatusConflict,
				msg:     "Some items in your cart are sold out: " + strings.Join(unavailable, ", "),
				details: gin.H{"unavailable_items": unavailable},
			}
		}
		if subtotal < money.Kobo(h.cfg.MinOrderKobo) {
			return &businessError{status: http.StatusBadRequest, msg: "The minimum order is " + money.Kobo(h.cfg.MinOrderKobo).String()}
		}

		var fee money.Kobo
		if zone != nil {
			fee = zone.Fee
		}
		totals := models.CalculateTotals(subtotal, fee, h.cfg.VATBasisPoints)

		order = models.Order{
			Reference:       models.NewReference("CRV-", 8),
			UserID:          user.ID,
			Type:            input.Type,
			Status:          models.StatusReceived,
			PaymentMethod:   input.PaymentMethod,
			PaymentStatus:   models.PaymentPending,
			Subtotal:        totals.Subtotal,
			DeliveryFee:     totals.DeliveryFee,
			VAT:             totals.VAT,
			TotalAmount:     totals.Total,
			DeliveryAddress: address,
			Landmark:        strings.TrimSpace(input.Landmark),
			ContactPhone:    contactPhone,
			Note:            strings.TrimSpace(input.Note),
		}
		if zone != nil {
			order.DeliveryZoneID = &zone.ID
		}
		if err := tx.Create(&order).Error; err != nil {
			return err
		}

		orderItems := make([]models.OrderItem, 0, len(items))
		for _, ci := range items {
			orderItems = append(orderItems, models.OrderItem{
				OrderID:             order.ID,
				MenuItemID:          ci.MenuItemID,
				Name:                ci.MenuItem.Name,
				Quantity:            ci.Quantity,
				UnitPrice:           ci.MenuItem.Price,
				SpecialInstructions: ci.SpecialInstructions,
			})
		}
		if err := tx.Create(&orderItems).Error; err != nil {
			return err
		}
		if err := tx.Create(&models.OrderEvent{OrderID: order.ID, Status: models.StatusReceived, Note: "Order placed"}).Error; err != nil {
			return err
		}
		return tx.Where("cart_id = ?", cart.ID).Delete(&models.CartItem{}).Error
	})

	var ce *businessError
	if errors.As(err, &ce) {
		body := gin.H{"error": ce.msg}
		for k, v := range ce.details {
			body[k] = v
		}
		c.AbortWithStatusJSON(ce.status, body)
		return
	}
	if err != nil {
		serverError(c, err)
		return
	}

	full, err := h.loadOrder(ctx, order.ID)
	if err != nil {
		serverError(c, err)
		return
	}
	h.publishOrder("order.created", full)

	resp := gin.H{"data": full}
	if order.PaymentMethod == models.PayPaystack {
		payment, err := h.startPaystackPayment(ctx, full, user)
		if err != nil {
			// The order is saved; the customer can retry payment from the
			// order page via POST /orders/:id/pay.
			slog.Error("paystack initialize failed", "order", order.Reference, "err", err)
			resp["payment_error"] = "We couldn't start the online payment. Please try again from your order page."
		} else {
			resp["payment"] = payment
		}
	}
	c.JSON(http.StatusCreated, resp)
}

func (h *Handler) GetMyOrders(c *gin.Context) {
	ctx := c.Request.Context()
	user := middleware.CurrentUser(c)
	page, size := pagination(c)

	q := h.db.WithContext(ctx).Model(&models.Order{}).Where("user_id = ?", user.ID)
	var total int64
	if err := q.Count(&total).Error; err != nil {
		serverError(c, err)
		return
	}

	var orders []models.Order
	err := q.Order("created_at desc").
		Offset((page-1)*size).Limit(size).
		Preload("Items.MenuItem", unscoped).
		Preload("Events", orderedEvents).
		Preload("DeliveryZone", unscoped).
		Find(&orders).Error
	if err != nil {
		serverError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"data": orders,
		"meta": gin.H{"page": page, "page_size": size, "total": total},
	})
}

func (h *Handler) GetOrder(c *gin.Context) {
	order, ok := h.customerOrder(c)
	if !ok {
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": order})
}

// CancelOrder lets a customer cancel an order the kitchen hasn't started.
func (h *Handler) CancelOrder(c *gin.Context) {
	ctx := c.Request.Context()
	order, ok := h.customerOrder(c)
	if !ok {
		return
	}
	var input models.CancelOrderInput
	if c.Request.ContentLength > 0 && !bindJSON(c, &input) {
		return
	}

	note := "Cancelled by customer"
	if r := strings.TrimSpace(input.Reason); r != "" {
		note += ": " + r
	}
	err := h.transitionOrder(ctx, order.ID, models.StatusCancelled, note, func(o *models.Order) error {
		if o.Status != models.StatusReceived {
			return &businessError{status: http.StatusConflict, msg: "This order is already being prepared and can no longer be cancelled. Please call the restaurant."}
		}
		return nil
	})
	h.respondTransition(c, order.ID, err)
}

// customerOrder loads the order in :id if it belongs to the current user.
func (h *Handler) customerOrder(c *gin.Context) (models.Order, bool) {
	id, ok := idParam(c, "id")
	if !ok {
		return models.Order{}, false
	}
	order, err := h.loadOrder(c.Request.Context(), id)
	if isNotFound(err) || (err == nil && order.UserID != middleware.CurrentUser(c).ID) {
		fail(c, http.StatusNotFound, "Order not found")
		return order, false
	}
	if err != nil {
		serverError(c, err)
		return order, false
	}
	return order, true
}

func unscoped(tx *gorm.DB) *gorm.DB      { return tx.Unscoped() }
func orderedEvents(tx *gorm.DB) *gorm.DB { return tx.Order("created_at asc, id asc") }

// loadOrder loads an order with everything the clients display. Menu items
// and zones are loaded unscoped so old orders still render after the menu
// changes.
func (h *Handler) loadOrder(ctx context.Context, id uint) (models.Order, error) {
	var order models.Order
	err := h.db.WithContext(ctx).
		Preload("Items.MenuItem", unscoped).
		Preload("Events", orderedEvents).
		Preload("DeliveryZone", unscoped).
		Preload("User").
		First(&order, id).Error
	return order, err
}

// publishOrder pushes the order to the customer tracking it and to the staff
// dashboard.
func (h *Handler) publishOrder(event string, order models.Order) {
	order.NextStatuses = order.AllowedNextStatuses()
	msg := ws.Message{Event: event, Data: order}
	h.hub.Publish(ws.OrderTopic(order.ID), msg)
	h.hub.Publish(ws.StaffTopic, msg)
}

// transitionOrder moves an order to a new status inside a transaction with
// the order row locked, so two staff members can't apply conflicting updates.
// check may veto the change based on the locked, current state.
func (h *Handler) transitionOrder(ctx context.Context, orderID uint, to models.OrderStatus, note string, check func(*models.Order) error) error {
	return h.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var o models.Order
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&o, orderID).Error; err != nil {
			return err
		}
		if check != nil {
			if err := check(&o); err != nil {
				return err
			}
		}
		if !o.CanTransitionTo(to) {
			return &businessError{
				status: http.StatusUnprocessableEntity,
				msg:    fmt.Sprintf("Cannot change a %s order from %s to %s", o.Type, o.Status, to),
				details: gin.H{
					"current":   o.Status,
					"requested": to,
					"allowed":   o.AllowedNextStatuses(),
				},
			}
		}
		if to == models.StatusPreparing && o.PaymentMethod == models.PayPaystack && o.PaymentStatus != models.PaymentPaid {
			return &businessError{status: http.StatusConflict, msg: "This order hasn't been paid for yet. Wait for payment confirmation before preparing it."}
		}

		updates := map[string]any{"status": to}
		switch {
		case to == models.StatusCancelled:
			updates["cancel_reason"] = note
			if o.PaymentStatus == models.PaymentPaid {
				updates["payment_status"] = models.PaymentRefundPending
			}
		case to.IsTerminal() && o.PaymentMethod == models.PayOnDelivery:
			// Cash/POS/transfer is collected on hand-over.
			now := time.Now()
			updates["payment_status"] = models.PaymentPaid
			updates["paid_at"] = &now
		}
		if err := tx.Model(&o).Updates(updates).Error; err != nil {
			return err
		}
		return tx.Create(&models.OrderEvent{OrderID: o.ID, Status: to, Note: note}).Error
	})
}

// respondTransition writes the result of transitionOrder and notifies
// listeners on success.
func (h *Handler) respondTransition(c *gin.Context, orderID uint, err error) {
	var ce *businessError
	switch {
	case errors.As(err, &ce):
		body := gin.H{"error": ce.msg}
		for k, v := range ce.details {
			body[k] = v
		}
		c.AbortWithStatusJSON(ce.status, body)
		return
	case isNotFound(err):
		fail(c, http.StatusNotFound, "Order not found")
		return
	case err != nil:
		serverError(c, err)
		return
	}

	order, err := h.loadOrder(c.Request.Context(), orderID)
	if err != nil {
		serverError(c, err)
		return
	}
	h.publishOrder("order.updated", order)
	if middleware.CurrentUser(c).Role == models.RoleStaff {
		order.NextStatuses = order.AllowedNextStatuses()
	}
	c.JSON(http.StatusOK, gin.H{"data": order})
}
