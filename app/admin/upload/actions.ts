"use server"

import { revalidatePath } from "next/cache"

import { audit, getSession } from "@/lib/auth"
import { reviewWarnings, type AiReview } from "@/lib/ai-review"
import type { Shipment } from "@/lib/data"
import { parseWorkbook, renormalize, type IngestReport } from "@/lib/ingest"
import { saveDataset } from "@/lib/store"

const ACCEPTED = [".xlsx", ".xls", ".csv", ".tsv", ".txt"]
const MAX_BYTES = 8 * 1024 * 1024

// ---------------------------------------------------------------------------
// Stage 1 — parse the workbook and run the AI review. Nothing is saved yet;
// the client shows an editable preview grid with the findings.
// ---------------------------------------------------------------------------

export interface AnalyzeState {
  error?: string
  fileName?: string
  report?: IngestReport
  shipments?: Shipment[]
  ai?: AiReview
}

export async function analyzeUpload(_prev: AnalyzeState, formData: FormData): Promise<AnalyzeState> {
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

  try {
    const buffer = Buffer.from(await file.arrayBuffer())
    const { shipments, report } = parseWorkbook(buffer, new Date().getFullYear())

    if (report.shipments === 0) {
      return { error: "No AWBs found in the file — check that it is the air-freight sheet." }
    }

    const ai = await reviewWarnings(report.warnings, shipments)
    await audit("dataset-analyzed", {
      user: session.u,
      file: file.name,
      shipments: String(report.shipments),
      warnings: String(report.warnings.length),
    })

    return { report, shipments, ai, fileName: file.name }
  } catch (err) {
    return { error: `Could not parse the file: ${err instanceof Error ? err.message : String(err)}` }
  }
}

// ---------------------------------------------------------------------------
// Stage 2 — commit the (possibly edited) rows as a new dataset version.
// ---------------------------------------------------------------------------

export interface CommitState {
  error?: string
  success?: boolean
  versionId?: number | null
  shipments?: number
  warnings?: string[]
}

export async function commitUpload(_prev: CommitState, formData: FormData): Promise<CommitState> {
  const session = await getSession()
  if (!session || (session.role !== "uploader" && session.role !== "admin")) {
    return { error: "Session expired or not permitted. Sign in again." }
  }

  const asOfRaw = String(formData.get("asOf") ?? "")
  const asOf = /^\d{4}-\d{2}-\d{2}$/.test(asOfRaw) ? asOfRaw : new Date().toISOString().slice(0, 10)
  const source = String(formData.get("source") ?? "edited upload").slice(0, 120)

  let rows: Shipment[]
  try {
    rows = JSON.parse(String(formData.get("rows") ?? "[]")) as Shipment[]
  } catch {
    return { error: "Could not read the edited rows — refresh and try again." }
  }
  if (!Array.isArray(rows) || rows.length === 0) {
    return { error: "Nothing to commit." }
  }

  try {
    const { shipments, warnings } = renormalize(rows)
    if (shipments.length === 0) {
      return { error: "All rows were dropped during validation — nothing committed." }
    }
    const versionId = await saveDataset(shipments, asOf, source, session.u, warnings)
    await audit("dataset-upload", {
      user: session.u,
      file: source,
      shipments: String(shipments.length),
      asOf,
      ...(versionId ? { versionId: String(versionId) } : {}),
    })
    revalidatePath("/dashboard")
    revalidatePath("/admin/upload")
    revalidatePath("/admin")
    return { success: true, versionId, shipments: shipments.length, warnings }
  } catch (err) {
    return { error: `Could not save: ${err instanceof Error ? err.message : String(err)}` }
  }
}
