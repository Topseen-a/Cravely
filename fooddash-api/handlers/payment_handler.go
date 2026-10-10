package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"fooddash-api/middleware"
	"fooddash-api/models"
	"fooddash-api/money"
	"fooddash-api/payments/paystack"
	"io"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// startPaystackPayment creates a new payment attempt and returns the hosted
// checkout link the customer should be redirected to.
func (h *Handler) startPaystackPayment(ctx context.Context, order models.Order, user models.User) (models.Payment, error) {
	payment := models.Payment{
		OrderID:   order.ID,
		Provider:  "paystack",
		Reference: models.NewReference(order.Reference+"-", 6),
		Amount:    order.TotalAmount,
		Status:    models.PaymentPending,
	}
	res, err := h.paystack.Initialize(ctx, paystack.InitializeRequest{
		Email:       user.Email,
		AmountKobo:  int64(order.TotalAmount),
		Reference:   payment.Reference,
		CallbackURL: h.cfg.PaystackCallbackURL,
		Metadata: map[string]any{
			"order_id":        order.ID,
			"order_reference": order.Reference,
			"customer_name":   user.Name,
		},
	})
	if err != nil {
		return payment, err
	}
	payment.AuthorizationURL = res.AuthorizationURL
	payment.AccessCode = res.AccessCode
	if err := h.db.WithContext(ctx).Create(&payment).Error; err != nil {
		return payment, err
	}
	return payment, nil
}

// PayOrder starts (or restarts) online payment for an unpaid Paystack order.
func (h *Handler) PayOrder(c *gin.Context) {
	order, ok := h.customerOrder(c)
	if !ok {
		return
	}
	switch {
	case order.PaymentMethod != models.PayPaystack:
		fail(c, http.StatusBadRequest, "This order is set to pay on delivery")
		return
	case order.PaymentStatus == models.PaymentPaid:
		fail(c, http.StatusConflict, "This order has already been paid for")
		return
	case order.Status == models.StatusCancelled:
		fail(c, http.StatusConflict, "This order was cancelled")
		return
	case !h.paystack.Enabled():
		fail(c, http.StatusServiceUnavailable, "Online payment is not available right now")
		return
	}

	payment, err := h.startPaystackPayment(c.Request.Context(), order, middleware.CurrentUser(c))
	if err != nil {
		slog.Error("paystack initialize failed", "order", order.Reference, "err", err)
		fail(c, http.StatusBadGateway, "We couldn't reach the payment provider. Please try again.")
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": payment})
}

// VerifyPayment is called by the frontend when Paystack redirects the customer
// back (callback URL contains ?reference=...). The webhook is the source of
// truth, but verifying here gives the customer an instant result.
func (h *Handler) VerifyPayment(c *gin.Context) {
	ctx := c.Request.Context()
	reference := strings.TrimSpace(c.Query("reference"))
	if reference == "" {
		fail(c, http.StatusBadRequest, "reference is required")
		return
	}

	var payment models.Payment
	if err := h.db.WithContext(ctx).Where("reference = ?", reference).First(&payment).Error; err != nil {
		if isNotFound(err) {
			fail(c, http.StatusNotFound, "Payment not found")
			return
		}
		serverError(c, err)
		return
	}
	var order models.Order
	if err := h.db.WithContext(ctx).First(&order, payment.OrderID).Error; err != nil {
		serverError(c, err)
		return
	}
	if order.UserID != middleware.CurrentUser(c).ID {
		fail(c, http.StatusNotFound, "Payment not found")
		return
	}

	if payment.Status != models.PaymentPaid {
		txn, err := h.paystack.Verify(ctx, reference)
		if err != nil {
			slog.Error("paystack verify failed", "reference", reference, "err", err)
			fail(c, http.StatusBadGateway, "We couldn't confirm your payment yet. Please refresh in a moment.")
			return
		}
		if err := h.applyPaystackTransaction(ctx, txn); err != nil {
			serverError(c, err)
			return
		}
	}

	full, err := h.loadOrder(ctx, order.ID)
	if err != nil {
		serverError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": full})
}

// PaystackWebhook receives payment notifications from Paystack. Requests are
// authenticated by the HMAC signature header. It always answers 200 once the
// signature is valid so Paystack doesn't keep retrying events we ignore.
func (h *Handler) PaystackWebhook(c *gin.Context) {
	body, err := io.ReadAll(io.LimitReader(c.Request.Body, 1<<20))
	if err != nil {
		fail(c, http.StatusBadRequest, "Invalid body")
		return
	}
	if !h.paystack.ValidSignature(body, c.GetHeader("x-paystack-signature")) {
		fail(c, http.StatusUnauthorized, "Invalid signature")
		return
	}

	var event paystack.WebhookEvent
	if err := json.Unmarshal(body, &event); err != nil {
		fail(c, http.StatusBadRequest, "Invalid payload")
		return
	}

	if event.Event == "charge.success" {
		if err := h.applyPaystackTransaction(c.Request.Context(), event.Data); err != nil {
			// 500 makes Paystack retry later.
			serverError(c, err)
			return
		}
	}
	c.Status(http.StatusOK)
}

var errUnknownPayment = errors.New("unknown payment reference")

// applyPaystackTransaction records the outcome of a Paystack transaction.
// It is idempotent: the webhook and the verify endpoint can both deliver the
// same transaction.
func (h *Handler) applyPaystackTransaction(ctx context.Context, txn paystack.Transaction) error {
	var orderID uint
	changed := false

	err := h.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var p models.Payment
		err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Where("reference = ?", txn.Reference).First(&p).Error
		if isNotFound(err) {
			return errUnknownPayment
		}
		if err != nil {
			return err
		}
		orderID = p.OrderID
		if p.Status == models.PaymentPaid {
			return nil
		}

		if txn.Status != "success" {
			if txn.Status == "failed" || txn.Status == "abandoned" || txn.Status == "reversed" {
				changed = true
				return tx.Model(&p).Update("status", models.PaymentFailed).Error
			}
			return nil // still in progress
		}

		var o models.Order
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&o, p.OrderID).Error; err != nil {
			return err
		}
		if txn.Currency != "NGN" || money.Kobo(txn.AmountKobo) != p.Amount || p.Amount != o.TotalAmount {
			slog.Error("paystack amount mismatch", "reference", txn.Reference,
				"paid_kobo", txn.AmountKobo, "currency", txn.Currency, "expected_kobo", int64(o.TotalAmount))
			changed = true
			if err := tx.Model(&p).Update("status", models.PaymentFailed).Error; err != nil {
				return err
			}
			return tx.Create(&models.OrderEvent{OrderID: o.ID, Status: o.Status,
				Note: "Payment amount did not match the order total. Staff will contact you."}).Error
		}

		paidAt := time.Now()
		if t, err := time.Parse(time.RFC3339, txn.PaidAt); err == nil {
			paidAt = t
		}
		changed = true
		if err := tx.Model(&p).Updates(map[string]any{
			"status": models.PaymentPaid, "channel": txn.Channel, "paid_at": paidAt,
		}).Error; err != nil {
			return err
		}

		status := models.PaymentPaid
		note := "Payment confirmed (" + money.Kobo(txn.AmountKobo).String() + ")"
		if o.Status == models.StatusCancelled {
			// Money arrived after cancellation; flag it for a refund.
			status = models.PaymentRefundPending
			note = "Payment received after cancellation; a refund is pending"
		}
		if err := tx.Model(&o).Updates(map[string]any{"payment_status": status, "paid_at": paidAt}).Error; err != nil {
			return err
		}
		return tx.Create(&models.OrderEvent{OrderID: o.ID, Status: o.Status, Note: note}).Error
	})
	if errors.Is(err, errUnknownPayment) {
		slog.Warn("paystack event for unknown reference", "reference", txn.Reference)
		return nil
	}
	if err != nil || !changed {
		return err
	}

	if order, err := h.loadOrder(ctx, orderID); err == nil {
		h.publishOrder("order.updated", order)
	}
	return nil
}
