package db

import (
	"fmt"
	"fooddash-api/config"
	"log/slog"
	"time"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// Connect opens the connection pool and runs migrations.
func Connect(cfg config.Config) (*gorm.DB, error) {
	level := logger.Info
	if cfg.IsProduction() {
		level = logger.Warn
	}
	gdb, err := gorm.Open(postgres.Open(cfg.DSN()), &gorm.Config{
		Logger: logger.New(slog.NewLogLogger(slog.Default().Handler(), slog.LevelInfo), logger.Config{
			SlowThreshold:             500 * time.Millisecond,
			LogLevel:                  level,
			IgnoreRecordNotFoundError: true,
		}),
		TranslateError: true,
		NowFunc:        func() time.Time { return time.Now().UTC() },
	})
	if err != nil {
		return nil, fmt.Errorf("connect to database: %w", err)
	}

	sqlDB, err := gdb.DB()
	if err != nil {
		return nil, err
	}
	sqlDB.SetMaxOpenConns(25)
	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetConnMaxLifetime(30 * time.Minute)

	if err := Migrate(gdb); err != nil {
		return nil, fmt.Errorf("migrate database: %w", err)
	}
	return gdb, nil
}
