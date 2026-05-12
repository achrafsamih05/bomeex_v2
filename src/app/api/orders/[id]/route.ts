import { NextRequest } from "next/server";
import { getOrder, updateOrder } from "@/lib/server/db";
import { getCurrentUser } from "@/lib/server/auth";
import { emit } from "@/lib/server/bus";
import { handle, httpError } from "@/lib/server/http";
import type { OrderStatus } from "@/lib/types";

const VALID: OrderStatus[] = [
  "pending",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
];

// GET /api/orders/:id — owner or admin.
export const GET = (
  _: NextRequest,
  { params }: { params: { id: string } }
) =>
  handle(async () => {
    const o = await getOrder(params.id);
    if (!o) httpError(404, "Not found");
    const user = await getCurrentUser();
    if (!user) httpError(401, "Unauthorized");
    if (user!.role !== "admin" && o!.userId !== user!.id) {
      httpError(403, "Forbidden");
    }
    return o;
  });

// PATCH /api/orders/:id — admin only.
export const PATCH = (
  req: NextRequest,
  { params }: { params: { id: string } }
) =>
  handle(async () => {
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") httpError(401, "Unauthorized");
    const { status } = (await req.json()) as { status?: OrderStatus };
    if (!status || !VALID.includes(status)) {
      httpError(400, "Invalid status");
    }
    const updated = await updateOrder(params.id, { status });
    if (!updated) httpError(404, "Not found");
    emit({ channel: "orders", action: "updated", id: params.id });
    return updated;
  });
