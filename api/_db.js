/* Database and session helpers — KA Event & Design
   Shared by every function under /api. */

import { neon } from "@neondatabase/serverless";
import crypto from "node:crypto";

const CONNECTION =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.DATABASE_URL_UNPOOLED ||
  process.env.POSTGRES_URL_NON_POOLING;

export const COOKIE = "ka_session";
const SESSION_DAYS = 30;

export function hasDatabase() {
  return Boolean(CONNECTION);
}

export function db() {
  if (!CONNECTION) {
    throw new Error("No database is connected to this project.");
  }
  return neon(CONNECTION);
}

/* Creates the tables the first time, and seeds the two settings we
   need. Safe to call on every request: everything is IF NOT EXISTS. */
export async function init() {
  const sql = db();

  await sql`
    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )`;

  await sql`
    CREATE TABLE IF NOT EXISTS quotes (
      id        TEXT PRIMARY KEY,
      issued_at TIMESTAMPTZ NOT NULL,
      data      JSONB NOT NULL
    )`;

  await sql`
    CREATE INDEX IF NOT EXISTS quotes_issued_at_idx
    ON quotes (issued_at DESC)`;

  // The access code starts as the one already in use
  await sql`
    INSERT INTO settings (key, value) VALUES ('access_code', ${
      process.env.ACCESS_CODE || "Kaguja7"
    })
    ON CONFLICT (key) DO NOTHING`;

  // A random key used to sign session cookies, generated once
  await sql`
    INSERT INTO settings (key, value) VALUES ('session_secret', ${crypto
      .randomBytes(32)
      .toString("hex")})
    ON CONFLICT (key) DO NOTHING`;
}

async function setting(key) {
  const sql  = db();
  const rows = await sql`SELECT value FROM settings WHERE key = ${key}`;
  return rows[0]?.value;
}

export async function accessCode() {
  return (await setting("access_code")) || "Kaguja7";
}

/* ---- Sessions ----
   The cookie is "<expiry>.<signature>". Without the secret, which
   never leaves the server, a signature cannot be forged. */

function sign(value, secret) {
  return crypto.createHmac("sha256", secret).update(value).digest("hex");
}

export async function newSession() {
  const secret  = await setting("session_secret");
  const expires = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  return String(expires) + "." + sign(String(expires), secret);
}

export async function isValidSession(token) {
  if (!token || typeof token !== "string") return false;

  const [expires, signature] = token.split(".");
  if (!expires || !signature) return false;

  if (Number(expires) < Date.now()) return false;

  const secret   = await setting("session_secret");
  if (!secret) return false;

  const expected = sign(expires, secret);

  // Constant-time compare, so timing cannot leak the signature
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function readCookie(req, name) {
  const header = req.headers.cookie;
  if (!header) return null;

  for (const part of header.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

export function sessionCookie(token) {
  return [
    COOKIE + "=" + encodeURIComponent(token),
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    "Max-Age=" + SESSION_DAYS * 24 * 60 * 60
  ].join("; ");
}

export function clearCookie() {
  return COOKIE + "=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0";
}

/* Guard for the endpoints that touch real data */
export async function requireSession(req, res) {
  const ok = await isValidSession(readCookie(req, COOKIE));
  if (!ok) {
    res.status(401).json({ error: "Not signed in" });
    return false;
  }
  return true;
}
