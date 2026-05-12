"use client";

import { useState } from "react";
import Image from "next/image";
import { Icon } from "../ui/Icon";
import { useCart } from "@/lib/store/cart";
import { useSettings } from "@/lib/client/hooks";
import { formatCurrency } from "@/lib/format";
import { useI18n } from "@/lib/useI18n";
import type { Product } from "@/lib/types";
import { cn } from "@/lib/utils";

// Shipped placeholder used when the real image fails to load. Living in
// /public means it's always served from the same origin, so it can never
// itself trigger the fallback.
const FALLBACK_IMAGE = "/favicon.svg";

export function ProductCard({ product }: { product: Product }) {
  const { t, locale } = useI18n();
  const addItem = useCart((s) => s.addItem);
  const settings = useSettings();
  const currency = settings?.currency ?? "USD";
  const outOfStock = product.stock <= 0;

  // ---------------------------------------------------------------------------
  // Image handling.
  //   - We try the value from `products.image` first.
  //   - On the FIRST load failure we log the offending URL (so you can paste
  //     it into a new tab / curl it) and swap in the local fallback image.
  //   - We also swap to `unoptimized` rendering on failure. next/image's
  //     optimiser is the single biggest source of "broken icon" reports —
  //     if the Supabase host wasn't in remotePatterns, the optimiser returns
  //     a 400 and the <img> breaks. Retrying unoptimised bypasses that path
  //     entirely and proves whether the URL itself is reachable.
  // ---------------------------------------------------------------------------
  const [imgSrc, setImgSrc] = useState<string>(product.image || FALLBACK_IMAGE);
  const [failed, setFailed] = useState(false);

  function onImageError() {
    if (failed) return; // already fell back, don't loop
    // eslint-disable-next-line no-console
    console.error(
      `[ProductCard] image failed to load for product ${product.id} (${product.sku}). ` +
        `URL: ${product.image}. ` +
        `Likely causes: (1) hostname missing from next.config.mjs images.remotePatterns, ` +
        `(2) Supabase bucket 'product-images' not public / missing SELECT policy, ` +
        `(3) the stored value is a path fragment instead of a full https:// URL.`
    );
    setImgSrc(FALLBACK_IMAGE);
    setFailed(true);
  }

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-soft transition hover:shadow-lift">
      <div className="relative aspect-square w-full overflow-hidden bg-ink-50">
        <Image
          src={imgSrc}
          alt={product.name[locale]}
          fill
          sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 20vw"
          // When the optimised request fails we fall back to unoptimised so
          // the browser hits the URL directly and we can see the real status
          // in DevTools.
          unoptimized={failed}
          onError={onImageError}
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
