"use client";

import Image from "next/image";
import { Icon } from "../ui/Icon";
import { useCart } from "@/lib/store/cart";
import { useSettings } from "@/lib/client/hooks";
import { formatCurrency } from "@/lib/format";
import { useI18n } from "@/lib/useI18n";
import type { Product } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ProductCard({ product }: { product: Product }) {
  const { t, locale } = useI18n();
  const addItem = useCart((s) => s.addItem);
  const settings = useSettings();
  const currency = settings?.currency ?? "USD";
  const outOfStock = product.stock <= 0;

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-soft transition hover:shadow-lift">
      <div className="relative aspect-square w-full overflow-hidden bg-ink-50">
        <Image
          src={product.image}
          alt={product.name[locale]}
          fill
          sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 20vw"
          className="object-cover transition duration-500 group-hover:scale-105"
        />
        <div className="absolute top-2 start-2 inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-xs font-medium text-ink-700 backdrop-blur">
          <Icon name="Star" size={12} className="text-amber-500" />
          {product.rating.toFixed(1)}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3 sm:p-4">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-ink-900 sm:text-base">
          {product.name[locale]}
        </h3>
        <p className="line-clamp-2 text-xs text-ink-500 sm:text-sm">
          {product.description[locale]}
        </p>

        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          <span className="text-base font-semibold tracking-tight sm:text-lg">
            {formatCurrency(product.price, locale, currency)}
          </span>
          <span
            className={cn(
              "text-xs font-medium",
              outOfStock ? "text-red-600" : "text-emerald-600"
            )}
          >
            {outOfStock ? t("product.outOfStock") : t("product.inStock")}
          </span>
        </div>

        <button
          disabled={outOfStock}
          onClick={() => addItem(product.id, 1)}
          className="mt-2 inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-ink-900 text-sm font-medium text-white transition hover:bg-ink-800 disabled:cursor-not-allowed disabled:bg-ink-300"
        >
          <Icon name="Plus" size={16} />
          {t("product.add")}
        </button>
      </div>
    </article>
  );
}
