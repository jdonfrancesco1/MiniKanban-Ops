import { NextResponse, type NextRequest } from "next/server"
import { OPS_SESSION_COOKIE, verifySessionToken } from "@/lib/auth/token"

const PUBLIC_PREFIXES = ["/_next", "/favicon", "/icon", "/placeholder", "/api/auth"]

function isPublicPath(pathname: string) {
  if (pathname === "/" || pathname === "/auth" || pathname === "/login") return true
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (!process.env.OPS_BOARD_SECRET) {
    return NextResponse.next()
  }

  const token = request.cookies.get(OPS_SESSION_COOKIE)?.value
  const authenticated = await verifySessionToken(token)

  if (isPublicPath(pathname)) {
    if (authenticated && (pathname === "/auth" || pathname === "/login")) {
      return NextResponse.redirect(new URL("/boards/ops", request.url))
    }
    return NextResponse.next()
  }

  if (authenticated) {
    return NextResponse.next()
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const loginUrl = new URL("/auth", request.url)
  loginUrl.searchParams.set("next", pathname)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
