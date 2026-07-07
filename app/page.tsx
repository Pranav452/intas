import Image from "next/image"
import Link from "next/link"

import { SiteHeader } from "@/components/site-header"
import { AirGlobe } from "@/components/air-globe"
import { Kicker } from "@/components/ledger"

const CONTENTS = [
  { n: "I", title: "Movements", blurb: "Every AWB out of Mumbai & Delhi — flights, routings, uplift dates." },
  { n: "II", title: "Lanes & carriers", blurb: "Chargeable weight by destination and airline, drawn in ink." },
  { n: "III", title: "The record", blurb: "The full ledger — invoices, HAWBs, shipping bills, searchable." },
  { n: "IV", title: "Filings", blurb: "Customs, EGM and shipping-bill status, stamped when pending." },
]

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="flex-1">
        {/* Masthead lede */}
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <div className="grid items-center gap-10 border-b border-rule py-14 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="flex flex-col items-start gap-6">
              <Kicker>Private client portal · Est. 2026</Kicker>
              <h1 className="font-serif text-5xl leading-[0.98] font-bold tracking-tight text-balance sm:text-7xl">
                Air freight,
                <br />
                kept like a <em className="text-stamp">ledger</em>.
              </h1>
              <p className="max-w-[54ch] text-[15px] leading-[1.75] text-muted-foreground">
                The complete record of INTAS DSR pharmaceutical exports by air — waybills, flight
                routings, uplift, customs and EGM filings out of Mumbai and Delhi, written up and
                managed end-to-end by LINKS. Figures are visible to authorised readers only.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href="/login"
                  className="bg-ink px-6 py-3 text-xs font-semibold tracking-[0.18em] text-paper uppercase transition-colors hover:bg-ink/85"
                >
                  Sign in to read the ledger →
                </Link>
                <Link
                  href="mailto:mpcargolille@gmail.com"
                  className="border border-ink/30 px-6 py-3 text-xs font-medium tracking-[0.18em] uppercase transition-colors hover:border-ink"
                >
                  Contact LINKS
                </Link>
              </div>
              <p className="text-[11px] tracking-[0.12em] text-muted-foreground/80 uppercase">
                Access is restricted, device-bound and logged.
              </p>
            </div>

            <div className="relative -my-4">
              <div className="pointer-events-none absolute inset-0 z-10 bg-[radial-gradient(ellipse_at_center,transparent_52%,var(--paper)_92%)]" />
              <AirGlobe className="max-w-[460px]" />
            </div>
          </div>

          {/* Contents */}
          <div className="grid gap-x-10 gap-y-8 border-b border-rule py-10 sm:grid-cols-2 lg:grid-cols-4">
            {CONTENTS.map((c) => (
              <div key={c.n} className="flex flex-col gap-2">
                <span className="font-serif text-2xl font-bold text-stamp">{c.n}.</span>
                <span className="border-b-2 border-ink pb-1.5 text-sm font-semibold tracking-[0.08em] uppercase">
                  {c.title}
                </span>
                <p className="text-[13px] leading-relaxed text-muted-foreground">{c.blurb}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer className="mt-4 border-t-[3px] border-ink">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 py-6 sm:flex-row sm:px-8">
          <div className="flex items-center gap-3">
            <span className="flex h-6 items-center bg-white px-2 outline outline-ink/10">
              <Image src="/links-logo.png" alt="LINKS" width={44} height={18} className="h-3.5 w-auto" />
            </span>
            <span className="text-[11px] tracking-[0.16em] text-muted-foreground uppercase">
              LINKS · Freight forwarding &amp; export operations
            </span>
          </div>
          <span className="text-[11px] tracking-[0.16em] text-muted-foreground/70 uppercase">
            Prepared for INTAS DSR
          </span>
        </div>
      </footer>
    </div>
  )
}
