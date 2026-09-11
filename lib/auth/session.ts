import { cookies, headers } from "next/headers"
import { getPresentedOpsSecret } from "@/lib/auth/request"
import {
  createSessionToken,
  isAuthGateEnabled,
  OPS_SESSION_COOKIE,
  verifyOpsSecret,
  verifySessionToken,
} from "@/lib/auth/token"

const SESSION_MAX_AGE = 60 * 60 * 24 * 30

export { createSessionToken, isAuthGateEnabled, OPS_SESSION_COOKIE, verifyOpsSecret, verifySessionToken }

export async function getSessionCookie() {
  const store = await cookies()
  return store.get(OPS_SESSION_COOKIE)?.value
}

export async function isOpsAuthenticated() {
  if (!isAuthGateEnabled()) return true
  if (await verifySessionToken(await getSessionCookie())) return true

  try {
    const presented = getPresentedOpsSecret(await headers())
    return presented ? verifyOpsSecret(presented) : false
  } catch {
    return false
  }
}

export async function requireOpsSession() {
  const ok = await isOpsAuthenticated()
  if (!ok) {
    throw new Error("Unauthorized")
  }
}

export async function setOpsSessionCookie() {
  const store = await cookies()
  store.set(OPS_SESSION_COOKIE, await createSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  })
}

export async function clearOpsSessionCookie() {
  const store = await cookies()
  store.delete(OPS_SESSION_COOKIE)
}
