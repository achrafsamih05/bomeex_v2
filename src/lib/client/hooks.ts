"use client";

// Data hooks — fetch + SSE. Keep them simple so we don't pull in SWR/React Query.

import { useCallback, useEffect, useState } from "react";
import type {
  Category,
  Invoice,
  Order,
  Product,
  PublicUser,
  Settings,
} from "../types";
import { apiGet } from "./api";
import { useRealtime } from "./realtime";

// ---- products ----
export function useProducts() {
  const [data, setData] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setError(null);
      const d = await apiGet<Product[]>("/api/products");
      setData(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);
  useRealtime(["products"], reload);

  return { data, loading, error, reload };
}

// ---- categories ----
export function useCategories() {
  const [data, setData] = useState<Category[]>([]);
  const reload = useCallback(async () => {
    try {
      setData(await apiGet<Category[]>("/api/categories"));
    } catch {
      /* noop */
    }
  }, []);
  useEffect(() => {
    reload();
  }, [reload]);
  useRealtime(["categories"], reload);
  return data;
}

// ---- settings ----
export function useSettings(): Settings | null {
  const [data, setData] = useState<Settings | null>(null);
  const reload = useCallback(async () => {
    try {
      setData(await apiGet<Settings>("/api/settings"));
    } catch {
      /* noop */
    }
  }, []);
  useEffect(() => {
    reload();
  }, [reload]);
  useRealtime(["settings"], reload);
  return data;
}

// ---- orders (admin) ----
export function useOrders() {
  const [data, setData] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const reload = useCallback(async () => {
    try {
      setData(await apiGet<Order[]>("/api/orders"));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    reload();
  }, [reload]);
  useRealtime(["orders"], reload);
  return { data, loading, reload };
}

// ---- invoices (admin) ----
export function useInvoices() {
  const [data, setData] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const reload = useCallback(async () => {
    try {
      setData(await apiGet<Invoice[]>("/api/invoices"));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    reload();
  }, [reload]);
  useRealtime(["invoices"], reload);
  return { data, loading, reload };
}

// ---- users (admin) ----
export function useUsers() {
  const [data, setData] = useState<PublicUser[]>([]);
  const [loading, setLoading] = useState(true);
  const reload = useCallback(async () => {
    try {
      setData(await apiGet<PublicUser[]>("/api/users"));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    reload();
  }, [reload]);
  useRealtime(["users"], reload);
  return { data, loading, reload };
}

// ---- current user ("me") ----
export function useMe() {
  const [data, setData] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);
  const reload = useCallback(async () => {
    try {
      const me = await apiGet<PublicUser | null>("/api/auth/me");
      setData(me);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    reload();
  }, [reload]);
  useRealtime(["users"], reload);
  return { data, loading, reload, setData };
}
