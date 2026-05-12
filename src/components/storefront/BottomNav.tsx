"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon, ICONS } from "../ui/Icon";
import { useCart } from "@/lib/store/cart";
import { useI18n } from "@/lib/useI18n";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const { t } = useI18n();
  const pathname = usePathname();
  const openCart = useCart((s) => s.open);
  const [count, setCount] = useState(0);

  useEffect(() => {
    const unsub = useCart.subscribe((s) =>
      setCount(s.items.reduce((n, i) => n + i.quantity, 0))
    );
    setCount(
      useCart.getState().items.reduce((n, i) => n + i.quantity, 0)
    );
    return () => unsub();
  }, []);

  const tabs: {
    key: string;
    label: string;
    icon: keyof typeof ICONS;
    href?: string;
    onClick?: () => void;
  }[] = [
    { key: "home", label: t("nav.home"), icon: "Home", href: "/" },
    {
      key: "categories",
      label: t("nav.categories"),
      icon: "LayoutGrid",
      href: "/categories",
    },
    { key: "cart", label: t("nav.cart"), icon: "ShoppingBag", onClick: openCart },
    { key: "account", label: t("nav.account"), icon: "User", href: "/account" },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-ink-100 bg-white/90 pb-safe backdrop-blur md:hidden">
      <ul className="mx-auto grid max-w-md grid-cols-4">
        {tabs.map((tab) => {
          const isActive =
            tab.href &&
            (tab.href === "/"
              ? pathname === "/"
              : pathname.startsWith(tab.href));
          const Cmp = tab.href ? Link : "button";
          return (
            <li key={tab.key}>
              <Cmp
                href={tab.href ?? "#"}
                onClick={tab.onClick}
                className={cn(
                  "relative flex h-16 flex-col items-center justify-center gap-1 text-xs font-medium",
                  isActive ? "text-ink-900" : "text-ink-500 hover:text-ink-700"
                )}
              >
                <Icon name={tab.icon} size={20} />
                <span>{tab.label}</span>
                {tab.key === "cart" && count > 0 && (
                  <span className="absolute start-1/2 top-2 ms-3 grid h-4 min-w-4 place-items-center rounded-full bg-brand-500 px-1 text-[10px] font-semibold text-white">
                    {count}
                  </span>
                )}
              </Cmp>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
