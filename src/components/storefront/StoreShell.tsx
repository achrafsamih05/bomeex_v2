"use client";

import { ReactNode } from "react";
import { Toolbar } from "./Toolbar";
import { BottomNav } from "./BottomNav";
import { CartDrawer } from "./CartDrawer";
import { useI18n } from "@/lib/useI18n";

/**
 * StoreShell wraps every storefront page. It ensures:
 *   - the toolbar/bottom nav are always present
 *   - the cart drawer is mounted at the top of the tree (no reloads)
 *   - the <html> lang/dir attributes follow the active locale
 */
export function StoreShell({ children }: { children: ReactNode }) {
  // Calling useI18n triggers the effect that syncs <html dir/lang>.
  useI18n();
  return (
    <div className="min-h-dvh pb-24 md:pb-8">
      <Toolbar />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        {children}
      </main>
      <BottomNav />
      <CartDrawer />
    </div>
  );
}
