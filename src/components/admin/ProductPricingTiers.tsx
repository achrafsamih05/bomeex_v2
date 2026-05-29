"use client";

// ---------------------------------------------------------------------------
// ProductPricingTiers
//
// A reusable admin grid for a product's wholesale "volume price breaks". Drop
// it into the product editor (it self-persists to
// /api/admin/products/:id/pricing-tiers) to let admins add quantity slabs like:
//
//   Min 1   – Max 99    → 600 MAD / item   (retail-ish)
//   Min 100 – Max 199   → 520 MAD / item
//   Min 200 – (no max)  → 480 MAD / item   (open-ended top tier)
//
// Validation is shared with the server via `validatePricingTiers`
// (src/lib/cart-utils.ts): minimums are whole numbers ≥ 1, max must exceed
// min, prices are non-negative, at most one open-ended tier, and NO two ranges
// may overlap. The Save button stays disabled until the whole set is valid,
// and offending rows are highlighted inline.
// ---------------------------------------------------------------------------

import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { apiGet, apiSend } from "@/lib/client/api";
import { validatePricingTiers, type TierIssue } from "@/lib/cart-utils";
import { cn } from "@/lib/utils";
import type { ProductPricingTier, ProductPricingTierDraft } from "@/lib/types";

interface ProductPricingTiersProps {
  /** The product whose tiers are managed. Required for persistence. */
  productId: string;
  /** Store currency code for labels (e.g. "MAD"). */
  currency?: string;
  className?: string;
}

/** Local editable row. Mirrors ProductPricingTierDraft 1:1. */
type DraftRow = ProductPricingTierDraft;

function tierToDraft(t: ProductPricingTier): DraftRow {
  return {
    minQuantity: t.minQuantity,
    maxQuantity: t.maxQuantity,
    pricePerItem: t.pricePerItem,
  };
}

export function ProductPricingTiers({
  productId,
  currency = "MAD",
  className,
}: ProductPricingTiersProps) {
  const [rows, setRows] = useState<DraftRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const tiers = await apiGet<ProductPricingTier[]>(
        `/api/admin/products/${productId}/pricing-tiers`
      );
      setRows(tiers.map(tierToDraft));
      setDirty(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load tiers");
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    load();
  }, [load]);

  // Validation runs on every render — cheap for a handful of rows — and powers
  // both the inline row highlighting and the Save button's disabled state.
  const validation = useMemo(() => validatePricingTiers(rows), [rows]);
  const issuesByRow = useMemo(() => {
    const map = new Map<number, TierIssue[]>();
    for (const issue of validation.issues) {
      if (issue.index === null) continue;
      const list = map.get(issue.index) ?? [];
      list.push(issue);
      map.set(issue.index, list);
    }
    return map;
  }, [validation]);
  const globalIssues = validation.issues.filter((i) => i.index === null);

  function mutate(next: DraftRow[]) {
    setRows(next);
    setDirty(true);
    setSaved(false);
  }

  function updateRow(index: number, patch: Partial<DraftRow>) {
    mutate(rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  function addRow() {
    // Suggest a starting min just above the highest configured quantity so the
    // common "stack tiers upward" workflow needs minimal typing.
    const highest = rows.reduce((max, r) => {
      const top = r.maxQuantity ?? r.minQuantity;
      return Math.max(max, top);
    }, 0);
    const nextMin = rows.length === 0 ? 1 : highest + 1;
    mutate([
      ...rows,
      { minQuantity: nextMin, maxQuantity: null, pricePerItem: 0 },
    ]);
  }

  function removeRow(index: number) {
    mutate(rows.filter((_, i) => i !== index));
  }

  async function save() {
    if (!validation.valid) return;
    setSaving(true);
    setError(null);
    try {
      const next = await apiSend<ProductPricingTier[]>(
        `/api/admin/products/${productId}/pricing-tiers`,
        "POST",
        { tiers: rows }
      );
      setRows(next.map(tierToDraft));
      setDirty(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save tiers");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section
      className={cn(
        "rounded-2xl border border-ink-100 bg-white p-4 shadow-soft",
        className
      )}
    >
      <header className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Icon name="Layers" size={16} className="text-ink-500" />
            Wholesale tier pricing
          </h3>
          <p className="mt-0.5 text-xs text-ink-500">
            Drop the unit price when customers buy in bulk. Ranges can&apos;t
            overlap; leave the max empty for an open-ended top tier.
          </p>
        </div>
        <button
          type="button"
          onClick={addRow}
          className="inline-flex h-8 flex-none items-center gap-1 rounded-lg border border-ink-200 bg-white px-2.5 text-xs font-medium text-ink-700 hover:border-ink-300"
        >
          <Icon name="Plus" size={14} />
          Add tier
        </button>
      </header>

      {loading ? (
        <div className="py-6 text-center text-sm text-ink-400">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="grid place-items-center rounded-xl border border-dashed border-ink-200 bg-ink-50 px-4 py-6 text-center text-xs text-ink-500">
          No tiers yet. Add one to offer wholesale pricing for this product.
        </div>
      ) : (
        <div className="space-y-2">
          {/* Column header (hidden on small screens, where rows stack). */}
          <div className="hidden gap-2 px-1 text-[11px] font-medium uppercase tracking-wide text-ink-400 sm:grid sm:grid-cols-[1fr_1fr_1fr_auto_auto]">
            <span>Min qty</span>
            <span>Max qty</span>
            <span>Price / item ({currency})</span>
            <span className="text-center">Open</span>
            <span />
          </div>

          {rows.map((row, index) => {
            const rowIssues = issuesByRow.get(index) ?? [];
            const hasError = rowIssues.length > 0;
            const openEnded = row.maxQuantity === null;
            return (
              <div
                key={index}
                className={cn(
                  "rounded-xl border p-2 sm:grid sm:grid-cols-[1fr_1fr_1fr_auto_auto] sm:items-center sm:gap-2 sm:border-transparent sm:p-1",
                  hasError && "border-red-200 bg-red-50/40 sm:border-red-200"
                )}
              >
                <NumberField
                  ariaLabel={`Tier ${index + 1} minimum quantity`}
                  value={row.minQuantity}
                  min={1}
                  onChange={(v) => updateRow(index, { minQuantity: v ?? 0 })}
                />
                <NumberField
                  ariaLabel={`Tier ${index + 1} maximum quantity`}
                  value={openEnded ? null : row.maxQuantity}
                  min={1}
                  disabled={openEnded}
                  placeholder={openEnded ? "∞" : undefined}
                  onChange={(v) => updateRow(index, { maxQuantity: v })}
                />
                <NumberField
                  ariaLabel={`Tier ${index + 1} price per item`}
                  value={row.pricePerItem}
                  min={0}
                  step={0.01}
                  onChange={(v) =>
                    updateRow(index, { pricePerItem: v ?? 0 })
                  }
                />
                <label className="flex items-center justify-center gap-1 px-1 text-xs text-ink-600">
                  <input
                    type="checkbox"
                    checked={openEnded}
                    onChange={(e) =>
                      updateRow(index, {
                        maxQuantity: e.target.checked
                          ? null
                          : Math.max(row.minQuantity + 1, 1),
                      })
                    }
                    className="h-4 w-4 rounded border-ink-300 text-ink-900 focus:ring-ink-900"
                    aria-label={`Tier ${index + 1} open-ended`}
                  />
                  <span className="sm:hidden">No upper limit</span>
                </label>
                <button
                  type="button"
                  onClick={() => removeRow(index)}
                  className="grid h-8 w-8 place-items-center justify-self-end rounded-lg text-ink-500 hover:bg-red-50 hover:text-red-600"
                  aria-label={`Remove tier ${index + 1}`}
                >
                  <Icon name="Trash2" size={15} />
                </button>

                {hasError && (
                  <p className="mt-1 text-xs text-red-600 sm:col-span-5 sm:mt-0">
                    {rowIssues.map((i) => i.message).join(" ")}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {globalIssues.length > 0 && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
          {globalIssues.map((i) => i.message).join(" ")}
        </p>
      )}

      {error && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </p>
      )}

      <div className="mt-3 flex items-center justify-end gap-2">
        {saved && (
          <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
            <Icon name="CheckCircle2" size={13} />
            Tiers saved
          </span>
        )}
        <button
          type="button"
          onClick={save}
          disabled={saving || loading || !validation.valid || !dirty}
          className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-ink-900 px-3.5 text-xs font-medium text-white hover:bg-ink-800 disabled:opacity-50"
        >
          <Icon name="Save" size={14} />
          {saving ? "Saving…" : "Save tiers"}
        </button>
      </div>
    </section>
  );
}

// ---------- Small numeric input -------------------------------------------

function NumberField({
  value,
  onChange,
  min,
  step = 1,
  disabled,
  placeholder,
  ariaLabel,
}: {
  value: number | null;
  onChange: (value: number | null) => void;
  min?: number;
  step?: number;
  disabled?: boolean;
  placeholder?: string;
  ariaLabel: string;
}) {
  return (
    <input
      type="number"
      inputMode="decimal"
      aria-label={ariaLabel}
      disabled={disabled}
      min={min}
      step={step}
      placeholder={placeholder}
      value={value === null || Number.isNaN(value) ? "" : value}
      onChange={(e) => {
        const raw = e.target.value;
        onChange(raw === "" ? null : Number(raw));
      }}
      className={cn(
        "h-9 w-full rounded-lg border border-ink-200 bg-white px-2.5 text-sm focus:border-ink-900 focus:outline-none",
        disabled && "cursor-not-allowed bg-ink-50 text-ink-400"
      )}
    />
  );
}
