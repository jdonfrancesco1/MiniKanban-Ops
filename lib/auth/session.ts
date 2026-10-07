import { cookies, headers } from "next/headers"
import { loadTenantCredentialRecords } from "@/lib/auth/credential-store"
import { decideRequestAuth } from "@/lib/auth/decide"
import { getPresentedOpsSecret } from "@/lib/auth/request"
import { customerSessionSigningKey } from "@/lib/auth/tenant-session"
import { armVerifiedTenantRls, setVerifiedTenantResolver } from "@/lib/db/tenant-rls"
import { OpsAccessError } from "@/lib/ops/access"
import {
  createSessionToken,
  isAuthGateEnabled,
  isFleetDevGateOpen,
  OPS_SESSION_COOKIE,
  OPS_SESSION_MAX_AGE_SECONDS,
  verifyOpsSecret,
  verifySessionToken,
} from "@/lib/auth/token"

export {
  createSessionToken,
  isAuthGateEnabled,
  isFleetDevGateOpen,
  OPS_SESSION_COOKIE,
  verifyOpsSecret,
  verifySessionToken,
}

export async function getSessionCookie() {
  const store = await cookies()
  return store.get(OPS_SESSION_COOKIE)?.value
}

async function presentedSecret() {
  try {
    return getPresentedOpsSecret(await headers())
  } catch {
    return null
  }
}

/** Fleet board gate. A customer session or bearer does not pass. */
export async function isOpsAuthenticated() {
  const cookie = await getSessionCookie()
  if (cookie?.startsWith("v1.")) return false
  const presented = await presentedSecret()
  if (presented && !verifyOpsSecret(presented)) return false
  if (isFleetDevGateOpen()) return true
  if (cookie && (await verifySessionToken(cookie))) return true
  return presented ? verifyOpsSecret(presented) : false
}

export async function requireOpsSession() {
  const ok = await isOpsAuthenticated()
  if (!ok) {
    throw new OpsAccessError(401)
  }
}

/**
 * Fleet or customer. Tenant comes from the verified cookie or bearer only.
 * The database client reads this same identity for each transaction
 * (lib/db/tenant-rls.ts). Slice C checks that call this function stay.
 */
export async function requireActorTenant() {
  const identity = await resolveAuthIdentity()
  if (!identity?.tenantId) throw new OpsAccessError(401)
  // Open the request Client first so attachTenantRls can register the arm
  // callback, then set_config(app.tenant_id) for FORCE RLS. Do not use async
  // client.query wrapping on Workers (breaks Neon on cloudflare:sockets).
  const { getDb } = await import("@/lib/db")
  getDb()
  await armVerifiedTenantRls(identity.tenantId)
  return identity.tenantId
}

setVerifiedTenantResolver(async () => {
  const identity = await resolveAuthIdentity()
  return identity?.tenantId ?? null
})

async function writeSessionCookie(value: string) {
  const store = await cookies()
  store.set(OPS_SESSION_COOKIE, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: OPS_SESSION_MAX_AGE_SECONDS,
  })
}

export async function setOpsSessionCookie() {
  await writeSessionCookie(await createSessionToken())
}

export async function setTenantSessionCookie(token: string) {
  if (!token.startsWith("v1.")) throw new Error("Invalid tenant session")
  await writeSessionCookie(token)
}

export async function clearOpsSessionCookie() {
  const store = await cookies()
  store.delete(OPS_SESSION_COOKIE)
}

/** Identity for /api/auth/me. Fleet uid stays ops. Customer uid is tenant-scoped. */
export async function resolveAuthIdentity() {
  const cookie = await getSessionCookie()
  const presented = await presentedSecret()
  const records =
    cookie?.startsWith("v1.") || (presented && !verifyOpsSecret(presented))
      ? await loadTenantCredentialRecords()
      : []
  return decideRequestAuth({
    cookie,
    presented,
    fleetSecret: process.env.OPS_BOARD_SECRET,
    signingKey: customerSessionSigningKey(),
    records,
    devGateOpen: isFleetDevGateOpen(),
  })
}
