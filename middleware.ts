import { NextResponse, type NextRequest } from "next/server"
import { getPresentedOpsSecret, isOpsRequestAuthorized } from "@/lib/auth/request"
import { isFleetDevGateOpen, OPS_SESSION_COOKIE } from "@/lib/auth/token"

const PUBLIC_PREFIXES = ["/_next", "/favicon", "/icon", "/placeholder", "/api/auth", "/preview"]

function isPublicPath(pathname: string) {
  if (pathname === "/" || pathname === "/auth" || pathname === "/login" || pathname === "/connect") return true
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

function isApiLikePath(pathname: string) {
  return pathname.startsWith("/api/") || pathname === "/mcp" || pathname.startsWith("/mcp/")
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (isFleetDevGateOpen()) {
    const presented = getPresentedOpsSecret(request.headers)
    const cookie = request.cookies.get(OPS_SESSION_COOKIE)?.value
    if (!presented && !cookie?.startsWith("v1.")) {
      return NextResponse.next()
    }
  }

  const authenticated = await isOpsRequestAuthorized(request)

  if (isPublicPath(pathname)) {
    if (authenticated && (pathname === "/auth" || pathname === "/login")) {
      return NextResponse.redirect(new URL("/boards/ops", request.url))
    }
    return NextResponse.next()
  }

  if (authenticated) {
    return NextResponse.next()
  }

  if (isApiLikePath(pathname)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const loginUrl = new URL("/auth", request.url)
  loginUrl.searchParams.set("next", pathname)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
