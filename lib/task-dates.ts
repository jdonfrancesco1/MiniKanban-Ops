export const OPS_DISPLAY_TIME_ZONE = "America/New_York"

export function isDoneColumnTitle(title: string | null | undefined) {
  return title?.trim().toLowerCase() === "done"
}

export function toDate(value: Date | string | number | null | undefined): Date | null {
  if (value == null || value === "") return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function formatOpsDate(
  value: Date | string | number | null | undefined,
  style: "card" | "detail" = "detail",
) {
  const date = toDate(value)
  if (!date) return ""
  const options: Intl.DateTimeFormatOptions =
    style === "card"
      ? { month: "short", day: "numeric", timeZone: OPS_DISPLAY_TIME_ZONE }
      : { month: "short", day: "numeric", year: "numeric", timeZone: OPS_DISPLAY_TIME_ZONE }
  return new Intl.DateTimeFormat("en-US", options).format(date)
}

export function formatOpsDateLine(input: {
  createdAt?: Date | string | number | null
  completedAt?: Date | string | number | null
  showCompleted?: boolean
  style?: "card" | "detail"
}) {
  const style = input.style ?? "card"
  const created = formatOpsDate(input.createdAt, style)
  const completed = input.showCompleted ? formatOpsDate(input.completedAt, style) : ""
  const parts = [created ? `Created ${created}` : "", completed ? `Completed ${completed}` : ""].filter(Boolean)
  return parts.join(" · ")
}

/**
 * Stamp completedAt when a task enters Done; clear it when it leaves.
 * `undefined` means leave the existing value unchanged.
 */
export function nextCompletedAt(input: {
  fromTitle?: string | null
  toTitle?: string | null
  now?: Date
}): Date | null | undefined {
  const fromDone = isDoneColumnTitle(input.fromTitle)
  const toDone = isDoneColumnTitle(input.toTitle)
  if (!fromDone && toDone) return input.now ?? new Date()
  if (fromDone && !toDone) return null
  return undefined
}

/**
 * Existing Done cards without completedAt use updatedAt as a best-effort
 * completion time (documented in README + drizzle/0002_task_completed_at.sql).
 */
export function backfillCompletedAt(input: {
  columnTitle?: string | null
  completedAt?: Date | string | number | null
  updatedAt?: Date | string | number | null
}): Date | null {
  const existing = toDate(input.completedAt)
  if (existing) return existing
  if (!isDoneColumnTitle(input.columnTitle)) return null
  return toDate(input.updatedAt)
}
