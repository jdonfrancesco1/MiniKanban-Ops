import { NextResponse, type NextRequest } from "next/server"
import { opsGateDecision } from "@/lib/auth/gate"
import { getPresentedOpsSecret, isOpsRequestAuthorized } from "@/lib/auth/request"
import { isFleetDevGateOpen, OPS_SESSION_COOKIE } from "@/lib/auth/token"

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const presented = getPresentedOpsSecret(request.headers)
  const cookie = request.cookies.get(OPS_SESSION_COOKIE)?.value

  if (isFleetDevGateOpen() && !presented && !cookie?.startsWith("v1.")) {
    return NextResponse.next()
  }

  const decision = opsGateDecision({
    pathname,
    fleetAuthorized: await isOpsRequestAuthorized(request),
    hasPresentedSecret: Boolean(presented),
    hasSessionCookie: Boolean(cookie),
  })

  if (decision === "redirect-boards") {
    return NextResponse.redirect(new URL("/boards/ops", request.url))
  }
  if (decision === "next") return NextResponse.next()
  if (decision === "unauthorized") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const loginUrl = new URL("/auth", request.url)
  loginUrl.searchParams.set("next", pathname)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
