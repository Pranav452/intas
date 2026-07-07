// Air-sheet parser regression test — messy TSV modeled on the real LINKS export.
// Usage: npx tsx scripts/test-ingest.ts
import { parseWorkbook } from "../lib/ingest"

const HEADER = [
  "SR. NO.", "MONTH", "INVOICE NO.", "INVOICE NO.", "INVOICE NO.", "INVOICE NO.", "CONSIGNEE",
  "SHIPMENT MODE", "LOADING PORT", "DESTINATION PORT", "NO OF PKGS", "GR. WT.", "CHARGEABLE WT.",
  "AIRLINE / SHIPPING LINE", "AWB/BL NO.", "HAWB/ HBL NO.", "AWB DATE", "FLIGHT / VESSEL DETAILS",
  "ETD", "ETA", "EGM No.", "EGM Date", "SHIPPING BILL NO.", "SHIPPING BILL DT", "R E M A R K",
]

function row(cells: Partial<Record<number, string>>): string {
  return Array.from({ length: 25 }, (_, i) => cells[i] ?? "").join("\t")
}

const rows = [
  HEADER.join("\t"),
  // multi-invoice, multi-leg, multi-SB
  row({ 0: "2", 1: "01.06.2026", 2: "4026101834", 3: "4026101833", 4: "4026101832", 6: "CSP",
    7: "AIR", 8: "MUMBAI", 9: "LYON", 10: "30", 11: "3136", 12: "6517", 13: "LH", 14: "020-05265256",
    16: "01.06.2026", 17: "LH:8023/03.06.2026-FRA              LH:7658S/04.06.2026-LYS",
    18: "03.06.2026", 19: "04.06.2026", 20: "1055596", 21: "03.06.2026",
    22: "3717335/ 3717152/ 3717064", 23: "30.05.2026", 24: "OK" }),
  // duplicate flight listed twice with different dates (keep latest), HAWB
  row({ 0: "16", 1: "20.06.2026", 2: "4026102078", 6: "APOTEX CANADA", 7: "AIR", 8: "MUMBAI",
    9: "TORONTO", 10: "8", 11: "1191.586", 12: "1582", 13: "LH", 14: "020-05459543",
    16: "20.06.2026", 17: "LH:767/23.06.2026-MUC                              LH 494/23.06.2026 YYZ          LH:494/25.06.2026-YYZ",
    18: "23.06.2026", 19: "25.06.2026", 20: "1058590", 21: "23.06.2026", 22: "4290130", 23: "19.06.2026", 24: "OK" }),
  // ETA-before-ETD month typo (03.06 should be 03.07)
  row({ 0: "24", 1: "29.06.2026", 2: "4026102184", 6: "PHARMAS D.O.O", 7: "AIR", 8: "MUMBAI",
    9: "BELGRADE", 10: "5", 11: "652", 12: "884", 13: "TK", 14: "235-36093934",
    16: "29.06.2026", 17: "TK-6659/30.06.2026-IST                TK-6501/03.06.2026-BEG",
    18: "30.06.2026", 19: "03.06.2026", 20: "1059821", 21: "30.06.2026", 22: "4509114", 23: "26.06.2026", 24: "OK" }),
  // implausible weight pair -> flagged + excluded from weight totals
  row({ 0: "26", 1: "01.07.2026", 2: "7026100017", 6: "HIKMA SPECIALZED PHARMACEUTICALS", 7: "AIR",
    8: "MUMBAI", 9: "CAIRO", 10: "4", 11: "9020", 12: "19", 13: "EK", 14: "176-29013272",
    16: "01.07.2026", 17: "EK-0505/02.07.2026-DXB   EK-0925/03.07.2026-CAI",
    18: "02.07.2026", 19: "03.07.2026", 22: "4625085", 23: "30.06.2026" }),
  // AZ airline with LH awb prefix (warn, keep AZ) + DELHI origin
  row({ 0: "29", 1: "02.07.2026", 2: "8026100465", 6: "SCF SRL", 7: "AIR", 8: "DELHI",
    9: "MILAN MALPENSA", 10: "8", 11: "592", 12: "1515", 13: "AZ", 14: "020-07466675",
    16: "02.07.2026", 17: "AZ-769/05.07.2026-FCO       LH-7900S/05.07.2026-MXP",
    18: "05.07.2026", 19: "05.07.2026", 22: "4681628", 23: "02.07.2026" }),
  // duplicate AWB — sparse then complete (merge keeps complete + fills gaps)
  row({ 0: "30", 1: "03.07.2026", 2: "7526100557", 6: "NEURAXPHARM", 7: "AIR", 8: "MUMBAI",
    9: "FRANKFURT", 10: "20", 11: "2238.384", 12: "3471", 13: "LH", 14: "020-05575511",
    16: "03.07.2026", 17: "LH-8027/06.07.2026-FRA", 18: "06.07.2026", 19: "06.07.2026" }),
  row({ 0: "30", 1: "03.07.2026", 2: "7526100557", 6: "NEURAXPHARM", 7: "AIR", 8: "MUMBAI",
    9: "FRANKFURT", 10: "20", 11: "2238.384", 12: "3471", 13: "LH", 14: "020-05575511",
    16: "03.07.2026", 17: "LH-8027/06.07.2026-FRA", 18: "06.07.2026", 19: "06.07.2026",
    20: "1060000", 21: "06.07.2026", 22: "4618717", 23: "30.06.2026", 24: "OK" }),
  // unknown destination airport -> warning
  row({ 0: "31", 1: "04.07.2026", 2: "9026100001", 6: "TEST PHARMA", 7: "AIR", 8: "MUMBAI",
    9: "TIMBUKTU", 10: "2", 11: "100", 12: "150", 13: "LH", 14: "020-99999999",
    16: "04.07.2026", 17: "LH-757/05.07.2026-FRA", 18: "05.07.2026", 19: "05.07.2026" }),
  // fully empty row (skipped silently)
  row({}),
  // row with consignee but no AWB -> skipped with warning
  row({ 0: "32", 6: "NO AWB YET LTD", 9: "PARIS" }),
]

const tsv = rows.join("\n")
const { shipments, report } = parseWorkbook(Buffer.from(tsv, "utf8"), 2026)

console.log("REPORT:", JSON.stringify(report, null, 2))

const byAwb = new Map(shipments.map((s) => [s.awb, s]))
let fail = false
const assert = (cond: boolean, msg: string) => {
  console.log(cond ? `PASS  ${msg}` : `FAIL  ${msg}`)
  if (!cond) fail = true
}

assert(report.shipments === 7, `7 unique AWBs (got ${report.shipments})`)
assert(report.mergedDuplicates === 1, "1 duplicate AWB merged")
assert(report.skippedRows === 1, "1 row skipped (no AWB)")
const csp = byAwb.get("020-05265256")!
assert(csp.invoices.length === 3, "3 invoices merged from 4 columns")
assert(csp.sbNos.length === 3, "3 shipping bills split")
assert(csp.legs.length === 2 && csp.legs[1].to === "LYS", "CSP legs parsed FRA→LYS")
const apotex = byAwb.get("020-05459543")!
assert(apotex.legs.length === 2, `duplicate flight deduped (got ${apotex.legs.length} legs)`)
assert(apotex.legs.find((l) => l.to === "YYZ")?.date === "2026-06-25", "kept latest YYZ leg date")
const pharmas = byAwb.get("235-36093934")!
assert(pharmas.eta === "2026-07-03", `ETA month typo corrected (got ${pharmas.eta})`)
const hikma = byAwb.get("176-29013272")!
assert(hikma.excludeFromWeights === true, "implausible weights flagged for exclusion")
assert(report.chargeableWt === 6517 + 1582 + 884 + 1515 + 3471 + 150, "chargeable total excludes flagged row")
const scf = byAwb.get("020-07466675")!
assert(scf.origin === "DELHI" && scf.airline === "AZ", "Delhi origin + AZ airline kept")
assert(report.warnings.some((w) => w.includes("prefix 020")), "AWB prefix mismatch warned")
assert(report.warnings.some((w) => w.includes("TIMBUKTU")), "unknown destination warned")
const neurax = byAwb.get("020-05575511")!
assert(neurax.egmNo === "1060000" && neurax.remark === "OK", "duplicate merge kept complete row's EGM")

if (fail) process.exit(1)
console.log("\nAll parser checks passed.")
