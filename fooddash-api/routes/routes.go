package routes

import (
	"fooddash-api/auth"
	"fooddash-api/handlers"
	"fooddash-api/middleware"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func SetupRoutes(r *gin.Engine, h *handlers.Handler, gdb *gorm.DB, tokens *auth.TokenService, authPerMinute int) {
	r.GET("/healthz", h.Healthz)
	r.GET("/readyz", h.Readyz)

	// WebSockets are served both at the root (what the current frontend
	// uses) and under /api/v1 (so a single VITE_API_URL works for both).
	for _, g := range []*gin.RouterGroup{r.Group("/ws"), r.Group("/api/v1/ws")} {
		g.GET("/orders/:id", h.ServeOrderWS)
		g.GET("/staff", h.ServeStaffWS)
	}

	api := r.Group("/api/v1")
	requireAuth := middleware.RequireAuth(gdb, tokens)

	// Public
	authGroup := api.Group("/auth")
	authGroup.Use(middleware.RateLimit(float64(authPerMinute), max(min(authPerMinute, 5), authPerMinute/10)))
	authGroup.POST("/register", h.RegisterUser)
	authGroup.POST("/register-staff", h.RegisterStaff)
	authGroup.POST("/login", h.LoginUser)
	authGroup.POST("/forgot-password", h.ForgotPassword)
	authGroup.POST("/reset-password", h.ResetPassword)

	api.GET("/store", h.GetStoreInfo)
	api.GET("/categories", h.GetCategories)
	api.GET("/menu", h.GetFullMenu)
	api.GET("/delivery-zones", h.GetDeliveryZones)
	api.POST("/webhooks/paystack", h.PaystackWebhook)

	// Signed-in users
	user := api.Group("", requireAuth)
	user.GET("/auth/me", h.GetMe)
	user.PATCH("/auth/me", h.UpdateMe)
	user.PUT("/auth/me/password", h.ChangePassword)

	cart := user.Group("/cart")
	cart.GET("", h.GetCart)
	cart.POST("/items", h.AddToCart)
	cart.PATCH("/items/:id", h.UpdateCartItem)
	cart.DELETE("/items/:id", h.RemoveCartItem)
	cart.DELETE("", h.ClearCart)

	orders := user.Group("/orders")
	orders.POST("", h.PlaceOrder)
	orders.GET("", h.GetMyOrders)
	orders.GET("/:id", h.GetOrder)
	orders.POST("/:id/cancel", h.CancelOrder)
	orders.POST("/:id/pay", h.PayOrder)

	user.GET("/payments/verify", h.VerifyPayment)

	// Staff
	staff := api.Group("/staff", requireAuth, middleware.RequireStaff)
	staff.GET("/orders", h.GetTodaysOrders)
	staff.GET("/orders/:id", h.GetOrderStaff)
	staff.PATCH("/orders/:id/status", h.UpdateOrderStatus)
	staff.GET("/summary", h.GetDailySummary)

	staff.GET("/menu", h.GetMenuAdmin)
	staff.POST("/menu", h.CreateMenuItem)
	staff.PUT("/menu/:id", h.UpdateMenuItem)
	staff.DELETE("/menu/:id", h.DeleteMenuItem)
	staff.PATCH("/menu/:id/availability", h.ToggleAvailability)
	staff.PATCH("/menu/:id/sold-out-note", h.SetSoldOutNote)

	staff.POST("/categories", h.CreateCategory)
	staff.PUT("/categories/:id", h.UpdateCategory)
	staff.DELETE("/categories/:id", h.DeleteCategory)

	staff.GET("/delivery-zones", h.ListDeliveryZonesAdmin)
	staff.POST("/delivery-zones", h.CreateDeliveryZone)
	staff.PUT("/delivery-zones/:id", h.UpdateDeliveryZone)
	staff.DELETE("/delivery-zones/:id", h.DeleteDeliveryZone)
}
