package handlers

import (
	"fooddash-api/middleware"
	"fooddash-api/models"
	"fooddash-api/ws"
	"log/slog"
	"net/http"

	"github.com/gin-gonic/gin"
)

// Browsers can't set headers on WebSocket requests, so the JWT is passed as
// ?token=... instead.
func (h *Handler) wsUser(c *gin.Context) (models.User, bool) {
	token := c.Query("token")
	if token == "" {
		fail(c, http.StatusUnauthorized, "Authentication required")
		return models.User{}, false
	}
	user, err := middleware.UserFromToken(c, h.db, h.tokens, token)
	if err != nil {
		fail(c, http.StatusUnauthorized, "Your session has expired. Please log in again.")
		return user, false
	}
	return user, true
}

func (h *Handler) upgrade(c *gin.Context, topic string) {
	conn, err := h.upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		slog.Warn("ws upgrade failed", "err", err)
		return
	}
	h.hub.Serve(conn, topic)
}

// ServeOrderWS streams live updates for one order to its owner (or staff).
func (h *Handler) ServeOrderWS(c *gin.Context) {
	user, ok := h.wsUser(c)
	if !ok {
		return
	}
	id, ok := idParam(c, "id")
	if !ok {
		return
	}
	var order models.Order
	err := h.db.WithContext(c.Request.Context()).Select("id", "user_id").First(&order, id).Error
	if isNotFound(err) || (err == nil && order.UserID != user.ID && user.Role != models.RoleStaff) {
		fail(c, http.StatusNotFound, "Order not found")
		return
	}
	if err != nil {
		serverError(c, err)
		return
	}
	h.upgrade(c, ws.OrderTopic(order.ID))
}

// ServeStaffWS streams every new order and status change to the kitchen
// dashboard, so it doesn't need to poll.
func (h *Handler) ServeStaffWS(c *gin.Context) {
	user, ok := h.wsUser(c)
	if !ok {
		return
	}
	if user.Role != models.RoleStaff {
		fail(c, http.StatusForbidden, "Staff access required")
		return
	}
	h.upgrade(c, ws.StaffTopic)
}
