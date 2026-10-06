export const OPS_SESSION_COOKIE = "ops_board_session"

/** Fleet browser cookie lifetime. Customer sessions use the same max-age. */
export const OPS_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30

/**
 * Fixed payload for the fleet cookie only.
 * Multi-customer sessions must not HMAC this string. See lib/auth/tenant-session.ts.
 */
const FLEET_SESSION_PAYLOAD = "minikanban-ops-ok"

/**
 * Local/dev only: no OPS_BOARD_SECRET means the fleet board is open.
 * Production never uses this. A missing fleet or customer credential fails closed.
 */
export function isFleetDevGateOpen() {
  return process.env.NODE_ENV !== "production" && !process.env.OPS_BOARD_SECRET
}

export function isAuthGateEnabled() {
  return !isFleetDevGateOpen()
}

/** Constant-time string compare. Unequal lengths still scan so the mismatch is not an early return. */
export function safeEqual(a: string, b: string) {
  const length = Math.max(a.length, b.length)
  let diff = a.length ^ b.length
  for (let i = 0; i < length; i++) {
    const left = i < a.length ? a.charCodeAt(i) : 0
    const right = i < b.length ? b.charCodeAt(i) : 0
    diff |= left ^ right
  }
  return diff === 0
}

export async function createSessionToken(secret = process.env.OPS_BOARD_SECRET ?? "") {
  if (!secret) return ""
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  )
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(FLEET_SESSION_PAYLOAD))
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, "0")).join("")
}

export async function verifySessionToken(token: string | undefined | null, secret = process.env.OPS_BOARD_SECRET) {
  if (!secret || !token) return false
  return safeEqual(token, await createSessionToken(secret))
}

/** Fleet secret only. Missing expected secret is a failed check, not an open gate. */
export function verifyOpsSecret(secret: string, expected = process.env.OPS_BOARD_SECRET) {
  if (!expected || !secret) return false
  return safeEqual(secret, expected)
}
