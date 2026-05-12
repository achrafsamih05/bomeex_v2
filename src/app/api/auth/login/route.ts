import { NextRequest, NextResponse } from "next/server";
import {
  createSessionToken,
  setSessionCookie,
  toPublicUser,
  verifyPassword,
} from "@/lib/server/auth";
import { getUserByEmail, updateUser } from "@/lib/server/db";

// POST /api/auth/login
//   body: { email, password, intent?: "customer" | "admin" }
// The intent only affects the error we return for non-admins trying the admin
// gate — both flows use the same credentials + session.
export async function POST(req: NextRequest) {
  const { email, password, intent } = (await req.json().catch(() => ({}))) as {
    email?: string;
    password?: string;
    intent?: "customer" | "admin";
  };

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required" },
      { status: 400 }
    );
  }

  const user = await getUserByEmail(email);
  if (!user || user.banned || !verifyPassword(password, user.passwordHash)) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  if (intent === "admin" && user.role !== "admin") {
    return NextResponse.json(
      { error: "This account does not have admin access" },
      { status: 403 }
    );
  }

  await updateUser(user.id, { lastSeenAt: new Date().toISOString() });
  const token = createSessionToken(user);
  setSessionCookie(token);

  return NextResponse.json({ data: toPublicUser(user) });
}
