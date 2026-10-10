package handlers

import (
	"crypto/subtle"
	"fooddash-api/middleware"
	"fooddash-api/models"
	"fooddash-api/phone"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
)

// dummyHash is compared against when a login email doesn't exist, so the
// response time doesn't reveal which emails are registered.
var dummyHash, _ = bcrypt.GenerateFromPassword([]byte("not-a-real-password"), bcrypt.DefaultCost)

func normalizeEmail(e string) string { return strings.ToLower(strings.TrimSpace(e)) }

func (h *Handler) RegisterUser(c *gin.Context) {
	var input models.RegisterInput
	if !bindJSON(c, &input) {
		return
	}
	h.createAccount(c, input.Name, input.Email, input.Phone, input.Password, models.RoleCustomer)
}

func (h *Handler) RegisterStaff(c *gin.Context) {
	var input models.RegisterStaffInput
	if !bindJSON(c, &input) {
		return
	}
	if h.cfg.StaffCode == "" || subtle.ConstantTimeCompare([]byte(input.StaffCode), []byte(h.cfg.StaffCode)) != 1 {
		fail(c, http.StatusForbidden, "Invalid staff code")
		return
	}
	h.createAccount(c, input.Name, input.Email, input.Phone, input.Password, models.RoleStaff)
}

func (h *Handler) createAccount(c *gin.Context, name, email, rawPhone, password string, role models.Role) {
	name = strings.TrimSpace(name)
	if name == "" {
		fail(c, http.StatusBadRequest, "name is required")
		return
	}
	var normalizedPhone string
	if strings.TrimSpace(rawPhone) != "" {
		p, err := phone.Normalize(rawPhone)
		if err != nil {
			fail(c, http.StatusBadRequest, err.Error())
			return
		}
		normalizedPhone = p
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		serverError(c, err)
		return
	}

	user := models.User{
		Name:         name,
		Email:        normalizeEmail(email),
		Phone:        normalizedPhone,
		PasswordHash: string(hash),
		Role:         role,
	}
	if err := h.db.WithContext(c.Request.Context()).Create(&user).Error; err != nil {
		if isDuplicate(err) {
			fail(c, http.StatusConflict, "An account with this email already exists")
			return
		}
		serverError(c, err)
		return
	}

	token, exp, err := h.tokens.Issue(user)
	if err != nil {
		serverError(c, err)
		return
	}
	c.JSON(http.StatusCreated, gin.H{"data": user, "user": user, "token": token, "expires_at": exp})
}

func (h *Handler) LoginUser(c *gin.Context) {
	var input models.LoginInput
	if !bindJSON(c, &input) {
		return
	}

	var user models.User
	err := h.db.WithContext(c.Request.Context()).Where("email = ?", normalizeEmail(input.Email)).First(&user).Error
	if err != nil && !isNotFound(err) {
		serverError(c, err)
		return
	}

	hash := dummyHash
	if err == nil {
		hash = []byte(user.PasswordHash)
	}
	if bcrypt.CompareHashAndPassword(hash, []byte(input.Password)) != nil || err != nil {
		fail(c, http.StatusUnauthorized, "Invalid email or password")
		return
	}

	token, exp, err := h.tokens.Issue(user)
	if err != nil {
		serverError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"token": token, "expires_at": exp, "user": user})
}

func (h *Handler) GetMe(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"data": middleware.CurrentUser(c)})
}

func (h *Handler) UpdateMe(c *gin.Context) {
	user := middleware.CurrentUser(c)
	var input models.UpdateProfileInput
	if !bindJSON(c, &input) {
		return
	}

	updates := map[string]any{}
	if input.Name != nil {
		name := strings.TrimSpace(*input.Name)
		if name == "" {
			fail(c, http.StatusBadRequest, "name cannot be empty")
			return
		}
		updates["name"] = name
	}
	if input.Phone != nil {
		if strings.TrimSpace(*input.Phone) == "" {
			updates["phone"] = ""
		} else {
			p, err := phone.Normalize(*input.Phone)
			if err != nil {
				fail(c, http.StatusBadRequest, err.Error())
				return
			}
			updates["phone"] = p
		}
	}
	if len(updates) > 0 {
		if err := h.db.WithContext(c.Request.Context()).Model(&user).Updates(updates).Error; err != nil {
			serverError(c, err)
			return
		}
		if err := h.db.WithContext(c.Request.Context()).First(&user, user.ID).Error; err != nil {
			serverError(c, err)
			return
		}
	}
	c.JSON(http.StatusOK, gin.H{"data": user})
}

func (h *Handler) ChangePassword(c *gin.Context) {
	user := middleware.CurrentUser(c)
	var input models.ChangePasswordInput
	if !bindJSON(c, &input) {
		return
	}
	if bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(input.CurrentPassword)) != nil {
		fail(c, http.StatusBadRequest, "Current password is incorrect")
		return
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(input.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		serverError(c, err)
		return
	}
	// Signs out every other session; this one gets a fresh token.
	now := time.Now()
	if err := h.db.WithContext(c.Request.Context()).Model(&user).Updates(map[string]any{"password_hash": string(hash), "password_changed_at": &now}).Error; err != nil {
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
