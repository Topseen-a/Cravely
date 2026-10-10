# Cravely API

The backend for Cravely: a Go REST + WebSocket API for a Nigerian food ordering platform. It handles accounts, the menu, carts, orders, delivery areas, payments (pay on delivery or Paystack), password-reset emails and live order updates.

For the project overview and the quickest way to run everything, see the [root README](../README.md).

## Contents

- [Features](#features)
- [Requirements](#requirements)
- [Getting started](#getting-started)
- [Configuration](#configuration)
- [Project structure](#project-structure)
- [Data model](#data-model)
- [Business rules](#business-rules)
- [API reference](#api-reference)
- [WebSockets](#websockets)
- [Payments (Paystack)](#payments-paystack)
- [Email (password resets)](#email-password-resets)
- [Security](#security)
- [Database migrations](#database-migrations)
- [Testing](#testing)
- [Running with Docker](#running-with-docker)
- [Deploying to production](#deploying-to-production)
- [Troubleshooting](#troubleshooting)

## Features

- **Exact money.** All amounts are stored as integer **kobo**. The JSON API uses Naira (`"price": 3500`, `"vat": 787.5`).
- **Pricing:** flat delivery fees per area (Yaba, Lekki Phase 1…), configurable VAT (default 7.5%, applied to food only) and an optional minimum order.
- **Payments:** pay on delivery or pickup (cash, POS or transfer), or online with **Paystack** (card, bank transfer, USSD), confirmed by a signed webhook.
- **Nigerian phone numbers** in any common format (`08031234567`, `0803 123 4567`, `+2348031234567`, `2348031234567`) are validated and stored as `+234…`.
- **Delivery details:** area, street address, **landmark** and contact phone.
- **Lagos time:** opening hours and "today's" reports use `Africa/Lagos`.
- **Order references** like `CRV-7K3F9QXA` avoid look-alike characters (0/O, 1/I).
- **Order lifecycle** validated per order type and applied under a database row lock.
- **Live updates** over WebSockets to customers and to the kitchen.
- **Password reset by email**, with single-use, expiring links.
- **Production basics:** structured JSON logs with request IDs, panic recovery, rate-limited auth, security headers, health checks, graceful shutdown and validated configuration.

## Requirements

- Go **1.26+**
- PostgreSQL **16** (14+ should work)
- Optional: Docker, a Paystack account, an SMTP email account

## Getting started

```bash
cp .env.example .env     # then edit it (see Configuration)
go run ./cmd/seed        # create tables + sample Nigerian menu and Lagos delivery areas
go run .                 # start the API on http://localhost:8080
```

The seed command is safe to run more than once: it skips anything that already exists (matched by name).

Shortcuts are available through the Makefile:

| Command | What it does |
|---|---|
| `make run` | Start the API |
| `make seed` | Load sample menu and delivery areas |
| `make test` | Run the unit tests |
| `make vet` | Run `go vet` |
| `make fmt` | Format the code with `gofmt` |
| `make build` | Build the `fooddash-api` binary |

Check it's running:

```bash
curl http://localhost:8080/healthz   # {"status":"ok"}
curl http://localhost:8080/readyz    # {"database":"ok","status":"ok"}
```

## Configuration

Settings are read from environment variables. In development they're loaded from `.env` in this folder; `.env.example` lists them all. The API refuses to start if a setting is invalid, and tells you which one.

### Server & database

| Variable | Default | Description |
|---|---|---|
| `APP_ENV` | `development` | `production` enables JSON logs, stricter checks and quieter SQL logging |
| `PORT` | `8080` | HTTP port |
| `DATABASE_URL` | *(empty)* | Full connection string, e.g. `postgres://user:pass@host:5432/fooddash?sslmode=require`. When set, the `DB_*` settings below are ignored |
| `DB_HOST` | `localhost` | PostgreSQL host |
| `DB_PORT` | `5432` | PostgreSQL port |
| `DB_USER` | `postgres` | Database user |
| `DB_PASSWORD` | *(empty)* | Database password |
| `DB_NAME` | `fooddash` | Database name |
| `DB_SSLMODE` | `disable` | Use `require` for managed/cloud databases |

### Security

| Variable | Default | Description |
|---|---|---|
| `JWT_SECRET` | dev-only fallback | Signs login tokens. **Required in production, at least 32 characters.** Generate with `openssl rand -hex 32` |
| `JWT_TTL_HOURS` | `24` | How long a login lasts |
| `STAFF_CODE` | *(empty)* | Code required to create a staff account. Empty = staff sign-up disabled |
| `CORS_ORIGINS` | `http://localhost:5173` | Comma-separated website origins allowed to call the API (also used for WebSocket origin checks) |
| `TRUSTED_PROXIES` | *(empty)* | IPs/CIDRs of your load balancer or reverse proxy, so client IPs are correct for rate limiting and logs |
| `AUTH_RATE_LIMIT_PER_MINUTE` | `10` | Login/sign-up/reset attempts allowed per IP per minute |

### Business

| Variable | Default | Description |
|---|---|---|
| `TIMEZONE` | `Africa/Lagos` | Used for opening hours and daily reports |
| `OPENING_TIME` | `08:00` | Orders are accepted from this time (24-hour `HH:MM`) |
| `CLOSING_TIME` | `22:00` | …until this time. Overnight hours (e.g. `18:00`–`02:00`) work. Equal values mean **open 24 hours** |
| `VAT_PERCENT` | `7.5` | VAT added on top of food (not delivery). Set `0` if menu prices already include VAT |
| `MIN_ORDER_NAIRA` | `0` | Minimum food subtotal for an order |

### Paystack (optional)

| Variable | Default | Description |
|---|---|---|
| `PAYSTACK_SECRET_KEY` | *(empty)* | Your Paystack secret key (`sk_test_…` or `sk_live_…`). Empty = online payment disabled; customers can only pay on delivery/pickup |
| `PAYSTACK_CALLBACK_URL` | `http://localhost:5173/payment/callback` | Website page Paystack returns the customer to |

### Website & email (optional)

| Variable | Default | Description |
|---|---|---|
| `APP_URL` | `http://localhost:5173` | Public website address, used in links inside emails |
| `SMTP_HOST` | *(empty)* | SMTP server. Empty = no emails (in development, reset links are printed in the API log) |
| `SMTP_PORT` | `587` | `587` (STARTTLS) or `465` (SSL) |
| `SMTP_USERNAME` | *(empty)* | SMTP login |
| `SMTP_PASSWORD` | *(empty)* | SMTP password or app password |
| `MAIL_FROM` | `Cravely <no-reply@cravely.ng>` | Sender name and address |

## Project structure

```
fooddash-api/
├── main.go              Startup: config, logging, DB, HTTP server, graceful shutdown
├── cmd/seed/            Sample menu (Nigerian dishes) and Lagos delivery areas
├── config/              Environment configuration, validation, opening hours, Lagos day ranges
├── db/                  Connection pool and migrations (incl. upgrade of older databases)
├── routes/              All HTTP and WebSocket routes in one place
├── middleware/          Auth (JWT), staff-only guard, CORS, request IDs, logging,
│                        panic recovery, security headers, rate limiting
├── handlers/            HTTP handlers: auth, password reset, menu, cart, orders,
│                        payments, staff tools, WebSockets, health checks
├── models/              Database models, request validation, order status rules, pricing
├── auth/                JWT issuing and verification
├── money/               Kobo type (stored as integers, JSON in Naira)
├── phone/               Nigerian phone number validation/normalisation
├── payments/paystack/   Paystack client and webhook signature check
├── mailer/              SMTP sender and email templates
├── ws/                  WebSocket hub (per-order and staff channels)
├── Dockerfile           Production image (API + seed binaries)
├── docker-compose.yml   Local PostgreSQL + API
└── Makefile             Common commands
```

## Data model

| Table | Purpose |
|---|---|
| `users` | Customers and staff (`role`), phone number, password hash, last password change |
| `categories` | Menu sections with display order |
| `menu_items` | Dishes: price (kobo), photo URL, availability, sold-out note |
| `carts`, `cart_items` | One cart per user; one line per dish with quantity and chef's note |
| `delivery_zones` | Delivery areas with flat fee, estimated minutes and on/off switch |
| `orders` | Reference, type, status, payment method/status, price breakdown, delivery details |
| `order_items` | Dish name and unit price **snapshot** (menu edits don't change past orders) |
| `order_events` | Timeline of status changes and notes |
| `payments` | Paystack payment attempts (an order can have several) |
| `password_resets` | Hashed, single-use reset tokens with expiry |

Records use soft deletes (`deleted_at`), so deleting a dish or area doesn't break old orders.

## Business rules

**Order status flow**

| Order type | Flow | Cancellable by kitchen | Cancellable by customer |
|---|---|---|---|
| Delivery | `RECEIVED → PREPARING → READY → OUT_FOR_DELIVERY → DELIVERED` (READY can also go straight to DELIVERED) | RECEIVED, PREPARING, READY | RECEIVED only |
| Pickup | `RECEIVED → PREPARING → READY → PICKED_UP` | RECEIVED, PREPARING, READY | RECEIVED only |

Other rules:

- A Paystack order can't move to `PREPARING` until its payment is confirmed.
- Pay-on-delivery orders are marked **paid** automatically when delivered or picked up.
- Cancelling a paid order sets its payment status to `refund_pending`. Refund it in the Paystack dashboard; the kitchen board shows a reminder.

**Checkout**

- Orders are only accepted during opening hours.
- Every item must still be available; sold-out items are listed in the error.
- Delivery requires an active delivery area, a street address and a phone number (taken from the request or the user's profile).
- Totals are calculated on the server:

  `total = food subtotal + delivery fee + VAT on food (rounded half up, in kobo)`

- The cart row is locked while ordering, so double-submitting creates only one order.

## API reference

Base URL: `/api/v1`. Requests and responses are JSON, and amounts are in Naira.

Authenticated endpoints need the header `Authorization: Bearer <token>`. Errors have the form:

```json
{ "error": "Readable message", "fields": { "email": "email must be a valid email address" } }
```

`fields` appears only on validation errors; server errors include a `request_id` for tracing in the logs.

### Public

| Method | Path | Description |
|---|---|---|
| POST | `/auth/register` | `{name, email, password, phone?}` → `{token, expires_at, user}` |
| POST | `/auth/register-staff` | Same, plus `staff_code` |
| POST | `/auth/login` | `{email, password}` → `{token, expires_at, user}` |
| POST | `/auth/forgot-password` | `{email}` → always the same message; emails a reset link if the account exists |
| POST | `/auth/reset-password` | `{token, password}` → `{token, expires_at, user}` (logged in) |
| GET | `/store` | Open/closed, hours, timezone, VAT %, minimum order, payment methods |
| GET | `/menu` | Categories with all dishes (sold-out dishes included, `is_available: false`) |
| GET | `/categories` | Categories only |
| GET | `/delivery-zones` | Active delivery areas with fee and estimated minutes |
| POST | `/webhooks/paystack` | Paystack events (verified by the `x-paystack-signature` header) |

All `/auth/*` endpoints are rate limited per IP.

### Signed-in users

| Method | Path | Description |
|---|---|---|
| GET | `/auth/me` | Current user |
| PATCH | `/auth/me` | `{name?, phone?}` |
| PUT | `/auth/me/password` | `{current_password, new_password}` → new `{token}`; other sessions are signed out |
| GET | `/cart` | Cart with items and `subtotal` |
| POST | `/cart/items` | `{menu_item_id, quantity, special_instructions?}` (adds to an existing line) |
| PATCH | `/cart/items/:id` | `{quantity, special_instructions?}` |
| DELETE | `/cart/items/:id` | Remove a line |
| DELETE | `/cart` | Empty the cart |
| POST | `/orders` | Place an order (see below) |
| GET | `/orders?page=1&page_size=20` | Order history, newest first, with `meta.total` |
| GET | `/orders/:id` | One order with items, events, delivery area |
| POST | `/orders/:id/cancel` | `{reason?}`, only while `RECEIVED` |
| POST | `/orders/:id/pay` | Start or retry Paystack payment → `{authorization_url, reference}` |
| GET | `/payments/verify?reference=…` | Confirm a Paystack payment after the customer returns |

**Placing an order:**

```json
POST /api/v1/orders
{
  "type": "delivery",
  "payment_method": "pay_on_delivery",
  "delivery_zone_id": 1,
  "delivery_address": "12 Herbert Macaulay Way, Yaba",
  "landmark": "Opposite Yaba market",
  "contact_phone": "08031234567",
  "note": "Please call when you reach the gate"
}
```

- `type`: `delivery` or `pickup`.
- `payment_method`: `pay_on_delivery` (default) or `paystack`. With `paystack`, the response also contains `payment.authorization_url`; send the customer there. If Paystack can't be reached, the order is still saved and the response includes `payment_error`; the customer can retry with `POST /orders/:id/pay`.

### Staff only

| Method | Path | Description |
|---|---|---|
| GET | `/staff/orders?date=&status=&type=` | Orders for a day (default today, Lagos time). Each order includes `customer` and `next_statuses` |
| GET | `/staff/orders/:id` | One order |
| PATCH | `/staff/orders/:id/status` | `{status, note?}`; invalid transitions return 422 with the allowed statuses |
| GET | `/staff/summary?date=` | Orders, sales, collected revenue, average order, by status/type, top dishes, refunds due |
| GET | `/staff/menu` | All categories and dishes |
| POST | `/staff/menu` | `{category_id, name, description?, price, image_url?}` |
| PUT | `/staff/menu/:id` | Same fields |
| DELETE | `/staff/menu/:id` | Remove a dish (past orders keep it) |
| PATCH | `/staff/menu/:id/availability` | Toggle available / sold out |
| PATCH | `/staff/menu/:id/sold-out-note` | `{note}`, e.g. "Back by 4pm" |
| POST / PUT / DELETE | `/staff/categories[/:id]` | `{name, description?, display_order}`; delete only when empty |
| GET / POST / PUT / DELETE | `/staff/delivery-zones[/:id]` | `{name, fee, estimated_minutes, is_active?}` |

### Health

| Path | Description |
|---|---|
| `GET /healthz` | Process is running |
| `GET /readyz` | Process is running **and** the database is reachable |

## WebSockets

Browsers can't send headers on WebSocket connections, so the token goes in the query string:

| URL | Who | Receives |
|---|---|---|
| `/ws/orders/:id?token=JWT` | The order's customer (or staff) | Updates to that order |
| `/ws/staff?token=JWT` | Staff | Every new order and every status/payment change |

The same paths are also available under `/api/v1/ws/…`. Messages look like:

```json
{ "event": "order.created", "data": { "ID": 12, "reference": "CRV-7K3F9QXA", "status": "RECEIVED", "...": "..." } }
```

`event` is `order.created` or `order.updated`, and `data` is the full order. Connections from websites not listed in `CORS_ORIGINS` are refused.

## Payments (Paystack)

1. Create a Paystack account and copy your **test** secret key (`sk_test_…`) from *Settings → API Keys & Webhooks*.
2. Set `PAYSTACK_SECRET_KEY` and `PAYSTACK_CALLBACK_URL` (your website's `/payment/callback` page).
3. In the same Paystack screen, set the **Webhook URL** to `https://<your-api-domain>/api/v1/webhooks/paystack`. For local testing, expose the API with a tunnel such as ngrok or cloudflared.
4. Restart the API. "Pay online now" appears at checkout.

How a payment flows:

1. Checkout creates the order, then a payment with a unique reference (`CRV-XXXX-YYYYYY`), and returns Paystack's checkout link.
2. The customer pays on Paystack and is returned to `/payment/callback?reference=…`. The website calls `GET /payments/verify` for an instant result.
3. Paystack also calls the webhook. Every confirmation is checked: signature, currency (NGN) and amount must match the order total. Processing is idempotent.

Payment received for a cancelled order is flagged `refund_pending`. Switch to your `sk_live_…` key when you go live.

## Email (password resets)

1. Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD` and `MAIL_FROM`.
   - **Gmail / Google Workspace:** `smtp.gmail.com`, port `587`, with an [App Password](https://myaccount.google.com/apppasswords) (requires 2-step verification).
   - **Zoho:** `smtp.zoho.com`, port `465`.
   - **Brevo:** `smtp-relay.brevo.com`, port `587`.
2. Set `APP_URL` to your website address so links in emails point to it.
3. Restart the API.

How resets work:

- `POST /auth/forgot-password` always gives the same answer, so it can't be used to discover which emails have accounts.
- If the account exists, a link valid for **30 minutes** is emailed; only the newest link works, and only once.
- Resetting the password logs the user in and **signs out every other session**.

Without SMTP configured, the link is printed in the API log in development (`password reset link (development only)`). In production it is never logged.

## Security

- Passwords are hashed with bcrypt; reset tokens are stored only as SHA-256 hashes.
- JWTs are HS256 with issuer and expiry checks. Changing or resetting a password invalidates all older tokens.
- Login, sign-up and reset endpoints are rate limited per IP. Login responses take the same time whether or not the email exists.
- Staff code comparison is constant-time.
- Database errors are never sent to clients; they're logged with a request ID instead.
- Paystack webhooks are verified with HMAC-SHA512.
- WebSocket connections check both the token and the website origin.
- Security headers (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`) are set on every response.

## Database migrations

Migrations run automatically at startup (GORM AutoMigrate plus some hand-written SQL in `db/migrate.go`). They include upgrades for databases created by the first version of this API:

- Money columns stored as Naira decimals are converted to exact kobo.
- Existing orders get references, a subtotal and a payment status.
- Duplicate cart lines are merged and emails are lower-cased.

The upgrades are safe to run repeatedly.

## Testing

```bash
go test ./...
go vet ./...
```

Unit tests cover:

- Kobo arithmetic and Naira formatting.
- Nigerian phone number parsing.
- Order status transitions and price calculation.
- Opening hours, including overnight and 24-hour settings.
- Production config validation.
- The Paystack client and webhook signatures.
- Email delivery, using an in-process fake SMTP server.

## Running with Docker

```bash
docker compose up -d --build     # PostgreSQL (host port 5434) + API (port 8080)
docker compose exec api seed     # load the sample menu once
```

The compose file reads `.env` but points the API at its own database container. If you already run a separate `cravely-db` container on port 5434, stop it first or change the port in `docker-compose.yml`.

To build only the production image:

```bash
docker build -t cravely-api .
docker run --env-file .env -p 8080:8080 cravely-api
```

The image is based on Alpine and runs as a non-root user. It includes `tzdata` (for Africa/Lagos) and CA certificates (for Paystack and SMTP over TLS).

## Deploying to production

**On Render:** the `render.yaml` Blueprint in the repository root creates the database and this API (Docker, Frankfurt region) with `DATABASE_URL`, `APP_ENV`, a generated `JWT_SECRET`, `TRUSTED_PROXIES` and a `/readyz` health check already set. You'll be asked for `STAFF_CODE`, `CORS_ORIGINS`, `APP_URL` and `PAYSTACK_CALLBACK_URL`. To load the sample menu into the Render database from your computer:

```bash
DATABASE_URL='<External Database URL from Render>' go run ./cmd/seed
```

Checklist for any host:

- [ ] `APP_ENV=production`
- [ ] `JWT_SECRET` set to a long random value (`openssl rand -hex 32`)
- [ ] Managed PostgreSQL (`DATABASE_URL`) with backups enabled
- [ ] `CORS_ORIGINS` and `APP_URL` set to your real website address (https)
- [ ] `TRUSTED_PROXIES` set if you're behind a load balancer or reverse proxy
- [ ] `STAFF_CODE` changed from any default and kept private
- [ ] `OPENING_TIME` / `CLOSING_TIME`, `VAT_PERCENT` and `MIN_ORDER_NAIRA` set for your business
- [ ] Paystack **live** key set and the webhook URL configured in the dashboard
- [ ] SMTP configured, with a password-reset email sent and received as a test
- [ ] HTTPS in front of the API (WebSockets then use `wss://`)
- [ ] Health checks pointed at `/readyz`
- [ ] `go run ./cmd/seed` run only if you want the sample menu; otherwise add dishes from the kitchen dashboard

## Troubleshooting

| Problem | Fix |
|---|---|
| `JWT_SECRET is required in production` | Set `JWT_SECRET` (min 32 characters) or use `APP_ENV=development` locally |
| `password authentication failed for user "postgres"` | `DB_PASSWORD` / `DB_PORT` don't match your database |
| `connection refused` | Database not running, or wrong `DB_HOST` / `DB_PORT` |
| Website shows CORS or WebSocket errors | Add the website's exact origin (scheme + host + port) to `CORS_ORIGINS` |
| "We're closed right now" | Check `OPENING_TIME` / `CLOSING_TIME` (Lagos time); equal values mean 24 hours |
| Online payment option doesn't appear | `PAYSTACK_SECRET_KEY` is empty; set it and restart |
| Paystack payments stay "pending" | Webhook URL not set in Paystack, or the API isn't reachable from the internet |
| No reset emails arrive | Check the API log for `password reset email failed`; verify SMTP settings and the spam folder |
| `429 Too many attempts` | Wait a minute, or raise `AUTH_RATE_LIMIT_PER_MINUTE` for development |
