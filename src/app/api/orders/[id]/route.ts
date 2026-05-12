import { NextRequest, NextResponse } from "next/server";
import { orders } from "@/lib/db";
import type { OrderStatus } from "@/lib/types";

const VALID: OrderStatus[] = [
  "pending",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
];

// GET /api/orders/:id
export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const o = orders.find((x) => x.id === params.id);
  if (!o) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ data: o });
}

// PATCH /api/orders/:id  — update status
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const idx = orders.findIndex((x) => x.id === params.id);
  if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { status } = (await req.json()) as { status?: OrderStatus };
  if (!status || !VALID.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }
  orders[idx] = { ...orders[idx], status };
  return NextResponse.json({ data: orders[idx] });
}
