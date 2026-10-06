import { db } from "@/lib/db"
import { tenantCredentials } from "@/lib/db/schema"
import { FLEET_TENANT_ID } from "@/lib/db/ops-defaults"
import type { TenantCredentialRecord } from "@/lib/auth/credentials"

/**
 * Load customer verifiers. Fleet has no row. A missing table or a failed
 * query fails closed (no customer match). The plaintext secret is not selected.
 */
export async function loadTenantCredentialRecords(): Promise<TenantCredentialRecord[]> {
  try {
    const rows = await db
      .select({
        tenantId: tenantCredentials.tenantId,
        salt: tenantCredentials.salt,
        verifier: tenantCredentials.verifier,
      })
      .from(tenantCredentials)
    return rows.filter((row) => row.tenantId !== FLEET_TENANT_ID)
  } catch {
    return []
  }
}
