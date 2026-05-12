"use client";

import Link from "next/link";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { CartButton } from "./CartButton";
import { useI18n } from "@/lib/useI18n";

export function Toolbar() {
  const { t } = useI18n();
  return (
    <header className="glass sticky top-0 z-30">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-ink-900 text-white font-bold">
            N
          </span>
          <span className="text-lg font-semibold tracking-tight">
            {t("brand.name")}
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href="/admin"
            className="hidden md:inline-flex h-10 items-center rounded-xl border border-ink-200 bg-white px-3 text-sm font-medium text-ink-700 hover:border-ink-300"
          >
            {t("nav.admin")}
          </Link>
          <LanguageSwitcher />
          <CartButton />
        </div>
      </div>
    </header>
  );
}
