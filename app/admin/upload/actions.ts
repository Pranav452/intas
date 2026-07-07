"use server"

import { revalidatePath } from "next/cache"

import { audit, getSession } from "@/lib/auth"
import { parseWorkbook, type IngestReport } from "@/lib/ingest"
import { saveDataset } from "@/lib/store"

export interface UploadState {
  error?: string
  fileName?: string
  asOf?: string
  report?: IngestReport
}

const ACCEPTED = [".xlsx", ".xls", ".csv", ".tsv", ".txt"]
const MAX_BYTES = 8 * 1024 * 1024

export async function ingestUpload(_prev: UploadState, formData: FormData): Promise<UploadState> {
  const session = await getSession()
  if (!session || (session.role !== "uploader" && session.role !== "admin")) {
    return { error: "Session expired or not permitted. Sign in again." }
  }

  const file = formData.get("file")
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose the air-freight sheet file first." }
  }
  const name = file.name.toLowerCase()
  if (!ACCEPTED.some((ext) => name.endsWith(ext))) {
    return { error: `Unsupported file type. Accepted: ${ACCEPTED.join(", ")}` }
  }
  if (file.size > MAX_BYTES) {
    return { error: "File is larger than 8 MB." }
  }

  const asOfRaw = String(formData.get("asOf") ?? "")
  const asOf = /^\d{4}-\d{2}-\d{2}$/.test(asOfRaw) ? asOfRaw : new Date().toISOString().slice(0, 10)

  try {
    const buffer = Buffer.from(await file.arrayBuffer())
    const { shipments, report } = parseWorkbook(buffer, Number(asOf.slice(0, 4)))

    if (report.shipments === 0) {
      return { error: "No AWBs found in the file — check that it is the air-freight sheet." }
    }

    const versionId = await saveDataset(shipments, asOf, file.name, session.u, report.warnings)
    await audit("dataset-upload", {
      user: session.u,
      file: file.name,
      shipments: String(report.shipments),
      asOf,
      ...(versionId ? { versionId: String(versionId) } : {}),
    })
    revalidatePath("/dashboard")
    revalidatePath("/admin/upload")
    revalidatePath("/admin")

    return { report, asOf, fileName: file.name }
  } catch (err) {
    return { error: `Could not parse the file: ${err instanceof Error ? err.message : String(err)}` }
  }
}
