import type { Metadata } from "next"
import Link from "next/link"
import { Database, Fingerprint, History, Inbox, Network, ScrollText, UploadCloud } from "lucide-react"

import { BarChartCard } from "@/components/charts/bar-chart-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { SiteHeader } from "@/components/site-header"
import { listAllowedIps, listDevices, listIpRequests, recentAuditRows, requestIdentity } from "@/lib/auth"
import { dbEnabled } from "@/lib/db"
import { fmt, fmtDate, fmtDateShort } from "@/lib/stats"
import { listVersions, loadDataset } from "@/lib/store"
import { addAllowedIp, deleteAllowedIp, deleteDevice, resolveIpRequestAction, rollbackToVersion } from "./actions"

export const metadata: Metadata = {
  title: "Admin · INTAS DSR by LINKS",
}

export const dynamic = "force-dynamic"

function SectionTitle({ icon, title, hint }: { icon: React.ReactNode; title: string; hint?: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground/60 [&_svg]:h-4 [&_svg]:w-4">{icon}</span>
        <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{title}</span>
      </div>
      {hint && <span className="text-xs text-muted-foreground/50">{hint}</span>}
    </div>
  )
}

export default async function AdminPage() {
  const enabled = dbEnabled()
  const [versions, ips, devices, log, dataset, identity, ipRequests] = await Promise.all([
    listVersions(),
    listAllowedIps(),
    listDevices(),
    recentAuditRows(30),
    loadDataset(),
    requestIdentity(),
    listIpRequests("pending"),
  ])

  const timeline = [...versions].reverse().map((v) => ({
    label: fmtDateShort(v.as_of),
    value: v.chargeable_wt,
    muted: !v.active,
    hint: `${fmtDateShort(v.as_of)} · ${fmt(v.chargeable_wt)} kg · ${v.shipments_count} AWB${v.active ? " · LIVE" : ""}`,
  }))

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        <div className="mb-8 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-[11px] font-medium tracking-widest text-muted-foreground/70 uppercase">
            <span>LINKS</span>
            <span className="text-muted-foreground/30">/</span>
            <span>Admin panel</span>
          </div>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Portal administration</h1>
            <Button asChild size="sm" className="rounded-full bg-ink px-4 text-white hover:bg-ink/85">
              <Link href="/admin/upload">
                <UploadCloud className="h-3.5 w-3.5" />
                Upload new data
              </Link>
            </Button>
          </div>
        </div>

        {!enabled && (
          <Card className="mb-4 gap-2 rounded-2xl border-amber-500/30 bg-amber-500/[0.05] p-5 shadow-xs">
            <span className="text-sm font-medium text-amber-700">Database not connected</span>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Version history, rollback, devices and the IP allowlist need Neon. Set{" "}
              <code className="rounded bg-black/[0.06] px-1">DATABASE_URL</code> in{" "}
              <code className="rounded bg-black/[0.06] px-1">.env.local</code>, run{" "}
              <code className="rounded bg-black/[0.06] px-1">npx tsx scripts/migrate.ts</code>, then restart.
            </p>
          </Card>
        )}

        {/* Live dataset */}
        <Card className="mb-4 flex-row items-center gap-4 rounded-2xl border-black/[0.06] bg-white p-5 shadow-xs">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-stamp/30 bg-stamp/[0.07]">
            <Database className="h-4 w-4 text-stamp" />
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium">
              Live dataset · {fmt(dataset.shipments.length)} AWBs · data as of {fmtDate(dataset.asOf)}
            </span>
            <span className="text-xs text-muted-foreground">
              Source: {dataset.source}
              {dataset.versionId ? ` · version #${dataset.versionId}` : ""}
              {dataset.updatedAt ? ` · uploaded ${new Date(dataset.updatedAt).toLocaleString("en-IN")}` : ""}
            </span>
          </div>
        </Card>

        {/* Version timeline graph */}
        {timeline.length > 0 && (
          <div className="mb-4">
            <BarChartCard
              title="Version timeline"
              subtitle="chargeable kg per uploaded snapshot · solid bar = live version"
              data={timeline}
              unit="kg"
              height={110}
              live={false}
            />
          </div>
        )}

        {/* Versions + rollback */}
        <Card className="mb-4 gap-4 rounded-2xl border-black/[0.06] bg-white p-6 shadow-xs">
          <SectionTitle
            icon={<History />}
            title="Dataset versions"
            hint={enabled ? `${versions.length} stored — roll back any time` : "needs database"}
          />
          {versions.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No versions stored yet. {enabled ? "Upload a sheet to create the first version." : "Connect the database first."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-black/[0.06] text-[11px] tracking-wide text-muted-foreground/70 uppercase">
                    <th className="py-2 pr-4 font-medium">#</th>
                    <th className="py-2 pr-4 font-medium">Data as of</th>
                    <th className="py-2 pr-4 font-medium">Source</th>
                    <th className="py-2 pr-4 font-medium">Uploaded</th>
                    <th className="py-2 pr-4 text-right font-medium">AWBs</th>
                    <th className="py-2 pr-4 text-right font-medium">Pkgs</th>
                    <th className="py-2 pr-4 text-right font-medium">Chg. kg</th>
                    <th className="py-2 pr-4 text-right font-medium">Warnings</th>
                    <th className="py-2 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {versions.map((v) => (
                    <tr key={v.id} className="border-b border-black/[0.04] text-xs transition-colors hover:bg-black/[0.02]">
                      <td className="py-2.5 pr-4 font-mono text-muted-foreground">{v.id}</td>
                      <td className="py-2.5 pr-4 font-medium tabular-nums">{fmtDate(v.as_of)}</td>
                      <td className="max-w-44 truncate py-2.5 pr-4 text-muted-foreground">{v.source}</td>
                      <td className="py-2.5 pr-4 text-muted-foreground tabular-nums">
                        {new Date(v.uploaded_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                        {v.uploaded_by ? ` · ${v.uploaded_by}` : ""}
                      </td>
                      <td className="py-2.5 pr-4 text-right tabular-nums">{v.shipments_count}</td>
                      <td className="py-2.5 pr-4 text-right tabular-nums">{fmt(v.pkgs)}</td>
                      <td className="py-2.5 pr-4 text-right tabular-nums">{fmt(v.chargeable_wt)}</td>
                      <td className="py-2.5 pr-4 text-right tabular-nums text-muted-foreground">{v.warnings.length}</td>
                      <td className="py-2.5 text-right">
                        {v.active ? (
                          <Badge className="gap-1.5 rounded-full border-stamp/40 bg-stamp/10 px-2.5 text-[10px] text-stamp" variant="outline">
                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-stamp" />
                            Live
                          </Badge>
                        ) : (
                          <form action={rollbackToVersion}>
                            <input type="hidden" name="id" value={v.id} />
                            <Button
                              type="submit"
                              size="sm"
                              variant="outline"
                              className="h-7 rounded-full border-black/[0.12] bg-white px-3 text-[11px] shadow-xs hover:bg-black/[0.03]"
                            >
                              Roll back to this
                            </Button>
                          </form>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Access requests */}
        {ipRequests.length > 0 && (
          <Card className="mb-4 gap-4 rounded-2xl border-stamp/30 bg-stamp/[0.04] p-6 shadow-xs">
            <SectionTitle icon={<Inbox />} title="Access requests" hint={`${ipRequests.length} pending`} />
            <div className="flex flex-col gap-2">
              {ipRequests.map((r) => (
                <div
                  key={r.id}
                  className="flex flex-col gap-2 rounded-xl border border-black/[0.06] bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 text-xs">
                      <span className="font-medium">{r.username}</span>
                      <code className="rounded bg-black/[0.05] px-1.5 py-0.5 text-[11px]">{r.ip}</code>
                      <span className="text-muted-foreground">
                        {new Date(r.requested_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                      </span>
                    </div>
                    {r.note && <p className="mt-1 truncate text-[11px] text-muted-foreground">"{r.note}"</p>}
                    {r.user_agent && (
                      <p className="mt-0.5 truncate text-[10px] text-muted-foreground/60">{r.user_agent}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <form action={resolveIpRequestAction}>
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="action" value="approve" />
                      <Button type="submit" size="sm" className="h-7 rounded-full bg-ink px-3 text-[11px] text-white hover:bg-ink/85">
                        Approve
                      </Button>
                    </form>
                    <form action={resolveIpRequestAction}>
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="action" value="deny" />
                      <Button
                        type="submit"
                        size="sm"
                        variant="ghost"
                        className="h-7 rounded-full px-3 text-[11px] text-muted-foreground hover:text-destructive"
                      >
                        Deny
                      </Button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        <div className="mb-4 grid gap-4 lg:grid-cols-2">
          {/* IP allowlist */}
          <Card className="gap-4 rounded-2xl border-black/[0.06] bg-white p-6 shadow-xs">
            <SectionTitle
              icon={<Network />}
              title="Allowed networks"
              hint={enabled ? (ips.length === 0 ? "empty = every IP allowed" : `${ips.length} rules`) : "needs database"}
            />
            <p className="text-[11px] leading-relaxed text-muted-foreground/70">
              Applies to <span className="text-foreground/80">client</span> sign-ins. Exact IP, or a prefix ending
              with a dot (e.g. <code className="rounded bg-black/[0.05] px-1">196.223.11.</code>). Localhost and
              admin logins are always allowed. Your current IP:{" "}
              <code className="rounded bg-black/[0.05] px-1">{identity.ip}</code>
            </p>
            <div className="flex flex-col gap-1.5">
              {ips.map((r) => (
                <div key={r.id} className="flex items-center gap-3 rounded-xl border border-black/[0.05] bg-black/[0.02] px-3 py-2">
                  <code className="text-xs">{r.ip}</code>
                  <span className="min-w-0 flex-1 truncate text-[11px] text-muted-foreground/60">{r.label}</span>
                  <form action={deleteAllowedIp}>
                    <input type="hidden" name="id" value={r.id} />
                    <Button
                      type="submit"
                      size="sm"
                      variant="ghost"
                      className="h-6 rounded-full px-2.5 text-[11px] text-muted-foreground hover:text-destructive"
                    >
                      Remove
                    </Button>
                  </form>
                </div>
              ))}
            </div>
            {enabled && (
              <form action={addAllowedIp} className="flex flex-col gap-2 sm:flex-row">
                <Input
                  name="ip"
                  required
                  placeholder="IP or prefix. (e.g. 103.120.45.10)"
                  className="h-9 flex-1 rounded-full border-black/[0.1] bg-white text-xs shadow-xs"
                />
                <Input
                  name="label"
                  placeholder="Label (INTAS office)"
                  className="h-9 flex-1 rounded-full border-black/[0.1] bg-white text-xs shadow-xs"
                />
                <Button type="submit" size="sm" className="h-9 rounded-full bg-ink px-4 text-xs text-white hover:bg-ink/85">
                  Allow IP
                </Button>
              </form>
            )}
          </Card>

          {/* Devices */}
          <Card className="gap-4 rounded-2xl border-black/[0.06] bg-white p-6 shadow-xs">
            <SectionTitle icon={<Fingerprint />} title="Registered devices" hint={`${devices.length} of 3 slots`} />
            <p className="text-[11px] leading-relaxed text-muted-foreground/70">
              Client logins are trust-on-first-use: the first 3 devices register automatically, any further device is
              refused. Remove a device to free its slot.
            </p>
            <div className="flex flex-col gap-1.5">
              {devices.length === 0 && <p className="text-xs text-muted-foreground">No devices registered yet.</p>}
              {devices.map((d) => (
                <div key={d.id} className="flex items-center gap-3 rounded-xl border border-black/[0.05] bg-black/[0.02] px-3 py-2">
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-xs">
                      <code className="text-muted-foreground">{d.id.slice(0, 8)}</code> · {d.ip}
                    </span>
                    <span className="truncate text-[10px] text-muted-foreground/60">
                      since {new Date(d.firstSeen).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })} ·{" "}
                      {d.userAgent}
                    </span>
                  </div>
                  <form action={deleteDevice}>
                    <input type="hidden" name="id" value={d.id} />
                    <Button
                      type="submit"
                      size="sm"
                      variant="ghost"
                      className="h-6 rounded-full px-2.5 text-[11px] text-muted-foreground hover:text-destructive"
                    >
                      Remove
                    </Button>
                  </form>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Access log */}
        <Card className="gap-4 rounded-2xl border-black/[0.06] bg-white p-6 shadow-xs">
          <SectionTitle icon={<ScrollText />} title="Access log" hint="latest 30 events" />
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-black/[0.06] text-[11px] tracking-wide text-muted-foreground/70 uppercase">
                  <th className="py-2 pr-4 font-medium">Time</th>
                  <th className="py-2 pr-4 font-medium">Event</th>
                  <th className="py-2 pr-4 font-medium">User</th>
                  <th className="py-2 font-medium">IP</th>
                </tr>
              </thead>
              <tbody>
                {log.map((row, i) => (
                  <tr key={i} className="border-b border-black/[0.04] text-xs">
                    <td className="py-2 pr-4 whitespace-nowrap text-muted-foreground tabular-nums">
                      {new Date(row.ts).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "medium" })}
                    </td>
                    <td className="py-2 pr-4">
                      <span
                        className={
                          row.event.includes("failed") || row.event.includes("blocked")
                            ? "text-destructive"
                            : row.event.includes("ok") || row.event === "dataset-upload"
                              ? "text-stamp"
                              : "text-foreground/80"
                        }
                      >
                        {row.event}
                      </span>
                    </td>
                    <td className="py-2 pr-4 text-muted-foreground">{row.username ?? "—"}</td>
                    <td className="py-2 text-muted-foreground">{row.ip ?? "—"}</td>
                  </tr>
                ))}
                {log.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-xs text-muted-foreground">
                      No events yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </main>
    </div>
  )
}
