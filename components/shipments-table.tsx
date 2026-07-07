"use client"

import { useMemo, useState } from "react"

import { StatusBadge } from "@/components/status-badge"
import { STATUS_LABEL, type Status } from "@/lib/data"
import { airlineName, destination, ORIGINS, titleCase } from "@/lib/airports"
import { fmt, fmtDateShort, type ShipmentWithStatus } from "@/lib/stats"
import { cn } from "@/lib/utils"

const STATUS_TABS: (Status | "all")[] = ["all", "arrived", "in-transit", "booked"]

export function ShipmentsTable({ shipments }: { shipments: ShipmentWithStatus[] }) {
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState<Status | "all">("all")
  const [airline, setAirline] = useState("all")

  const airlines = useMemo(() => [...new Set(shipments.map((s) => s.airline))].sort(), [shipments])

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return shipments.filter((s) => {
      if (status !== "all" && s.status !== status) return false
      if (airline !== "all" && s.airline !== airline) return false
      if (!q) return true
      const haystack = [
        s.awb, s.consignee, s.destination, s.origin, s.airline, airlineName(s.airline),
        ...s.invoices, ...s.hawb, ...s.sbNos,
        ...s.legs.map((l) => `${l.carrier}${l.flightNo}`),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
      return haystack.includes(q)
    })
  }, [shipments, query, status, airline])

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4 border-b-2 border-ink pb-3">
        <div className="flex items-baseline gap-3">
          <h3 className="font-serif text-xl font-bold tracking-tight">The record</h3>
          <span className="text-[10px] tracking-[0.2em] text-muted-foreground uppercase tabular-nums">
            {rows.length} of {shipments.length} entries
          </span>
        </div>

        <div className="flex flex-wrap items-end gap-5">
          <div className="flex items-center gap-4 text-[11px] font-medium tracking-[0.14em] uppercase">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setStatus(tab)}
                className={cn(
                  "border-b-2 pb-1 transition-colors",
                  status === tab
                    ? "border-stamp text-ink"
                    : "border-transparent text-muted-foreground hover:text-ink",
                )}
              >
                {tab === "all" ? "All" : STATUS_LABEL[tab]}
              </button>
            ))}
          </div>

          <select
            value={airline}
            onChange={(e) => setAirline(e.target.value)}
            className="border-0 border-b border-ink/40 bg-transparent pb-1 text-xs focus:border-stamp focus:outline-none"
            aria-label="Filter by airline"
          >
            <option value="all">All carriers</option>
            {airlines.map((a) => (
              <option key={a} value={a}>
                {airlineName(a)}
              </option>
            ))}
          </select>

          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search AWB, invoice, consignee…"
            className="w-56 border-0 border-b border-ink/40 bg-transparent pb-1 text-xs placeholder:text-muted-foreground/60 focus:border-stamp focus:outline-none"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="text-left text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
              <th className="border-b-2 border-ink py-2 pr-3 font-medium">AWB</th>
              <th className="border-b-2 border-ink py-2 pr-3 font-medium">Consignee</th>
              <th className="border-b-2 border-ink py-2 pr-3 font-medium">Route</th>
              <th className="border-b-2 border-ink py-2 pr-3 font-medium">Flights</th>
              <th className="border-b-2 border-ink py-2 pr-3 text-right font-medium">Pkgs</th>
              <th className="border-b-2 border-ink py-2 pr-3 text-right font-medium">Chg. kg</th>
              <th className="border-b-2 border-ink py-2 pr-3 font-medium">ETD</th>
              <th className="border-b-2 border-ink py-2 pr-3 font-medium">ETA</th>
              <th className="border-b-2 border-ink py-2 pr-3 font-medium">EGM</th>
              <th className="border-b-2 border-ink py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => {
              const dest = destination(s.destination)
              return (
                <tr key={s.awb} className="border-b border-rule align-baseline transition-colors hover:bg-ink/[0.03]">
                  <td className="py-2.5 pr-3">
                    <div className="font-mono text-xs font-semibold">{s.awb}</div>
                    <div className="text-[10px] text-muted-foreground">{airlineName(s.airline)}</div>
                  </td>
                  <td className="max-w-44 py-2.5 pr-3">
                    <div className="truncate font-medium">{titleCase(s.consignee)}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {s.invoices.length} inv{s.invoices.length > 1 ? "s" : ""}
                      {s.flag ? <span className="text-stamp"> · flagged</span> : ""}
                    </div>
                  </td>
                  <td className="py-2.5 pr-3">
                    <div>
                      {ORIGINS[s.origin]?.iata ?? s.origin} → <span className="font-semibold">{dest?.iata ?? s.destination}</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {dest ? `${dest.city}, ${dest.country}` : titleCase(s.destination)}
                    </div>
                  </td>
                  <td className="max-w-40 py-2.5 pr-3">
                    <span className="block truncate text-xs text-muted-foreground">
                      {s.legs.map((l) => `${l.carrier}${l.flightNo}`).join(" → ")}
                    </span>
                  </td>
                  <td className="py-2.5 pr-3 text-right tabular-nums">{s.pkgs}</td>
                  <td className="py-2.5 pr-3 text-right font-medium tabular-nums">{fmt(s.chargeableWt)}</td>
                  <td className={cn("py-2.5 pr-3 text-xs tabular-nums", !s.etd && "text-muted-foreground/50")}>
                    {fmtDateShort(s.etd)}
                  </td>
                  <td className={cn("py-2.5 pr-3 text-xs tabular-nums", !s.eta && "text-muted-foreground/50")}>
                    {fmtDateShort(s.eta)}
                  </td>
                  <td className="py-2.5 pr-3">
                    {s.egmNo ? (
                      <span className="text-[10px] font-semibold tracking-[0.14em] text-ink/70 uppercase">Filed</span>
                    ) : (
                      <span className="text-[10px] font-semibold tracking-[0.14em] text-stamp uppercase">Pending</span>
                    )}
                  </td>
                  <td className="py-2.5">
                    <StatusBadge status={s.status} />
                  </td>
                </tr>
              )
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={10} className="py-10 text-center text-xs tracking-[0.14em] text-muted-foreground uppercase">
                  No entries match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
