"use server"

import { revalidatePath } from "next/cache"

import { audit, requireAdmin, removeDevice, resolveIpRequest } from "@/lib/auth"
import { getSql, withRetry } from "@/lib/db"
import { activateVersion } from "@/lib/store"

function refresh() {
  revalidatePath("/admin")
  revalidatePath("/dashboard")
  revalidatePath("/admin/upload")
}

export async function rollbackToVersion(formData: FormData): Promise<void> {
  const session = await requireAdmin()
  if (!session) return
  const id = Number(formData.get("id"))
  if (!Number.isInteger(id) || id <= 0) return
  await activateVersion(id)
  await audit("dataset-rollback", { user: session.u, versionId: String(id) })
  refresh()
}

export async function addAllowedIp(formData: FormData): Promise<void> {
  const session = await requireAdmin()
  if (!session) return
  const sql = getSql()
  if (!sql) return
  const ip = String(formData.get("ip") ?? "").trim()
  const label = String(formData.get("label") ?? "").trim() || null
  if (!/^[0-9a-fA-F.:]{2,45}$/.test(ip)) return
  await withRetry(() => sql`
    INSERT INTO intas_allowed_ips (ip, label) VALUES (${ip}, ${label})
    ON CONFLICT (ip) DO UPDATE SET label = EXCLUDED.label
  `)
  await audit("ip-allowlist-add", { user: session.u, ip })
  refresh()
}

export async function deleteAllowedIp(formData: FormData): Promise<void> {
  const session = await requireAdmin()
  if (!session) return
  const sql = getSql()
  if (!sql) return
  const id = Number(formData.get("id"))
  if (!Number.isInteger(id)) return
  const rows = (await withRetry(() => sql`DELETE FROM intas_allowed_ips WHERE id = ${id} RETURNING ip`)) as { ip: string }[]
  await audit("ip-allowlist-remove", { user: session.u, ip: rows[0]?.ip ?? String(id) })
  refresh()
}

export async function resolveIpRequestAction(formData: FormData): Promise<void> {
  const session = await requireAdmin()
  if (!session) return
  const id = Number(formData.get("id"))
  const action = formData.get("action") === "approve" ? "approve" : "deny"
  if (!Number.isInteger(id) || id <= 0) return
  await resolveIpRequest(id, action, session.u)
  await audit(`ip-request-${action}d`, { user: session.u, requestId: String(id) })
  refresh()
}

export async function deleteDevice(formData: FormData): Promise<void> {
  const session = await requireAdmin()
  if (!session) return
  const id = String(formData.get("id") ?? "")
  if (!id) return
  await removeDevice(id)
  await audit("device-removed", { user: session.u, deviceId: id })
  refresh()
}
