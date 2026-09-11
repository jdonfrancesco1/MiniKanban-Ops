"use server"

import { and, asc, eq, isNotNull, isNull, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { boards, columns, tasks, type ColumnRow, type TaskRow } from "@/lib/db/schema"
import {
  DEFAULT_BOARD_DESCRIPTION,
  DEFAULT_BOARD_SLUG,
  DEFAULT_BOARD_TITLE,
  OPS_COLUMN_TITLES,
} from "@/lib/db/ops-defaults"
import { requireOpsSession } from "@/lib/auth/session"
import type { Board, BoardSummary, Column, Task } from "@/lib/types"

function now() {
  return new Date()
}

function toIso(value: Date | string | null | undefined) {
  if (!value) return undefined
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString()
}

function mapTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? "",
    labels: Array.isArray(row.labels) ? row.labels : [],
    stickers: [],
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
    createdBy: "ops",
    archivedAt: row.archivedAt ? row.archivedAt.getTime() : undefined,
    columnId: row.columnId,
    boardId: row.boardId,
    order: row.order,
  }
}

async function loadBoard(boardId: string): Promise<Board | null> {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    boardId,
  )

  const [board] = await db
    .select()
    .from(boards)
    .where(isUuid ? eq(boards.id, boardId) : eq(boards.slug, boardId))
    .limit(1)

  if (!board) return null

  const columnRows = await db
    .select()
    .from(columns)
    .where(eq(columns.boardId, board.id))
    .orderBy(asc(columns.order), asc(columns.createdAt))

  const taskRows = await db
    .select()
    .from(tasks)
    .where(eq(tasks.boardId, board.id))
    .orderBy(asc(tasks.order), asc(tasks.createdAt))

  const activeByColumn = new Map<string, Task[]>()
  const archivedTasks: Task[] = []

  for (const row of taskRows) {
    const mapped = mapTask(row)
    if (row.archivedAt) {
      archivedTasks.push(mapped)
      continue
    }
    const list = activeByColumn.get(row.columnId) ?? []
    list.push(mapped)
    activeByColumn.set(row.columnId, list)
  }

  const mappedColumns: Column[] = columnRows.map((column: ColumnRow) => ({
    id: column.id,
    title: column.title,
    order: column.order,
    tasks: activeByColumn.get(column.id) ?? [],
    stickers: [],
  }))

  return {
    id: board.id,
    title: board.title,
    description: board.description ?? "",
    slug: board.slug,
    columns: mappedColumns,
    createdAt: toIso(board.createdAt) ?? new Date().toISOString(),
    updatedAt: toIso(board.updatedAt) ?? new Date().toISOString(),
    createdBy: "ops",
    sharedWith: [],
    archivedTasks,
    stickers: [],
  }
}

async function insertOpsColumns(boardId: string) {
  if (OPS_COLUMN_TITLES.length === 0) return
  await db.insert(columns).values(
    OPS_COLUMN_TITLES.map((title, order) => ({
      boardId,
      title,
      order,
    })),
  )
}

async function touchBoard(boardId: string) {
  await db.update(boards).set({ updatedAt: now() }).where(eq(boards.id, boardId))
}

export async function ensureDefaultBoard(): Promise<Board> {
  await requireOpsSession()

  const [existing] = await db.select().from(boards).where(eq(boards.slug, DEFAULT_BOARD_SLUG)).limit(1)
  if (existing) {
    const board = await loadBoard(existing.id)
    if (board) return board
  }

  const [created] = await db
    .insert(boards)
    .values({
      title: DEFAULT_BOARD_TITLE,
      description: DEFAULT_BOARD_DESCRIPTION,
      slug: DEFAULT_BOARD_SLUG,
    })
    .returning()

  await insertOpsColumns(created.id)
  const board = await loadBoard(created.id)
  if (!board) {
    throw new Error("Failed to create the default ops board")
  }
  return board
}

export async function getBoard(boardId: string): Promise<Board> {
  await requireOpsSession()

  if (boardId === DEFAULT_BOARD_SLUG) {
    return ensureDefaultBoard()
  }

  const board = await loadBoard(boardId)
  if (!board) {
    throw new Error("Board not found")
  }
  return board
}

export async function getUserBoards(): Promise<BoardSummary[]> {
  await requireOpsSession()
  await ensureDefaultBoard()

  const rows = await db.select().from(boards).orderBy(sql`${boards.updatedAt} desc`)

  const counts = await db
    .select({
      boardId: tasks.boardId,
      count: sql<number>`count(*)::int`,
    })
    .from(tasks)
    .where(isNull(tasks.archivedAt))
    .groupBy(tasks.boardId)

  const countByBoard = new Map(counts.map((row) => [row.boardId, Number(row.count)]))

  return rows.map((board) => ({
    id: board.id,
    title: board.title,
    updatedAt: toIso(board.updatedAt) ?? new Date().toISOString(),
    tasks: countByBoard.get(board.id) ?? 0,
    slug: board.slug,
  }))
}

export async function createBoard(title: string, _useProjectPlanningTemplate = false) {
  await requireOpsSession()
  const trimmed = title.trim() || DEFAULT_BOARD_TITLE

  const [created] = await db
    .insert(boards)
    .values({
      title: trimmed,
      description: "",
    })
    .returning()

  await insertOpsColumns(created.id)

  return {
    id: created.id,
    title: created.title,
    updatedAt: toIso(created.updatedAt) ?? new Date().toISOString(),
    tasks: 0,
    slug: created.slug,
  }
}

export async function updateBoardTitle(boardId: string, title: string) {
  await requireOpsSession()
  await db
    .update(boards)
    .set({ title: title.trim(), updatedAt: now() })
    .where(eq(boards.id, boardId))
  return { success: true }
}

export async function updateBoardDescription(boardId: string, description: string) {
  await requireOpsSession()
  await db.update(boards).set({ description, updatedAt: now() }).where(eq(boards.id, boardId))
  return { success: true }
}

export async function updateBoardColumns(_boardId: string, _nextColumns: Column[]) {
  await requireOpsSession()
  return { success: true }
}

export async function deleteBoard(boardId: string) {
  await requireOpsSession()
  const [board] = await db.select().from(boards).where(eq(boards.id, boardId)).limit(1)
  if (board?.slug === DEFAULT_BOARD_SLUG) {
    return { success: false, error: "The default ops board cannot be deleted" }
  }
  await db.delete(boards).where(eq(boards.id, boardId))
  return { success: true }
}

export async function addColumn(boardId: string, title: string) {
  await requireOpsSession()
  const existing = await db
    .select({ order: columns.order })
    .from(columns)
    .where(eq(columns.boardId, boardId))
    .orderBy(asc(columns.order))

  const nextOrder = existing.length === 0 ? 0 : existing[existing.length - 1].order + 1
  const [created] = await db
    .insert(columns)
    .values({ boardId, title: title.trim() || "Column", order: nextOrder })
    .returning()

  await touchBoard(boardId)

  return {
    id: created.id,
    title: created.title,
    tasks: [],
    order: created.order,
    stickers: [],
  } satisfies Column
}

export async function updateColumnTitle(boardId: string, columnId: string, title: string) {
  await requireOpsSession()
  await db.update(columns).set({ title: title.trim() }).where(and(eq(columns.id, columnId), eq(columns.boardId, boardId)))
  await touchBoard(boardId)
  return { success: true }
}

export async function deleteColumn(boardId: string, columnId: string) {
  await requireOpsSession()
  const [removed] = await db
    .select()
    .from(columns)
    .where(and(eq(columns.id, columnId), eq(columns.boardId, boardId)))
    .limit(1)

  if (!removed) return { success: false, error: "Column not found" }

  const board = await loadBoard(boardId)
  const removedColumn = board?.columns.find((column) => column.id === columnId)

  await db.delete(columns).where(eq(columns.id, columnId))

  const remaining = await db
    .select()
    .from(columns)
    .where(eq(columns.boardId, boardId))
    .orderBy(asc(columns.order))

  for (const [index, column] of remaining.entries()) {
    if (column.order !== index) {
      await db.update(columns).set({ order: index }).where(eq(columns.id, column.id))
    }
  }

  await touchBoard(boardId)
  return { success: true, removedColumn }
}

export async function restoreColumn(boardId: string, column: Column) {
  await requireOpsSession()

  const [existing] = await db.select().from(columns).where(eq(columns.id, column.id)).limit(1)
  if (existing) {
    return { success: false, error: "Column already exists" }
  }

  await db.insert(columns).values({
    id: column.id,
    boardId,
    title: column.title,
    order: column.order,
  })

  for (const [index, task] of (column.tasks || []).entries()) {
    await db.insert(tasks).values({
      id: task.id,
      boardId,
      columnId: column.id,
      title: task.title,
      description: task.description ?? "",
      labels: task.labels ?? [],
      order: task.order ?? index,
      archivedAt: null,
    })
  }

  await touchBoard(boardId)
  return { success: true }
}

export async function addTask(
  boardId: string,
  columnId: string,
  task: Omit<Task, "id" | "createdAt" | "updatedAt" | "createdBy">,
) {
  await requireOpsSession()

  const [column] = await db
    .select()
    .from(columns)
    .where(and(eq(columns.id, columnId), eq(columns.boardId, boardId)))
    .limit(1)

  if (!column) return null

  const existing = await db
    .select({ order: tasks.order })
    .from(tasks)
    .where(and(eq(tasks.columnId, columnId), isNull(tasks.archivedAt)))
    .orderBy(asc(tasks.order))

  const nextOrder = existing.length === 0 ? 0 : existing[existing.length - 1].order + 1

  const [created] = await db
    .insert(tasks)
    .values({
      boardId,
      columnId,
      title: task.title.trim() || "Untitled",
      description: task.description ?? "",
      labels: task.labels ?? [],
      order: nextOrder,
    })
    .returning()

  await touchBoard(boardId)
  return mapTask(created)
}

export async function updateTask(
  boardId: string,
  columnId: string,
  taskId: string,
  updates: Partial<Omit<Task, "id" | "createdAt" | "createdBy" | "archivedAt">>,
) {
  await requireOpsSession()

  const [existing] = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.boardId, boardId)))
    .limit(1)

  if (!existing) return { success: false, error: "Task not found" }

  const nextColumnId = updates.columnId && updates.columnId !== existing.columnId ? updates.columnId : existing.columnId

  await db
    .update(tasks)
    .set({
      title: updates.title ?? existing.title,
      description: updates.description ?? existing.description,
      labels: updates.labels ?? existing.labels,
      columnId: nextColumnId,
      updatedAt: now(),
    })
    .where(eq(tasks.id, taskId))

  await touchBoard(boardId)
  void columnId
  return { success: true }
}

export async function deleteTask(boardId: string, columnId: string, taskId: string) {
  await requireOpsSession()

  const [existing] = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.boardId, boardId)))
    .limit(1)

  if (!existing) return { success: false, error: "Task not found" }

  const archivedAt = now()
  await db.update(tasks).set({ archivedAt, updatedAt: archivedAt }).where(eq(tasks.id, taskId))
  await touchBoard(boardId)

  return {
    success: true,
    removedTask: {
      ...mapTask({ ...existing, archivedAt }),
      columnId: existing.columnId || columnId,
    },
  }
}

export async function restoreTask(boardId: string, columnIdOrTaskId: string, task?: Task) {
  await requireOpsSession()

  const taskId = task?.id ?? columnIdOrTaskId
  const preferredColumnId = task?.columnId ?? (task ? columnIdOrTaskId : undefined)

  const [existing] = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.boardId, boardId)))
    .limit(1)

  if (!existing) {
    if (!task) return { success: false, error: "Task not found" }
    await db.insert(tasks).values({
      id: task.id,
      boardId,
      columnId: preferredColumnId || columnIdOrTaskId,
      title: task.title,
      description: task.description ?? "",
      labels: task.labels ?? [],
      order: task.order ?? 0,
      archivedAt: null,
    })
    await touchBoard(boardId)
    return { success: true }
  }

  let columnId = preferredColumnId || existing.columnId
  const [column] = await db
    .select()
    .from(columns)
    .where(and(eq(columns.id, columnId), eq(columns.boardId, boardId)))
    .limit(1)

  if (!column) {
    const fallback =
      (await db.select().from(columns).where(eq(columns.boardId, boardId)).orderBy(asc(columns.order)).limit(1))[0]
    if (!fallback) return { success: false, error: "No columns available" }
    columnId = fallback.id
  }

  await db
    .update(tasks)
    .set({ archivedAt: null, columnId, updatedAt: now() })
    .where(eq(tasks.id, taskId))
  await touchBoard(boardId)
  return { success: true }
}

export async function permanentlyDeleteTask(boardId: string, taskId: string) {
  await requireOpsSession()
  await db.delete(tasks).where(and(eq(tasks.id, taskId), eq(tasks.boardId, boardId), isNotNull(tasks.archivedAt)))
  await touchBoard(boardId)
  return { success: true }
}

export async function moveTask(
  boardId: string,
  sourceColumnId: string,
  taskId: string,
  destinationColumnId: string,
  targetPosition: number,
) {
  await requireOpsSession()

  const destTasks = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.columnId, destinationColumnId), isNull(tasks.archivedAt)))
    .orderBy(asc(tasks.order))

  const withoutMoved = destTasks.filter((task) => task.id !== taskId)
  const clamped = Math.max(0, Math.min(targetPosition, withoutMoved.length))
  withoutMoved.splice(clamped, 0, { id: taskId } as TaskRow)

  if (sourceColumnId !== destinationColumnId) {
    await db
      .update(tasks)
      .set({ columnId: destinationColumnId, updatedAt: now() })
      .where(and(eq(tasks.id, taskId), eq(tasks.boardId, boardId)))
  }

  for (const [index, task] of withoutMoved.entries()) {
    await db.update(tasks).set({ order: index, updatedAt: now() }).where(eq(tasks.id, task.id))
  }

  if (sourceColumnId !== destinationColumnId) {
    const sourceTasks = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.columnId, sourceColumnId), isNull(tasks.archivedAt)))
      .orderBy(asc(tasks.order))

    for (const [index, task] of sourceTasks.entries()) {
      await db.update(tasks).set({ order: index }).where(eq(tasks.id, task.id))
    }
  }

  await touchBoard(boardId)
  return { success: true }
}

export async function updateColumnOrder(boardId: string, columnIds: string[]) {
  await requireOpsSession()
  for (const [index, columnId] of columnIds.entries()) {
    await db
      .update(columns)
      .set({ order: index })
      .where(and(eq(columns.id, columnId), eq(columns.boardId, boardId)))
  }
  await touchBoard(boardId)
  return { success: true }
}

export async function updateTaskOrder(boardId: string, columnId: string, taskIds: string[]) {
  await requireOpsSession()
  for (const [index, taskId] of taskIds.entries()) {
    await db
      .update(tasks)
      .set({ order: index, updatedAt: now() })
      .where(and(eq(tasks.id, taskId), eq(tasks.columnId, columnId), eq(tasks.boardId, boardId)))
  }
  await touchBoard(boardId)
  return { success: true }
}

export async function shareBoard(_boardId: string, _userPhone: string) {
  await requireOpsSession()
  return {
    success: false,
    message: "Sharing is disabled on this single-user ops board.",
  }
}

export async function removeUserFromBoard(_boardId: string, _userId: string) {
  await requireOpsSession()
  return { success: true }
}
