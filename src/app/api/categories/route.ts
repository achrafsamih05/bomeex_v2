import { NextResponse } from "next/server";
import { categories } from "@/lib/db";

// GET /api/categories
export async function GET() {
  return NextResponse.json({ data: categories });
}
