import { NextRequest } from "next/server";
import { getSettings, updateSettings } from "@/lib/server/db";
import { getCurrentUser } from "@/lib/server/auth";
import { emit } from "@/lib/server/bus";
import { handle, httpError } from "@/lib/server/http";
import type { Settings } from "@/lib/types";

export const dynamic = "force-dynamic";

// GET /api/settings — PUBLIC. The storefront reads storeName, currency, etc.
// Always reads from Supabase (via getSettings()). No filesystem access.
export const GET = () => handle(() => getSettings());

// PATCH /api/settings — admin only. Updates the Supabase settings row.
// No filesystem access anywhere in this path.
export const PATCH = (req: NextRequest) =>
  handle(async () => {
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") httpError(401, "Unauthorized");

    const body = (await req.json().catch(() => ({}))) as Partial<Settings>;
    const patch: Partial<Settings> = {};
    if (typeof body.storeName === "string" && body.storeName.trim()) {
      patch.storeName = body.storeName.trim().slice(0, 64);
    }
    if (typeof body.currency === "string" && body.currency.trim()) {
      patch.currency = body.currency.trim().toUpperCase().slice(0, 8);
    }
    if (
      typeof body.taxRate === "number" &&
      body.taxRate >= 0 &&
      body.taxRate <= 100
    ) {
      patch.taxRate = body.taxRate;
    }
    if (
      typeof body.lowStockThreshold === "number" &&
      body.lowStockThreshold >= 0 &&
      body.lowStockThreshold <= 10_000
    ) {
      patch.lowStockThreshold = body.lowStockThreshold;
    }

    const updated = await updateSettings(patch);
    emit({ channel: "settings", action: "updated" });
    return updated;
  });

// Alias POST to PATCH so clients sending POST still work. Same auth + logic.
export const POST = PATCH;
