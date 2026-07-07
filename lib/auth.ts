import { createHmac, randomUUID, timingSafeEqual } from "node:crypto"
import { cookies, headers } from "next/headers"

import { getSql } from "./db"
import { verifyPassword } from "./password"

// INTAS portal auth. Shares the Neon database with the VIPAR app but uses its
// own tables (intas_users, intas_devices, intas_allowed_ips, intas_access_log),
// its own cookie names and its own AUTH_SECRET so sessions cannot cross apps.

const FALLBACK_CLIENT_USER = process.env.INTAS_USER ?? "intas"
const FALLBACK_CLIENT_PASS = process.env.INTAS_PASS ?? "intas"
const FALLBACK_UPLOADER_USER = process.env.INTAS_UPLOADER_USER ?? "upload"
const FALLBACK_UPLOADER_PASS = process.env.INTAS_UPLOADER_PASS ?? "upload"
const FALLBACK_ADMIN_USER = process.env.INTAS_ADMIN_USER ?? "admin"
const FALLBACK_ADMIN_PASS = process.env.INTAS_ADMIN_PASS ?? "123456"
const AUTH_SECRET = process.env.AUTH_SECRET ?? "intas-links-dev-secret-change-me"
const MAX_DEVICES = Number(process.env.MAX_DEVICES ?? 3)
const SESSION_HOURS = Number(process.env.SESSION_HOURS ?? 24 * 7)

export const SESSION_COOKIE = "intas_session"
export const DEVICE_COOKIE = "intas_device"

export type Role = "client" | "uploader" | "admin"

// ---------------------------------------------------------------------------
// Signed session tokens (HMAC-SHA256, stateless)
// ---------------------------------------------------------------------------

export interface SessionPayload {
  u: string
  role: Role
  device: string
  exp: number
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url")
}

function sign(data: string): string {
  return createHmac("sha256", AUTH_SECRET).update(data).digest("base64url")
}

export function createSessionToken(user: string, role: Role, deviceId: string): string {
  const payload: SessionPayload = {
    u: user,
    role,
    device: deviceId,
    exp: Date.now() + SESSION_HOURS * 3600_000,
  }
  const body = b64url(JSON.stringify(payload))
  return `${body}.${sign(body)}`
}

export function verifySessionToken(token?: string | null): SessionPayload | null {
  if (!token) return null
  const dot = token.lastIndexOf(".")
  if (dot < 0) return null
  const body = token.slice(0, dot)
  const sig = token.slice(dot + 1)
  const a = Buffer.from(sig)
  const b = Buffer.from(sign(body))
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as SessionPayload
    if (typeof payload.exp !== "number" || payload.exp < Date.now()) return null
    if (payload.role !== "admin" && payload.role !== "uploader" && payload.role !== "client") {
      payload.role = "client"
    }
    return payload
  } catch {
    return null
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  return verifySessionToken(token)
}

export async function requireAdmin(): Promise<SessionPayload | null> {
  const session = await getSession()
  return session?.role === "admin" ? session : null
}

// ---------------------------------------------------------------------------
// User verification — intas_users table, hardcoded fallback without DB
// ---------------------------------------------------------------------------

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a)
  const bb = Buffer.from(b)
  return ba.length === bb.length && timingSafeEqual(ba, bb)
}

export async function verifyUser(username: string, password: string): Promise<{ role: Role } | null> {
  const sql = getSql()
  if (sql) {
    try {
      const rows = (await sql`
        SELECT password_hash, role FROM intas_users WHERE username = ${username}
      `) as { password_hash: string; role: Role }[]
      if (rows.length === 0) return null
      return verifyPassword(password, rows[0].password_hash) ? { role: rows[0].role } : null
    } catch (err) {
      console.error("verifyUser db error:", err)
      return null
    }
  }
  if (safeEqual(username, FALLBACK_CLIENT_USER) && safeEqual(password, FALLBACK_CLIENT_PASS)) {
    return { role: "client" }
  }
  if (safeEqual(username, FALLBACK_UPLOADER_USER) && safeEqual(password, FALLBACK_UPLOADER_PASS)) {
    return { role: "uploader" }
  }
  if (safeEqual(username, FALLBACK_ADMIN_USER) && safeEqual(password, FALLBACK_ADMIN_PASS)) {
    return { role: "admin" }
  }
  return null
}

// ---------------------------------------------------------------------------
// Request identity
// ---------------------------------------------------------------------------

export async function requestIdentity(): Promise<{ ip: string; userAgent: string }> {
  const h = await headers()
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "unknown"
  return { ip, userAgent: h.get("user-agent") ?? "unknown" }
}

const LOCAL_IPS = new Set(["127.0.0.1", "::1", "unknown"])

export function isLocalIp(ip: string): boolean {
  return LOCAL_IPS.has(ip)
}

// ---------------------------------------------------------------------------
// IP allowlist — managed from the admin panel. Empty list = every IP allowed.
// Applies to CLIENT sign-ins only, so admins can't lock themselves out.
// ---------------------------------------------------------------------------

export interface AllowedIp {
  id: number
  ip: string
  label: string | null
  created_at: string
}

export async function listAllowedIps(): Promise<AllowedIp[]> {
  const sql = getSql()
  if (!sql) return []
  return (await sql`SELECT id, ip, label, created_at FROM intas_allowed_ips ORDER BY id`) as AllowedIp[]
}

export async function ipAllowedForClient(ip: string): Promise<boolean> {
  if (isLocalIp(ip)) return true
  const rules = await listAllowedIps()
  if (rules.length === 0) return true
  return rules.some((r) => (r.ip.endsWith(".") ? ip.startsWith(r.ip) : ip === r.ip))
}

// ---------------------------------------------------------------------------
// Device registry — trust-on-first-use, capped at MAX_DEVICES, client role only
// ---------------------------------------------------------------------------

export interface DeviceRecord {
  id: string
  firstSeen: string
  ip: string
  userAgent: string
}

export async function listDevices(): Promise<DeviceRecord[]> {
  const sql = getSql()
  if (!sql) return []
  const rows = (await sql`
    SELECT id, first_seen, ip, user_agent FROM intas_devices ORDER BY first_seen
  `) as { id: string; first_seen: string; ip: string; user_agent: string }[]
  return rows.map((r) => ({ id: r.id, firstSeen: r.first_seen, ip: r.ip, userAgent: r.user_agent }))
}

export async function removeDevice(id: string): Promise<void> {
  const sql = getSql()
  if (!sql) return
  await sql`DELETE FROM intas_devices WHERE id = ${id}`
}

export type DeviceCheck =
  | { ok: true; deviceId: string; isNew: boolean }
  | { ok: false; reason: "device-limit" }

export async function checkDevice(existingDeviceId?: string): Promise<DeviceCheck> {
  const sql = getSql()
  if (!sql) {
    // No DB — skip device binding rather than lock everyone out.
    return { ok: true, deviceId: existingDeviceId || randomUUID(), isNew: false }
  }
  const devices = await listDevices()

  if (existingDeviceId && devices.some((d) => d.id === existingDeviceId)) {
    return { ok: true, deviceId: existingDeviceId, isNew: false }
  }

  if (devices.length >= MAX_DEVICES) {
    return { ok: false, reason: "device-limit" }
  }

  const { ip, userAgent } = await requestIdentity()
  const id = randomUUID()
  await sql`
    INSERT INTO intas_devices (id, first_seen, ip, user_agent)
    VALUES (${id}, now(), ${ip}, ${userAgent})
  `
  return { ok: true, deviceId: id, isNew: true }
}

// ---------------------------------------------------------------------------
// Audit log
// ---------------------------------------------------------------------------

export interface AuditRow {
  ts: string
  event: string
  username: string | null
  ip: string | null
  user_agent: string | null
  meta: Record<string, string> | null
}

export async function audit(event: string, extra: Record<string, string> = {}): Promise<void> {
  try {
    const sql = getSql()
    if (!sql) return
    const { ip, userAgent } = await requestIdentity()
    const { user, ...meta } = extra
    await sql`
      INSERT INTO intas_access_log (event, username, ip, user_agent, meta)
      VALUES (${event}, ${user ?? null}, ${ip}, ${userAgent}, ${JSON.stringify(meta)}::jsonb)
    `
  } catch {
    // audit logging must never break the login flow
  }
}

export async function recentAuditRows(limit = 30): Promise<AuditRow[]> {
  const sql = getSql()
  if (!sql) return []
  return (await sql`
    SELECT ts, event, username, ip, user_agent, meta
    FROM intas_access_log ORDER BY id DESC LIMIT ${limit}
  `) as AuditRow[]
}

// ---------------------------------------------------------------------------
// Login rate limiting (in-memory)
// ---------------------------------------------------------------------------

const attempts = new Map<string, { count: number; resetAt: number }>()
const WINDOW_MS = 10 * 60_000
const MAX_ATTEMPTS = 5

export function rateLimited(ip: string): boolean {
  const entry = attempts.get(ip)
  if (!entry || entry.resetAt < Date.now()) return false
  return entry.count >= MAX_ATTEMPTS
}

export function recordFailure(ip: string): void {
  const now = Date.now()
  const entry = attempts.get(ip)
  if (!entry || entry.resetAt < now) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS })
  } else {
    entry.count += 1
  }
}

export function clearFailures(ip: string): void {
  attempts.delete(ip)
}
