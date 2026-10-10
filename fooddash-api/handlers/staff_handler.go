package handlers

import (
	"fooddash-api/models"
	"fooddash-api/money"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// dayParam reads ?date=YYYY-MM-DD (store timezone), defaulting to today, and
// returns that day's [start, end) range.
func (h *Handler) dayParam(c *gin.Context) (time.Time, time.Time, bool) {
	day := time.Now()
	if d := c.Query("date"); d != "" {
		parsed, err := time.ParseInLocation("2006-01-02", d, h.cfg.Timezone)
		if err != nil {
			fail(c, http.StatusBadRequest, "date must be in YYYY-MM-DD format")
			return time.Time{}, time.Time{}, false
		}
		day = parsed
	}
	start, end := h.cfg.DayRange(day)
	return start, end, true
}

// GetTodaysOrders lists orders for a day (default today, Lagos time).
// Filters: ?status=PREPARING, ?type=delivery, ?date=2026-01-31.
func (h *Handler) GetTodaysOrders(c *gin.Context) {
	start, end, ok := h.dayParam(c)
	if !ok {
		return
	}
	q := h.db.WithContext(c.Request.Context()).
		Where("created_at >= ? AND created_at < ?", start, end).
		Order("created_at asc").
		Preload("Items.MenuItem", unscoped).
		Preload("Events", orderedEvents).
		Preload("DeliveryZone", unscoped).
		Preload("User")

	if s := c.Query("status"); s != "" {
		if !models.OrderStatus(s).Valid() {
			fail(c, http.StatusBadRequest, "Unknown status "+s)
			return
		}
		q = q.Where("status = ?", s)
	}
	if t := c.Query("type"); t != "" {
		if t != string(models.TypeDelivery) && t != string(models.TypePickup) {
			fail(c, http.StatusBadRequest, "type must be delivery or pickup")
			return
		}
		q = q.Where("type = ?", t)
	}

	var orders []models.Order
	if err := q.Find(&orders).Error; err != nil {
		serverError(c, err)
		return
	}
	for i := range orders {
		orders[i].NextStatuses = orders[i].AllowedNextStatuses()
	}
	c.JSON(http.StatusOK, gin.H{"data": orders})
}

func (h *Handler) GetOrderStaff(c *gin.Context) {
	id, ok := idParam(c, "id")
	if !ok {
		return
	}
	order, err := h.loadOrder(c.Request.Context(), id)
	if isNotFound(err) {
		fail(c, http.StatusNotFound, "Order not found")
		return
	} else if err != nil {
		serverError(c, err)
		return
	}
	order.NextStatuses = order.AllowedNextStatuses()
	c.JSON(http.StatusOK, gin.H{"data": order})
}

func (h *Handler) UpdateOrderStatus(c *gin.Context) {
	id, ok := idParam(c, "id")
	if !ok {
		return
	}
	var input models.UpdateOrderStatusInput
	if !bindJSON(c, &input) {
		return
	}
	if !input.Status.Valid() {
		fail(c, http.StatusBadRequest, "Unknown status "+string(input.Status))
		return
	}
	note := strings.TrimSpace(input.Note)
	err := h.transitionOrder(c.Request.Context(), id, input.Status, note, nil)
	h.respondTransition(c, id, err)
}

// ---- Menu management ----

func (h *Handler) GetMenuAdmin(c *gin.Context) {
	var categories []models.Category
	err := h.db.WithContext(c.Request.Context()).
		Order("display_order asc, name asc").
		Preload("Items", func(tx *gorm.DB) *gorm.DB { return tx.Order("name asc") }).
		Find(&categories).Error
	if err != nil {
		serverError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": categories})
}

func (h *Handler) categoryExists(c *gin.Context, id uint) bool {
	var count int64
	if err := h.db.WithContext(c.Request.Context()).Model(&models.Category{}).Where("id = ?", id).Count(&count).Error; err != nil {
		serverError(c, err)
		return false
	}
	if count == 0 {
		fail(c, http.StatusBadRequest, "Category not found")
		return false
	}
	return true
}

func (h *Handler) CreateMenuItem(c *gin.Context) {
	var input models.CreateMenuItemInput
	if !bindJSON(c, &input) || !h.categoryExists(c, input.CategoryID) {
		return
	}
	item := models.MenuItem{
		CategoryID:  input.CategoryID,
		Name:        strings.TrimSpace(input.Name),
		Description: strings.TrimSpace(input.Description),
		Price:       input.Price,
		ImageURL:    strings.TrimSpace(input.ImageURL),
		IsAvailable: true,
	}
	if err := h.db.WithContext(c.Request.Context()).Create(&item).Error; err != nil {
		serverError(c, err)
		return
	}
	c.JSON(http.StatusCreated, gin.H{"data": item})
}

// menuItemUpdate applies updates to the menu item in :id and responds with
// the fresh row.
func (h *Handler) menuItemUpdate(c *gin.Context, build func(item models.MenuItem) (map[string]any, bool)) {
	ctx := c.Request.Context()
	id, ok := idParam(c, "id")
	if !ok {
		return
	}
	var item models.MenuItem
	if err := h.db.WithContext(ctx).First(&item, id).Error; err != nil {
		if isNotFound(err) {
			fail(c, http.StatusNotFound, "Menu item not found")
			return
		}
		serverError(c, err)
		return
	}
	updates, ok := build(item)
	if !ok {
		return
	}
	if err := h.db.WithContext(ctx).Model(&item).Updates(updates).Error; err != nil {
		serverError(c, err)
		return
	}
	if err := h.db.WithContext(ctx).First(&item, id).Error; err != nil {
		serverError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": item})
}

func (h *Handler) UpdateMenuItem(c *gin.Context) {
	h.menuItemUpdate(c, func(models.MenuItem) (map[string]any, bool) {
		var input models.CreateMenuItemInput
		if !bindJSON(c, &input) || !h.categoryExists(c, input.CategoryID) {
			return nil, false
		}
		return map[string]any{
			"category_id": input.CategoryID,
			"name":        strings.TrimSpace(input.Name),
			"description": strings.TrimSpace(input.Description),
			"price":       input.Price,
			"image_url":   strings.TrimSpace(input.ImageURL),
		}, true
	})
}

func (h *Handler) ToggleAvailability(c *gin.Context) {
	h.menuItemUpdate(c, func(models.MenuItem) (map[string]any, bool) {
		// Flip in SQL so concurrent toggles don't read a stale value. Clear
		// the sold-out note when an item comes back.
		return map[string]any{
			"is_available":  gorm.Expr("NOT is_available"),
			"sold_out_note": gorm.Expr("CASE WHEN is_available THEN sold_out_note ELSE '' END"),
		}, true
	})
}

func (h *Handler) SetSoldOutNote(c *gin.Context) {
	h.menuItemUpdate(c, func(models.MenuItem) (map[string]any, bool) {
		var input models.SoldOutNoteInput
		if !bindJSON(c, &input) {
			return nil, false
		}
		return map[string]any{"sold_out_note": strings.TrimSpace(input.Note)}, true
	})
}

func (h *Handler) DeleteMenuItem(c *gin.Context) {
	id, ok := idParam(c, "id")
	if !ok {
		return
	}
	res := h.db.WithContext(c.Request.Context()).Delete(&models.MenuItem{}, id)
	if res.Error != nil {
		serverError(c, res.Error)
		return
	}
	if res.RowsAffected == 0 {
		fail(c, http.StatusNotFound, "Menu item not found")
		return
	}
	c.Status(http.StatusNoContent)
}

// ---- Categories ----

func (h *Handler) CreateCategory(c *gin.Context) {
	var input models.CreateCategoryInput
	if !bindJSON(c, &input) {
		return
	}
	cat := models.Category{
		Name:         strings.TrimSpace(input.Name),
		Description:  strings.TrimSpace(input.Description),
		DisplayOrder: input.DisplayOrder,
	}
	if err := h.db.WithContext(c.Request.Context()).Create(&cat).Error; err != nil {
		if isDuplicate(err) {
			fail(c, http.StatusConflict, "A category with this name already exists")
			return
		}
		serverError(c, err)
		return
	}
	c.JSON(http.StatusCreated, gin.H{"data": cat})
}

func (h *Handler) UpdateCategory(c *gin.Context) {
	ctx := c.Request.Context()
	id, ok := idParam(c, "id")
	if !ok {
		return
	}
	var input models.CreateCategoryInput
	if !bindJSON(c, &input) {
		return
	}
	res := h.db.WithContext(ctx).Model(&models.Category{}).Where("id = ?", id).Updates(map[string]any{
		"name":          strings.TrimSpace(input.Name),
		"description":   strings.TrimSpace(input.Description),
		"display_order": input.DisplayOrder,
	})
	if isDuplicate(res.Error) {
		fail(c, http.StatusConflict, "A category with this name already exists")
		return
	}
	if res.Error != nil {
		serverError(c, res.Error)
		return
	}
	if res.RowsAffected == 0 {
		fail(c, http.StatusNotFound, "Category not found")
		return
	}
	var cat models.Category
	if err := h.db.WithContext(ctx).First(&cat, id).Error; err != nil {
		serverError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": cat})
}

func (h *Handler) DeleteCategory(c *gin.Context) {
	ctx := c.Request.Context()
	id, ok := idParam(c, "id")
	if !ok {
		return
	}
	var items int64
	if err := h.db.WithContext(ctx).Model(&models.MenuItem{}).Where("category_id = ?", id).Count(&items).Error; err != nil {
		serverError(c, err)
		return
	}
	if items > 0 {
		fail(c, http.StatusConflict, "Move or delete the items in this category first")
		return
	}
	res := h.db.WithContext(ctx).Delete(&models.Category{}, id)
	if res.Error != nil {
		serverError(c, res.Error)
		return
	}
	if res.RowsAffected == 0 {
		fail(c, http.StatusNotFound, "Category not found")
		return
	}
	c.Status(http.StatusNoContent)
}

// ---- Delivery zones ----

func (h *Handler) ListDeliveryZonesAdmin(c *gin.Context) {
	var zones []models.DeliveryZone
	if err := h.db.WithContext(c.Request.Context()).Order("name asc").Find(&zones).Error; err != nil {
		serverError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": zones})
}

func (h *Handler) CreateDeliveryZone(c *gin.Context) {
	var input models.DeliveryZoneInput
	if !bindJSON(c, &input) {
		return
	}
	zone := models.DeliveryZone{
		Name:             strings.TrimSpace(input.Name),
		Fee:              input.Fee,
		EstimatedMinutes: input.EstimatedMinutes,
		IsActive:         input.IsActive == nil || *input.IsActive,
	}
	// Select "*" so is_active=false isn't replaced by the column default.
	if err := h.db.WithContext(c.Request.Context()).Select("*").Create(&zone).Error; err != nil {
		if isDuplicate(err) {
			fail(c, http.StatusConflict, "A delivery zone with this name already exists")
			return
		}
		serverError(c, err)
		return
	}
	c.JSON(http.StatusCreated, gin.H{"data": zone})
}

func (h *Handler) UpdateDeliveryZone(c *gin.Context) {
	ctx := c.Request.Context()
	id, ok := idParam(c, "id")
	if !ok {
		return
	}
	var input models.DeliveryZoneInput
	if !bindJSON(c, &input) {
		return
	}
	updates := map[string]any{
		"name":              strings.TrimSpace(input.Name),
		"fee":               input.Fee,
		"estimated_minutes": input.EstimatedMinutes,
	}
	if input.IsActive != nil {
		updates["is_active"] = *input.IsActive
	}
	res := h.db.WithContext(ctx).Model(&models.DeliveryZone{}).Where("id = ?", id).Updates(updates)
	if isDuplicate(res.Error) {
		fail(c, http.StatusConflict, "A delivery zone with this name already exists")
		return
	}
	if res.Error != nil {
		serverError(c, res.Error)
		return
	}
	if res.RowsAffected == 0 {
		fail(c, http.StatusNotFound, "Delivery zone not found")
		return
	}
	var zone models.DeliveryZone
	if err := h.db.WithContext(ctx).First(&zone, id).Error; err != nil {
		serverError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": zone})
}

func (h *Handler) DeleteDeliveryZone(c *gin.Context) {
	id, ok := idParam(c, "id")
	if !ok {
		return
	}
	res := h.db.WithContext(c.Request.Context()).Delete(&models.DeliveryZone{}, id)
	if res.Error != nil {
		serverError(c, res.Error)
		return
	}
	if res.RowsAffected == 0 {
		fail(c, http.StatusNotFound, "Delivery zone not found")
		return
	}
	c.Status(http.StatusNoContent)
}

// ---- Reports ----

// GetDailySummary reports a day's orders and sales (default today, Lagos
// time). Revenue excludes cancelled orders; paid_revenue counts only money
// actually collected.
func (h *Handler) GetDailySummary(c *gin.Context) {
	ctx := c.Request.Context()
	start, end, ok := h.dayParam(c)
	if !ok {
		return
	}
	day := h.db.WithContext(ctx).Model(&models.Order{}).Where("orders.created_at >= ? AND orders.created_at < ?", start, end)

	var totals struct {
		TotalOrders int64
		Revenue     int64
		PaidRevenue int64
		Completed   int64
	}
	err := day.Session(&gorm.Session{}).Select(`
		COUNT(*) AS total_orders,
		COALESCE(SUM(total_amount) FILTER (WHERE status <> ?), 0)::bigint AS revenue,
		COALESCE(SUM(total_amount) FILTER (WHERE payment_status = ?), 0)::bigint AS paid_revenue,
		COUNT(*) FILTER (WHERE status <> ?) AS completed`,
		models.StatusCancelled, models.PaymentPaid, models.StatusCancelled).
		Scan(&totals).Error
	if err != nil {
		serverError(c, err)
		return
	}

	type countRow struct {
		Key   string
		Count int64
	}
	byStatus := map[string]int64{}
	for _, s := range models.AllStatuses {
		byStatus[string(s)] = 0
	}
	var statusRows []countRow
	if err := day.Session(&gorm.Session{}).Select("status AS key, COUNT(*) AS count").Group("status").Scan(&statusRows).Error; err != nil {
		serverError(c, err)
		return
	}
	for _, r := range statusRows {
		byStatus[r.Key] = r.Count
	}

	byType := map[string]int64{string(models.TypeDelivery): 0, string(models.TypePickup): 0}
	var typeRows []countRow
	if err := day.Session(&gorm.Session{}).Select("type AS key, COUNT(*) AS count").Group("type").Scan(&typeRows).Error; err != nil {
		serverError(c, err)
		return
	}
	for _, r := range typeRows {
		byType[r.Key] = r.Count
	}

	type topItem struct {
		Name     string     `json:"name"`
		Quantity int64      `json:"quantity"`
		Revenue  money.Kobo `json:"revenue"`
	}
	var top []topItem
	err = h.db.WithContext(ctx).Table("order_items AS oi").
		Joins("JOIN orders o ON o.id = oi.order_id").
		Where("o.created_at >= ? AND o.created_at < ? AND o.status <> ? AND o.deleted_at IS NULL AND oi.deleted_at IS NULL",
			start, end, models.StatusCancelled).
		Select("oi.name AS name, SUM(oi.quantity)::bigint AS quantity, SUM(oi.quantity * oi.unit_price)::bigint AS revenue").
		Group("oi.name").Order("quantity DESC, name ASC").Limit(5).
		Scan(&top).Error
	if err != nil {
		serverError(c, err)
		return
	}

	var refundsPending int64
	if err := h.db.WithContext(ctx).Model(&models.Order{}).Where("payment_status = ?", models.PaymentRefundPending).Count(&refundsPending).Error; err != nil {
		serverError(c, err)
		return
	}

	var avg money.Kobo
	if totals.Completed > 0 {
		avg = money.Kobo(totals.Revenue / totals.Completed)
	}
	c.JSON(http.StatusOK, gin.H{"data": gin.H{
		"date":            start.Format("2006-01-02"),
		"total_orders":    totals.TotalOrders,
		"total_revenue":   money.Kobo(totals.Revenue),
		"paid_revenue":    money.Kobo(totals.PaidRevenue),
		"average_order":   avg,
		"by_status":       byStatus,
		"by_type":         byType,
		"top_items":       top,
		"refunds_pending": refundsPending,
	}})
}
