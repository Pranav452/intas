// Import a DSR workbook straight into the database as a new ACTIVE version.
// Usage: npx tsx scripts/import-file.ts <path-to-xlsx> [asOf YYYY-MM-DD]

import { readFileSync, existsSync } from "node:fs"
import path from "node:path"

import { parseWorkbook } from "../lib/ingest"
import { saveDataset } from "../lib/store"

function loadEnvLocal(): void {
  const file = path.join(process.cwd(), ".env.local")
  if (!existsSync(file)) return
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/)
    if (!m) continue
    const [, key, rawValue] = m
    if (process.env[key] !== undefined) continue
    process.env[key] = rawValue.replace(/^["']|["']$/g, "")
  }
}

async function main() {
  loadEnvLocal()
  const src = process.argv[2]
  if (!src || !existsSync(src)) {
    console.error("Usage: npx tsx scripts/import-file.ts <path-to-xlsx> [asOf]")
    process.exit(1)
  }
  const asOf = /^\d{4}-\d{2}-\d{2}$/.test(process.argv[3] ?? "")
    ? process.argv[3]
    : new Date().toISOString().slice(0, 10)

  const { shipments, report } = parseWorkbook(readFileSync(src), Number(asOf.slice(0, 4)))

  console.log(
    `Parsed ${report.sheets} sheets · ${report.shipments} AWBs · ${report.pkgs} pkgs · ${report.chargeableWt} kg chargeable (${report.grossWt} gross)`,
  )
  console.log(`Rows: ${report.totalRows} total · ${report.skippedRows} skipped · ${report.mergedDuplicates} duplicates merged`)
  if (report.warnings.length) {
    console.log(`\n${report.warnings.length} warnings:`)
    for (const w of report.warnings) console.log("  ·", w)
  }

  const versionId = await saveDataset(shipments, asOf, path.basename(src), "admin", report.warnings)
  console.log(`\nSaved as version #${versionId} (active) · data as of ${asOf}`)
}

main().catch((err) => {
  console.error("Import failed:", err)
  process.exit(1)
})
