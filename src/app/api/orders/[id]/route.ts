import { NextRequest, NextResponse } from "next/server";
import { getOrder, updateOrder } from "@/lib/server/db";
import { getCurrentUser } from "@/lib/server/auth";
import { emit } from "@/lib/server/bus";
import type { OrderStatus } from "@/lib/types";

const VALID: OrderStatus[] = [
  "pending",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
];

// GET /api/orders/:id  — owner or admin.
export async function GET(
  _: NextRequest,
  { params }: { params: { id: string } }
) {
  const o = await getOrder(params.id);
  if (!o) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "admin" && o.userId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return NextResponse.json({ data: o });
}

// PATCH /api/orders/:id  — admin only.
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { status } = (await req.json()) as { status?: OrderStatus };
  if (!status || !VALID.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }
  const updated = await updateOrder(params.id, { status });
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  emit({ channel: "orders", action: "updated", id: params.id });
  return NextResponse.json({ data: updated });
}
