import { NextResponse } from "next/server"
import {
  addTask,
  ensureDefaultBoard,
  getTaskById,
  moveTask,
  updateTask,
} from "@/lib/actions/boards"
import { requireOpsSession } from "@/lib/auth/session"
import { OPS_COLUMN_TITLES } from "@/lib/db/ops-defaults"
import { getTaskProject, upsertProjectLabel } from "@/lib/projects"
import type { Board, Column, Task } from "@/lib/types"

export const DEFAULT_OPS_COLUMN_TITLE = OPS_COLUMN_TITLES[0]

export type OpsApiTask = {
  id: string
  title: string
  description: string
  labels: string[]
  order: number
  columnId: string
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
}

export function serializeOpsTask(task: Task): OpsApiTask {
  return {
    id: task.id,
    title: task.title,
    description: task.description ?? "",
    labels: Array.isArray(task.labels) ? task.labels : [],
    order: task.order ?? 0,
    columnId: task.columnId ?? "",
  }
}

export function serializeOpsBoard(board: Board): OpsApiBoard {
  return {
    id: board.id,
    title: board.title,
    slug: board.slug ?? null,
    columns: board.columns.map((column) => ({
      id: column.id,
      title: column.title,
      order: column.order,
      tasks: column.tasks.map(serializeOpsTask),
    })),
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

function normalizeTitle(value: string) {
  return value.trim().toLowerCase()
}

export function findOpsColumn(
  board: Board,
  query: { columnId?: string; columnTitle?: string },
): Column | undefined {
  if (query.columnId) {
    return board.columns.find((column) => column.id === query.columnId)
  }
  if (query.columnTitle) {
    const needle = normalizeTitle(query.columnTitle)
    return board.columns.find((column) => normalizeTitle(column.title) === needle)
  }
  return undefined
}

export async function getOpsBoardPayload() {
  await requireOpsApi()
  const board = await ensureDefaultBoard()
  return { board: serializeOpsBoard(board) }
}

export async function createOpsTask(input: { title: string; columnTitle?: string; labels?: string[] }) {
  await requireOpsApi()
  const title = input.title.trim()
  if (!title) {
    throw new Error("Title is required")
  }

  const board = await ensureDefaultBoard()
  const column = findOpsColumn(board, {
    columnTitle: input.columnTitle?.trim() || DEFAULT_OPS_COLUMN_TITLE,
  })
  if (!column) {
    throw new Error("Column not found")
  }

  const inferred = getTaskProject({ title, labels: input.labels })
  const labels = inferred ? upsertProjectLabel(input.labels ?? [], inferred.project) : input.labels ?? []

  const task = await addTask(board.id, column.id, {
    title,
    description: "",
    labels,
    columnId: column.id,
    boardId: board.id,
  })
  if (!task) {
    throw new Error("Failed to create task")
  }

  return { task: serializeOpsTask(task), columnId: column.id }
}

export async function moveOpsTask(
  taskId: string,
  input: { columnId?: string; columnTitle?: string },
) {
  await requireOpsApi()
  if (!input.columnId && !input.columnTitle?.trim()) {
    throw new Error("columnTitle or columnId is required")
  }

  const board = await ensureDefaultBoard()
  const task = await getTaskById(taskId)
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

  await moveTask(board.id, task.columnId, task.id, column.id, Number.MAX_SAFE_INTEGER)
  const updated = (await getTaskById(taskId)) ?? { ...task, columnId: column.id }
  return { task: serializeOpsTask(updated) }
}

export async function patchOpsTask(
  taskId: string,
  input: { title?: string; description?: string },
) {
  await requireOpsApi()
  const title = input.title?.trim()
  const hasTitle = typeof input.title === "string"
  const hasDescription = typeof input.description === "string"
  if (!hasTitle && !hasDescription) {
    throw new Error("title or description is required")
  }
  if (hasTitle && !title) {
    throw new Error("Title is required")
  }

  const board = await ensureDefaultBoard()
  const existing = await getTaskById(taskId)
  if (!existing?.columnId) {
    throw new Error("Task not found")
  }

  const result = await updateTask(board.id, existing.columnId, taskId, {
    ...(hasTitle ? { title } : {}),
    ...(hasDescription ? { description: input.description } : {}),
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
