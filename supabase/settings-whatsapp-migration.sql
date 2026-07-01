-- ============================================================================
-- Nova e-commerce — settings table WhatsApp field migration.
--
-- PURPOSE
--   Adds the `whatsapp_url` column that backs the new WhatsApp social link in
--   the admin Settings form and the storefront <Footer />. The value is stored
--   as a full click-to-chat URL (https://wa.me/<number>). The settings API
--   (PATCH /api/settings) normalises a bare phone number into that form before
--   persisting, so this column always holds a ready-to-use <a href> value.
--
-- SAFETY
--   Run this in the Supabase SQL editor (or psql) against any existing
--   database. It ONLY adds a column — no DROP, no TRUNCATE, no data loss:
--     - the ALTER uses `add column if not exists`, so re-running is a no-op
--     - existing rows keep every previous value
--     - the default is an empty string so the app never branches on NULL
--   You do NOT need to re-seed or re-run schema.sql after this.
-- ============================================================================

alter table public.settings
  add column if not exists whatsapp_url text not null default '';

-- Ensure the single settings row exists (same guard as schema.sql).
insert into public.settings (id) values (1) on conflict (id) do nothing;

-- Verification: the returned value should equal 1 (column present).
select 'settings whatsapp column' as check,
       count(*) filter (where column_name = 'whatsapp_url') as has_whatsapp_url
  from information_schema.columns
 where table_schema = 'public' and table_name = 'settings';
