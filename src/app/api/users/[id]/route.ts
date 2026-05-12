import { NextRequest, NextResponse } from "next/server";
import { deleteUser, getUserById, updateUser } from "@/lib/server/db";
import { getCurrentUser, toPublicUser } from "@/lib/server/auth";
import { emit } from "@/lib/server/bus";

// PATCH /api/users/:id — admin only. Used to ban/unban or edit a user.
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const me = await getCurrentUser();
  if (!me || me.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const target = await getUserById(params.id);
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  const patch: Record<string, unknown> = {};
  if (typeof body.banned === "boolean") patch.banned = body.banned;
  if (typeof body.role === "string" && (body.role === "admin" || body.role === "customer")) {
    // Safety: don't let the last admin demote themselves.
    if (target.id === me.id && body.role !== "admin") {
      return NextResponse.json({ error: "Cannot demote yourself" }, { status: 400 });
    }
    patch.role = body.role;
  }

  const updated = await updateUser(params.id, patch);
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  emit({ channel: "users", action: "updated", id: params.id });
  return NextResponse.json({ data: toPublicUser(updated) });
}

// DELETE /api/users/:id — admin only. Can't delete yourself.
export async function DELETE(
  _: NextRequest,
  { params }: { params: { id: string } }
) {
  const me = await getCurrentUser();
  if (!me || me.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (me.id === params.id) {
    return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });
  }
  const removed = await deleteUser(params.id);
  if (!removed) return NextResponse.json({ error: "Not found" }, { status: 404 });
  emit({ channel: "users", action: "deleted", id: params.id });
  return NextResponse.json({ data: toPublicUser(removed) });
}
