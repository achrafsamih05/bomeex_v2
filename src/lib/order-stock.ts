// ---------------------------------------------------------------------------
// Order → inventory commitment rules.
//
// Single source of truth for *when* an order holds stock. Stock is no longer
// deducted at placement; instead it is "committed" once an order is being
// fulfilled and released again if the order is cancelled. Keeping the rule in
// one pure function means the create route and the status-update route can
// never disagree about whether a given status owns inventory.
//
// Commitment model:
//   pending   → NOT committed (awaiting confirmation; stock untouched)
//   processing→ committed     (admin accepted it; units leave the shelf)
//   shipped   → committed     (already deducted while processing)
//   delivered → committed     (stays deducted; the sale is final)
//   cancelled → NOT committed (any previously-deducted units are restored)
// ---------------------------------------------------------------------------

import type { OrderStatus } from "./types";

/** Statuses for which the ordered quantities are subtracted from stock. */
const STOCK_COMMITTED: ReadonlySet<OrderStatus> = new Set<OrderStatus>([
  "processing",
  "shipped",
  "delivered",
]);

/** True when an order in `status` should have its items deducted from stock. */
export function isStockCommitted(status: OrderStatus): boolean {
  return STOCK_COMMITTED.has(status);
}

/**
 * Decide the inventory side-effect of moving an order from `from` to `to`.
 *
 *   - "deduct"  when crossing from an uncommitted status into a committed one
 *               (e.g. pending → processing).
 *   - "restore" when crossing from a committed status back to an uncommitted
 *               one (e.g. processing/shipped/delivered → cancelled).
 *   - null      when the commitment state is unchanged (no stock movement).
 */
export function stockTransition(
  from: OrderStatus,
  to: OrderStatus
): "deduct" | "restore" | null {
  const was = isStockCommitted(from);
  const now = isStockCommitted(to);
  if (was === now) return null;
  return now ? "deduct" : "restore";
}
