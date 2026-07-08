// Dry-run parse of a DSR workbook — report only, no DB write.
// Usage: npx tsx scripts/dry-parse.ts <path-to-xlsx>
import { readFileSync } from "node:fs"

import { DESTINATIONS } from "../lib/airports"
import { parseWorkbook } from "../lib/ingest"

const src = process.argv[2] ?? "C:/Users/Manilal/Downloads/Intas DSR - 1.xlsx"
const { report, shipments } = parseWorkbook(readFileSync(src), 2026)

const { warnings, ...rest } = report
console.log(JSON.stringify(rest, null, 1))
console.log("warnings:", warnings.length)
warnings.slice(0, 30).forEach((w) => console.log(" ·", w))

const years: Record<string, number> = {}
for (const s of shipments) years[s.awbDate.slice(0, 4)] = (years[s.awbDate.slice(0, 4)] ?? 0) + 1
console.log("by year:", JSON.stringify(years))

const unmapped = [...new Set(shipments.filter((s) => !DESTINATIONS[s.destination]).map((s) => s.destination))]
console.log("unmapped dests:", unmapped.join(" | ") || "NONE")
