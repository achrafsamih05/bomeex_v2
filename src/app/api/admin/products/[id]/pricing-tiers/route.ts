import { NextRequest } from "next/server";
import {
  getProduct,
  listPricingTiers,
  replacePricingTiers,
} from "@/lib/server/db";
import { getCurrentUser } from "@/lib/server/auth";
import { emit } from "@/lib/server/bus";
import { handle, httpError } from "@/lib/server/http";
import { validatePricingTiers } from "@/lib/cart-utils";
import type { ProductPricingTierDraft } from "@/lib/types";

export const dynamic = "force-dynamic";

const MAX_TIERS = 20;
const MAX_QUANTITY = 1_000_000;
const MAX_PRICE = 1_000_000;

async function requireAdmin(): Promise<void> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") httpError(401, "Unauthorized");
}

/**
 * Coerce a raw client tier into a typed draft. `maxQuantity` is normalised to
 * null when blank/empty/omitted (the open-ended top tier); everything else is
 * floored to an integer quantity. Returning a clean shape here means
 * `validatePricingTiers` only ever sees well-typed numbers.
 */
function toDraft(raw: unknown): ProductPricingTierDraft {
  const obj = (raw ?? {}) as {
    minQuantity?: unknown;
    maxQuantity?: unknown;
    pricePerItem?: unknown;
  };
  const min = Math.floor(Number(obj.minQuantity));
  const rawMax = obj.maxQuantity;
  const max =
    rawMax === null || rawMax === undefined || rawMax === ""
      ? null
      : Math.floor(Number(rawMax));
  const price = Number(obj.pricePerItem);
  return {
    minQuantity: Number.isFinite(min) ? min : 0,
    maxQuantity: max !== null && Number.isFinite(max) ? max : max === null ? null : 0,
    pricePerItem: Number.isFinite(price) ? price : -1,
  };
}

// GET /api/admin/products/:id/pricing-tiers — admin only.
export const GET = (
  _req: NextRequest,
  { params }: { params: { id: string } }
) =>
  handle(async () => {
    await requireAdmin();
    const product = await getProduct(params.id);
    if (!product) httpError(404, "Product not found");
    return listPricingTiers(params.id);
  });

// POST /api/admin/products/:id/pricing-tiers — replace the full tier set.
// Body: { tiers: [{ minQuantity, maxQuantity, pricePerItem }, ...] }.
// Server-side validation mirrors the admin grid using the shared validator, so
// an overlapping or malformed payload is rejected even if the UI is bypassed.
export const POST = (
  req: NextRequest,
  { params }: { params: { id: string } }
) =>
  handle(async () => {
    await requireAdmin();

    const product = await getProduct(params.id);
    if (!product) httpError(404, "Product not found");

    const body = (await req.json().catch(() => ({}))) as { tiers?: unknown };
    const rawTiers = Array.isArray(body.tiers) ? body.tiers : [];
    if (rawTiers.length > MAX_TIERS) {
      httpError(400, `A product can have at most ${MAX_TIERS} pricing tiers`);
    }

    const drafts = rawTiers.map(toDraft);

    // Bound-check before structural validation so absurd inputs get a clear
    // message rather than a generic overlap error.
    for (const d of drafts) {
      if (d.minQuantity > MAX_QUANTITY || (d.maxQuantity ?? 0) > MAX_QUANTITY) {
        httpError(400, "Quantities are out of range");
      }
      if (d.pricePerItem > MAX_PRICE) {
        httpError(400, "Price per item is out of range");
      }
    }

    const result = validatePricingTiers(drafts);
    if (!result.valid) {
      httpError(400, result.issues.map((i) => i.message).join(" "));
    }

    const saved = await replacePricingTiers(params.id, drafts);
    // A tier change alters storefront pricing, so notify both channels: the
    // admin grid (pricing) and any open storefront/cart (products).
    emit({ channel: "pricing", action: "updated", id: params.id });
    emit({ channel: "products", action: "updated", id: params.id });
    return saved;
  });
