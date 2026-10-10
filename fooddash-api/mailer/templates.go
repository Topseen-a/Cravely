package mailer

import (
	"fmt"
	"html"
)

// PasswordReset builds the password reset email.
func PasswordReset(to, name, link string, validMinutes int) Message {
	first := name
	for i, r := range name {
		if r == ' ' {
			first = name[:i]
			break
		}
	}
	text := fmt.Sprintf(`Hi %s,

We received a request to reset your Cravely password.

Choose a new password here (the link works for %d minutes):
%s

If you didn't ask for this, you can ignore this email. Your password won't change.

— Cravely, Lagos`, first, validMinutes, link)

	page := fmt.Sprintf(`<!doctype html><html><body style="margin:0;background:#fff8ec;font-family:Arial,Helvetica,sans-serif;color:#17120e">
<table role="presentation" width="100%%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #ead9bc">
<tr><td style="height:8px;background:repeating-linear-gradient(-45deg,#17120e 0 10px,#ffc72c 10px 20px);background-color:#ffc72c"></td></tr>
<tr><td style="padding:32px">
<p style="margin:0 0 24px;font-size:24px;font-weight:800;letter-spacing:-0.5px">cravely</p>
<h1 style="margin:0 0 12px;font-size:24px">Reset your password</h1>
<p style="margin:0 0 24px;font-size:16px;line-height:1.5;color:#3a302a">Hi %s, we received a request to reset your Cravely password. Tap the button below to choose a new one.</p>
<p style="margin:0 0 24px"><a href="%s" style="display:inline-block;background:#ffc72c;color:#17120e;text-decoration:none;font-weight:700;font-size:16px;padding:14px 28px;border-radius:12px;border:2px solid #17120e">Choose a new password</a></p>
<p style="margin:0 0 8px;font-size:14px;color:#7a6a5c">This link works for %d minutes and can only be used once.</p>
<p style="margin:0;font-size:14px;color:#7a6a5c">If you didn't ask for this, ignore this email — your password won't change.</p>
</td></tr></table>
<p style="margin:16px 0 0;font-size:12px;color:#7a6a5c">Cravely · Lagos, Nigeria</p>
</td></tr></table></body></html>`, html.EscapeString(first), html.EscapeString(link), validMinutes)

	return Message{To: to, Subject: "Reset your Cravely password", Text: text, HTML: page}
}
