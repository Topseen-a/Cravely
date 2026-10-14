<p align="center">
  <img src="fooddash-ui/public/brand/logo.svg" alt="Cravely" height="64" />
</p>

<p align="center">
  <strong>Naija food, ordered online and delivered across Lagos.</strong><br />
  A full-stack food ordering platform for Nigerian restaurants: customer storefront, live order tracking and a kitchen dashboard.
</p>

---

## Contents

- [What it does](#what-it-does)
- [Tech stack](#tech-stack)
- [Repository layout](#repository-layout)
- [Quick start](#quick-start)
- [Using the app](#using-the-app)
- [How it works](#how-it-works)
- [Configuration](#configuration)
- [Testing](#testing)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)

## What it does

**For customers**
- Browse an illustrated menu of Nigerian dishes: rice, swallow and soups, proteins, small chops and grills, drinks. Sold-out dishes stay visible with a note such as "Back by 4pm".
- Order for **delivery** (choose an area, add the street address, a landmark and a phone number) or **pickup**.
- Pay **on delivery** (cash, POS or transfer to the rider) or **online with Paystack** (card, bank transfer, USSD).
- See prices in Naira with a clear breakdown: food, delivery fee and VAT.
- Track orders **live** as they move through the kitchen. No refreshing needed.
- Cancel an order before the kitchen starts, reorder past meals in one click, and reset a forgotten password by email.

**For the kitchen (staff)**
- A live **kitchen board** (New → Cooking → Ready → On the way) with an optional sound alert for new orders, highlighting of late orders and tap-to-call customer phone numbers.
- Daily sales: total and collected revenue, average order, top dishes and orders by type.
- Manage dishes, prices, photos, sold-out status, categories and **delivery areas with flat fees**.

**Built for Lagos**
- Africa/Lagos time throughout (opening hours, "today's" orders).
- Nigerian phone numbers in any common format (`0803…`, `+234…`) are validated and stored consistently.
- Order references like `CRV-7K3F9QXA` are easy to read out over the phone.
- Money is stored as exact **kobo**, never floating point.
- A mobile-first design inspired by Lagos: danfo yellow, adire patterns, Third Mainland Bridge illustrations, and a little Pidgin.

## Tech stack

| Part | Technology |
|---|---|
| Backend API | Go 1.26+, Gin, GORM, PostgreSQL 16, Gorilla WebSocket, JWT |
| Frontend | React 19, Vite 8, Tailwind CSS 4, React Router 7, Axios |
| Payments | Paystack (optional) |
| Email | Any SMTP provider (optional; used for password resets) |

## Repository layout

```
Cravely/
├── fooddash-api/   Go REST + WebSocket API, database migrations, seed data
│                   → see fooddash-api/README.md
└── fooddash-ui/    React web app for customers and kitchen staff
                    → see fooddash-ui/README.md
```

## Quick start

### Prerequisites

- **Go** 1.26 or newer: `go version`
- **Node.js** 20.19+ or 22.12+ with npm: `node -v`
- **PostgreSQL** 16, either installed locally or run with **Docker**

### 1. Start a database

Pick **one** option.

**Option A: Docker (recommended).** This creates a database called `fooddash` with password `cravely` on port **5434**:

```bash
docker run -d --name cravely-db \
  -e POSTGRES_PASSWORD=cravely \
  -e POSTGRES_DB=fooddash \
  -p 5434:5432 \
  -v cravely-data:/var/lib/postgresql/data \
  postgres:16-alpine
```

After a reboot, start it again with `docker start cravely-db`.

**Option B: a PostgreSQL already installed on your machine.** Create the database, and set a password if you don't know it:

```bash
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'cravely';"
sudo -u postgres psql -c "CREATE DATABASE fooddash;"
```

### 2. Configure and start the API

```bash
cd fooddash-api
cp .env.example .env
```

Edit `fooddash-api/.env` and set at least:

```ini
DB_PORT=5434            # 5432 if you used Option B
DB_PASSWORD=cravely
JWT_SECRET=             # paste the output of: openssl rand -hex 32
STAFF_CODE=kitchen123   # the code kitchen staff use to sign up; choose your own
OPENING_TIME=00:00      # equal opening and closing times = open 24 hours
CLOSING_TIME=00:00      #   (handy while developing)
```

Load the sample menu and delivery areas (once), then start the server:

```bash
go run ./cmd/seed     # creates tables, a Nigerian menu and Lagos delivery areas
go run .              # API on http://localhost:8080
```

Leave this terminal running.

### 3. Start the web app

In a **second terminal**:

```bash
cd fooddash-ui
npm install
npm run dev           # web app on http://localhost:5173
```

Open **http://localhost:5173**.

## Using the app

| I want to… | Do this |
|---|---|
| Order as a customer | Click **Sign up**, add dishes, open the cart, check out |
| Run the kitchen | Go to **/staff/register**, sign up with your `STAFF_CODE`, then use the **Kitchen** board |
| Log in again later | Use **/login** with the same email and password. Staff are taken to the kitchen board automatically |
| Test both at once | Use a normal window for one account and a private/incognito window for the other |
| Reset a password without email set up | Click **Forgot password?**; the reset link is printed in the API terminal (development only) |

There is no separate "admin" role: **staff accounts manage everything**, including orders, menu, prices and delivery areas. Anyone with the staff code can create a staff account, so keep the code private and change it when staff leave.

## How it works

```
 Browser (React)  ──HTTPS──▶  API (Go/Gin)  ──▶  PostgreSQL
      ▲                          │   │
      └──────WebSocket───────────┘   └──▶  Paystack, SMTP (optional)
```

- **Ordering:** checkout locks the cart, re-checks prices and availability, calculates delivery and VAT on the server, and creates the order in a single transaction. Double-clicking "Place order" can't create two orders.
- **Order lifecycle:**
  - Delivery: `RECEIVED → PREPARING → READY → OUT_FOR_DELIVERY → DELIVERED`
  - Pickup: `RECEIVED → PREPARING → READY → PICKED_UP`

  The kitchen can cancel up to READY; customers can cancel while the order is still RECEIVED. Pay-on-delivery orders are marked paid when completed.
- **Live updates:** every status change is pushed over WebSockets to the customer's tracking page and to the kitchen board.
- **Online payments:** the customer is sent to Paystack's checkout. The payment is confirmed by a signed Paystack webhook and checked against the order total. An unpaid online order can't move into the kitchen.

## Configuration

Each app has an `.env.example` describing every setting:

- **API** (`fooddash-api/.env`): database, security, opening hours, VAT, minimum order, Paystack, email. See the [API README](fooddash-api/README.md#configuration).
- **Web app** (`fooddash-ui/.env`): API address and an optional hero video. See the [web app README](fooddash-ui/README.md#configuration).

Never commit `.env` files; both are already in `.gitignore`.

## Testing

```bash
cd fooddash-api && go test ./...    # unit tests: money, phone numbers, order rules, Paystack, email
cd fooddash-ui  && npm run lint     # React lint (including React Compiler rules)
cd fooddash-ui  && npm run build    # production build check
```

## Deployment

**Render + Vercel (ready to use):**
- `render.yaml` creates the PostgreSQL database and the API on Render in one step (*New → Blueprint*).
- `fooddash-ui/vercel.json` configures the website on Vercel (set the project's Root Directory to `fooddash-ui` and add `VITE_API_URL`).

General steps for any host:

1. **Database:** a managed PostgreSQL (Render, Supabase, Neon, AWS RDS…). Paste its connection string into `DATABASE_URL`.
2. **API:** build with the included `Dockerfile` (or `go build`) and set the environment variables. In production set `APP_ENV=production`, a strong `JWT_SECRET`, `CORS_ORIGINS` and `APP_URL` pointing at your website, and real Paystack and SMTP credentials. Health checks: `/healthz` and `/readyz`.
3. **Web app:** `npm run build` with `VITE_API_URL` set to your public API URL, then host `dist/` on any static host (Netlify, Vercel, Cloudflare Pages, nginx). Configure the host to serve `index.html` for every route.
4. **Paystack:** in the Paystack dashboard, set the webhook URL to `https://<your-api-domain>/api/v1/webhooks/paystack`.

Full checklists are in each app's README.

## Troubleshooting

| Problem | Fix |
|---|---|
| `go: command not found` | Install Go, or add it to your `PATH` and open a new terminal |
| `password authentication failed for user "postgres"` | `DB_PASSWORD` / `DB_PORT` in `fooddash-api/.env` don't match your database |
| `connection refused` on port 5434 | The database isn't running: `docker start cravely-db` |
| `port is already allocated` when starting Docker | Another program is using that port; pick another (e.g. `-p 5435:5432`) and update `DB_PORT` |
| Website loads but the menu is empty | Run `go run ./cmd/seed` in `fooddash-api` |
| "We're closed right now" at checkout | Adjust `OPENING_TIME` / `CLOSING_TIME` (equal values = 24 hours) and restart the API |
| A change to `.env` has no effect | Restart the API (Ctrl+C, then `go run .`) or the web app (`npm run dev`) |

## Author

Built by [Temitope](https://github.com/Topseen-a).
