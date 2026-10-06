import { FLEET_TENANT_ID } from "../db/ops-defaults.ts"
import { assertCustomerTenantId, hmacUtf8Hex, type TenantCredentialRecord } from "./credentials.ts"
import { OPS_SESSION_MAX_AGE_SECONDS, safeEqual } from "./token.ts"

const FIXED_FLEET_PAYLOAD = "minikanban-ops-ok"

export type TenantSessionRecord = Pick<TenantCredentialRecord, "tenantId">

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = ""
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "")
}

function base64UrlToBytes(value: string) {
  const padded = value.replaceAll("-", "+").replaceAll("_", "/") + "=".repeat((4 - (value.length % 4)) % 4)
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

/**
 * Signing key for customer session cookies. Never the fleet OPS_BOARD_SECRET.
 * Unset, or equal to the fleet secret, fails closed (no customer cookie).
 */
export function customerSessionSigningKey(
  env: { OPS_TENANT_SESSION_SECRET?: string; OPS_BOARD_SECRET?: string } = process.env,
) {
  const key = env.OPS_TENANT_SESSION_SECRET?.trim() ?? ""
  if (!key) return null
  const fleet = env.OPS_BOARD_SECRET?.trim() ?? ""
  if (fleet && safeEqual(key, fleet)) return null
  return key
}

/**
 * Multi-customer session. Payload encodes tenantId. Verification looks that
 * tenant up in the credential directory and checks the MAC with the server
 * signing key. This is not an HMAC of "minikanban-ops-ok".
 */
export async function createTenantSessionToken(input: {
  tenantId: string
  signingKey: string
  now?: number
  ttlMs?: number
}) {
  assertCustomerTenantId(input.tenantId)
  if (!input.signingKey) throw new Error("Missing session signing key")
  const exp = (input.now ?? Date.now()) + (input.ttlMs ?? OPS_SESSION_MAX_AGE_SECONDS * 1000)
  const payload = bytesToBase64Url(
    new TextEncoder().encode(JSON.stringify({ v: 1, tenantId: input.tenantId, exp })),
  )
  if (payload.includes(FIXED_FLEET_PAYLOAD)) throw new Error("Invalid session payload")
  const mac = await hmacUtf8Hex(input.signingKey, payload)
  return `v1.${payload}.${mac}`
}

export async function verifyTenantSessionToken(input: {
  token: string
  signingKey: string
  records: readonly TenantSessionRecord[]
  now?: number
}) {
  if (!input.signingKey || !input.token.startsWith("v1.")) return null
  const parts = input.token.split(".")
  if (parts.length !== 3) return null
  const [, payload, mac] = parts
  if (!payload || !mac || payload.includes(FIXED_FLEET_PAYLOAD)) return null
  const expected = await hmacUtf8Hex(input.signingKey, payload)
  if (!safeEqual(expected, mac)) return null

  let body: { v?: unknown; tenantId?: unknown; exp?: unknown }
  try {
    body = JSON.parse(new TextDecoder().decode(base64UrlToBytes(payload))) as {
      v?: unknown
      tenantId?: unknown
      exp?: unknown
    }
  } catch {
    return null
  }
  if (body.v !== 1 || typeof body.tenantId !== "string" || typeof body.exp !== "number") return null
  if (body.tenantId === FLEET_TENANT_ID) return null
  if (body.exp <= (input.now ?? Date.now())) return null
  const record = input.records.find((item) => item.tenantId === body.tenantId)
  if (!record) return null
  return { tenantId: record.tenantId }
}
