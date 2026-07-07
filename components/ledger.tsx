import { cn } from "@/lib/utils"

// Editorial building blocks for the Air Ledger.

export function SectionHead({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4 border-b-2 border-ink pb-2">
      <h3 className="font-serif text-xl font-bold tracking-tight">{children}</h3>
      {right && <span className="text-[10px] tracking-[0.2em] text-muted-foreground uppercase">{right}</span>}
    </div>
  )
}

export function Kicker({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] font-semibold tracking-[0.24em] text-stamp uppercase">{children}</div>
  )
}

export interface InkBarItem {
  label: string
  value: number
  display?: string
  alt?: boolean
}

/** Woodcut-style horizontal bars: solid ink, every other one stamped orange. */
export function InkBars({ items, unit, className }: { items: InkBarItem[]; unit?: string; className?: string }) {
  const max = Math.max(...items.map((i) => i.value), 1)
  return (
    <div className={cn("flex flex-col gap-2.5", className)}>
      {items.map((item, i) => (
        <div key={item.label} className="grid grid-cols-[110px_1fr_86px] items-center gap-3 text-[13px]">
          <span className="truncate">{item.label}</span>
          <div>
            <div
              className={cn("h-3.5", (item.alt ?? i % 2 === 1) ? "bg-stamp" : "bg-ink")}
              style={{ width: `${Math.max((item.value / max) * 100, 1.5)}%` }}
            />
          </div>
          <span className="text-right text-xs text-muted-foreground tabular-nums">
            {item.display ?? item.value.toLocaleString("en-IN")}
            {unit ? ` ${unit}` : ""}
          </span>
        </div>
      ))}
    </div>
  )
}

/** Vertical ink columns for the weekly chart — baseline rule, final column stamped. */
export function InkColumns({
  items,
  height = 120,
  className,
}: {
  items: { label: string; value: number; hint?: string }[]
  height?: number
  className?: string
}) {
  const max = Math.max(...items.map((i) => i.value), 1)
  return (
    <div className={className}>
      {/* columns must stretch to the row height or the % bar heights collapse */}
      <div className="flex items-stretch gap-[6px] border-b-2 border-ink" style={{ height }}>
        {items.map((item, i) => (
          <div key={`${item.label}-${i}`} className="group relative flex h-full flex-1 flex-col justify-end">
            <div
              className={cn("w-full transition-opacity group-hover:opacity-80", i === items.length - 1 ? "bg-stamp" : "bg-ink")}
              style={{ height: `${Math.max((item.value / max) * 100, 2)}%` }}
              title={item.hint ?? `${item.label} · ${item.value.toLocaleString("en-IN")}`}
            />
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex gap-[6px]">
        {items.map((item, i) => (
          <span key={`${item.label}-${i}`} className="flex-1 text-center text-[10px] text-muted-foreground tabular-nums">
            {item.label}
          </span>
        ))}
      </div>
    </div>
  )
}
