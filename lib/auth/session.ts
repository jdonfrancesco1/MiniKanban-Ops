import { cookies, headers } from "next/headers"
import { loadTenantCredentialRecords } from "@/lib/auth/credential-store"
import { decideRequestAuth } from "@/lib/auth/decide"
import { getPresentedOpsSecret } from "@/lib/auth/request"
import { customerSessionSigningKey } from "@/lib/auth/tenant-session"
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
    throw new Error("Unauthorized")
  }
}

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
