import type { OpsApiBoard, OpsApiTask } from "../types.ts"
import type { OpsToolPort } from "../mcp/tools.ts"

/**
 * App-level tenant boundary (Slice C). These checks stay.
 * Database owner enforcement is drizzle/0006_force_rls.sql.
 * This module does not replace that control.
 * Tenant id comes only from a verified session or bearer. Query params,
 * JSON tenant fields, and client tenant headers are not authority.
 */
export class OpsAccessError extends Error {
  readonly status: 401 | 403

  constructor(status: 401 | 403) {
    super(status === 401 ? "Unauthorized" : "Forbidden")
    this.name = "OpsAccessError"
    this.status = status
  }
}

export function sameTenant(actorTenantId: string, rowTenantId: string | null | undefined) {
  return actorTenantId.length > 0 && rowTenantId === actorTenantId
}

/**
 * Client tenant hints are discarded. A missing verified tenant is 401.
 * A present hint never selects a tenant and never widens the actor.
 */
export function verifiedTenantOnly(input: {
  verifiedTenantId: string | null | undefined
  queryTenant?: unknown
  bodyTenantId?: unknown
  headerTenant?: unknown
}) {
  void input.queryTenant
  void input.bodyTenantId
  void input.headerTenant
  if (!input.verifiedTenantId) throw new OpsAccessError(401)
  return input.verifiedTenantId
}

export type ScopedBoard = {
  id: string
  tenantId: string
  slug: string
  title: string
}

export type ScopedColumn = {
  id: string
  tenantId: string
  boardId: string
  title: string
  order: number
}

export type ScopedTask = {
  id: string
  tenantId: string
  boardId: string
  columnId: string
  title: string
  description: string
  brief: string
  labels: string[]
  order: number
  archived: boolean
  createdAt: string
  completedAt: string | null
  closeSubStatus: string | null
}

export type ScopedWorld = {
  boards: ScopedBoard[]
  columns: ScopedColumn[]
  tasks: ScopedTask[]
}

export type OpsHttpResult = {
  status: number
  body: unknown
}

function forbidden(): OpsHttpResult {
  return { status: 403, body: { error: "Forbidden" } }
}

function boardInTenant(world: ScopedWorld, tenantId: string, boardId: string) {
  const needle = boardId.trim()
  const lower = needle.toLowerCase()
  return (
    world.boards.find(
      (board) => sameTenant(tenantId, board.tenantId) && (board.id === needle || board.slug.toLowerCase() === lower),
    ) ?? null
  )
}

function boardsForTenant(world: ScopedWorld, tenantId: string) {
  return world.boards.filter((board) => sameTenant(tenantId, board.tenantId))
}

function defaultBoard(world: ScopedWorld, tenantId: string) {
  const owned = boardsForTenant(world, tenantId)
  return owned.find((board) => board.slug === "ops") ?? owned[0] ?? null
}

function tasksForBoard(world: ScopedWorld, tenantId: string, boardId: string) {
  return world.tasks.filter(
    (task) => sameTenant(tenantId, task.tenantId) && task.boardId === boardId && !task.archived,
  )
}

function taskInTenant(world: ScopedWorld, tenantId: string, taskId: string) {
  return world.tasks.find((task) => task.id === taskId && sameTenant(tenantId, task.tenantId) && !task.archived) ?? null
}

function columnInTenant(world: ScopedWorld, tenantId: string, columnId: string, boardId?: string) {
  return (
    world.columns.find(
      (column) =>
        column.id === columnId &&
        sameTenant(tenantId, column.tenantId) &&
        (boardId ? column.boardId === boardId : true),
    ) ?? null
  )
}

function toApiTask(task: ScopedTask): OpsApiTask {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    brief: task.brief,
    labels: task.labels,
    order: task.order,
    columnId: task.columnId,
    createdAt: task.createdAt,
    completedAt: task.completedAt,
    closeSubStatus: task.closeSubStatus,
  }
}

function toApiBoard(world: ScopedWorld, board: ScopedBoard): OpsApiBoard {
  const columns = world.columns
    .filter((column) => sameTenant(board.tenantId, column.tenantId) && column.boardId === board.id)
    .sort((a, b) => a.order - b.order)
    .map((column) => ({
      id: column.id,
      title: column.title,
      order: column.order,
      tasks: tasksForBoard(world, board.tenantId, board.id)
        .filter((task) => task.columnId === column.id)
        .map(toApiTask),
    }))
  return {
    id: board.id,
    title: board.title,
    slug: board.slug,
    columns,
    activeTasks: columns.flatMap((column) => column.tasks),
  }
}

function emptyBoard(): OpsApiBoard {
  return { id: "", title: "Ops", slug: "ops", columns: [], activeTasks: [] }
}

function readString(value: unknown) {
  return typeof value === "string" ? value : undefined
}

/**
 * Same decisions the `/api/ops/*` handlers apply: actor tenant only,
 * foreign boardId/taskId is 403 with no row payload, own data stays visible.
 */
export function dispatchOpsApi(
  world: ScopedWorld,
  input: {
    verifiedTenantId: string | null | undefined
    method: "GET" | "POST" | "PATCH" | "DELETE"
    path: string
    query?: Record<string, unknown>
    body?: Record<string, unknown>
    headerTenant?: unknown
  },
): OpsHttpResult {
  let tenantId: string
  try {
    tenantId = verifiedTenantOnly({
      verifiedTenantId: input.verifiedTenantId,
      queryTenant: input.query?.tenant,
      bodyTenantId: input.body?.tenant_id ?? input.body?.tenantId,
      headerTenant: input.headerTenant,
    })
  } catch (error) {
    if (error instanceof OpsAccessError) return { status: error.status, body: { error: error.message } }
    throw error
  }

  const body = input.body ?? {}
  const requestedBoardId = readString(input.query?.boardId)?.trim() || readString(body.boardId)?.trim() || ""
  const taskPath = /^\/api\/ops\/tasks\/([^/]+)(\/move)?$/.exec(input.path)
  const taskId = taskPath ? decodeURIComponent(taskPath[1]) : ""

  if (requestedBoardId) {
    const board = boardInTenant(world, tenantId, requestedBoardId)
    if (!board) return forbidden()
  }

  if (input.path === "/api/ops/board" || input.path === "/api/ops/diagnostics") {
    if (requestedBoardId) {
      const board = boardInTenant(world, tenantId, requestedBoardId)
      if (!board) return forbidden()
      const payload = toApiBoard(world, board)
      if (input.path === "/api/ops/diagnostics") {
        return { status: 200, body: { diagnostics: { taskCount: payload.activeTasks?.length ?? 0, boardId: board.id } } }
      }
      return { status: 200, body: { board: payload } }
    }
    const board = defaultBoard(world, tenantId)
    if (!board) {
      return input.path === "/api/ops/diagnostics"
        ? { status: 200, body: { diagnostics: { taskCount: 0, boardId: "" } } }
        : { status: 200, body: { board: emptyBoard() } }
    }
    const payload = toApiBoard(world, board)
    if (input.path === "/api/ops/diagnostics") {
      return { status: 200, body: { diagnostics: { taskCount: payload.activeTasks?.length ?? 0, boardId: board.id } } }
    }
    return { status: 200, body: { board: payload } }
  }

  if (input.path === "/api/ops/tasks" && input.method === "POST") {
    const board = requestedBoardId ? boardInTenant(world, tenantId, requestedBoardId) : defaultBoard(world, tenantId)
    if (!board) return forbidden()
    const title = readString(body.title)?.trim()
    if (!title) return { status: 400, body: { error: "Title is required" } }
    const column =
      world.columns.find((item) => sameTenant(tenantId, item.tenantId) && item.boardId === board.id) ?? null
    if (!column) return forbidden()
    const created: ScopedTask = {
      id: `new-${world.tasks.length + 1}`,
      tenantId,
      boardId: board.id,
      columnId: column.id,
      title,
      description: readString(body.description) ?? "",
      brief: readString(body.brief) ?? "",
      labels: [],
      order: tasksForBoard(world, tenantId, board.id).length,
      archived: false,
      createdAt: "2026-10-06T00:00:00.000Z",
      completedAt: null,
      closeSubStatus: null,
    }
    world.tasks.push(created)
    return { status: 201, body: { task: toApiTask(created) } }
  }

  if (!taskId) return { status: 404, body: { error: "Forbidden" } }

  const task = taskInTenant(world, tenantId, taskId)
  if (!task) return forbidden()

  if (taskPath?.[2] === "/move" && input.method === "POST") {
    const columnId = readString(body.columnId)?.trim()
    const columnTitle = readString(body.columnTitle)?.trim()
    const column = columnId
      ? columnInTenant(world, tenantId, columnId, task.boardId)
      : (world.columns.find(
          (item) =>
            sameTenant(tenantId, item.tenantId) &&
            item.boardId === task.boardId &&
            item.title.toLowerCase() === (columnTitle ?? "").toLowerCase(),
        ) ?? null)
    if (!column) return forbidden()
    task.columnId = column.id
    return { status: 200, body: { task: toApiTask(task) } }
  }

  if (input.method === "PATCH") {
    const title = readString(body.title)
    if (title !== undefined) task.title = title
    const description = readString(body.description)
    if (description !== undefined) task.description = description
    return { status: 200, body: { task: toApiTask(task) } }
  }

  if (input.method === "DELETE") {
    task.archived = true
    return { status: 200, body: { task: toApiTask(task) } }
  }

  return forbidden()
}

export function scopedOpsPort(world: ScopedWorld, tenantId: string): OpsToolPort {
  if (!tenantId) {
    return {
      async listBoard() {
        throw new OpsAccessError(401)
      },
      async insertTask() {
        throw new OpsAccessError(401)
      },
      async resolveTask() {
        throw new OpsAccessError(401)
      },
      async moveTask() {
        throw new OpsAccessError(401)
      },
      async updateTask() {
        throw new OpsAccessError(401)
      },
      async archiveTask() {
        throw new OpsAccessError(401)
      },
    }
  }

  return {
    async listBoard(slug = "ops") {
      const requested = (slug || "ops").trim()
      const board =
        boardInTenant(world, tenantId, requested) ??
        (requested.toLowerCase() === "ops" ? defaultBoard(world, tenantId) : null)
      if (!board || !sameTenant(tenantId, board.tenantId)) throw new OpsAccessError(403)
      return toApiBoard(world, board)
    },
    async insertTask(input) {
      const created = dispatchOpsApi(world, {
        verifiedTenantId: tenantId,
        method: "POST",
        path: "/api/ops/tasks",
        body: input,
      })
      if (created.status !== 201) throw new OpsAccessError(403)
      const task = (created.body as { task: OpsApiTask }).task
      return { task, columnId: task.columnId, skipped: false }
    },
    async resolveTask(query) {
      if (query.id) {
        const task = taskInTenant(world, tenantId, query.id)
        if (!task) throw new OpsAccessError(403)
        return toApiTask(task)
      }
      const title = (query.title ?? "").trim().toLowerCase()
      const task =
        world.tasks.find(
          (item) => sameTenant(tenantId, item.tenantId) && !item.archived && item.title.toLowerCase() === title,
        ) ?? null
      if (!task) throw new OpsAccessError(403)
      return toApiTask(task)
    },
    async moveTask(taskId, moveInput) {
      const column = moveInput.columnId
        ? columnInTenant(world, tenantId, moveInput.columnId)
        : (world.columns.find(
            (item) =>
              sameTenant(tenantId, item.tenantId) &&
              item.title.toLowerCase() === (moveInput.columnTitle ?? "").trim().toLowerCase(),
          ) ?? null)
      const task = taskInTenant(world, tenantId, taskId)
      if (!task || !column || !sameTenant(tenantId, column.tenantId) || column.boardId !== task.boardId) {
        throw new OpsAccessError(403)
      }
      task.columnId = column.id
      if (column.title.toLowerCase() === "done") {
        task.completedAt = task.completedAt ?? "2026-10-06T00:00:00.000Z"
        task.closeSubStatus = moveInput.closeSubStatus ?? task.closeSubStatus
      }
      return { task: toApiTask(task) }
    },
    async updateTask(taskId, patch) {
      const task = taskInTenant(world, tenantId, taskId)
      if (!task) throw new OpsAccessError(403)
      if (patch.title !== undefined) task.title = patch.title
      if (patch.description !== undefined) task.description = patch.description
      if (patch.brief !== undefined) task.brief = patch.brief
      if (patch.labels !== undefined) task.labels = patch.labels
      if (patch.closeSubStatus !== undefined) task.closeSubStatus = patch.closeSubStatus
      return { task: toApiTask(task) }
    },
    async archiveTask(taskId) {
      const task = taskInTenant(world, tenantId, taskId)
      if (!task) throw new OpsAccessError(403)
      task.archived = true
      return { task: toApiTask(task) }
    },
  }
}
