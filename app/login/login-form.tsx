"use client"

import { useActionState, useState } from "react"

import { login, requestIpAccess, type IpRequestState, type LoginState } from "./actions"

export function LoginForm({ from }: { from?: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {})
  const [reqState, reqAction, reqPending] = useActionState<IpRequestState, FormData>(requestIpAccess, {})
  const [userValue, setUserValue] = useState("")

  return (
    <div className="flex flex-col gap-5">
      <form action={action} className="flex flex-col gap-5">
        {from && <input type="hidden" name="from" value={from} />}

        <div className="flex flex-col gap-1.5">
          <label htmlFor="user" className="text-[10px] font-semibold tracking-[0.2em] text-muted-foreground uppercase">
            Login ID
          </label>
          <input
            id="user"
            name="user"
            value={userValue}
            onChange={(e) => setUserValue(e.target.value)}
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

      {state.ipBlocked && !reqState.success && (
        <form action={reqAction} className="flex flex-col gap-3 border border-dashed border-stamp/50 p-4">
          <input type="hidden" name="user" value={userValue} />
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Your network (<span className="font-mono font-semibold text-ink">{state.blockedIp}</span>) is not
            yet approved. Send a request — an admin can allow it from the admin panel.
          </p>
          <input
            name="note"
            placeholder="Optional note (office name, location)…"
            className="border-0 border-b-2 border-ink/40 bg-transparent pb-1.5 text-xs placeholder:text-muted-foreground/50 focus:border-stamp focus:outline-none"
          />
          <button
            type="submit"
            disabled={reqPending}
            className="border border-stamp px-4 py-2 text-[10px] font-semibold tracking-[0.16em] text-stamp uppercase transition-colors hover:bg-stamp hover:text-paper disabled:opacity-60"
          >
            {reqPending ? "Sending…" : "Request access for this network"}
          </button>
          {reqState.error && <p className="text-xs text-destructive">{reqState.error}</p>}
        </form>
      )}

      {reqState.success && (
        <p className="border border-ink/20 bg-secondary px-4 py-3 text-xs leading-relaxed">
          Request sent. An admin will review it — try signing in again once your network is approved.
        </p>
      )}
    </div>
  )
}
