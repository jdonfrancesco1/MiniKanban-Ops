import { assertCustomerTenantId, createTenantCredential, type TenantCredentialRecord } from "../auth/credentials.ts"
import { safeEqual } from "../auth/token.ts"
import {
  DEFAULT_BOARD_SLUG,
  DEFAULT_BOARD_TITLE,
  OPS_COLUMN_TITLES,
} from "../db/ops-defaults.ts"
import { assertExternalBuyerId } from "./buyer.ts"
import { assertCustomerBaseUrl } from "./connector.ts"
import { isExternalBuyerConflict, isTenantIdConflict, ProvisionError } from "./error.ts"

/**
 * Idempotency rule: one external buyer id, one tenant, one secret handoff.
 *
 * The first successful call inserts one tenant_credentials row (salt + HMAC
 * verifier + buyer id), creates that tenant's default ops board, and returns
 * the plaintext secret once. A later call with the same buyer id returns the
 * same tenant and repairs a missing board. It does not mint a second tenant
 * or a second secret. A lost handoff is not recoverable here; this slice does
 * not rotate credentials. The buyer id is not used as the tenant id. A
 * client-supplied tenant id is ignored by the HTTP handler.
 */

export type ProvisionColumn = {
  id: string
  title: string
  order: number
}

export type ProvisionBoard = {
  id: string
  tenantId: string
  slug: string
  title: string
  columns: ProvisionColumn[]
}

export type ProvisionRow = TenantCredentialRecord & {
  externalBuyerId: string
}

export type ProvisionPersistence = {
  findByBuyerId(buyerId: string): Promise<ProvisionRow | null>
  tenantExists(tenantId: string): Promise<boolean>
  insertCredential(row: ProvisionRow): Promise<void>
  ensureDefaultBoard(tenantId: string): Promise<ProvisionBoard>
}

export type ProvisionResult = {
  created: boolean
  tenantId: string
  board: ProvisionBoard
  baseUrl: string
  secret?: string
}

export function customerBoardPlan(tenantId: string) {
  assertCustomerTenantId(tenantId)
  return {
    tenantId,
    slug: DEFAULT_BOARD_SLUG,
    title: DEFAULT_BOARD_TITLE,
    description: "Ops board",
    columns: OPS_COLUMN_TITLES.map((title, order) => ({ title, order })),
  }
}

export function mintCustomerTenantId() {
  const bytes = new Uint8Array(8)
  crypto.getRandomValues(bytes)
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")
  const tenantId = `c${hex}`
  assertCustomerTenantId(tenantId)
  return tenantId
}

async function mintCustomerSecret(input: {
  tenantId: string
  fleetSecret: string
  provisionSecret: string
  mintSecret?: () => string
}) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const supplied = input.mintSecret ? input.mintSecret() : undefined
    const minted = supplied
      ? await createTenantCredential(input.tenantId, supplied)
      : await createTenantCredential(input.tenantId)
    if (input.fleetSecret && safeEqual(minted.secret, input.fleetSecret)) continue
    if (input.provisionSecret && safeEqual(minted.secret, input.provisionSecret)) continue
    return minted
  }
  return null
}

function takeTenantId(mint?: () => string) {
  const candidate = mint ? mint() : mintCustomerTenantId()
  assertCustomerTenantId(candidate)
  return candidate
}

export async function provisionCustomer(input: {
  externalBuyerId: string
  persistence: ProvisionPersistence
  baseUrl: string
  fleetSecret?: string
  provisionSecret?: string
  mintSecret?: () => string
  mintTenantId?: () => string
}): Promise<ProvisionResult> {
  const fleetSecret = input.fleetSecret ?? ""
  const provisionSecret = input.provisionSecret ?? ""
  const buyerId = assertExternalBuyerId(input.externalBuyerId, [fleetSecret, provisionSecret])
  const baseUrl = assertCustomerBaseUrl(input.baseUrl)

  const existing = await input.persistence.findByBuyerId(buyerId)
  if (existing) {
    const board = await input.persistence.ensureDefaultBoard(existing.tenantId)
    return { created: false, tenantId: existing.tenantId, board, baseUrl }
  }

  for (let attempt = 0; attempt < 8; attempt++) {
    let tenantId: string
    try {
      tenantId = takeTenantId(input.mintTenantId)
    } catch {
      continue
    }
    if (await input.persistence.tenantExists(tenantId)) continue

    const minted = await mintCustomerSecret({
      tenantId,
      fleetSecret,
      provisionSecret,
      mintSecret: input.mintSecret,
    })
    if (!minted) throw new ProvisionError(500, "Could not allocate a tenant id")

    try {
      await input.persistence.insertCredential({ ...minted.record, externalBuyerId: buyerId })
    } catch (error) {
      if (isExternalBuyerConflict(error)) {
        const raced = await input.persistence.findByBuyerId(buyerId)
        if (!raced) throw error
        const board = await input.persistence.ensureDefaultBoard(raced.tenantId)
        return { created: false, tenantId: raced.tenantId, board, baseUrl }
      }
      if (isTenantIdConflict(error)) continue
      throw error
    }

    const board = await input.persistence.ensureDefaultBoard(tenantId)
    return { created: true, tenantId, board, baseUrl, secret: minted.secret }
  }

  throw new ProvisionError(500, "Could not allocate a tenant id")
}
