# Nova — Modern E-commerce

A production-grade e-commerce reference built with **Next.js 14 (App Router)**, **TypeScript**, **Tailwind CSS**, and **Zustand**. Multilingual storefront (EN / AR / FR with RTL) + full admin dashboard + real authentication, real analytics, and real-time sync.

## What's inside

- **Storefront**
  - Floating glass toolbar, language switcher, floating cart FAB, mobile bottom nav
  - Instant category chips and live URL-synced search
  - Side-drawer cart (no page reloads) with quantity controls
  - **One-click checkout** for logged-in users using their saved shipping profile
  - Storefront prices/name update instantly when the admin changes them
- **Auth / authorization**
  - Customer sign-in at `/login` and **separate admin sign-in at `/login/admin`**
  - Edge middleware gates `/admin/*` and admin APIs on role
  - scrypt password hashing + HMAC-signed session cookies (Web-Crypto compatible for middleware)
  - Banned accounts are rejected on next request
- **Admin**
  - **Real analytics** — revenue (paid invoices), orders, active users, stock alerts, 14-day revenue chart, top products, status breakdown
  - Inventory CRUD with multilingual product editor
  - Orders with inline status updates and expandable detail
  - Invoices with paid/unpaid toggle + printable modal
  - **Users page** with ban/unban and delete
  - **Global Settings** — store name, currency, tax rate, low-stock threshold — applied site-wide
- **Realtime**
  - In-process event bus → `/api/events` Server-Sent Events stream
  - Client hooks subscribe once and auto-refetch; every admin mutation is visible on every open tab

## Running

```bash
npm install
npm run dev        # storefront http://localhost:3000 · admin http://localhost:3000/admin
```

**Seed accounts** (change immediately):
- Admin: `admin@nova.shop` / `admin1234`
- Customer: `demo@nova.shop` / `demo1234`

**Environment variables**
- `NEXTAUTH_SECRET` — HMAC key for session cookies. A dev fallback is used if unset; **set this in production**.

Scripts: `dev`, `build`, `start`, `lint`, `typecheck`.

## Project structure

```
src/
  app/
    layout.tsx · page.tsx · categories/ · cart/ · checkout/ · account/
    login/  login/admin/  register/                -- auth flows
    admin/
      page.tsx  inventory/  orders/  invoices/  users/  settings/
    api/
      auth/{login, logout, register, me}/          -- session + profile
      products/[id]  categories  orders/[id]  invoices/[id]
      users/[id]  settings  analytics  events      -- SSE realtime
  components/
    ui/{Button, Icon}
    auth/AuthLayout
    storefront/{Toolbar, UserMenu, CartDrawer, ...}
    admin/AdminShell
  lib/
    server/{db, auth, bus}.ts                      -- server-only
    client/{api, hooks, realtime}.ts               -- client-only
    store/{cart, locale}.ts                        -- Zustand
    types.ts  i18n.ts  useI18n.ts  format.ts  utils.ts
  middleware.ts                                    -- Edge: /admin/* gate
```

## Key design notes

- **Persistence** is file-backed JSON in dev (`.nova-db.json`) via an async API that mirrors a real DB client — replace `src/lib/server/db.ts` with a Supabase / Postgres / Firebase driver and nothing else changes.
- **Realtime** uses an in-process `EventEmitter` → SSE. To scale horizontally, swap for Redis pub/sub, Postgres `LISTEN/NOTIFY`, or Supabase Realtime; the client contract (`/api/events`) stays the same.
- **Authorization** is layered: Edge middleware for page/routes that never need per-method logic, and `getCurrentUser()` checks inside routes (orders, invoices, settings) for fine-grained rules.
- **RTL** is done via logical CSS (`start-*`/`end-*`, `ps-*`/`pe-*`). `useI18n` syncs `<html dir/lang>`; the cart drawer mirrors its slide direction automatically.

## Docs

- [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) — component/state map
- [`docs/API_ENDPOINTS.md`](./docs/API_ENDPOINTS.md) — every endpoint with auth rules
- [`docs/DATABASE_SCHEMA.md`](./docs/DATABASE_SCHEMA.md) — full SQL schema ready for Supabase/Postgres
