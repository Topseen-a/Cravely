package money

import (
	"encoding/json"
	"testing"
)

func TestJSONRoundTrip(t *testing.T) {
	var k Kobo
	if err := json.Unmarshal([]byte(`1500.5`), &k); err != nil {
		t.Fatal(err)
	}
	if k != 150050 {
		t.Fatalf("got %d kobo, want 150050", k)
	}
	b, _ := json.Marshal(k)
	if string(b) != "1500.5" {
		t.Fatalf("got %s, want 1500.5", b)
	}
}

func TestFloatPrecision(t *testing.T) {
	// 0.1 + 0.2 style errors must not leak into totals.
	if got := FromNaira(0.1) + FromNaira(0.2); got != FromNaira(0.3) {
		t.Fatalf("got %d, want %d", got, FromNaira(0.3))
	}
}

func TestRejectsNonNumbers(t *testing.T) {
	var k Kobo
	if err := json.Unmarshal([]byte(`"abc"`), &k); err == nil {
		t.Fatal("expected error for string input")
	}
}

func TestPercent(t *testing.T) {
	cases := []struct {
		amount Kobo
		bp     int64
		want   Kobo
	}{
		{FromNaira(1000), 750, FromNaira(75)}, // 7.5% VAT
		{1, 750, 0},                           // rounds half up: 0.075 -> 0
		{7, 750, 1},                           // 0.525 -> 1
		{FromNaira(3500), 0, 0},
	}
	for _, c := range cases {
		if got := c.amount.Percent(c.bp); got != c.want {
			t.Errorf("%d.Percent(%d) = %d, want %d", c.amount, c.bp, got, c.want)
		}
	}
}

func TestString(t *testing.T) {
	cases := map[Kobo]string{
		0:              "₦0.00",
		150050:         "₦1,500.50",
		123456789:      "₦1,234,567.89",
		-50000:         "-₦500.00",
		FromNaira(1e6): "₦1,000,000.00",
	}
	for in, want := range cases {
		if got := in.String(); got != want {
			t.Errorf("%d.String() = %q, want %q", in, got, want)
		}
	}
}
