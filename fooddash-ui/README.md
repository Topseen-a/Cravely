# Cravely Web App

The website for Cravely, built with React. Customers use it to browse the menu, order and track deliveries live; kitchen staff use it to run orders and manage the menu. The design is mobile-first and inspired by Lagos.

It talks to the [Cravely API](../fooddash-api/README.md). For the project overview and the quickest way to run everything, see the [root README](../README.md).

## Contents

- [Pages](#pages)
- [Requirements](#requirements)
- [Getting started](#getting-started)
- [Configuration](#configuration)
- [Scripts](#scripts)
- [Project structure](#project-structure)
- [Design system](#design-system)
- [Illustrations & brand assets](#illustrations--brand-assets)
- [How the app works](#how-the-app-works)
- [Conventions](#conventions)
- [Accessibility & responsiveness](#accessibility--responsiveness)
- [Building & deploying](#building--deploying)
- [Troubleshooting](#troubleshooting)

## Pages

| Path | Who | What it does |
|---|---|---|
| `/` | Everyone | Home: animated Lagos hero, delivery-area ticker, searchable menu with category tabs |
| `/login`, `/register` | Everyone | Log in / sign up (with show-password toggle) |
| `/forgot-password`, `/reset-password` | Everyone | Request a reset link by email; choose a new password |
| `/staff/register` | Kitchen staff | Staff sign-up with the staff code |
| `/cart` | Customers | Checkout: quantities, chef's notes, delivery or pickup, area, address, landmark, phone, payment method, price breakdown |
| `/orders` | Customers | Order history with live status and "Order again" |
| `/orders/:id` | Customers | Live order tracking: route illustration, estimated arrival, timeline, cancel, pay now |
| `/payment/callback` | Customers | Return page after Paystack checkout; confirms the payment |
| `/account` | Signed-in users | Profile (name, phone) and password |
| `/staff` | Staff | Live kitchen board with sound alerts and daily sales |
| `/staff/menu` | Staff | Dishes (prices, photos, sold out), categories, delivery areas |

There is no separate admin role; staff accounts manage everything.

## Requirements

- **Node.js** 20.19+ or 22.12+ with npm
- The Cravely API running (by default on `http://localhost:8080`)

## Getting started

```bash
npm install
npm run dev
```

Open **http://localhost:5173**. Changes to the code appear instantly in the browser.

The API must allow this address in its `CORS_ORIGINS` setting; the default `http://localhost:5173` already does.

## Configuration

Copy `.env.example` to `.env` if you need to change anything. Variables are read **when the dev server starts or when you build**, so restart `npm run dev` after editing.

| Variable | Default | Description |
|---|---|---|
| `VITE_API_URL` | `http://localhost:8080/api/v1` | Address of the API. WebSockets use the same host |
| `VITE_HERO_VIDEO_URL` | *(empty)* | Optional looping, muted video for the home hero instead of the animated illustration, e.g. `/videos/lagos.mp4` placed in `public/videos/`. Keep it short (10–20s) and under ~3 MB, since many customers are on mobile data |

Everything else (opening hours, VAT, delivery areas and fees, whether online payment is enabled) comes from the API at runtime.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server with hot reload |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the production build locally to check it |
| `npm run lint` | ESLint, including React Hooks / React Compiler rules |

## Project structure

```
fooddash-ui/
├── index.html                  Page title, meta tags, icons
├── public/
│   ├── favicon.svg, apple-touch-icon.png
│   └── brand/                  Logo files (SVG + PNG) for social media, print, etc.
└── src/
    ├── main.jsx, App.jsx       Entry point, providers, routes, page layout
    ├── index.css               Tailwind setup, design tokens, animations
    ├── api/
    │   ├── client.js           Axios instance: auth header, session expiry, WebSocket URLs
    │   └── endpoints.js        Every API call in one place
    ├── context/
    │   ├── hooks.js            Context objects + useAuth / useCart / useStore / useToast
    │   ├── AuthContext.jsx     Session (login, sign-up, logout, profile)
    │   ├── CartContext.jsx     Cart state and actions
    │   ├── StoreContext.jsx    Opening hours, VAT, payment options, delivery areas
    │   └── ToastContext.jsx    Notifications
    ├── hooks/
    │   ├── useSocket.js        WebSocket with automatic reconnect
    │   ├── useOrderStatus.js   One order, kept live
    │   └── useStaffOrders.js   Today's orders for the kitchen, kept live
    ├── lib/
    │   ├── format.js           Naira, Lagos dates/times, phone numbers, error messages
    │   ├── status.js           Order/payment status labels, captions and colours
    │   ├── pricing.js          Checkout total calculation (mirrors the API)
    │   ├── food.js             Picks an illustration for a dish from its name
    │   └── chime.js            New-order sound (Web Audio, no files)
    ├── components/
    │   ├── ui.jsx              Button, Input, PasswordInput, Select, Modal, Card, chips…
    │   ├── Navbar, MobileNav, Footer, AuthLayout, ProtectedRoute
    │   ├── MenuItemCard, OrderTracker, OrderTimeline, StoreStatusPill, Confetti, Icon
    │   └── illustrations/      Logo, Lagos scene, danfo & okada, food art
    └── pages/                  One file per page (see Pages)
```

## Design system

The look is drawn from Lagos streets. Colours are defined as Tailwind theme tokens in `src/index.css`, so classes like `bg-danfo` or `text-jollof` work everywhere.

| Token | Colour | Used for |
|---|---|---|
| `danfo` | `#ffc72c` | Primary buttons, highlights (Lagos bus yellow) |
| `ink` | `#17120e` | Text, dark surfaces (asphalt) |
| `jollof` | `#e2492b` | Prices, accents, errors |
| `lagoon` | `#0d6e73` | Order tracking, delivery |
| `adire` | `#23307a` | Avatars, focus rings, adire textile pattern |
| `palm` | `#0a8754` | Success, "available", paid |
| `cream` | `#fff8ec` | Page background |

Each colour also has `-soft` (light background) and some have `-dark` variants.

- **Fonts:** *Bricolage Grotesque* for headings and *DM Sans* for text. Both are bundled through `@fontsource`, so there are no external font requests.
- **Patterns:** `.bg-adire` (light lines on dark) and `.bg-adire-light` (on light), plus `.danfo-stripes`.
- **Animations:** `animate-fade-up`, `animate-pop`, `animate-float`, `animate-marquee`, `animate-drive` and others. All are switched off for users who enable "reduce motion" in their system settings.
- **Tone:** clear English with a light touch of Pidgin ("Weytin you go chop today?", "Chef dey cook am fresh").

## Illustrations & brand assets

All artwork is hand-built SVG in `src/components/illustrations/`. It's sharp at any size, weighs very little and needs no image hosting.

| File | Contents |
|---|---|
| `Logo.jsx` | Logo mark (C with steam) and wordmark |
| `LagosScene.jsx` | Animated hero: Lagos Island skyline, Lekki–Ikoyi Link Bridge, lagoon, danfos and an okada on Third Mainland Bridge |
| `Vehicles.jsx` | Danfo bus and okada rider |
| `FoodArt.jsx` | Detailed dish illustrations |

**Dish illustrations** are picked automatically from the dish name by `src/lib/food.js`. For example, "Ofada" gives rice on an uma leaf, "Amala" gives amala with ewedu and gbegiri, and "Suya" gives suya on newspaper. To support a new kind of dish, add a rule in `foodKind()` and, if needed, a drawing in `FoodArt.jsx`.

**Real photos:** when staff add a **Photo URL** to a dish in *Menu & delivery areas*, the photo replaces the illustration for that dish.

**Logo files** for use outside the app are in `public/brand/`:

| File | Use |
|---|---|
| `logo.svg` | Full logo for light backgrounds |
| `logo-dark.svg` | Full logo for dark backgrounds |
| `logo-mark.svg`, `logo-mark-yellow.svg` | Icon only |
| `logo-mark-512.png` | Profile pictures (WhatsApp, Instagram…) |

## How the app works

- **Sessions:** the login token is stored in `localStorage` and sent with every request. If the API answers 401 (expired, or the password was changed elsewhere), the user is sent to `/login?expired=1`.
- **Live updates:** order pages and the kitchen board connect to the API over WebSockets (`useSocket`). They reconnect automatically with back-off, which matters on flaky mobile data, and re-fetch after reconnecting so nothing is missed. The kitchen board also re-fetches every minute as a safety net.
- **Prices:** the API sends amounts in Naira, and `naira()` in `lib/format.js` formats them as `₦3,500` / `₦787.50`. The checkout preview uses `lib/pricing.js`, which mirrors the API's rounding exactly. The server's numbers are always final.
- **Times:** shown in Lagos time (`Africa/Lagos`) regardless of the viewer's device settings.
- **Checkout details:** the last delivery area, address and landmark are remembered on the device for next time.
- **Payments:** with Paystack, checkout redirects to Paystack's hosted page, which returns to `/payment/callback`.

## Conventions

- **API calls** go through `src/api/endpoints.js`; don't call `axios` directly in components.
- **Shared state** uses the hooks in `src/context/hooks.js` (`useAuth`, `useCart`, `useStore`, `useToast`).
- **UI pieces** come from `src/components/ui.jsx` (`Button`, `Input`, `PasswordInput`, `Modal`…), so pages stay consistent.
- **Errors** are shown with `apiError(err)` from `lib/format.js`, which turns network and API errors into friendly messages.
- **Notifications** use `useToast()`; don't use `alert()`.
- **Lint:** the project follows the React Compiler rules enforced by ESLint. Keep render code pure (no `Math.random()` or `Date.now()` during render) and update refs in effects. `npm run lint` must pass.

## Accessibility & responsiveness

- Tested from **320px phones** (iPhone SE) up to **1920px desktops**, with no horizontal scrolling at any size.
- Phones get a bottom tab bar and a floating "View cart" bar; the kitchen board switches to tabs on small screens.
- Buttons and inputs have visible focus outlines, icons have labels for screen readers, dialogs close with Escape, and live updates are announced politely.
- Motion is reduced automatically when the system "reduce motion" setting is on.

## Building & deploying

```bash
VITE_API_URL=https://api.yourdomain.com/api/v1 npm run build
```

Upload the `dist/` folder to any static host. Because the app uses client-side routing, the host must serve `index.html` for every path. Otherwise refreshing `/orders/12` returns 404.

| Host | Setting |
|---|---|
| **Netlify** | Add `public/_redirects` containing `/*  /index.html  200` |
| **Vercel** | Add `vercel.json`: `{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }` |
| **Cloudflare Pages** | Single-page app routing works by default |
| **nginx** | `location / { try_files $uri /index.html; }` |

After deploying:

- [ ] `VITE_API_URL` points to the live API over **https** (WebSockets then use `wss://`)
- [ ] The website's address is in the API's `CORS_ORIGINS` and is set as the API's `APP_URL`
- [ ] The API's `PAYSTACK_CALLBACK_URL` is `https://<your-site>/payment/callback`
- [ ] Refreshing a deep link (e.g. `/orders/1`) works

## Troubleshooting

| Problem | Fix |
|---|---|
| "Network wahala — check your connection" everywhere | The API isn't running, or `VITE_API_URL` is wrong |
| CORS errors in the browser console | Add this site's exact address to the API's `CORS_ORIGINS` and restart the API |
| Order page never shows **LIVE** | WebSocket blocked: check `CORS_ORIGINS`, and that a proxy in front of the API forwards WebSocket upgrades |
| Menu is empty | Seed the API: `go run ./cmd/seed` in `fooddash-api` |
| Changed `.env` but nothing happened | Restart `npm run dev` (variables are read at start-up) |
| 404 when refreshing a page in production | Configure the host to serve `index.html` for all routes (see above) |
| Old logo still shows in the browser tab | Hard refresh with Ctrl+Shift+R; browsers cache icons |
