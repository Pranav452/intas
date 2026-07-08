import { DATA_AS_OF, SHIPMENTS, type Shipment } from "./data"
import { getSql, withRetry } from "./db"

export interface Dataset {
  shipments: Shipment[]
  asOf: string
  updatedAt: string | null
  source: string
  versionId: number | null
}

export interface DatasetVersion {
  id: number
  as_of: string
  source: string
  uploaded_at: string
  uploaded_by: string | null
  shipments_count: number
  pkgs: number
  chargeable_wt: number
  warnings: string[]
  active: boolean
}

function isoDate(value: string | Date): string {
  if (value instanceof Date) {
    // Neon returns `date` columns as JS Dates at local midnight — use local
    // components; toISOString() would shift the day back in UTC+ timezones.
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`
  }
  return String(value).slice(0, 10)
}

const BUILTIN: Dataset = {
  shipments: SHIPMENTS,
  asOf: DATA_AS_OF,
  updatedAt: null,
  source: "built-in snapshot",
  versionId: null,
}

/** Live dataset: active version in Neon, else the built-in snapshot. */
export async function loadDataset(): Promise<Dataset> {
  const sql = getSql()
  if (sql) {
    try {
      const rows = (await withRetry(() => sql`
        SELECT id, as_of, source, uploaded_at, shipments
        FROM intas_dataset_versions WHERE active = true
        ORDER BY uploaded_at DESC LIMIT 1
      `)) as { id: number; as_of: string | Date; source: string; uploaded_at: string; shipments: Shipment[] }[]
      if (rows.length > 0) {
        const row = rows[0]
        return {
          shipments: row.shipments,
          asOf: isoDate(row.as_of),
          updatedAt: row.uploaded_at,
          source: row.source,
          versionId: row.id,
        }
      }
    } catch (err) {
      console.error("loadDataset db error:", err)
    }
  }
  return BUILTIN
}

/** Append a new version and make it active. Previous versions stay for rollback. */
export async function saveDataset(
  shipments: Shipment[],
  asOf: string,
  source: string,
  uploadedBy: string | null,
  warnings: string[] = [],
): Promise<number | null> {
  const sql = getSql()
  if (!sql) throw new Error("Database not configured")

  const weighable = shipments.filter((s) => !s.excludeFromWeights)
  const pkgs = shipments.reduce((a, s) => a + s.pkgs, 0)
  const chargeable = Math.round(weighable.reduce((a, s) => a + s.chargeableWt, 0))

  const inserted = (await withRetry(() => sql`
    INSERT INTO intas_dataset_versions
      (as_of, source, uploaded_by, shipments_count, pkgs, chargeable_wt, warnings, shipments, active)
    VALUES
      (${asOf}, ${source}, ${uploadedBy}, ${shipments.length}, ${pkgs}, ${chargeable},
       ${JSON.stringify(warnings)}::jsonb, ${JSON.stringify(shipments)}::jsonb, false)
    RETURNING id
  `)) as { id: number }[]
  const id = inserted[0].id
  await activateVersion(id)
  return id
}

export async function listVersions(): Promise<DatasetVersion[]> {
  const sql = getSql()
  if (!sql) return []
  const rows = (await withRetry(() => sql`
    SELECT id, as_of, source, uploaded_at, uploaded_by,
           shipments_count, pkgs, chargeable_wt, warnings, active
    FROM intas_dataset_versions ORDER BY uploaded_at DESC
  `)) as (Omit<DatasetVersion, "as_of" | "warnings"> & { as_of: string | Date; warnings: unknown })[]
  return rows.map((r) => ({
    ...r,
    as_of: isoDate(r.as_of),
    warnings: Array.isArray(r.warnings) ? (r.warnings as string[]) : [],
  }))
}

export async function activateVersion(id: number): Promise<void> {
  const sql = getSql()
  if (!sql) throw new Error("Database not configured")
  await withRetry(() =>
    sql.transaction([
      sql`UPDATE intas_dataset_versions SET active = false WHERE active = true`,
      sql`UPDATE intas_dataset_versions SET active = true WHERE id = ${id}`,
    ]),
  )
}
