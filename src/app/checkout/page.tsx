"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { StoreShell } from "@/components/storefront/StoreShell";
import { Icon } from "@/components/ui/Icon";
import {
  useActiveShippingRates,
  useMe,
  useProducts,
  useSettings,
} from "@/lib/client/hooks";
import { apiSend } from "@/lib/client/api";
import { formatCurrency } from "@/lib/format";
import { calculateItemEffectivePrice } from "@/lib/cart-utils";
import { useCart } from "@/lib/store/cart";
import { useI18n } from "@/lib/useI18n";

export default function CheckoutPage() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const items = useCart((s) => s.items);
  const clear = useCart((s) => s.clear);
  const { data: products } = useProducts();
  const { data: me } = useMe();
  const { data: shippingRates } = useActiveShippingRates();
  const settings = useSettings();
  const currency = settings?.currency ?? "USD";
  const taxRate = settings?.taxRate ?? 10;

  const [done, setDone] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState("");

  // The fee for the chosen city. Looked up against the live `active` rates so
  // a city without a rate (or before any selection) contributes 0.
  const shippingCost = useMemo(() => {
    const rate = shippingRates.find((r) => r.city === selectedCity);
    return rate ? rate.price : 0;
  }, [shippingRates, selectedCity]);

  // Pre-select the customer's saved city once rates arrive, but only if it's a
  // currently deliverable destination — otherwise leave the picker empty so
  // they make an explicit, valid choice.
  useEffect(() => {
    if (selectedCity || !me?.city) return;
    const match = shippingRates.find(
      (r) => r.city.toLowerCase() === me.city!.toLowerCase()
    );
    if (match) setSelectedCity(match.city);
  }, [me?.city, shippingRates, selectedCity]);

  const lines = useMemo(
    () =>
      items
        .map((i) => {
          const p = products.find((x) => x.id === i.productId);
          if (!p) return null;
          // Apply wholesale volume pricing: the unit price drops to the
          // matching tier's `pricePerItem` when the quantity qualifies. This
          // mirrors the server's authoritative calc in POST /api/orders so the
          // summary the customer sees matches what's persisted to order_items.
          const pricing = calculateItemEffectivePrice(
            p,
            i.quantity,
            p.pricingTiers ?? []
          );
          return { product: p, quantity: i.quantity, pricing };
        })
        .filter((x): x is NonNullable<typeof x> => !!x),
    [items, products]
  );

  const subtotal = +lines
    .reduce((s, { pricing }) => s + pricing.lineTotal, 0)
    .toFixed(2);
  const tax = +(subtotal * (taxRate / 100)).toFixed(2);
  const total = +(subtotal + tax + shippingCost).toFixed(2);

  const hasProfileAddress = Boolean(me?.address && me?.phone);

  async function placeWithProfile() {
    setError(null);
    setSubmitting(true);
    try {
      const order = await apiSend<{ id: string }>("/api/orders", "POST", {
        useProfile: true,
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      });
      setDone(order.id);
      clear();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setSubmitting(false);
    }
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setError(null);

    if (!selectedCity) {
      setError(t("checkout.city.placeholder"));
      return;
    }

    setSubmitting(true);
    try {
      const order = await apiSend<{ id: string }>("/api/orders", "POST", {
        customer: {
          name: String(data.get("name") ?? ""),
          email: data.get("email") ? String(data.get("email")) : undefined,
          phone: String(data.get("phone") ?? ""),
          address: String(data.get("address") ?? ""),
          city: selectedCity,
        },
        city: selectedCity,
        shippingCost,
        items: items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
        })),
      });
      setDone(order.id);
      clear();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <StoreShell>
        <div className="mx-auto max-w-xl rounded-2xl border border-ink-100 bg-white p-8 text-center shadow-soft">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-100 text-emerald-600">
            <Icon name="CheckCircle2" size={28} />
          </div>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight">
            {t("checkout.success.title")}
          </h1>
          <p className="mt-2 text-sm text-ink-500">
            {t("checkout.success.body")}
          </p>
          <p className="mt-4 text-sm text-ink-400">Order {done}</p>
          <Link
            href="/"
            className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-ink-900 px-5 text-sm font-medium text-white hover:bg-ink-800"
          >
            {t("cart.empty.cta")}
          </Link>
        </div>
      </StoreShell>
    );
  }

  if (lines.length === 0) {
    return (
      <StoreShell>
        <div className="mx-auto max-w-xl rounded-2xl border border-dashed border-ink-200 bg-white p-10 text-center">
          <p className="text-ink-600">{t("cart.empty")}</p>
          <Link
            href="/"
            className="mt-4 inline-flex h-11 items-center justify-center rounded-xl bg-ink-900 px-5 text-sm font-medium text-white hover:bg-ink-800"
          >
            {t("cart.empty.cta")}
          </Link>
        </div>
      </StoreShell>
    );
  }

  return (
    <StoreShell>
      {/* Single fluid document scroll: explicitly stack in one column on
          mobile (grid-cols-1) and split into form + summary from lg+. `h-auto`
          + `overscroll-y-contain` let the natural page scroll own the gesture
          on iOS/Android — no nested/double scroll, no viewport-height lock. */}
      <div className="grid h-auto grid-cols-1 gap-6 overscroll-y-contain lg:grid-cols-[1fr_380px]">
        <section className="rounded-2xl border border-ink-100 bg-white p-6 shadow-soft">
          <h1 className="mb-5 text-2xl font-semibold tracking-tight">
            {t("checkout.title")}
          </h1>

          {me && hasProfileAddress && (
            <div className="mb-6 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
              <div className="flex items-start gap-3">
                <div className="grid h-9 w-9 place-items-center rounded-full bg-emerald-600 text-white">
                  <Icon name="ShieldCheck" size={16} />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-ink-900">
                    {t("checkout.oneClick.title")}
                  </div>
                  <p className="mt-0.5 text-xs text-ink-600">
                    {me.name} · {me.email} ·{" "}
                    {[me.address, me.city, me.postalCode, me.country]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                </div>
                <button
                  onClick={placeWithProfile}
                  disabled={submitting}
                  className="inline-flex h-10 items-center rounded-xl bg-emerald-600 px-4 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  {submitting ? "…" : t("checkout.oneClick.cta")}
                </button>
              </div>
              <p className="mt-3 text-center text-xs text-ink-500">
                {t("checkout.or")}
              </p>
            </div>
          )}

          {!me && (
            <div className="mb-6 flex items-center justify-between gap-3 rounded-2xl border border-ink-100 bg-ink-50 p-4 text-sm">
              <span className="text-ink-700">
                {t("checkout.signInHint")}
              </span>
              <button
                onClick={() => router.push(`/login?next=${encodeURIComponent("/checkout")}`)}
                className="inline-flex h-9 items-center rounded-lg bg-ink-900 px-3 text-xs font-medium text-white hover:bg-ink-800"
              >
                {t("auth.signIn")}
              </button>
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-4">
            <Field label={t("checkout.name")} name="name" required defaultValue={me?.name} />
            {/* Email: hidden for guests (phone is the primary identifier),
                readonly + auto-filled for authenticated users */}
            {me && (
              <Field
                label={t("checkout.email")}
                name="email"
                type="email"
                defaultValue={me.email}
                readOnly
              />
            )}
            <Field label={t("checkout.phone")} name="phone" type="tel" required defaultValue={me?.phone} />
            <Field
              label={t("checkout.address")}
              name="address"
              required
              defaultValue={
                me?.address
                  ? [me.address, me.city, me.postalCode, me.country]
                      .filter(Boolean)
                      .join(", ")
                  : undefined
              }
            />
            <CitySelect
              label={t("checkout.city")}
              placeholder={t("checkout.city.placeholder")}
              emptyHint={t("checkout.city.empty")}
              value={selectedCity}
              onChange={setSelectedCity}
              options={shippingRates.map((r) => ({
                city: r.city,
                price: r.price,
                label: `${r.city} (+${formatCurrency(r.price, locale, currency)})`,
              }))}
            />
            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="mt-2 inline-flex h-12 w-full items-center justify-center rounded-xl bg-ink-900 text-sm font-medium text-white hover:bg-ink-800 disabled:opacity-60"
            >
              {submitting ? "…" : t("checkout.place")}
            </button>
          </form>
        </section>

        <aside className="h-max rounded-2xl border border-ink-100 bg-white p-6 shadow-soft lg:sticky lg:top-24">
          <h2 className="mb-4 text-base font-semibold">{t("cart.title")}</h2>
          <ul className="space-y-3">
            {lines.map(({ product, quantity, pricing }) => (
              <li key={product.id} className="flex gap-3">
                <div className="relative h-14 w-14 overflow-hidden rounded-lg bg-ink-50">
                  <Image
                    src={product.image}
                    alt={product.name[locale]}
                    fill
                    sizes="56px"
                    className="object-cover"
                  />
                </div>
                <div className="flex-1 text-sm">
                  <div className="line-clamp-1 font-medium">
                    {product.name[locale]}
                  </div>
                  <div className="text-ink-500">
                    ×{quantity}
                    {pricing.isWholesale && (
                      <span className="ms-1 text-ink-400">
                        @ {formatCurrency(pricing.unitPrice, locale, currency)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-sm font-semibold">
                  {formatCurrency(pricing.lineTotal, locale, currency)}
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-4 space-y-2 border-t border-ink-100 pt-4 text-sm">
            <SummaryRow label={t("cart.subtotal")} value={formatCurrency(subtotal, locale, currency)} />
            <SummaryRow label={`${t("cart.tax").replace(/\(.*\)/, `(${taxRate}%)`)}`} value={formatCurrency(tax, locale, currency)} />
            <SummaryRow
              label={
                selectedCity
                  ? `${t("checkout.shipping")} · ${selectedCity}`
                  : t("checkout.shipping")
              }
              value={
                selectedCity
                  ? formatCurrency(shippingCost, locale, currency)
                  : "—"
              }
            />
            <SummaryRow label={t("cart.total")} value={formatCurrency(total, locale, currency)} bold />
          </div>
        </aside>
      </div>
    </StoreShell>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
  defaultValue,
  readOnly,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
  readOnly?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-ink-600">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        readOnly={readOnly}
        className={`h-11 w-full rounded-xl border border-ink-200 bg-white px-3 text-sm transition focus:border-ink-900 focus:outline-none ${readOnly ? "cursor-not-allowed bg-ink-50 text-ink-500" : ""}`}
      />
    </label>
  );
}

function CitySelect({
  label,
  placeholder,
  emptyHint,
  value,
  onChange,
  options,
}: {
  label: string;
  placeholder: string;
  emptyHint: string;
  value: string;
  onChange: (city: string) => void;
  options: { city: string; price: number; label: string }[];
}) {
  const disabled = options.length === 0;
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-ink-600">{label}</span>
      <div className="relative">
        <select
          name="city"
          required
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className="h-11 w-full appearance-none rounded-xl border border-ink-200 bg-white px-3 pr-9 text-sm transition focus:border-ink-900 focus:outline-none disabled:cursor-not-allowed disabled:bg-ink-50 disabled:text-ink-400"
        >
          <option value="" disabled>
            {placeholder}
          </option>
          {options.map((o) => (
            <option key={o.city} value={o.city}>
              {o.label}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-400">
          <Icon name="ChevronDown" size={16} />
        </span>
      </div>
      {disabled && <p className="mt-1 text-xs text-ink-500">{emptyHint}</p>}
    </label>
  );
}

function SummaryRow({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div
      className={
        bold
          ? "flex items-center justify-between pt-1 text-base font-semibold text-ink-900"
          : "flex items-center justify-between text-ink-600"
      }
    >
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}