import Image from "next/image"
import Link from "next/link"

import { AnimatedThemeToggle } from "@/components/theme-toggle"
import { logout } from "@/app/login/actions"
import { getSession } from "@/lib/auth"
import { fmtDate } from "@/lib/stats"
import { loadDataset } from "@/lib/store"

export async function SiteHeader() {
  const session = await getSession()
  const dataset = session ? await loadDataset() : null

  return (
    <header className="border-b-[3px] border-ink bg-paper">
      {/* hairline strip */}
      <div className="border-b border-rule">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-1.5 text-[9px] tracking-[0.28em] text-muted-foreground/80 uppercase sm:px-8">
          <span>Air freight record · Mumbai &amp; Delhi origin</span>
          <span>Private &amp; confidential</span>
        </div>
      </div>

      {/* masthead row */}
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-8 gap-y-3 px-5 py-4 sm:px-8">
        <Link href="/" className="flex items-center gap-3.5">
          <span className="flex h-8 items-center bg-white px-2 outline outline-ink/10">
            <Image src="/links-logo.png" alt="LINKS" width={56} height={22} className="h-4.5 w-auto" priority />
          </span>
          <span className="flex flex-col leading-none">
            <span className="font-serif text-[22px] font-bold tracking-tight text-ink">
              The INTAS Air Ledger
            </span>
            <span className="mt-1 text-[9px] tracking-[0.3em] text-muted-foreground uppercase">by LINKS</span>
          </span>
        </Link>

        <div className="flex flex-wrap items-center gap-x-7 gap-y-2">
          {session && (
            <nav className="flex items-center gap-6 text-[11px] font-semibold tracking-[0.18em] uppercase">
              <Link
                href="/dashboard"
                className="border-b-2 border-transparent pb-0.5 text-ink transition-colors hover:border-stamp"
              >
                The ledger
              </Link>
              {(session.role === "uploader" || session.role === "admin") && (
                <Link
                  href="/admin/upload"
                  className="border-b-2 border-transparent pb-0.5 text-muted-foreground transition-colors hover:border-stamp hover:text-ink"
                >
                  Upload
                </Link>
              )}
              {session.role === "admin" && (
                <Link
                  href="/admin"
                  className="border-b-2 border-transparent pb-0.5 text-muted-foreground transition-colors hover:border-stamp hover:text-ink"
                >
                  Admin
                </Link>
              )}
            </nav>
          )}

          <div className="flex items-center gap-3">
            <AnimatedThemeToggle className="border border-ink/25 text-ink hover:border-stamp hover:text-stamp" />
            {session && dataset && (
              <span className="hidden -rotate-2 border-2 border-stamp px-2.5 py-1 text-[10px] font-bold tracking-[0.16em] text-stamp uppercase select-none md:inline-block">
                As of {fmtDate(dataset.asOf)}
              </span>
            )}
            {session ? (
              <form action={logout}>
                <button
                  type="submit"
                  className="bg-ink px-4 py-2 text-[10px] font-semibold tracking-[0.18em] text-paper uppercase transition-colors hover:bg-ink/85"
                >
                  Sign out
                </button>
              </form>
            ) : (
              <Link
                href="/login"
                className="bg-ink px-5 py-2.5 text-[10px] font-semibold tracking-[0.18em] text-paper uppercase transition-colors hover:bg-ink/85"
              >
                Client sign in
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
