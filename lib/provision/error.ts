export class ProvisionError extends Error {
  readonly status: 400 | 401 | 500

  constructor(status: 400 | 401 | 500, message: string) {
    super(message)
    this.name = "ProvisionError"
    this.status = status
  }
}

/** Insert lost a race with the same external buyer id. The new secret is discarded. */
export class ProvisionBuyerConflict extends Error {
  constructor() {
    super("Buyer already provisioned")
    this.name = "ProvisionBuyerConflict"
  }
}

function errorText(error: unknown): string {
  if (!error || typeof error !== "object") return ""
  const record = error as { code?: string; constraint?: string; message?: string; cause?: unknown }
  return `${record.code ?? ""} ${record.constraint ?? ""} ${record.message ?? ""} ${errorText(record.cause)}`
}

export function isExternalBuyerConflict(error: unknown) {
  if (error instanceof ProvisionBuyerConflict) return true
  const text = errorText(error)
  return text.includes("23505") && text.includes("external_buyer_id")
}

export function isTenantIdConflict(error: unknown) {
  const text = errorText(error)
  return text.includes("23505") && text.includes("tenant_id") && !text.includes("external_buyer_id")
}
