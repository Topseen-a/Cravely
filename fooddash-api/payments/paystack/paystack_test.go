package paystack

import (
	"context"
	"crypto/hmac"
	"crypto/sha512"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func sign(key string, body []byte) string {
	m := hmac.New(sha512.New, []byte(key))
	m.Write(body)
	return hex.EncodeToString(m.Sum(nil))
}

func TestValidSignature(t *testing.T) {
	c := New("sk_test_123")
	body := []byte(`{"event":"charge.success"}`)
	if !c.ValidSignature(body, sign("sk_test_123", body)) {
		t.Fatal("valid signature rejected")
	}
	if c.ValidSignature(body, sign("wrong", body)) {
		t.Fatal("signature with wrong key accepted")
	}
	if c.ValidSignature([]byte(`{"event":"tampered"}`), sign("sk_test_123", body)) {
		t.Fatal("tampered body accepted")
	}
	if New("").ValidSignature(body, sign("", body)) {
		t.Fatal("unconfigured client must reject all webhooks")
	}
}

func TestInitializeAndVerify(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Authorization") != "Bearer sk_test_123" {
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(map[string]any{"status": false, "message": "Invalid key"})
			return
		}
		switch r.URL.Path {
		case "/transaction/initialize":
			var req InitializeRequest
			json.NewDecoder(r.Body).Decode(&req)
			if req.Currency != "NGN" || req.AmountKobo != 350000 {
				t.Errorf("unexpected request %+v", req)
			}
			json.NewEncoder(w).Encode(map[string]any{"status": true, "message": "ok",
				"data": map[string]any{"authorization_url": "https://checkout.paystack.com/x", "access_code": "x", "reference": req.Reference}})
		case "/transaction/verify/REF-1":
			json.NewEncoder(w).Encode(map[string]any{"status": true, "message": "ok",
				"data": map[string]any{"status": "success", "reference": "REF-1", "amount": 350000, "currency": "NGN", "channel": "bank_transfer"}})
		default:
			w.WriteHeader(http.StatusNotFound)
			json.NewEncoder(w).Encode(map[string]any{"status": false, "message": "not found"})
		}
	}))
	defer srv.Close()

	c := New("sk_test_123").WithBaseURL(srv.URL)
	res, err := c.Initialize(context.Background(), InitializeRequest{Email: "a@b.com", AmountKobo: 350000, Reference: "REF-1"})
	if err != nil || res.AuthorizationURL == "" {
		t.Fatalf("initialize: %+v %v", res, err)
	}
	txn, err := c.Verify(context.Background(), "REF-1")
	if err != nil || txn.Status != "success" || txn.AmountKobo != 350000 {
		t.Fatalf("verify: %+v %v", txn, err)
	}
	if _, err := c.Verify(context.Background(), "missing"); err == nil {
		t.Fatal("expected error for unknown reference")
	}
	if _, err := New("bad").WithBaseURL(srv.URL).Verify(context.Background(), "REF-1"); err == nil {
		t.Fatal("expected error for bad key")
	}
	if _, err := New("").Verify(context.Background(), "REF-1"); err != ErrNotConfigured {
		t.Fatalf("got %v, want ErrNotConfigured", err)
	}
}
