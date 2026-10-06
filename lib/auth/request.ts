import {
  OPS_SESSION_COOKIE,
  isFleetDevGateOpen,
  verifyOpsSecret,
  verifySessionToken,
} from "@/lib/auth/token"

export type HeaderSource = Pick<Headers, "get">

export type CookieSource = {
  get: (name: string) => { value: string } | undefined
}

export function getPresentedOpsSecret(headerSource: HeaderSource): string | null {
  const authorization = headerSource.get("authorization")
  if (authorization) {
    const match = /^Bearer\s+(.+)$/i.exec(authorization.trim())
    const token = match?.[1]?.trim()
    if (token) return token
  }

  const headerSecret = headerSource.get("x-ops-board-secret")?.trim()
  return headerSecret || null
}

/**
 * Fleet routes only. Customer cookies (v1.) and non-fleet bearers fail closed,
 * including when the local dev gate would otherwise be open.
 * Tenant is not read from the URL or from client headers.
 */
export async function isOpsRequestAuthorized(request: {
  cookies?: CookieSource
  headers: HeaderSource
}): Promise<boolean> {
  const presented = getPresentedOpsSecret(request.headers)
  const cookie = request.cookies?.get(OPS_SESSION_COOKIE)?.value
  if (cookie?.startsWith("v1.")) return false
  if (presented && !verifyOpsSecret(presented)) return false
  if (isFleetDevGateOpen()) return true
  if (cookie && (await verifySessionToken(cookie))) return true
  return presented ? verifyOpsSecret(presented) : false
}
