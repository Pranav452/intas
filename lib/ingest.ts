import * as XLSX from "xlsx"

import { DESTINATIONS, ORIGINS, canonDestination } from "./airports"
import type { FlightLeg, Shipment } from "./data"

// Parser for the Intas DSR workbook. Handles BOTH sheet generations:
//  · the old single-tab export (4× "INVOICE NO." columns, LOADING PORT,
//    HAWB/EGM columns), and
//  · the full multi-tab DSR (FEB-24 … JUNE-26): one tab per month, columns
//    SR NO | MONTH | INVOICE NO. | INVOICE DT. | CONSIGNEE | ORIGIN |
//    DESTINATION | NO OF PKG | GR. WT. | CHARGEABLE WT. | AIRLINE |
//    AWB/BL NO. | AWB DATE | FLIGHT DETAILS | ETD | ETA/ATA | SB NO | SB DT | REMARK
// Every sheet is parsed and merged; duplicates collapse by AWB + date.

export interface IngestReport {
  sheets: number
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

const AWB_PREFIX: Record<string, string> = {
  "020": "LH", "074": "KL", "235": "TK", "932": "VS", "057": "AF", "176": "EK", "055": "AZ",
  "157": "QR", "607": "EY", "618": "SQ", "098": "AI", "071": "ET", "217": "TG", "232": "MH",
}

const MAX_WARNINGS = 60

// "R E M A R K" → "REMARK", "GR. WT." → "GRWT"
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
  if (y < 1900 || y > 2100) y = fallbackYear // e.g. "205" typo years
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
  const re = /([A-Z0-9]{2})[\s:.-]{0,3}(\w{1,6})\s*\/\s*(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})[\s-]*([A-Z]{3})/g
  let m: RegExpExecArray | null
  while ((m = re.exec(raw.toUpperCase())) !== null) {
    legs.push({
      carrier: m[1],
      flightNo: m[2],
      date: parseDate(m[3], fallbackYear),
      to: m[4],
    })
  }
  // Same flight listed twice — keep the latest date.
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

/** "MARCH-25" / "JAN -25" / "APRIL-26 " → fallback year for date cells missing one. */
function sheetYear(name: string, defaultYear: number): number {
  const m = name.match(/-\s*(\d{2})\s*$/)
  return m ? 2000 + Number(m[1]) : defaultYear
}

/**
 * Re-normalise rows after the uploader edits them in the preview grid:
 * destinations re-canonicalised, legs re-parsed from the (possibly edited)
 * flight-details text, numbers coerced, AWB format and dates re-validated.
 * Returns fresh validation warnings.
 */
export function renormalize(rows: Shipment[]): { shipments: Shipment[]; warnings: string[] } {
  const warnings: string[] = []
  const shipments: Shipment[] = []
  for (const r of rows) {
    const awb = cellStr(r.awb)
    if (!awb || awb.replace(/\D/g, "").length < 8) {
      warnings.push(`Row dropped: "${awb || "—"}" is not a valid AWB number.`)
      continue
    }

    const fallbackYear = /^\d{4}/.test(String(r.awbDate ?? "")) ? Number(String(r.awbDate).slice(0, 4)) : new Date().getFullYear()
    const awbDate = /^\d{4}-\d{2}-\d{2}$/.test(String(r.awbDate ?? "")) ? r.awbDate : parseDate(r.awbDate, fallbackYear)
    if (!awbDate) {
      warnings.push(`AWB ${awb}: AWB date "${r.awbDate}" is not parseable — row dropped.`)
      continue
    }

    const canon = canonDestination(cellStr(r.destination))
    if (canon && !DESTINATIONS[canon]) {
      warnings.push(`AWB ${awb}: destination "${canon}" still has no airport mapping — won't plot on the globe.`)
    }

    // legs re-parsed from the (possibly edited) FLIGHT DETAILS text — same
    // parser parseWorkbook uses, year of the AWB date as fallback
    const raw = cellStr(String(r.flightDetailsRaw ?? ""))
    const legs = raw ? parseLegs(raw, Number(awbDate.slice(0, 4))) : r.legs

    const date = (r.date && /^\d{4}-\d{2}-\d{2}$/.test(r.date) ? r.date : parseDate(r.date, fallbackYear)) ?? awbDate
    const etd = r.etd && /^\d{4}-\d{2}-\d{2}$/.test(r.etd) ? r.etd : parseDate(r.etd, fallbackYear)
    const eta = r.eta && /^\d{4}-\d{2}-\d{2}$/.test(r.eta) ? r.eta : parseDate(r.eta, fallbackYear)

    const pkgs = Math.round(cellNum(r.pkgs))
    const grossWt = cellNum(r.grossWt)
    const chargeableWt = cellNum(r.chargeableWt)

    // re-run the implausible-weight check — the uploader may have fixed
    // (or introduced) the bad pair, so the flag must be recomputed
    let flag: string | undefined
    let excludeFromWeights: boolean | undefined
    if (grossWt > 0 && chargeableWt > 0 && chargeableWt < grossWt / 10) {
      flag = `Weight pair implausible in sheet (gross ${grossWt} / chg ${chargeableWt}) — excluded from weight totals`
      excludeFromWeights = true
      warnings.push(`AWB ${awb}: ${flag.toLowerCase()}.`)
    }

    shipments.push({
      ...r,
      awb,
      date,
      awbDate,
      destination: canon,
      consignee: cellStr(r.consignee).toUpperCase(),
      airline: cellStr(r.airline).toUpperCase().slice(0, 2),
      pkgs,
      grossWt,
      chargeableWt,
      legs,
      etd,
      eta,
      flightDetailsRaw: raw || null,
      flag,
      excludeFromWeights,
    })
  }
  shipments.sort((a, b) => a.awbDate.localeCompare(b.awbDate) || a.sr - b.sr)
  return { shipments, warnings }
}

export function parseWorkbook(buffer: Buffer | ArrayBuffer, defaultYear: number): IngestResult {
  const wb = XLSX.read(buffer, {
    type: buffer instanceof ArrayBuffer ? "array" : "buffer",
    raw: true, // stop the CSV parser date-guessing "03.06.2026" as US March 6th
    cellDates: false,
  })

  const warnings: string[] = []
  const warn = (msg: string) => {
    if (warnings.length < MAX_WARNINGS) warnings.push(msg)
  }

  const parsed: Shipment[] = []
  let totalRows = 0
  let skippedRows = 0
  let sheetsParsed = 0
  let srCounter = 0

  for (const sheetName of wb.SheetNames) {
    const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[sheetName], {
      header: 1,
      raw: true,
      defval: "",
    })

    const headerIdx = rows.findIndex(
      (r) => r.some((c) => normHeader(c).includes("CONSIGNEE")) && r.some((c) => normHeader(c).includes("AWB")),
    )
    if (headerIdx < 0) continue // decorative / empty tab
    sheetsParsed++
    const header = rows[headerIdx].map(normHeader)
    const fallbackYear = sheetYear(sheetName, defaultYear)

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
      invoices: cols("INVOICENO"), // matches all "INVOICE NO." columns, not "INVOICE DT."
      consignee: col("CONSIGNEE"),
      origin: header.findIndex((h) => h.includes("LOADING") || h === "ORIGIN"),
      destination: col("DESTINATION"),
      pkgs: col("PKG"),
      gross: col("GR", "WT"),
      chargeable: col("CHARGEABLE"),
      airline: col("AIRLINE"),
      awb: col("AWB", "NO"),
      hawb: col("HAWB"),
      awbDate: col("AWB", "DATE"),
      flights: col("FLIGHT"),
      etd: col("ETD"),
      eta: header.findIndex((h) => h === "ETA" || h === "ATA"),
      egmNo: col("EGM", "NO"),
      egmDate: col("EGM", "DATE"),
      sbNo: col("SHIPPING", "NO"),
      sbDate: col("SHIPPING", "DT"),
      remark: col("REMARK"),
    }
    if (C.awb < 0 || C.consignee < 0 || C.destination < 0) {
      warn(`Sheet "${sheetName}": missing required columns — sheet skipped.`)
      sheetsParsed--
      continue
    }

    for (let i = headerIdx + 1; i < rows.length; i++) {
      const row = rows[i]
      if (!row || row.every((c) => cellStr(c) === "")) continue
      totalRows++

      const awbRaw = cellStr(row[C.awb])
      const consignee = cellStr(row[C.consignee]).toUpperCase()
      if (!awbRaw && !consignee) continue
      if (!awbRaw || awbRaw.replace(/\D/g, "").length < 8) {
        skippedRows++
        warn(`Sheet "${sheetName}" row ${i + 1}: no AWB number — row skipped (consignee "${consignee || "—"}").`)
        continue
      }

      const destinationRaw = cellStr(row[C.destination]).toUpperCase()
      const canon = canonDestination(destinationRaw)
      if (destinationRaw && !DESTINATIONS[canon]) {
        warn(`AWB ${awbRaw}: destination "${destinationRaw}" has no airport mapping — counted, won't plot on the globe.`)
      }

      const originRaw = C.origin >= 0 ? cellStr(row[C.origin]).toUpperCase() : ""
      let origin: Shipment["origin"] = "MUMBAI" // blank origin = Mumbai in this sheet
      if (originRaw.includes("DELHI")) origin = "DELHI"
      else if (originRaw.includes("AHMEDABAD") || originRaw.includes("AMD")) origin = "AHMEDABAD"
      else if (originRaw && !originRaw.includes("MUMBAI") && !ORIGINS[originRaw]) {
        warn(`AWB ${awbRaw}: origin "${originRaw}" unknown — treated as Mumbai.`)
      }

      const awbDate = parseDate(row[C.awbDate], fallbackYear) ?? parseDate(row[C.month], fallbackYear)
      if (!awbDate) {
        skippedRows++
        warn(`AWB ${awbRaw} (${sheetName}): no parseable AWB date — row skipped.`)
        continue
      }

      const etd = parseDate(row[C.etd], fallbackYear)
      let eta = C.eta >= 0 ? parseDate(row[C.eta], fallbackYear) : null
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

      parsed.push({
        sr: Math.round(cellNum(row[C.sr])) || ++srCounter,
        date: parseDate(row[C.month], fallbackYear) ?? awbDate,
        invoices: C.invoices.flatMap((ci) => splitList(cellStr(row[ci]))),
        consignee,
        origin,
        destination: canon,
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
        // keep the sheet's FLIGHT DETAILS text verbatim for the expanded row view
        flightDetailsRaw: C.flights >= 0 ? String(row[C.flights] ?? "").trim() || null : null,
        ...(flag ? { flag, excludeFromWeights } : {}),
      })
    }
  }

  // Merge duplicate AWBs — keep the most complete, fill gaps from the other.
  const byAwb = new Map<string, Shipment>()
  let mergedDuplicates = 0
  for (const s of parsed) {
    const key = `${s.awb}|${s.awbDate}`
    const existing = byAwb.get(key)
    if (!existing) {
      byAwb.set(key, s)
      continue
    }
    mergedDuplicates++
    const winner = filledCount(s) >= filledCount(existing) ? s : existing
    const loser = winner === s ? existing : s
    const merged: Shipment = { ...winner }
    for (const k of Object.keys(loser) as (keyof Shipment)[]) {
      const w = merged[k]
      const l = loser[k]
      if ((w === null || w === "" || (Array.isArray(w) && w.length === 0) || w === 0) && l) {
        // @ts-expect-error narrow assignment across union of field types
        merged[k] = l
      }
    }
    byAwb.set(key, merged)
    warn(`AWB ${s.awb}: duplicate row merged (kept the most complete entry).`)
  }

  const shipments = [...byAwb.values()].sort((a, b) => a.awbDate.localeCompare(b.awbDate) || a.sr - b.sr)

  const weighable = shipments.filter((s) => !s.excludeFromWeights)
  const report: IngestReport = {
    sheets: sheetsParsed,
    totalRows,
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
