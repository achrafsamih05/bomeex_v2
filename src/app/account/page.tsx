"use client";

import { StoreShell } from "@/components/storefront/StoreShell";
import { Icon } from "@/components/ui/Icon";
import { LOCALES, LOCALE_LABELS } from "@/lib/i18n";
import { useI18n } from "@/lib/useI18n";
import { cn } from "@/lib/utils";
import type { Locale } from "@/lib/types";

export default function AccountPage() {
  const { t, locale, setLocale } = useI18n();
  return (
    <StoreShell>
      <div className="mx-auto max-w-2xl space-y-6">
        <header className="flex items-center gap-4">
          <span className="grid h-16 w-16 place-items-center rounded-2xl bg-ink-900 text-2xl font-semibold text-white">
            A
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {t("account.title")}
            </h1>
            <p className="text-sm text-ink-500">
              {t("account.signedInAs")} <span className="font-medium text-ink-700">guest@nova.shop</span>
            </p>
          </div>
        </header>

        <section className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft">
          <div className="mb-3 flex items-center gap-2">
            <Icon name="Settings" size={16} className="text-ink-500" />
            <h2 className="text-base font-semibold">{t("account.prefs")}</h2>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-ink-600">
                {t("account.language")}
              </label>
              <div className="mt-2 grid grid-cols-3 gap-2">
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
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft">
          <div className="mb-3 flex items-center gap-2">
            <Icon name="ShoppingBag" size={16} className="text-ink-500" />
            <h2 className="text-base font-semibold">{t("nav.cart")}</h2>
          </div>
          <p className="text-sm text-ink-500">
            {t("cart.empty.cta")}
          </p>
        </section>
      </div>
    </StoreShell>
  );
}
