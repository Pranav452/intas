"use client"

import { useActionState, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { ArrowRight, Bot, CheckCircle2, FileSpreadsheet, Loader2, TriangleAlert, UploadCloud } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { STATUS_LABEL, shipmentStatus, type Shipment, type Status } from "@/lib/data"
import { cn } from "@/lib/utils"
import { analyzeUpload, commitUpload, type AnalyzeState, type CommitState } from "./actions"

const GRID_PAGE = 20

const STATUS_CLS: Record<Status, string> = {
  arrived: "border-stamp/40 text-stamp",
  "in-transit": "border-ink/30 text-ink/70",
  booked: "border-ink/[0.15] text-muted-foreground",
}

export function UploadForm({ today }: { today: string }) {
  const [state, analyzeAction, analyzing] = useActionState<AnalyzeState, FormData>(analyzeUpload, {})
  const [commitState, commitAction, committing] = useActionState<CommitState, FormData>(commitUpload, {})
  const [fileName, setFileName] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // editable copy of the parsed rows
  const [rows, setRows] = useState<Shipment[]>([])
  const [flaggedOnly, setFlaggedOnly] = useState(false)
  const [page, setPage] = useState(0)

  useEffect(() => {
    if (state.shipments) {
      setRows(state.shipments)
      setPage(0)
    }
  }, [state.shipments])

  const warningAwbs = useMemo(() => {
    const set = new Set<string>()
    for (const e of state.ai?.explanations ?? []) if (e.awb) set.add(e.awb)
    for (const w of state.report?.warnings ?? []) {
      const m = w.match(/AWB\s+([0-9-]{8,})/)
      if (m) set.add(m[1])
    }
    return set
  }, [state.ai, state.report])

  // carry the original row index so edits & React keys survive filtering/paging
  const indexed = useMemo(() => rows.map((row, idx) => ({ row, idx })), [rows])
  const visible = useMemo(
    () => (flaggedOnly ? indexed.filter(({ row }) => warningAwbs.has(row.awb)) : indexed),
    [indexed, flaggedOnly, warningAwbs],
  )
  const pageCount = Math.max(1, Math.ceil(visible.length / GRID_PAGE))
  const safePage = Math.min(page, pageCount - 1)
  const pageRows = visible.slice(safePage * GRID_PAGE, (safePage + 1) * GRID_PAGE)

  const edit = (idx: number, patch: Partial<Shipment>) =>
    setRows((cur) => cur.map((r, i) => (i === idx ? { ...r, ...patch } : r)))

  const cellCls =
    "w-full rounded-md border border-transparent bg-transparent px-1.5 py-1 text-[11.5px] focus:border-stamp focus:bg-card focus:outline-none"

  if (commitState.success) {
    return (
      <Card className="gap-4 rounded-2xl border-stamp/30 bg-stamp/[0.05] p-6 shadow-xs">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-stamp" />
          <span className="text-sm font-medium">
            Committed — {commitState.shipments} AWBs
            {commitState.versionId ? ` · version #${commitState.versionId}` : ""}
          </span>
        </div>
        {commitState.warnings && commitState.warnings.length > 0 && (
          <ul data-lenis-prevent className="max-h-40 overflow-auto rounded-xl border border-ink/[0.1] bg-card p-3 text-[11px] leading-relaxed text-muted-foreground">
            {commitState.warnings.map((w, i) => (
              <li key={i}>· {w}</li>
            ))}
          </ul>
        )}
        <Button asChild size="sm" className="group w-fit rounded-full bg-ink px-4 text-paper hover:bg-ink/85">
          <Link href="/dashboard">
            Open updated ledger
            <ArrowRight className="ml-1 h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </Button>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Stage 1 — pick file + analyse */}
      {!state.shipments && (
        <form action={analyzeAction} className="flex flex-col gap-4">
          <label
            onDragOver={(e) => {
              e.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragging(false)
              const file = e.dataTransfer.files?.[0]
              if (file && inputRef.current) {
                const dt = new DataTransfer()
                dt.items.add(file)
                inputRef.current.files = dt.files
                setFileName(file.name)
              }
            }}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed bg-card p-10 text-center shadow-xs transition-all duration-300",
              dragging
                ? "border-stamp/60 bg-stamp/[0.05]"
                : "border-ink/[0.25] hover:border-ink/[0.45] hover:bg-ink/[0.04]",
            )}
          >
            <input
              ref={inputRef}
              type="file"
              name="file"
              accept=".xlsx,.xls,.csv,.tsv,.txt"
              className="sr-only"
              onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
            />
            {fileName ? (
              <>
                <FileSpreadsheet className="h-8 w-8 text-stamp" />
                <span className="text-sm font-medium">{fileName}</span>
                <span className="text-xs text-muted-foreground">Click to choose a different file</span>
              </>
            ) : (
              <>
                <UploadCloud className="h-8 w-8 text-muted-foreground/60" />
                <span className="text-sm font-medium">Drop the air-freight sheet here</span>
                <span className="text-xs text-muted-foreground">
                  or click to browse · .xlsx, .csv or .tsv export of the LINKS ops sheet
                </span>
              </>
            )}
          </label>

          <Button type="submit" disabled={analyzing} className="h-10 rounded-xl bg-ink px-6 text-paper hover:bg-ink/85">
            {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
            {analyzing ? "Parsing & running AI review…" : "Analyse before upload"}
          </Button>

          {state.error && (
            <p className="rounded-xl border border-destructive/30 bg-destructive/[0.06] px-4 py-3 text-xs text-destructive">
              {state.error}
            </p>
          )}
        </form>
      )}

      {/* Stage 2 — review, edit, commit */}
      {state.shipments && state.report && (
        <>
          {/* Totals strip */}
          <Card className="gap-3 rounded-2xl border-ink/[0.12] bg-card p-5 shadow-xs">
            <div className="flex items-center gap-2 text-[11px] font-medium tracking-widest text-muted-foreground uppercase">
              <FileSpreadsheet className="h-3.5 w-3.5 text-stamp" />
              {state.fileName}
            </div>
            <div className="flex flex-wrap items-baseline gap-x-8 gap-y-2">
              {[
                { label: "Tabs", value: state.report.sheets.toLocaleString("en-IN") },
                { label: "AWBs", value: state.report.shipments.toLocaleString("en-IN") },
                { label: "Packages", value: state.report.pkgs.toLocaleString("en-IN") },
                { label: "Gross kg", value: state.report.grossWt.toLocaleString("en-IN") },
                { label: "Chargeable kg", value: state.report.chargeableWt.toLocaleString("en-IN") },
                { label: "Warnings", value: String(state.report.warnings.length), stamp: state.report.warnings.length > 0 },
                { label: "Duplicates merged", value: String(state.report.mergedDuplicates) },
              ].map((item) => (
                <div key={item.label} className="flex flex-col gap-0.5">
                  <span className={cn("font-serif text-xl font-bold tabular-nums", item.stamp && "text-stamp")}>
                    {item.value}
                  </span>
                  <span className="text-[9px] tracking-widest text-muted-foreground uppercase">{item.label}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* AI review */}
          {(state.ai?.overview || (state.ai?.explanations.length ?? 0) > 0) && (
            <Card className="gap-4 rounded-2xl border-ink/[0.12] bg-card p-5 shadow-xs">
              <div className="flex items-center gap-2 text-[11px] font-medium tracking-widest text-muted-foreground uppercase">
                <Bot className="h-3.5 w-3.5 text-stamp" />
                AI data-quality review
              </div>
              {state.ai?.overview && (
                <p className="font-serif text-[15px] leading-[1.7] text-ink/90">{state.ai.overview}</p>
              )}
              {(state.ai?.actions.length ?? 0) > 0 && (
                <ol className="flex flex-col gap-1.5 text-[12.5px] leading-relaxed">
                  {state.ai!.actions.map((a, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="font-serif text-sm font-bold text-stamp">{i + 1}.</span>
                      <span>{a}</span>
                    </li>
                  ))}
                </ol>
              )}
              {(state.ai?.explanations.length ?? 0) > 0 && (
                <>
                  <Separator className="bg-ink/[0.1]" />
                  <div data-lenis-prevent className="flex max-h-72 flex-col gap-2 overflow-y-auto pr-1">
                    {state.ai!.explanations.map((e, i) => (
                      <div key={i} className="rounded-r-lg border-l-2 border-stamp/60 bg-stamp/[0.04] px-3 py-2">
                        <div className="flex items-start gap-1.5 text-[11.5px] font-medium">
                          <TriangleAlert className="mt-0.5 h-3 w-3 shrink-0 text-stamp" />
                          {e.warning}
                        </div>
                        {e.cause && (
                          <p className="mt-1 text-[11.5px] leading-relaxed text-muted-foreground">
                            <span className="font-medium tracking-wide text-ink/70 uppercase">Why:</span> {e.cause}
                          </p>
                        )}
                        {e.fix && (
                          <p className="mt-0.5 text-[11.5px] leading-relaxed text-muted-foreground">
                            <span className="font-medium tracking-wide text-stamp uppercase">Fix:</span> {e.fix}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </Card>
          )}

          {/* Raw warnings when the AI review is unavailable (no key / failure) */}
          {(state.ai?.explanations.length ?? 0) === 0 && state.report.warnings.length > 0 && (
            <Card className="gap-2 rounded-2xl border-ink/[0.12] bg-card p-5 shadow-xs">
              <div className="flex items-center gap-1.5 text-[11px] font-medium tracking-widest text-muted-foreground uppercase">
                <TriangleAlert className="h-3.5 w-3.5 text-stamp" />
                {state.report.warnings.length} data warnings
              </div>
              <ul data-lenis-prevent className="max-h-40 overflow-auto rounded-xl border border-ink/[0.1] bg-card p-3 text-[11px] leading-relaxed text-muted-foreground">
                {state.report.warnings.map((w, i) => (
                  <li key={i}>· {w}</li>
                ))}
              </ul>
            </Card>
          )}

          {/* Editable grid */}
          <Card className="gap-3 rounded-2xl border-ink/[0.12] bg-card p-5 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-[11px] font-medium tracking-widest text-muted-foreground uppercase">
                Check &amp; edit before commit
                <span className="ml-2 normal-case tracking-normal">{visible.length} rows · flagged rows marked</span>
              </span>
              <label className="flex cursor-pointer items-center gap-2 text-[10px] font-medium tracking-widest uppercase">
                <input
                  type="checkbox"
                  className="accent-stamp"
                  checked={flaggedOnly}
                  onChange={(e) => {
                    setFlaggedOnly(e.target.checked)
                    setPage(0)
                  }}
                />
                Flagged only
              </label>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-[11.5px]">
                <thead>
                  <tr className="text-left text-[9px] tracking-widest text-muted-foreground uppercase">
                    <th className="border-b border-ink/30 px-1.5 py-2 font-medium">AWB</th>
                    <th className="border-b border-ink/30 px-1.5 py-2 font-medium">AWB date (ISO)</th>
                    <th className="border-b border-ink/30 px-1.5 py-2 font-medium">Airline</th>
                    <th className="border-b border-ink/30 px-1.5 py-2 font-medium">Destination</th>
                    <th className="border-b border-ink/30 px-1.5 py-2 font-medium">Consignee</th>
                    <th className="border-b border-ink/30 px-1.5 py-2 text-right font-medium">Pkg</th>
                    <th className="border-b border-ink/30 px-1.5 py-2 text-right font-medium">Gross kg</th>
                    <th className="border-b border-ink/30 px-1.5 py-2 text-right font-medium">Chg. kg</th>
                    <th className="border-b border-ink/30 px-1.5 py-2 font-medium">Flight details</th>
                    <th className="border-b border-ink/30 px-1.5 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map(({ row: r, idx }) => {
                    const flagged = warningAwbs.has(r.awb)
                    const status = shipmentStatus(r, today)
                    return (
                      <tr key={idx} className={cn("border-b border-ink/[0.08] align-top", flagged && "bg-stamp/[0.05]")}>
                        <td className="w-32">
                          <div className="flex items-center gap-1">
                            {flagged && <TriangleAlert className="h-3 w-3 shrink-0 text-stamp" />}
                            <input
                              className={cn(cellCls, "font-mono text-[11px] font-semibold")}
                              value={r.awb}
                              onChange={(e) => edit(idx, { awb: e.target.value })}
                            />
                          </div>
                        </td>
                        <td className="w-26">
                          <input
                            className={cellCls}
                            value={r.awbDate}
                            onChange={(e) => edit(idx, { awbDate: e.target.value })}
                          />
                        </td>
                        <td className="w-14">
                          <input
                            className={cn(cellCls, "font-mono text-[11px] uppercase")}
                            value={r.airline}
                            onChange={(e) => edit(idx, { airline: e.target.value })}
                          />
                        </td>
                        <td className="w-36">
                          <input
                            className={cellCls}
                            value={r.destination}
                            onChange={(e) => edit(idx, { destination: e.target.value })}
                          />
                        </td>
                        <td className="min-w-40">
                          <input
                            className={cellCls}
                            value={r.consignee}
                            onChange={(e) => edit(idx, { consignee: e.target.value })}
                          />
                        </td>
                        <td className="w-14">
                          <input
                            className={cn(cellCls, "text-right tabular-nums")}
                            defaultValue={String(r.pkgs)}
                            onChange={(e) => edit(idx, { pkgs: Number(e.target.value) || 0 })}
                          />
                        </td>
                        <td className="w-20">
                          <input
                            className={cn(cellCls, "text-right tabular-nums")}
                            defaultValue={String(r.grossWt)}
                            onChange={(e) => edit(idx, { grossWt: Number(e.target.value) || 0 })}
                          />
                        </td>
                        <td className="w-20">
                          <input
                            className={cn(cellCls, "text-right tabular-nums")}
                            defaultValue={String(r.chargeableWt)}
                            onChange={(e) => edit(idx, { chargeableWt: Number(e.target.value) || 0 })}
                          />
                        </td>
                        <td className="min-w-64">
                          <textarea
                            rows={1}
                            className={cn(cellCls, "resize-y font-mono text-[10.5px]")}
                            value={r.flightDetailsRaw ?? ""}
                            onChange={(e) => edit(idx, { flightDetailsRaw: e.target.value })}
                          />
                        </td>
                        <td className="w-22 px-1.5 py-1.5">
                          <span
                            className={cn(
                              "inline-flex rounded-full border px-2 py-0.5 text-[9px] tracking-widest uppercase",
                              STATUS_CLS[status],
                            )}
                          >
                            {STATUS_LABEL[status]}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {pageCount > 1 && (
              <div className="flex items-center justify-between border-t border-ink/[0.1] pt-3">
                <span className="text-[10px] font-medium tracking-widest text-muted-foreground uppercase tabular-nums">
                  Rows {safePage * GRID_PAGE + 1}–{Math.min((safePage + 1) * GRID_PAGE, visible.length)} of {visible.length}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPage(Math.max(0, safePage - 1))}
                    disabled={safePage === 0}
                    className="rounded-full border border-ink/25 bg-card px-3 py-1 text-[10px] font-medium tracking-widest uppercase transition-colors hover:bg-ink hover:text-paper disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    ← Prev
                  </button>
                  <span className="font-serif text-xs font-bold tabular-nums">
                    {safePage + 1} / {pageCount}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPage(Math.min(pageCount - 1, safePage + 1))}
                    disabled={safePage >= pageCount - 1}
                    className="rounded-full border border-ink/25 bg-card px-3 py-1 text-[10px] font-medium tracking-widest uppercase transition-colors hover:bg-ink hover:text-paper disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </Card>

          {/* Commit */}
          <form action={commitAction}>
            <Card className="flex-row flex-wrap items-end gap-4 rounded-2xl border-ink/[0.12] bg-card p-5 shadow-xs">
              <input type="hidden" name="rows" value={JSON.stringify(rows)} />
              <input type="hidden" name="source" value={state.fileName ?? "edited upload"} />
              <div className="flex flex-col gap-1.5">
                <label htmlFor="asOf" className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Data as of
                </label>
                <Input
                  id="asOf"
                  name="asOf"
                  type="date"
                  defaultValue={today}
                  className="h-10 rounded-xl border-ink/[0.2] bg-card shadow-xs"
                />
              </div>
              <Button type="submit" disabled={committing} className="h-10 rounded-xl bg-ink px-6 text-paper hover:bg-ink/85">
                {committing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                {committing ? "Committing…" : `Commit ${rows.length} AWBs & sync ledger`}
              </Button>
              {commitState.error && (
                <p className="w-full rounded-xl border border-destructive/30 bg-destructive/[0.06] px-4 py-3 text-xs text-destructive">
                  {commitState.error}
                </p>
              )}
            </Card>
          </form>
        </>
      )}
    </div>
  )
}
