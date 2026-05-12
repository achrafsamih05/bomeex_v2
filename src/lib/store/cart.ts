"use client";

// Global cart store using Zustand, persisted to localStorage so the cart
// survives refreshes without needing a page reload.

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem } from "../types";

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  addItem: (productId: string, quantity?: number) => void;
  removeItem: (productId: string) => void;
  setQuantity: (productId: string, quantity: number) => void;
  clear: () => void;
  count: () => number;
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      open: () => set({ isOpen: true }),
      close: () => set({ isOpen: false }),
      toggle: () => set({ isOpen: !get().isOpen }),
      addItem: (productId, quantity = 1) =>
        set((s) => {
          const existing = s.items.find((i) => i.productId === productId);
          if (existing) {
            return {
              items: s.items.map((i) =>
                i.productId === productId
                  ? { ...i, quantity: i.quantity + quantity }
                  : i
              ),
              isOpen: true,
            };
          }
          return {
            items: [...s.items, { productId, quantity }],
            isOpen: true,
          };
        }),
      removeItem: (productId) =>
        set((s) => ({ items: s.items.filter((i) => i.productId !== productId) })),
      setQuantity: (productId, quantity) =>
        set((s) => ({
          items: s.items
            .map((i) =>
              i.productId === productId
                ? { ...i, quantity: Math.max(0, quantity) }
                : i
            )
            .filter((i) => i.quantity > 0),
        })),
      clear: () => set({ items: [] }),
      count: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
    }),
    {
      name: "nova-cart",
      partialize: (s) => ({ items: s.items }),
    }
  )
);
