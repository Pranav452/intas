@AGENTS.md

<!-- second-brain spoke (auto-added 2026-07-14) -->
## Project context (second brain)

Air-freight dashboard 'The Air Ledger' for INTAS DSR (pharma export client of LINKS) — Mumbai/Delhi→16 airports, login-gated.
Stack: Next.js 16/React 19/TS, Tailwind 4 + shadcn, cobe globe, Neon Postgres, xlsx.
Run: npm install && npm run dev (:3000, or -p 3001 alongside VIPAR). One-time npx tsx scripts/migrate.ts.
Watch out: .env.local (DATABASE_URL, AUTH_SECRET, demo creds) — don't commit. Shares Neon DB with VIPAR (separate tables). Data hand-transcribed in lib/data.ts with documented quirks — check README before 'fixing' values. CLAUDE.md Next-version warning.

Cross-project brain: `C:\Users\Manilal\second-brain` — full card `notes/projects/intas.md`, recent context `hot.md`. Read the brain for cross-project/domain knowledge; do NOT read it for general coding questions.
