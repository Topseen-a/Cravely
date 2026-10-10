package config

import (
	"testing"
	"time"
)

func lagos(t *testing.T) *time.Location {
	loc, err := time.LoadLocation("Africa/Lagos")
	if err != nil {
		t.Skip("tzdata not available")
	}
	return loc
}

func TestIsOpenAt(t *testing.T) {
	loc := lagos(t)
	at := func(h, m int) time.Time { return time.Date(2026, 3, 1, h, m, 0, 0, loc) }

	day := Config{Timezone: loc, OpeningTime: "08:00", ClosingTime: "22:00"}
	for _, c := range []struct {
		t    time.Time
		open bool
	}{{at(7, 59), false}, {at(8, 0), true}, {at(21, 59), true}, {at(22, 0), false}} {
		if got := day.IsOpenAt(c.t); got != c.open {
			t.Errorf("08-22 at %s: got %v want %v", c.t.Format("15:04"), got, c.open)
		}
	}

	night := Config{Timezone: loc, OpeningTime: "18:00", ClosingTime: "02:00"}
	if !night.IsOpenAt(at(1, 0)) || night.IsOpenAt(at(3, 0)) || !night.IsOpenAt(at(23, 0)) {
		t.Error("overnight hours handled incorrectly")
	}

	always := Config{Timezone: loc, OpeningTime: "00:00", ClosingTime: "00:00"}
	if !always.IsOpenAt(at(4, 0)) {
		t.Error("equal open/close times should mean 24 hours")
	}
}

func TestDayRangeUsesLagosTime(t *testing.T) {
	loc := lagos(t)
	cfg := Config{Timezone: loc}
	// 23:30 UTC on 1 March is 00:30 WAT on 2 March.
	start, end := cfg.DayRange(time.Date(2026, 3, 1, 23, 30, 0, 0, time.UTC))
	wantStart := time.Date(2026, 3, 1, 23, 0, 0, 0, time.UTC)
	if !start.Equal(wantStart) || !end.Equal(wantStart.Add(24*time.Hour)) {
		t.Fatalf("got [%s, %s), want start %s", start.UTC(), end.UTC(), wantStart)
	}
}

func TestDatabaseURLTakesPrecedence(t *testing.T) {
	c := Config{DatabaseURL: "postgres://u:p@db.example.com/fooddash", DBHost: "localhost"}
	if got := c.DSN(); got != "postgres://u:p@db.example.com/fooddash?timezone=UTC" {
		t.Fatalf("got %q", got)
	}
	c.DatabaseURL = "postgres://u:p@db.example.com/fooddash?sslmode=require"
	if got := c.DSN(); got != "postgres://u:p@db.example.com/fooddash?sslmode=require&timezone=UTC" {
		t.Fatalf("got %q", got)
	}
}

func TestLoadRequiresSecretInProduction(t *testing.T) {
	t.Setenv("APP_ENV", "production")
	t.Setenv("JWT_SECRET", "")
	if _, err := Load(); err == nil {
		t.Fatal("expected error without JWT_SECRET in production")
	}
	t.Setenv("JWT_SECRET", "short")
	if _, err := Load(); err == nil {
		t.Fatal("expected error for short JWT_SECRET in production")
	}
	t.Setenv("JWT_SECRET", "a-very-long-secret-value-of-at-least-32-chars")
	if _, err := Load(); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}
