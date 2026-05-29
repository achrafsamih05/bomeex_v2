import { NextRequest } from "next/server";
import {
  deleteShippingRate,
  listShippingRates,
  upsertShippingRate,
} from "@/lib/server/db";
import { getCurrentUser } from "@/lib/server/auth";
import { emit } from "@/lib/server/bus";
import { handle, httpError } from "@/lib/server/http";

export const dynamic = "force-dynamic";

const MAX_CITY = 80;
const MAX_PRICE = 1_000_000;

/**
 * Gate every handler on an authenticated admin. This route lives outside the
 * middleware's static matcher historically, so it enforces its own check —
 * defence-in-depth alongside the edge matcher entry added for /api/admin/*.
 */
async function requireAdmin(): Promise<void> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") httpError(401, "Unauthorized");
}

// GET /api/admin/shipping — list every configured city + rate (admin only).
export const GET = () =>
  handle(async () => {
    await requireAdmin();
    return listShippingRates();
  });

/**
 * Shared create-or-update handler. The admin form posts `{ city, price,
 * active? }`; the DB upserts on the unique city name so the same endpoint
 * serves "add a city" and "edit a rate". Exposed as both POST and PATCH so the
 * client can use either verb interchangeably.
 */
async function upsert(req: NextRequest) {
  await requireAdmin();

  const body = (await req.json().catch(() => ({}))) as {
    city?: unknown;
    price?: unknown;
    active?: unknown;
  };

  const city = typeof body.city === "string" ? body.city.trim() : "";
  if (!city) httpError(400, "City is required");
  if (city.length > MAX_CITY) httpError(400, "City name is too long");

  const price = Number(body.price);
  if (!Number.isFinite(price) || price < 0 || price > MAX_PRICE) {
    httpError(400, "Price must be a number between 0 and 1,000,000");
  }

  const active = typeof body.active === "boolean" ? body.active : undefined;

  const rate = await upsertShippingRate({ city, price, active });
  emit({ channel: "shipping", action: "updated", id: rate.id });
  return rate;
}

export const POST = (req: NextRequest) => handle(() => upsert(req));
export const PATCH = (req: NextRequest) => handle(() => upsert(req));

// DELETE /api/admin/shipping?id=shr_xxx — remove a city's rate (admin only).
export const DELETE = (req: NextRequest) =>
  handle(async () => {
    await requireAdmin();
    const id = new URL(req.url).searchParams.get("id");
    if (!id) httpError(400, "id query parameter is required");
    const removed = await deleteShippingRate(id);
    if (!removed) httpError(404, "Shipping rate not found");
    emit({ channel: "shipping", action: "deleted", id });
    return removed;
  });
