// Airport registry for the INTAS dashboard. Coords are [lat, lon].
// DEST_ALIASES maps the sheet's messy destination strings onto canonical keys.

export interface Airport {
  iata: string
  city: string
  country: string
  coords: [number, number]
}

export const ORIGINS: Record<string, Airport> = {
  MUMBAI: { iata: "BOM", city: "Mumbai", country: "India", coords: [19.09, 72.87] },
  DELHI: { iata: "DEL", city: "Delhi", country: "India", coords: [28.56, 77.1] },
  AHMEDABAD: { iata: "AMD", city: "Ahmedabad", country: "India", coords: [23.07, 72.63] },
}

export const DESTINATIONS: Record<string, Airport> = {
  TORONTO: { iata: "YYZ", city: "Toronto", country: "Canada", coords: [43.68, -79.63] },
  SYDNEY: { iata: "SYD", city: "Sydney", country: "Australia", coords: [-33.95, 151.18] },
  "MEXICO CITY": { iata: "MEX", city: "Mexico City", country: "Mexico", coords: [19.44, -99.07] },
  "SANTA LUCIA": { iata: "NLU", city: "Mexico City (Felipe Ángeles)", country: "Mexico", coords: [19.74, -99.02] },
  BARCELONA: { iata: "BCN", city: "Barcelona", country: "Spain", coords: [41.3, 2.08] },
  FRANKFURT: { iata: "FRA", city: "Frankfurt", country: "Germany", coords: [50.04, 8.56] },
  PRAGUE: { iata: "PRG", city: "Prague", country: "Czechia", coords: [50.1, 14.26] },
  MONTREAL: { iata: "YUL", city: "Montreal", country: "Canada", coords: [45.47, -73.74] },
  JOHANNESBURG: { iata: "JNB", city: "Johannesburg", country: "South Africa", coords: [-26.13, 28.24] },
  YANGON: { iata: "RGN", city: "Yangon", country: "Myanmar", coords: [16.9, 96.13] },
  "MILAN MALPENSA": { iata: "MXP", city: "Milan", country: "Italy", coords: [45.63, 8.72] },
  LYON: { iata: "LYS", city: "Lyon", country: "France", coords: [45.73, 5.08] },
  BELGRADE: { iata: "BEG", city: "Belgrade", country: "Serbia", coords: [44.82, 20.29] },
  ZAGREB: { iata: "ZAG", city: "Zagreb", country: "Croatia", coords: [45.74, 16.07] },
  MADRID: { iata: "MAD", city: "Madrid", country: "Spain", coords: [40.49, -3.57] },
  SANTIAGO: { iata: "SCL", city: "Santiago", country: "Chile", coords: [-33.39, -70.79] },
  LIMA: { iata: "LIM", city: "Lima", country: "Peru", coords: [-12.02, -77.11] },
  BANGKOK: { iata: "BKK", city: "Bangkok", country: "Thailand", coords: [13.69, 100.75] },
  AMSTERDAM: { iata: "AMS", city: "Amsterdam", country: "Netherlands", coords: [52.31, 4.76] },
  HELSINKI: { iata: "HEL", city: "Helsinki", country: "Finland", coords: [60.32, 24.96] },
  BASEL: { iata: "BSL", city: "Basel", country: "Switzerland", coords: [47.6, 7.52] },
  "SAO PAULO": { iata: "GRU", city: "São Paulo", country: "Brazil", coords: [-23.43, -46.47] },
  LONDON: { iata: "LHR", city: "London", country: "United Kingdom", coords: [51.47, -0.45] },
  ATHENS: { iata: "ATH", city: "Athens", country: "Greece", coords: [37.94, 23.94] },
  DUSSELDORF: { iata: "DUS", city: "Düsseldorf", country: "Germany", coords: [51.29, 6.77] },
  "KUALA LUMPUR": { iata: "KUL", city: "Kuala Lumpur", country: "Malaysia", coords: [2.75, 101.71] },
  PARIS: { iata: "CDG", city: "Paris", country: "France", coords: [49.01, 2.55] },
  LJUBLJANA: { iata: "LJU", city: "Ljubljana", country: "Slovenia", coords: [46.22, 14.46] },
  "TEL AVIV": { iata: "TLV", city: "Tel Aviv", country: "Israel", coords: [32.01, 34.89] },
  BUCHAREST: { iata: "OTP", city: "Bucharest", country: "Romania", coords: [44.57, 26.1] },
  INCHEON: { iata: "ICN", city: "Seoul", country: "South Korea", coords: [37.46, 126.44] },
  WARSAW: { iata: "WAW", city: "Warsaw", country: "Poland", coords: [52.17, 20.97] },
  MUNICH: { iata: "MUC", city: "Munich", country: "Germany", coords: [48.35, 11.79] },
  "PANAMA CITY": { iata: "PTY", city: "Panama City", country: "Panama", coords: [9.07, -79.38] },
  MELBOURNE: { iata: "MEL", city: "Melbourne", country: "Australia", coords: [-37.67, 144.84] },
  AUCKLAND: { iata: "AKL", city: "Auckland", country: "New Zealand", coords: [-37.01, 174.79] },
  CAIRO: { iata: "CAI", city: "Cairo", country: "Egypt", coords: [30.12, 31.41] },
  ROME: { iata: "FCO", city: "Rome", country: "Italy", coords: [41.8, 12.24] },
  "SANTO DOMINGO": { iata: "SDQ", city: "Santo Domingo", country: "Dominican Republic", coords: [18.43, -69.67] },
  RIGA: { iata: "RIX", city: "Riga", country: "Latvia", coords: [56.92, 23.97] },
  NAIROBI: { iata: "NBO", city: "Nairobi", country: "Kenya", coords: [-1.32, 36.93] },
  MALTA: { iata: "MLA", city: "Malta", country: "Malta", coords: [35.86, 14.48] },
  BRATISLAVA: { iata: "BTS", city: "Bratislava", country: "Slovakia", coords: [48.17, 17.21] },
  NUREMBERG: { iata: "NUE", city: "Nuremberg", country: "Germany", coords: [49.5, 11.08] },
  "STOCKHOLM ARLANDA": { iata: "ARN", city: "Stockholm", country: "Sweden", coords: [59.65, 17.92] },
  BRUSSELS: { iata: "BRU", city: "Brussels", country: "Belgium", coords: [50.9, 4.48] },
  SINGAPORE: { iata: "SIN", city: "Singapore", country: "Singapore", coords: [1.36, 103.99] },
  "HONG KONG": { iata: "HKG", city: "Hong Kong", country: "Hong Kong", coords: [22.31, 113.91] },
  ZURICH: { iata: "ZRH", city: "Zurich", country: "Switzerland", coords: [47.46, 8.55] },
  ADEN: { iata: "ADE", city: "Aden", country: "Yemen", coords: [12.83, 45.03] },
  BRISBANE: { iata: "BNE", city: "Brisbane", country: "Australia", coords: [-27.38, 153.12] },
  BOGOTA: { iata: "BOG", city: "Bogotá", country: "Colombia", coords: [4.7, -74.14] },
  TAIPEI: { iata: "TPE", city: "Taipei", country: "Taiwan", coords: [25.08, 121.23] },
  "DAR ES SALAAM": { iata: "DAR", city: "Dar es Salaam", country: "Tanzania", coords: [-6.88, 39.2] },
  PHILADELPHIA: { iata: "PHL", city: "Philadelphia", country: "United States", coords: [39.87, -75.24] },
  QUITO: { iata: "UIO", city: "Quito", country: "Ecuador", coords: [-0.13, -78.36] },
  BUDAPEST: { iata: "BUD", city: "Budapest", country: "Hungary", coords: [47.44, 19.26] },
  JAKARTA: { iata: "CGK", city: "Jakarta", country: "Indonesia", coords: [-6.13, 106.66] },
  MOSCOW: { iata: "SVO", city: "Moscow", country: "Russia", coords: [55.97, 37.41] },
  "PORT OF SPAIN": { iata: "POS", city: "Port of Spain", country: "Trinidad & Tobago", coords: [10.6, -61.34] },
  "PORT SUDAN": { iata: "PZU", city: "Port Sudan", country: "Sudan", coords: [19.43, 37.23] },
}

// Sheet spelling → canonical DESTINATIONS key
export const DEST_ALIASES: Record<string, string> = {
  MEXICO: "MEXICO CITY",
  "SANTA LUCIA MEXICO": "SANTA LUCIA",
  "FELIPE ANGELES": "SANTA LUCIA",
  JOHHANESBURG: "JOHANNESBURG",
  JOHHANNESBERG: "JOHANNESBURG",
  JOHANNESBERG: "JOHANNESBURG",
  MILAN: "MILAN MALPENSA",
  "MILAN ITALY": "MILAN MALPENSA",
  MILANO: "MILAN MALPENSA",
  MELBOUNE: "MELBOURNE",
  "TE AVIV": "TEL AVIV",
  OTOPENI: "BUCHAREST",
  GUARULHOS: "SAO PAULO",
  HONGKONG: "HONG KONG",
  "BOGOTA COLOMBIA": "BOGOTA",
  "TAIPEI, TAIWAN": "TAIPEI",
  "TAIPEI TAIWAN": "TAIPEI",
  SHEREMETIEVO: "MOSCOW",
  SHEREMETYEVO: "MOSCOW",
  DOMODEDOVO: "MOSCOW",
  "PORT SUDAN INTERNATIONAL": "PORT SUDAN",
  "STOCKHOLM": "STOCKHOLM ARLANDA",
}

export function canonDestination(raw: string): string {
  const key = raw.trim().toUpperCase().replace(/\s+/g, " ").replace(/[.]+$/, "")
  return DEST_ALIASES[key] ?? key
}

export function destination(port: string): Airport | undefined {
  return DESTINATIONS[canonDestination(port)]
}

export const AIRLINES: Record<string, string> = {
  KL: "KLM",
  LH: "Lufthansa",
  TK: "Turkish Airlines",
  VS: "Virgin Atlantic",
  AF: "Air France",
  EK: "Emirates",
  AZ: "ITA Airways",
  QR: "Qatar Airways",
  EY: "Etihad",
  SQ: "Singapore Airlines",
  BA: "British Airways",
  AI: "Air India",
  CX: "Cathay Pacific",
  ET: "Ethiopian",
  KQ: "Kenya Airways",
  MH: "Malaysia Airlines",
  TG: "Thai Airways",
  UK: "Vistara",
  "6E": "IndiGo",
  SV: "Saudia",
  MS: "EgyptAir",
  KE: "Korean Air",
  OZ: "Asiana",
  QF: "Qantas",
  AC: "Air Canada",
  IB: "Iberia",
  LX: "Swiss",
  OS: "Austrian",
  SN: "Brussels Airlines",
  LO: "LOT Polish",
  A3: "Aegean",
  RJ: "Royal Jordanian",
  GF: "Gulf Air",
  WY: "Oman Air",
  FZ: "flydubai",
  J2: "AZAL",
  SU: "Aeroflot",
  UL: "SriLankan",
  PR: "Philippine Airlines",
  NZ: "Air New Zealand",
  DL: "Delta",
  UA: "United",
  AA: "American",
}

export function airlineName(code: string): string {
  return AIRLINES[code] ?? code
}

export function titleCase(value: string): string {
  return value
    .toLowerCase()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")
}
