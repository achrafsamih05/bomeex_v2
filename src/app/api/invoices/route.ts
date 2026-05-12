import { NextResponse } from "next/server";
import { invoices } from "@/lib/db";

// GET /api/invoices
export async function GET() {
  return NextResponse.json({ data: invoices });
}
