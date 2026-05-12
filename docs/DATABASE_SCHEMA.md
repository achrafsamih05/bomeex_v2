# Database Schema

Nova is designed to run on a real relational database (PostgreSQL / Supabase) in production.
For the demo, the same shapes are served from `src/lib/db.ts` as an in-memory store — swap that module for your DB client to go live.

Below is the canonical SQL schema. It maps 1:1 to `src/lib/types.ts`.

## Schema overview

```
categories ─┐
            ├── products ──┐
            │              │
            │              ├── order_items ── orders ── invoices
```

## Tables

### `categories`

```sql
create table categories (
  id         text primary key,           -- e.g. c-electronics
  slug       text not null unique,       -- electronics
  name_en    text not null,
  name_ar    text not null,
  name_fr    text not null,
  icon       text not null,              -- lucide icon name
  created_at timestamptz not null default now()
);
```

### `products`

```sql
create table products (
  id            text primary key,                 -- e.g. p-001
  sku           text not null unique,
  name_en       text not null,
  name_ar       text not null,
  name_fr       text not null,
  description_en text not null default '',
  description_ar text not null default '',
  description_fr text not null default '',
  price         numeric(12, 2) not null check (price >= 0),
  currency      text not null default 'USD',
  category_id   text not null references categories(id) on delete restrict,
  stock         integer not null default 0 check (stock >= 0),
  image         text not null,
  rating        numeric(3, 2) not null default 0 check (rating between 0 and 5),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index on products (category_id);
create index on products (created_at desc);
```

### `orders`

```sql
create type order_status as enum (
  'pending',
  'processing',
  'shipped',
  'delivered',
  'cancelled'
);

create table orders (
  id              text primary key,              -- e.g. o-1001
  customer_name   text not null,
  customer_email  text not null,
  customer_phone  text,
  customer_address text not null,
  subtotal        numeric(12, 2) not null,
  tax             numeric(12, 2) not null,
  total           numeric(12, 2) not null,
  status          order_status not null default 'pending',
  created_at      timestamptz not null default now()
);

create index on orders (created_at desc);
create index on orders (status);
```

### `order_items`

```sql
create table order_items (
  id          bigserial primary key,
  order_id    text not null references orders(id) on delete cascade,
  product_id  text not null references products(id) on delete restrict,
  name        text not null,            -- snapshot of localized name at purchase
  quantity    integer not null check (quantity > 0),
  price       numeric(12, 2) not null   -- snapshot of unit price
);

create index on order_items (order_id);
```

### `invoices`

```sql
create type invoice_status as enum ('paid', 'unpaid', 'overdue');

create table invoices (
  id         text primary key,                -- e.g. i-5001
  order_id   text not null references orders(id) on delete cascade,
  number     text not null unique,            -- e.g. INV-2026-5001
  issued_at  timestamptz not null default now(),
  due_at     timestamptz not null,
  status     invoice_status not null default 'unpaid',
  amount     numeric(12, 2) not null
);

create index on invoices (status);
create index on invoices (order_id);
```

### `users` (optional, for real auth)

```sql
create type user_role as enum ('customer', 'admin');

create table users (
  id          uuid primary key default gen_random_uuid(),
  email       text not null unique,
  name        text,
  role        user_role not null default 'customer',
  locale      text not null default 'en' check (locale in ('en','ar','fr')),
  created_at  timestamptz not null default now()
);
```

## ER diagram (text)

```
categories (1) ───< (N) products
products (1) ───< (N) order_items >─── (1) orders
orders (1) ───< (1..N) invoices
users (1) ───< (N) orders          -- optional, wire when auth is added
```

## Seed data

`src/lib/db.ts` contains realistic seed data for local development:

- 6 categories (Electronics, Phones, Plumbing, Home, Fashion, Sports)
- 12 products spanning all categories, with localized names/descriptions
- 4 sample orders across all statuses
- 4 matching invoices (2 paid, 2 unpaid)

## Swapping for a real database

The simplest path:

1. Create the tables above in Supabase / Postgres.
2. Replace `src/lib/db.ts` with a thin data-access module exposing the same named exports (`products`, `categories`, `orders`, `invoices`, and the `next*Id` helpers), but backed by your client.
3. The API route handlers (`src/app/api/**/route.ts`) already consume those exports — no changes needed.
