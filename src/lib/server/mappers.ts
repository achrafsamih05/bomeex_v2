import type {
  Category,
  Invoice,
  LocalizedString,
  Order,
  OrderStatus,
  Product,
  Settings,
  User,
} from "../types";

// ---------------------------------------------------------------------------
// Supabase ↔ domain-type mappers.
//
// Supabase tables use snake_case, and the localized strings are three
// separate columns (name_en / name_ar / name_fr) — this matches the schema
// the user pasted in the audit brief and supabase/schema.sql.
//
// These mappers convert between that shape and the camelCase,
// LocalizedString shape the rest of the app uses.
//
// KEY INVARIANT: a mapper must never crash on a row that came back from
// Supabase. Missing locales, null images, legacy numeric strings — every
// case falls back to a sane, renderable default. This is the final line
// of defense before data hits the UI.
// ---------------------------------------------------------------------------

// ============================================================================
// Column-list constants.
//
// db.ts imports these and passes them to .select(...) so every query
// enumerates its columns explicitly. Result:
//   - If a column is missing from the DB, PostgREST raises 42703 with the
//     column name. No more "data in DB, empty UI, no errors" silent drift.
//   - The multilingual columns (name_en, name_ar, name_fr) are always
//     requested by name, satisfying the audit requirement that every SELECT
//     use the real schema names.
// ============================================================================

export const PRODUCT_COLUMNS =
  "id, sku, name_en, name_ar, name_fr, description_en, description_ar, description_fr, " +
  "price, category_id, stock, image, rating, created_at";

export const CATEGORY_COLUMNS =
  "id, slug, name_en, name_ar, name_fr, icon";

export const USER_COLUMNS =
  "id, email, name, role, phone, address, city, postal_code, country, " +
  "banned, password_hash, created_at, last_seen_at";

export const ORDER_COLUMNS =
  "id, user_id, customer_name, customer_email, customer_phone, customer_address, " +
  "subtotal, tax, total, status, created_at";

export const ORDER_ITEM_COLUMNS =
  "id, order_id, product_id, name, quantity, price";

export const INVOICE_COLUMNS =
  "id, order_id, number, issued_at, due_at, status, amount";

export const SETTINGS_COLUMNS =
  "id, store_name, currency, tax_rate, low_stock_threshold";

// ============================================================================
// Small utilities
// ============================================================================

/**
 * Coerce whatever Supabase hands us (string / number / null) into a finite
 * number. Supabase returns numeric columns as either a JS number or a string
 * depending on size; we normalise so downstream `.toFixed()` etc. never
 * crashes on a string, and a null/NaN becomes the fallback.
 */
function num(value: unknown, fallback = 0): number {
  if (value === null || value === undefined) return fallback;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/** Return the first non-empty string from the candidates, or "". */
function firstNonEmpty(...values: Array<string | null | undefined>): string {
  for (const v of values) {
    if (typeof v === "string" && v.trim().length > 0) return v;
  }
  return "";
}

/**
 * Build a LocalizedString safely.
 *
 * Why fallbacks matter: if `name_ar` is NULL in the DB (or the seed script
 * forgot it), the Arabic storefront renders an empty product name — a
 * silent UX bug. Instead we cascade:
 *   ar → fr → en → "Untitled"  (for Arabic)
 *   fr → en → ar → "Untitled"  (for French)
 *   en → fr → ar → "Untitled"  (for English)
 *
 * The optional `fallback` is used only when every locale is empty; the
 * caller passes something like "Untitled product" for names and "" for
 * descriptions.
 */
function pickLocalized(
  en: string | null | undefined,
  ar: string | null | undefined,
  fr: string | null | undefined,
  fallback = ""
): LocalizedString {
  const anyValue = firstNonEmpty(en, fr, ar) || fallback;
  return {
    en: firstNonEmpty(en, fr, ar, fallback),
    ar: firstNonEmpty(ar, en, fr, fallback),
    fr: firstNonEmpty(fr, en, ar, fallback),
    // ensure no field is ever the empty string if we had any source value
  };
  // `anyValue` is retained above purely for readability — the firstNonEmpty
  // chain is what builds the actual return shape.
  void anyValue;
}

// Placeholder image used only when `products.image` is NULL. Keeps Next's
// <Image> from throwing on an empty src and leaves an obvious visual marker
// for the admin that this row needs attention.
const PLACEHOLDER_IMAGE =
  "https://picsum.photos/seed/nova-missing/800/800";

// ============================================================================
// Product
// ============================================================================

export interface ProductRow {
  id: string;
  sku: string;
  name_en: string | null;
  name_ar: string | null;
  name_fr: string | null;
  description_en: string | null;
  description_ar: string | null;
  description_fr: string | null;
  price: number | string;
  category_id: string;
  stock: number | string;
  image: string | null;
  rating: number | string | null;
  created_at: string;
}

export function productFromRow(r: ProductRow): Product {
  return {
    id: r.id,
    sku: r.sku,
    name: pickLocalized(r.name_en, r.name_ar, r.name_fr, "Untitled product"),
    description: pickLocalized(
      r.description_en,
      r.description_ar,
      r.description_fr,
      ""
    ),
    price: num(r.price),
    categoryId: r.category_id,
    stock: num(r.stock),
    image: firstNonEmpty(r.image) || PLACEHOLDER_IMAGE,
    rating: Math.max(0, Math.min(5, num(r.rating, 0))),
    createdAt: r.created_at,
  };
}

export function productToRow(p: Partial<Product>): Partial<ProductRow> {
  const row: Partial<ProductRow> = {};
  if (p.id !== undefined) row.id = p.id;
  if (p.sku !== undefined) row.sku = p.sku;
  if (p.name) {
    // Fill blanks with the EN value before writing so we never persist a
    // NULL translation that would force future fallbacks.
    const fallback = firstNonEmpty(p.name.en, p.name.fr, p.name.ar);
    row.name_en = p.name.en || fallback;
    row.name_ar = p.name.ar || fallback;
    row.name_fr = p.name.fr || fallback;
  }
  if (p.description) {
    row.description_en = p.description.en ?? "";
    row.description_ar = p.description.ar ?? "";
    row.description_fr = p.description.fr ?? "";
  }
  if (p.price !== undefined) row.price = p.price;
  if (p.categoryId !== undefined) row.category_id = p.categoryId;
  if (p.stock !== undefined) row.stock = p.stock;
  if (p.image !== undefined) row.image = p.image;
  if (p.rating !== undefined) row.rating = p.rating;
  if (p.createdAt !== undefined) row.created_at = p.createdAt;
  return row;
}

// ============================================================================
// Category
// ============================================================================

export interface CategoryRow {
  id: string;
  slug: string;
  name_en: string | null;
  name_ar: string | null;
  name_fr: string | null;
  icon: string | null;
}

export function categoryFromRow(r: CategoryRow): Category {
  return {
    id: r.id,
    slug: r.slug,
    name: pickLocalized(r.name_en, r.name_ar, r.name_fr, r.slug),
    // If the icon column is NULL/empty, fall back to a generic grid glyph so
    // CategoryChips still renders instead of crashing on an unknown name.
    icon: firstNonEmpty(r.icon) || "LayoutGrid",
  };
}

// ============================================================================
// User
// ============================================================================

export interface UserRow {
  id: string;
  email: string;
  name: string;
  role: "customer" | "admin";
  phone: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  country: string | null;
  banned: boolean;
  password_hash: string;
  created_at: string;
  last_seen_at: string | null;
}

export function userFromRow(r: UserRow): User {
  return {
    id: r.id,
    email: r.email,
    name: r.name,
    role: r.role,
    phone: r.phone ?? undefined,
    address: r.address ?? undefined,
    city: r.city ?? undefined,
    postalCode: r.postal_code ?? undefined,
    country: r.country ?? undefined,
    banned: !!r.banned,
    passwordHash: r.password_hash,
    createdAt: r.created_at,
    lastSeenAt: r.last_seen_at ?? undefined,
  };
}

export function userToRow(u: Partial<User>): Partial<UserRow> {
  const row: Partial<UserRow> = {};
  if (u.id !== undefined) row.id = u.id;
  if (u.email !== undefined) row.email = u.email;
  if (u.name !== undefined) row.name = u.name;
  if (u.role !== undefined) row.role = u.role;
  if (u.phone !== undefined) row.phone = u.phone ?? null;
  if (u.address !== undefined) row.address = u.address ?? null;
  if (u.city !== undefined) row.city = u.city ?? null;
  if (u.postalCode !== undefined) row.postal_code = u.postalCode ?? null;
  if (u.country !== undefined) row.country = u.country ?? null;
  if (u.banned !== undefined) row.banned = u.banned;
  if (u.passwordHash !== undefined) row.password_hash = u.passwordHash;
  if (u.createdAt !== undefined) row.created_at = u.createdAt;
  if (u.lastSeenAt !== undefined) row.last_seen_at = u.lastSeenAt ?? null;
  return row;
}

// ============================================================================
// Order + order_items
// ============================================================================

export interface OrderRow {
  id: string;
  user_id: string | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  customer_address: string;
  subtotal: number | string;
  tax: number | string;
  total: number | string;
  status: OrderStatus;
  created_at: string;
}

export interface OrderItemRow {
  id?: number;
  order_id: string;
  product_id: string;
  name: string;
  quantity: number | string;
  price: number | string;
}

export function orderFromRow(r: OrderRow, items: OrderItemRow[]): Order {
  return {
    id: r.id,
    userId: r.user_id ?? undefined,
    customer: {
      name: r.customer_name,
      email: r.customer_email,
      phone: r.customer_phone ?? "",
      address: r.customer_address,
    },
    items: items
      .filter((i) => i.order_id === r.id)
      .map((i) => ({
        productId: i.product_id,
        name: i.name,
        quantity: num(i.quantity),
        price: num(i.price),
      })),
    subtotal: num(r.subtotal),
    tax: num(r.tax),
    total: num(r.total),
    status: r.status,
    createdAt: r.created_at,
  };
}

// ============================================================================
// Invoice
// ============================================================================

export interface InvoiceRow {
  id: string;
  order_id: string;
  number: string;
  issued_at: string;
  due_at: string;
  status: Invoice["status"];
  amount: number | string;
}

export function invoiceFromRow(r: InvoiceRow): Invoice {
  return {
    id: r.id,
    orderId: r.order_id,
    number: r.number,
    issuedAt: r.issued_at,
    dueAt: r.due_at,
    status: r.status,
    amount: num(r.amount),
  };
}

// ============================================================================
// Settings
// ============================================================================

export interface SettingsRow {
  id: number;
  store_name: string;
  currency: string;
  tax_rate: number | string;
  low_stock_threshold: number | string;
}

export function settingsFromRow(r: SettingsRow): Settings {
  return {
    storeName: r.store_name,
    currency: r.currency,
    taxRate: num(r.tax_rate, 10),
    lowStockThreshold: num(r.low_stock_threshold, 20),
  };
}

export function settingsToRow(s: Partial<Settings>): Partial<SettingsRow> {
  const row: Partial<SettingsRow> = {};
  if (s.storeName !== undefined) row.store_name = s.storeName;
  if (s.currency !== undefined) row.currency = s.currency;
  if (s.taxRate !== undefined) row.tax_rate = s.taxRate;
  if (s.lowStockThreshold !== undefined)
    row.low_stock_threshold = s.lowStockThreshold;
  return row;
}
