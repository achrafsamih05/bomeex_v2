import { NextRequest } from "next/server";
import {
  createSessionToken,
  setSessionCookie,
  toPublicUser,
  verifyPassword,
} from "@/lib/server/auth";
import { getUserByEmail, updateUser } from "@/lib/server/db";
import { handle, httpError } from "@/lib/server/http";

// POST /api/auth/login
//   body: { email, password, intent?: "customer" | "admin" }
export const POST = (req: NextRequest) =>
  handle(async () => {
    const { email, password, intent } = (await req
      .json()
      .catch(() => ({}))) as {
      email?: string;
      password?: string;
      intent?: "customer" | "admin";
    };

    if (!email || !password) {
      httpError(400, "Email and password are required");
    }

    const user = await getUserByEmail(email!);
    if (!user || user.banned || !verifyPassword(password!, user.passwordHash)) {
      httpError(401, "Invalid credentials");
    }

    if (intent === "admin" && user!.role !== "admin") {
      httpError(403, "This account does not have admin access");
    }

    await updateUser(user!.id, { lastSeenAt: new Date().toISOString() });
    const token = createSessionToken(user!);
    setSessionCookie(token);

    return toPublicUser(user!);
  });
