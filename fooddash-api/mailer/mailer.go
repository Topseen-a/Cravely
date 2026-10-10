// Package mailer sends transactional email (e.g. password resets) over SMTP.
// It works with any provider: Gmail/Google Workspace, Zoho, Brevo, Mailgun,
// Amazon SES, etc.
package mailer

import (
	"bytes"
	"context"
	"crypto/rand"
	"crypto/tls"
	"encoding/hex"
	"errors"
	"fmt"
	"mime"
	"mime/quotedprintable"
	"net"
	"net/mail"
	"net/smtp"
	"strings"
	"time"
)

type Message struct {
	To      string
	Subject string
	Text    string
	HTML    string
}

type Mailer interface {
	Send(ctx context.Context, m Message) error
	Enabled() bool
}

// SMTP sends mail through an SMTP server. Port 465 uses implicit TLS; any
// other port (usually 587) upgrades with STARTTLS.
type SMTP struct {
	Host, Port, Username, Password, From string
}

func (s SMTP) Enabled() bool { return s.Host != "" }

func (s SMTP) Send(ctx context.Context, m Message) error {
	if !s.Enabled() {
		return errors.New("smtp is not configured")
	}
	from, err := mail.ParseAddress(s.From)
	if err != nil {
		return fmt.Errorf("MAIL_FROM: %w", err)
	}
	to, err := mail.ParseAddress(m.To)
	if err != nil {
		return fmt.Errorf("recipient: %w", err)
	}
	body, err := build(from, to, m)
	if err != nil {
		return err
	}

	addr := net.JoinHostPort(s.Host, s.Port)
	dialer := &net.Dialer{Timeout: 15 * time.Second}
	var conn net.Conn
	if s.Port == "465" {
		conn, err = tls.DialWithDialer(dialer, "tcp", addr, &tls.Config{ServerName: s.Host})
	} else {
		conn, err = dialer.DialContext(ctx, "tcp", addr)
	}
	if err != nil {
		return fmt.Errorf("connect to %s: %w", addr, err)
	}
	if dl, ok := ctx.Deadline(); ok {
		_ = conn.SetDeadline(dl)
	}

	c, err := smtp.NewClient(conn, s.Host)
	if err != nil {
		conn.Close()
		return err
	}
	defer c.Close()

	if ok, _ := c.Extension("STARTTLS"); ok && s.Port != "465" {
		if err := c.StartTLS(&tls.Config{ServerName: s.Host}); err != nil {
			return fmt.Errorf("starttls: %w", err)
		}
	}
	if s.Username != "" {
		if err := c.Auth(smtp.PlainAuth("", s.Username, s.Password, s.Host)); err != nil {
			return fmt.Errorf("smtp auth: %w", err)
		}
	}
	if err := c.Mail(from.Address); err != nil {
		return err
	}
	if err := c.Rcpt(to.Address); err != nil {
		return err
	}
	w, err := c.Data()
	if err != nil {
		return err
	}
	if _, err := w.Write(body); err != nil {
		return err
	}
	if err := w.Close(); err != nil {
		return err
	}
	return c.Quit()
}

// build assembles a multipart/alternative message (plain text + HTML).
func build(from, to *mail.Address, m Message) ([]byte, error) {
	boundary := randomHex(12)
	var b bytes.Buffer
	domain := "cravely.local"
	if at := strings.LastIndex(from.Address, "@"); at >= 0 {
		domain = from.Address[at+1:]
	}
	headers := []string{
		"From: " + from.String(),
		"To: " + to.String(),
		"Subject: " + mime.QEncoding.Encode("utf-8", m.Subject),
		"Date: " + time.Now().Format(time.RFC1123Z),
		fmt.Sprintf("Message-ID: <%s@%s>", randomHex(16), domain),
		"MIME-Version: 1.0",
		fmt.Sprintf(`Content-Type: multipart/alternative; boundary="%s"`, boundary),
	}
	b.WriteString(strings.Join(headers, "\r\n") + "\r\n\r\n")

	for _, part := range []struct{ ctype, body string }{{"text/plain", m.Text}, {"text/html", m.HTML}} {
		if part.body == "" {
			continue
		}
		fmt.Fprintf(&b, "--%s\r\nContent-Type: %s; charset=utf-8\r\nContent-Transfer-Encoding: quoted-printable\r\n\r\n", boundary, part.ctype)
		qp := quotedprintable.NewWriter(&b)
		if _, err := qp.Write([]byte(part.body)); err != nil {
			return nil, err
		}
		qp.Close()
		b.WriteString("\r\n")
	}
	fmt.Fprintf(&b, "--%s--\r\n", boundary)
	return b.Bytes(), nil
}

func randomHex(n int) string {
	buf := make([]byte, n)
	_, _ = rand.Read(buf)
	return hex.EncodeToString(buf)
}
