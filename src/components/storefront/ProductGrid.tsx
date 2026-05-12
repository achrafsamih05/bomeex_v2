"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { products } from "@/lib/db";
import { ProductCard } from "./ProductCard";
import { useI18n } from "@/lib/useI18n";

export function ProductGrid() {
  const { t, locale } = useI18n();
  const params = useSearchParams();
  const category = params.get("category") ?? "all";
  const q = (params.get("q") ?? "").toLowerCase().trim();

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (category !== "all") {
        const slug = p.categoryId.replace(/^c-/, "");
        if (slug !== category) return false;
      }
      if (q) {
        const haystack =
          `${p.name.en} ${p.name.ar} ${p.name.fr} ${p.description[locale]} ${p.sku}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [category, q, locale]);

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold tracking-tight">
          {t("products.title")}
        </h2>
        <span className="text-sm text-ink-500">{filtered.length}</span>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ink-200 bg-white p-10 text-center text-sm text-ink-500">
          {t("products.empty")}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
          {filtered.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </section>
  );
}
