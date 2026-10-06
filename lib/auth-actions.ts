"use server"

import { resolveCustomerCredential } from "@/lib/auth/credentials"
import { loadTenantCredentialRecords } from "@/lib/auth/credential-store"
import {
  clearOpsSessionCookie,
  isAuthGateEnabled,
  isFleetDevGateOpen,
  resolveAuthIdentity,
  setOpsSessionCookie,
  setTenantSessionCookie,
  verifyOpsSecret,
} from "@/lib/auth/session"
import { createTenantSessionToken, customerSessionSigningKey } from "@/lib/auth/tenant-session"

export async function loginWithOpsSecret(secret: string) {
  if (verifyOpsSecret(secret)) {
    await setOpsSessionCookie()
    return { success: true }
  }

  const records = await loadTenantCredentialRecords()
  const customer = await resolveCustomerCredential(secret, records)
  if (customer) {
    const signingKey = customerSessionSigningKey()
    if (!signingKey) return { success: false, error: "Invalid secret" }
    const token = await createTenantSessionToken({ tenantId: customer.tenantId, signingKey })
    await setTenantSessionCookie(token)
    return { success: true }
  }

  if (isFleetDevGateOpen()) {
    await setOpsSessionCookie()
    return { success: true }
  }

  return { success: false, error: "Invalid secret" }
}

export async function logoutOpsSession() {
  await clearOpsSessionCookie()
  return { success: true }
}

export async function getOpsAuthState() {
  const identity = await resolveAuthIdentity()
  return {
    authenticated: Boolean(identity),
    gateEnabled: isAuthGateEnabled(),
    tenantId: identity?.tenantId ?? null,
    user: identity,
  }
}
