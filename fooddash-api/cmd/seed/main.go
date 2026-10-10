// Command seed fills the database with a sample Nigerian menu and Lagos
// delivery zones. It is safe to run repeatedly: existing rows (matched by
// name) are left untouched.
package main

import (
	"fooddash-api/config"
	"fooddash-api/db"
	"fooddash-api/models"
	"fooddash-api/money"
	"log/slog"
	"os"

	"github.com/joho/godotenv"
	"gorm.io/gorm"
)

type seedItem struct {
	name, description string
	naira             float64
}

type seedCategory struct {
	name, description string
	items             []seedItem
}

var menu = []seedCategory{
	{"Rice Dishes", "Party-style rice, cooked fresh daily", []seedItem{
		{"Jollof Rice", "Smoky party jollof with fried plantain", 3500},
		{"Fried Rice", "Nigerian fried rice with mixed vegetables and liver", 3500},
		{"Ofada Rice & Ayamase", "Local ofada rice with spicy green pepper sauce, assorted meat and egg", 4500},
		{"White Rice & Stew", "Long-grain rice with rich tomato and pepper stew", 3000},
		{"Coconut Rice", "Rice cooked in fresh coconut milk", 3800},
	}},
	{"Swallow & Soups", "Served with your choice of swallow", []seedItem{
		{"Pounded Yam & Egusi", "Smooth pounded yam with egusi soup and assorted meat", 5000},
		{"Amala & Ewedu", "Amala with ewedu, gbegiri and stew (abula)", 4000},
		{"Eba & Okra Soup", "Garri with fresh okra soup and fish", 3800},
		{"Semovita & Efo Riro", "Semovita with vegetable soup and assorted meat", 4200},
		{"Fufu & Banga Soup", "Fufu with palm-fruit banga soup and catfish", 5500},
	}},
	{"Proteins & Sides", "Add something extra to your plate", []seedItem{
		{"Fried Chicken", "Seasoned and deep-fried chicken (1 piece)", 3000},
		{"Peppered Turkey", "Turkey wing in spicy pepper sauce", 5500},
		{"Goat Meat", "Peppered goat meat (2 pieces)", 2500},
		{"Fried Fish", "Fried croaker fish", 3500},
		{"Dodo (Fried Plantain)", "Sweet ripe plantain, fried", 1000},
		{"Moi Moi", "Steamed bean pudding with egg and fish", 1200},
	}},
	{"Small Chops & Grills", "Snacks and grills", []seedItem{
		{"Puff-Puff (6 pcs)", "Soft, sweet fried dough balls", 1000},
		{"Meat Pie", "Flaky pastry filled with minced meat and potatoes", 1500},
		{"Beef Suya", "Spicy grilled beef skewers with yaji, onions and tomatoes", 3000},
		{"Asun", "Spicy smoked goat meat", 4000},
		{"Chicken Shawarma", "Wrap with chicken, sausage and creamy sauce", 4000},
	}},
	{"Drinks", "Chilled drinks", []seedItem{
		{"Zobo", "Homemade hibiscus drink (50cl)", 1000},
		{"Chapman", "Nigerian fruity cocktail, non-alcoholic", 2000},
		{"Coca-Cola (50cl)", "", 700},
		{"Malt (33cl)", "", 900},
		{"Bottled Water (75cl)", "", 400},
	}},
}

var zones = []models.DeliveryZone{
	{Name: "Yaba", Fee: money.FromNaira(1500), EstimatedMinutes: 35},
	{Name: "Surulere", Fee: money.FromNaira(1500), EstimatedMinutes: 40},
	{Name: "Ikeja", Fee: money.FromNaira(2500), EstimatedMinutes: 50},
	{Name: "Victoria Island", Fee: money.FromNaira(3000), EstimatedMinutes: 50},
	{Name: "Ikoyi", Fee: money.FromNaira(3000), EstimatedMinutes: 50},
	{Name: "Lekki Phase 1", Fee: money.FromNaira(3500), EstimatedMinutes: 60},
	{Name: "Ajah", Fee: money.FromNaira(4500), EstimatedMinutes: 75},
}

func main() {
	_ = godotenv.Load()
	cfg, err := config.Load()
	if err != nil {
		slog.Error("invalid config", "err", err)
		os.Exit(1)
	}
	gdb, err := db.Connect(cfg)
	if err != nil {
		slog.Error("database", "err", err)
		os.Exit(1)
	}

	err = gdb.Transaction(func(tx *gorm.DB) error {
		for i, sc := range menu {
			cat := models.Category{Name: sc.name, Description: sc.description, DisplayOrder: i + 1}
			if err := tx.Where(models.Category{Name: sc.name}).FirstOrCreate(&cat).Error; err != nil {
				return err
			}
			for _, si := range sc.items {
				item := models.MenuItem{
					CategoryID:  cat.ID,
					Name:        si.name,
					Description: si.description,
					Price:       money.FromNaira(si.naira),
					IsAvailable: true,
				}
				if err := tx.Where(models.MenuItem{Name: si.name}).FirstOrCreate(&item).Error; err != nil {
					return err
				}
			}
		}
		for _, z := range zones {
			z.IsActive = true
			if err := tx.Where("LOWER(name) = LOWER(?)", z.Name).FirstOrCreate(&z).Error; err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		slog.Error("seed failed", "err", err)
		os.Exit(1)
	}
	slog.Info("seed complete")
}
