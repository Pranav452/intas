// Dashboard period selection shared by the filter UI and the page.

export interface Period {
  year: number | null // null = all time
  month: number | null // 1–12, only meaningful with a year
}

export const ALL_TIME: Period = { year: null, month: null }

export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

export function periodLabel(p: Period): string {
  if (p.year === null) return "All time"
  if (p.month === null) return String(p.year)
  return `${MONTH_NAMES[p.month - 1]} ${p.year}`
}

export function inPeriod(iso: string | null, p: Period): boolean {
  if (p.year === null) return true
  if (!iso) return false
  const [y, m] = iso.split("-").map(Number)
  if (y !== p.year) return false
  return p.month === null || m === p.month
}

export function availablePeriods(dates: (string | null)[]): { year: number; months: number[] }[] {
  const map = new Map<number, Set<number>>()
  for (const iso of dates) {
    if (!iso) continue
    const [y, m] = iso.split("-").map(Number)
    if (!map.has(y)) map.set(y, new Set())
    map.get(y)!.add(m)
  }
  return [...map.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([year, months]) => ({ year, months: [...months].sort((a, b) => a - b) }))
}

export function periodFromSearchParams(sp: { year?: string; month?: string }): Period {
  const year = /^\d{4}$/.test(sp.year ?? "") ? Number(sp.year) : null
  const monthRaw = year !== null && /^\d{1,2}$/.test(sp.month ?? "") ? Number(sp.month) : null
  return { year, month: monthRaw && monthRaw >= 1 && monthRaw <= 12 ? monthRaw : null }
}
