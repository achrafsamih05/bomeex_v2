import { NextResponse } from "next/server";
import { getCurrentUser, toPublicUser } from "@/lib/server/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ data: null });
  return NextResponse.json({ data: toPublicUser(user) });
}

// Update own profile (shipping details, name, etc.)
export async function PATCH(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const allowed = ["name", "phone", "address", "city", "postalCode", "country"] as const;
  const patch: Record<string, unknown> = {};
  for (const k of allowed) if (typeof body[k] === "string") patch[k] = body[k];

  const { updateUser } = await import("@/lib/server/db");
  const updated = await updateUser(user.id, patch);
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ data: toPublicUser(updated) });
}
