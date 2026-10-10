package models

import (
	"fooddash-api/money"
	"time"

	"gorm.io/gorm"
)

// Payment is one online payment attempt for an order. An order can have
// several attempts (e.g. a failed card followed by a bank transfer); each has
// its own provider reference.
type Payment struct {
	gorm.Model
	OrderID          uint          `json:"order_id" gorm:"index"`
	Provider         string        `json:"provider"`
	Reference        string        `json:"reference" gorm:"uniqueIndex;size:40"`
	Amount           money.Kobo    `json:"amount" gorm:"type:bigint;not null"`
	Status           PaymentStatus `json:"status"`
	Channel          string        `json:"channel"` // card, bank_transfer, ussd...
	AuthorizationURL string        `json:"authorization_url"`
	AccessCode       string        `json:"access_code"`
	PaidAt           *time.Time    `json:"paid_at"`
}
