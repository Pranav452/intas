import { NextResponse, type NextRequest } from "next/server"

import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth"

export default function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname
  const needsSession = path === "/dashboard" || path.startsWith("/dashboard/")
  const needsUpload = path === "/admin/upload" || path.startsWith("/admin/upload/")
  const needsAdmin = (path === "/admin" || path.startsWith("/admin/")) && !needsUpload
  const session = verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value)

  if (needsSession || needsUpload || needsAdmin) {
    if (!session) {
      const login = new URL("/login", req.nextUrl)
      login.searchParams.set("from", path)
      return NextResponse.redirect(login)
    }
    if (needsUpload && session.role !== "uploader" && session.role !== "admin") {
      return NextResponse.redirect(new URL("/dashboard", req.nextUrl))
    }
    if (needsAdmin && session.role !== "admin") {
      return NextResponse.redirect(new URL("/dashboard", req.nextUrl))
    }
  }

  if (path === "/login" && session) {
    const home = session.role === "admin" ? "/admin" : "/dashboard"
    return NextResponse.redirect(new URL(home, req.nextUrl))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|ico)$).*)"],
}
