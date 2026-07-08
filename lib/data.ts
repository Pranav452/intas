// INTAS DSR air-freight shipment log, transcribed from the LINKS operations
// sheet (June–July 2026). Serial 20 is absent in the source sheet.
// All dates ISO YYYY-MM-DD.

export const DATA_AS_OF = "2026-07-07"

export interface FlightLeg {
  carrier: string
  flightNo: string
  date: string | null
  to: string // IATA of the leg destination
}

export interface Shipment {
  sr: number
  date: string // MONTH column (booking/invoice date)
  invoices: string[]
  consignee: string
  origin: "MUMBAI" | "DELHI" | "AHMEDABAD"
  destination: string // DESTINATION PORT as in sheet (keys lib/airports.ts)
  pkgs: number
  grossWt: number // kg
  chargeableWt: number // kg — air-freight billing weight
  airline: string // 2-letter carrier code
  awb: string
  hawb: string[]
  awbDate: string
  legs: FlightLeg[]
  etd: string | null
  eta: string | null
  egmNo: string | null
  egmDate: string | null
  sbNos: string[]
  sbDate: string | null
  remark: string | null
  /** data-quality note carried from the source sheet, shown in the table */
  flag?: string
  /** true when the sheet's weight pair is implausible — row stays in counts but out of weight totals */
  excludeFromWeights?: boolean
}

export type Status = "arrived" | "in-transit" | "booked"

export const STATUS_LABEL: Record<Status, string> = {
  arrived: "Arrived",
  "in-transit": "In transit",
  booked: "Booked",
}

export function shipmentStatus(s: Shipment, asOf: string = DATA_AS_OF): Status {
  if (s.eta && s.eta <= asOf) return "arrived"
  if (s.etd && s.etd <= asOf) return "in-transit"
  return "booked"
}

export const SHIPMENTS: Shipment[] = [
  {
    sr: 1, date: "2026-06-01", invoices: ["5126100963"], consignee: "MYLAN IRELAND LTD",
    origin: "MUMBAI", destination: "AMSTERDAM", pkgs: 10, grossWt: 606.144, chargeableWt: 1413,
    airline: "KL", awb: "074-72570186", hawb: [], awbDate: "2026-06-01",
    legs: [{ carrier: "KL", flightNo: "878", date: "2026-06-03", to: "AMS" }],
    etd: "2026-06-03", eta: "2026-06-03", egmNo: null, egmDate: null,
    sbNos: ["3668031"], sbDate: "2026-05-29", remark: "OK",
  },
  {
    sr: 2, date: "2026-06-01", invoices: ["4026101834", "4026101833", "4026101832"], consignee: "CSP",
    origin: "MUMBAI", destination: "LYON", pkgs: 30, grossWt: 3136, chargeableWt: 6517,
    airline: "LH", awb: "020-05265256", hawb: [], awbDate: "2026-06-01",
    legs: [
      { carrier: "LH", flightNo: "8023", date: "2026-06-03", to: "FRA" },
      { carrier: "LH", flightNo: "7658S", date: "2026-06-04", to: "LYS" },
    ],
    etd: "2026-06-03", eta: "2026-06-04", egmNo: "1055596", egmDate: "2026-06-03",
    sbNos: ["3717335", "3717152", "3717064"], sbDate: "2026-05-30", remark: "OK",
  },
  {
    sr: 3, date: "2026-06-03", invoices: ["4026101932"], consignee: "DHL EXEL SUPPLY CHAIN",
    origin: "MUMBAI", destination: "STOCKHOLM ARLANDA", pkgs: 5, grossWt: 340.131, chargeableWt: 684,
    airline: "LH", awb: "020-05305090", hawb: [], awbDate: "2026-06-03",
    legs: [
      { carrier: "LH", flightNo: "8025", date: "2026-06-05", to: "FRA" },
      { carrier: "LH", flightNo: "7388S", date: "2026-06-07", to: "ARN" },
    ],
    etd: "2026-06-05", eta: "2026-06-07", egmNo: "1055861", egmDate: "2026-06-05",
    sbNos: ["3798861"], sbDate: "2026-06-02", remark: "OK",
  },
  {
    sr: 4, date: "2026-06-03", invoices: ["4026101827", "4026101828", "4026101825", "4026101826"],
    consignee: "PIERRE FABRE MEDICAMENT",
    origin: "MUMBAI", destination: "PARIS", pkgs: 51, grossWt: 7403, chargeableWt: 9548,
    airline: "LH", awb: "020-05237315", hawb: [], awbDate: "2026-06-03",
    legs: [
      { carrier: "LH", flightNo: "8025", date: "2026-06-05", to: "FRA" },
      { carrier: "LH", flightNo: "7642S", date: "2026-06-07", to: "CDG" },
    ],
    etd: "2026-06-05", eta: "2026-06-07", egmNo: "1055861", egmDate: "2026-06-05",
    sbNos: ["3787904", "3786635", "3786526", "3786441"], sbDate: "2026-06-02", remark: "OK",
  },
  {
    sr: 5, date: "2026-06-04", invoices: ["4026101856"], consignee: "TERAPIA S.A",
    origin: "MUMBAI", destination: "BUCHAREST", pkgs: 18, grossWt: 2674.8, chargeableWt: 3458,
    airline: "TK", awb: "235-36086724", hawb: [], awbDate: "2026-06-04",
    legs: [
      { carrier: "TK", flightNo: "6111", date: "2026-06-06", to: "IST" },
      { carrier: "TK", flightNo: "1043", date: "2026-06-07", to: "OTP" },
    ],
    etd: "2026-06-06", eta: "2026-06-07", egmNo: "1056052", egmDate: "2026-06-06",
    sbNos: ["3812093"], sbDate: "2026-06-03", remark: "OK",
  },
  {
    sr: 6, date: "2026-06-05", invoices: ["5126100984"], consignee: "CSP",
    origin: "MUMBAI", destination: "LYON", pkgs: 34, grossWt: 2443.17, chargeableWt: 6256,
    airline: "LH", awb: "020-05227854", hawb: [], awbDate: "2026-06-05",
    legs: [
      { carrier: "LH", flightNo: "8023", date: "2026-06-07", to: "FRA" },
      { carrier: "LH", flightNo: "7658S", date: "2026-06-08", to: "LYS" },
    ],
    etd: "2026-06-07", eta: "2026-06-08", egmNo: null, egmDate: null,
    sbNos: ["3787603"], sbDate: "2026-06-02", remark: "OK",
  },
  {
    sr: 7, date: "2026-06-06", invoices: ["5126100985"], consignee: "CSP",
    origin: "MUMBAI", destination: "LYON", pkgs: 34, grossWt: 2448.93, chargeableWt: 5796,
    airline: "LH", awb: "020-05227740", hawb: [], awbDate: "2026-06-06",
    legs: [
      { carrier: "LH", flightNo: "8027", date: "2026-06-08", to: "FRA" },
      { carrier: "LH", flightNo: "7658A", date: "2026-06-09", to: "LYS" },
    ],
    etd: "2026-06-08", eta: "2026-06-09", egmNo: "1056320", egmDate: "2026-06-08",
    sbNos: ["3810671"], sbDate: "2026-06-03", remark: "OK",
  },
  {
    sr: 8, date: "2026-06-06", invoices: ["7526100482", "5126100983"], consignee: "NEURAXPHARM",
    origin: "MUMBAI", destination: "FRANKFURT", pkgs: 24, grossWt: 2935.833, chargeableWt: 4079,
    airline: "LH", awb: "020-05315262", hawb: ["026867", "026868"], awbDate: "2026-06-06",
    legs: [{ carrier: "LH", flightNo: "8023", date: "2026-06-10", to: "FRA" }],
    etd: "2026-06-10", eta: "2026-06-10", egmNo: "1056486", egmDate: "2026-06-09",
    sbNos: ["3850236", "3850200"], sbDate: "2026-06-04", remark: "OK",
  },
  {
    sr: 9, date: "2026-06-06", invoices: ["4026101858"], consignee: "NEURAXPHARM",
    origin: "MUMBAI", destination: "FRANKFURT", pkgs: 24, grossWt: 2279, chargeableWt: 4676,
    airline: "LH", awb: "020-05310594", hawb: [], awbDate: "2026-06-06",
    legs: [{ carrier: "LH", flightNo: "8363", date: "2026-06-09", to: "FRA" }],
    etd: "2026-06-09", eta: "2026-06-09", egmNo: "1056486", egmDate: "2026-06-09",
    sbNos: ["3858954"], sbDate: "2026-06-04", remark: "OK",
  },
  {
    sr: 10, date: "2026-06-06", invoices: ["5126101010"], consignee: "CSP",
    origin: "MUMBAI", destination: "LYON", pkgs: 25, grossWt: 2027.076, chargeableWt: 4231,
    airline: "LH", awb: "020-05302010", hawb: [], awbDate: "2026-06-06",
    legs: [
      { carrier: "LH", flightNo: "8027", date: "2026-06-08", to: "FRA" },
      { carrier: "LH", flightNo: "7658S", date: "2026-06-09", to: "LYS" },
    ],
    etd: "2026-06-08", eta: "2026-06-09", egmNo: "1056320", egmDate: "2026-06-08",
    sbNos: ["3850230"], sbDate: "2026-06-04", remark: "OK",
  },
  {
    sr: 11, date: "2026-06-12", invoices: ["5126101003", "4026101984"], consignee: "ACCORD HEALTHCARE",
    origin: "MUMBAI", destination: "TORONTO", pkgs: 8, grossWt: 1777.782, chargeableWt: 1778,
    airline: "VS", awb: "932-77505245", hawb: ["026876", "026875"], awbDate: "2026-06-12",
    legs: [
      { carrier: "VS", flightNo: "359", date: "2026-06-14", to: "LHR" },
      { carrier: "VS", flightNo: "147", date: "2026-06-14", to: "YYZ" },
    ],
    etd: "2026-06-14", eta: "2026-06-14", egmNo: "1057254", egmDate: "2026-06-14",
    sbNos: ["4016878", "4025858"], sbDate: "2026-06-10", remark: "OK",
  },
  {
    sr: 12, date: "2026-06-15", invoices: ["4026102063"], consignee: "VIATRIS HEALTHCARE GMBH",
    origin: "MUMBAI", destination: "FRANKFURT", pkgs: 13, grossWt: 1506, chargeableWt: 2159,
    airline: "LH", awb: "020-03491644", hawb: [], awbDate: "2026-06-15",
    legs: [{ carrier: "LH", flightNo: "757", date: "2026-06-16", to: "FRA" }],
    etd: "2026-06-16", eta: "2026-06-16", egmNo: "1057492", egmDate: "2026-06-16",
    sbNos: ["4106210"], sbDate: "2026-06-12", remark: "OK",
  },
  {
    sr: 13, date: "2026-06-18", invoices: ["8026100451"], consignee: "LABORATORIOS CINFA",
    origin: "DELHI", destination: "BARCELONA", pkgs: 17, grossWt: 1342, chargeableWt: 3051,
    airline: "LH", awb: "020-05455402", hawb: ["26153"], awbDate: "2026-06-18",
    legs: [
      { carrier: "LH", flightNo: "8371", date: "2026-06-22", to: "FRA" },
      { carrier: "LH", flightNo: "7614A", date: "2026-06-23", to: "BCN" },
    ],
    etd: "2026-06-22", eta: "2026-06-23", egmNo: "4032799", egmDate: "2026-06-22",
    sbNos: ["4235923"], sbDate: "2026-06-17", remark: "OK",
  },
  {
    sr: 14, date: "2026-06-19", invoices: ["4026102073"], consignee: "ACCORD HEALTHCARE",
    origin: "MUMBAI", destination: "LIMA", pkgs: 4, grossWt: 1190, chargeableWt: 1190,
    airline: "AF", awb: "057-59220335", hawb: [], awbDate: "2026-06-19",
    legs: [
      { carrier: "AF", flightNo: "6727", date: "2026-06-21", to: "CDG" },
      { carrier: "AF", flightNo: "0504", date: "2026-06-22", to: "LIM" },
    ],
    etd: "2026-06-21", eta: "2026-06-22", egmNo: "1058267", egmDate: "2026-06-21",
    sbNos: ["4160218"], sbDate: "2026-06-15", remark: "OK",
  },
  {
    sr: 15, date: "2026-06-19", invoices: ["4026102084"], consignee: "CSP",
    origin: "MUMBAI", destination: "LYON", pkgs: 24, grossWt: 2460, chargeableWt: 5183,
    airline: "LH", awb: "020-05452580", hawb: [], awbDate: "2026-06-19",
    legs: [
      { carrier: "LH", flightNo: "8027", date: "2026-06-22", to: "FRA" },
      { carrier: "LH", flightNo: "7658S", date: "2026-06-23", to: "LYS" },
    ],
    etd: "2026-06-22", eta: "2026-06-23", egmNo: "1058381", egmDate: "2026-06-22",
    sbNos: ["4221823"], sbDate: "2026-06-17", remark: "OK",
  },
  {
    sr: 16, date: "2026-06-20", invoices: ["4026102078"], consignee: "APOTEX CANADA",
    origin: "MUMBAI", destination: "TORONTO", pkgs: 8, grossWt: 1191.586, chargeableWt: 1582,
    airline: "LH", awb: "020-05459543", hawb: [], awbDate: "2026-06-20",
    legs: [
      { carrier: "LH", flightNo: "767", date: "2026-06-23", to: "MUC" },
      { carrier: "LH", flightNo: "494", date: "2026-06-25", to: "YYZ" },
    ],
    etd: "2026-06-23", eta: "2026-06-25", egmNo: "1058590", egmDate: "2026-06-23",
    sbNos: ["4290130"], sbDate: "2026-06-19", remark: "OK",
  },
  {
    sr: 17, date: "2026-06-20", invoices: ["4026102083"], consignee: "CSP",
    origin: "MUMBAI", destination: "LYON", pkgs: 26, grossWt: 2660.528, chargeableWt: 5628,
    airline: "LH", awb: "020-05452495", hawb: [], awbDate: "2026-06-20",
    legs: [
      { carrier: "LH", flightNo: "8027", date: "2026-06-22", to: "FRA" },
      { carrier: "LH", flightNo: "7658S", date: "2026-06-23", to: "LYS" },
    ],
    etd: "2026-06-22", eta: "2026-06-23", egmNo: "1058381", egmDate: "2026-06-22",
    sbNos: ["4221206"], sbDate: "2026-06-17", remark: "OK",
  },
  {
    sr: 18, date: "2026-06-20", invoices: ["5126101069"], consignee: "ZENTIVA K.S",
    origin: "MUMBAI", destination: "PRAGUE", pkgs: 8, grossWt: 1010.258, chargeableWt: 1357,
    airline: "LH", awb: "020-05461831", hawb: [], awbDate: "2026-06-20",
    legs: [
      { carrier: "LH", flightNo: "757", date: "2026-06-22", to: "FRA" },
      { carrier: "LH", flightNo: "7432S", date: "2026-06-22", to: "PRG" },
    ],
    etd: "2026-06-22", eta: "2026-06-22", egmNo: "1058368", egmDate: "2026-06-22",
    sbNos: ["4265628"], sbDate: "2026-06-18", remark: "OK",
  },
  {
    sr: 19, date: "2026-06-20", invoices: ["5126101114", "5126101115"], consignee: "FERRER INTERNATIONAL",
    origin: "MUMBAI", destination: "BARCELONA", pkgs: 16, grossWt: 1854.665, chargeableWt: 2615,
    airline: "LH", awb: "020-05519931", hawb: [], awbDate: "2026-06-20",
    legs: [
      { carrier: "LH", flightNo: "8023", date: "2026-06-28", to: "FRA" },
      { carrier: "LH", flightNo: "7614S", date: "2026-06-29", to: "BCN" },
    ],
    etd: "2026-06-28", eta: "2026-06-29", egmNo: "1059358", egmDate: "2026-06-28",
    sbNos: ["4402714", "4402707"], sbDate: "2026-06-23", remark: "OK",
  },
  // sr 20 absent in the source sheet
  {
    sr: 21, date: "2026-06-25", invoices: ["4026101843", "4026102135"], consignee: "BAUSCH HEALTH POLAND",
    origin: "MUMBAI", destination: "WARSAW", pkgs: 14, grossWt: 1609, chargeableWt: 2276,
    airline: "LH", awb: "020-05530556", hawb: [], awbDate: "2026-06-25",
    legs: [
      { carrier: "LH", flightNo: "767", date: "2026-06-27", to: "MUC" },
      { carrier: "LH", flightNo: "6278S", date: "2026-06-28", to: "WAW" },
    ],
    etd: "2026-06-27", eta: "2026-06-28", egmNo: "1059046", egmDate: "2026-06-26",
    sbNos: ["4406223", "4406890"], sbDate: "2026-06-23", remark: "OK",
  },
  {
    sr: 22, date: "2026-06-27", invoices: ["5126101118"], consignee: "VIATRIS ITALIA S.R.L",
    origin: "MUMBAI", destination: "MILAN MALPENSA", pkgs: 36, grossWt: 2432.052, chargeableWt: 6164,
    airline: "LH", awb: "020-05541815", hawb: [], awbDate: "2026-06-27",
    legs: [
      { carrier: "LH", flightNo: "8023", date: "2026-06-29", to: "FRA" },
      { carrier: "LH", flightNo: "7516A", date: "2026-07-02", to: "MXP" },
    ],
    etd: "2026-06-29", eta: "2026-07-02", egmNo: "1059358", egmDate: "2026-06-28",
    sbNos: ["4474648"], sbDate: "2026-06-25", remark: null,
  },
  {
    sr: 23, date: "2026-06-27", invoices: ["5126101122"], consignee: "ORION OYJ",
    origin: "MUMBAI", destination: "HELSINKI", pkgs: 4, grossWt: 520.224, chargeableWt: 674,
    airline: "LH", awb: "020-05541745", hawb: [], awbDate: "2026-06-27",
    legs: [
      { carrier: "LH", flightNo: "8027", date: "2026-06-29", to: "FRA" },
      { carrier: "LH", flightNo: "7410S", date: "2026-07-01", to: "HEL" },
    ],
    etd: "2026-06-29", eta: "2026-07-01", egmNo: "1059490", egmDate: "2026-06-29",
    sbNos: ["4474656"], sbDate: "2026-06-25", remark: "OK",
  },
  {
    // Source sheet showed ETA 03.06.2026 (before its own ETD) — corrected to 03.07.2026.
    sr: 24, date: "2026-06-29", invoices: ["4026102184"], consignee: "PHARMAS D.O.O",
    origin: "MUMBAI", destination: "BELGRADE", pkgs: 5, grossWt: 652, chargeableWt: 884,
    airline: "TK", awb: "235-36093934", hawb: [], awbDate: "2026-06-29",
    legs: [
      { carrier: "TK", flightNo: "6659", date: "2026-06-30", to: "IST" },
      { carrier: "TK", flightNo: "6501", date: "2026-07-03", to: "BEG" },
    ],
    etd: "2026-06-30", eta: "2026-07-03", egmNo: "1059821", egmDate: "2026-06-30",
    sbNos: ["4509114"], sbDate: "2026-06-26", remark: "OK",
    flag: "ETA corrected from 03.06 (typo in sheet)",
  },
  {
    sr: 25, date: "2026-07-01", invoices: ["5126101119"], consignee: "VIATRIS ITALIA S.R.L",
    origin: "MUMBAI", destination: "MILAN MALPENSA", pkgs: 33, grossWt: 2197.412, chargeableWt: 5552,
    airline: "LH", awb: "020-05542051", hawb: [], awbDate: "2026-07-01",
    legs: [
      { carrier: "LH", flightNo: "8025", date: "2026-07-03", to: "FRA" },
      { carrier: "LH", flightNo: "7476S", date: "2026-07-04", to: "MXP" },
    ],
    etd: "2026-07-03", eta: "2026-07-04", egmNo: null, egmDate: null,
    sbNos: ["4583144"], sbDate: "2026-06-29", remark: null,
  },
  {
    // Sheet says gross 9,020 kg vs chargeable 19 kg on 4 pkgs — implausible pair,
    // kept as-is but flagged; excluded from weight aggregates in stats.
    sr: 26, date: "2026-07-01", invoices: ["7026100017"], consignee: "HIKMA SPECIALZED PHARMACEUTICALS",
    origin: "MUMBAI", destination: "CAIRO", pkgs: 4, grossWt: 9020, chargeableWt: 19,
    airline: "EK", awb: "176-29013272", hawb: [], awbDate: "2026-07-01",
    legs: [
      { carrier: "EK", flightNo: "0505", date: "2026-07-02", to: "DXB" },
      { carrier: "EK", flightNo: "0925", date: "2026-07-03", to: "CAI" },
    ],
    etd: "2026-07-02", eta: "2026-07-03", egmNo: null, egmDate: null,
    sbNos: ["4625085"], sbDate: "2026-06-30", remark: null,
    flag: "Weight pair implausible in sheet (gross 9020 / chg 19) — excluded from weight totals",
    excludeFromWeights: true,
  },
  {
    sr: 27, date: "2026-07-02", invoices: ["5126101129"], consignee: "ACCORD HEALTHCARE",
    origin: "MUMBAI", destination: "TORONTO", pkgs: 12, grossWt: 1585.62, chargeableWt: 1844,
    airline: "AF", awb: "057-59220350", hawb: [], awbDate: "2026-07-02",
    legs: [
      { carrier: "AF", flightNo: "0217", date: "2026-07-04", to: "CDG" },
      { carrier: "AF", flightNo: "0358", date: "2026-07-05", to: "YYZ" },
    ],
    etd: "2026-07-04", eta: "2026-07-05", egmNo: null, egmDate: null,
    sbNos: ["4618701"], sbDate: "2026-06-30", remark: null,
  },
  {
    sr: 28, date: "2026-07-02", invoices: ["4026102185"], consignee: "PHARMAS LTD",
    origin: "MUMBAI", destination: "ZAGREB", pkgs: 2, grossWt: 311, chargeableWt: 471,
    airline: "LH", awb: "020-05561065", hawb: [], awbDate: "2026-07-02",
    legs: [
      { carrier: "LH", flightNo: "767", date: "2026-07-04", to: "MUC" },
      { carrier: "LH", flightNo: "7069S", date: "2026-07-04", to: "VIE" },
      { carrier: "LH", flightNo: "6450S", date: "2026-07-05", to: "ZAG" },
    ],
    etd: "2026-07-04", eta: "2026-07-05", egmNo: null, egmDate: null,
    sbNos: ["4629863"], sbDate: "2026-06-30", remark: null,
  },
  {
    // Airline column says AZ but the AWB prefix 020- belongs to Lufthansa
    // (final leg is an LH flight) — airline kept as AZ per the sheet.
    sr: 29, date: "2026-07-02", invoices: ["8026100465"], consignee: "SCF SRL",
    origin: "DELHI", destination: "MILAN MALPENSA", pkgs: 8, grossWt: 592, chargeableWt: 1515,
    airline: "AZ", awb: "020-07466675", hawb: [], awbDate: "2026-07-02",
    legs: [
      { carrier: "AZ", flightNo: "769", date: "2026-07-05", to: "FCO" },
      { carrier: "LH", flightNo: "7900S", date: "2026-07-05", to: "MXP" },
    ],
    etd: "2026-07-05", eta: "2026-07-05", egmNo: null, egmDate: null,
    sbNos: ["4681628"], sbDate: "2026-07-02", remark: null,
  },
  {
    sr: 30, date: "2026-07-03", invoices: ["7526100557"], consignee: "NEURAXPHARM",
    origin: "MUMBAI", destination: "FRANKFURT", pkgs: 20, grossWt: 2238.384, chargeableWt: 3471,
    airline: "LH", awb: "020-05575511", hawb: [], awbDate: "2026-07-03",
    legs: [{ carrier: "LH", flightNo: "8027", date: "2026-07-06", to: "FRA" }],
    etd: "2026-07-06", eta: "2026-07-06", egmNo: null, egmDate: null,
    sbNos: ["4618717"], sbDate: "2026-06-30", remark: null,
  },
]
