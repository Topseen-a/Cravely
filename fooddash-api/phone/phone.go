// Package phone validates and normalises Nigerian mobile numbers.
package phone

import (
	"errors"
	"strings"
)

var ErrInvalid = errors.New("enter a valid Nigerian phone number, e.g. 08031234567")

// Normalize converts the common ways Nigerians write mobile numbers
// (08031234567, 0803 123 4567, +2348031234567, 2348031234567, 8031234567)
// into E.164 format: +2348031234567.
func Normalize(raw string) (string, error) {
	var digits strings.Builder
	for i, r := range strings.TrimSpace(raw) {
		switch {
		case r >= '0' && r <= '9':
			digits.WriteRune(r)
		case r == '+' && i == 0, r == ' ', r == '-', r == '(', r == ')':
		default:
			return "", ErrInvalid
		}
	}
	d := digits.String()

	switch {
	case len(d) == 14 && strings.HasPrefix(d, "2340"): // +234 0803...
		d = d[4:]
	case len(d) == 13 && strings.HasPrefix(d, "234"):
		d = d[3:]
	case len(d) == 11 && d[0] == '0':
		d = d[1:]
	case len(d) == 10:
	default:
		return "", ErrInvalid
	}

	// Nigerian mobile numbers start with 70x, 80x, 81x, 90x or 91x.
	if (d[0] != '7' && d[0] != '8' && d[0] != '9') || (d[1] != '0' && d[1] != '1') {
		return "", ErrInvalid
	}
	return "+234" + d, nil
}
