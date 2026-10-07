import { NextResponse } from "next/server"
import {
  addTask,
  deleteTask,
  getActorOpsBoard,
  getBoard,
  getTaskById,
  moveTask,
  updateTask,
} from "@/lib/actions/boards"
import { requireActorTenant } from "@/lib/auth/session"
import { OpsAccessError } from "@/lib/ops/access"
import { fingerprintProcessDatabase } from "@/lib/db/fingerprint"
import { OPS_COLUMN_TITLES } from "@/lib/db/ops-defaults"
import { isCloseSubStatus } from "@/lib/close-sub-status"
import {
  DONE_COLUMN_TITLE,
  findActiveTaskByTitle,
  findActiveTasksByTitle,
  normalizeOpsTitle,
} from "@/lib/mcp/lookup"
import { requireTaskDescription } from "@/lib/task-description"
import { isDoneColumnTitle } from "@/lib/task-dates"
import type { OpsApiBoard, OpsApiTask, OpsBoardDiagnostics } from "@/lib/ops-board"
import { getTaskProject, upsertProjectLabel } from "@/lib/projects"
import { findTasksByRef, taskShortId } from "@/lib/task-short-id"
import { extractTasksFromBoard, type Board, type Column, type Task } from "@/lib/types"
import { sortByOrder } from "@/lib/kanban-dnd"

export const DEFAULT_OPS_COLUMN_TITLE = OPS_COLUMN_TITLES[0]

export type { OpsApiBoard, OpsApiColumn, OpsApiTask, OpsBoardDiagnostics } from "@/lib/ops-board"

export function serializeOpsTask(task: Task): OpsApiTask {
  return {
    id: task.id,
    shortId: taskShortId(task.id),
    title: task.title,
    description: task.description ?? "",
    brief: task.brief ?? "",
    labels: Array.isArray(task.labels) ? task.labels : [],
    order: task.order ?? 0,
    columnId: task.columnId ?? "",
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    completedAt: task.completedAt ?? null,
    closeSubStatus: task.closeSubStatus ?? null,
  }
}

export function serializeOpsBoard(board: Board): OpsApiBoard {
  const columns = board.columns.map((column) => ({
    id: column.id,
    title: column.title,
    order: column.order,
    tasks: (column.tasks || []).map((task) =>
      serializeOpsTask({ ...task, columnId: task.columnId || column.id }),
    ),
  }))
  const nestedTasks = columns.flatMap((column) => column.tasks)
  const fallbackTasks = extractTasksFromBoard(board).map(serializeOpsTask)
  const activeTasks = nestedTasks.length > 0 ? nestedTasks : fallbackTasks
  return {
    id: board.id,
    title: board.title,
    slug: board.slug ?? null,
    columns,
    activeTasks,
  }
}

export function buildOpsDiagnostics(board: Board): OpsBoardDiagnostics {
  const fingerprint = fingerprintProcessDatabase()
  return {
    taskCount: extractTasksFromBoard(board).length,
    boardId: board.id,
    boardSlug: board.slug ?? null,
    dbHostSuffix: fingerprint.dbHostSuffix,
    dbName: fingerprint.dbName,
  }
}

export function unauthorizedJson() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
}

export function opsApiError(error: unknown) {
  if (error instanceof OpsAccessError) {
    return NextResponse.json({ error: error.message }, { status: error.status })
  }
  const message = error instanceof Error ? error.message : "Request failed"
  if (message === "Unauthorized") {
    return unauthorizedJson()
  }
  if (message === "Forbidden") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  if (/not found/i.test(message)) {
    return NextResponse.json({ error: message }, { status: 404 })
  }
  if (/required|must be one of/i.test(message)) {
    return NextResponse.json({ error: message }, { status: 400 })
  }
  return NextResponse.json({ error: message }, { status: 500 })
}

export async function requireOpsApi() {
  await requireActorTenant()
}

async function actorBoard() {
  const board = await getActorOpsBoard()
  if (!board) throw new OpsAccessError(403)
  return board
}

export function findOpsColumn(
  board: Board,
  query: { columnId?: string; columnTitle?: string },
): Column | undefined {
  if (query.columnId) {
    return board.columns.find((column) => column.id === query.columnId)
  }
  if (query.columnTitle) {
    const needle = normalizeOpsTitle(query.columnTitle)
    return board.columns.find((column) => normalizeOpsTitle(column.title) === needle)
  }
  return undefined
}

export function projectLabelsForTask(input: { title: string; labels?: string[] }) {
  const inferred = getTaskProject({ title: input.title, labels: input.labels })
  return inferred ? upsertProjectLabel(input.labels ?? [], inferred.project) : input.labels ?? []
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

async function resolveTaskByIdRef(id: string): Promise<Task | null> {
  if (UUID_RE.test(id)) {
    try {
      const task = await getTaskById(id)
      if (task?.columnId) return task
    } catch {
      // Invalid or missing UUID — fall through to short-id scan.
    }
  }

  const board = await actorBoard()
  const matches = findTasksByRef(extractTasksFromBoard(board), id)
  if (matches.length > 1) {
    throw new Error("Multiple tasks match id")
  }
  return matches[0] ?? null
}

export async function resolveOpsTask(query: { id?: string; title?: string }): Promise<OpsApiTask> {
  await requireOpsApi()
  const id = query.id?.trim()
  const title = query.title?.trim()
  if (!id && !title) {
    throw new Error("id or title is required")
  }

  if (id) {
    const task = await resolveTaskByIdRef(id)
    if (!task?.columnId) {
      throw new OpsAccessError(403)
    }
    return serializeOpsTask(task)
  }

  const board = await actorBoard()
  const matches = findActiveTasksByTitle(extractTasksFromBoard(board), title ?? "")
  if (matches.length === 0) {
    throw new Error("Task not found")
  }
  if (matches.length > 1) {
    throw new Error("Multiple tasks match title")
  }
  return serializeOpsTask(matches[0])
}

export async function getOpsBoardPayload() {
  await requireOpsApi()
  const board = await getActorOpsBoard()
  if (!board) {
    const fingerprint = fingerprintProcessDatabase()
    return {
      board: serializeOpsBoard({
        id: "",
        title: "Ops",
        description: "",
        slug: "ops",
        columns: [],
        activeTasks: [],
        createdAt: new Date(0).toISOString(),
        updatedAt: new Date(0).toISOString(),
        createdBy: "",
        sharedWith: [],
      }),
      diagnostics: {
        taskCount: 0,
        boardId: "",
        boardSlug: null,
        dbHostSuffix: fingerprint.dbHostSuffix,
        dbName: fingerprint.dbName,
      },
    }
  }
  return {
    board: serializeOpsBoard(board),
    diagnostics: buildOpsDiagnostics(board),
  }
}

export async function getOpsDiagnosticsPayload() {
  const payload = await getOpsBoardPayload()
  return { diagnostics: payload.diagnostics }
}

/** Reject a client board id that is not in the verified tenant. Hints are not authority. */
export async function assertOwnedBoard(boardId: string | null | undefined) {
  if (!boardId?.trim()) return
  await getBoard(boardId.trim())
}

export async function createOpsTask(input: {
  title: string
  columnTitle?: string
  labels?: string[]
  brief?: string
  description?: string
  closeSubStatus?: string | null
}) {
  await requireOpsApi()
  const title = input.title.trim()
  if (!title) {
    throw new Error("Title is required")
  }

  const board = await actorBoard()
  const existing = findActiveTaskByTitle(extractTasksFromBoard(board), title)
  if (existing) {
    return {
      task: serializeOpsTask(existing),
      columnId: existing.columnId ?? "",
      skipped: true as const,
    }
  }

  const column = findOpsColumn(board, {
    columnTitle: input.columnTitle?.trim() || DEFAULT_OPS_COLUMN_TITLE,
  })
  if (!column) {
    throw new Error("Column not found")
  }

  const description = requireTaskDescription(input.description)
  const labels = projectLabelsForTask({ title, labels: input.labels })

  const task = await addTask(board.id, column.id, {
    title,
    description,
    brief: input.brief ?? "",
    labels,
    columnId: column.id,
    boardId: board.id,
    closeSubStatus: input.closeSubStatus,
  })
  if (!task) {
    throw new Error("Failed to create task")
  }

  return { task: serializeOpsTask(task), columnId: column.id, skipped: false as const }
}

export async function moveOpsTask(
  taskId: string,
  input: {
    columnId?: string
    columnTitle?: string
    position?: number
    beforeTaskId?: string | null
    closeSubStatus?: string | null
  },
) {
  await requireOpsApi()
  if (!input.columnId && !input.columnTitle?.trim()) {
    throw new Error("columnTitle or columnId is required")
  }

  const board = await actorBoard()
  const task = (UUID_RE.test(taskId) ? await getTaskById(taskId) : null) ?? (await resolveTaskByIdRef(taskId))
  if (!task?.columnId) {
    throw new OpsAccessError(403)
  }

  const column = findOpsColumn(board, {
    columnId: input.columnId,
    columnTitle: input.columnTitle,
  })
  if (!column) {
    throw new OpsAccessError(403)
  }

  let destIndex = Number.MAX_SAFE_INTEGER
  if (typeof input.position === "number" && Number.isFinite(input.position)) {
    destIndex = Math.max(0, Math.floor(input.position))
  } else if (input.beforeTaskId) {
    const dest = sortByOrder(
      extractTasksFromBoard(board).filter((item) => String(item.columnId) === column.id && item.id !== task.id),
    )
    const index = dest.findIndex((item) => item.id === input.beforeTaskId)
    destIndex = index >= 0 ? index : dest.length
  }

  await moveTask(board.id, task.columnId, task.id, column.id, destIndex, {
    closeSubStatus: input.closeSubStatus,
  })
  const updated = (await getTaskById(task.id)) ?? {
    ...task,
    columnId: column.id,
    closeSubStatus: input.closeSubStatus ?? task.closeSubStatus ?? null,
  }
  return { task: serializeOpsTask(updated) }
}

export async function patchOpsTask(
  taskId: string,
  input: {
    title?: string
    description?: string
    brief?: string
    labels?: string[]
    closeSubStatus?: string | null
  },
) {
  await requireOpsApi()
  const title = input.title?.trim()
  const hasTitle = typeof input.title === "string"
  const hasDescription = typeof input.description === "string"
  const hasBrief = typeof input.brief === "string"
  const hasLabels = Array.isArray(input.labels)
  const hasCloseSubStatus = input.closeSubStatus !== undefined
  if (!hasTitle && !hasDescription && !hasBrief && !hasLabels && !hasCloseSubStatus) {
    throw new Error("title, description, brief, labels, or closeSubStatus is required")
  }
  if (hasTitle && !title) {
    throw new Error("Title is required")
  }
  if (hasDescription) {
    requireTaskDescription(input.description)
  }
  if (hasCloseSubStatus && input.closeSubStatus !== null && !isCloseSubStatus(input.closeSubStatus)) {
    throw new Error("closeSubStatus must be one of: Closed, No Longer Needed, Duplicate")
  }

  const board = await actorBoard()
  const existing = await getTaskById(taskId)
  if (!existing?.columnId) {
    throw new OpsAccessError(403)
  }

  const nextTitle = hasTitle ? title! : existing.title
  const labels = hasLabels ? projectLabelsForTask({ title: nextTitle, labels: input.labels }) : undefined
  if (hasCloseSubStatus && input.closeSubStatus) {
    const column = findOpsColumn(board, { columnId: existing.columnId })
    if (!isDoneColumnTitle(column?.title)) {
      throw new Error("closeSubStatus is required only after the task is in Done. Move it to Done with closeSubStatus.")
    }
  }

  const result = await updateTask(board.id, existing.columnId, taskId, {
    ...(hasTitle ? { title } : {}),
    ...(hasDescription ? { description: input.description } : {}),
    ...(hasBrief ? { brief: input.brief } : {}),
    ...(hasLabels ? { labels } : {}),
    ...(hasCloseSubStatus ? { closeSubStatus: input.closeSubStatus } : {}),
  })
  if (!result.success) {
    throw new Error(result.error || "Forbidden")
  }

  const updated = await getTaskById(taskId)
  if (!updated) {
    throw new OpsAccessError(403)
  }
  return { task: serializeOpsTask(updated) }
}

export async function completeOpsTask(taskId: string, closeSubStatus: string) {
  return moveOpsTask(taskId, { columnTitle: DONE_COLUMN_TITLE, closeSubStatus })
}

export async function archiveOpsTask(taskId: string) {
  await requireOpsApi()
  const board = await actorBoard()
  const existing = await getTaskById(taskId)
  if (!existing?.columnId) {
    throw new OpsAccessError(403)
  }

  const result = await deleteTask(board.id, existing.columnId, taskId)
  if (!result.success || !result.removedTask) {
    throw new Error("Task not found")
  }
  return { task: serializeOpsTask(result.removedTask) }
}
