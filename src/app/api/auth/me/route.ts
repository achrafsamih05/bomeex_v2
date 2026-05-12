import { NextRequest } from "next/server";
import { getCurrentUser, toPublicUser } from "@/lib/server/auth";
import { updateUser } from "@/lib/server/db";
import { handle, httpError } from "@/lib/server/http";

export const GET = () =>
  handle(async () => {
    const user = await getCurrentUser();
    return user ? toPublicUser(user) : null;
  });

// Update own profile (shipping details, name, etc.)
export const PATCH = (req: NextRequest) =>
  handle(async () => {
    const user = await getCurrentUser();
    if (!user) httpError(401, "Unauthorized");

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) httpError(400, "Invalid body");

    const allowed = ["name", "phone", "address", "city", "postalCode", "country"] as const;
    const patch: Record<string, unknown> = {};
    for (const k of allowed) if (typeof body![k] === "string") patch[k] = body![k];

    const updated = await updateUser(user!.id, patch);
    if (!updated) httpError(404, "Not found");
    return toPublicUser(updated!);
  });
