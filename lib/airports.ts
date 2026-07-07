// Airport registry for the INTAS DSR air-freight dashboard.
// Coords are [lat, lon] for the cobe globe.

export interface Airport {
  iata: string
  city: string
  country: string
  coords: [number, number]
}

export const ORIGINS: Record<string, Airport> = {
  MUMBAI: { iata: "BOM", city: "Mumbai", country: "India", coords: [19.09, 72.87] },
  DELHI: { iata: "DEL", city: "Delhi", country: "India", coords: [28.56, 77.1] },
}

// Keyed by the DESTINATION PORT strings used in the LINKS sheet.
export const DESTINATIONS: Record<string, Airport> = {
  AMSTERDAM: { iata: "AMS", city: "Amsterdam", country: "Netherlands", coords: [52.31, 4.76] },
  LYON: { iata: "LYS", city: "Lyon", country: "France", coords: [45.73, 5.08] },
  "STOCKHOLM ARLANDA": { iata: "ARN", city: "Stockholm", country: "Sweden", coords: [59.65, 17.92] },
  PARIS: { iata: "CDG", city: "Paris", country: "France", coords: [49.01, 2.55] },
  OTOPENI: { iata: "OTP", city: "Bucharest", country: "Romania", coords: [44.57, 26.1] },
  FRANKFURT: { iata: "FRA", city: "Frankfurt", country: "Germany", coords: [50.04, 8.56] },
  TORONTO: { iata: "YYZ", city: "Toronto", country: "Canada", coords: [43.68, -79.63] },
  BARCELONA: { iata: "BCN", city: "Barcelona", country: "Spain", coords: [41.3, 2.08] },
  LIMA: { iata: "LIM", city: "Lima", country: "Peru", coords: [-12.02, -77.11] },
  PRAGUE: { iata: "PRG", city: "Prague", country: "Czechia", coords: [50.1, 14.26] },
  WARSAW: { iata: "WAW", city: "Warsaw", country: "Poland", coords: [52.17, 20.97] },
  "MILAN MALPENSA": { iata: "MXP", city: "Milan", country: "Italy", coords: [45.63, 8.72] },
  HELSINKI: { iata: "HEL", city: "Helsinki", country: "Finland", coords: [60.32, 24.96] },
  BELGRADE: { iata: "BEG", city: "Belgrade", country: "Serbia", coords: [44.82, 20.29] },
  CAIRO: { iata: "CAI", city: "Cairo", country: "Egypt", coords: [30.12, 31.41] },
  ZAGREB: { iata: "ZAG", city: "Zagreb", country: "Croatia", coords: [45.74, 16.07] },
}

export const AIRLINES: Record<string, string> = {
  KL: "KLM",
  LH: "Lufthansa",
  TK: "Turkish Airlines",
  VS: "Virgin Atlantic",
  AF: "Air France",
  EK: "Emirates",
  AZ: "ITA Airways",
}

export function airlineName(code: string): string {
  return AIRLINES[code] ?? code
}

export function destination(port: string): Airport | undefined {
  return DESTINATIONS[port.toUpperCase()]
}

export function titleCase(value: string): string {
  return value
    .toLowerCase()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")
}
