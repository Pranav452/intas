"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import {
  DEVICE_COOKIE,
  SESSION_COOKIE,
  audit,
  checkDevice,
  clearFailures,
  createIpRequest,
  createSessionToken,
  ipAllowedForClient,
  rateLimited,
  recordFailure,
  requestIdentity,
  verifyUser,
} from "@/lib/auth"

export interface LoginState {
  error?: string
  ipBlocked?: boolean
  blockedIp?: string
}

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const user = String(formData.get("user") ?? "").trim()
  const pass = String(formData.get("password") ?? "")
  const fromRaw = String(formData.get("from") ?? "")

  const { ip } = await requestIdentity()

  if (rateLimited(ip)) {
    await audit("login-rate-limited", { user })
    return { error: "Too many attempts. Try again in a few minutes." }
  }

  const verified = await verifyUser(user, pass)
  if (!verified) {
    recordFailure(ip)
    await audit("login-failed", { user })
    return { error: "Invalid login ID or password." }
  }

  const cookieStore = await cookies()
  let deviceId = cookieStore.get(DEVICE_COOKIE)?.value ?? ""

  if (verified.role === "client") {
    if (!(await ipAllowedForClient(ip))) {
      await audit("login-blocked-ip", { user })
      return {
        error: "This network is not authorised for the INTAS portal yet.",
        ipBlocked: true,
        blockedIp: ip,
      }
    }
    const device = await checkDevice(deviceId || undefined)
    if (!device.ok) {
      await audit("login-blocked-device", { user })
      return {
        error: "This device is not authorised for the INTAS portal. Contact LINKS to register it.",
      }
    }
    deviceId = device.deviceId
    await audit(device.isNew ? "login-ok-new-device" : "login-ok", { user, deviceId })
  } else {
    if (!deviceId) deviceId = verified.role
    await audit(`login-ok-${verified.role}`, { user })
  }

  clearFailures(ip)

  const secure = process.env.NODE_ENV === "production"
  if (verified.role === "client") {
    cookieStore.set(DEVICE_COOKIE, deviceId, {
      httpOnly: true,
      secure,
      sameSite: "lax",
      path: "/",
      maxAge: 400 * 24 * 3600,
    })
  }
  cookieStore.set(SESSION_COOKIE, createSessionToken(user, verified.role, deviceId), {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
  })

  const roleHome = verified.role === "admin" ? "/admin" : "/dashboard"
  const from = fromRaw.startsWith("/") && !fromRaw.startsWith("//") ? fromRaw : roleHome
  const target = verified.role === "client" && from.startsWith("/admin") ? "/dashboard" : from
  redirect(target)
}

export async function logout(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
  await audit("logout")
  redirect("/")
}

export interface IpRequestState {
  error?: string
  success?: boolean
}

export async function requestIpAccess(_prev: IpRequestState, formData: FormData): Promise<IpRequestState> {
  const user = String(formData.get("user") ?? "").trim()
  const note = String(formData.get("note") ?? "").trim().slice(0, 300)
  if (!user) {
    return { error: "Enter your login ID above first, then request access." }
  }
  const { ip, userAgent } = await requestIdentity()
  try {
    await createIpRequest(user, ip, userAgent, note || null)
    await audit("ip-access-requested", { user, ip })
    return { success: true }
  } catch {
    return { error: "Could not submit the request. Try again in a moment." }
  }
}
