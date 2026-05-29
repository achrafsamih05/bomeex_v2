// ---------------------------------------------------------------------------
// Cart / wholesale pricing logic.
//
// Pure, dependency-free functions shared by BOTH the browser (cart drawer,
// checkout, the admin pricing grid) and the server (the pricing-tiers API
// route validates with the exact same code). Keeping this module free of
// "use client" / "server-only" is deliberate — it is the single source of
// truth for how a quantity maps to an effective unit price, so the price the
// customer sees and the price the server persists can never drift.
// ---------------------------------------------------------------------------

import type {
  Product,
  ProductPricingTier,
  ProductPricingTierDraft,
} from "./types";

/** A product just needs a retail `price` for effective-price math. */
type PricedProduct = Pick<Product, "price">;

/** Either a persisted tier or an unsaved draft — both expose the range. */
type TierLike = Pick<
  ProductPricingTier,
  "minQuantity" | "maxQuantity" | "pricePerItem"
>;

export interface EffectivePrice {
  /** Unit price actually charged after applying any matching wholesale tier. */
  unitPrice: number;
  /** The product's retail unit price, kept for "you saved X" comparisons. */
  retailUnitPrice: number;
  /** unitPrice × quantity. */
  lineTotal: number;
  /** retailUnitPrice × quantity (what it would have cost at retail). */
  retailLineTotal: number;
  /** retailLineTotal − lineTotal, clamped to ≥ 0. */
  savings: number;
  /** True when a wholesale tier was applied (unit price came from a tier). */
  isWholesale: boolean;
  /** The tier that was applied, or null when charging retail. */
  appliedTier: ProductPricingTier | null;
}

export interface TierIssue {
  /** Index of the offending tier, or null for a cross-tier (global) issue. */
  index: number | null;
  message: string;
}

export interface TierValidationResult {
  valid: boolean;
  issues: TierIssue[];
}

/**
 * Treat an open-ended tier (`maxQuantity === null`) as reaching to infinity so
 * range math is uniform. Used internally by matching + overlap detection.
 */
function upperBound(tier: TierLike): number {
  return tier.maxQuantity === null ? Number.POSITIVE_INFINITY : tier.maxQuantity;
}

/**
 * Return a copy of the tiers sorted ascending by `minQuantity` (then by upper
 * bound). Sorting is stable and non-mutating so callers keep their input.
 */
export function sortTiers<T extends TierLike>(tiers: readonly T[]): T[] {
  return [...tiers].sort((a, b) => {
    if (a.minQuantity !== b.minQuantity) return a.minQuantity - b.minQuantity;
    return upperBound(a) - upperBound(b);
  });
}

/**
 * Find the wholesale tier that applies to `quantity`, or null if none does.
 *
 * A tier matches when `minQuantity <= quantity <= maxQuantity` (an open-ended
 * tier matches any `quantity >= minQuantity`). In a validated, non-overlapping
 * configuration exactly one tier can match; if a misconfiguration produces
 * several, we return the one with the LOWEST unit price so the customer is
 * never overcharged by ambiguous data.
 */
export function findApplicableTier(
  quantity: number,
  tiers: readonly ProductPricingTier[]
): ProductPricingTier | null {
  if (!Number.isFinite(quantity) || quantity <= 0) return null;
  let best: ProductPricingTier | null = null;
  for (const tier of tiers) {
    const inRange =
      quantity >= tier.minQuantity && quantity <= upperBound(tier);
    if (!inRange) continue;
    if (best === null || tier.pricePerItem < best.pricePerItem) {
      best = tier;
    }
  }
  return best;
}

/**
 * Compute the effective unit/line price for a cart item, dropping the unit
 * price from retail to the wholesale tier price whenever the quantity lands in
 * a configured slab.
 *
 * @param product  Anything carrying a retail `price`.
 * @param quantity The cart line quantity.
 * @param tiers    The product's wholesale price breaks (defaults to none).
 */
export function calculateItemEffectivePrice(
  product: PricedProduct,
  quantity: number,
  tiers: readonly ProductPricingTier[] = []
): EffectivePrice {
  const retailUnitPrice = Math.max(0, Number(product.price) || 0);
  const qty = Math.max(0, Math.floor(Number(quantity) || 0));

  const appliedTier = findApplicableTier(qty, tiers);
  // Honor the admin-configured tier price when a slab matches; otherwise the
  // customer pays retail. tier.pricePerItem is validated >= 0 on write.
  const unitPrice =
    appliedTier !== null
      ? Math.max(0, appliedTier.pricePerItem)
      : retailUnitPrice;

  const lineTotal = round2(unitPrice * qty);
  const retailLineTotal = round2(retailUnitPrice * qty);

  return {
    unitPrice,
    retailUnitPrice,
    lineTotal,
    retailLineTotal,
    savings: Math.max(0, round2(retailLineTotal - lineTotal)),
    isWholesale: appliedTier !== null && unitPrice < retailUnitPrice,
    appliedTier,
  };
}

/**
 * Validate a set of pricing tiers. Enforces, per the spec:
 *   - integer quantities, `minQuantity >= 1`
 *   - `minQuantity < maxQuantity` (when a max is set)
 *   - non-negative unit price
 *   - at most ONE open-ended tier (maxQuantity === null)
 *   - NO overlapping ranges
 *
 * Returns per-row issues (with the tier index) plus global issues (index
 * null), so the admin grid can highlight individual rows while the API can
 * reject the whole payload with a readable message.
 */
export function validatePricingTiers(
  tiers: readonly ProductPricingTierDraft[]
): TierValidationResult {
  const issues: TierIssue[] = [];

  tiers.forEach((tier, index) => {
    const min = tier.minQuantity;
    const max = tier.maxQuantity;
    const price = tier.pricePerItem;

    if (!Number.isInteger(min) || min < 1) {
      issues.push({ index, message: "Minimum quantity must be a whole number ≥ 1." });
    }
    if (max !== null) {
      if (!Number.isInteger(max)) {
        issues.push({ index, message: "Maximum quantity must be a whole number." });
      } else if (max <= min) {
        issues.push({
          index,
          message: "Maximum quantity must be greater than the minimum quantity.",
        });
      }
    }
    if (!Number.isFinite(price) || price < 0) {
      issues.push({ index, message: "Price per item must be zero or greater." });
    }
  });

  // At most one open-ended (max === null) tier.
  const openEnded = tiers.filter((t) => t.maxQuantity === null);
  if (openEnded.length > 1) {
    issues.push({
      index: null,
      message: "Only one open-ended tier (no maximum) is allowed.",
    });
  }

  // Overlap detection. Two ranges [aMin, aMax] and [bMin, bMax] overlap when
  // aMin <= bMax && bMin <= aMax (open-ended max treated as +Infinity). O(n²)
  // is fine — products have a handful of tiers at most.
  for (let i = 0; i < tiers.length; i++) {
    for (let j = i + 1; j < tiers.length; j++) {
      const a = tiers[i];
      const b = tiers[j];
      const aMax = a.maxQuantity === null ? Number.POSITIVE_INFINITY : a.maxQuantity;
      const bMax = b.maxQuantity === null ? Number.POSITIVE_INFINITY : b.maxQuantity;
      if (a.minQuantity <= bMax && b.minQuantity <= aMax) {
        issues.push({
          index: j,
          message: `Range overlaps tier #${i + 1}. Quantity ranges must not overlap.`,
        });
      }
    }
  }

  return { valid: issues.length === 0, issues };
}

/**
 * Human-readable range label for a tier, e.g. "100 – 200" or "500+".
 * Used by the admin grid and any storefront "buy more, save more" hint.
 */
export function formatTierRange(tier: TierLike): string {
  if (tier.maxQuantity === null) return `${tier.minQuantity}+`;
  return `${tier.minQuantity} – ${tier.maxQuantity}`;
}

/** Round to 2 decimal places without floating-point drift (e.g. 0.1+0.2). */
function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
