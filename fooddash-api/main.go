package main

import (
	"context"
	"errors"
	"fooddash-api/auth"
	"fooddash-api/config"
	"fooddash-api/db"
	"fooddash-api/handlers"
	"fooddash-api/mailer"
	"fooddash-api/middleware"
	"fooddash-api/payments/paystack"
	"fooddash-api/routes"
	"fooddash-api/ws"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"
	_ "time/tzdata" // embed timezone data so Africa/Lagos works on any host

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	if err := run(); err != nil {
		slog.Error("server stopped", "err", err)
		os.Exit(1)
	}
}

func run() error {
	if err := godotenv.Load(); err != nil {
		slog.Info("no .env file, using environment variables")
	}

	cfg, err := config.Load()
	if err != nil {
		return err
	}

	var logHandler slog.Handler = slog.NewTextHandler(os.Stdout, nil)
	if cfg.IsProduction() {
		logHandler = slog.NewJSONHandler(os.Stdout, nil)
		gin.SetMode(gin.ReleaseMode)
	}
	slog.SetDefault(slog.New(logHandler))
	if !cfg.IsProduction() && os.Getenv("JWT_SECRET") == "" {
		slog.Warn("JWT_SECRET not set; using an insecure development secret")
	}

	gdb, err := db.Connect(cfg)
	if err != nil {
		return err
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	hub := ws.NewHub()
	go hub.Run(ctx)

	tokens := auth.NewTokenService(cfg.JWTSecret, cfg.JWTTTL)
	ps := paystack.New(cfg.PaystackSecretKey)
	if !ps.Enabled() {
		slog.Info("PAYSTACK_SECRET_KEY not set; online payment disabled (pay on delivery only)")
	}
	mail := mailer.SMTP{Host: cfg.SMTPHost, Port: cfg.SMTPPort, Username: cfg.SMTPUsername, Password: cfg.SMTPPassword, From: cfg.MailFrom}
	if !mail.Enabled() {
		slog.Info("SMTP_HOST not set; emails are not sent (reset links are logged in development)")
	}
	h := handlers.New(gdb, cfg, tokens, hub, ps, mail)

	r := gin.New()
	if err := r.SetTrustedProxies(cfg.TrustedProxies); err != nil {
		return err
	}
	r.Use(middleware.Recovery, middleware.RequestID, middleware.Logger, middleware.SecurityHeaders,
		cors.New(middleware.CORSConfig(cfg.CORSOrigins)))
	r.NoRoute(func(c *gin.Context) {
		c.JSON(http.StatusNotFound, gin.H{"error": "Route not found"})
	})
	routes.SetupRoutes(r, h, gdb, tokens, cfg.AuthRateLimitPerMinute)

	srv := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           r,
		ReadHeaderTimeout: 10 * time.Second,
		ReadTimeout:       30 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       120 * time.Second,
	}

	errCh := make(chan error, 1)
	go func() {
		slog.Info("server starting", "port", cfg.Port, "env", cfg.Env)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			errCh <- err
		}
	}()

	select {
	case err := <-errCh:
		return err
	case <-ctx.Done():
	}

	slog.Info("shutting down")
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		return err
	}
	if sqlDB, err := gdb.DB(); err == nil {
		_ = sqlDB.Close()
	}
	return nil
}
