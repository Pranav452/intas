import * as XLSX from "xlsx"

import { DESTINATIONS } from "./airports"
import type { FlightLeg, Shipment } from "./data"

// Parser for the LINKS air-freight operations sheet (INTAS DSR).
// Accepts .xlsx/.xls/.csv/.tsv exports; normalises the messy bits:
// dot-dates, four INVOICE NO columns, multi-leg flight strings, "/"-separated
// HAWB/SB lists, duplicate AWB rows, ETA-before-ETD month typos.

export interface IngestReport {
  totalRows: number
  parsedRows: number
  shipments: number
  skippedRows: number
  mergedDuplicates: number
  pkgs: number
  grossWt: number
  chargeableWt: number
  warnings: string[]
}

export interface IngestResult {
  shipments: Shipment[]
  report: IngestReport
}

// AWB prefix → operating carrier (used only to warn on mismatches)
const AWB_PREFIX: Record<string, string> = {
  "020": "LH", "074": "KL", "235": "TK", "932": "VS", "057": "AF", "176": "EK", "055": "AZ",
}

const MAX_WARNINGS = 50

// Collapse to bare uppercase letters: "R E M A R K" → "REMARK", "GR. WT." → "GRWT"
function normHeader(v: unknown): string {
  return String(v ?? "")
    .toUpperCase()
    .replace(/[\s.]+/g, "")
}

function cellStr(v: unknown): string {
  if (v === null || v === undefined) return ""
  return String(v).replace(/\s+/g, " ").trim()
}

function cellNum(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v
  const n = Number(String(v ?? "").replace(/[, ]/g, ""))
  return Number.isFinite(n) ? n : 0
}

/** Parse DD.MM.YYYY / DD-MM-YYYY / DD/MM/YYYY / Excel serial → ISO or null. */
function parseDate(v: unknown, fallbackYear: number): string | null {
  if (v === null || v === undefined || v === "") return null
  if (typeof v === "number" && v > 20000 && v < 80000) {
    // Excel serial (epoch 30 Dec 1899)
    const ms = Math.round((v - 25569) * 86_400_000)
    return new Date(ms).toISOString().slice(0, 10)
  }
  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    return `${v.getFullYear()}-${String(v.getMonth() + 1).padStart(2, "0")}-${String(v.getDate()).padStart(2, "0")}`
  }
  const s = cellStr(v)
  const m = s.match(/^(\d{1,2})[./-](\d{1,2})(?:[./-](\d{2,4}))?/)
  if (!m) return null
  const d = Number(m[1])
  const mo = Number(m[2])
  let y = m[3] ? Number(m[3]) : fallbackYear
  if (y < 100) y += 2000
  if (d < 1 || d > 31 || mo < 1 || mo > 12) return null
  return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`
}

function addMonths(iso: string, months: number): string {
  const [y, m, d] = iso.split("-").map(Number)
  const date = new Date(Date.UTC(y, m - 1 + months, d))
  return date.toISOString().slice(0, 10)
}

/** "LH:8023/03.06.2026-FRA  LH-7658S/04.06.2026-LYS" → FlightLeg[] */
function parseLegs(raw: string, fallbackYear: number): FlightLeg[] {
  const legs: FlightLeg[] = []
  const re = /([A-Z]{2})[\s:.-]{0,3}(\w{1,6})\s*\/\s*(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})[\s-]*([A-Z]{3})/g
  let m: RegExpExecArray | null
  while ((m = re.exec(raw)) !== null) {
    legs.push({
      carrier: m[1],
      flightNo: m[2],
      date: parseDate(m[3], fallbackYear),
      to: m[4],
    })
  }
  // Same flight listed twice (e.g. LH494/23.06 and LH494/25.06) — keep the latest date.
  const byKey = new Map<string, FlightLeg>()
  for (const leg of legs) {
    const key = `${leg.carrier}${leg.flightNo}-${leg.to}`
    const prev = byKey.get(key)
    if (!prev || (leg.date ?? "") > (prev.date ?? "")) byKey.set(key, leg)
  }
  return [...byKey.values()]
}

function splitList(raw: string): string[] {
  return raw
    .split(/[\/,]/)
    .map((s) => s.trim())
    .filter(Boolean)
}

function filledCount(s: Shipment): number {
  return Object.values(s).filter((v) =>
    Array.isArray(v) ? v.length > 0 : v !== null && v !== undefined && v !== "" && v !== 0 && v !== false,
  ).length
}

export function parseWorkbook(buffer: Buffer | ArrayBuffer, fallbackYear: number): IngestResult {
  // raw:true stops the CSV/TSV parser from date-guessing "03.06.2026" as US
  // March 6th — we parse all dates ourselves (DD.MM.YYYY).
  const wb = XLSX.read(buffer, {
    type: buffer instanceof ArrayBuffer ? "array" : "buffer",
    raw: true,
    cellDates: false,
  })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true, defval: "" })

  const warnings: string[] = []
  const warn = (msg: string) => {
    if (warnings.length < MAX_WARNINGS) warnings.push(msg)
  }

  // Locate the header row and map columns
  const headerIdx = rows.findIndex(
    (r) => r.some((c) => normHeader(c).includes("CONSIGNEE")) && r.some((c) => normHeader(c).includes("AWB")),
  )
  if (headerIdx < 0) {
    throw new Error("Could not find the header row (needs CONSIGNEE and AWB columns).")
  }
  const header = rows[headerIdx].map(normHeader)

  // Exact header match wins (avoids "ETA" matching inside "…VESSELDETAILS"),
  // then fall back to substring matching on every needle.
  const col = (...needles: string[]): number => {
    if (needles.length === 1) {
      const exact = header.findIndex((h) => h === needles[0])
      if (exact >= 0) return exact
    }
    return header.findIndex((h) => needles.every((n) => h.includes(n)))
  }
  const cols = (needle: string): number[] =>
    header.map((h, i) => (h.includes(needle) ? i : -1)).filter((i) => i >= 0)

  const C = {
    sr: col("SR"),
    month: col("MONTH"),
    invoices: cols("INVOICE"),
    consignee: col("CONSIGNEE"),
    origin: col("LOADING"),
    destination: col("DESTINATION"),
    pkgs: col("PKGS"),
    gross: col("GR", "WT"),
    chargeable: col("CHARGEABLE"),
    airline: col("AIRLINE"),
    awb: col("AWB", "NO"),
    hawb: col("HAWB"),
    awbDate: col("AWB", "DATE"),
    flights: col("FLIGHT"),
    etd: col("ETD"),
    eta: col("ETA"),
    egmNo: col("EGM", "NO"),
    egmDate: col("EGM", "DATE"),
    sbNo: col("SHIPPING", "NO"),
    sbDate: col("SHIPPING", "DT"),
    remark: col("REMARK"),
  }
  if (C.awb < 0 || C.consignee < 0 || C.destination < 0) {
    throw new Error("Sheet is missing required columns (AWB/BL NO., CONSIGNEE, DESTINATION PORT).")
  }

  const parsed: Shipment[] = []
  let skippedRows = 0

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i]
    if (!row || row.every((c) => cellStr(c) === "")) continue // fully empty grid rows

    const awbRaw = cellStr(row[C.awb])
    const consignee = cellStr(row[C.consignee]).toUpperCase()
    if (!awbRaw && !consignee) {
      continue
    }
    if (!awbRaw) {
      skippedRows++
      warn(`Row ${i + 1}: no AWB number — row skipped (consignee "${consignee}").`)
      continue
    }

    const sr = Math.round(cellNum(row[C.sr])) || parsed.length + 1
    const destination = cellStr(row[C.destination]).toUpperCase()
    if (destination && !DESTINATIONS[destination]) {
      warn(`AWB ${awbRaw}: destination "${destination}" has no airport mapping — counted, but won't plot on the globe.`)
    }

    const originRaw = cellStr(row[C.origin]).toUpperCase()
    const origin: Shipment["origin"] = originRaw.includes("DELHI") ? "DELHI" : "MUMBAI"
    if (originRaw && !originRaw.includes("DELHI") && !originRaw.includes("MUMBAI")) {
      warn(`AWB ${awbRaw}: loading port "${originRaw}" unknown — treated as Mumbai.`)
    }

    const awbDate = parseDate(row[C.awbDate], fallbackYear) ?? parseDate(row[C.month], fallbackYear)
    if (!awbDate) {
      skippedRows++
      warn(`AWB ${awbRaw}: no parseable AWB date — row skipped.`)
      continue
    }

    const etd = parseDate(row[C.etd], fallbackYear)
    let eta = parseDate(row[C.eta], fallbackYear)
    if (etd && eta && eta < etd) {
      let fixed = eta
      for (let k = 0; k < 2 && fixed < etd; k++) fixed = addMonths(fixed, 1)
      if (fixed >= etd) {
        warn(`AWB ${awbRaw}: ETA ${eta} is before ETD ${etd} — corrected to ${fixed} (month typo).`)
        eta = fixed
      } else {
        warn(`AWB ${awbRaw}: ETA ${eta} is before ETD ${etd} and could not be auto-corrected.`)
      }
    }

    const airline = cellStr(row[C.airline]).toUpperCase().slice(0, 2)
    const prefix = awbRaw.slice(0, 3)
    if (airline && AWB_PREFIX[prefix] && AWB_PREFIX[prefix] !== airline) {
      warn(`AWB ${awbRaw}: airline column says ${airline} but prefix ${prefix} belongs to ${AWB_PREFIX[prefix]} — kept ${airline}.`)
    }

    const grossWt = cellNum(row[C.gross])
    const chargeableWt = cellNum(row[C.chargeable])
    let flag: string | undefined
    let excludeFromWeights: boolean | undefined
    if (grossWt > 0 && chargeableWt > 0 && chargeableWt < grossWt / 10) {
      flag = `Weight pair implausible in sheet (gross ${grossWt} / chg ${chargeableWt}) — excluded from weight totals`
      excludeFromWeights = true
      warn(`AWB ${awbRaw}: ${flag.toLowerCase()}.`)
    }

    const invoices = C.invoices.flatMap((ci) => splitList(cellStr(row[ci])))

    parsed.push({
      sr,
      date: parseDate(row[C.month], fallbackYear) ?? awbDate,
      invoices,
      consignee,
      origin,
      destination,
      pkgs: Math.round(cellNum(row[C.pkgs])),
      grossWt,
      chargeableWt,
      airline,
      awb: awbRaw,
      hawb: C.hawb >= 0 ? splitList(cellStr(row[C.hawb])) : [],
      awbDate,
      legs: C.flights >= 0 ? parseLegs(String(row[C.flights] ?? ""), fallbackYear) : [],
      etd,
      eta,
      egmNo: C.egmNo >= 0 ? cellStr(row[C.egmNo]) || null : null,
      egmDate: C.egmDate >= 0 ? parseDate(row[C.egmDate], fallbackYear) : null,
      sbNos: C.sbNo >= 0 ? splitList(cellStr(row[C.sbNo])) : [],
      sbDate: C.sbDate >= 0 ? parseDate(row[C.sbDate], fallbackYear) : null,
      remark: C.remark >= 0 ? cellStr(row[C.remark]) || null : null,
      ...(flag ? { flag, excludeFromWeights } : {}),
    })
  }

  // Merge duplicate AWB rows — keep the most complete
  const byAwb = new Map<string, Shipment>()
  let mergedDuplicates = 0
  for (const s of parsed) {
    const existing = byAwb.get(s.awb)
    if (!existing) {
      byAwb.set(s.awb, s)
      continue
    }
    mergedDuplicates++
    const winner = filledCount(s) >= filledCount(existing) ? s : existing
    const loser = winner === s ? existing : s
    // fill any gaps in the winner from the loser
    const merged: Shipment = { ...winner }
    for (const key of Object.keys(loser) as (keyof Shipment)[]) {
      const w = merged[key]
      const l = loser[key]
      if ((w === null || w === "" || (Array.isArray(w) && w.length === 0) || w === 0) && l) {
        // @ts-expect-error narrow assignment across union of field types
        merged[key] = l
      }
    }
    byAwb.set(s.awb, merged)
    warn(`AWB ${s.awb}: duplicate row merged (kept the most complete entry).`)
  }

  const shipments = [...byAwb.values()].sort((a, b) => a.awbDate.localeCompare(b.awbDate) || a.sr - b.sr)

  const weighable = shipments.filter((s) => !s.excludeFromWeights)
  const report: IngestReport = {
    totalRows: rows.length - headerIdx - 1,
    parsedRows: parsed.length,
    shipments: shipments.length,
    skippedRows,
    mergedDuplicates,
    pkgs: shipments.reduce((a, s) => a + s.pkgs, 0),
    grossWt: Math.round(weighable.reduce((a, s) => a + s.grossWt, 0)),
    chargeableWt: Math.round(weighable.reduce((a, s) => a + s.chargeableWt, 0)),
    warnings,
  }

  return { shipments, report }
}
