package middleware

import (
	"crypto/rand"
	"encoding/hex"
	"log/slog"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

const RequestIDKey = "requestID"

// RequestID tags every request with an ID (reusing the caller's X-Request-ID
// when it looks sane) so logs and error reports can be correlated.
func RequestID(c *gin.Context) {
	id := c.GetHeader("X-Request-ID")
	if id == "" || len(id) > 64 {
		b := make([]byte, 8)
		_, _ = rand.Read(b)
		id = hex.EncodeToString(b)
	}
	c.Set(RequestIDKey, id)
	c.Header("X-Request-ID", id)
	c.Next()
}

func Logger(c *gin.Context) {
	start := time.Now()
	c.Next()

	status := c.Writer.Status()
	attrs := []any{
		"request_id", c.GetString(RequestIDKey),
		"method", c.Request.Method,
		"path", c.FullPath(),
		"status", status,
		"duration_ms", time.Since(start).Milliseconds(),
		"ip", c.ClientIP(),
	}
	if len(c.Errors) > 0 {
		attrs = append(attrs, "errors", c.Errors.String())
	}
	switch {
	case status >= 500:
		slog.Error("request", attrs...)
	case status >= 400:
		slog.Warn("request", attrs...)
	default:
		slog.Info("request", attrs...)
	}
}

// Recovery turns panics into a JSON 500 instead of a dropped connection.
func Recovery(c *gin.Context) {
	defer func() {
		if r := recover(); r != nil {
			slog.Error("panic recovered", "request_id", c.GetString(RequestIDKey), "panic", r)
			c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{
				"error":      "Something went wrong. Please try again.",
				"request_id": c.GetString(RequestIDKey),
			})
		}
	}()
	c.Next()
}

func SecurityHeaders(c *gin.Context) {
	h := c.Writer.Header()
	h.Set("X-Content-Type-Options", "nosniff")
	h.Set("X-Frame-Options", "DENY")
	h.Set("Referrer-Policy", "no-referrer")
	c.Next()
}
