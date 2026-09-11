export const OPS_SESSION_COOKIE = "ops_board_session"

const PAYLOAD = "minikanban-ops-ok"

export function isAuthGateEnabled() {
  return Boolean(process.env.OPS_BOARD_SECRET)
}

export function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false
  let out = 0
  for (let i = 0; i < a.length; i++) {
    out |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return out === 0
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
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(PAYLOAD))
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, "0")).join("")
}

export async function verifySessionToken(token: string | undefined | null, secret = process.env.OPS_BOARD_SECRET) {
  if (!secret) return true
  if (!token) return false
  return safeEqual(token, await createSessionToken(secret))
}

export function verifyOpsSecret(secret: string, expected = process.env.OPS_BOARD_SECRET) {
  if (!expected) return true
  return safeEqual(secret, expected)
}
