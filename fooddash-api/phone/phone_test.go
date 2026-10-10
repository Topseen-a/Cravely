package phone

import "testing"

func TestNormalize(t *testing.T) {
	valid := map[string]string{
		"08031234567":       "+2348031234567",
		"0803 123 4567":     "+2348031234567",
		"0803-123-4567":     "+2348031234567",
		"+2348031234567":    "+2348031234567",
		"2348031234567":     "+2348031234567",
		"+234 0803 1234567": "+2348031234567",
		"8031234567":        "+2348031234567",
		"07061234567":       "+2347061234567",
		"09121234567":       "+2349121234567",
		"08121234567":       "+2348121234567",
	}
	for in, want := range valid {
		got, err := Normalize(in)
		if err != nil || got != want {
			t.Errorf("Normalize(%q) = %q, %v; want %q", in, got, err, want)
		}
	}

	invalid := []string{"", "12345", "0803123456", "080312345678", "01234567890", "08531234567", "+1 415 555 0100", "0803abc4567"}
	for _, in := range invalid {
		if got, err := Normalize(in); err == nil {
			t.Errorf("Normalize(%q) = %q, want error", in, got)
		}
	}
}
