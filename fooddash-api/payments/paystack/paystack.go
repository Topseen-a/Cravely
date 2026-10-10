// Package paystack is a minimal client for the Paystack payments API
// (https://paystack.com/docs/api/), the most widely used payment gateway in
// Nigeria. It supports card, bank transfer, USSD and bank payments through a
// single hosted checkout.
package paystack

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha512"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"time"
)

const defaultBaseURL = "https://api.paystack.co"

var ErrNotConfigured = errors.New("paystack is not configured")

type Client struct {
	secretKey string
	baseURL   string
	http      *http.Client
}

func New(secretKey string) *Client {
	return &Client{
		secretKey: secretKey,
		baseURL:   defaultBaseURL,
		http:      &http.Client{Timeout: 15 * time.Second},
	}
}

// WithBaseURL points the client at a different host (used in tests).
func (c *Client) WithBaseURL(u string) *Client {
	c.baseURL = u
	return c
}

func (c *Client) Enabled() bool { return c != nil && c.secretKey != "" }

type InitializeRequest struct {
	Email       string         `json:"email"`
	AmountKobo  int64          `json:"amount"`
	Reference   string         `json:"reference"`
	CallbackURL string         `json:"callback_url,omitempty"`
	Currency    string         `json:"currency"`
	Metadata    map[string]any `json:"metadata,omitempty"`
}

type InitializeResult struct {
	AuthorizationURL string `json:"authorization_url"`
	AccessCode       string `json:"access_code"`
	Reference        string `json:"reference"`
}

type Transaction struct {
	Status     string `json:"status"` // success, failed, abandoned, ongoing...
	Reference  string `json:"reference"`
	AmountKobo int64  `json:"amount"`
	Currency   string `json:"currency"`
	Channel    string `json:"channel"`
	PaidAt     string `json:"paid_at"`
}

type envelope[T any] struct {
	Status  bool   `json:"status"`
	Message string `json:"message"`
	Data    T      `json:"data"`
}

func (c *Client) Initialize(ctx context.Context, req InitializeRequest) (InitializeResult, error) {
	if req.Currency == "" {
		req.Currency = "NGN"
	}
	var out envelope[InitializeResult]
	err := c.do(ctx, http.MethodPost, "/transaction/initialize", req, &out)
	return out.Data, err
}

func (c *Client) Verify(ctx context.Context, reference string) (Transaction, error) {
	var out envelope[Transaction]
	err := c.do(ctx, http.MethodGet, "/transaction/verify/"+url.PathEscape(reference), nil, &out)
	return out.Data, err
}

func (c *Client) do(ctx context.Context, method, path string, body any, out interface {
	ok() (bool, string)
}) error {
	if !c.Enabled() {
		return ErrNotConfigured
	}
	var r io.Reader
	if body != nil {
		b, err := json.Marshal(body)
		if err != nil {
			return err
		}
		r = bytes.NewReader(b)
	}
	req, err := http.NewRequestWithContext(ctx, method, c.baseURL+path, r)
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+c.secretKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.http.Do(req)
	if err != nil {
		return fmt.Errorf("paystack request failed: %w", err)
	}
	defer resp.Body.Close()

	if err := json.NewDecoder(io.LimitReader(resp.Body, 1<<20)).Decode(out); err != nil {
		return fmt.Errorf("paystack: invalid response (HTTP %d): %w", resp.StatusCode, err)
	}
	if ok, msg := out.ok(); !ok || resp.StatusCode >= 300 {
		return fmt.Errorf("paystack: %s (HTTP %d)", msg, resp.StatusCode)
	}
	return nil
}

func (e *envelope[T]) ok() (bool, string) { return e.Status, e.Message }

// ValidSignature checks the x-paystack-signature header of a webhook request:
// an HMAC-SHA512 of the raw body keyed with the secret key.
func (c *Client) ValidSignature(body []byte, signature string) bool {
	if !c.Enabled() || signature == "" {
		return false
	}
	mac := hmac.New(sha512.New, []byte(c.secretKey))
	mac.Write(body)
	expected := hex.EncodeToString(mac.Sum(nil))
	return hmac.Equal([]byte(expected), []byte(signature))
}

// WebhookEvent is the envelope Paystack posts to the webhook URL.
type WebhookEvent struct {
	Event string      `json:"event"`
	Data  Transaction `json:"data"`
}
