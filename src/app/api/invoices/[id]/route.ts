import { NextRequest, NextResponse } from "next/server";
import { invoices } from "@/lib/db";

// GET /api/invoices/:id
export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const inv = invoices.find((i) => i.id === params.id);
  if (!inv) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ data: inv });
}

// PATCH /api/invoices/:id  — mark as paid/unpaid
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const idx = invoices.findIndex((i) => i.id === params.id);
  if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = await req.json();
  invoices[idx] = { ...invoices[idx], ...body };
  return NextResponse.json({ data: invoices[idx] });
}
