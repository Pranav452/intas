"use client"

import { Fragment, useMemo, useState } from "react"

import { StatusBadge } from "@/components/status-badge"
import { STATUS_LABEL, type Status } from "@/lib/data"
import { airlineName, destination, ORIGINS, titleCase } from "@/lib/airports"
import { fmt, fmtDateShort, type ShipmentWithStatus } from "@/lib/stats"
import { cn } from "@/lib/utils"

const STATUS_TABS: (Status | "all")[] = ["all", "arrived", "in-transit", "booked"]
const PAGE_SIZE = 15

/** DD.MM.YYYY, matching how dates are written in the source sheet. */
function sheetDate(iso: string | null): string {
  if (!iso) return "—"
  const [y, m, d] = iso.split("-")
  return `${d}.${m}.${y}`
}

/** The FLIGHT DETAILS cell — verbatim if the upload stored it, else rebuilt from the parsed legs. */
function flightDetailsText(s: ShipmentWithStatus): string {
  if (s.flightDetailsRaw) return s.flightDetailsRaw
  if (s.legs.length === 0) return "—"
  return s.legs.map((l) => `${l.carrier}:${l.flightNo}/${l.date ? sheetDate(l.date) : "—"}-${l.to}`).join("\n")
}

function DetailField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="text-[9px] tracking-[0.2em] text-muted-foreground uppercase">{label}</div>
      <div className="mt-0.5 text-[13px] break-words">{value ?? "—"}</div>
    </div>
  )
}

export function ShipmentsTable({ shipments }: { shipments: ShipmentWithStatus[] }) {
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState<Status | "all">("all")
  const [airline, setAirline] = useState("all")
  const [page, setPage] = useState(0)
  const [expanded, setExpanded] = useState<string | null>(null)

  const toggleExpand = (key: string) => setExpanded((cur) => (cur === key ? null : key))

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

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount - 1)
  const pageRows = rows.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE)

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
                onClick={() => { setStatus(tab); setPage(0); }}
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
            onChange={(e) => { setAirline(e.target.value); setPage(0); }}
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
            onChange={(e) => { setQuery(e.target.value); setPage(0); }}
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
            {pageRows.map((s) => {
              const dest = destination(s.destination)
              const key = s.awb + s.awbDate
              const isOpen = expanded === key
              return (
                <Fragment key={key}>
                <tr
                  onClick={() => toggleExpand(key)}
                  className={cn(
                    "cursor-pointer border-b border-rule align-baseline transition-colors hover:bg-ink/[0.03]",
                    isOpen && "bg-ink/[0.03]",
                  )}
                >
                  <td className="py-2.5 pr-3">
                    <div className="flex items-center gap-1.5">
                      <span className={cn("inline-block text-[9px] text-stamp transition-transform", isOpen && "rotate-90")}>
                        ▶
                      </span>
                      <span className="font-mono text-xs font-semibold">{s.awb}</span>
                    </div>
                    <div className="pl-4 text-[10px] text-muted-foreground">{airlineName(s.airline)}</div>
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
                      <span className="text-[10px] text-muted-foreground/50">—</span>
                    )}
                  </td>
                  <td className="py-2.5">
                    <StatusBadge status={s.status} />
                  </td>
                </tr>
                {isOpen && (
                  <tr className="border-b-2 border-ink/40 bg-ink/[0.02]">
                    <td colSpan={10} className="px-4 py-5">
                      <div className="grid gap-x-8 gap-y-4 sm:grid-cols-3 lg:grid-cols-5">
                        <DetailField label="AWB / BL No." value={<span className="font-mono">{s.awb}</span>} />
                        <DetailField label="AWB date" value={sheetDate(s.awbDate)} />
                        <DetailField label="Month" value={sheetDate(s.date)} />
                        <DetailField label="Airline" value={`${s.airline} · ${airlineName(s.airline)}`} />
                        <DetailField label="Origin" value={`${titleCase(s.origin)} (${ORIGINS[s.origin]?.iata ?? "—"})`} />
                        <DetailField
                          label="Destination"
                          value={dest ? `${titleCase(s.destination)} — ${dest.city}, ${dest.country} (${dest.iata})` : titleCase(s.destination)}
                        />
                        <DetailField label="Consignee" value={titleCase(s.consignee)} />
                        <DetailField label="Invoice No." value={s.invoices.length ? s.invoices.join(" / ") : "—"} />
                        <DetailField label="HAWB / HBL" value={s.hawb.length ? s.hawb.join(" / ") : "—"} />
                        <DetailField label="No. of pkgs" value={fmt(s.pkgs)} />
                        <DetailField label="Gross wt." value={`${s.grossWt.toLocaleString("en-IN")} kg`} />
                        <DetailField label="Chargeable wt." value={`${fmt(s.chargeableWt)} kg`} />
                        <DetailField label="ETD" value={sheetDate(s.etd)} />
                        <DetailField label="ETA / ATA" value={sheetDate(s.eta)} />
                        <DetailField label="EGM No." value={s.egmNo ?? "—"} />
                        <DetailField label="EGM date" value={sheetDate(s.egmDate)} />
                        <DetailField label="Shipping bill No." value={s.sbNos.length ? s.sbNos.join(" / ") : "—"} />
                        <DetailField label="Shipping bill dt." value={sheetDate(s.sbDate)} />
                        <DetailField label="Remark" value={s.remark ?? "—"} />
                        <DetailField label="Status" value={<StatusBadge status={s.status} />} />
                      </div>

                      <div className="mt-5 border-t border-rule pt-4">
                        <div className="text-[9px] tracking-[0.2em] text-muted-foreground uppercase">
                          Flight details — as written in the sheet
                        </div>
                        <pre className="mt-2 font-mono text-[12px] leading-relaxed whitespace-pre-wrap text-ink">
{flightDetailsText(s)}
                        </pre>
                        {s.legs.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {s.legs.map((l, i) => (
                              <span
                                key={`${l.carrier}${l.flightNo}-${i}`}
                                className="border border-ink/30 px-2 py-1 text-[10px] font-semibold tracking-[0.08em] uppercase"
                              >
                                Leg {i + 1} · {l.carrier} {l.flightNo} · {l.date ? sheetDate(l.date) : "—"} → {l.to}
                              </span>
                            ))}
                          </div>
                        )}
                        {s.flag && (
                          <p className="mt-3 border-l-4 border-stamp bg-stamp/[0.06] px-3 py-2 text-xs text-stamp">
                            {s.flag}
                          </p>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
                </Fragment>
              )
            })}
            {pageRows.length === 0 && (
              <tr>
                <td colSpan={10} className="py-10 text-center text-xs tracking-[0.14em] text-muted-foreground uppercase">
                  No entries match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {pageCount > 1 && (
        <div className="mt-4 flex items-center justify-between border-t border-rule pt-3">
          <span className="text-[10px] tracking-[0.18em] text-muted-foreground uppercase tabular-nums">
            Entries {safePage * PAGE_SIZE + 1}–{Math.min((safePage + 1) * PAGE_SIZE, rows.length)} of {rows.length}
          </span>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setPage(Math.max(0, safePage - 1))}
              disabled={safePage === 0}
              className="border-b-2 border-transparent pb-0.5 text-[11px] font-semibold tracking-[0.16em] uppercase transition-colors hover:border-stamp disabled:cursor-not-allowed disabled:opacity-30"
            >
              ← Prev
            </button>
            <span className="font-serif text-sm font-bold tabular-nums">
              {safePage + 1} / {pageCount}
            </span>
            <button
              onClick={() => setPage(Math.min(pageCount - 1, safePage + 1))}
              disabled={safePage >= pageCount - 1}
              className="border-b-2 border-transparent pb-0.5 text-[11px] font-semibold tracking-[0.16em] uppercase transition-colors hover:border-stamp disabled:cursor-not-allowed disabled:opacity-30"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
