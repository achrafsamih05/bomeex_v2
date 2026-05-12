import { NextResponse } from "next/server";
import { listCategories } from "@/lib/server/db";

// GET /api/categories — public
export async function GET() {
  return NextResponse.json({ data: await listCategories() });
}
