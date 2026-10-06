import {
  resolveCustomerCredential,
  resolvePresentedSecret,
  type TenantCredentialRecord,
} from "./credentials.ts"
import { identityForTenant, type AuthIdentity } from "./identity.ts"
import { verifyTenantSessionToken } from "./tenant-session.ts"
import { FLEET_TENANT_ID } from "../db/ops-defaults.ts"
import { safeEqual, verifySessionToken } from "./token.ts"

/**
 * Tenant comes from the verified fleet secret, a customer verifier, or a
 * bound session. Callers must not pass a query param, body tenant_id, or
 * client header into this function.
 */
export async function decideRequestAuth(input: {
  cookie?: string | null
  presented?: string | null
  fleetSecret?: string
  signingKey?: string | null
  records: readonly TenantCredentialRecord[]
  devGateOpen: boolean
  now?: number
}): Promise<AuthIdentity | null> {
  const presented = input.presented?.trim() || ""
  const cookie = input.cookie ?? ""
  const fleetSecret = input.fleetSecret ?? ""
  const signingKey = input.signingKey ?? ""

  const fleetBearer = Boolean(presented && fleetSecret && safeEqual(presented, fleetSecret))
  const fleetCookie = Boolean(cookie && fleetSecret && (await verifySessionToken(cookie, fleetSecret)))
  const customerCookie =
    !fleetCookie && cookie.startsWith("v1.") && signingKey
      ? await verifyTenantSessionToken({
          token: cookie,
          signingKey,
          records: input.records,
          now: input.now,
        })
      : null
  const customerBearer =
    !fleetBearer && presented ? await resolveCustomerCredential(presented, input.records) : null

  if (fleetBearer && customerCookie) return null
  if (fleetCookie && customerBearer) return null
  if (customerCookie && customerBearer && customerCookie.tenantId !== customerBearer.tenantId) return null

  if (fleetBearer || fleetCookie) return identityForTenant(FLEET_TENANT_ID)
  if (customerCookie) return identityForTenant(customerCookie.tenantId)
  if (customerBearer) return identityForTenant(customerBearer.tenantId)
  if (input.devGateOpen && !presented && !cookie.startsWith("v1.")) {
    return identityForTenant(FLEET_TENANT_ID)
  }
  return null
}

export async function decidePresentedTenant(input: {
  presented: string
  fleetSecret?: string
  records: readonly TenantCredentialRecord[]
}) {
  return resolvePresentedSecret(input)
}
