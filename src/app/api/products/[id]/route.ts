import { NextRequest, NextResponse } from "next/server";
import {
  deleteProduct,
  getProduct,
  updateProduct,
} from "@/lib/server/db";
import { getCurrentUser } from "@/lib/server/auth";
import { emit } from "@/lib/server/bus";

// GET /api/products/:id — public.
export async function GET(
  _: NextRequest,
  { params }: { params: { id: string } }
) {
  const p = await getProduct(params.id);
  if (!p) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ data: p });
}

// PATCH /api/products/:id — admin only.
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const updated = await updateProduct(params.id, body);
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  emit({ channel: "products", action: "updated", id: params.id });
  return NextResponse.json({ data: updated });
}

// DELETE /api/products/:id — admin only.
export async function DELETE(
  _: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const removed = await deleteProduct(params.id);
  if (!removed) return NextResponse.json({ error: "Not found" }, { status: 404 });
  emit({ channel: "products", action: "deleted", id: params.id });
  return NextResponse.json({ data: removed });
}
