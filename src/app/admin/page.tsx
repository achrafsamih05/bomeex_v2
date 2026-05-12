"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AdminShell } from "@/components/admin/AdminShell";
import { Icon, ICONS } from "@/components/ui/Icon";
import { formatCurrency } from "@/lib/format";
import { useI18n } from "@/lib/useI18n";

interface Analytics {
  revenue: number;
  orders: number;
  products: number;
  pending: number;
  shipped: number;
  delivered: number;
  unpaid: number;
  topProducts: { productId: string; name: string; qty: number; revenue: number }[];
  lowStock: { id: string; name: string; stock: number }[];
}

export default function AdminHome() {
  const { t, locale } = useI18n();
  const [data, setData] = useState<Analytics | null>(null);

  useEffect(() => {
    fetch("/api/analytics")
      .then((r) => r.json())
      .then((j) => setData(j.data));
  }, []);

  return (
    <AdminShell>
      <div className="space-y-6">
        <header className="flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {t("admin.dashboard")}
            </h1>
            <p className="text-sm text-ink-500">
              Overview of your store performance.
            </p>
          </div>
        </header>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat
            icon="DollarSign"
            label="Revenue"
            value={data ? formatCurrency(data.revenue, locale) : "…"}
            tone="brand"
          />
          <Stat
            icon="ShoppingCart"
            label="Orders"
            value={data ? String(data.orders) : "…"}
          />
          <Stat
            icon="Boxes"
            label="Products"
            value={data ? String(data.products) : "…"}
          />
          <Stat
            icon="AlertCircle"
            label="Unpaid invoices"
            value={data ? String(data.unpaid) : "…"}
            tone="warn"
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-5">
          <section className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft lg:col-span-3">
            <h2 className="mb-4 text-base font-semibold">Top products</h2>
            {data && data.topProducts.length > 0 ? (
              <ul className="space-y-3">
                {data.topProducts.map((p, i) => {
                  const max = data.topProducts[0]?.revenue || 1;
                  const pct = Math.round((p.revenue / max) * 100);
                  return (
                    <li key={p.productId}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="font-medium">
                          {i + 1}. {p.name}
                        </span>
                        <span className="text-ink-600">
                          {formatCurrency(p.revenue, locale)}{" "}
                          <span className="text-ink-400">· {p.qty} sold</span>
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-ink-100">
                        <div
                          className="h-full rounded-full bg-ink-900"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-ink-400">No sales yet.</p>
            )}
          </section>

          <section className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft lg:col-span-2">
            <h2 className="mb-4 text-base font-semibold">Order status</h2>
            {data && (
              <div className="space-y-3">
                <Bar
                  label="Pending"
                  value={data.pending}
                  total={data.orders}
                  icon="Clock"
                  color="bg-amber-500"
                />
                <Bar
                  label="Shipped"
                  value={data.shipped}
                  total={data.orders}
                  icon="Truck"
                  color="bg-brand-500"
                />
                <Bar
                  label="Delivered"
                  value={data.delivered}
                  total={data.orders}
                  icon="CheckCircle2"
                  color="bg-emerald-500"
                />
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft lg:col-span-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold">Low stock</h2>
              <Link
                href="/admin/inventory"
                className="text-sm text-brand-600 hover:underline"
              >
                Manage inventory
              </Link>
            </div>
            {data && data.lowStock.length > 0 ? (
              <ul className="divide-y divide-ink-100">
                {data.lowStock.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between py-2 text-sm"
                  >
                    <span className="font-medium">{p.name}</span>
                    <span
                      className={
                        p.stock <= 10
                          ? "text-red-600 font-semibold"
                          : "text-amber-600 font-semibold"
                      }
                    >
                      {p.stock} left
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-400">All products well stocked.</p>
            )}
          </section>
        </div>
      </div>
    </AdminShell>
  );
}

function Stat({
  icon,
  label,
  value,
  tone,
}: {
  icon: keyof typeof ICONS;
  label: string;
  value: string;
  tone?: "brand" | "warn";
}) {
  const toneClass =
    tone === "brand"
      ? "bg-brand-50 text-brand-700"
      : tone === "warn"
      ? "bg-amber-50 text-amber-700"
      : "bg-ink-100 text-ink-700";
  return (
    <div className="rounded-2xl border border-ink-100 bg-white p-4 shadow-soft">
      <div className="flex items-center gap-3">
        <span
          className={`grid h-10 w-10 place-items-center rounded-xl ${toneClass}`}
        >
          <Icon name={icon} size={18} />
        </span>
        <div>
          <div className="text-xs text-ink-500">{label}</div>
          <div className="text-lg font-semibold">{value}</div>
        </div>
      </div>
    </div>
  );
}

function Bar({
  label,
  value,
  total,
  icon,
  color,
}: {
  label: string;
  value: number;
  total: number;
  icon: keyof typeof ICONS;
  color: string;
}) {
  const pct = total === 0 ? 0 : Math.round((value / total) * 100);
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="inline-flex items-center gap-2 text-ink-700">
          <Icon name={icon} size={14} />
          {label}
        </span>
        <span className="text-ink-600">
          {value} <span className="text-ink-400">/ {total}</span>
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-ink-100">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
