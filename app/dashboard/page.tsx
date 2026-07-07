import type { Metadata } from "next"

import { AirGlobe } from "@/components/air-globe"
import { InkBars, InkColumns, Kicker, SectionHead } from "@/components/ledger"
import { ShipmentsTable } from "@/components/shipments-table"
import { SiteHeader } from "@/components/site-header"
import { StatusBadge } from "@/components/status-badge"
import { airlineName, titleCase } from "@/lib/airports"
import { computeStats, fmt, fmtDate, fmtDateShort } from "@/lib/stats"
import { loadDataset } from "@/lib/store"

export const metadata: Metadata = {
  title: "The ledger · INTAS DSR by LINKS",
}

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  const dataset = await loadDataset()
  const stats = computeStats(dataset.shipments, dataset.asOf)
  const t = stats.totals
  const byStatus = Object.fromEntries(stats.statusCounts.map((s) => [s.status, s]))

  const topHubs = stats.byHub.slice(0, 3).map((h) => h.name)
  const hubSentence =
    topHubs.length > 1 ? `${topHubs.slice(0, -1).join(", ")} and ${topHubs.at(-1)}` : (topHubs[0] ?? "direct services")
  const countries = stats.byCountry.length

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="mx-auto w-full max-w-6xl flex-1 px-5 sm:px-8">
        {/* Lede spread */}
        <div className="grid gap-10 border-b border-rule py-10 lg:grid-cols-[1.3fr_0.7fr]">
          <div>
            <Kicker>This period, by air · as of {fmtDate(stats.asOf)}</Kicker>
            <div className="mt-3 font-serif text-7xl leading-[0.9] font-bold tracking-tight tabular-nums sm:text-8xl lg:text-9xl">
              {fmt(t.chargeableWt)}
              <span className="ml-3 align-middle font-serif text-2xl font-normal text-muted-foreground">
                kg chargeable
              </span>
            </div>
            <p className="mt-6 max-w-[60ch] font-serif text-[17px] leading-[1.75] text-ink/85">
              {fmt(t.shipments)} air waybills lifted out of Mumbai and Delhi for {t.consignees}{" "}
              pharmaceutical consignees — {fmt(t.pkgs)} packages weighing {fmt(t.grossWt)} kg gross,
              routed via {hubSentence} to {t.destinations} airports across {countries} countries.{" "}
              {t.egmPending > 0 ? (
                <>
                  <span className="font-semibold text-stamp">{t.egmPending} manifests</span> await EGM filing.
                </>
              ) : (
                "All export manifests are filed."
              )}
            </p>
          </div>

          <div className="flex flex-col justify-center gap-5 border-l-4 border-ink pl-6">
            {[
              { v: fmt(t.shipments), l: "Shipments · AWB" },
              { v: fmt(t.pkgs), l: "Packages" },
              { v: `${t.destinations}`, l: "Destination airports" },
              { v: `${t.avgTransitDays} d`, l: "Average transit" },
            ].map((f) => (
              <div key={f.l}>
                <div className="font-serif text-4xl font-bold tabular-nums">{f.v}</div>
                <div className="text-[10px] tracking-[0.22em] text-muted-foreground uppercase">{f.l}</div>
              </div>
            ))}
            <div>
              <div className="font-serif text-4xl font-bold text-stamp tabular-nums">{t.egmPending}</div>
              <div className="text-[10px] tracking-[0.22em] text-stamp/80 uppercase">EGM pending</div>
            </div>
          </div>
        </div>

        {/* Figures band */}
        <div className="grid grid-cols-2 divide-x divide-rule border-b border-rule sm:grid-cols-4 lg:grid-cols-8">
          {[
            { v: fmt(t.grossWt), l: "Gross kg" },
            { v: fmt(t.invoices), l: "Invoices" },
            { v: `${t.consignees}`, l: "Consignees" },
            { v: `${stats.byAirline.length}`, l: "Carriers" },
            { v: `${countries}`, l: "Countries" },
            { v: `${byStatus["arrived"].shipments}`, l: "Arrived" },
            { v: `${byStatus["in-transit"].shipments + byStatus["booked"].shipments}`, l: "Moving · booked" },
            { v: `${stats.byHub[0]?.name ?? "—"} ×${stats.byHub[0]?.value ?? 0}`, l: "Top hub" },
          ].map((f) => (
            <div key={f.l} className="px-4 py-4 first:pl-0">
              <div className="font-serif text-2xl font-bold tabular-nums">{f.v}</div>
              <div className="mt-0.5 text-[9px] tracking-[0.2em] text-muted-foreground uppercase">{f.l}</div>
            </div>
          ))}
        </div>

        {/* The network */}
        <div className="grid gap-10 border-b border-rule py-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="relative -my-6 flex items-center">
            <div className="pointer-events-none absolute inset-0 z-10 bg-[radial-gradient(ellipse_at_center,transparent_52%,var(--paper)_94%)]" />
            <AirGlobe lanes={stats.globeArcs} className="max-w-[430px]" />
          </div>
          <div>
            <SectionHead right={`${t.destinations} airports · ${countries} countries`}>The network</SectionHead>
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-left text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
                  <th className="border-b-2 border-ink py-1.5 pr-3 font-medium">Airport</th>
                  <th className="border-b-2 border-ink py-1.5 pr-3 font-medium">City</th>
                  <th className="border-b-2 border-ink py-1.5 pr-3 text-right font-medium">AWB</th>
                  <th className="border-b-2 border-ink py-1.5 text-right font-medium">KG</th>
                </tr>
              </thead>
              <tbody>
                {stats.lanes.slice(0, 9).map((lane) => (
                  <tr key={lane.destination} className="border-b border-rule">
                    <td className="py-2 pr-3 font-mono text-xs font-semibold text-stamp">{lane.iata}</td>
                    <td className="py-2 pr-3">
                      {lane.city}
                      <span className="text-muted-foreground"> · {lane.country}</span>
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums">{lane.shipments}</td>
                    <td className="py-2 text-right font-medium tabular-nums">{fmt(lane.chargeableWt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Articles: lanes / carriers / consignees */}
        <div className="grid gap-10 border-b border-rule py-10 md:grid-cols-2 lg:grid-cols-3">
          <div>
            <SectionHead>Lanes, by weight</SectionHead>
            <InkBars
              items={stats.byDestination.slice(0, 7).map((d) => ({ label: d.name, value: d.value }))}
            />
          </div>
          <div>
            <SectionHead>Carriers</SectionHead>
            <InkBars items={stats.byAirline.slice(0, 7).map((a) => ({ label: a.name, value: a.value }))} />
            <p className="mt-4 text-[12px] leading-relaxed text-muted-foreground">
              {stats.byAirline[0]?.name} carries{" "}
              {Math.round(((stats.byAirline[0]?.value ?? 0) / Math.max(t.chargeableWt, 1)) * 100)}% of the
              period&apos;s chargeable weight.
            </p>
          </div>
          <div>
            <SectionHead>The consignees</SectionHead>
            <div className="flex flex-col">
              {stats.byConsignee.slice(0, 7).map((c, i) => (
                <div key={c.name} className="flex items-baseline gap-3 border-b border-rule py-2.5">
                  <span className="w-6 font-serif text-lg font-bold text-stamp">{i + 1}.</span>
                  <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{c.name}</span>
                  <span className="text-xs text-muted-foreground tabular-nums">{fmt(c.value)} kg</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Movements + weekly uplift */}
        <div className="grid gap-10 border-b border-rule py-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <SectionHead right="latest first">Movements</SectionHead>
            <div className="flex flex-col">
              {stats.flightsBoard.slice(0, 8).map((f) => (
                <div key={f.awb} className="grid grid-cols-[64px_1fr_auto] items-baseline gap-4 border-b border-rule py-3">
                  <span className="font-serif text-lg leading-none font-bold">{fmtDateShort(f.etd)}</span>
                  <div className="min-w-0">
                    <div className="truncate text-[13px]">
                      <span className="font-mono text-xs font-semibold">{f.awb}</span>
                      <span className="text-muted-foreground"> · {f.legs.map((l) => `${l.carrier}${l.flightNo}`).join(" → ")} · </span>
                      {titleCase(f.consignee)}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {airlineName(f.airline)} · {fmt(f.chargeableWt)} kg chg · ETA {fmtDateShort(f.eta)}
                    </div>
                  </div>
                  <StatusBadge status={f.status} />
                </div>
              ))}
            </div>
          </div>
          <div>
            <SectionHead right="chargeable kg · Mon weeks">Weekly uplift</SectionHead>
            <InkColumns
              height={150}
              items={stats.weeklyChargeable.map((w) => ({
                label: w.label,
                value: w.chargeableWt,
                hint: `Wk of ${w.label} · ${fmt(w.chargeableWt)} kg · ${w.shipments} AWB`,
              }))}
            />
            <div className="mt-6 border-t-2 border-ink pt-4">
              <SectionHead right="by chargeable weight">Origins</SectionHead>
              <InkBars items={stats.byOrigin.map((o) => ({ label: o.name, value: o.value }))} />
            </div>
          </div>
        </div>

        {/* The record */}
        <div className="py-10" id="record">
          <ShipmentsTable shipments={stats.withStatus} />
        </div>

        <p className="border-t-[3px] border-ink py-6 text-center text-[10px] tracking-[0.24em] text-muted-foreground uppercase">
          The INTAS Air Ledger · written up by LINKS · data as of {fmtDate(stats.asOf)}
        </p>
      </main>
    </div>
  )
}
