import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"

import { LoginForm } from "./login-form"

export const metadata: Metadata = {
  title: "Sign in · INTAS DSR by LINKS",
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>
}) {
  const { from } = await searchParams

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm border-2 border-ink bg-card">
        <div className="border-b-2 border-ink px-8 py-6 text-center">
          <span className="mx-auto mb-4 flex h-8 w-fit items-center bg-white px-2.5 outline outline-ink/10">
            <Image src="/links-logo.png" alt="LINKS" width={64} height={26} className="h-5 w-auto" priority />
          </span>
          <h1 className="font-serif text-2xl font-bold tracking-tight">
            The INTAS <em className="text-stamp">Air Ledger</em>
          </h1>
          <p className="mt-1 text-[11px] tracking-[0.18em] text-muted-foreground uppercase">
            Authorised readers only
          </p>
        </div>
        <div className="px-8 py-7">
          <LoginForm from={from} />
        </div>
        <div className="border-t border-rule px-8 py-3 text-center text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
          Access is device-bound and logged
        </div>
      </div>

      <Link
        href="/"
        className="mt-6 text-[11px] tracking-[0.16em] text-muted-foreground uppercase transition-colors hover:text-ink"
      >
        ← Back to the front page
      </Link>
    </div>
  )
}
