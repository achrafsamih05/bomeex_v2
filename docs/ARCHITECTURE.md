# Frontend Architecture

This document is a quick map of every component and how state flows through the app.

## Layer diagram

```
 ┌──────────────────────────────────────────────────────────┐
 │  Pages (src/app/*)                                        │
 │    Storefront: /, /cart, /categories, /checkout, /account │
 │    Admin:      /admin, /admin/{inventory, orders, ...}    │
 └──────────────┬───────────────────────┬───────────────────┘
                │                       │
                ▼                       ▼
      ┌────────────────┐        ┌────────────────┐
      │  Storefront UI │        │   Admin UI     │
      │  (StoreShell)  │        │  (AdminShell)  │
      └────────┬───────┘        └────────┬───────┘
               │                         │
               ▼                         ▼
      ┌────────────────────────────────────────┐
      │  Shared primitives (src/components/ui) │
      │   Icon, Button                         │
      └────────────────────┬───────────────────┘
                           ▼
          ┌────────────────────────────────┐
          │  State & services (src/lib)    │
          │   useCart, useLocale, useI18n, │
          │   db, format, types            │
          └────────────────┬───────────────┘
                           ▼
                   ┌───────────────┐
                   │  /api routes  │
                   └───────────────┘
```

## Shared primitives (`src/components/ui`)

- `Icon` — single lucide registry. Using string keys makes icons data-driven (categories reference icons by name in the DB).
- `Button` — typed variants (`primary`, `secondary`, `ghost`, `danger`) and sizes.

## Storefront (`src/components/storefront`)

- `StoreShell` — wraps every storefront page. Mounts the toolbar, the cart drawer, and the bottom nav, and calls `useI18n` to sync `<html dir/lang>`.
- `Toolbar` — glass header with brand, admin link, language switcher, cart button.
- `LanguageSwitcher` — EN / AR / FR with a tidy dropdown.
- `Hero` — gradient banner for brand messaging.
- `SearchBar` — URL-synced search (`?q=`).
- `CategoryChips` — URL-synced filter (`?category=`) with icons and an "All" chip.
- `ProductGrid` — reads `?q` and `?category` and filters the product list; 2 columns on mobile, up to 5 on large screens.
- `ProductCard` — image, rating badge, stock state, add-to-cart button.
- `CartDrawer` — right-side drawer (flips to left in RTL), quantity controls, totals, clear and checkout buttons.
- `CartButton` — variants: inline toolbar button and a floating FAB.
- `BottomNav` — 4-tab mobile navigation.

## Admin (`src/components/admin`)

- `AdminShell` — sidebar + topbar + slot-in content.

## State

| Store           | Purpose                                  | Persistence         |
| --------------- | ---------------------------------------- | ------------------- |
| `useCart`       | Cart items + drawer open state           | `localStorage`      |
| `useLocale`     | Active locale (`en`/`ar`/`fr`)           | `localStorage`      |

Both are Zustand stores under `src/lib/store/*`.

## i18n & RTL

- Messages live in `src/lib/i18n.ts` (one dictionary, keyed by message id).
- `useI18n()` returns `{ locale, dir, t }` and sets `<html dir>` + `<html lang>` on mount/change.
- Layout uses logical utilities (`start-*`, `end-*`, `ps-*`, `pe-*`) so the UI mirrors automatically for Arabic.
