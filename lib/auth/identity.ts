import { FLEET_TENANT_ID } from "../db/ops-defaults.ts"

/** Synthetic ops user. Fleet tenant only. */
export const FLEET_UID = "ops"

export type AuthIdentity = {
  uid: string
  displayName: string
  phoneNumber: null
  tenantId: string
}

export function identityForTenant(tenantId: string): AuthIdentity {
  if (tenantId === FLEET_TENANT_ID) {
    return { uid: FLEET_UID, displayName: "Ops", phoneNumber: null, tenantId }
  }
  return {
    uid: `tenant:${tenantId}`,
    displayName: tenantId,
    phoneNumber: null,
    tenantId,
  }
}
