import { safeEqual } from "../auth/token.ts"
import { ProvisionError } from "./error.ts"

/** Stable external id. Not a tenant id and not a secret. */
const BUYER_ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/

/**
 * Reject blank, `fleet`, and any value equal to a live secret so the id
 * cannot echo that secret back in a later response.
 */
export function assertExternalBuyerId(buyerId: string, blocked: readonly string[] = []) {
  if (typeof buyerId !== "string" || buyerId !== buyerId.trim() || !BUYER_ID_RE.test(buyerId) || buyerId === "fleet") {
    throw new ProvisionError(400, "Invalid buyer id")
  }
  for (const secret of blocked) {
    if (secret && safeEqual(buyerId, secret)) throw new ProvisionError(400, "Invalid buyer id")
  }
  return buyerId
}
