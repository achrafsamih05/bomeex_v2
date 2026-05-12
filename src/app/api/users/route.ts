import { NextResponse } from "next/server";
import { listUsers } from "@/lib/server/db";
import { toPublicUser } from "@/lib/server/auth";

// GET /api/users — admin only (gated via middleware).
export async function GET() {
  const users = await listUsers();
  return NextResponse.json({ data: users.map(toPublicUser) });
}
