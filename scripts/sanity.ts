// Dataset sanity check against hand-computed sheet totals.
// Usage: npx tsx scripts/sanity.ts
import { SHIPMENTS } from "../lib/data"
import { computeStats } from "../lib/stats"

const stats = computeStats()

const pkgs = SHIPMENTS.reduce((a, s) => a + s.pkgs, 0)
const chargeableAll = SHIPMENTS.reduce((a, s) => a + s.chargeableWt, 0)

console.log("shipments:", SHIPMENTS.length, "(expect 29 — sr 20 absent in sheet)")
console.log("packages:", pkgs, "(expect 517)")
console.log("chargeable (all rows):", chargeableAll, "(expect 94071)")
console.log("chargeable (weight-clean):", Math.round(stats.totals.chargeableWt), "(94071 - 19 = 94052)")
console.log("gross (weight-clean):", Math.round(stats.totals.grossWt))
console.log("destinations:", stats.totals.destinations, "(expect 16)")
console.log("consignees:", stats.totals.consignees, "(expect 17)")
console.log("egm pending:", stats.totals.egmPending)
console.log("status:", stats.statusCounts.map((s) => `${s.status}=${s.shipments}`).join(" "))
console.log("airlines:", stats.byAirline.map((a) => a.name).join(", "))
console.log("hubs:", stats.byHub.map((h) => `${h.name}:${h.value}`).join(" "))

let fail = false
const assert = (cond: boolean, msg: string) => {
  console.log(cond ? `PASS  ${msg}` : `FAIL  ${msg}`)
  if (!cond) fail = true
}
assert(SHIPMENTS.length === 29, "29 shipments")
assert(pkgs === 517, "517 packages")
assert(chargeableAll === 94071, "94,071 kg chargeable (raw)")
assert(stats.totals.destinations === 16, "16 destination airports")
assert(new Set(SHIPMENTS.map((s) => s.awb)).size === 29, "AWBs unique")
assert(SHIPMENTS.every((s) => !s.eta || !s.etd || s.eta >= s.etd), "no ETA before ETD")
if (fail) process.exit(1)
