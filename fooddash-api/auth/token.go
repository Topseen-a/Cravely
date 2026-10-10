// Package auth issues and verifies the JWT access tokens used by the API.
package auth

import (
	"errors"
	"fooddash-api/models"
	"strconv"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

const issuer = "cravely-api"

type Claims struct {
	Role models.Role `json:"role"`
	jwt.RegisteredClaims
}

type TokenService struct {
	secret []byte
	ttl    time.Duration
}

func NewTokenService(secret string, ttl time.Duration) *TokenService {
	return &TokenService{secret: []byte(secret), ttl: ttl}
}

func (s *TokenService) Issue(user models.User) (string, time.Time, error) {
	now := time.Now()
	exp := now.Add(s.ttl)
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, Claims{
		Role: user.Role,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   strconv.FormatUint(uint64(user.ID), 10),
			Issuer:    issuer,
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(exp),
		},
	})
	signed, err := token.SignedString(s.secret)
	return signed, exp, err
}

// Parse verifies the token and returns the user ID it was issued for and
// when it was issued.
func (s *TokenService) Parse(tokenStr string) (uint, time.Time, error) {
	var claims Claims
	_, err := jwt.ParseWithClaims(tokenStr, &claims, func(*jwt.Token) (any, error) {
		return s.secret, nil
	},
		jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}),
		jwt.WithIssuer(issuer),
		jwt.WithExpirationRequired(),
	)
	if err != nil {
		return 0, time.Time{}, err
	}
	id, err := strconv.ParseUint(claims.Subject, 10, 64)
	if err != nil || id == 0 || claims.IssuedAt == nil {
		return 0, time.Time{}, errors.New("invalid token claims")
	}
	return uint(id), claims.IssuedAt.Time, nil
}
