package middleware

import (
	"time"

	"github.com/gin-contrib/cors"
)

func CORSConfig(origins []string) cors.Config {
	config := cors.DefaultConfig()
	config.AllowOrigins = origins
	config.AllowHeaders = []string{"Origin", "Content-Type", "Authorization", "X-Request-ID"}
	config.AllowMethods = []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"}
	config.ExposeHeaders = []string{"X-Request-ID", "Retry-After"}
	config.AllowCredentials = true
	config.MaxAge = 12 * time.Hour
	return config
}
