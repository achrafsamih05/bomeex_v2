"use client";

// ---------------------------------------------------------------------------
// Admin → Settings → Shipping & Delivery
//
// Manage the per-city delivery fees that back the `shipping_rates` table. The
// admin can append a new city, edit an existing city's price, toggle a
// destination on/off, or remove it entirely. Every mutation maps to
// /api/admin/shipping and the list re-syncs live over the `shipping` realtime
// channel (so a second open tab updates without a refresh).
// ---------------------------------------------------------------------------

import { FormEvent, useState } from "react";
import Link from "next/link";
import { AdminShell } from "@/components/admin/AdminShell";
import { Icon } from "@/components/ui/Icon";
import { apiSend } from "@/lib/client/api";
import { useShippingRates, useSettings } from "@/lib/client/hooks";
import { formatCurrency } from "@/lib/format";
import { useI18n } from "@/lib/useI18n";
import { cn } from "@/lib/utils";
import type { ShippingRate } from "@/lib/types";

// A convenience datalist so admins can pick common destinations quickly. Not
// exhaustive — any free-text city is accepted.
const MOROCCAN_CITIES = [
  "Casablanca",
  "Rabat",
  "Marrakech",
  "Fès",
  "Tanger",
  "Agadir",
  "Meknès",
  "Oujda",
  "Kénitra",
  "Tétouan",
  "Safi",
  "El Jadida",
  "Nador",
  "Béni Mellal",
  "Mohammedia",
  "Khouribga",
  "Settat",
  "Laâyoune",
  "Essaouira",
  "Dakhla",
];

interface ShippingForm {
  city: string;
  price: number;
  active: boolean;
  /** Set when editing an existing row — locks the city (unique key). */
  editingId: string | null;
}

const EMPTY_FORM: ShippingForm = {
  city: "",
  price: 0,
  active: true,
  editingId: null,
};

export default function ShippingRatesPage() {
  const { t, locale } = useI18n();
  const { data: rates, loading, error, reload } = useShippingRates();
  const settings = useSettings();
  const currency = settings?.currency ?? "MAD";

  const [form, setForm] = useState<ShippingForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [savedCity, setSavedCity] = useState<string | null>(null);

  function startEdit(rate: ShippingRate) {
    setFormError(null);
    setForm({
      city: rate.city,
      price: rate.price,
      active: rate.active,
      editingId: rate.id,
    });
  }

  function resetForm() {
    setForm(EMPTY_FORM);
    setFormError(null);
  }

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);

    const city = form.city.trim();
    if (!city) {
      setFormError("City is required.");
      return;
    }
    if (!Number.isFinite(form.price) || form.price < 0) {
      setFormError("Price must be zero or greater.");
      return;
    }

    setSaving(true);
    try {
      await apiSend<ShippingRate>("/api/admin/shipping", "POST", {
        city,
        price: form.price,
        active: form.active,
      });
      setSavedCity(city);
      setTimeout(() => setSavedCity(null), 1800);
      resetForm();
      await reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(rate: ShippingRate) {
    try {
      await apiSend<ShippingRate>("/api/admin/shipping", "PATCH", {
        city: rate.city,
        price: rate.price,
        active: !rate.active,
      });
      await reload();
    } catch {
      /* surfaced by the list error path on next reload */
    }
  }

  async function remove(rate: ShippingRate) {
    if (!confirm(`Remove delivery to ${rate.city}?`)) return;
    try {
      await apiSend(`/api/admin/shipping?id=${encodeURIComponent(rate.id)}`, "DELETE");
      if (form.editingId === rate.id) resetForm();
      await reload();
    } catch {
      /* noop — list reload will reflect reality */
    }
  }

  const activeCount = rates.filter((r) => r.active).length;

  return (
    <AdminShell>
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="space-y-2">
          <Link
            href="/admin/settings"
            className="inline-flex items-center gap-1 text-sm text-ink-500 hover:text-ink-800"
          >
            <Icon name="ArrowLeft" size={14} />
            {t("admin.settings")}
          </Link>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {t("admin.shipping")}
            </h1>
            <p className="text-sm text-ink-500">
              Set a delivery price per city. These rates apply at checkout based
              on the customer&apos;s shipping city.
            </p>
          </div>
        </header>

        {/* ---- Add / edit form ---- */}
        <section className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft">
          <h2 className="mb-4 flex items-center gap-2 text-base font-semibold">
            <Icon name="MapPin" size={16} className="text-ink-500" />
            {form.editingId ? `Edit ${form.city}` : "Add a city"}
          </h2>

          <form onSubmit={save} className="grid gap-4 sm:grid-cols-[1fr_auto_auto] sm:items-end">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-ink-600">
                City
              </span>
              <input
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                list="moroccan-cities"
                placeholder="e.g. Casablanca"
                maxLength={80}
                readOnly={form.editingId !== null}
                className={cn(
                  inputCls,
                  form.editingId !== null && "cursor-not-allowed bg-ink-50 text-ink-500"
                )}
                required
              />
              <datalist id="moroccan-cities">
                {MOROCCAN_CITIES.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-medium text-ink-600">
                Price ({currency})
              </span>
              <input
                type="number"
                min={0}
                step="0.01"
                value={Number.isFinite(form.price) ? form.price : 0}
                onChange={(e) =>
                  setForm({ ...form, price: Number(e.target.value) })
                }
                className={cn(inputCls, "sm:w-36")}
                required
              />
            </label>

            <div className="flex items-center gap-2">
              <label className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-xl border border-ink-200 px-3 text-sm">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) =>
                    setForm({ ...form, active: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-ink-300 text-ink-900 focus:ring-ink-900"
                />
                Active
              </label>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-ink-900 px-4 text-sm font-medium text-white hover:bg-ink-800 disabled:opacity-60"
              >
                <Icon name={form.editingId ? "Save" : "Plus"} size={16} />
                {saving ? "Saving…" : form.editingId ? "Update" : "Add city"}
              </button>
              {form.editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="inline-flex h-11 items-center rounded-xl border border-ink-200 bg-white px-3 text-sm font-medium text-ink-700 hover:border-ink-300"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>

          {formError && (
            <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {formError}
            </p>
          )}
          {savedCity && (
            <p className="mt-3 inline-flex items-center gap-1 text-sm text-emerald-600">
              <Icon name="CheckCircle2" size={14} />
              Saved {savedCity}
            </p>
          )}
        </section>

        {/* ---- Rates table ---- */}
        <section className="overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-soft">
          <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3">
            <h2 className="text-sm font-semibold text-ink-700">
              {rates.length} {rates.length === 1 ? "city" : "cities"}
              <span className="ms-2 font-normal text-ink-400">
                · {activeCount} active
              </span>
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="bg-ink-50 text-ink-600">
                <tr>
                  <th className="px-4 py-3 text-start font-medium">City</th>
                  <th className="px-4 py-3 text-end font-medium">Delivery fee</th>
                  <th className="px-4 py-3 text-center font-medium">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {loading && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-ink-400">
                      Loading…
                    </td>
                  </tr>
                )}
                {!loading && error && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-red-600">
                      {error}
                    </td>
                  </tr>
                )}
                {!loading && !error && rates.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-ink-400">
                      No cities yet — add your first delivery destination above.
                    </td>
                  </tr>
                )}
                {rates.map((rate) => (
                  <tr key={rate.id} className="hover:bg-ink-50/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 font-medium">
                        <Icon name="MapPin" size={15} className="text-ink-400" />
                        {rate.city}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-end font-medium">
                      {formatCurrency(rate.price, locale, currency)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => toggleActive(rate)}
                        className={cn(
                          "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium transition",
                          rate.active
                            ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                            : "bg-ink-100 text-ink-500 hover:bg-ink-200"
                        )}
                        title="Toggle availability"
                      >
                        {rate.active ? "Active" : "Disabled"}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-end">
                      <div className="inline-flex gap-1">
                        <button
                          onClick={() => startEdit(rate)}
                          className="grid h-8 w-8 place-items-center rounded-lg text-ink-600 hover:bg-ink-100"
                          aria-label={`Edit ${rate.city}`}
                        >
                          <Icon name="Edit" size={16} />
                        </button>
                        <button
                          onClick={() => remove(rate)}
                          className="grid h-8 w-8 place-items-center rounded-lg text-ink-600 hover:bg-red-50 hover:text-red-600"
                          aria-label={`Delete ${rate.city}`}
                        >
                          <Icon name="Trash2" size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AdminShell>
  );
}

const inputCls =
  "h-11 w-full rounded-xl border border-ink-200 bg-white px-3 text-sm focus:border-ink-900 focus:outline-none";
