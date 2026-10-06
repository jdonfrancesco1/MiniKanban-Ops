"use server"

import { and, asc, eq, isNotNull, isNull, ne, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { boards, columns, tasks, type ColumnRow, type TaskRow } from "@/lib/db/schema"
import { ensureFleetTenantColumns } from "@/lib/db/fleet-tenant"
import {
  DEFAULT_BOARD_DESCRIPTION,
  DEFAULT_BOARD_SLUG,
  DEFAULT_BOARD_TITLE,
  FLEET_TENANT_ID,
  OPS_COLUMN_TITLES,
} from "@/lib/db/ops-defaults"
import {
  isTaskHiddenAsArchived,
  missingOpsColumnTitles,
  pickCanonicalOpsBoard,
  planOpsTaskPlacements,
} from "@/lib/db/reconcile-ops"
import { planGiantSmokeBackfill } from "@/lib/card-copy"
import { requireActorTenant } from "@/lib/auth/session"
import { isMissingRelationColumnError } from "@/lib/db/errors"
import { OpsAccessError, sameTenant } from "@/lib/ops/access"
import { isCloseSubStatus, nextCloseSubStatus } from "@/lib/close-sub-status"
import { descriptionIsMissing } from "@/lib/task-description"
import { isDoneColumnTitle, nextCompletedAt } from "@/lib/task-dates"
import { toFlightSafeBoard, type Board, type BoardSummary, type Column, type Task } from "@/lib/types"

function now() {
  return new Date()
}

function toIso(value: Date | string | null | undefined) {
  if (!value) return undefined
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString()
}

function asDate(value: Date | string | null | undefined) {
  if (!value) return null
  return value instanceof Date ? value : new Date(value)
}

function mapLabels(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((label): label is string => typeof label === "string" && label.trim().length > 0)
  }
  if (typeof value === "string" && value.trim()) {
    try {
      return mapLabels(JSON.parse(value))
    } catch {
      return [value]
    }
  }
  return []
}

function toPlainBoard(board: Board): Board {
  return JSON.parse(JSON.stringify(toFlightSafeBoard(board))) as Board
}

function mapTask(row: TaskRow): Task {
  const archivedAt = asDate(row.archivedAt)
  const hidden = isTaskHiddenAsArchived(row.archivedAt, row.createdAt)
  return {
    id: String(row.id),
    title: row.title,
    description: row.description ?? "",
    brief: row.brief ?? "",
    labels: mapLabels(row.labels),
    stickers: [],
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
    completedAt: toIso(row.completedAt) ?? null,
    closeSubStatus: row.closeSubStatus ?? null,
    createdBy: "ops",
    archivedAt: hidden && archivedAt ? archivedAt.getTime() : undefined,
    columnId: String(row.columnId),
    boardId: String(row.boardId),
    order: row.order,
  }
}

async function loadBoard(boardId: string, tenantId: string): Promise<Board | null> {
  await ensureFleetTenantColumns()
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(boardId)

  const [board] = await db
    .select()
    .from(boards)
    .where(and(eq(boards.tenantId, tenantId), isUuid ? eq(boards.id, boardId) : eq(boards.slug, boardId)))
    .limit(1)

  if (!board || !sameTenant(tenantId, board.tenantId)) return null

  const columnRows = await db
    .select()
    .from(columns)
    .where(and(eq(columns.boardId, board.id), eq(columns.tenantId, tenantId)))
    .orderBy(asc(columns.order), asc(columns.createdAt))

  const taskRows = await withTaskSchemaColumns(() =>
    db
      .select()
      .from(tasks)
      .where(and(eq(tasks.boardId, board.id), eq(tasks.tenantId, tenantId)))
      .orderBy(asc(tasks.order), asc(tasks.createdAt)),
  )

  const columnIds = new Set(columnRows.map((column) => String(column.id)))
  const fallbackColumnId = columnRows[0] ? String(columnRows[0].id) : null
  const activeByColumn = new Map<string, Task[]>()
  const archivedTasks: Task[] = []
  const orphaned: TaskRow[] = []

  for (const row of taskRows) {
    const mapped = mapTask(row)
    if (isTaskHiddenAsArchived(row.archivedAt, row.createdAt)) {
      archivedTasks.push(mapped)
      continue
    }
    const columnId = String(row.columnId)
    if (!columnIds.has(columnId)) {
      orphaned.push(row)
      continue
    }
    const list = activeByColumn.get(columnId) ?? []
    list.push(mapped)
    activeByColumn.set(columnId, list)
  }

  if (fallbackColumnId && orphaned.length > 0) {
    const startOrder = activeByColumn.get(fallbackColumnId)?.length ?? 0
    for (const [index, row] of orphaned.entries()) {
      await db
        .update(tasks)
        .set({ columnId: fallbackColumnId, updatedAt: now() })
        .where(and(eq(tasks.id, row.id), eq(tasks.tenantId, tenantId)))
      const remapped = mapTask({ ...row, columnId: fallbackColumnId })
      remapped.columnId = fallbackColumnId
      remapped.order = startOrder + index
      const list = activeByColumn.get(fallbackColumnId) ?? []
      list.push(remapped)
      activeByColumn.set(fallbackColumnId, list)
    }
    console.info("[ops] rehomed orphaned tasks", {
      boardId: board.id,
      count: orphaned.length,
      columnId: fallbackColumnId,
    })
  }

  const mappedColumns: Column[] = columnRows.map((column: ColumnRow) => {
    const columnId = String(column.id)
    return {
      id: columnId,
      title: column.title,
      order: column.order,
      tasks: activeByColumn.get(columnId) ?? [],
      stickers: [],
    }
  })

  const activeTasks = mappedColumns.flatMap((column) => column.tasks)
  console.info("[ops] loaded board", {
    id: board.id,
    slug: board.slug,
    title: board.title,
    columns: mappedColumns.length,
    tasks: activeTasks.length,
    archived: archivedTasks.length,
  })

  return {
    id: String(board.id),
    title: board.title,
    description: board.description ?? "",
    slug: board.slug,
    columns: mappedColumns,
    activeTasks,
    createdAt: toIso(board.createdAt) ?? new Date().toISOString(),
    updatedAt: toIso(board.updatedAt) ?? new Date().toISOString(),
    createdBy: "ops",
    sharedWith: [],
    archivedTasks,
    stickers: [],
  }
}

async function tenantIdForBoard(boardId: string) {
  await ensureFleetTenantColumns()
  const tenantId = await requireActorTenant()
  const [board] = await db
    .select({ tenantId: boards.tenantId })
    .from(boards)
    .where(and(eq(boards.id, boardId), eq(boards.tenantId, tenantId)))
    .limit(1)
  if (!board || !sameTenant(tenantId, board.tenantId)) throw new OpsAccessError(403)
  return board.tenantId
}

async function insertOpsColumns(boardId: string) {
  const tenantId = await tenantIdForBoard(boardId)
  await db.insert(columns).values(
    OPS_COLUMN_TITLES.map((title, order) => ({
      boardId,
      tenantId,
      title,
      order,
    })),
  )
}

async function ensureOpsColumns(boardId: string) {
  const tenantId = await tenantIdForBoard(boardId)
  const existing = await db
    .select()
    .from(columns)
    .where(and(eq(columns.boardId, boardId), eq(columns.tenantId, tenantId)))
    .orderBy(asc(columns.order), asc(columns.createdAt))

  const missing = missingOpsColumnTitles(existing.map((column) => column.title))
  if (missing.length === 0) return existing

  const nextOrder = existing.length === 0 ? 0 : existing[existing.length - 1].order + 1
  await db.insert(columns).values(
    missing.map((title, index) => ({
      boardId,
      tenantId,
      title,
      order: nextOrder + index,
    })),
  )
  return db
    .select()
    .from(columns)
    .where(and(eq(columns.boardId, boardId), eq(columns.tenantId, tenantId)))
    .orderBy(asc(columns.order), asc(columns.createdAt))
}

async function stampOpsSlug(boardId: string, tenantId: string) {
  await db
    .update(boards)
    .set({ slug: null, updatedAt: now() })
    .where(and(eq(boards.tenantId, tenantId), eq(boards.slug, DEFAULT_BOARD_SLUG), ne(boards.id, boardId)))
  await db
    .update(boards)
    .set({ slug: DEFAULT_BOARD_SLUG, updatedAt: now() })
    .where(and(eq(boards.id, boardId), eq(boards.tenantId, tenantId)))
}

async function reconcileOpsTasks(opsBoardId: string) {
  const tenantId = await tenantIdForBoard(opsBoardId)
  const opsColumns = await ensureOpsColumns(opsBoardId)
  const allColumns = await db.select().from(columns).where(eq(columns.tenantId, tenantId))
  const allTasks = await db.select().from(tasks).where(eq(tasks.tenantId, tenantId))

  const visibleOnOps = allTasks.filter(
    (task) => task.boardId === opsBoardId && !isTaskHiddenAsArchived(task.archivedAt, task.createdAt),
  ).length

  const placements = planOpsTaskPlacements({
    opsBoardId,
    opsColumns: opsColumns.map((column) => ({
      id: String(column.id),
      title: column.title,
      boardId: String(column.boardId),
      order: column.order,
    })),
    columns: allColumns.map((column) => ({
      id: String(column.id),
      title: column.title,
      boardId: String(column.boardId),
      order: column.order,
    })),
    tasks: allTasks.map((task) => ({
      id: String(task.id),
      boardId: String(task.boardId),
      columnId: String(task.columnId),
      archivedAt: task.archivedAt,
      createdAt: task.createdAt,
    })),
    adoptForeignTasks: visibleOnOps === 0,
  })

  for (const placement of placements) {
    await db
      .update(tasks)
      .set({
        boardId: placement.boardId,
        columnId: placement.columnId,
        tenantId,
        ...(placement.clearArchive ? { archivedAt: null } : {}),
        updatedAt: now(),
      })
      .where(and(eq(tasks.id, placement.taskId), eq(tasks.tenantId, tenantId)))
  }

  if (placements.length > 0) {
    await touchBoard(opsBoardId)
    console.info("[ops] reconciled tasks onto ops board", {
      boardId: opsBoardId,
      repaired: placements.length,
      adopted: visibleOnOps === 0,
    })
  }

  await backfillGiantSmokeCopy()
  await backfillCompletedAtFromUpdatedAt()
}

async function touchBoard(boardId: string) {
  const tenantId = await requireActorTenant()
  await db
    .update(boards)
    .set({ updatedAt: now() })
    .where(and(eq(boards.id, boardId), eq(boards.tenantId, tenantId)))
}

export async function ensureTaskBriefColumn() {
  await db.execute(sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS brief text`)
}

export async function ensureTaskCompletedAtColumn() {
  await db.execute(sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completed_at timestamptz`)
}

export async function ensureTaskCloseSubStatusColumn() {
  await db.execute(sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS close_sub_status text`)
  await db.execute(sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'tasks_close_sub_status_check'
      ) THEN
        ALTER TABLE tasks
          ADD CONSTRAINT tasks_close_sub_status_check
          CHECK (
            close_sub_status IS NULL
            OR close_sub_status IN ('Closed', 'No Longer Needed', 'Duplicate')
          );
      END IF;
    END $$
  `)
}

export async function ensureTaskSchemaColumns() {
  await ensureTaskBriefColumn()
  await ensureTaskCompletedAtColumn()
  await ensureTaskCloseSubStatusColumn()
}

async function withTaskSchemaColumns<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run()
  } catch (error) {
    const missingBrief = isMissingRelationColumnError(error, "brief")
    const missingCompleted = isMissingRelationColumnError(error, "completed_at")
    const missingClose = isMissingRelationColumnError(error, "close_sub_status")
    const missingTenant = isMissingRelationColumnError(error, "tenant_id")
    if (!missingBrief && !missingCompleted && !missingClose && !missingTenant) throw error
    await ensureTaskSchemaColumns()
    if (missingTenant) await ensureFleetTenantColumns()
    return await run()
  }
}

/** Existing Done cards without completed_at use updated_at as a best-effort completion date. */
export async function backfillCompletedAtFromUpdatedAt() {
  await ensureTaskCompletedAtColumn()
  await ensureFleetTenantColumns()
  await db.execute(sql`
    UPDATE tasks t
    SET completed_at = t.updated_at
    FROM columns c
    WHERE t.column_id = c.id
      AND t.tenant_id = ${FLEET_TENANT_ID}
      AND c.tenant_id = ${FLEET_TENANT_ID}
      AND lower(btrim(c.title)) = 'done'
      AND t.completed_at IS NULL
  `)
}

async function columnTitleById(columnId: string | null | undefined) {
  if (!columnId) return null
  const tenantId = await requireActorTenant()
  const [column] = await db
    .select({ title: columns.title, tenantId: columns.tenantId })
    .from(columns)
    .where(and(eq(columns.id, columnId), eq(columns.tenantId, tenantId)))
    .limit(1)
  if (!column || !sameTenant(tenantId, column.tenantId)) return null
  return column.title ?? null
}

async function completedAtForColumnChange(fromColumnId: string | null | undefined, toColumnId: string | null | undefined) {
  const stamped = nextCompletedAt({
    fromTitle: await columnTitleById(fromColumnId),
    toTitle: await columnTitleById(toColumnId),
    now: now(),
  })
  if (stamped === undefined) return {}
  return { completedAt: stamped }
}

export async function backfillGiantSmokeCopy() {
  await ensureTaskSchemaColumns()
  await ensureFleetTenantColumns()
  const rows = await db.select().from(tasks).where(eq(tasks.tenantId, FLEET_TENANT_ID))
  let updated = 0

  for (const row of rows) {
    const plan = planGiantSmokeBackfill({
      title: row.title,
      brief: row.brief,
      description: row.description,
      labels: mapLabels(row.labels),
    })
    if (!plan) continue

    await db
      .update(tasks)
      .set({
        brief: plan.brief,
        description: plan.description,
        labels: plan.labels,
        updatedAt: now(),
      })
      .where(and(eq(tasks.id, row.id), eq(tasks.tenantId, FLEET_TENANT_ID)))
    updated += 1
  }

  if (updated > 0) {
    console.info("[ops] backfilled Giant smoke card copy", { updated })
  }
  return updated
}

export async function ensureDefaultBoard(): Promise<Board> {
  const tenantId = await requireActorTenant()
  if (tenantId !== FLEET_TENANT_ID) {
    const own = await loadBoard(DEFAULT_BOARD_SLUG, tenantId)
    if (!own) throw new OpsAccessError(403)
    return toPlainBoard(own)
  }
  await ensureTaskSchemaColumns()
  await ensureFleetTenantColumns()

  const boardRows = await db.select().from(boards).where(eq(boards.tenantId, FLEET_TENANT_ID))
  const counts = await db
    .select({
      boardId: tasks.boardId,
      count: sql<number>`count(*)::int`,
    })
    .from(tasks)
    .where(eq(tasks.tenantId, FLEET_TENANT_ID))
    .groupBy(tasks.boardId)
  const countByBoard = new Map(counts.map((row) => [String(row.boardId), Number(row.count)]))

  const canonical = pickCanonicalOpsBoard(
    boardRows.map((board) => ({
      id: String(board.id),
      title: board.title,
      slug: board.slug,
      updatedAt: board.updatedAt,
      taskCount: countByBoard.get(String(board.id)) ?? 0,
    })),
  )

  await ensureTaskBriefColumn()

  if (canonical) {
    if (canonical.slug !== DEFAULT_BOARD_SLUG) {
      await stampOpsSlug(canonical.id, FLEET_TENANT_ID)
    }
    if (canonical.title.trim().toLowerCase() !== DEFAULT_BOARD_TITLE.toLowerCase()) {
      await db
        .update(boards)
        .set({ title: DEFAULT_BOARD_TITLE, updatedAt: now() })
        .where(and(eq(boards.id, canonical.id), eq(boards.tenantId, FLEET_TENANT_ID)))
    }
    await reconcileOpsTasks(canonical.id)
    const board = await loadBoard(canonical.id, FLEET_TENANT_ID)
    if (board) return toPlainBoard(board)
  }

  const [created] = await db
    .insert(boards)
    .values({
      tenantId: FLEET_TENANT_ID,
      title: DEFAULT_BOARD_TITLE,
      description: DEFAULT_BOARD_DESCRIPTION,
      slug: DEFAULT_BOARD_SLUG,
    })
    .returning()

  await insertOpsColumns(created.id)
  await reconcileOpsTasks(created.id)
  const board = await loadBoard(created.id, FLEET_TENANT_ID)
  if (!board) {
    throw new Error("Failed to create the default ops board")
  }
  return toPlainBoard(board)
}

/** Read-only ops board for the verified actor. Fleet still self-heals. Customers do not. */
export async function getActorOpsBoard(): Promise<Board | null> {
  const tenantId = await requireActorTenant()
  if (tenantId === FLEET_TENANT_ID) return ensureDefaultBoard()
  const slugged = await loadBoard(DEFAULT_BOARD_SLUG, tenantId)
  if (slugged) return toPlainBoard(slugged)
  const [row] = await db
    .select({ id: boards.id, tenantId: boards.tenantId })
    .from(boards)
    .where(eq(boards.tenantId, tenantId))
    .orderBy(sql`${boards.updatedAt} desc`)
    .limit(1)
  if (!row || !sameTenant(tenantId, row.tenantId)) return null
  const loaded = await loadBoard(String(row.id), tenantId)
  return loaded ? toPlainBoard(loaded) : null
}

export async function getBoard(boardId: string): Promise<Board> {
  const tenantId = await requireActorTenant()

  if (tenantId === FLEET_TENANT_ID && boardId === DEFAULT_BOARD_SLUG) {
    return ensureDefaultBoard()
  }

  const board = await loadBoard(boardId, tenantId)
  if (!board) throw new OpsAccessError(403)
  const owner = await boardTenant(board.id, tenantId)
  if (!sameTenant(tenantId, owner)) throw new OpsAccessError(403)
  if (tenantId === FLEET_TENANT_ID && board.slug === DEFAULT_BOARD_SLUG) {
    return ensureDefaultBoard()
  }
  return toPlainBoard(board)
}

async function boardTenant(boardId: string, tenantId: string) {
  const [row] = await db
    .select({ tenantId: boards.tenantId })
    .from(boards)
    .where(and(eq(boards.id, boardId), eq(boards.tenantId, tenantId)))
    .limit(1)
  return row?.tenantId ?? ""
}

export async function getUserBoards(): Promise<BoardSummary[]> {
  const tenantId = await requireActorTenant()
  if (tenantId === FLEET_TENANT_ID) await ensureDefaultBoard()

  const rows = await db.select().from(boards).where(eq(boards.tenantId, tenantId)).orderBy(sql`${boards.updatedAt} desc`)

  const counts = await db
    .select({
      boardId: tasks.boardId,
      count: sql<number>`count(*)::int`,
    })
    .from(tasks)
    .where(and(eq(tasks.tenantId, tenantId), isNull(tasks.archivedAt)))
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
  const tenantId = await requireActorTenant()
  const trimmed = title.trim() || DEFAULT_BOARD_TITLE

  await ensureFleetTenantColumns()
  const [created] = await db
    .insert(boards)
    .values({
      tenantId,
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
  const tenantId = await requireActorTenant()
  const [board] = await db
    .select({ id: boards.id })
    .from(boards)
    .where(and(eq(boards.id, boardId), eq(boards.tenantId, tenantId)))
    .limit(1)
  if (!board) throw new OpsAccessError(403)
  await db
    .update(boards)
    .set({ title: title.trim(), updatedAt: now() })
    .where(and(eq(boards.id, boardId), eq(boards.tenantId, tenantId)))
  return { success: true }
}

export async function updateBoardDescription(boardId: string, description: string) {
  const tenantId = await requireActorTenant()
  const [board] = await db
    .select({ id: boards.id })
    .from(boards)
    .where(and(eq(boards.id, boardId), eq(boards.tenantId, tenantId)))
    .limit(1)
  if (!board) throw new OpsAccessError(403)
  await db
    .update(boards)
    .set({ description, updatedAt: now() })
    .where(and(eq(boards.id, boardId), eq(boards.tenantId, tenantId)))
  return { success: true }
}

export async function updateBoardColumns(_boardId: string, _nextColumns: Column[]) {
  await requireActorTenant()
  return { success: true }
}

export async function deleteBoard(boardId: string) {
  const tenantId = await requireActorTenant()
  const [board] = await db
    .select()
    .from(boards)
    .where(and(eq(boards.id, boardId), eq(boards.tenantId, tenantId)))
    .limit(1)
  if (!board || !sameTenant(tenantId, board.tenantId)) throw new OpsAccessError(403)
  if (board.slug === DEFAULT_BOARD_SLUG) {
    return { success: false, error: "The default ops board cannot be deleted" }
  }
  await db.delete(boards).where(and(eq(boards.id, boardId), eq(boards.tenantId, tenantId)))
  return { success: true }
}

export async function addColumn(boardId: string, title: string) {
  const tenantId = await requireActorTenant()
  await tenantIdForBoard(boardId)
  const existing = await db
    .select({ order: columns.order })
    .from(columns)
    .where(and(eq(columns.boardId, boardId), eq(columns.tenantId, tenantId)))
    .orderBy(asc(columns.order))

  const nextOrder = existing.length === 0 ? 0 : existing[existing.length - 1].order + 1
  const [created] = await db
    .insert(columns)
    .values({ boardId, tenantId, title: title.trim() || "Column", order: nextOrder })
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
  const tenantId = await requireActorTenant()
  const [column] = await db
    .select({ id: columns.id })
    .from(columns)
    .where(and(eq(columns.id, columnId), eq(columns.boardId, boardId), eq(columns.tenantId, tenantId)))
    .limit(1)
  if (!column) throw new OpsAccessError(403)
  await db
    .update(columns)
    .set({ title: title.trim() })
    .where(and(eq(columns.id, columnId), eq(columns.boardId, boardId), eq(columns.tenantId, tenantId)))
  await touchBoard(boardId)
  return { success: true }
}

export async function deleteColumn(boardId: string, columnId: string) {
  const tenantId = await requireActorTenant()
  const [removed] = await db
    .select()
    .from(columns)
    .where(and(eq(columns.id, columnId), eq(columns.boardId, boardId), eq(columns.tenantId, tenantId)))
    .limit(1)

  if (!removed || !sameTenant(tenantId, removed.tenantId)) throw new OpsAccessError(403)

  const board = await loadBoard(boardId, tenantId)
  const removedColumn = board?.columns.find((column) => column.id === columnId)

  await db.delete(columns).where(and(eq(columns.id, columnId), eq(columns.tenantId, tenantId)))

  const remaining = await db
    .select()
    .from(columns)
    .where(and(eq(columns.boardId, boardId), eq(columns.tenantId, tenantId)))
    .orderBy(asc(columns.order))

  for (const [index, column] of remaining.entries()) {
    if (column.order !== index) {
      await db.update(columns).set({ order: index }).where(and(eq(columns.id, column.id), eq(columns.tenantId, tenantId)))
    }
  }

  await touchBoard(boardId)
  return { success: true, removedColumn }
}

export async function restoreColumn(boardId: string, column: Column) {
  const tenantId = await requireActorTenant()
  await tenantIdForBoard(boardId)

  const [existing] = await db.select().from(columns).where(eq(columns.id, column.id)).limit(1)
  if (existing && !sameTenant(tenantId, existing.tenantId)) throw new OpsAccessError(403)
  if (existing) {
    return { success: false, error: "Column already exists" }
  }
  for (const task of column.tasks || []) {
    const [row] = await db.select({ tenantId: tasks.tenantId }).from(tasks).where(eq(tasks.id, task.id)).limit(1)
    if (row && !sameTenant(tenantId, row.tenantId)) throw new OpsAccessError(403)
  }
  await db.insert(columns).values({
    id: column.id,
    boardId,
    tenantId,
    title: column.title,
    order: column.order,
  })

  for (const [index, task] of (column.tasks || []).entries()) {
    await db.insert(tasks).values({
      id: task.id,
      boardId,
      tenantId,
      columnId: column.id,
      title: task.title,
      description: task.description ?? "",
      brief: task.brief ?? "",
      labels: task.labels ?? [],
      order: task.order ?? index,
      archivedAt: null,
    })
  }

  await touchBoard(boardId)
  return { success: true }
}

export async function getTaskById(taskId: string): Promise<Task | null> {
  const tenantId = await requireActorTenant()
  const [row] = await withTaskSchemaColumns(() =>
    db.select().from(tasks).where(and(eq(tasks.id, taskId), eq(tasks.tenantId, tenantId))).limit(1),
  )
  if (!row || !sameTenant(tenantId, row.tenantId) || row.archivedAt) return null
  return mapTask(row)
}

export async function addTask(
  boardId: string,
  columnId: string,
  task: Omit<Task, "id" | "createdAt" | "updatedAt" | "createdBy">,
) {
  const tenantId = await requireActorTenant()
  await ensureFleetTenantColumns()

  const [column] = await db
    .select()
    .from(columns)
    .where(and(eq(columns.id, columnId), eq(columns.boardId, boardId), eq(columns.tenantId, tenantId)))
    .limit(1)

  if (!column || !sameTenant(tenantId, column.tenantId)) throw new OpsAccessError(403)

  const existing = await db
    .select({ order: tasks.order })
    .from(tasks)
    .where(and(eq(tasks.columnId, columnId), eq(tasks.tenantId, tenantId), isNull(tasks.archivedAt)))
    .orderBy(asc(tasks.order))

  const nextOrder = existing.length === 0 ? 0 : existing[existing.length - 1].order + 1

  const title = task.title.trim() || "Untitled"
  const smoke = planGiantSmokeBackfill({
    title,
    brief: task.brief,
    description: task.description,
    labels: task.labels,
  })
  const description = smoke?.description ?? task.description ?? ""
  if (descriptionIsMissing(description)) {
    throw new Error("Description is required. Add the full ask — the empty placeholder is not a description.")
  }
  const createdInDone = isDoneColumnTitle(column.title)
  if (createdInDone && !isCloseSubStatus(task.closeSubStatus)) {
    throw new Error("closeSubStatus is required and must be one of: Closed, No Longer Needed, Duplicate")
  }

  const [created] = await withTaskSchemaColumns(() =>
    db
      .insert(tasks)
      .values({
        boardId,
        columnId,
        tenantId,
        title,
        description,
        brief: smoke?.brief ?? task.brief ?? "",
        labels: smoke?.labels ?? task.labels ?? [],
        order: nextOrder,
        completedAt: createdInDone ? now() : null,
        closeSubStatus: createdInDone && isCloseSubStatus(task.closeSubStatus) ? task.closeSubStatus : null,
      })
      .returning(),
  )

  await touchBoard(boardId)
  return mapTask(created)
}

export async function updateTask(
  boardId: string,
  columnId: string,
  taskId: string,
  updates: Partial<Omit<Task, "id" | "createdAt" | "createdBy" | "archivedAt">>,
) {
  const tenantId = await requireActorTenant()

  const [existing] = await withTaskSchemaColumns(() =>
    db
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, taskId), eq(tasks.boardId, boardId), eq(tasks.tenantId, tenantId)))
      .limit(1),
  )

  if (!existing || !sameTenant(tenantId, existing.tenantId)) throw new OpsAccessError(403)

  if (updates.description !== undefined && descriptionIsMissing(updates.description)) {
    return {
      success: false,
      error: "Description is required. Add the full ask — the empty placeholder is not a description.",
    }
  }

  let closePatch: { closeSubStatus?: string | null } = {}
  if (updates.closeSubStatus !== undefined) {
    if (updates.closeSubStatus === null) {
      closePatch = { closeSubStatus: null }
    } else if (!isCloseSubStatus(updates.closeSubStatus)) {
      return { success: false, error: "closeSubStatus must be one of: Closed, No Longer Needed, Duplicate" }
    } else {
      closePatch = { closeSubStatus: updates.closeSubStatus }
    }
  }

  const nextColumnId = updates.columnId && updates.columnId !== existing.columnId ? updates.columnId : existing.columnId
  if (nextColumnId !== existing.columnId) {
    const [dest] = await db
      .select({ id: columns.id })
      .from(columns)
      .where(and(eq(columns.id, nextColumnId), eq(columns.boardId, boardId), eq(columns.tenantId, tenantId)))
      .limit(1)
    if (!dest) throw new OpsAccessError(403)
  }
  const completedPatch = await completedAtForColumnChange(existing.columnId, nextColumnId)

  await withTaskSchemaColumns(() =>
    db
      .update(tasks)
      .set({
        title: updates.title ?? existing.title,
        description: updates.description ?? existing.description,
        brief: updates.brief !== undefined ? updates.brief : existing.brief,
        labels: updates.labels ?? existing.labels,
        columnId: nextColumnId,
        updatedAt: now(),
        ...completedPatch,
        ...closePatch,
      })
      .where(and(eq(tasks.id, taskId), eq(tasks.tenantId, tenantId))),
  )

  await touchBoard(boardId)
  void columnId
  return { success: true }
}

export async function deleteTask(boardId: string, columnId: string, taskId: string) {
  const tenantId = await requireActorTenant()

  const [existing] = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.boardId, boardId), eq(tasks.tenantId, tenantId)))
    .limit(1)

  if (!existing || !sameTenant(tenantId, existing.tenantId)) throw new OpsAccessError(403)

  const archivedAt = now()
  await db
    .update(tasks)
    .set({ archivedAt, updatedAt: archivedAt })
    .where(and(eq(tasks.id, taskId), eq(tasks.tenantId, tenantId)))
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
  const tenantId = await requireActorTenant()
  await tenantIdForBoard(boardId)

  const taskId = task?.id ?? columnIdOrTaskId
  const preferredColumnId = task?.columnId ?? (task ? columnIdOrTaskId : undefined)

  const [existing] = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.boardId, boardId), eq(tasks.tenantId, tenantId)))
    .limit(1)

  if (!existing) {
    if (!task) throw new OpsAccessError(403)
    const [anyRow] = await db.select({ tenantId: tasks.tenantId }).from(tasks).where(eq(tasks.id, taskId)).limit(1)
    if (anyRow && !sameTenant(tenantId, anyRow.tenantId)) throw new OpsAccessError(403)
    if (anyRow) return { success: false, error: "Task already exists" }
    const restoreColumnId = preferredColumnId || columnIdOrTaskId
    const [restoreColumn] = await db
      .select({ id: columns.id })
      .from(columns)
      .where(and(eq(columns.id, restoreColumnId), eq(columns.boardId, boardId), eq(columns.tenantId, tenantId)))
      .limit(1)
    if (!restoreColumn) throw new OpsAccessError(403)
    const restoreTitle = await columnTitleById(restoreColumnId)
    await db.insert(tasks).values({
      id: task.id,
      boardId,
      tenantId,
      columnId: restoreColumnId,
      title: task.title,
      description: task.description ?? "",
      brief: task.brief ?? "",
      labels: task.labels ?? [],
      order: task.order ?? 0,
      archivedAt: null,
      completedAt: task.completedAt
        ? asDate(task.completedAt)
        : isDoneColumnTitle(restoreTitle)
          ? now()
          : null,
      closeSubStatus:
        isDoneColumnTitle(restoreTitle) && isCloseSubStatus(task.closeSubStatus) ? task.closeSubStatus : null,
    })
    await touchBoard(boardId)
    return { success: true }
  }

  let columnId = preferredColumnId || existing.columnId
  let [resolvedColumn] = await db
    .select()
    .from(columns)
    .where(and(eq(columns.id, columnId), eq(columns.boardId, boardId), eq(columns.tenantId, tenantId)))
    .limit(1)

  if (!resolvedColumn) {
    const fallback =
      (await db
        .select()
        .from(columns)
        .where(and(eq(columns.boardId, boardId), eq(columns.tenantId, tenantId)))
        .orderBy(asc(columns.order))
        .limit(1))[0]
    if (!fallback) return { success: false, error: "No columns available" }
    columnId = fallback.id
    resolvedColumn = fallback
  }

  const completedPatch = await completedAtForColumnChange(existing.columnId, columnId)
  const closePatch = isDoneColumnTitle(resolvedColumn.title) ? {} : { closeSubStatus: null }
  await withTaskSchemaColumns(() =>
    db
      .update(tasks)
      .set({ archivedAt: null, columnId, updatedAt: now(), ...completedPatch, ...closePatch })
      .where(and(eq(tasks.id, taskId), eq(tasks.tenantId, tenantId))),
  )
  await touchBoard(boardId)
  return { success: true }
}

export async function permanentlyDeleteTask(boardId: string, taskId: string) {
  const tenantId = await requireActorTenant()
  const [existing] = await db
    .select({ id: tasks.id })
    .from(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.boardId, boardId), eq(tasks.tenantId, tenantId), isNotNull(tasks.archivedAt)))
    .limit(1)
  if (!existing) throw new OpsAccessError(403)
  await db
    .delete(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.boardId, boardId), eq(tasks.tenantId, tenantId), isNotNull(tasks.archivedAt)))
  await touchBoard(boardId)
  return { success: true }
}

export async function moveTask(
  boardId: string,
  sourceColumnId: string,
  taskId: string,
  destinationColumnId: string,
  targetPosition: number,
  options?: { closeSubStatus?: string | null },
) {
  const tenantId = await requireActorTenant()
  const [owned] = await db
    .select({ id: tasks.id })
    .from(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.boardId, boardId), eq(tasks.tenantId, tenantId)))
    .limit(1)
  if (!owned) throw new OpsAccessError(403)
  const [sourceColumn] = await db
    .select({ id: columns.id })
    .from(columns)
    .where(and(eq(columns.id, sourceColumnId), eq(columns.boardId, boardId), eq(columns.tenantId, tenantId)))
    .limit(1)
  const [destColumn] = await db
    .select({ id: columns.id })
    .from(columns)
    .where(and(eq(columns.id, destinationColumnId), eq(columns.boardId, boardId), eq(columns.tenantId, tenantId)))
    .limit(1)
  if (!sourceColumn || !destColumn) throw new OpsAccessError(403)

  const fromTitle = await columnTitleById(sourceColumnId)
  const toTitle = await columnTitleById(destinationColumnId)
  const completedStamped = nextCompletedAt({ fromTitle, toTitle, now: now() })
  const completedPatch = completedStamped === undefined ? {} : { completedAt: completedStamped }
  const nextStatus = nextCloseSubStatus({
    fromTitle,
    toTitle,
    closeSubStatus: options?.closeSubStatus,
  })
  const closePatch = nextStatus === undefined ? {} : { closeSubStatus: nextStatus }

  const destTasks = await withTaskSchemaColumns(() =>
    db
      .select()
      .from(tasks)
      .where(and(eq(tasks.columnId, destinationColumnId), eq(tasks.tenantId, tenantId), isNull(tasks.archivedAt)))
      .orderBy(asc(tasks.order)),
  )

  const withoutMoved = destTasks.filter((task) => task.id !== taskId)
  const clamped = Math.max(0, Math.min(targetPosition, withoutMoved.length))
  withoutMoved.splice(clamped, 0, { id: taskId } as TaskRow)

  if (sourceColumnId !== destinationColumnId || Object.keys(closePatch).length > 0) {
    await withTaskSchemaColumns(() =>
      db
        .update(tasks)
        .set({
          ...(sourceColumnId !== destinationColumnId ? { columnId: destinationColumnId } : {}),
          updatedAt: now(),
          ...completedPatch,
          ...closePatch,
        })
        .where(and(eq(tasks.id, taskId), eq(tasks.boardId, boardId), eq(tasks.tenantId, tenantId))),
    )
  }

  for (const [index, task] of withoutMoved.entries()) {
    await db
      .update(tasks)
      .set({ order: index, updatedAt: now() })
      .where(and(eq(tasks.id, task.id), eq(tasks.tenantId, tenantId)))
  }

  if (sourceColumnId !== destinationColumnId) {
    const sourceTasks = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.columnId, sourceColumnId), eq(tasks.tenantId, tenantId), isNull(tasks.archivedAt)))
      .orderBy(asc(tasks.order))

    for (const [index, task] of sourceTasks.entries()) {
      await db.update(tasks).set({ order: index }).where(and(eq(tasks.id, task.id), eq(tasks.tenantId, tenantId)))
    }
  }

  await touchBoard(boardId)
  return { success: true }
}

export async function updateColumnOrder(boardId: string, columnIds: string[]) {
  const tenantId = await requireActorTenant()
  await tenantIdForBoard(boardId)
  for (const [index, columnId] of columnIds.entries()) {
    await db
      .update(columns)
      .set({ order: index })
      .where(and(eq(columns.id, columnId), eq(columns.boardId, boardId), eq(columns.tenantId, tenantId)))
  }
  await touchBoard(boardId)
  return { success: true }
}

export async function updateTaskOrder(boardId: string, columnId: string, taskIds: string[]) {
  const tenantId = await requireActorTenant()
  await tenantIdForBoard(boardId)
  for (const [index, taskId] of taskIds.entries()) {
    await db
      .update(tasks)
      .set({ order: index, updatedAt: now() })
      .where(
        and(
          eq(tasks.id, taskId),
          eq(tasks.columnId, columnId),
          eq(tasks.boardId, boardId),
          eq(tasks.tenantId, tenantId),
        ),
      )
  }
  await touchBoard(boardId)
  return { success: true }
}

export async function shareBoard(_boardId: string, _userPhone: string) {
  await requireActorTenant()
  return {
    success: false,
    message: "Sharing is disabled on this single-user ops board.",
  }
}

export async function removeUserFromBoard(_boardId: string, _userId: string) {
  await requireActorTenant()
  return { success: true }
}
