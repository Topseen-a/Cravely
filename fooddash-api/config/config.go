package config

import (
	"errors"
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"
)

type Config struct {
	Env  string // "development" or "production"
	Port string

	DBHost, DBUser, DBPassword, DBName, DBPort, DBSSLMode string

	JWTSecret string
	JWTTTL    time.Duration
	StaffCode string

	CORSOrigins    []string
	TrustedProxies []string

	// Login/registration attempts allowed per IP per minute.
	AuthRateLimitPerMinute int

	// Business settings. All money values are in kobo.
	Timezone       *time.Location
	OpeningTime    string // "HH:MM" in Timezone
	ClosingTime    string // "HH:MM" in Timezone
	VATBasisPoints int64  // 750 = 7.5%
	MinOrderKobo   int64

	PaystackSecretKey   string
	PaystackCallbackURL string

	// Public URL of the website, used in links inside emails.
	AppURL string

	// Outgoing email (password resets). Without SMTP_HOST, emails are not
	// sent; in development the reset link is printed to the log instead.
	SMTPHost, SMTPPort, SMTPUsername, SMTPPassword, MailFrom string
}

func Load() (Config, error) {
	var err error
	cfg := Config{
		Env:        getEnv("APP_ENV", "development"),
		Port:       getEnv("PORT", "8080"),
		DBHost:     getEnv("DB_HOST", "localhost"),
		DBUser:     getEnv("DB_USER", "postgres"),
		DBPassword: getEnv("DB_PASSWORD", ""),
		DBName:     getEnv("DB_NAME", "fooddash"),
		DBPort:     getEnv("DB_PORT", "5432"),
		DBSSLMode:  getEnv("DB_SSLMODE", "disable"),

		JWTSecret: os.Getenv("JWT_SECRET"),
		StaffCode: os.Getenv("STAFF_CODE"),

		CORSOrigins:    splitList(getEnv("CORS_ORIGINS", "http://localhost:5173")),
		TrustedProxies: splitList(os.Getenv("TRUSTED_PROXIES")),

		OpeningTime: getEnv("OPENING_TIME", "08:00"),
		ClosingTime: getEnv("CLOSING_TIME", "22:00"),

		PaystackSecretKey:   os.Getenv("PAYSTACK_SECRET_KEY"),
		PaystackCallbackURL: getEnv("PAYSTACK_CALLBACK_URL", "http://localhost:5173/payment/callback"),

		AppURL:       strings.TrimRight(getEnv("APP_URL", "http://localhost:5173"), "/"),
		SMTPHost:     os.Getenv("SMTP_HOST"),
		SMTPPort:     getEnv("SMTP_PORT", "587"),
		SMTPUsername: os.Getenv("SMTP_USERNAME"),
		SMTPPassword: os.Getenv("SMTP_PASSWORD"),
		MailFrom:     getEnv("MAIL_FROM", "Cravely <no-reply@cravely.ng>"),
	}

	var errs []error

	cfg.AuthRateLimitPerMinute, err = strconv.Atoi(getEnv("AUTH_RATE_LIMIT_PER_MINUTE", "10"))
	if err != nil || cfg.AuthRateLimitPerMinute <= 0 {
		errs = append(errs, errors.New("AUTH_RATE_LIMIT_PER_MINUTE must be a positive integer"))
	}

	ttlHours, err := strconv.Atoi(getEnv("JWT_TTL_HOURS", "24"))
	if err != nil || ttlHours <= 0 {
		errs = append(errs, errors.New("JWT_TTL_HOURS must be a positive integer"))
	}
	cfg.JWTTTL = time.Duration(ttlHours) * time.Hour

	cfg.Timezone, err = time.LoadLocation(getEnv("TIMEZONE", "Africa/Lagos"))
	if err != nil {
		errs = append(errs, fmt.Errorf("TIMEZONE: %w", err))
	}

	vat, err := strconv.ParseFloat(getEnv("VAT_PERCENT", "7.5"), 64)
	if err != nil || vat < 0 || vat > 100 {
		errs = append(errs, errors.New("VAT_PERCENT must be a number between 0 and 100"))
	}
	cfg.VATBasisPoints = int64(vat*100 + 0.5)

	minOrder, err := strconv.ParseInt(getEnv("MIN_ORDER_NAIRA", "0"), 10, 64)
	if err != nil || minOrder < 0 {
		errs = append(errs, errors.New("MIN_ORDER_NAIRA must be a non-negative integer"))
	}
	cfg.MinOrderKobo = minOrder * 100

	for _, t := range []struct{ name, val string }{{"OPENING_TIME", cfg.OpeningTime}, {"CLOSING_TIME", cfg.ClosingTime}} {
		if _, err := time.Parse("15:04", t.val); err != nil {
			errs = append(errs, fmt.Errorf("%s must be in HH:MM format", t.name))
		}
	}

	if cfg.JWTSecret == "" {
		if cfg.IsProduction() {
			errs = append(errs, errors.New("JWT_SECRET is required in production"))
		} else {
			cfg.JWTSecret = "dev-only-insecure-secret-change-me-please"
		}
	} else if cfg.IsProduction() && len(cfg.JWTSecret) < 32 {
		errs = append(errs, errors.New("JWT_SECRET must be at least 32 characters in production"))
	}

	return cfg, errors.Join(errs...)
}

func (c Config) IsProduction() bool { return c.Env == "production" }

func (c Config) DSN() string {
	return fmt.Sprintf(
		"host=%s user=%s password=%s dbname=%s port=%s sslmode=%s TimeZone=UTC",
		c.DBHost, c.DBUser, c.DBPassword, c.DBName, c.DBPort, c.DBSSLMode,
	)
}

// IsOpenAt reports whether the store accepts orders at t, using the store's
// timezone. Hours that cross midnight (e.g. 18:00–02:00) are supported.
func (c Config) IsOpenAt(t time.Time) bool {
	open, _ := time.Parse("15:04", c.OpeningTime)
	closing, _ := time.Parse("15:04", c.ClosingTime)
	local := t.In(c.Timezone)
	now := local.Hour()*60 + local.Minute()
	o := open.Hour()*60 + open.Minute()
	cl := closing.Hour()*60 + closing.Minute()
	if o == cl {
		return true // open 24 hours
	}
	if o < cl {
		return now >= o && now < cl
	}
	return now >= o || now < cl
}

// DayRange returns the [start, end) instants of the calendar day containing t
// in the store's timezone.
func (c Config) DayRange(t time.Time) (time.Time, time.Time) {
	local := t.In(c.Timezone)
	start := time.Date(local.Year(), local.Month(), local.Day(), 0, 0, 0, 0, c.Timezone)
	return start, start.AddDate(0, 0, 1)
}

func getEnv(key, fallback string) string {
	if v := strings.TrimSpace(os.Getenv(key)); v != "" {
		return v
	}
	return fallback
}

func splitList(s string) []string {
	var out []string
	for _, p := range strings.Split(s, ",") {
		if p = strings.TrimSpace(p); p != "" {
			out = append(out, p)
		}
	}
	return out
}
