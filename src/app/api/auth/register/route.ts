import { NextRequest, NextResponse } from "next/server";
import {
  createSessionToken,
  hashPassword,
  setSessionCookie,
  toPublicUser,
} from "@/lib/server/auth";
import { createUser, getUserByEmail } from "@/lib/server/db";
import { emit } from "@/lib/server/bus";
import type { User } from "@/lib/types";

// POST /api/auth/register  — customers only; admin accounts are seeded.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const { email, password, name, phone, address, city, postalCode, country } =
    body as Record<string, string>;

  if (!email || !password || !name || !address) {
    return NextResponse.json(
      { error: "email, password, name and address are required" },
      { status: 400 }
    );
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters" },
      { status: 400 }
    );
  }

  const existing = await getUserByEmail(email);
  if (existing) {
    return NextResponse.json({ error: "Email already registered" }, { status: 409 });
  }

  const user: User = {
    id: `u-${Date.now().toString(36)}`,
    email: email.toLowerCase().trim(),
    name,
    role: "customer",
    phone,
    address,
    city,
    postalCode,
    country,
    banned: false,
    passwordHash: hashPassword(password),
    createdAt: new Date().toISOString(),
    lastSeenAt: new Date().toISOString(),
  };
  await createUser(user);
  emit({ channel: "users", action: "created", id: user.id });

  const token = createSessionToken(user);
  setSessionCookie(token);

  return NextResponse.json({ data: toPublicUser(user) }, { status: 201 });
}
