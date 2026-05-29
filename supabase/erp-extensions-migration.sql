-- ============================================================================
-- Nova / BOM➜X — Micro-ERP extensions migration
--
-- Adds three capabilities on top of the base schema (supabase/schema.sql):
--
--   1. Per-city shipping rates       → public.shipping_rates
--   2. Micro-ERP financials          → public.expenses + settings.wallet_balance
--                                       (+ triggers that keep the wallet live)
--   3. Volume tier (wholesale) pricing → public.product_pricing_tiers
--
-- ARCHITECTURE NOTE — single-store vs. multi-tenant
--   This reference app is SINGLE-STORE: the "store profile" is the single
--   `settings` row (id = 1), and authorization is enforced by the API layer
--   (signed session cookies + getCurrentUser) with every write going through
--   the service-role key. There is therefore no `stores` table or `store_id`
--   column here, and `wallet_balance` lives on `settings`.
--
--   To make this MULTI-TENANT you would:
--     - add a `stores` table and a `store_id` text column to each table below,
--     - replace the `settings`-based wallet with `stores.wallet_balance`,
--     - enable RLS keyed on `store_id = get_user_store_id()` instead of the
--       permissive policies used here.
--   The trigger bodies and indexes carry over unchanged.
--
-- SAFETY
--   Run ONCE in the Supabase SQL Editor. Safe to re-run: every CREATE is
--   guarded (IF NOT EXISTS / OR REPLACE / DROP ... IF EXISTS) and no statement
--   drops or truncates existing data.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 0. Enums
-- ---------------------------------------------------------------------------

do $$ begin
  create type expense_category as enum ('staff', 'marketing', 'logistics', 'others');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- 1. Wallet balance on the single store-profile row (`settings`)
--
-- numeric(14,2) so a high-volume store's running cash balance never overflows
-- the precision a numeric(12,2) money column would. Defaults to 0 and is NOT
-- NULL so the trigger arithmetic below never has to guard against NULL.
-- ---------------------------------------------------------------------------

alter table public.settings
  add column if not exists wallet_balance numeric(14, 2) not null default 0;

insert into public.settings (id) values (1) on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 2. Per-city shipping rates
--
-- One row per Moroccan city the store delivers to. `city` is unique so the
-- admin "add a city" form can upsert on the city name. `active` lets an admin
-- temporarily disable a destination without deleting its configured price.
-- ---------------------------------------------------------------------------

create table if not exists public.shipping_rates (
  id         text primary key,
  city       text not null unique,
  price      numeric(12, 2) not null default 0 check (price >= 0),
  active     boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists shipping_rates_city_idx on public.shipping_rates (lower(city));

-- ---------------------------------------------------------------------------
-- 3. Expenses + wallet auto-deduction
--
-- Each insert into `expenses` represents money LEAVING the business, so a
-- trigger debits `settings.wallet_balance`. Deleting an expense credits it
-- back, keeping the wallet a true running total of (paid invoices − expenses).
-- ---------------------------------------------------------------------------

create table if not exists public.expenses (
  id          text primary key,
  title       text not null,
  category    expense_category not null default 'others',
  amount      numeric(12, 2) not null check (amount >= 0),
  description text not null default '',
  created_at  timestamptz not null default now()
);
create index if not exists expenses_created_at_idx on public.expenses (created_at desc);
create index if not exists expenses_category_idx   on public.expenses (category);

-- Debit the wallet when an expense is created; credit it back if one is
-- deleted or its amount is edited.
create or replace function public.expenses_apply_wallet()
returns trigger
language plpgsql
as $$
begin
  if (tg_op = 'INSERT') then
    update public.settings
       set wallet_balance = wallet_balance - new.amount
     where id = 1;
    return new;
  elsif (tg_op = 'DELETE') then
    update public.settings
       set wallet_balance = wallet_balance + old.amount
     where id = 1;
    return old;
  elsif (tg_op = 'UPDATE') then
    -- Net the difference so an edited amount stays consistent.
    update public.settings
       set wallet_balance = wallet_balance - (new.amount - old.amount)
     where id = 1;
    return new;
  end if;
  return null;
end;
$$;

drop trigger if exists expenses_apply_wallet on public.expenses;
create trigger expenses_apply_wallet
  after insert or update or delete on public.expenses
  for each row execute function public.expenses_apply_wallet();

-- ---------------------------------------------------------------------------
-- 4. Invoice → wallet credit
--
-- When an invoice transitions INTO 'paid', the store received money, so credit
-- the wallet by the invoice amount. Transitioning back OUT of 'paid' (an admin
-- un-marking an invoice) reverses the credit. Only status transitions move the
-- wallet — re-saving an already-paid invoice is a no-op.
-- ---------------------------------------------------------------------------

create or replace function public.invoices_apply_wallet()
returns trigger
language plpgsql
as $$
begin
  if (tg_op = 'INSERT') then
    if (new.status = 'paid') then
      update public.settings
         set wallet_balance = wallet_balance + new.amount
       where id = 1;
    end if;
    return new;
  elsif (tg_op = 'UPDATE') then
    -- Became paid.
    if (new.status = 'paid' and old.status is distinct from 'paid') then
      update public.settings
         set wallet_balance = wallet_balance + new.amount
       where id = 1;
    -- Was paid, now isn't (reversal).
    elsif (old.status = 'paid' and new.status is distinct from 'paid') then
      update public.settings
         set wallet_balance = wallet_balance - old.amount
       where id = 1;
    -- Stayed paid but the amount was edited: net the difference.
    elsif (new.status = 'paid' and old.status = 'paid'
           and new.amount is distinct from old.amount) then
      update public.settings
         set wallet_balance = wallet_balance + (new.amount - old.amount)
       where id = 1;
    end if;
    return new;
  end if;
  return null;
end;
$$;

drop trigger if exists invoices_apply_wallet on public.invoices;
create trigger invoices_apply_wallet
  after insert or update on public.invoices
  for each row execute function public.invoices_apply_wallet();

-- ---------------------------------------------------------------------------
-- 5. Volume tier (wholesale) pricing
--
-- A product can carry N quantity "slabs". When a cart line's quantity falls in
-- [min_quantity, max_quantity] the unit price drops to `price_per_item`.
-- `max_quantity` NULL means "and above" (an open-ended top tier). A partial
-- unique index guarantees at most one open-ended tier per product.
-- ---------------------------------------------------------------------------

create table if not exists public.product_pricing_tiers (
  id             text primary key,
  product_id     text not null references public.products(id) on delete cascade,
  min_quantity   integer not null check (min_quantity >= 1),
  max_quantity   integer check (max_quantity is null or max_quantity >= min_quantity),
  price_per_item numeric(12, 2) not null check (price_per_item >= 0),
  created_at     timestamptz not null default now()
);
create index if not exists product_pricing_tiers_product_idx
  on public.product_pricing_tiers (product_id, min_quantity);

-- At most one open-ended (max_quantity IS NULL) tier per product.
create unique index if not exists product_pricing_tiers_one_open_tier
  on public.product_pricing_tiers (product_id)
  where max_quantity is null;

-- ---------------------------------------------------------------------------
-- 6. Row-Level Security
--
-- Mirrors schema.sql: the catalog-facing tables get a permissive public-read
-- policy (the storefront cart needs tier prices and shipping rates), while
-- `expenses` has NO anon policy — the default "no policy = no anon access" is
-- exactly right for private financial data. Server writes use the service-role
-- key and bypass RLS regardless.
-- ---------------------------------------------------------------------------

alter table public.shipping_rates        enable row level security;
alter table public.product_pricing_tiers enable row level security;
alter table public.expenses              enable row level security;

drop policy if exists "Public read shipping_rates"        on public.shipping_rates;
drop policy if exists "Public read product_pricing_tiers" on public.product_pricing_tiers;

create policy "Public read shipping_rates"
  on public.shipping_rates for select using (true);
create policy "Public read product_pricing_tiers"
  on public.product_pricing_tiers for select using (true);

-- ---------------------------------------------------------------------------
-- 7. Verification
-- ---------------------------------------------------------------------------

select 'erp extensions' as check,
       to_regclass('public.shipping_rates')        is not null as has_shipping_rates,
       to_regclass('public.expenses')              is not null as has_expenses,
       to_regclass('public.product_pricing_tiers') is not null as has_pricing_tiers,
       exists (
         select 1 from information_schema.columns
          where table_schema = 'public'
            and table_name = 'settings'
            and column_name = 'wallet_balance'
       ) as has_wallet_balance;
