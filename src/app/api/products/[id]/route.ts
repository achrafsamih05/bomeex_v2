import { NextRequest, NextResponse } from "next/server";
import { products } from "@/lib/db";

// GET /api/products/:id
export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const p = products.find((x) => x.id === params.id);
  if (!p) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ data: p });
}

// PATCH /api/products/:id
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const idx = products.findIndex((x) => x.id === params.id);
  if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = await req.json();
  products[idx] = { ...products[idx], ...body };
  return NextResponse.json({ data: products[idx] });
}

// DELETE /api/products/:id
export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const idx = products.findIndex((x) => x.id === params.id);
  if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const [removed] = products.splice(idx, 1);
  return NextResponse.json({ data: removed });
}
