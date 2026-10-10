package handlers

import (
	"encoding/json"
	"errors"
	"fmt"
	"fooddash-api/auth"
	"fooddash-api/config"
	"fooddash-api/mailer"
	"fooddash-api/middleware"
	"fooddash-api/payments/paystack"
	"fooddash-api/ws"
	"log/slog"
	"net/http"
	"reflect"
	"slices"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/gin-gonic/gin/binding"
	"github.com/go-playground/validator/v10"
	"github.com/gorilla/websocket"
	"gorm.io/gorm"
)

// Handler holds the dependencies shared by all HTTP handlers.
type Handler struct {
	db       *gorm.DB
	cfg      config.Config
	tokens   *auth.TokenService
	hub      *ws.Hub
	paystack *paystack.Client
	mail     mailer.Mailer
	upgrader websocket.Upgrader
}

func New(gdb *gorm.DB, cfg config.Config, tokens *auth.TokenService, hub *ws.Hub, ps *paystack.Client, mail mailer.Mailer) *Handler {
	if v, ok := binding.Validator.Engine().(*validator.Validate); ok {
		// Report JSON field names ("menu_item_id") instead of Go names.
		v.RegisterTagNameFunc(func(f reflect.StructField) string {
			name, _, _ := strings.Cut(f.Tag.Get("json"), ",")
			if name == "-" || name == "" {
				return f.Name
			}
			return name
		})
	}

	h := &Handler{db: gdb, cfg: cfg, tokens: tokens, hub: hub, paystack: ps, mail: mail}
	h.upgrader = websocket.Upgrader{
		ReadBufferSize:  1024,
		WriteBufferSize: 1024,
		CheckOrigin: func(r *http.Request) bool {
			origin := r.Header.Get("Origin")
			return origin == "" || slices.Contains(cfg.CORSOrigins, origin)
		},
	}
	return h
}

// fail sends a JSON error response.
func fail(c *gin.Context, status int, msg string) {
	c.AbortWithStatusJSON(status, gin.H{"error": msg})
}

// serverError logs the real error and returns a generic message, so database
// details never leak to clients.
func serverError(c *gin.Context, err error) {
	reqID := c.GetString(middleware.RequestIDKey)
	slog.Error("internal error", "request_id", reqID, "path", c.FullPath(), "err", err)
	c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{
		"error":      "Something went wrong. Please try again.",
		"request_id": reqID,
	})
}

// bindJSON decodes and validates the body. On failure it writes a 400 with a
// readable message plus per-field details, and returns false.
func bindJSON(c *gin.Context, dst any) bool {
	err := c.ShouldBindJSON(dst)
	if err == nil {
		return true
	}

	var verrs validator.ValidationErrors
	if errors.As(err, &verrs) {
		fields := map[string]string{}
		msgs := make([]string, 0, len(verrs))
		for _, fe := range verrs {
			m := fieldMessage(fe)
			fields[fe.Field()] = m
			msgs = append(msgs, m)
		}
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": strings.Join(msgs, "; "), "fields": fields})
		return false
	}

	var typeErr *json.UnmarshalTypeError
	if errors.As(err, &typeErr) {
		fail(c, http.StatusBadRequest, fmt.Sprintf("%s has the wrong type", typeErr.Field))
		return false
	}
	fail(c, http.StatusBadRequest, "Invalid request body")
	return false
}

func fieldMessage(fe validator.FieldError) string {
	f := fe.Field()
	switch fe.Tag() {
	case "required":
		return f + " is required"
	case "email":
		return f + " must be a valid email address"
	case "url":
		return f + " must be a valid URL"
	case "oneof":
		return fmt.Sprintf("%s must be one of: %s", f, strings.ReplaceAll(fe.Param(), " ", ", "))
	case "min":
		if fe.Kind() == reflect.String {
			return fmt.Sprintf("%s must be at least %s characters", f, fe.Param())
		}
		return fmt.Sprintf("%s must be at least %s", f, fe.Param())
	case "max":
		if fe.Kind() == reflect.String {
			return fmt.Sprintf("%s must be at most %s characters", f, fe.Param())
		}
		return fmt.Sprintf("%s must be at most %s", f, fe.Param())
	case "gt":
		return fmt.Sprintf("%s must be greater than %s", f, fe.Param())
	case "gte":
		return fmt.Sprintf("%s must be %s or more", f, fe.Param())
	case "lte":
		return fmt.Sprintf("%s must be %s or less", f, fe.Param())
	}
	return f + " is invalid"
}

// idParam parses a numeric path parameter, writing a 404 if it is malformed.
func idParam(c *gin.Context, name string) (uint, bool) {
	id, err := strconv.ParseUint(c.Param(name), 10, 64)
	if err != nil || id == 0 {
		fail(c, http.StatusNotFound, "Not found")
		return 0, false
	}
	return uint(id), true
}

// pagination reads ?page= and ?page_size= with sane bounds.
func pagination(c *gin.Context) (page, size int) {
	page, _ = strconv.Atoi(c.Query("page"))
	size, _ = strconv.Atoi(c.Query("page_size"))
	if page < 1 {
		page = 1
	}
	if size < 1 || size > 100 {
		size = 20
	}
	return page, size
}

func isNotFound(err error) bool { return errors.Is(err, gorm.ErrRecordNotFound) }

func isDuplicate(err error) bool { return errors.Is(err, gorm.ErrDuplicatedKey) }
