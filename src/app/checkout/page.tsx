"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { StoreShell } from "@/components/storefront/StoreShell";
import { Icon } from "@/components/ui/Icon";
import { products } from "@/lib/db";
import { formatCurrency } from "@/lib/format";
import { useCart } from "@/lib/store/cart";
import { useI18n } from "@/lib/useI18n";

export default function CheckoutPage() {
  const { t, locale } = useI18n();
  const items = useCart((s) => s.items);
  const clear = useCart((s) => s.clear);
  const [done, setDone] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const lines = useMemo(
    () =>
      items
        .map((i) => {
          const p = products.find((x) => x.id === i.productId);
          return p ? { product: p, quantity: i.quantity } : null;
        })
        .filter((x): x is NonNullable<typeof x> => !!x),
    [items]
  );

  const subtotal = lines.reduce(
    (s, { product, quantity }) => s + product.price * quantity,
    0
  );
  const tax = +(subtotal * 0.1).toFixed(2);
  const total = +(subtotal + tax).toFixed(2);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setSubmitting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer: {
            name: String(data.get("name") ?? ""),
            email: String(data.get("email") ?? ""),
            phone: String(data.get("phone") ?? ""),
            address: String(data.get("address") ?? ""),
          },
          items: items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
          })),
        }),
      });
      const json = await res.json();
      if (res.ok) {
        setDone(json.data.id);
        clear();
      }
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
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <section className="rounded-2xl border border-ink-100 bg-white p-6 shadow-soft">
          <h1 className="mb-5 text-2xl font-semibold tracking-tight">
            {t("checkout.title")}
          </h1>
          <form onSubmit={onSubmit} className="space-y-4">
            <Field label={t("checkout.name")} name="name" required />
            <Field
              label={t("checkout.email")}
              name="email"
              type="email"
              required
            />
            <Field label={t("checkout.phone")} name="phone" type="tel" />
            <Field label={t("checkout.address")} name="address" required />
            <button
              type="submit"
              disabled={submitting}
              className="mt-2 inline-flex h-12 w-full items-center justify-center rounded-xl bg-ink-900 text-sm font-medium text-white hover:bg-ink-800 disabled:opacity-60"
            >
              {submitting ? "…" : t("checkout.place")}
            </button>
          </form>
        </section>

        <aside className="h-max rounded-2xl border border-ink-100 bg-white p-6 shadow-soft">
          <h2 className="mb-4 text-base font-semibold">{t("cart.title")}</h2>
          <ul className="space-y-3">
            {lines.map(({ product, quantity }) => (
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
                  <div className="text-ink-500">×{quantity}</div>
                </div>
                <div className="text-sm font-semibold">
                  {formatCurrency(product.price * quantity, locale)}
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-4 space-y-2 border-t border-ink-100 pt-4 text-sm">
            <SummaryRow label={t("cart.subtotal")} value={formatCurrency(subtotal, locale)} />
            <SummaryRow label={t("cart.tax")} value={formatCurrency(tax, locale)} />
            <SummaryRow label={t("cart.total")} value={formatCurrency(total, locale)} bold />
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
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-ink-600">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        className="h-11 w-full rounded-xl border border-ink-200 bg-white px-3 text-sm transition focus:border-ink-900 focus:outline-none"
      />
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
