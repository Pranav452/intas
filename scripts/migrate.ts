// Neon migration + seed for the INTAS portal (idempotent — safe to re-run).
// Usage: npx tsx scripts/migrate.ts
// Shares the Neon database with the VIPAR app — separate intas_* tables.

import { readFileSync, existsSync } from "node:fs"
import path from "node:path"
import { neon } from "@neondatabase/serverless"

import { DATA_AS_OF, SHIPMENTS } from "../lib/data"
import { hashPassword } from "../lib/password"

function loadEnvLocal(): void {
  const file = path.join(process.cwd(), ".env.local")
  if (!existsSync(file)) return
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/)
    if (!m) continue
    const [, key, rawValue] = m
    if (process.env[key] !== undefined) continue
    process.env[key] = rawValue.replace(/^["']|["']$/g, "")
  }
}

async function main() {
  loadEnvLocal()
  const url = process.env.DATABASE_URL
  if (!url) {
    console.error("DATABASE_URL not set. Add it to .env.local first.")
    process.exit(1)
  }
  const sql = neon(url)

  console.log("Creating intas tables…")
  await sql`
    CREATE TABLE IF NOT EXISTS intas_users (
      username      text PRIMARY KEY,
      password_hash text NOT NULL,
      role          text NOT NULL,
      created_at    timestamptz NOT NULL DEFAULT now()
    )
  `
  // widen the role constraint to include 'uploader' (v1 allowed client|admin only)
  try {
    await sql`ALTER TABLE intas_users DROP CONSTRAINT IF EXISTS intas_users_role_check`
  } catch {
    /* older Postgres w/o IF EXISTS — ignore */
  }
  await sql`
    ALTER TABLE intas_users
    ADD CONSTRAINT intas_users_role_check CHECK (role IN ('client', 'uploader', 'admin'))
  `
  await sql`
    CREATE TABLE IF NOT EXISTS intas_access_log (
      id         serial PRIMARY KEY,
      ts         timestamptz NOT NULL DEFAULT now(),
      event      text NOT NULL,
      username   text,
      ip         text,
      user_agent text,
      meta       jsonb
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS intas_dataset_versions (
      id              serial PRIMARY KEY,
      as_of           date NOT NULL,
      source          text NOT NULL,
      uploaded_at     timestamptz NOT NULL DEFAULT now(),
      uploaded_by     text,
      shipments_count int NOT NULL,
      pkgs            int NOT NULL,
      chargeable_wt   int NOT NULL,
      warnings        jsonb NOT NULL DEFAULT '[]',
      shipments       jsonb NOT NULL,
      active          boolean NOT NULL DEFAULT false
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS intas_dataset_versions_uploaded_at ON intas_dataset_versions (uploaded_at DESC)`
  await sql`
    CREATE TABLE IF NOT EXISTS intas_allowed_ips (
      id         serial PRIMARY KEY,
      ip         text NOT NULL UNIQUE,
      label      text,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS intas_devices (
      id         uuid PRIMARY KEY,
      first_seen timestamptz NOT NULL DEFAULT now(),
      ip         text,
      user_agent text
    )
  `

  console.log("Seeding users…")
  const seeds: [string, string, string][] = [
    [process.env.INTAS_USER ?? "intas", process.env.INTAS_PASS ?? "intas", "client"],
    [process.env.INTAS_UPLOADER_USER ?? "upload", process.env.INTAS_UPLOADER_PASS ?? "upload", "uploader"],
    [process.env.INTAS_ADMIN_USER ?? "admin", process.env.INTAS_ADMIN_PASS ?? "123456", "admin"],
  ]
  for (const [username, password, role] of seeds) {
    await sql`
      INSERT INTO intas_users (username, password_hash, role)
      VALUES (${username}, ${hashPassword(password)}, ${role})
      ON CONFLICT (username) DO UPDATE SET role = EXCLUDED.role
    `
  }

  const existing = (await sql`SELECT count(*)::int AS n FROM intas_dataset_versions`) as { n: number }[]
  if (existing[0].n === 0) {
    console.log("Seeding dataset version #1 from the built-in snapshot…")
    const weighable = SHIPMENTS.filter((s) => !s.excludeFromWeights)
    await sql`
      INSERT INTO intas_dataset_versions
        (as_of, source, uploaded_by, shipments_count, pkgs, chargeable_wt, warnings, shipments, active)
      VALUES
        (${DATA_AS_OF}, 'built-in snapshot', NULL, ${SHIPMENTS.length},
         ${SHIPMENTS.reduce((a, s) => a + s.pkgs, 0)},
         ${Math.round(weighable.reduce((a, s) => a + s.chargeableWt, 0))},
         '[]'::jsonb, ${JSON.stringify(SHIPMENTS)}::jsonb, true)
    `
  } else {
    console.log(`intas_dataset_versions already has ${existing[0].n} rows — skipping seed.`)
  }

  const users = (await sql`SELECT username, role FROM intas_users ORDER BY username`) as {
    username: string
    role: string
  }[]
  const versions = (await sql`
    SELECT id, as_of, source, active, shipments_count FROM intas_dataset_versions ORDER BY id
  `) as { id: number; as_of: string; source: string; active: boolean; shipments_count: number }[]

  console.log("\nUsers:", users.map((u) => `${u.username} (${u.role})`).join(", "))
  console.log("Versions:")
  for (const v of versions) {
    console.log(
      `  #${v.id} · as of ${String(v.as_of).slice(0, 10)} · ${v.source} · ${v.shipments_count} AWBs${v.active ? " · ACTIVE" : ""}`,
    )
  }
  console.log("\nMigration complete.")
}

main().catch((err) => {
  console.error("Migration failed:", err)
  process.exit(1)
})
