export const TASK_SHORT_ID_PREFIX = "MKB-"
export const TASK_SHORT_ID_HEX_LENGTH = 8

const UUID_HEX_RE = /^[0-9a-f]{8,}$/i

function compactId(id: string) {
  return id.replace(/-/g, "")
}

/**
 * Visible public id derived from the existing task primary key.
 * UUID tasks use the first 8 hex chars (MKB-7E3A1234). No second stored id.
 */
export function taskShortId(id: string): string {
  const compact = compactId(id.trim())
  if (UUID_HEX_RE.test(compact)) {
    return `${TASK_SHORT_ID_PREFIX}${compact.slice(0, TASK_SHORT_ID_HEX_LENGTH).toUpperCase()}`
  }
  const token = id.replace(/[^a-zA-Z0-9]/g, "").toUpperCase()
  const body = (token.slice(0, TASK_SHORT_ID_HEX_LENGTH) || "00000000").padEnd(TASK_SHORT_ID_HEX_LENGTH, "0")
  return `${TASK_SHORT_ID_PREFIX}${body}`
}

export function normalizeTaskRef(ref: string): string {
  return ref.trim().toUpperCase().replace(/^MKB-/, "")
}

export function taskRefMatches(taskId: string, ref: string): boolean {
  const needle = ref.trim()
  if (!needle) return false
  if (taskId.toLowerCase() === needle.toLowerCase()) return true

  const short = taskShortId(taskId)
  const normalized = needle.toUpperCase()
  if (short === normalized) return true

  const body = normalizeTaskRef(needle)
  const shortBody = short.slice(TASK_SHORT_ID_PREFIX.length)
  return body.length >= 4 && body.length <= TASK_SHORT_ID_HEX_LENGTH && shortBody.startsWith(body)
}

export function findTasksByRef<T extends { id: string }>(tasks: T[], ref: string): T[] {
  return tasks.filter((task) => taskRefMatches(task.id, ref))
}
