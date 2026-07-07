import { neon, type NeonQueryFunction } from "@neondatabase/serverless"

type Sql = NeonQueryFunction<false, false>

const globalCache = globalThis as unknown as { __viparSql?: Sql | null }

/** Neon client, or null when DATABASE_URL is not configured (file fallback mode). */
export function getSql(): Sql | null {
  if (globalCache.__viparSql !== undefined) return globalCache.__viparSql
  const url = process.env.DATABASE_URL
  globalCache.__viparSql = url ? neon(url) : null
  return globalCache.__viparSql
}

export function dbEnabled(): boolean {
  return Boolean(process.env.DATABASE_URL)
}
