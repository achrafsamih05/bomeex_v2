import { NextRequest, NextResponse } from "next/server";
import { getInvoice, updateInvoice } from "@/lib/server/db";
import { getCurrentUser } from "@/lib/server/auth";
import { emit } from "@/lib/server/bus";

// GET /api/invoices/:id — admin only.
export async function GET(
  _: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const inv = await getInvoice(params.id);
  if (!inv) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ data: inv });
}

// PATCH /api/invoices/:id — admin only. Toggle paid/unpaid.
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const updated = await updateInvoice(params.id, body);
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  emit({ channel: "invoices", action: "updated", id: params.id });
  return NextResponse.json({ data: updated });
}
