import type { Shipment } from "./data"

// AI review of upload warnings: small-model batches explain each warning
// (cause + concrete fix), then an orchestrator model writes the overall
// data-quality summary. Degrades gracefully — any failure returns nulls and
// the UI falls back to the raw warning text.

const BATCH_MODEL = process.env.OPENAI_BATCH_MODEL ?? "gpt-5-nano"
const ORCH_MODEL = process.env.OPENAI_ORCH_MODEL ?? "gpt-5-mini"
const BATCH_SIZE = 10
const MAX_PARALLEL = 4

export interface WarningExplanation {
  warning: string
  awb: string | null
  cause: string
  fix: string
}

export interface AiReview {
  explanations: WarningExplanation[]
  overview: string | null
  actions: string[]
}

async function chat(model: string, system: string, user: string): Promise<string | null> {
  const key = process.env.OPENAI_API_KEY
  if (!key) return null
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        response_format: { type: "json_object" },
        max_completion_tokens: 4000,
      }),
      signal: AbortSignal.timeout(60_000),
    })
    if (!res.ok) {
      console.error("openai error", res.status, (await res.text()).slice(0, 300))
      return null
    }
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] }
    return data.choices?.[0]?.message?.content ?? null
  } catch (err) {
    console.error("openai request failed:", err)
    return null
  }
}

function awbFromWarning(w: string): string | null {
  return w.match(/AWB\s+([0-9-]{8,})/)?.[1] ?? null
}

function rowContext(shipments: Shipment[], awb: string | null): string {
  if (!awb) return ""
  const s = shipments.find((x) => x.awb === awb)
  if (!s) return ""
  return JSON.stringify({
    awb: s.awb,
    awbDate: s.awbDate,
    airline: s.airline,
    origin: s.origin,
    destination: s.destination,
    consignee: s.consignee,
    pkgs: s.pkgs,
    grossWt: s.grossWt,
    chargeableWt: s.chargeableWt,
    flightDetails: s.flightDetailsRaw ?? s.legs.map((l) => `${l.carrier}:${l.flightNo}/${l.date ?? "?"}-${l.to}`).join(" "),
    etd: s.etd,
    eta: s.eta,
  })
}

const BATCH_SYSTEM = `You are a data-quality analyst for an air-freight forwarder's AWB spreadsheet (Intas pharma exports out of India — Mumbai, Delhi, Ahmedabad). You receive parser warnings raised while ingesting the DSR ops sheet, each with the parsed row for context. For every warning explain in plain English (a) the likely root cause in the spreadsheet and (b) the exact fix the uploader should make in the sheet or in the preview editor. Be terse and concrete — name the cell/value to change. Respond with JSON: {"items":[{"index":<number>,"cause":"...","fix":"..."}]}`

async function explainBatch(
  batch: { index: number; warning: string; context: string }[],
): Promise<Map<number, { cause: string; fix: string }>> {
  const out = new Map<number, { cause: string; fix: string }>()
  const user = JSON.stringify({
    warnings: batch.map((b) => ({ index: b.index, warning: b.warning, row: b.context || undefined })),
  })
  const content = await chat(BATCH_MODEL, BATCH_SYSTEM, user)
  if (!content) return out
  try {
    const parsed = JSON.parse(content) as { items?: { index: number; cause?: string; fix?: string }[] }
    for (const item of parsed.items ?? []) {
      if (typeof item.index === "number" && item.cause && item.fix) {
        out.set(item.index, { cause: item.cause, fix: item.fix })
      }
    }
  } catch {
    // unparseable model output — fall back to raw warnings for this batch
  }
  return out
}

export async function reviewWarnings(warnings: string[], shipments: Shipment[]): Promise<AiReview> {
  const empty: AiReview = { explanations: [], overview: null, actions: [] }
  if (warnings.length === 0 || !process.env.OPENAI_API_KEY) return empty

  const entries = warnings.map((warning, index) => {
    const awb = awbFromWarning(warning)
    return { index, warning, awb, context: rowContext(shipments, awb) }
  })

  // chunk into batches, run with a small parallelism cap
  const batches: (typeof entries)[] = []
  for (let i = 0; i < entries.length; i += BATCH_SIZE) batches.push(entries.slice(i, i + BATCH_SIZE))

  const results = new Map<number, { cause: string; fix: string }>()
  for (let i = 0; i < batches.length; i += MAX_PARALLEL) {
    const window = batches.slice(i, i + MAX_PARALLEL)
    const settled = await Promise.all(window.map((b) => explainBatch(b)))
    for (const map of settled) for (const [k, v] of map) results.set(k, v)
  }

  const explanations: WarningExplanation[] = entries.map((e) => ({
    warning: e.warning,
    awb: e.awb,
    cause: results.get(e.index)?.cause ?? "",
    fix: results.get(e.index)?.fix ?? "",
  }))

  // orchestrator: overall read on the upload's data quality
  let overview: string | null = null
  let actions: string[] = []
  const orchUser = JSON.stringify({
    totalShipments: shipments.length,
    totalWarnings: warnings.length,
    findings: explanations.map((e) => ({ warning: e.warning, cause: e.cause || undefined })),
  })
  const orchContent = await chat(
    ORCH_MODEL,
    `You are the lead reviewer overseeing per-warning analyses of an air-freight sheet upload. Write (a) a 2-3 sentence plain-English overview of this upload's data quality for the uploader, and (b) up to 5 prioritised actions to clean the sheet. Respond with JSON: {"overview":"...","actions":["..."]}`,
    orchUser,
  )
  if (orchContent) {
    try {
      const parsed = JSON.parse(orchContent) as { overview?: string; actions?: string[] }
      overview = parsed.overview ?? null
      actions = Array.isArray(parsed.actions) ? parsed.actions.slice(0, 5) : []
    } catch {
      // ignore
    }
  }

  return { explanations, overview, actions }
}
