package middleware

import (
	"errors"
	"fooddash-api/auth"
	"fooddash-api/models"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

const currentUserKey = "currentUser"

// RequireAuth validates the bearer token and loads the user into the context.
// The user is reloaded on each request so a deleted account or changed role
// takes effect immediately.
func RequireAuth(gdb *gorm.DB, tokens *auth.TokenService) gin.HandlerFunc {
	return func(c *gin.Context) {
		header := c.GetHeader("Authorization")
		tokenStr, ok := strings.CutPrefix(header, "Bearer ")
		if !ok || tokenStr == "" {
			abort(c, http.StatusUnauthorized, "Authentication required")
			return
		}

		user, err := UserFromToken(c, gdb, tokens, tokenStr)
		if err != nil {
			abort(c, http.StatusUnauthorized, "Your session has expired. Please log in again.")
			return
		}
		c.Set(currentUserKey, user)
		c.Next()
	}
}

// UserFromToken verifies tokenStr and loads its user.
func UserFromToken(c *gin.Context, gdb *gorm.DB, tokens *auth.TokenService, tokenStr string) (models.User, error) {
	var user models.User
	userID, issuedAt, err := tokens.Parse(tokenStr)
	if err != nil {
		return user, err
	}
	err = gdb.WithContext(c.Request.Context()).First(&user, userID).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return user, errors.New("user no longer exists")
	}
	if err != nil {
		return user, err
	}
	// Changing or resetting a password signs out every older session.
	// JWT times have one-second precision, hence the truncation.
	if user.PasswordChangedAt != nil && issuedAt.Before(user.PasswordChangedAt.Truncate(time.Second)) {
		return user, errors.New("session ended by a password change")
	}
	return user, nil
}

func RequireStaff(c *gin.Context) {
	if CurrentUser(c).Role != models.RoleStaff {
		abort(c, http.StatusForbidden, "Staff access required")
		return
	}
	c.Next()
}

// CurrentUser returns the authenticated user. Only valid behind RequireAuth.
func CurrentUser(c *gin.Context) models.User {
	user, _ := c.MustGet(currentUserKey).(models.User)
	return user
}

func abort(c *gin.Context, status int, msg string) {
	c.AbortWithStatusJSON(status, gin.H{"error": msg})
}
