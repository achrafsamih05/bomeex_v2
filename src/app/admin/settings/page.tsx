"use client";

import { useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Icon } from "@/components/ui/Icon";
import { LOCALES, LOCALE_LABELS } from "@/lib/i18n";
import { useI18n } from "@/lib/useI18n";
import { cn } from "@/lib/utils";
import type { Locale } from "@/lib/types";

export default function AdminSettings() {
  const { t, locale, setLocale } = useI18n();
  const [form, setForm] = useState({
    storeName: "Nova",
    adminEmail: "admin@nova.shop",
    currency: "USD",
    taxRate: 10,
  });
  const [saved, setSaved] = useState(false);

  function save() {
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  return (
    <AdminShell>
      <div className="mx-auto max-w-2xl space-y-6">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight">
            {t("admin.settings")}
          </h1>
          <p className="text-sm text-ink-500">
            Admin profile and system configuration.
          </p>
        </header>

        <section className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft">
          <h2 className="mb-4 text-base font-semibold">Profile</h2>
          <div className="flex items-center gap-4">
            <span className="grid h-16 w-16 place-items-center rounded-2xl bg-ink-900 text-2xl font-semibold text-white">
              A
            </span>
            <div>
              <div className="font-medium">Admin</div>
              <div className="text-sm text-ink-500">{form.adminEmail}</div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft">
          <h2 className="mb-4 text-base font-semibold">Store</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Store name">
              <input
                value={form.storeName}
                onChange={(e) => setForm({ ...form, storeName: e.target.value })}
                className={inputCls}
              />
            </Field>
            <Field label="Admin email">
              <input
                type="email"
                value={form.adminEmail}
                onChange={(e) =>
                  setForm({ ...form, adminEmail: e.target.value })
                }
                className={inputCls}
              />
            </Field>
            <Field label="Currency">
              <select
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
                className={inputCls}
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="MAD">MAD</option>
              </select>
            </Field>
            <Field label="Tax rate (%)">
              <input
                type="number"
                value={form.taxRate}
                onChange={(e) =>
                  setForm({ ...form, taxRate: Number(e.target.value) })
                }
                className={inputCls}
              />
            </Field>
          </div>
        </section>

        <section className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft">
          <h2 className="mb-4 text-base font-semibold">Language</h2>
          <div className="grid grid-cols-3 gap-2">
            {LOCALES.map((l) => (
              <button
                key={l}
                onClick={() => setLocale(l as Locale)}
                className={cn(
                  "h-11 rounded-xl border text-sm font-medium transition",
                  l === locale
                    ? "border-ink-900 bg-ink-900 text-white"
                    : "border-ink-200 bg-white text-ink-700 hover:border-ink-300"
                )}
              >
                {LOCALE_LABELS[l as Locale]}
              </button>
            ))}
          </div>
        </section>

        <div className="flex justify-end gap-2">
          {saved && (
            <span className="inline-flex items-center gap-1 self-center text-sm text-emerald-600">
              <Icon name="CheckCircle2" size={14} />
              Saved
            </span>
          )}
          <button
            onClick={save}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-ink-900 px-5 text-sm font-medium text-white hover:bg-ink-800"
          >
            <Icon name="Save" size={16} />
            Save changes
          </button>
        </div>
      </div>
    </AdminShell>
  );
}

const inputCls =
  "h-11 w-full rounded-xl border border-ink-200 bg-white px-3 text-sm focus:border-ink-900 focus:outline-none";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-ink-600">{label}</span>
      {children}
    </label>
  );
}
