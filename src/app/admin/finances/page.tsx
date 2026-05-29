"use client";

// ---------------------------------------------------------------------------
// Admin → Finances & Wallet
//
// A cash-flow view backed by the `expenses` table and the live
// `settings.wallet_balance`. The wallet is moved exclusively by DB triggers:
//   + credited when an invoice is marked paid
//   − debited when an expense is logged here
// so this page never mutates the balance directly — it inserts an expense and
// re-reads the post-trigger balance.
//
// Layout:
//   1. Summary cards: live wallet balance, this-month spend, total spend,
//      expense count.
//   2. "Log expense" modal (Title, Category, Amount, Description).
//   3. Recent-expenses table with category badges + formatted dates.
// ---------------------------------------------------------------------------

import { FormEvent, useMemo, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Icon } from "@/components/ui/Icon";
import { apiSend } from "@/lib/client/api";
import { useFinances, useSettings } from "@/lib/client/hooks";
import { formatCurrency, formatDate } from "@/lib/format";
import { useI18n } from "@/lib/useI18n";
import { cn } from "@/lib/utils";
import {
  EXPENSE_CATEGORIES,
  type Expense,
  type ExpenseCategory,
  type Locale,
} from "@/lib/types";

// Visual identity + label per category. `icon` is a registered lucide name.
const CATEGORY_META: Record<
  ExpenseCategory,
  { label: string; badge: string; icon: string }
> = {
  staff: { label: "Staff", badge: "bg-brand-50 text-brand-700", icon: "Users" },
  marketing: {
    label: "Marketing",
    badge: "bg-purple-50 text-purple-700",
    icon: "TrendingUp",
  },
  logistics: {
    label: "Logistics",
    badge: "bg-amber-50 text-amber-700",
    icon: "Truck",
  },
  others: { label: "Others", badge: "bg-ink-100 text-ink-600", icon: "Tag" },
};

interface ExpenseDraft {
  title: string;
  category: ExpenseCategory;
  amount: number;
  description: string;
}

const EMPTY_DRAFT: ExpenseDraft = {
  title: "",
  category: "others",
  amount: 0,
  description: "",
};

export default function FinancesPage() {
  const { t, locale } = useI18n();
  const { walletBalance, expenses, loading, error, reload } = useFinances();
  const settings = useSettings();
  const currency = settings?.currency ?? "MAD";
  const [modalOpen, setModalOpen] = useState(false);

  const totals = useMemo(() => {
    const now = new Date();
    let total = 0;
    let thisMonth = 0;
    for (const e of expenses) {
      total += e.amount;
      const d = new Date(e.createdAt);
      if (
        d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth()
      ) {
        thisMonth += e.amount;
      }
    }
    return { total, thisMonth, count: expenses.length };
  }, [expenses]);

  return (
    <AdminShell>
      <div className="space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {t("admin.finances")}
            </h1>
            <p className="text-sm text-ink-500">
              Track your store wallet and log business costs. Paid invoices top
              up the wallet automatically; logged expenses draw it down.
            </p>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-ink-900 px-4 text-sm font-medium text-white hover:bg-ink-800"
          >
            <Icon name="Plus" size={16} />
            Log expense
          </button>
        </header>

        {/* ---- Summary cards ---- */}
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card
            label="Wallet balance"
            value={formatCurrency(walletBalance, locale, currency)}
            hint="Paid invoices − expenses"
            icon="Wallet"
            tone={walletBalance >= 0 ? "ink" : "red"}
            emphasis
          />
          <Card
            label="Spent this month"
            value={formatCurrency(totals.thisMonth, locale, currency)}
            hint={new Intl.DateTimeFormat(undefined, {
              month: "long",
              year: "numeric",
            }).format(new Date())}
            icon="Receipt"
            tone="brand"
          />
          <Card
            label="Total expenses"
            value={formatCurrency(totals.total, locale, currency)}
            hint="All time"
            icon="TrendingUp"
            tone="red"
          />
          <Card
            label="Logged entries"
            value={String(totals.count)}
            hint="Across all categories"
            icon="Layers"
            tone="ink"
          />
        </section>

        {/* ---- Expenses table ---- */}
        <div className="overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-soft">
          <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3">
            <h2 className="text-sm font-semibold text-ink-700">
              Recent expenses
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-ink-50 text-ink-600">
                <tr>
                  <th className="px-4 py-3 text-start font-medium">Title</th>
                  <th className="px-4 py-3 text-start font-medium">Category</th>
                  <th className="hidden px-4 py-3 text-start font-medium md:table-cell">
                    Date
                  </th>
                  <th className="px-4 py-3 text-end font-medium">Amount</th>
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
                {!loading && !error && expenses.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-ink-400">
                      No expenses logged yet. Use “Log expense” to add the first.
                    </td>
                  </tr>
                )}
                {expenses.map((e) => (
                  <ExpenseRow
                    key={e.id}
                    expense={e}
                    locale={locale}
                    currency={currency}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {modalOpen && (
        <LogExpenseModal
          currency={currency}
          onClose={() => setModalOpen(false)}
          onSaved={async () => {
            setModalOpen(false);
            await reload();
          }}
        />
      )}
    </AdminShell>
  );
}

// ---------- Expense row ----------------------------------------------------

function ExpenseRow({
  expense,
  locale,
  currency,
}: {
  expense: Expense;
  locale: Locale;
  currency: string;
}) {
  const meta = CATEGORY_META[expense.category];
  return (
    <tr className="hover:bg-ink-50/50">
      <td className="px-4 py-3">
        <div className="font-medium">{expense.title}</div>
        {expense.description && (
          <div className="mt-0.5 line-clamp-1 text-xs text-ink-500">
            {expense.description}
          </div>
        )}
        <div className="mt-0.5 text-xs text-ink-400 md:hidden">
          {formatDate(expense.createdAt, locale)}
        </div>
      </td>
      <td className="px-4 py-3">
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
            meta.badge
          )}
        >
          <Icon name={meta.icon} size={12} />
          {meta.label}
        </span>
      </td>
      <td className="hidden px-4 py-3 text-ink-600 md:table-cell">
        {formatDate(expense.createdAt, locale)}
      </td>
      <td className="px-4 py-3 text-end font-semibold text-red-600">
        − {formatCurrency(expense.amount, locale, currency)}
      </td>
    </tr>
  );
}

// ---------- Log-expense modal ----------------------------------------------

function LogExpenseModal({
  currency,
  onClose,
  onSaved,
}: {
  currency: string;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [draft, setDraft] = useState<ExpenseDraft>(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const title = draft.title.trim();
    if (!title) {
      setError("Title is required.");
      return;
    }
    if (!Number.isFinite(draft.amount) || draft.amount <= 0) {
      setError("Amount must be greater than zero.");
      return;
    }

    setSaving(true);
    try {
      await apiSend("/api/admin/expenses", "POST", {
        title,
        category: draft.category,
        amount: draft.amount,
        description: draft.description.trim(),
      });
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save expense");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-ink-950/40" onClick={onClose} />
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-lift">
        <header className="flex items-center justify-between border-b border-ink-100 p-4">
          <h3 className="flex items-center gap-2 text-base font-semibold">
            <Icon name="Receipt" size={18} className="text-ink-500" />
            Log expense
          </h3>
          <button
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-full text-ink-600 hover:bg-ink-100"
            aria-label="Close"
          >
            <Icon name="X" size={18} />
          </button>
        </header>

        <form onSubmit={submit} className="space-y-4 p-4">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-ink-600">
              Title
            </span>
            <input
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              placeholder="e.g. Facebook Ads — May"
              maxLength={120}
              className={inputCls}
              autoFocus
              required
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-ink-600">
                Category
              </span>
              <select
                value={draft.category}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    category: e.target.value as ExpenseCategory,
                  })
                }
                className={inputCls}
              >
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_META[c].label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-medium text-ink-600">
                Amount ({currency})
              </span>
              <input
                type="number"
                min={0}
                step="0.01"
                value={Number.isFinite(draft.amount) ? draft.amount : 0}
                onChange={(e) =>
                  setDraft({ ...draft, amount: Number(e.target.value) })
                }
                className={inputCls}
                required
              />
            </label>
          </div>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-ink-600">
              Description <span className="text-ink-400">(optional)</span>
            </span>
            <textarea
              value={draft.description}
              onChange={(e) =>
                setDraft({ ...draft, description: e.target.value })
              }
              rows={3}
              maxLength={500}
              placeholder="Add any context for this cost…"
              className={cn(inputCls, "h-auto py-2")}
            />
          </label>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="h-10 rounded-xl border border-ink-200 bg-white px-4 text-sm font-medium text-ink-700 hover:border-ink-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-ink-900 px-4 text-sm font-medium text-white hover:bg-ink-800 disabled:opacity-60"
            >
              <Icon name="Save" size={16} />
              {saving ? "Saving…" : "Save expense"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------- Summary card ---------------------------------------------------

type CardTone = "ink" | "brand" | "emerald" | "red";

const TONE: Record<CardTone, string> = {
  ink: "bg-ink-900 text-white",
  brand: "bg-brand-500 text-white",
  emerald: "bg-emerald-500 text-white",
  red: "bg-red-500 text-white",
};

function Card({
  label,
  value,
  hint,
  icon,
  tone,
  emphasis,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: string;
  tone: CardTone;
  emphasis?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-2xl border bg-white p-4 shadow-soft",
        emphasis ? "border-ink-300 ring-1 ring-ink-100" : "border-ink-100"
      )}
    >
      <span
        className={cn(
          "grid h-10 w-10 flex-none place-items-center rounded-xl",
          TONE[tone]
        )}
      >
        <Icon name={icon} size={18} />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-ink-500">
          {label}
        </p>
        <p
          className={cn(
            "mt-0.5 truncate font-semibold tracking-tight",
            emphasis ? "text-2xl" : "text-xl"
          )}
        >
          {value}
        </p>
        {hint && <p className="mt-0.5 text-xs text-ink-500">{hint}</p>}
      </div>
    </div>
  );
}

const inputCls =
  "h-11 w-full rounded-xl border border-ink-200 bg-white px-3 text-sm focus:border-ink-900 focus:outline-none";
