import {
  OPS_SESSION_COOKIE,
  isAuthGateEnabled,
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

export async function isOpsRequestAuthorized(request: {
  cookies?: CookieSource
  headers: HeaderSource
}): Promise<boolean> {
  if (!isAuthGateEnabled()) return true

  const cookie = request.cookies?.get(OPS_SESSION_COOKIE)?.value
  if (await verifySessionToken(cookie)) return true

  const presented = getPresentedOpsSecret(request.headers)
  return presented ? verifyOpsSecret(presented) : false
}
