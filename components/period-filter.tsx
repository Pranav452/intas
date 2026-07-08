"use client"

import { useRouter } from "next/navigation"
import { useTransition } from "react"

import { MONTH_NAMES } from "@/lib/period"
import { cn } from "@/lib/utils"

export interface PeriodOption {
  year: number
  months: number[]
}

// Ledger-styled global period filter — writes ?year=&month= and the server
// recomputes every figure on the page.
export function PeriodFilter({
  periods,
  year,
  month,
  className,
}: {
  periods: PeriodOption[]
  year: number | null
  month: number | null
  className?: string
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const apply = (y: number | null, m: number | null) => {
    const params = new URLSearchParams()
    if (y !== null) params.set("year", String(y))
    if (y !== null && m !== null) params.set("month", String(m))
    const qs = params.toString()
    startTransition(() => router.replace(qs ? `/dashboard?${qs}` : "/dashboard", { scroll: false }))
  }

  const activeYear = periods.find((p) => p.year === year)
  const selectCls =
    "border-0 border-b-2 border-ink/30 bg-transparent pb-1 text-[11px] font-semibold tracking-[0.14em] uppercase focus:border-stamp focus:outline-none"

  return (
    <div className={cn("flex flex-wrap items-center gap-3", pending && "opacity-60", className)}>
      <span className="text-[9px] font-semibold tracking-[0.24em] text-muted-foreground uppercase">Period</span>
      <select
        aria-label="Year"
        className={selectCls}
        value={year === null ? "all" : String(year)}
        onChange={(e) => apply(e.target.value === "all" ? null : Number(e.target.value), null)}
      >
        <option value="all">All time</option>
        {periods.map((p) => (
          <option key={p.year} value={p.year}>
            {p.year}
          </option>
        ))}
      </select>
      <select
        aria-label="Month"
        className={cn(selectCls, year === null && "cursor-not-allowed opacity-40")}
        disabled={year === null}
        value={month === null ? "all" : String(month)}
        onChange={(e) => apply(year, e.target.value === "all" ? null : Number(e.target.value))}
      >
        <option value="all">Whole year</option>
        {(activeYear?.months ?? []).map((m) => (
          <option key={m} value={m}>
            {MONTH_NAMES[m - 1]}
          </option>
        ))}
      </select>
      {year !== null && (
        <button
          onClick={() => apply(null, null)}
          className="text-[9px] font-bold tracking-[0.18em] text-stamp uppercase underline-offset-4 hover:underline"
        >
          Clear
        </button>
      )}
    </div>
  )
}
