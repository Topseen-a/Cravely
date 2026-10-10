package models

import (
	"fooddash-api/money"
	"strings"
	"testing"
)

func TestTransitions(t *testing.T) {
	cases := []struct {
		typ      OrderType
		from, to OrderStatus
		ok       bool
	}{
		{TypeDelivery, StatusReceived, StatusPreparing, true},
		{TypeDelivery, StatusReady, StatusOutForDelivery, true},
		{TypeDelivery, StatusOutForDelivery, StatusDelivered, true},
		{TypeDelivery, StatusReady, StatusPickedUp, false}, // wrong type
		{TypePickup, StatusReady, StatusPickedUp, true},
		{TypePickup, StatusReady, StatusDelivered, false},
		{TypePickup, StatusReady, StatusOutForDelivery, false},
		{TypeDelivery, StatusReceived, StatusReady, false}, // skipping a step
		{TypeDelivery, StatusDelivered, StatusCancelled, false},
		{TypeDelivery, StatusOutForDelivery, StatusCancelled, false},
		{TypePickup, StatusCancelled, StatusReceived, false},
	}
	for _, c := range cases {
		o := Order{Type: c.typ, Status: c.from}
		if got := o.CanTransitionTo(c.to); got != c.ok {
			t.Errorf("%s %s -> %s: got %v, want %v", c.typ, c.from, c.to, got, c.ok)
		}
	}
	if next := (&Order{Type: TypePickup, Status: StatusPickedUp}).AllowedNextStatuses(); next == nil || len(next) != 0 {
		t.Errorf("terminal status should have an empty, non-nil list, got %#v", next)
	}
}

func TestCalculateTotals(t *testing.T) {
	got := CalculateTotals(money.FromNaira(7000), money.FromNaira(1500), 750)
	want := Totals{
		Subtotal:    money.FromNaira(7000),
		DeliveryFee: money.FromNaira(1500),
		VAT:         money.FromNaira(525), // VAT on food only, not delivery
		Total:       money.FromNaira(9025),
	}
	if got != want {
		t.Fatalf("got %+v, want %+v", got, want)
	}
}

func TestNewReference(t *testing.T) {
	seen := map[string]bool{}
	for range 1000 {
		ref := NewReference("CRV-", 8)
		if len(ref) != 12 || !strings.HasPrefix(ref, "CRV-") {
			t.Fatalf("bad reference %q", ref)
		}
		if strings.ContainsAny(ref[4:], "01OI") {
			t.Fatalf("reference %q contains ambiguous characters", ref)
		}
		if seen[ref] {
			t.Fatalf("duplicate reference %q", ref)
		}
		seen[ref] = true
	}
}
