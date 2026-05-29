import "server-only";
import { getSupabaseAdmin } from "./supabase";
import {
  CATEGORY_COLUMNS,
  CategoryRow,
  EXPENSE_COLUMNS,
  ExpenseRow,
  INVOICE_COLUMNS,
  InvoiceRow,
  ORDER_COLUMNS,
  ORDER_ITEM_COLUMNS,
  OrderItemRow,
  OrderRow,
  PRICING_TIER_COLUMNS,
  PRODUCT_COLUMNS,
  PricingTierRow,
  ProductRow,
  SETTINGS_COLUMNS,
  SHIPPING_RATE_COLUMNS,
  SettingsRow,
  ShippingRateRow,
  USER_COLUMNS,
  UserRow,
  categoryFromRow,
  expenseFromRow,
  invoiceFromRow,
  orderFromRow,
  pricingTierFromRow,
  productFromRow,
  productToRow,
  settingsFromRow,
  settingsToRow,
  shippingRateFromRow,
  shippingRateToRow,
  userFromRow,
  userToRow,
} from "./mappers";
import type {
  Category,
  Expense,
  ExpenseCategory,
  Invoice,
  Order,
  Product,
  ProductPricingTier,
  ProductPricingTierDraft,
  Settings,
  ShippingRate,
  User,
} from "../types";

// ---------------------------------------------------------------------------
// Supabase-backed DB. Every server route reaches the database through this
// module — the export surface (listProducts, createProduct, …) is stable so
// route handlers never change when the underlying storage changes.
//
// Auditing notes (A-Z review, May 2026):
//   - Every call uses the service-role client. Our own auth layer
//     (src/middleware.ts + getCurrentUser) is the single source of truth for
//     authorization. Routing reads through anon would cause RLS to silently
//     filter rows to [] — the exact "empty UI while DB has data" bug.
//   - SELECTs enumerate every multilingual column explicitly
//     (name_en, name_ar, name_fr, description_en, description_ar,
//     description_fr). If a column is renamed or missing, PostgREST returns
//     error code 42703 with the column name — loud, not silent.
//   - raise() logs the full Supabase error (code + message + details + hint)
//     and an empty-result hint fires when a listX() returns 0 rows, so the
//     operator can tell a "no policy" silent empty apart from a legitimate
//     "nothing seeded yet" empty.
// ---------------------------------------------------------------------------

const sb = () => getSupabaseAdmin();

/**
 * Log the full Supabase error (with code/hint/details) to server logs, then
 * throw an Error whose `.message` carries the real cause. Our API routes
 * wrap handlers in `handle()` (src/lib/server/http.ts), which turns thrown
 * errors into clean `{ error: "..." }` JSON responses — so the browser never
 * sees an HTML crash page while we still get full detail server-side.
 */
function raise(op: string, err: unknown): never {
  // eslint-disable-next-line no-console
  console.error(`[db] ${op} failed — Supabase returned:`, err);
  const e = err as {
    message?: string;
    code?: string;
    details?: string;
    hint?: string;
  } | null;
  const parts = [`${op} failed`];
  if (e?.message) parts.push(`— ${e.message}`);
  if (e?.code) parts.push(`(code ${e.code})`);
  if (e?.details) parts.push(`· ${e.details}`);
  if (e?.hint) parts.push(`· hint: ${e.hint}`);
  throw new Error(parts.join(" "));
}

/**
 * Warn once per cold start when a list query returns zero rows. A truly empty
 * table is fine, but when this lines up with an RLS-misconfigured project
 * (see src/lib/server/supabase.ts), the extra log line tells the operator
 * EXACTLY what Supabase returned instead of leaving them to guess.
 */
function warnIfEmpty(op: string, rows: unknown[]) {
  if (!Array.isArray(rows) || rows.length > 0) return;
  // eslint-disable-next-line no-console
  console.warn(
    `[db] ${op} returned 0 rows. If you expect data, verify:\n` +
      `  - SUPABASE_URL points at the right project\n` +
      `  - SUPABASE_SERVICE_ROLE_KEY is set (not just SUPABASE_ANON_KEY)\n` +
      `  - the table was seeded (npm run seed)\n` +
      `  - RLS policies on the table allow this client to read`
  );
}

// ---------- Products -------------------------------------------------------

export async function listProducts(): Promise<Product[]> {
  const { data, error } = await sb()
    .from("products")
    .select(PRODUCT_COLUMNS)
    .order("created_at", { ascending: false });
  if (error) raise("listProducts", error);
  const rows = (data ?? []) as unknown as ProductRow[];
  warnIfEmpty("listProducts", rows);
  const products = rows.map(productFromRow);
  // Batch-load wholesale tiers and attach. Non-fatal on error so a project
  // that hasn't run the ERP migration yet still renders its catalog.
  const tiersByProduct = await loadPricingTiersGrouped(
    products.map((p) => p.id)
  );
  for (const p of products) {
    p.pricingTiers = tiersByProduct.get(p.id) ?? [];
  }
  return products;
}

export async function getProduct(id: string): Promise<Product | null> {
  const { data, error } = await sb()
    .from("products")
    .select(PRODUCT_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) raise("getProduct", error);
  if (!data) return null;
  const product = productFromRow(data as unknown as ProductRow);
  product.pricingTiers = await listPricingTiers(id);
  return product;
}

export async function createProduct(p: Product): Promise<Product> {
  // .select().single() returns the persisted row, so the API replies with
  // what the DB actually stored (and schema errors surface loudly via
  // raise() instead of silently producing a half-written row).
  const { data, error } = await sb()
    .from("products")
    .insert(productToRow(p))
    .select(PRODUCT_COLUMNS)
    .single();
  if (error) raise("createProduct", error);
  return productFromRow(data as unknown as ProductRow);
}

/**
 * Alias kept for callers using the "addProduct" verb. Same contract as
 * createProduct — new product row in Supabase, returns the persisted shape.
 */
export const addProduct = createProduct;

export async function updateProduct(
  id: string,
  patch: Partial<Product>
): Promise<Product | null> {
  const row = productToRow(patch);
  const { data, error } = await sb()
    .from("products")
    .update(row)
    .eq("id", id)
    .select(PRODUCT_COLUMNS)
    .maybeSingle();
  if (error) raise("updateProduct", error);
  return data ? productFromRow(data as unknown as ProductRow) : null;
}

export async function deleteProduct(id: string): Promise<Product | null> {
  const { data, error } = await sb()
    .from("products")
    .delete()
    .eq("id", id)
    .select(PRODUCT_COLUMNS)
    .maybeSingle();
  if (error) raise("deleteProduct", error);
  return data ? productFromRow(data as unknown as ProductRow) : null;
}

/**
 * Generates a globally-unique product id.
 *
 * Replaces the legacy "p-001 / p-002 / …" sequential scheme, which had two
 * real problems:
 *   1. Race conditions — two admins creating products at the same time both
 *      observed the same `count`, and one INSERT crashed on the PK collision.
 *   2. Predictable ids leaked the catalog size (`/api/products/p-042`
 *      told a stranger we have ~42 products).
 *
 * We now use Web Crypto's `randomUUID()` (available in Node ≥ 19 and the
 * Edge runtime) for entropy and base36-encode a slice of it so the id stays
 * compact and URL-friendly. The `prd_` prefix keeps ids self-describing in
 * logs and decouples this from `p-…` legacy rows so old data still resolves.
 *
 * Format: `prd_<10 chars of base36>` (e.g. `prd_2k4f8h3a9z`). 36^10 ≈ 3.6e15,
 * which is comfortably collision-resistant for any realistic catalog size.
 *
 * The function is async to keep the call sites (which already `await
 * nextProductId()`) unchanged — no migration needed in route handlers.
 */
export async function nextProductId(): Promise<string> {
  // crypto.randomUUID() returns a hex string with hyphens, e.g.
  //   "1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed"
  // We strip the hyphens, parse a slice as a hex int, and re-encode in
  // base36 for a shorter, lowercase-letter+digit id.
  const raw = crypto.randomUUID().replace(/-/g, "");
  // Use 12 hex chars (48 bits, ~2.8e14) to keep base36 output around 10
  // chars. BigInt avoids the 2^53 precision ceiling of Number.parseInt.
  const slug = BigInt("0x" + raw.slice(0, 12)).toString(36).padStart(10, "0");
  return `prd_${slug}`;
}

// ---------- Categories -----------------------------------------------------

export async function listCategories(): Promise<Category[]> {
  const { data, error } = await sb()
    .from("categories")
    .select(CATEGORY_COLUMNS)
    .order("slug");
  if (error) raise("listCategories", error);
  const rows = (data ?? []) as unknown as CategoryRow[];
  warnIfEmpty("listCategories", rows);
  return rows.map(categoryFromRow);
}

export async function getCategory(id: string): Promise<Category | null> {
  const { data, error } = await sb()
    .from("categories")
    .select(CATEGORY_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) raise("getCategory", error);
  return data ? categoryFromRow(data as unknown as CategoryRow) : null;
}

export async function createCategory(c: Category): Promise<Category> {
  const row = {
    id: c.id,
    slug: c.slug,
    name_en: c.name.en,
    name_ar: c.name.ar,
    name_fr: c.name.fr,
    icon: c.icon,
  };
  const { data, error } = await sb()
    .from("categories")
    .insert(row)
    .select(CATEGORY_COLUMNS)
    .single();
  if (error) raise("createCategory", error);
  return categoryFromRow(data as unknown as CategoryRow);
}

export async function deleteCategory(id: string): Promise<Category | null> {
  const { data, error } = await sb()
    .from("categories")
    .delete()
    .eq("id", id)
    .select(CATEGORY_COLUMNS)
    .maybeSingle();
  if (error) raise("deleteCategory", error);
  return data ? categoryFromRow(data as unknown as CategoryRow) : null;
}

/**
 * Categories use human-readable ids like `c-<slug>`. Slugs are unique, so
 * this naturally avoids collisions — we only fall back to a numeric suffix
 * if the caller asks for an id and the slug-based one already exists.
 */
export async function nextCategoryId(slug: string): Promise<string> {
  const base = `c-${slug}`;
  const existing = await getCategory(base);
  if (!existing) return base;
  // Slug already used — append a short suffix.
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${base}-${suffix}`;
}

// ---------- Orders ---------------------------------------------------------

async function loadAllOrderItems(orderIds: string[]): Promise<OrderItemRow[]> {
  if (orderIds.length === 0) return [];
  const { data, error } = await sb()
    .from("order_items")
    .select(ORDER_ITEM_COLUMNS)
    .in("order_id", orderIds);
  if (error) raise("loadAllOrderItems", error);
  return (data ?? []) as unknown as OrderItemRow[];
}

export async function listOrders(): Promise<Order[]> {
  const { data, error } = await sb()
    .from("orders")
    .select(ORDER_COLUMNS)
    .order("created_at", { ascending: false });
  if (error) raise("listOrders", error);
  const rows = (data ?? []) as unknown as OrderRow[];
  const items = await loadAllOrderItems(rows.map((r) => r.id));
  return rows.map((r) => orderFromRow(r, items));
}

export async function getOrder(id: string): Promise<Order | null> {
  const { data, error } = await sb()
    .from("orders")
    .select(ORDER_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) raise("getOrder", error);
  if (!data) return null;
  const items = await loadAllOrderItems([id]);
  return orderFromRow(data as unknown as OrderRow, items);
}

/**
 * Creates the order row AND its order_items in a two-step sequence with
 * best-effort rollback on the items insert. Supabase doesn't expose true
 * transactions over PostgREST — for a stronger guarantee, wrap this in a
 * Postgres function and call it via `rpc("place_order", …)`.
 */
export async function createOrder(o: Order): Promise<void> {
  const orderRow: Omit<OrderRow, "id"> & { id: string } = {
    id: o.id,
    user_id: o.userId ?? null,
    customer_name: o.customer.name,
    customer_email: o.customer.email || null,
    customer_phone: o.customer.phone,
    customer_address: o.customer.address,
    subtotal: o.subtotal,
    tax: o.tax,
    total: o.total,
    status: o.status,
    created_at: o.createdAt,
  };

  const { error: orderErr } = await sb().from("orders").insert(orderRow);
  if (orderErr) raise("createOrder (orders insert)", orderErr);

  if (o.items.length > 0) {
    const itemRows = o.items.map<OrderItemRow>((i) => ({
      order_id: o.id,
      product_id: i.productId,
      name: i.name,
      quantity: i.quantity,
      price: i.price,
    }));
    const { error: itemsErr } = await sb().from("order_items").insert(itemRows);
    if (itemsErr) {
      // Best-effort rollback so we don't leave a dangling empty order.
      await sb().from("orders").delete().eq("id", o.id);
      raise("createOrder (order_items insert)", itemsErr);
    }
  }
}

export async function updateOrder(
  id: string,
  patch: Partial<Order>
): Promise<Order | null> {
  const row: Partial<OrderRow> = {};
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.customer) {
    row.customer_name = patch.customer.name;
    row.customer_email = patch.customer.email || null;
    row.customer_phone = patch.customer.phone;
    row.customer_address = patch.customer.address;
  }
  // Allow admins to edit money fields directly when they reprice an order.
  // Validation lives in the API route — db.ts only persists what it's given.
  if (patch.subtotal !== undefined) row.subtotal = patch.subtotal;
  if (patch.tax !== undefined) row.tax = patch.tax;
  if (patch.total !== undefined) row.total = patch.total;

  // No row mutations and no items change → just hand back the current order.
  if (Object.keys(row).length === 0 && patch.items === undefined) {
    return getOrder(id);
  }

  if (Object.keys(row).length > 0) {
    const { error } = await sb()
      .from("orders")
      .update(row)
      .eq("id", id);
    if (error) raise("updateOrder", error);
  }

  // Items replacement strategy: delete-then-insert. We could diff and
  // surgically update individual rows, but the order edit UI is admin-only
  // and orders rarely have more than ~20 items, so a full replace is
  // simpler and removes any chance of leaving orphaned rows. The
  // surrounding ON DELETE CASCADE on order_items.order_id makes this safe.
  if (patch.items !== undefined) {
    const { error: delErr } = await sb()
      .from("order_items")
      .delete()
      .eq("order_id", id);
    if (delErr) raise("updateOrder (delete items)", delErr);

    if (patch.items.length > 0) {
      const itemRows = patch.items.map<OrderItemRow>((i) => ({
        order_id: id,
        product_id: i.productId,
        name: i.name,
        quantity: i.quantity,
        price: i.price,
      }));
      const { error: insErr } = await sb().from("order_items").insert(itemRows);
      if (insErr) raise("updateOrder (insert items)", insErr);
    }
  }

  // Always re-fetch after a mutation so callers get the canonical persisted
  // shape (including any DB-side defaults that fired).
  return getOrder(id);
}

export async function nextOrderId(): Promise<string> {
  const { count, error } = await sb()
    .from("orders")
    .select("id", { count: "exact", head: true });
  if (error) raise("nextOrderId", error);
  const n = 1000 + (count ?? 0) + 1;
  return `o-${n}`;
}

// ---------- Invoices -------------------------------------------------------

export async function listInvoices(): Promise<Invoice[]> {
  const { data, error } = await sb()
    .from("invoices")
    .select(INVOICE_COLUMNS)
    .order("issued_at", { ascending: false });
  if (error) raise("listInvoices", error);
  return ((data ?? []) as unknown as InvoiceRow[]).map(invoiceFromRow);
}

export async function getInvoice(id: string): Promise<Invoice | null> {
  const { data, error } = await sb()
    .from("invoices")
    .select(INVOICE_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) raise("getInvoice", error);
  return data ? invoiceFromRow(data as unknown as InvoiceRow) : null;
}

export async function createInvoice(inv: Invoice): Promise<void> {
  const { error } = await sb().from("invoices").insert({
    id: inv.id,
    order_id: inv.orderId,
    number: inv.number,
    issued_at: inv.issuedAt,
    due_at: inv.dueAt,
    status: inv.status,
    amount: inv.amount,
  });
  if (error) raise("createInvoice", error);
}

export async function updateInvoice(
  id: string,
  patch: Partial<Invoice>
): Promise<Invoice | null> {
  const row: Partial<InvoiceRow> = {};
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.amount !== undefined) row.amount = patch.amount;
  if (patch.dueAt !== undefined) row.due_at = patch.dueAt;
  if (patch.number !== undefined) row.number = patch.number;

  const { data, error } = await sb()
    .from("invoices")
    .update(row)
    .eq("id", id)
    .select(INVOICE_COLUMNS)
    .maybeSingle();
  if (error) raise("updateInvoice", error);
  return data ? invoiceFromRow(data as unknown as InvoiceRow) : null;
}

export async function nextInvoiceId(): Promise<string> {
  const { count, error } = await sb()
    .from("invoices")
    .select("id", { count: "exact", head: true });
  if (error) raise("nextInvoiceId", error);
  const n = 5000 + (count ?? 0) + 1;
  return `i-${n}`;
}

// ---------- Users ----------------------------------------------------------

export async function listUsers(): Promise<User[]> {
  const { data, error } = await sb()
    .from("users")
    .select(USER_COLUMNS)
    .order("created_at", { ascending: false });
  if (error) raise("listUsers", error);
  return ((data ?? []) as unknown as UserRow[]).map(userFromRow);
}

export async function getUserById(id: string): Promise<User | null> {
  const { data, error } = await sb()
    .from("users")
    .select(USER_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) raise("getUserById", error);
  return data ? userFromRow(data as unknown as UserRow) : null;
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const e = email.toLowerCase().trim();
  const { data, error } = await sb()
    .from("users")
    .select(USER_COLUMNS)
    .ilike("email", e)
    .maybeSingle();
  if (error) raise("getUserByEmail", error);
  return data ? userFromRow(data as unknown as UserRow) : null;
}

export async function createUser(u: User): Promise<User> {
  // Build a MINIMAL insert payload. We only send the columns that are
  // absolutely required to create a working account, and we let Postgres
  // defaults fill in the rest (created_at, banned = false, last_seen_at = null).
  //
  // Why not just .insert(userToRow(u))?
  //   - If a column in the schema is renamed / dropped / added, sending the
  //     full row breaks registration until someone edits this file. Sending
  //     only the required columns keeps registration resilient.
  //   - The real column name for shipping fields is whatever the schema
  //     declares — we pass them only if the user supplied them and let the DB
  //     reject any that don't exist with a clear error (surfaced via raise()).
  const required: Record<string, unknown> = {
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    password_hash: u.passwordHash,
  };

  // Optional shipping-profile columns. We only include keys the caller gave
  // us, so a schema that doesn't have e.g. `postal_code` won't cause Supabase
  // to reject the insert for sending `postal_code: null`.
  const optional: Record<string, unknown> = {};
  if (u.phone !== undefined) optional.phone = u.phone;
  if (u.address !== undefined) optional.address = u.address;
  if (u.city !== undefined) optional.city = u.city;
  if (u.postalCode !== undefined) optional.postal_code = u.postalCode;
  if (u.country !== undefined) optional.country = u.country;

  const payload = { ...required, ...optional };

  const { data, error } = await sb()
    .from("users")
    .insert(payload)
    .select(USER_COLUMNS)
    .single();
  if (error) raise("createUser", error);
  return userFromRow(data as unknown as UserRow);
}

export async function updateUser(
  id: string,
  patch: Partial<User>
): Promise<User | null> {
  const row = userToRow(patch);
  const { data, error } = await sb()
    .from("users")
    .update(row)
    .eq("id", id)
    .select(USER_COLUMNS)
    .maybeSingle();
  if (error) raise("updateUser", error);
  return data ? userFromRow(data as unknown as UserRow) : null;
}

export async function deleteUser(id: string): Promise<User | null> {
  const { data, error } = await sb()
    .from("users")
    .delete()
    .eq("id", id)
    .select(USER_COLUMNS)
    .maybeSingle();
  if (error) raise("deleteUser", error);
  return data ? userFromRow(data as unknown as UserRow) : null;
}

// ---------- Settings -------------------------------------------------------
//
// The settings table is a single-row store keyed on `id = 1`.

const SETTINGS_ID = 1;

export async function getSettings(): Promise<Settings> {
  const { data, error } = await sb()
    .from("settings")
    .select(SETTINGS_COLUMNS)
    .eq("id", SETTINGS_ID)
    .maybeSingle();
  if (error) raise("getSettings", error);
  if (!data) {
    // Settings row should exist (seeded). If missing (fresh DB), return sane
    // defaults so the storefront can still render.
    return {
      storeName: "Nova",
      currency: "USD",
      taxRate: 10,
      lowStockThreshold: 20,
      contactEmail: "",
      contactPhone: "",
      address: "",
      footerTagline: "",
      facebookUrl: "",
      instagramUrl: "",
      twitterUrl: "",
      youtubeUrl: "",
      linkedinUrl: "",
      tiktokUrl: "",
    };
  }
  return settingsFromRow(data as unknown as SettingsRow);
}

export async function updateSettings(
  patch: Partial<Settings>
): Promise<Settings> {
  const row = settingsToRow(patch);
  const { data, error } = await sb()
    .from("settings")
    .update(row)
    .eq("id", SETTINGS_ID)
    .select(SETTINGS_COLUMNS)
    .maybeSingle();
  if (error) raise("updateSettings", error);
  if (!data) {
    // Upsert if the single row is missing.
    const defaults = {
      id: SETTINGS_ID,
      store_name: "Nova",
      currency: "USD",
      tax_rate: 10,
      low_stock_threshold: 20,
      ...row,
    };
    const upsert = await sb()
      .from("settings")
      .upsert(defaults)
      .select(SETTINGS_COLUMNS)
      .single();
    if (upsert.error) raise("updateSettings (upsert)", upsert.error);
    return settingsFromRow(upsert.data as unknown as SettingsRow);
  }
  return settingsFromRow(data as unknown as SettingsRow);
}


// ---------------------------------------------------------------------------
// ID generators for the ERP extension tables. Same crypto-random base36 scheme
// as nextProductId() — compact, URL-safe, collision-resistant, and prefixed so
// ids are self-describing in logs.
// ---------------------------------------------------------------------------

function randomId(prefix: string): string {
  const raw = crypto.randomUUID().replace(/-/g, "");
  const slug = BigInt("0x" + raw.slice(0, 12)).toString(36).padStart(10, "0");
  return `${prefix}_${slug}`;
}

// ---------- Shipping rates -------------------------------------------------

export async function listShippingRates(): Promise<ShippingRate[]> {
  const { data, error } = await sb()
    .from("shipping_rates")
    .select(SHIPPING_RATE_COLUMNS)
    .order("city", { ascending: true });
  if (error) raise("listShippingRates", error);
  return ((data ?? []) as unknown as ShippingRateRow[]).map(shippingRateFromRow);
}

export async function getShippingRateByCity(
  city: string
): Promise<ShippingRate | null> {
  const { data, error } = await sb()
    .from("shipping_rates")
    .select(SHIPPING_RATE_COLUMNS)
    .ilike("city", city.trim())
    .maybeSingle();
  if (error) raise("getShippingRateByCity", error);
  return data ? shippingRateFromRow(data as unknown as ShippingRateRow) : null;
}

/**
 * Create-or-update a city's shipping rate. The unique `city` constraint makes
 * this a natural upsert keyed on the (case-normalised) city name, so the admin
 * form can use a single "save" action whether the city is new or existing.
 * `updated_at` is always refreshed so the admin table can surface staleness.
 */
export async function upsertShippingRate(input: {
  city: string;
  price: number;
  active?: boolean;
}): Promise<ShippingRate> {
  const existing = await getShippingRateByCity(input.city);
  const now = new Date().toISOString();

  if (existing) {
    const patch = shippingRateToRow({
      price: input.price,
      active: input.active ?? existing.active,
      city: input.city.trim(),
      updatedAt: now,
    });
    const { data, error } = await sb()
      .from("shipping_rates")
      .update(patch)
      .eq("id", existing.id)
      .select(SHIPPING_RATE_COLUMNS)
      .single();
    if (error) raise("upsertShippingRate (update)", error);
    return shippingRateFromRow(data as unknown as ShippingRateRow);
  }

  const row = shippingRateToRow({
    id: randomId("shr"),
    city: input.city.trim(),
    price: input.price,
    active: input.active ?? true,
    createdAt: now,
    updatedAt: now,
  });
  const { data, error } = await sb()
    .from("shipping_rates")
    .insert(row)
    .select(SHIPPING_RATE_COLUMNS)
    .single();
  if (error) raise("upsertShippingRate (insert)", error);
  return shippingRateFromRow(data as unknown as ShippingRateRow);
}

export async function deleteShippingRate(
  id: string
): Promise<ShippingRate | null> {
  const { data, error } = await sb()
    .from("shipping_rates")
    .delete()
    .eq("id", id)
    .select(SHIPPING_RATE_COLUMNS)
    .maybeSingle();
  if (error) raise("deleteShippingRate", error);
  return data ? shippingRateFromRow(data as unknown as ShippingRateRow) : null;
}

// ---------- Wallet + expenses ----------------------------------------------

/**
 * Reads the live wallet balance off the single store-profile row. The wallet
 * is mutated exclusively by the `expenses_apply_wallet` and
 * `invoices_apply_wallet` DB triggers (see the ERP migration), so this is a
 * pure read — the API never writes the balance directly.
 */
export async function getWalletBalance(): Promise<number> {
  const { data, error } = await sb()
    .from("settings")
    .select("wallet_balance")
    .eq("id", 1)
    .maybeSingle();
  if (error) raise("getWalletBalance", error);
  const raw = (data as { wallet_balance?: number | string } | null)
    ?.wallet_balance;
  const n = typeof raw === "number" ? raw : Number(raw);
  return Number.isFinite(n) ? n : 0;
}

export async function listExpenses(): Promise<Expense[]> {
  const { data, error } = await sb()
    .from("expenses")
    .select(EXPENSE_COLUMNS)
    .order("created_at", { ascending: false });
  if (error) raise("listExpenses", error);
  return ((data ?? []) as unknown as ExpenseRow[]).map(expenseFromRow);
}

/**
 * Inserts an expense row. We intentionally do NOT touch `wallet_balance` here:
 * the `expenses_apply_wallet` AFTER INSERT trigger debits it atomically in the
 * same transaction, which is the single source of truth the task requires.
 */
export async function createExpense(input: {
  title: string;
  category: ExpenseCategory;
  amount: number;
  description: string;
}): Promise<Expense> {
  const row = {
    id: randomId("exp"),
    title: input.title,
    category: input.category,
    amount: input.amount,
    description: input.description,
    created_at: new Date().toISOString(),
  };
  const { data, error } = await sb()
    .from("expenses")
    .insert(row)
    .select(EXPENSE_COLUMNS)
    .single();
  if (error) raise("createExpense", error);
  return expenseFromRow(data as unknown as ExpenseRow);
}

export async function deleteExpense(id: string): Promise<Expense | null> {
  const { data, error } = await sb()
    .from("expenses")
    .delete()
    .eq("id", id)
    .select(EXPENSE_COLUMNS)
    .maybeSingle();
  if (error) raise("deleteExpense", error);
  return data ? expenseFromRow(data as unknown as ExpenseRow) : null;
}

// ---------- Product pricing tiers ------------------------------------------

let pricingTiersWarned = false;

/**
 * Batch-load tiers for many products at once, grouped by product id and sorted
 * by `min_quantity`. Resilient by design: if the `product_pricing_tiers` table
 * doesn't exist yet (ERP migration not run) or the read fails for any reason,
 * we log once and return an empty map so the public catalog keeps rendering.
 * Wholesale tiers are an enhancement — their absence must never blank a page.
 */
async function loadPricingTiersGrouped(
  productIds: string[]
): Promise<Map<string, ProductPricingTier[]>> {
  const grouped = new Map<string, ProductPricingTier[]>();
  if (productIds.length === 0) return grouped;
  try {
    const { data, error } = await sb()
      .from("product_pricing_tiers")
      .select(PRICING_TIER_COLUMNS)
      .in("product_id", productIds)
      .order("min_quantity", { ascending: true });
    if (error) throw error;
    for (const row of (data ?? []) as unknown as PricingTierRow[]) {
      const tier = pricingTierFromRow(row);
      const list = grouped.get(tier.productId) ?? [];
      list.push(tier);
      grouped.set(tier.productId, list);
    }
  } catch (err) {
    if (!pricingTiersWarned) {
      pricingTiersWarned = true;
      // eslint-disable-next-line no-console
      console.warn(
        "[db] product_pricing_tiers read failed — tiers will be empty. " +
          "Run supabase/erp-extensions-migration.sql to enable volume pricing.",
        err
      );
    }
  }
  return grouped;
}

export async function listPricingTiers(
  productId: string
): Promise<ProductPricingTier[]> {
  const grouped = await loadPricingTiersGrouped([productId]);
  return grouped.get(productId) ?? [];
}

/**
 * Replace the entire tier set for a product (delete-then-insert), mirroring the
 * order-items replacement strategy used by `updateOrder`. The whole set is
 * small and admin-only, so a full replace is simpler than diffing and removes
 * any chance of orphaned rows. Validation (overlaps, min<max) is enforced in
 * the API route via `validatePricingTiers` before this runs.
 */
export async function replacePricingTiers(
  productId: string,
  tiers: ProductPricingTierDraft[]
): Promise<ProductPricingTier[]> {
  const { error: delErr } = await sb()
    .from("product_pricing_tiers")
    .delete()
    .eq("product_id", productId);
  if (delErr) raise("replacePricingTiers (delete)", delErr);

  if (tiers.length > 0) {
    const rows = tiers.map((t) => ({
      id: randomId("tier"),
      product_id: productId,
      min_quantity: t.minQuantity,
      max_quantity: t.maxQuantity,
      price_per_item: t.pricePerItem,
      created_at: new Date().toISOString(),
    }));
    const { error: insErr } = await sb()
      .from("product_pricing_tiers")
      .insert(rows);
    if (insErr) raise("replacePricingTiers (insert)", insErr);
  }

  return listPricingTiers(productId);
}
