"use client"

import { useActionState } from "react"

import { login, type LoginState } from "./actions"

export function LoginForm({ from }: { from?: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {})

  return (
    <form action={action} className="flex flex-col gap-5">
      {from && <input type="hidden" name="from" value={from} />}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="user" className="text-[10px] font-semibold tracking-[0.2em] text-muted-foreground uppercase">
          Login ID
        </label>
        <input
          id="user"
          name="user"
          autoComplete="username"
          required
          autoFocus
          className="border-0 border-b-2 border-ink/40 bg-transparent pb-2 text-[15px] focus:border-stamp focus:outline-none"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-[10px] font-semibold tracking-[0.2em] text-muted-foreground uppercase">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="border-0 border-b-2 border-ink/40 bg-transparent pb-2 text-[15px] focus:border-stamp focus:outline-none"
        />
      </div>

      {state.error && (
        <p className="border-l-4 border-destructive bg-destructive/[0.06] px-3 py-2 text-xs text-destructive">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-1 bg-ink px-6 py-3 text-xs font-semibold tracking-[0.2em] text-paper uppercase transition-colors hover:bg-ink/85 disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Open the ledger →"}
      </button>
    </form>
  )
}
