import { NextResponse } from "next/server"
import {
  addTask,
  deleteTask,
  ensureDefaultBoard,
  getTaskById,
  moveTask,
  updateTask,
} from "@/lib/actions/boards"
import { requireOpsSession } from "@/lib/auth/session"
import { fingerprintProcessDatabase } from "@/lib/db/fingerprint"
import { OPS_COLUMN_TITLES } from "@/lib/db/ops-defaults"
import {
  DONE_COLUMN_TITLE,
  findActiveTaskByTitle,
  findActiveTasksByTitle,
  normalizeOpsTitle,
} from "@/lib/mcp/lookup"
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
  const message = error instanceof Error ? error.message : "Request failed"
  if (message === "Unauthorized") {
    return unauthorizedJson()
  }
  if (/not found/i.test(message)) {
    return NextResponse.json({ error: message }, { status: 404 })
  }
  if (/required/i.test(message)) {
    return NextResponse.json({ error: message }, { status: 400 })
  }
  return NextResponse.json({ error: message }, { status: 500 })
}

export async function requireOpsApi() {
  await requireOpsSession()
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

  const board = await ensureDefaultBoard()
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
      throw new Error("Task not found")
    }
    return serializeOpsTask(task)
  }

  const board = await ensureDefaultBoard()
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
  const board = await ensureDefaultBoard()
  return {
    board: serializeOpsBoard(board),
    diagnostics: buildOpsDiagnostics(board),
  }
}

export async function getOpsDiagnosticsPayload() {
  await requireOpsApi()
  const board = await ensureDefaultBoard()
  return { diagnostics: buildOpsDiagnostics(board) }
}

export async function createOpsTask(input: {
  title: string
  columnTitle?: string
  labels?: string[]
  brief?: string
  description?: string
}) {
  await requireOpsApi()
  const title = input.title.trim()
  if (!title) {
    throw new Error("Title is required")
  }

  const board = await ensureDefaultBoard()
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

  const labels = projectLabelsForTask({ title, labels: input.labels })

  const task = await addTask(board.id, column.id, {
    title,
    description: input.description ?? "",
    brief: input.brief ?? "",
    labels,
    columnId: column.id,
    boardId: board.id,
  })
  if (!task) {
    throw new Error("Failed to create task")
  }

  return { task: serializeOpsTask(task), columnId: column.id, skipped: false as const }
}

export async function moveOpsTask(
  taskId: string,
  input: { columnId?: string; columnTitle?: string; position?: number; beforeTaskId?: string | null },
) {
  await requireOpsApi()
  if (!input.columnId && !input.columnTitle?.trim()) {
    throw new Error("columnTitle or columnId is required")
  }

  const board = await ensureDefaultBoard()
  const task = (UUID_RE.test(taskId) ? await getTaskById(taskId) : null) ?? (await resolveTaskByIdRef(taskId))
  if (!task?.columnId) {
    throw new Error("Task not found")
  }

  const column = findOpsColumn(board, {
    columnId: input.columnId,
    columnTitle: input.columnTitle,
  })
  if (!column) {
    throw new Error("Column not found")
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

  await moveTask(board.id, task.columnId, task.id, column.id, destIndex)
  const updated = (await getTaskById(task.id)) ?? { ...task, columnId: column.id }
  return { task: serializeOpsTask(updated) }
}

export async function patchOpsTask(
  taskId: string,
  input: { title?: string; description?: string; brief?: string; labels?: string[] },
) {
  await requireOpsApi()
  const title = input.title?.trim()
  const hasTitle = typeof input.title === "string"
  const hasDescription = typeof input.description === "string"
  const hasBrief = typeof input.brief === "string"
  const hasLabels = Array.isArray(input.labels)
  if (!hasTitle && !hasDescription && !hasBrief && !hasLabels) {
    throw new Error("title, description, brief, or labels is required")
  }
  if (hasTitle && !title) {
    throw new Error("Title is required")
  }

  const board = await ensureDefaultBoard()
  const existing = await getTaskById(taskId)
  if (!existing?.columnId) {
    throw new Error("Task not found")
  }

  const nextTitle = hasTitle ? title! : existing.title
  const labels = hasLabels ? projectLabelsForTask({ title: nextTitle, labels: input.labels }) : undefined

  const result = await updateTask(board.id, existing.columnId, taskId, {
    ...(hasTitle ? { title } : {}),
    ...(hasDescription ? { description: input.description } : {}),
    ...(hasBrief ? { brief: input.brief } : {}),
    ...(hasLabels ? { labels } : {}),
  })
  if (!result.success) {
    throw new Error(result.error || "Task not found")
  }

  const updated = await getTaskById(taskId)
  if (!updated) {
    throw new Error("Task not found")
  }
  return { task: serializeOpsTask(updated) }
}

export async function completeOpsTask(taskId: string) {
  return moveOpsTask(taskId, { columnTitle: DONE_COLUMN_TITLE })
}

export async function archiveOpsTask(taskId: string) {
  await requireOpsApi()
  const board = await ensureDefaultBoard()
  const existing = await getTaskById(taskId)
  if (!existing?.columnId) {
    throw new Error("Task not found")
  }

  const result = await deleteTask(board.id, existing.columnId, taskId)
  if (!result.success || !result.removedTask) {
    throw new Error(result.error || "Task not found")
  }
  return { task: serializeOpsTask(result.removedTask) }
}
