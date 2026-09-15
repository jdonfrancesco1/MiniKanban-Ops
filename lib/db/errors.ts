export function isMissingRelationColumnError(error: unknown, column: string) {
  const message = error instanceof Error ? error.message : String(error ?? "")
  const needle = column.toLowerCase()
  return /column/i.test(message) && message.toLowerCase().includes(needle) && /does not exist/i.test(message)
}
