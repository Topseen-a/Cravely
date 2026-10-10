// Package money represents Naira amounts as an integer number of kobo so that
// prices and totals never suffer from floating-point rounding errors.
//
// In JSON a Kobo value is written and read as Naira (e.g. 1500.5), which keeps
// the API friendly for clients, while the database stores exact kobo (bigint).
package money

import (
	"encoding/json"
	"fmt"
	"math"
	"strconv"
	"strings"
)

type Kobo int64

func FromNaira(n float64) Kobo { return Kobo(math.Round(n * 100)) }

func (k Kobo) Naira() float64 { return float64(k) / 100 }

// Mul multiplies by an integer quantity.
func (k Kobo) Mul(q int) Kobo { return k * Kobo(q) }

// Percent returns k * basisPoints / 10000, rounded half up (750 bp = 7.5%).
func (k Kobo) Percent(basisPoints int64) Kobo {
	return Kobo((int64(k)*basisPoints + 5000) / 10000)
}

// String formats the amount as Naira, e.g. "₦1,500.00".
func (k Kobo) String() string {
	sign := ""
	v := int64(k)
	if v < 0 {
		sign, v = "-", -v
	}
	whole := strconv.FormatInt(v/100, 10)
	var b strings.Builder
	for i, r := range whole {
		if i > 0 && (len(whole)-i)%3 == 0 {
			b.WriteByte(',')
		}
		b.WriteRune(r)
	}
	return fmt.Sprintf("%s₦%s.%02d", sign, b.String(), v%100)
}

func (k Kobo) MarshalJSON() ([]byte, error) {
	return []byte(strconv.FormatFloat(k.Naira(), 'f', -1, 64)), nil
}

func (k *Kobo) UnmarshalJSON(data []byte) error {
	var n json.Number
	if err := json.Unmarshal(data, &n); err != nil {
		return fmt.Errorf("amount must be a number in Naira")
	}
	f, err := n.Float64()
	if err != nil || math.IsNaN(f) || math.IsInf(f, 0) {
		return fmt.Errorf("amount must be a number in Naira")
	}
	*k = FromNaira(f)
	return nil
}
