export type StickerPosition = {
  x: number
  y: number
}

export type PlacedSticker = {
  id: string
  stickerId: string
  url: string
  position: StickerPosition
  color?: string
}

export type Task = {
  id: string
  title: string
  description: string
  /** 1–2 line card-face summary. Full ask lives in `description`. */
  brief?: string | null
  labels: string[]
  stickers?: PlacedSticker[]
  createdAt?: string
  updatedAt?: string
  /** Set when the card enters Done; cleared if it leaves Done. */
  completedAt?: string | null
  createdBy?: string
  archivedAt?: number
  columnId?: string
  boardId?: string
  order?: number
}

export type Column = {
  id: string
  title: string
  tasks: Task[]
  /** Primitive ids survive Flight when nested `tasks` objects are dropped. */
  taskIds?: string[]
  order: number
  stickers?: PlacedSticker[]
}

export type Board = {
  id: string
  title: string
  description?: string
  slug?: string | null
  columns: Column[]
  /** Flat active cards. Prefer this if nested `column.tasks` is missing after serialization. */
  activeTasks?: Task[]
  /** JSON string of active cards. Last-resort Flight-safe payload (a string is not dropped). */
  tasksJson?: string
  createdAt: string
  updatedAt: string
  createdBy: string
  sharedWith: string[]
  archivedTasks?: Task[]
  stickers?: PlacedSticker[]
}

export type BoardSummary = {
  id: string
  title: string
  updatedAt: string
  tasks: number
  slug?: string | null
}

function isTaskLike(value: unknown): value is Task {
  return Boolean(value && typeof value === "object" && typeof (value as Task).id === "string")
}

function parseTasksJson(value: unknown): Task[] {
  if (typeof value !== "string" || !value.trim()) return []
  try {
    const parsed = JSON.parse(value) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isTaskLike)
  } catch {
    return []
  }
}

function withBoardContext(task: Task, board: Board, columnId?: string): Task {
  return {
    ...task,
    columnId: String(task.columnId || columnId || ""),
    boardId: String(task.boardId || board.id),
  }
}

function stampColumnIdsFromTaskIds(board: Board, tasks: Task[]): Task[] {
  if (tasks.length === 0) return tasks
  const byId = new Map(tasks.map((task) => [task.id, { ...task }]))
  for (const column of board.columns || []) {
    for (const taskId of column.taskIds || []) {
      const task = byId.get(taskId)
      if (task && !task.columnId) {
        task.columnId = column.id
      }
    }
  }
  return [...byId.values()]
}

export function extractTasksFromBoard(board: Board | null | undefined): Task[] {
  if (!board) return []

  const fromColumns =
    board.columns?.reduce((acc, column) => {
      const tasksWithContext = (column.tasks || []).map((task) => withBoardContext(task, board, column.id))
      return acc.concat(tasksWithContext)
    }, [] as Task[]) ?? []

  if (fromColumns.length > 0) return fromColumns

  const fromActive = stampColumnIdsFromTaskIds(
    board,
    (board.activeTasks || []).map((task) => withBoardContext(task, board)),
  )
  if (fromActive.length > 0) return fromActive

  return stampColumnIdsFromTaskIds(
    board,
    parseTasksJson(board.tasksJson).map((task) => withBoardContext(task, board)),
  )
}

/** Flatten tasks so clients can recover after Flight drops nested `column.tasks`. */
export function toFlightSafeBoard(board: Board): Board {
  const activeTasks = extractTasksFromBoard(board)
  return {
    ...board,
    activeTasks,
    tasksJson: JSON.stringify(activeTasks),
    columns: (board.columns || []).map((column) => {
      const columnTasks = activeTasks.filter((task) => String(task.columnId) === String(column.id))
      return {
        ...column,
        tasks: columnTasks,
        taskIds: columnTasks.map((task) => task.id),
      }
    }),
  }
}

export const OPS_BOARD_SLUG = "ops"

export type OpsBoardDiagnostics = {
  taskCount: number
  boardId: string
  boardSlug: string | null
  dbHostSuffix: string
  dbName: string
}

export type OpsApiTask = {
  id: string
  title: string
  description: string
  brief?: string | null
  labels: string[]
  order: number
  columnId: string
  createdAt?: string
  updatedAt?: string
  completedAt?: string | null
}

export type OpsApiColumn = {
  id: string
  title: string
  order: number
  tasks: OpsApiTask[]
}

export type OpsApiBoard = {
  id: string
  title: string
  slug: string | null
  columns: OpsApiColumn[]
  activeTasks?: OpsApiTask[]
}

export type OpsApiBoardPayload = {
  board?: OpsApiBoard
  diagnostics?: OpsBoardDiagnostics
}

export function isOpsBoardRoute(boardId: string, slug?: string | null) {
  return boardId === OPS_BOARD_SLUG || slug === OPS_BOARD_SLUG
}

export function shouldPreferOpsJsonApi(boardId: string, slug?: string | null) {
  return isOpsBoardRoute(boardId, slug)
}

function mapApiTask(task: OpsApiTask, columnId: string, boardId: string): Task {
  return {
    id: String(task.id),
    title: task.title,
    description: task.description ?? "",
    brief: task.brief ?? "",
    labels: Array.isArray(task.labels) ? task.labels : [],
    order: task.order ?? 0,
    columnId: String(task.columnId || columnId),
    boardId,
    stickers: [],
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    completedAt: task.completedAt ?? null,
  }
}

function emptyShell(api: OpsApiBoard, columns: Column[]): Board {
  return {
    id: String(api.id),
    title: api.title,
    slug: api.slug,
    columns,
    createdAt: "",
    updatedAt: "",
    createdBy: "ops",
    sharedWith: [],
  }
}

export function hydrateOpsApiBoard(api: OpsApiBoard): Board {
  const boardId = String(api.id)
  const columns: Column[] = (api.columns || []).map((column) => {
    const columnId = String(column.id)
    const nested = (column.tasks || []).map((task) => mapApiTask(task, columnId, boardId))
    return {
      id: columnId,
      title: column.title,
      order: column.order,
      tasks: nested,
      taskIds: nested.map((task) => task.id),
      stickers: [],
    }
  })

  const nestedTasks = extractTasksFromBoard(emptyShell(api, columns))
  const flatTasks = (api.activeTasks || []).map((task) => mapApiTask(task, String(task.columnId || ""), boardId))
  const activeTasks = nestedTasks.length > 0 ? nestedTasks : flatTasks

  const columnsWithTasks =
    nestedTasks.length > 0
      ? columns
      : columns.map((column) => {
          const tasks = activeTasks.filter((task) => task.columnId === column.id)
          return { ...column, tasks, taskIds: tasks.map((task) => task.id) }
        })

  return toFlightSafeBoard({
    ...emptyShell(api, columnsWithTasks),
    description: "",
    activeTasks,
    archivedTasks: [],
    stickers: [],
  })
}

export function pickBoardWithTasks(
  apiBoard: Board | null,
  serverBoard: Board | null,
): { board: Board | null; source: "api" | "server" | "none" } {
  const apiCount = apiBoard ? extractTasksFromBoard(apiBoard).length : 0
  if (apiBoard && apiCount > 0) {
    return { board: toFlightSafeBoard(apiBoard), source: "api" }
  }

  const serverCount = serverBoard ? extractTasksFromBoard(serverBoard).length : 0
  if (serverBoard && serverCount > 0) {
    return { board: toFlightSafeBoard(serverBoard), source: "server" }
  }

  if (apiBoard) return { board: toFlightSafeBoard(apiBoard), source: "api" }
  if (serverBoard) return { board: toFlightSafeBoard(serverBoard), source: "server" }
  return { board: null, source: "none" }
}
