import { listActiveShippingRates } from "@/lib/server/db";
import { handle } from "@/lib/server/http";

export const dynamic = "force-dynamic";

/**
 * GET /api/shipping — public, read-only list of the cities the store currently
 * delivers to, with their shipping price.
 *
 * The admin endpoint (`/api/admin/shipping`) is gated behind an authenticated
 * admin and returns *every* configured rate, including disabled ones. The
 * storefront checkout can't use it (guests have no admin session), so this
 * sibling route exposes only `active === true` rows — exactly what the city
 * picker needs and nothing more. It mirrors the "Public read shipping_rates"
 * RLS policy already declared in supabase/erp-extensions-migration.sql.
 */
export const GET = () => handle(() => listActiveShippingRates());
