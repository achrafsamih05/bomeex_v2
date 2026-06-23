"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { Icon } from "@/components/ui/Icon";
import { apiSend } from "@/lib/client/api";
import {
  useActiveShippingRates,
  useProducts,
  useSettings,
} from "@/lib/client/hooks";
import { formatCurrency } from "@/lib/format";
import {
  calculateItemEffectivePrice,
} from "@/lib/cart-utils";
import { useI18n } from "@/lib/useI18n";
import type { Order, Product } from "@/lib/types";
import { cn } from "@/lib/utils";

// ===========================================================================
// Admin — manual order builder
//
//   /admin/orders/create
//
// Lets an operator assemble an order on behalf of a customer (phone orders,
// walk-ins). Wholesale volume pricing is applied live via the shared
// `calculateItemEffectivePrice` utility: as the admin bumps a line's quantity
// past a tier threshold, that line's unit price drops automatically and the
// subtotal / shipping / total re-compute in real time.
//
// The submitted payload matches POST /api/orders exactly — the server
// re-resolves tier pricing and the shipping fee authoritatively, so what the
// admin previews here is exactly what gets persisted.
// ===========================================================================

interface DraftLine {
  /** Local row key so React keeps inputs stable across re-orders. */
  key: string;
  productId: string;
  quantity: number;
}

let lineSeq = 0;
function newLine(): DraftLine {
  lineSeq += 1;
  return { key: `line-${lineSeq}`, productId: "", quantity: 1 };
}

export default function CreateOrderPage() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const { data: products } = useProducts();
  const { data: shippingRates } = useActiveShippingRates();
  const settings = useSettings();
  const currency = settings?.currency ?? "USD";
  const taxRate = settings?.taxRate ?? 0;

  // Customer block
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");

  // Lines
  const [lines, setLines] = useState<DraftLine[]>([newLine()]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const productById = useMemo(() => {
    const map = new Map<string, Product>();
    for (const p of products) map.set(p.id, p);
    return map;
  }, [products]);

  // Resolve every draft line into a priced row. Lines without a chosen
  // product (or referencing a stale id) are skipped from the maths but still
  // rendered so the admin can finish filling them in.
  const priced = useMemo(
    () =>
      lines.map((line) => {
        const product = productById.get(line.productId) ?? null;
        const quantity = Math.max(1, Math.floor(line.quantity || 1));
        const pricing = product
          ? calculateItemEffectivePrice(
              product,
              quantity,
              product.pricingTiers ?? []
            )
          : null;
        const nextTier = product
          ? // The cheapest tier the admin hasn't unlocked yet, to hint
            // "add N more for the wholesale price".
            (product.pricingTiers ?? [])
              .filter((tr) => tr.minQuantity > quantity)
              .sort((a, b) => a.minQuantity - b.minQuantity)[0] ?? null
          : null;
        return { line, product, quantity, pricing, nextTier };
      }),
    [lines, productById]
  );

  const subtotal = useMemo(
    () =>
      +priced
        .reduce((s, r) => s + (r.pricing ? r.pricing.lineTotal : 0), 0)
        .toFixed(2),
    [priced]
  );
  const shippingCost = useMemo(() => {
    const rate = shippingRates.find((r) => r.city === city);
    return rate ? rate.price : 0;
  }, [shippingRates, city]);
  const tax = useMemo(
    () => +(subtotal * (taxRate / 100)).toFixed(2),
    [subtotal, taxRate]
  );
  const total = useMemo(
    () => +(subtotal + tax + shippingCost).toFixed(2),
    [subtotal, tax, shippingCost]
  );

  function patchLine(key: string, change: Partial<DraftLine>) {
    setLines((prev) =>
      prev.map((l) => (l.key === key ? { ...l, ...change } : l))
    );
  }
  function removeLine(key: string) {
    setLines((prev) => prev.filter((l) => l.key !== key));
  }
  function addLine() {
    setLines((prev) => [...prev, newLine()]);
  }

  async function submit() {
    setError(null);

    if (!name.trim() || !phone.trim() || !address.trim()) {
      setError("Customer name, phone and address are required.");
      return;
    }
    if (!city) {
      setError("Select a delivery city.");
      return;
    }
    const payloadItems = priced
      .filter((r) => r.product !== null)
      .map((r) => ({ productId: r.product!.id, quantity: r.quantity }));
    if (payloadItems.length === 0) {
      setError("Add at least one product to the order.");
      return;
    }

    setSubmitting(true);
    try {
      await apiSend<Order>("/api/orders", "POST", {
        customer: {
          name: name.trim(),
          email: email.trim() || undefined,
          phone: phone.trim(),
          address: address.trim(),
          city,
        },
        city,
        items: payloadItems,
      });
      router.push("/admin/orders");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create order");
      setSubmitting(false);
    }
  }

  const anyWholesale = priced.some((r) => r.pricing?.isWholesale);

  return (
    <AdminShell>
      <div className="space-y-6">
        <header className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Create order
            </h1>
            <p className="text-sm text-ink-500">
              Build an order for a customer. Wholesale pricing applies
              automatically as quantities qualify.
            </p>
          </div>
          <button
            onClick={() => router.push("/admin/orders")}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-ink-200 bg-white px-3 text-sm font-medium text-ink-700 hover:border-ink-300"
          >
            <Icon name="ArrowLeft" size={16} />
            Back
          </button>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          {/* ---- Builder ---- */}
          <div className="space-y-6">
            {/* Customer */}
            <section className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft">
              <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-ink-500">
                Customer
              </h2>
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Name">
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={inputCls}
                  />
                </Field>
                <Field label="Email">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputCls}
                  />
                </Field>
                <Field label="Phone">
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className={inputCls}
                  />
                </Field>
                <Field label="Delivery city">
                  <div className="relative">
                    <select
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className={cn(inputCls, "appearance-none pr-9")}
                    >
                      <option value="" disabled>
                        Select a city
                      </option>
                      {shippingRates.map((r) => (
                        <option key={r.id} value={r.city}>
                          {r.city} (+{formatCurrency(r.price, locale, currency)})
                        </option>
                      ))}
                    </select>
                    <span className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-ink-400">
                      <Icon name="ChevronDown" size={16} />
                    </span>
                  </div>
                </Field>
                <Field label="Shipping address" wide>
                  <textarea
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    rows={2}
                    className={inputCls}
                  />
                </Field>
              </div>
            </section>

            {/* Items */}
            <section className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                  Items
                </h2>
                <button
                  type="button"
                  onClick={addLine}
                  className="inline-flex h-8 items-center gap-1 rounded-lg border border-ink-200 bg-white px-2 text-xs font-medium text-ink-700 hover:border-ink-300"
                >
                  <Icon name="Plus" size={14} /> Add item
                </button>
              </div>

              <ul className="space-y-3">
                {priced.map(({ line, product, quantity, pricing, nextTier }) => (
                  <li
                    key={line.key}
                    className="rounded-xl border border-ink-100 bg-ink-50/40 p-3"
                  >
                    <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_96px_auto]">
                      <div className="relative">
                        <select
                          value={line.productId}
                          onChange={(e) =>
                            patchLine(line.key, { productId: e.target.value })
                          }
                          className={cn(inputCls, "h-9 appearance-none pr-9 text-xs")}
                        >
                          <option value="">Select a product…</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name[locale]} · {formatCurrency(p.price, locale, currency)}
                            </option>
                          ))}
                        </select>
                        <span className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-ink-400">
                          <Icon name="ChevronDown" size={14} />
                        </span>
                      </div>
                      <input
                        type="number"
                        min={1}
                        value={line.quantity}
                        onChange={(e) =>
                          patchLine(line.key, {
                            quantity: Math.max(
                              1,
                              Math.floor(Number(e.target.value) || 1)
                            ),
                          })
                        }
                        className={cn(inputCls, "h-9 text-xs text-end")}
                      />
                      <button
                        type="button"
                        onClick={() => removeLine(line.key)}
                        className="grid h-9 w-9 place-items-center rounded-lg text-ink-600 hover:bg-red-50 hover:text-red-600"
                        aria-label="Remove item"
                      >
                        <Icon name="Trash2" size={14} />
                      </button>
                    </div>

                    {product && pricing && (
                      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2">
                          {pricing.isWholesale ? (
                            <>
                              <span className="text-ink-400 line-through tabular-nums">
                                {formatCurrency(
                                  pricing.retailUnitPrice,
                                  locale,
                                  currency
                                )}
                              </span>
                              <span className="font-semibold tabular-nums text-black">
                                {formatCurrency(
                                  pricing.unitPrice,
                                  locale,
                                  currency
                                )}
                              </span>
                              <span className="inline-flex items-center gap-1 rounded-full bg-ink-900 px-2 py-0.5 text-[10px] font-medium text-white">
                                <Icon name="Layers" size={10} />
                                Wholesale
                              </span>
                            </>
                          ) : (
                            <span className="tabular-nums text-ink-600">
                              {formatCurrency(
                                pricing.unitPrice,
                                locale,
                                currency
                              )}
                              <span className="text-ink-400"> /item</span>
                            </span>
                          )}
                          {/* Stock guard hint — the server clamps quantity to
                              stock, so warn the admin before they submit. */}
                          {quantity > product.stock && (
                            <span className="text-amber-600">
                              only {product.stock} in stock
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          {nextTier && (
                            <span className="text-ink-400">
                              +{nextTier.minQuantity - quantity} for{" "}
                              {formatCurrency(
                                nextTier.pricePerItem,
                                locale,
                                currency
                              )}
                              /item
                            </span>
                          )}
                          <span className="font-semibold tabular-nums text-black">
                            {formatCurrency(pricing.lineTotal, locale, currency)}
                          </span>
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          </div>

          {/* ---- Summary ---- */}
          <aside className="h-max rounded-2xl border border-ink-100 bg-white p-5 shadow-soft lg:sticky lg:top-6">
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-ink-500">
              Summary
            </h2>
            <dl className="space-y-2 text-sm">
              <Row label="Subtotal" value={formatCurrency(subtotal, locale, currency)} />
              <Row
                label={`Tax${taxRate > 0 ? ` (${taxRate}%)` : ""}`}
                value={formatCurrency(tax, locale, currency)}
              />
              <Row
                label={city ? `Shipping · ${city}` : "Shipping"}
                value={city ? formatCurrency(shippingCost, locale, currency) : "—"}
              />
              <div className="flex items-center justify-between border-t border-ink-100 pt-2 text-base font-semibold text-ink-900">
                <span>Total</span>
                <span className="tabular-nums">
                  {formatCurrency(total, locale, currency)}
                </span>
              </div>
            </dl>

            {anyWholesale && (
              <p className="mt-3 flex items-center gap-1 text-xs font-medium text-emerald-600">
                <Icon name="Layers" size={12} />
                Wholesale pricing applied
              </p>
            )}

            {error && (
              <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}

            <button
              onClick={submit}
              disabled={submitting}
              className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-ink-900 text-sm font-medium text-white hover:bg-ink-800 disabled:opacity-60"
            >
              <Icon name="CheckCircle2" size={16} />
              {submitting ? "Creating…" : "Create order"}
            </button>
            <p className="mt-2 text-center text-[11px] text-ink-400">
              Stock is reserved when the order moves to “processing”.
            </p>
          </aside>
        </div>
      </div>
    </AdminShell>
  );
}

const inputCls =
  "h-10 w-full rounded-xl border border-ink-200 bg-white px-3 text-sm focus:border-ink-900 focus:outline-none";

function Field({
  label,
  wide,
  children,
}: {
  label: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className={cn("block", wide && "md:col-span-2")}>
      <span className="mb-1 block text-xs font-medium text-ink-600">
        {label}
      </span>
      {children}
    </label>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-ink-600">
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
