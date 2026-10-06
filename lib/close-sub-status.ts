import { isDoneColumnTitle } from "./task-dates.ts"

/** James's close reasons. Stored as text; null until a card is closed into Done. */
export const CLOSE_SUB_STATUSES = ["Closed", "No Longer Needed", "Duplicate"] as const

export type CloseSubStatus = (typeof CLOSE_SUB_STATUSES)[number]

export function isCloseSubStatus(value: unknown): value is CloseSubStatus {
  return typeof value === "string" && (CLOSE_SUB_STATUSES as readonly string[]).includes(value)
}

export function closeSubStatusError(required: boolean) {
  const list = CLOSE_SUB_STATUSES.join(", ")
  return required
    ? `closeSubStatus is required and must be one of: ${list}`
    : `closeSubStatus must be one of: ${list}`
}

/**
 * Next `close_sub_status` for a column change.
 * Entering Done requires one of the three labels.
 * Leaving Done clears it. Staying in Done updates only when a valid value is sent.
 * `undefined` means leave the stored value alone.
 */
export function nextCloseSubStatus(input: {
  fromTitle?: string | null
  toTitle?: string | null
  closeSubStatus?: string | null
}): CloseSubStatus | null | undefined {
  const raw = typeof input.closeSubStatus === "string" ? input.closeSubStatus.trim() : input.closeSubStatus
  if (typeof raw === "string" && raw && !isCloseSubStatus(raw)) {
    throw new Error(closeSubStatusError(false))
  }

  const entering = !isDoneColumnTitle(input.fromTitle) && isDoneColumnTitle(input.toTitle)
  const leaving = isDoneColumnTitle(input.fromTitle) && !isDoneColumnTitle(input.toTitle)
  if (entering) {
    if (!isCloseSubStatus(raw)) throw new Error(closeSubStatusError(true))
    return raw
  }
  if (leaving) return null
  if (isCloseSubStatus(raw)) return raw
  return undefined
}
