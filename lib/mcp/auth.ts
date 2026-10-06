import { FLEET_TENANT_ID } from "../db/ops-defaults.ts"
import {
  resolveCustomerCredential,
  type TenantCredentialRecord,
} from "../auth/credentials.ts"
import { FLEET_UID } from "../auth/identity.ts"
import { verifyOpsSecret } from "../auth/token.ts"

export type McpHeaderSource = {
  get: (name: string) => string | null
}

export type McpAuthResult =
  | { ok: true; tenantId: string; uid: string }
  | { ok: false; status: 401; error: "Unauthorized" }

export type McpAccess =
  | { allowFleetTools: true; tenantId: typeof FLEET_TENANT_ID; uid: typeof FLEET_UID }
  | { allowFleetTools: false; status: 401 | 403; tenantId?: string }

/** Same presentation as `/api/ops/*`: Bearer, then X-Ops-Board-Secret. */
export function presentedMcpSecret(headers: McpHeaderSource): string | null {
  const authorization = headers.get("authorization")
  if (authorization) {
    const match = /^Bearer\s+(.+)$/i.exec(authorization.trim())
    const token = match?.[1]?.trim()
    if (token) return token
  }
  return headers.get("x-ops-board-secret")?.trim() || null
}

export function authorizeMcpRequest(
  headers: McpHeaderSource,
  expectedSecret = process.env.OPS_BOARD_SECRET,
): McpAuthResult {
  const presented = presentedMcpSecret(headers)
  const production = process.env.NODE_ENV === "production"
  if (presented && expectedSecret && verifyOpsSecret(presented, expectedSecret)) {
    return { ok: true, tenantId: FLEET_TENANT_ID, uid: FLEET_UID }
  }
  if (!presented && !expectedSecret && !production) {
    return { ok: true, tenantId: FLEET_TENANT_ID, uid: FLEET_UID }
  }
  return { ok: false, status: 401, error: "Unauthorized" }
}

/**
 * Fleet secret runs fleet tools. A customer secret resolves to that tenant
 * and does not run fleet tools. Missing credentials fail closed in production.
 */
export async function resolveMcpAccess(input: {
  presented: string | null
  fleetSecret?: string
  records: readonly TenantCredentialRecord[]
  production: boolean
}): Promise<McpAccess> {
  const presented = input.presented?.trim() || ""
  const fleetSecret = input.fleetSecret ?? ""
  if (presented && fleetSecret && verifyOpsSecret(presented, fleetSecret)) {
    return { allowFleetTools: true, tenantId: FLEET_TENANT_ID, uid: FLEET_UID }
  }
  if (presented) {
    const customer = await resolveCustomerCredential(presented, input.records)
    if (customer) return { allowFleetTools: false, status: 403, tenantId: customer.tenantId }
  }
  if (!presented && !fleetSecret && !input.production) {
    return { allowFleetTools: true, tenantId: FLEET_TENANT_ID, uid: FLEET_UID }
  }
  return { allowFleetTools: false, status: 401 }
}
