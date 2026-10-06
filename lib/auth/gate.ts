const PUBLIC_PREFIXES = ["/_next", "/favicon", "/icon", "/placeholder", "/api/auth", "/preview"]

export function isPublicPath(pathname: string) {
  if (pathname === "/" || pathname === "/auth" || pathname === "/login" || pathname === "/connect") return true
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

export function isApiLikePath(pathname: string) {
  return pathname.startsWith("/api/") || pathname === "/mcp" || pathname.startsWith("/mcp/")
}

/** Ops HTTP and MCP. Tenant is resolved in the handler, not from a client header. */
export function isTenantScopedOpsPath(pathname: string) {
  return (
    pathname === "/mcp" ||
    pathname.startsWith("/mcp/") ||
    pathname === "/api/mcp" ||
    pathname.startsWith("/api/mcp/") ||
    pathname === "/api/ops" ||
    pathname.startsWith("/api/ops/")
  )
}

export type OpsGateDecision = "next" | "unauthorized" | "redirect-login" | "redirect-boards"

/**
 * Fleet auth unlocks the app as before. A non-fleet credential is allowed
 * through only on `/api/ops/*` and MCP so the handler can scope it.
 * Pages stay on the fleet gate.
 */
export function opsGateDecision(input: {
  pathname: string
  fleetAuthorized: boolean
  hasPresentedSecret: boolean
  hasSessionCookie: boolean
}): OpsGateDecision {
  if (isPublicPath(input.pathname)) {
    if (input.fleetAuthorized && (input.pathname === "/auth" || input.pathname === "/login")) {
      return "redirect-boards"
    }
    return "next"
  }
  if (input.fleetAuthorized) return "next"
  if (isTenantScopedOpsPath(input.pathname) && (input.hasPresentedSecret || input.hasSessionCookie)) {
    return "next"
  }
  if (isApiLikePath(input.pathname)) return "unauthorized"
  return "redirect-login"
}
