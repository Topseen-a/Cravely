package mailer

import (
	"bufio"
	"context"
	"net"
	"strings"
	"testing"
	"time"
)

// fakeSMTP accepts one message without TLS or auth and returns its DATA.
func fakeSMTP(t *testing.T) (port string, data <-chan string) {
	t.Helper()
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	out := make(chan string, 1)
	go func() {
		defer ln.Close()
		conn, err := ln.Accept()
		if err != nil {
			return
		}
		defer conn.Close()
		r := bufio.NewReader(conn)
		say := func(s string) { conn.Write([]byte(s + "\r\n")) }
		say("220 fake ESMTP")
		var body strings.Builder
		inData := false
		for {
			line, err := r.ReadString('\n')
			if err != nil {
				return
			}
			if inData {
				if line == ".\r\n" {
					inData = false
					out <- body.String()
					say("250 queued")
					continue
				}
				body.WriteString(line)
				continue
			}
			switch cmd := strings.ToUpper(strings.TrimSpace(line)); {
			case strings.HasPrefix(cmd, "EHLO"), strings.HasPrefix(cmd, "HELO"):
				say("250 fake")
			case strings.HasPrefix(cmd, "MAIL"), strings.HasPrefix(cmd, "RCPT"):
				say("250 ok")
			case cmd == "DATA":
				inData = true
				say("354 go ahead")
			case cmd == "QUIT":
				say("221 bye")
				return
			default:
				say("250 ok")
			}
		}
	}()
	_, port, _ = net.SplitHostPort(ln.Addr().String())
	return port, out
}

func TestSendPasswordReset(t *testing.T) {
	port, data := fakeSMTP(t)
	m := SMTP{Host: "127.0.0.1", Port: port, From: "Cravely <no-reply@cravely.ng>"}
	msg := PasswordReset("ada@example.com", "Adaeze Okafor", "http://localhost:5173/reset-password?token=abc123", 30)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := m.Send(ctx, msg); err != nil {
		t.Fatalf("send: %v", err)
	}

	got := <-data
	for _, want := range []string{
		"To: <ada@example.com>",
		"Subject: Reset your Cravely password",
		"multipart/alternative",
		"text/plain", "text/html",
		"Hi Adaeze,",
		"reset-password?token=3Dabc123", // quoted-printable encodes '=' as =3D
	} {
		if !strings.Contains(got, want) {
			t.Errorf("message missing %q", want)
		}
	}
}

func TestDisabledWithoutHost(t *testing.T) {
	if (SMTP{}).Enabled() {
		t.Fatal("SMTP without host should be disabled")
	}
	if err := (SMTP{}).Send(context.Background(), Message{To: "a@b.com"}); err == nil {
		t.Fatal("expected error when not configured")
	}
}
