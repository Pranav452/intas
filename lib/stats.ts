import {
  DATA_AS_OF,
  SHIPMENTS,
  shipmentStatus,
  type Shipment,
  type Status,
} from "./data"
import { DESTINATIONS, ORIGINS, airlineName, titleCase } from "./airports"

// Rows flagged excludeFromWeights (implausible sheet weights) stay in shipment
// and package counts but are left out of every weight aggregate.

export interface ShipmentWithStatus extends Shipment {
  status: Status
}

export const fmt = (n: number): string => Math.round(n).toLocaleString("en-IN")

export function fmtDate(iso: string | null): string {
  if (!iso) return "—"
  const [y, m, d] = iso.split("-").map(Number)
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric", timeZone: "UTC",
  })
}

export function fmtDateShort(iso: string | null): string {
  if (!iso) return "—"
  const [y, m, d] = iso.split("-").map(Number)
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", timeZone: "UTC",
  })
}

export interface NamedValue {
  name: string
  value: number
  hint?: string
}

export interface AirLane {
  destination: string
  city: string
  country: string
  iata: string
  coords: [number, number]
  shipments: number
  chargeableWt: number
  pkgs: number
}

export interface GlobeArc {
  origin: "MUMBAI" | "DELHI" | "AHMEDABAD"
  coords: [number, number]
  weight: number
}

export interface DashboardStats {
  asOf: string
  withStatus: ShipmentWithStatus[]
  totals: {
    shipments: number
    pkgs: number
    grossWt: number
    chargeableWt: number
    invoices: number
    destinations: number
    consignees: number
    egmPending: number
    avgTransitDays: number
  }
  statusCounts: { status: Status; shipments: number; chargeableWt: number }[]
  byAirline: NamedValue[]
  byConsignee: NamedValue[]
  byDestination: NamedValue[]
  byCountry: NamedValue[]
  byOrigin: NamedValue[]
  byHub: NamedValue[]
  weeklyChargeable: { label: string; chargeableWt: number; pkgs: number; shipments: number }[]
  monthlyChargeable: { label: string; chargeableWt: number; pkgs: number; shipments: number }[]
  dailyTimeline: { label: string; value: number; hint: string }[]
  lanes: AirLane[]
  globeArcs: GlobeArc[]
  flightsBoard: ShipmentWithStatus[]
}

function weekStart(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  const day = (date.getUTCDay() + 6) % 7 // Monday = 0
  date.setUTCDate(date.getUTCDate() - day)
  return date.toISOString().slice(0, 10)
}

export function computeStats(shipments: Shipment[] = SHIPMENTS, asOf: string = DATA_AS_OF): DashboardStats {
  const withStatus: ShipmentWithStatus[] = shipments.map((s) => ({
    ...s,
    status: shipmentStatus(s, asOf),
  }))

  const weighable = withStatus.filter((s) => !s.excludeFromWeights)

  const totals = {
    shipments: withStatus.length,
    pkgs: withStatus.reduce((a, s) => a + s.pkgs, 0),
    grossWt: weighable.reduce((a, s) => a + s.grossWt, 0),
    chargeableWt: weighable.reduce((a, s) => a + s.chargeableWt, 0),
    invoices: withStatus.reduce((a, s) => a + s.invoices.length, 0),
    destinations: new Set(withStatus.map((s) => s.destination)).size,
    consignees: new Set(withStatus.map((s) => s.consignee)).size,
    // EGM pending only means something when the sheet tracks EGM at all —
    // the full DSR export has no EGM columns, so report 0 rather than "all pending".
    egmPending: withStatus.some((s) => s.egmNo)
      ? withStatus.filter((s) => !s.egmNo && s.etd && s.etd <= asOf).length
      : 0,
    avgTransitDays: 0,
  }

  const transits = withStatus
    .filter((s) => s.etd && s.eta)
    .map((s) => (Date.parse(s.eta!) - Date.parse(s.etd!)) / 86_400_000)
  totals.avgTransitDays = transits.length
    ? Math.round((transits.reduce((a, b) => a + b, 0) / transits.length) * 10) / 10
    : 0

  const statusCounts = (["arrived", "in-transit", "booked"] as Status[]).map((status) => {
    const rows = withStatus.filter((s) => s.status === status)
    return {
      status,
      shipments: rows.length,
      chargeableWt: rows.filter((s) => !s.excludeFromWeights).reduce((a, s) => a + s.chargeableWt, 0),
    }
  })

  const sumBy = (
    rows: ShipmentWithStatus[],
    key: (s: ShipmentWithStatus) => string,
    weightOf: (s: ShipmentWithStatus) => number,
  ) => {
    const map = new Map<string, number>()
    for (const s of rows) map.set(key(s), (map.get(key(s)) ?? 0) + weightOf(s))
    return [...map.entries()].sort((a, b) => b[1] - a[1])
  }

  const chg = (s: ShipmentWithStatus) => (s.excludeFromWeights ? 0 : s.chargeableWt)

  const byAirline: NamedValue[] = sumBy(withStatus, (s) => s.airline, chg).map(([code, value]) => ({
    name: airlineName(code),
    value: Math.round(value),
    hint: `${withStatus.filter((s) => s.airline === code).length} shipments`,
  }))

  const byConsignee: NamedValue[] = sumBy(withStatus, (s) => s.consignee, chg).map(([name, value]) => ({
    name: titleCase(name),
    value: Math.round(value),
    hint: `${withStatus.filter((s) => s.consignee === name).length} shipments`,
  }))

  const byDestination: NamedValue[] = sumBy(withStatus, (s) => s.destination, chg).map(([dest, value]) => {
    const ap = DESTINATIONS[dest]
    return {
      name: ap ? `${titleCase(ap.city)} (${ap.iata})` : titleCase(dest),
      value: Math.round(value),
    }
  })

  const byCountry: NamedValue[] = sumBy(
    withStatus,
    (s) => DESTINATIONS[s.destination]?.country ?? titleCase(s.destination),
    chg,
  ).map(([name, value]) => ({ name, value: Math.round(value) }))

  const byOrigin: NamedValue[] = sumBy(withStatus, (s) => s.origin, chg).map(([o, value]) => {
    const ap = ORIGINS[o]
    return {
      name: ap ? `${titleCase(ap.city)} (${ap.iata})` : titleCase(o),
      value: Math.round(value),
      hint: `${withStatus.filter((s) => s.origin === o).length} shipments`,
    }
  })

  // Intermediate stops only (every leg destination except the final one)
  const hubCounts = new Map<string, number>()
  for (const s of withStatus) {
    for (const leg of s.legs.slice(0, -1)) {
      hubCounts.set(leg.to, (hubCounts.get(leg.to) ?? 0) + 1)
    }
  }
  const byHub: NamedValue[] = [...hubCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([iata, value]) => ({ name: iata, value }))

  const weekMap = new Map<string, { chargeableWt: number; pkgs: number; shipments: number }>()
  for (const s of withStatus) {
    const wk = weekStart(s.awbDate)
    const entry = weekMap.get(wk) ?? { chargeableWt: 0, pkgs: 0, shipments: 0 }
    entry.chargeableWt += chg(s)
    entry.pkgs += s.pkgs
    entry.shipments += 1
    weekMap.set(wk, entry)
  }
  const weeklyChargeable = [...weekMap.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([wk, v]) => ({ label: fmtDateShort(wk), ...v, chargeableWt: Math.round(v.chargeableWt) }))

  const MONTH_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  const monthMap = new Map<string, { chargeableWt: number; pkgs: number; shipments: number }>()
  for (const s of withStatus) {
    const key = s.awbDate.slice(0, 7)
    const entry = monthMap.get(key) ?? { chargeableWt: 0, pkgs: 0, shipments: 0 }
    entry.chargeableWt += chg(s)
    entry.pkgs += s.pkgs
    entry.shipments += 1
    monthMap.set(key, entry)
  }
  const monthlyChargeable = [...monthMap.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([ym, v]) => {
      const [y, m] = ym.split("-").map(Number)
      return { label: `${MONTH_ABBR[m - 1]} ${String(y).slice(2)}`, ...v, chargeableWt: Math.round(v.chargeableWt) }
    })

  const dayMap = new Map<string, { wt: number; shipments: number }>()
  for (const s of withStatus) {
    const entry = dayMap.get(s.awbDate) ?? { wt: 0, shipments: 0 }
    entry.wt += chg(s)
    entry.shipments += 1
    dayMap.set(s.awbDate, entry)
  }
  const dailyTimeline = [...dayMap.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, v]) => ({
      label: fmtDateShort(date),
      value: Math.round(v.wt),
      hint: `${fmtDateShort(date)} · ${fmt(v.wt)} kg · ${v.shipments} AWB`,
    }))

  const laneMap = new Map<string, AirLane>()
  for (const s of withStatus) {
    const ap = DESTINATIONS[s.destination]
    if (!ap) continue
    const lane = laneMap.get(s.destination) ?? {
      destination: s.destination,
      city: titleCase(ap.city),
      country: ap.country,
      iata: ap.iata,
      coords: ap.coords,
      shipments: 0,
      chargeableWt: 0,
      pkgs: 0,
    }
    lane.shipments += 1
    lane.chargeableWt += chg(s)
    lane.pkgs += s.pkgs
    laneMap.set(s.destination, lane)
  }
  const lanes = [...laneMap.values()].sort((a, b) => b.chargeableWt - a.chargeableWt)

  const arcMap = new Map<string, GlobeArc>()
  for (const s of withStatus) {
    const ap = DESTINATIONS[s.destination]
    if (!ap) continue
    const key = `${s.origin}|${s.destination}`
    const arc = arcMap.get(key) ?? { origin: s.origin, coords: ap.coords, weight: 0 }
    arc.weight += chg(s)
    arcMap.set(key, arc)
  }
  const globeArcs = [...arcMap.values()]

  const flightsBoard = [...withStatus].sort((a, b) => (b.etd ?? "").localeCompare(a.etd ?? ""))

  return {
    asOf,
    withStatus,
    totals,
    statusCounts,
    byAirline,
    byConsignee,
    byDestination,
    byCountry,
    byOrigin,
    byHub,
    weeklyChargeable,
    monthlyChargeable,
    dailyTimeline,
    lanes,
    globeArcs,
    flightsBoard,
  }
}
