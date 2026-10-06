import { FLEET_TENANT_ID } from "../db/ops-defaults.ts"
import { safeEqual } from "./token.ts"

const TENANT_ID_RE = /^[a-z][a-z0-9_-]{0,63}$/

/** Stored verifier. The minted secret is returned once and is not a field here. */
export type TenantCredentialRecord = {
  tenantId: string
  salt: string
  verifier: string
}

export type MintedTenantCredential = {
  secret: string
  record: TenantCredentialRecord
}

export function assertCustomerTenantId(tenantId: string) {
  if (tenantId === FLEET_TENANT_ID || !TENANT_ID_RE.test(tenantId)) {
    throw new Error("Invalid tenant id")
  }
}

function toHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")
}

function fromHex(hex: string) {
  if (hex.length === 0 || hex.length % 2 !== 0 || !/^[0-9a-f]+$/i.test(hex)) {
    throw new Error("Invalid hex")
  }
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  }
  return bytes
}

async function hmacHex(key: Uint8Array, message: string) {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  )
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(message))
  return toHex(new Uint8Array(signature))
}

export async function hmacUtf8Hex(key: string, message: string) {
  return hmacHex(new TextEncoder().encode(key), message)
}

/** 32 bytes, base64url. Shown once at mint; only the HMAC verifier is stored. */
export function mintTenantSecret() {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  let binary = ""
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "")
}

export async function createTenantCredential(
  tenantId: string,
  secret = mintTenantSecret(),
): Promise<MintedTenantCredential> {
  assertCustomerTenantId(tenantId)
  if (!secret) throw new Error("Invalid tenant secret")
  const salt = new Uint8Array(32)
  crypto.getRandomValues(salt)
  const verifier = await hmacHex(salt, secret)
  return {
    secret,
    record: { tenantId, salt: toHex(salt), verifier },
  }
}

/** Timing-safe compare of HMAC(salt, presented) against the stored verifier. */
export async function verifyTenantCredential(presented: string, record: TenantCredentialRecord) {
  if (!presented || record.tenantId === FLEET_TENANT_ID) return false
  let salt: Uint8Array
  try {
    salt = fromHex(record.salt)
  } catch {
    return false
  }
  const computed = await hmacHex(salt, presented)
  return safeEqual(computed, record.verifier)
}

/**
 * Scan every record. One match wins. Zero or several matches fail closed
 * so a shared secret cannot pick a tenant.
 */
export async function resolveCustomerCredential(
  presented: string,
  records: readonly TenantCredentialRecord[],
) {
  if (!presented) return null
  let matched: TenantCredentialRecord | null = null
  let matches = 0
  for (const record of records) {
    if (record.tenantId === FLEET_TENANT_ID) continue
    if (await verifyTenantCredential(presented, record)) {
      matches += 1
      matched = record
    }
  }
  if (matches !== 1 || !matched) return null
  return matched
}

export async function resolvePresentedSecret(input: {
  presented: string
  fleetSecret?: string
  records: readonly TenantCredentialRecord[]
}) {
  if (input.presented && input.fleetSecret && safeEqual(input.presented, input.fleetSecret)) {
    return { tenantId: FLEET_TENANT_ID, kind: "fleet" as const }
  }
  const customer = await resolveCustomerCredential(input.presented, input.records)
  if (!customer) return null
  return { tenantId: customer.tenantId, kind: "customer" as const }
}
