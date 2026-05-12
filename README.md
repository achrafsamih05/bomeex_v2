# Nova — Modern E-commerce

A production-grade e-commerce reference built with **Next.js 14 (App Router)**, **TypeScript**, **Tailwind CSS**, and **Zustand**.
It ships a multilingual storefront (EN / AR / FR with full RTL) and a complete admin dashboard — all wired to a small, swappable server layer.

## Highlights

- **Storefront**
  - Floating glass toolbar, floating cart button, mobile bottom nav
  - Instant category chips and live search (URL-synced)
  - Side-drawer cart (no page reloads) with quantity controls
  - Checkout flow that creates an order and an invoice in one call
  - Full RTL: `<html dir>` and logical CSS (`start`/`end`) flip automatically
- **Admin**
  - Dashboard with revenue, orders, low-stock and top products
  - Inventory CRUD with a multilingual product editor
  - Orders with inline status updates and expandable details
  - Invoices with paid/unpaid toggle and print-ready modal
  - Profile, currency, tax and language settings
- **Architecture**
  - Modular components (`src/components/{ui,storefront,admin}`)
  - Clean domain types in `src/lib/types.ts`
  - Zustand store (persisted) for cart and locale
  - REST-style API routes at `/api/*` ready to swap for Supabase/Postgres/Firebase

## Getting started

```bash
npm install
npm run dev
```

Then open http://localhost:3000 (storefront) and http://localhost:3000/admin (admin).

Scripts:

- `npm run dev` — start the dev server
- `npm run build` — production build
- `npm run start` — run the production build
- `npm run lint` — lint
- `npm run typecheck` — TypeScript check

## Project structure

```
src/
  app/
    layout.tsx              # Root HTML shell
    page.tsx                # Storefront home
    cart/                   # Redirects and opens the cart drawer
    categories/             # Category index
    checkout/               # Checkout form + summary
    account/                # Customer account & prefs
    admin/
      page.tsx              # Dashboard
      inventory/            # Products CRUD
      orders/               # Orders list + status updates
      invoices/             # Invoices + print modal
      settings/             # Admin settings
    api/
      products/             # GET, POST, [id] GET/PATCH/DELETE
      categories/           # GET
      orders/               # GET, POST, [id] GET/PATCH
      invoices/             # GET, [id] GET/PATCH
      analytics/            # GET summary
  components/
    ui/                     # Button, Icon (lucide registry)
    storefront/             # Toolbar, LanguageSwitcher, CartDrawer, etc.
    admin/                  # AdminShell
  lib/
    db.ts                   # In-memory seed data (swap for real DB)
    i18n.ts                 # Dictionary + direction helpers
    useI18n.ts              # React hook — syncs <html dir/lang>
    store/
      cart.ts               # Cart (Zustand, persisted)
      locale.ts             # Active locale
    types.ts                # Domain types
    format.ts               # Intl formatters
    utils.ts                # cn() helper
```

## Tech stack

- **Framework:** Next.js 14 App Router with TypeScript
- **Styling:** Tailwind CSS with a custom `ink` / `brand` palette, logical CSS utilities
- **State:** Zustand with `persist` for the cart + locale
- **Icons:** lucide-react
- **i18n:** tiny in-house dictionary + `useI18n` hook
- **API:** Next.js route handlers (easy to replace with Supabase/Firebase)

## Internationalization & RTL

- Locales: `en`, `ar`, `fr`
- `useI18n` syncs `<html lang>` and `<html dir>` automatically
- All layouts use `start-*` / `end-*`, `ps-*` / `pe-*` so they mirror for Arabic without extra CSS
- Number and date formatting go through `Intl` (see `src/lib/format.ts`)

## API, DB schema, and deployment

- **API endpoints:** see [`docs/API_ENDPOINTS.md`](./docs/API_ENDPOINTS.md)
- **Database schema:** see [`docs/DATABASE_SCHEMA.md`](./docs/DATABASE_SCHEMA.md)
- **Swapping the data source:** replace `src/lib/db.ts` with a thin client for your chosen provider (Supabase, Prisma + Postgres, Firestore). The route handlers already expect that shape.
