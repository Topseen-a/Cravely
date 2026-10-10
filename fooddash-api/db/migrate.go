package db

import (
	"fmt"
	"fooddash-api/models"
	"log/slog"

	"gorm.io/gorm"
)

func Migrate(gdb *gorm.DB) error {
	if err := convertMoneyColumns(gdb); err != nil {
		return err
	}

	if err := gdb.AutoMigrate(
		&models.User{}, &models.Category{}, &models.MenuItem{},
		&models.Cart{}, &models.CartItem{},
		&models.DeliveryZone{},
		&models.Order{}, &models.OrderItem{}, &models.OrderEvent{},
		&models.Payment{}, &models.PasswordReset{},
	); err != nil {
		return err
	}

	stmts := []string{
		// Uniqueness that ignores soft-deleted rows, so a deleted category or
		// zone name can be reused.
		`CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_name_live ON categories (name) WHERE deleted_at IS NULL`,
		`CREATE UNIQUE INDEX IF NOT EXISTS idx_delivery_zones_name_live ON delivery_zones (LOWER(name)) WHERE deleted_at IS NULL`,
		`CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders (created_at)`,
		`UPDATE cart_items SET deleted_at = NOW() WHERE deleted_at IS NULL AND id NOT IN
			(SELECT MIN(id) FROM cart_items WHERE deleted_at IS NULL GROUP BY cart_id, menu_item_id)`,
		`CREATE UNIQUE INDEX IF NOT EXISTS idx_cart_items_cart_menu_live ON cart_items (cart_id, menu_item_id) WHERE deleted_at IS NULL`,

		// Backfill data for orders created before these columns existed.
		`UPDATE users u SET email = LOWER(TRIM(u.email)) WHERE u.email <> LOWER(TRIM(u.email))
			AND NOT EXISTS (SELECT 1 FROM users o WHERE o.email = LOWER(TRIM(u.email)))`,
		`UPDATE orders SET subtotal = total_amount WHERE subtotal = 0 AND total_amount > 0`,
		`UPDATE orders SET payment_method = 'pay_on_delivery' WHERE payment_method IS NULL OR payment_method = ''`,
		`UPDATE orders SET payment_status = 'pending' WHERE payment_status IS NULL OR payment_status = ''`,
		`UPDATE orders SET payment_status = 'paid' WHERE payment_status = 'pending' AND status IN ('DELIVERED', 'PICKED_UP')`,
		`UPDATE order_items oi SET name = mi.name FROM menu_items mi WHERE oi.menu_item_id = mi.id AND (oi.name IS NULL OR oi.name = '')`,
	}
	for _, s := range stmts {
		if err := gdb.Exec(s).Error; err != nil {
			return fmt.Errorf("%s: %w", s, err)
		}
	}

	return backfillOrderReferences(gdb)
}

// convertMoneyColumns upgrades databases created by the first version of the
// API, which stored Naira as floating point. Values become exact kobo.
// It must run before AutoMigrate, which would otherwise change the column
// type without multiplying by 100.
func convertMoneyColumns(gdb *gorm.DB) error {
	cols := []struct{ table, column string }{
		{"menu_items", "price"},
		{"order_items", "unit_price"},
		{"orders", "total_amount"},
	}
	for _, c := range cols {
		var dataType string
		err := gdb.Raw(`SELECT data_type FROM information_schema.columns
			WHERE table_schema = current_schema() AND table_name = ? AND column_name = ?`,
			c.table, c.column).Scan(&dataType).Error
		if err != nil {
			return err
		}
		if dataType != "double precision" && dataType != "real" && dataType != "numeric" {
			continue
		}
		slog.Info("converting money column from Naira to kobo", "table", c.table, "column", c.column)
		sql := fmt.Sprintf(`ALTER TABLE %q ALTER COLUMN %q TYPE bigint USING ROUND(%q * 100)::bigint`,
			c.table, c.column, c.column)
		if err := gdb.Exec(sql).Error; err != nil {
			return err
		}
	}
	return nil
}

func backfillOrderReferences(gdb *gorm.DB) error {
	var ids []uint
	if err := gdb.Unscoped().Model(&models.Order{}).Where("reference IS NULL OR reference = ''").Pluck("id", &ids).Error; err != nil {
		return err
	}
	for _, id := range ids {
		if err := gdb.Unscoped().Model(&models.Order{}).Where("id = ?", id).
			Update("reference", models.NewReference("CRV-", 8)).Error; err != nil {
			return err
		}
	}
	return nil
}
