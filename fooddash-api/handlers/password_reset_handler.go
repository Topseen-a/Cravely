package handlers

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"fooddash-api/mailer"
	"fooddash-api/models"
	"log/slog"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

const resetValidFor = 30 * time.Minute

func hashResetToken(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}

// ForgotPassword emails a one-time reset link. It always answers the same
// way, so it can't be used to discover which emails have accounts.
func (h *Handler) ForgotPassword(c *gin.Context) {
	var input models.ForgotPasswordInput
	if !bindJSON(c, &input) {
		return
	}
	const reply = "If an account exists for that email, we've sent a link to reset the password."

	var user models.User
	err := h.db.WithContext(c.Request.Context()).Where("email = ?", normalizeEmail(input.Email)).First(&user).Error
	if isNotFound(err) {
		c.JSON(http.StatusOK, gin.H{"message": reply})
		return
	}
	if err != nil {
		serverError(c, err)
		return
	}

	buf := make([]byte, 32)
	if _, err := rand.Read(buf); err != nil {
		serverError(c, err)
		return
	}
	token := hex.EncodeToString(buf)

	err = h.db.WithContext(c.Request.Context()).Transaction(func(tx *gorm.DB) error {
		// Only the newest link works.
		now := time.Now()
		if err := tx.Model(&models.PasswordReset{}).Where("user_id = ? AND used_at IS NULL", user.ID).Update("used_at", &now).Error; err != nil {
			return err
		}
		return tx.Create(&models.PasswordReset{UserID: user.ID, TokenHash: hashResetToken(token), ExpiresAt: now.Add(resetValidFor)}).Error
	})
	if err != nil {
		serverError(c, err)
		return
	}

	link := h.cfg.AppURL + "/reset-password?token=" + url.QueryEscape(token)
	msg := mailer.PasswordReset(user.Email, user.Name, link, int(resetValidFor.Minutes()))

	// Send in the background so the response time doesn't reveal whether
	// the account exists.
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()
		switch {
		case h.mail.Enabled():
			if err := h.mail.Send(ctx, msg); err != nil {
				slog.Error("password reset email failed", "user_id", user.ID, "err", err)
			}
		case !h.cfg.IsProduction():
			slog.Warn("SMTP not configured; password reset link (development only)", "email", user.Email, "link", link)
		default:
			slog.Error("SMTP not configured; cannot send password reset email", "user_id", user.ID)
		}
	}()

	c.JSON(http.StatusOK, gin.H{"message": reply})
}

// ResetPassword sets a new password using a reset link, signs out all other
// sessions, and logs the user straight in.
func (h *Handler) ResetPassword(c *gin.Context) {
	var input models.ResetPasswordInput
	if !bindJSON(c, &input) {
		return
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	if err != nil {
		serverError(c, err)
		return
	}

	var user models.User
	err = h.db.WithContext(c.Request.Context()).Transaction(func(tx *gorm.DB) error {
		var reset models.PasswordReset
		err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("token_hash = ? AND used_at IS NULL AND expires_at > ?", hashResetToken(strings.TrimSpace(input.Token)), time.Now()).
			First(&reset).Error
		if err != nil {
			return err
		}
		now := time.Now()
		if err := tx.Model(&models.PasswordReset{}).Where("user_id = ? AND used_at IS NULL", reset.UserID).Update("used_at", &now).Error; err != nil {
			return err
		}
		if err := tx.First(&user, reset.UserID).Error; err != nil {
			return err
		}
		return tx.Model(&user).Updates(map[string]any{"password_hash": string(hash), "password_changed_at": &now}).Error
	})
	if isNotFound(err) {
		fail(c, http.StatusBadRequest, "This reset link is invalid or has expired. Please request a new one.")
		return
	}
	if err != nil {
		serverError(c, err)
		return
	}

	token, exp, err := h.tokens.Issue(user)
	if err != nil {
		serverError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Password updated", "token": token, "expires_at": exp, "user": user})
}
