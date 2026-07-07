import { STATUS_LABEL, type Status } from "@/lib/data"
import { cn } from "@/lib/utils"

// Ledger stamps: arrived = ink record, in transit = orange stamp, booked = pencilled in.
const STATUS_STYLES: Record<Status, string> = {
  arrived: "border-ink/70 text-ink",
  "in-transit": "border-stamp text-stamp",
  booked: "border-ink/25 text-muted-foreground",
}

export function StatusBadge({ status, className }: { status: Status; className?: string }) {
  return (
    <span
      className={cn(
        "inline-block border px-2 py-0.5 text-[10px] font-semibold tracking-[0.14em] uppercase",
        STATUS_STYLES[status],
        className,
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  )
}
