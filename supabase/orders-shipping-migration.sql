-- ============================================================================
-- Nova / BOM➜X — Order shipping columns migration
--
-- Adds the per-order delivery destination + flat shipping fee captured at
-- checkout (the city the customer picked from public.shipping_rates and the
-- price that applied at that moment).
--
-- WHY persist the fee on the order instead of joining shipping_rates at read
-- time: a city's rate can change later. Storing the resolved values keeps every
-- historical order's total reproducible and auditable.
--
-- SAFETY
--   Run ONCE in the Supabase SQL Editor. Safe to re-run: both ADD COLUMNs are
--   guarded with IF NOT EXISTS and no statement drops or truncates data.
--   Existing rows backfill to '' / 0 so the NOT NULL constraints hold.
-- ============================================================================

alter table public.orders
  add column if not exists shipping_city text not null default '';

alter table public.orders
  add column if not exists shipping_cost numeric(12, 2) not null default 0
    check (shipping_cost >= 0);

-- ---------------------------------------------------------------------------
-- Verification
-- ---------------------------------------------------------------------------

select 'orders shipping columns' as check,
       exists (
         select 1 from information_schema.columns
         where table_schema = 'public' and table_name = 'orders'
           and column_name = 'shipping_city'
       ) as has_shipping_city,
       exists (
         select 1 from information_schema.columns
         where table_schema = 'public' and table_name = 'orders'
           and column_name = 'shipping_cost'
       ) as has_shipping_cost;
