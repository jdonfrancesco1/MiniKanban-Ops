const DEFAULT_BOARD_SLUG = "ops"
const OPS_COLUMN_TITLES = ["Need you", "I'm on", "Waiting", "Done"] as const

const FALSE_ARCHIVE_MS = 2_000

export type ReconcileBoard = {
  id: string
  title: string
  slug?: string | null
  updatedAt?: Date | string | null
  taskCount: number
}

export type ReconcileColumn = {
  id: string
  title: string
  boardId?: string
  order?: number
}

export type ReconcileTask = {
  id: string
  boardId: string
  columnId: string
  archivedAt?: Date | string | null
  createdAt?: Date | string | null
}

export function toEpochMs(value: Date | string | number | null | undefined) {
  if (value == null) return null
  if (typeof value === "number") return Number.isFinite(value) ? value : null
  const ms = value instanceof Date ? value.getTime() : new Date(value).getTime()
  return Number.isFinite(ms) ? ms : null
}

/** `archived_at DEFAULT now()` makes every insert look archived. Treat insert-time stamps as live. */
export function isFalseArchive(
  archivedAt: Date | string | number | null | undefined,
  createdAt: Date | string | number | null | undefined,
) {
  const archivedMs = toEpochMs(archivedAt)
  if (archivedMs == null) return false
  const createdMs = toEpochMs(createdAt)
  if (createdMs == null) return false
  return Math.abs(archivedMs - createdMs) < FALSE_ARCHIVE_MS
}

export function isTaskHiddenAsArchived(
  archivedAt: Date | string | number | null | undefined,
  createdAt: Date | string | number | null | undefined,
) {
  if (archivedAt == null || archivedAt === "") return false
  return !isFalseArchive(archivedAt, createdAt)
}

export function normalizeColumnTitle(title: string) {
  return title.trim().toLowerCase()
}

export function pickCanonicalOpsBoard<T extends ReconcileBoard>(boards: T[]): T | null {
  if (boards.length === 0) return null

  const bySlug = boards.find((board) => board.slug === DEFAULT_BOARD_SLUG)
  if (bySlug && bySlug.taskCount > 0) return bySlug

  const richest = [...boards].sort((a, b) => {
    if (b.taskCount !== a.taskCount) return b.taskCount - a.taskCount
    const aMs = toEpochMs(a.updatedAt) ?? 0
    const bMs = toEpochMs(b.updatedAt) ?? 0
    return bMs - aMs
  })[0]

  if (richest && richest.taskCount > 0) return richest

  if (bySlug) return bySlug

  const byTitle = boards.find((board) => normalizeColumnTitle(board.title) === "ops")
  return byTitle ?? boards[0]
}

export function mapTaskToOpsColumn(input: {
  task: ReconcileTask
  opsBoardId: string
  opsColumns: ReconcileColumn[]
  columnById: Map<string, ReconcileColumn>
}) {
  const fallback = [...input.opsColumns].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))[0]
  if (!fallback) return null

  const opsIds = new Set(input.opsColumns.map((column) => String(column.id)))
  const currentId = String(input.task.columnId)
  if (input.task.boardId === input.opsBoardId && opsIds.has(currentId)) {
    return { columnId: currentId, repaired: false }
  }

  const sourceColumn = input.columnById.get(currentId)
  const titleMatch = sourceColumn
    ? input.opsColumns.find(
        (column) => normalizeColumnTitle(column.title) === normalizeColumnTitle(sourceColumn.title),
      )
    : undefined

  return { columnId: titleMatch?.id ?? fallback.id, repaired: true }
}

export type TaskPlacement = {
  taskId: string
  boardId: string
  columnId: string
  archivedAt: Date | string | null
  clearArchive: boolean
  move: boolean
}

export function planOpsTaskPlacements(input: {
  opsBoardId: string
  opsColumns: ReconcileColumn[]
  columns: ReconcileColumn[]
  tasks: ReconcileTask[]
  adoptForeignTasks: boolean
}): TaskPlacement[] {
  const columnById = new Map(input.columns.map((column) => [String(column.id), column]))
  const placements: TaskPlacement[] = []

  for (const task of input.tasks) {
    const onOps = task.boardId === input.opsBoardId
    if (!onOps && !input.adoptForeignTasks) continue

    const mapped = mapTaskToOpsColumn({
      task,
      opsBoardId: input.opsBoardId,
      opsColumns: input.opsColumns,
      columnById,
    })
    if (!mapped) continue

    const clearArchive = isFalseArchive(task.archivedAt, task.createdAt)
    const move = mapped.repaired || !onOps
    if (!move && !clearArchive) continue

    placements.push({
      taskId: task.id,
      boardId: input.opsBoardId,
      columnId: mapped.columnId,
      archivedAt: task.archivedAt ?? null,
      clearArchive,
      move,
    })
  }

  return placements
}

export function missingOpsColumnTitles(existingTitles: string[]) {
  const have = new Set(existingTitles.map(normalizeColumnTitle))
  return OPS_COLUMN_TITLES.filter((title) => !have.has(normalizeColumnTitle(title)))
}
