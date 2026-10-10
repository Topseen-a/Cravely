package models

import (
	"crypto/rand"
	"fooddash-api/money"
	"time"

	"gorm.io/gorm"
)

type OrderStatus string
type OrderType string
type PaymentMethod string
type PaymentStatus string

const (
	StatusReceived       OrderStatus = "RECEIVED"
	StatusPreparing      OrderStatus = "PREPARING"
	StatusReady          OrderStatus = "READY"
	StatusOutForDelivery OrderStatus = "OUT_FOR_DELIVERY"
	StatusDelivered      OrderStatus = "DELIVERED"
	StatusPickedUp       OrderStatus = "PICKED_UP"
	StatusCancelled      OrderStatus = "CANCELLED"

	TypeDelivery OrderType = "delivery"
	TypePickup   OrderType = "pickup"

	// PayOnDelivery covers cash, POS or bank transfer to the rider/cashier.
	PayOnDelivery PaymentMethod = "pay_on_delivery"
	PayPaystack   PaymentMethod = "paystack"

	PaymentPending       PaymentStatus = "pending"
	PaymentPaid          PaymentStatus = "paid"
	PaymentFailed        PaymentStatus = "failed"
	PaymentRefundPending PaymentStatus = "refund_pending"
)

var AllStatuses = []OrderStatus{
	StatusReceived, StatusPreparing, StatusReady, StatusOutForDelivery,
	StatusDelivered, StatusPickedUp, StatusCancelled,
}

func (s OrderStatus) Valid() bool {
	for _, v := range AllStatuses {
		if v == s {
			return true
		}
	}
	return false
}

func (s OrderStatus) IsTerminal() bool {
	return s == StatusDelivered || s == StatusPickedUp || s == StatusCancelled
}

var transitions = map[OrderType]map[OrderStatus][]OrderStatus{
	TypeDelivery: {
		StatusReceived:       {StatusPreparing, StatusCancelled},
		StatusPreparing:      {StatusReady, StatusCancelled},
		StatusReady:          {StatusOutForDelivery, StatusDelivered, StatusCancelled},
		StatusOutForDelivery: {StatusDelivered},
	},
	TypePickup: {
		StatusReceived:  {StatusPreparing, StatusCancelled},
		StatusPreparing: {StatusReady, StatusCancelled},
		StatusReady:     {StatusPickedUp, StatusCancelled},
	},
}

// AllowedNextStatuses returns the statuses an order may move to next.
func (o *Order) AllowedNextStatuses() []OrderStatus {
	next := transitions[o.Type][o.Status]
	if next == nil {
		return []OrderStatus{}
	}
	return next
}

func (o *Order) CanTransitionTo(to OrderStatus) bool {
	for _, s := range o.AllowedNextStatuses() {
		if s == to {
			return true
		}
	}
	return false
}

type Order struct {
	gorm.Model
	Reference       string        `json:"reference" gorm:"uniqueIndex;size:20"`
	UserID          uint          `json:"user_id" gorm:"index"`
	User            *User         `json:"customer,omitempty" gorm:"foreignKey:UserID"`
	Type            OrderType     `json:"type"`
	Status          OrderStatus   `json:"status" gorm:"default:RECEIVED;index"`
	PaymentMethod   PaymentMethod `json:"payment_method" gorm:"default:pay_on_delivery"`
	PaymentStatus   PaymentStatus `json:"payment_status" gorm:"default:pending"`
	PaidAt          *time.Time    `json:"paid_at"`
	Subtotal        money.Kobo    `json:"subtotal" gorm:"type:bigint;not null;default:0"`
	DeliveryFee     money.Kobo    `json:"delivery_fee" gorm:"type:bigint;not null;default:0"`
	VAT             money.Kobo    `json:"vat" gorm:"column:vat;type:bigint;not null;default:0"`
	TotalAmount     money.Kobo    `json:"total_amount" gorm:"type:bigint;not null;default:0"`
	DeliveryZoneID  *uint         `json:"delivery_zone_id"`
	DeliveryZone    *DeliveryZone `json:"delivery_zone,omitempty" gorm:"foreignKey:DeliveryZoneID"`
	DeliveryAddress string        `json:"delivery_address"`
	Landmark        string        `json:"landmark"`
	ContactPhone    string        `json:"contact_phone"`
	Note            string        `json:"note"`
	CancelReason    string        `json:"cancel_reason,omitempty"`
	Items           []OrderItem   `json:"items" gorm:"foreignKey:OrderID"`
	Events          []OrderEvent  `json:"events" gorm:"foreignKey:OrderID"`

	// NextStatuses is filled in for staff so the dashboard knows which
	// buttons to show. Not stored.
	NextStatuses []OrderStatus `json:"next_statuses,omitempty" gorm:"-"`
}

type OrderItem struct {
	gorm.Model
	OrderID             uint       `json:"order_id" gorm:"index"`
	MenuItemID          uint       `json:"menu_item_id"`
	MenuItem            MenuItem   `json:"menu_item" gorm:"foreignKey:MenuItemID"`
	Name                string     `json:"name"` // snapshot, survives menu edits
	Quantity            int        `json:"quantity"`
	UnitPrice           money.Kobo `json:"unit_price" gorm:"type:bigint;not null"`
	SpecialInstructions string     `json:"special_instructions"`
}

// Totals holds the price breakdown of an order.
type Totals struct {
	Subtotal    money.Kobo `json:"subtotal"`
	DeliveryFee money.Kobo `json:"delivery_fee"`
	VAT         money.Kobo `json:"vat"`
	Total       money.Kobo `json:"total"`
}

func CalculateTotals(subtotal, deliveryFee money.Kobo, vatBasisPoints int64) Totals {
	vat := subtotal.Percent(vatBasisPoints)
	return Totals{Subtotal: subtotal, DeliveryFee: deliveryFee, VAT: vat, Total: subtotal + deliveryFee + vat}
}

// referenceAlphabet omits look-alike characters (0/O, 1/I) so references are
// easy to read out over the phone. Its length (32) divides 256, so mapping
// random bytes onto it is unbiased.
const referenceAlphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"

// NewReference returns a short human-friendly reference like "CRV-7K3F9QXA".
func NewReference(prefix string, n int) string {
	b := make([]byte, n)
	if _, err := rand.Read(b); err != nil {
		panic(err) // crypto/rand never fails on supported platforms
	}
	for i := range b {
		b[i] = referenceAlphabet[int(b[i])%len(referenceAlphabet)]
	}
	return prefix + string(b)
}

type PlaceOrderInput struct {
	Type            OrderType     `json:"type" binding:"required,oneof=delivery pickup"`
	PaymentMethod   PaymentMethod `json:"payment_method" binding:"omitempty,oneof=pay_on_delivery paystack"`
	DeliveryZoneID  *uint         `json:"delivery_zone_id"`
	DeliveryAddress string        `json:"delivery_address" binding:"max=500"`
	Landmark        string        `json:"landmark" binding:"max=200"`
	ContactPhone    string        `json:"contact_phone" binding:"max=20"`
	Note            string        `json:"note" binding:"max=500"`
}

type UpdateOrderStatusInput struct {
	Status OrderStatus `json:"status" binding:"required"`
	Note   string      `json:"note" binding:"max=300"`
}

type CancelOrderInput struct {
	Reason string `json:"reason" binding:"max=300"`
}
