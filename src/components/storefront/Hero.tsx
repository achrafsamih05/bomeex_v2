"use client";

import { useI18n } from "@/lib/useI18n";

export function Hero() {
  const { t } = useI18n();
  return (
    <section className="relative overflow-hidden rounded-xl2 border border-ink-100 bg-gradient-to-br from-ink-900 via-ink-800 to-ink-900 p-6 text-white shadow-soft sm:p-10">
      <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-brand-500/30 blur-3xl" />
      <div className="absolute -bottom-20 -left-10 h-64 w-64 rounded-full bg-brand-400/20 blur-3xl" />
      <div className="relative max-w-2xl space-y-3">
        <span className="inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-medium tracking-wide text-white/90">
          {t("brand.name")}
        </span>
        <h1 className="text-2xl font-semibold leading-tight tracking-tight sm:text-4xl">
          {t("hero.title")}
        </h1>
        <p className="text-sm text-white/70 sm:text-base">
          {t("hero.subtitle")}
        </p>
      </div>
    </section>
  );
}
