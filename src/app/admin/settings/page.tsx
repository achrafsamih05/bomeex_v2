"use client";

import { FormEvent, useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Icon } from "@/components/ui/Icon";
import { LOCALES, LOCALE_LABELS } from "@/lib/i18n";
import { apiSend } from "@/lib/client/api";
import { useMe, useSettings } from "@/lib/client/hooks";
import { useI18n } from "@/lib/useI18n";
import { cn } from "@/lib/utils";
import type { Locale, Settings } from "@/lib/types";

const CURRENCIES = ["USD", "EUR", "GBP", "MAD", "AED", "SAR", "JPY"];

export default function AdminSettings() {
  const { t, locale, setLocale } = useI18n();
  const settings = useSettings();
  const { data: me } = useMe();
  const [form, setForm] = useState<Settings | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialise local form state from server-loaded settings.
  useEffect(() => {
    if (settings && !form) setForm(settings);
  }, [settings, form]);

  if (!form) {
    return (
      <AdminShell>
        <div className="py-16 text-center text-ink-400">Loading…</div>
      </AdminShell>
    );
  }

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    try {
      await apiSend("/api/settings", "PATCH", form);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    }
  }

  return (
    <AdminShell>
      <div className="mx-auto max-w-2xl space-y-6">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight">
            {t("admin.settings")}
          </h1>
          <p className="text-sm text-ink-500">
            Global site configuration. Changes here update the storefront
            instantly.
          </p>
        </header>

        {me && (
          <section className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft">
            <h2 className="mb-4 text-base font-semibold">Profile</h2>
            <div className="flex items-center gap-4">
              <span className="grid h-16 w-16 place-items-center rounded-2xl bg-ink-900 text-2xl font-semibold text-white">
                {me.name.charAt(0).toUpperCase()}
              </span>
              <div>
                <div className="font-medium">{me.name}</div>
                <div className="text-sm text-ink-500">{me.email}</div>
                <div className="mt-1 inline-flex rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
                  {me.role}
                </div>
              </div>
            </div>
          </section>
        )}

        <form onSubmit={save} className="space-y-6">
          <section className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft">
            <h2 className="mb-4 text-base font-semibold">Store</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Store name">
                <input
                  value={form.storeName}
                  onChange={(e) => setForm({ ...form, storeName: e.target.value })}
                  className={inputCls}
                  maxLength={64}
                  required
                />
              </Field>
              <Field label="Currency">
                <select
                  value={form.currency}
                  onChange={(e) => setForm({ ...form, currency: e.target.value })}
                  className={inputCls}
                >
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Tax rate (%)">
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.1}
                  value={form.taxRate}
                  onChange={(e) =>
                    setForm({ ...form, taxRate: Number(e.target.value) })
                  }
                  className={inputCls}
                />
              </Field>
              <Field label="Low-stock threshold">
                <input
                  type="number"
                  min={0}
                  value={form.lowStockThreshold}
                  onChange={(e) =>
                    setForm({ ...form, lowStockThreshold: Number(e.target.value) })
                  }
                  className={inputCls}
                />
              </Field>
            </div>
          </section>

          <section className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft">
            <h2 className="mb-4 text-base font-semibold">Interface language</h2>
            <div className="grid grid-cols-3 gap-2">
              {LOCALES.map((l) => (
                <button
                  type="button"
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

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-2">
            {saved && (
              <span className="inline-flex items-center gap-1 text-sm text-emerald-600">
                <Icon name="CheckCircle2" size={14} />
                Saved — live on the storefront
              </span>
            )}
            <button
              type="submit"
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-ink-900 px-5 text-sm font-medium text-white hover:bg-ink-800"
            >
              <Icon name="Save" size={16} />
              Save changes
            </button>
          </div>
        </form>
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
