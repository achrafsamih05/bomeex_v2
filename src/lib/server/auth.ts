import "server-only";
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { getUserById } from "./db";
import type { PublicUser, User, UserRole } from "../types";

// ---------------------------------------------------------------------------
// Session cookie format:
//   nova_session = base64url({ sub, role, iat, exp }) + "." + hmacSHA256(body)
//
// Signed with NEXTAUTH_SECRET (or a dev fallback). Verification is done both
// in route handlers (via requireUser / getCurrentUser) and in middleware.ts —
// so the HMAC must be computable in both Node and Edge runtimes. We use the
// Web Crypto API-compatible path in middleware and Node crypto here.
// ---------------------------------------------------------------------------

export const SESSION_COOKIE = "nova_session";
const ONE_WEEK = 60 * 60 * 24 * 7;

interface SessionPayload {
  sub: string; // user id
  role: UserRole;
  iat: number;
  exp: number;
}

function secret(): string {
  return process.env.NEXTAUTH_SECRET || "nova-dev-secret-change-me";
}

function b64urlEncode(input: Buffer | string): string {
  const buf = typeof input === "string" ? Buffer.from(input) : input;
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function b64urlDecode(input: string): Buffer {
  const pad = input.length % 4 === 0 ? "" : "=".repeat(4 - (input.length % 4));
  return Buffer.from(input.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64");
}

function sign(body: string): string {
  return b64urlEncode(createHmac("sha256", secret()).update(body).digest());
}

export function createSessionToken(user: User): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = {
    sub: user.id,
    role: user.role,
    iat: now,
    exp: now + ONE_WEEK,
  };
  const body = b64urlEncode(JSON.stringify(payload));
  return `${body}.${sign(body)}`;
}

export function verifySessionToken(token: string | undefined | null): SessionPayload | null {
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = sign(body);
  // Constant-time compare.
  if (expected.length !== sig.length) return null;
  try {
    const ok = timingSafeEqual(Buffer.from(expected), Buffer.from(sig));
    if (!ok) return null;
  } catch {
    return null;
  }
  try {
    const payload = JSON.parse(b64urlDecode(body).toString("utf8")) as SessionPayload;
    if (!payload.sub || !payload.role) return null;
    if (payload.exp <= Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Password hashing (scrypt with random salt). Format: "<salt>$<hash>"
// ---------------------------------------------------------------------------

export function hashPassword(pw: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(pw, salt, 64).toString("hex");
  return `${salt}$${hash}`;
}

export function verifyPassword(pw: string, stored: string): boolean {
  const [salt, hash] = stored.split("$");
  if (!salt || !hash) return false;
  const attempt = scryptSync(pw, salt, 64);
  const expected = Buffer.from(hash, "hex");
  if (attempt.length !== expected.length) return false;
  return timingSafeEqual(attempt, expected);
}

// ---------------------------------------------------------------------------
// Route-handler helpers (Node runtime)
// ---------------------------------------------------------------------------

export function toPublicUser(u: User): PublicUser {
  const { passwordHash: _pw, ...rest } = u;
  void _pw;
  return rest;
}

export async function getCurrentUser(): Promise<User | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  const payload = verifySessionToken(token);
  if (!payload) return null;
  const user = await getUserById(payload.sub);
  if (!user || user.banned) return null;
  return user;
}

export function setSessionCookie(token: string) {
  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ONE_WEEK,
  });
}

export function clearSessionCookie() {
  cookies().set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}
