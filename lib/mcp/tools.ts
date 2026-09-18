import {
  DONE_COLUMN_TITLE,
  OPS_MCP_BOARD_SLUG,
  OPS_MCP_COLUMNS,
  columnTitleForTask,
  isOpsBoardSlug,
  isOpsColumnTitle,
  presentOpsBoard,
  presentOpsTask,
  type PresentedOpsTask,
} from "./lookup.ts"
import type { OpsApiBoard, OpsApiTask } from "../types.ts"

export const MCP_TOOL_NAMES = [
  "list_board",
  "insert_task",
  "move_task",
  "done_task",
  "archive_task",
  "update_task",
] as const

export type McpToolName = (typeof MCP_TOOL_NAMES)[number]

export type OpsToolPort = {
  listBoard: (slug?: string) => Promise<OpsApiBoard>
  insertTask: (input: {
    title: string
    columnTitle?: string
    brief?: string
    description?: string
    labels?: string[]
  }) => Promise<{ task: OpsApiTask; columnId: string; skipped: boolean }>
  resolveTask: (query: { id?: string; title?: string }) => Promise<OpsApiTask>
  moveTask: (taskId: string, input: { columnTitle?: string; columnId?: string }) => Promise<{ task: OpsApiTask }>
  updateTask: (
    taskId: string,
    input: { title?: string; brief?: string; description?: string; labels?: string[] },
  ) => Promise<{ task: OpsApiTask }>
  archiveTask: (taskId: string) => Promise<{ task: OpsApiTask }>
}

const COLUMN_ENUM = [...OPS_MCP_COLUMNS]

const SECRET_PARAM_KEYS = ["secret", "token", "password", "authorization", "ops_board_secret", "opsBoardSecret"]

export const MCP_TOOL_DEFINITIONS = [
  {
    name: "list_board",
    description:
      "List columns and active tasks on the MiniKanban Ops board. Default slug is ops. Includes title, brief, description, column, project labels, createdAt, and completedAt. Does not take OPS_BOARD_SECRET — the connector stores that.",
    inputSchema: {
      type: "object",
      properties: {
        slug: {
          type: "string",
          description: "Board slug. Only ops is supported.",
          default: OPS_MCP_BOARD_SLUG,
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: "insert_task",
    description:
      "Insert a task on the ops board. Skips (idempotent) if an active task with the same title already exists. columnTitle defaults to Need you. Never pass OPS_BOARD_SECRET as an argument.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Task title (required)." },
        columnTitle: {
          type: "string",
          description: "Destination column title.",
          enum: COLUMN_ENUM,
          default: OPS_MCP_COLUMNS[0],
        },
        brief: { type: "string", description: "1–2 line card-face summary." },
        description: { type: "string", description: "Full ask shown when the card is opened." },
        labels: {
          type: "array",
          items: { type: "string" },
          description: "Project labels (Giant, Paylyte, MiniKanban, …).",
        },
      },
      required: ["title"],
      additionalProperties: false,
    },
  },
  {
    name: "move_task",
    description:
      "Move an active task by UUID, short id (MKB-7E3A1234), or title to Need you, I'm on, Waiting, or Done. Moving to Done stamps completedAt.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Task UUID or short id (MKB-7E3A1234)." },
        title: { type: "string", description: "Exact active task title if id is unknown." },
        column: {
          type: "string",
          description: "Destination column title.",
          enum: COLUMN_ENUM,
        },
        columnTitle: {
          type: "string",
          description: "Alias for column.",
          enum: COLUMN_ENUM,
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: "done_task",
    description: "Move an active task by id or title to Done. Stamps completedAt when the card enters Done.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Task UUID or short id (MKB-7E3A1234)." },
        title: { type: "string", description: "Exact active task title if id is unknown." },
      },
      additionalProperties: false,
    },
  },
  {
    name: "archive_task",
    description: "Soft-archive an active task by id or title (sets archived_at; does not hard-delete).",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Task UUID or short id (MKB-7E3A1234)." },
        title: { type: "string", description: "Exact active task title if id is unknown." },
      },
      additionalProperties: false,
    },
  },
  {
    name: "update_task",
    description: "Update title, brief, description, and/or project labels on an active task (by id or title).",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Task UUID or short id (MKB-7E3A1234)." },
        title: { type: "string", description: "Current title, used to find the task when id is omitted." },
        newTitle: { type: "string", description: "Replacement title." },
        brief: { type: "string", description: "1–2 line card-face summary." },
        description: { type: "string", description: "Full ask shown when the card is opened." },
        labels: {
          type: "array",
          items: { type: "string" },
          description: "Replacement project labels.",
        },
      },
      additionalProperties: false,
    },
  },
] as const

export function mcpToolHasSecretParam(tool: { inputSchema: { properties?: Record<string, unknown> } }) {
  const keys = Object.keys(tool.inputSchema.properties ?? {})
  return keys.some((key) => SECRET_PARAM_KEYS.includes(key))
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined
}

function optionalStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) return undefined
  return value
}

function requireIdOrTitle(args: Record<string, unknown>): { id?: string; title?: string } {
  const id = optionalString(args.id)?.trim()
  const title = optionalString(args.title)?.trim()
  if (!id && !title) {
    throw new Error("id or title is required")
  }
  return { id: id || undefined, title: title || undefined }
}

function requireColumnTitle(args: Record<string, unknown>): string {
  const column = optionalString(args.column)?.trim() || optionalString(args.columnTitle)?.trim()
  if (!column) {
    throw new Error("column is required")
  }
  if (!isOpsColumnTitle(column)) {
    throw new Error(`column must be one of: ${OPS_MCP_COLUMNS.join(", ")}`)
  }
  return column
}

async function presentFromPort(port: OpsToolPort, task: OpsApiTask): Promise<PresentedOpsTask> {
  const board = presentOpsBoard(await port.listBoard(OPS_MCP_BOARD_SLUG))
  const columnTitle =
    board.columns.find((column) => column.id === task.columnId)?.title ||
    columnTitleForTask(
      {
        id: "",
        title: board.title,
        slug: board.slug,
        columns: board.columns.map((column) => ({
          id: column.id,
          title: column.title,
          order: column.order,
          tasks: [],
        })),
      },
      task,
    )
  return presentOpsTask(task, columnTitle)
}

export type McpToolResult = {
  content: Array<{ type: "text"; text: string }>
  isError?: boolean
}

function ok(payload: unknown): McpToolResult {
  return { content: [{ type: "text", text: JSON.stringify(payload, null, 2) }] }
}

function fail(error: unknown): McpToolResult {
  const message = error instanceof Error ? error.message : "Tool failed"
  return { content: [{ type: "text", text: message }], isError: true }
}

export async function runMcpTool(
  name: string,
  rawArgs: unknown,
  port: OpsToolPort,
): Promise<McpToolResult> {
  try {
    const args = asRecord(rawArgs)
    switch (name as McpToolName) {
      case "list_board": {
        const slug = optionalString(args.slug) || OPS_MCP_BOARD_SLUG
        if (!isOpsBoardSlug(slug)) {
          throw new Error(`Only board slug "${OPS_MCP_BOARD_SLUG}" is supported`)
        }
        const board = presentOpsBoard(await port.listBoard(slug))
        return ok(board)
      }
      case "insert_task": {
        const title = optionalString(args.title)?.trim()
        if (!title) throw new Error("title is required")
        const columnTitle = optionalString(args.columnTitle)?.trim()
        if (columnTitle && !isOpsColumnTitle(columnTitle)) {
          throw new Error(`columnTitle must be one of: ${OPS_MCP_COLUMNS.join(", ")}`)
        }
        const created = await port.insertTask({
          title,
          columnTitle,
          brief: optionalString(args.brief),
          description: optionalString(args.description),
          labels: optionalStringArray(args.labels),
        })
        const presented = await presentFromPort(port, created.task)
        return ok({
          skipped: created.skipped,
          reason: created.skipped ? "active task with the same title already exists" : undefined,
          task: presented,
        })
      }
      case "move_task": {
        const query = requireIdOrTitle(args)
        const columnTitle = requireColumnTitle(args)
        const resolved = await port.resolveTask(query)
        const moved = await port.moveTask(resolved.id, { columnTitle })
        return ok({ task: await presentFromPort(port, moved.task) })
      }
      case "done_task": {
        const query = requireIdOrTitle(args)
        const resolved = await port.resolveTask(query)
        const moved = await port.moveTask(resolved.id, { columnTitle: DONE_COLUMN_TITLE })
        return ok({ task: await presentFromPort(port, moved.task) })
      }
      case "archive_task": {
        const query = requireIdOrTitle(args)
        const resolved = await port.resolveTask(query)
        const before = await presentFromPort(port, resolved)
        const archived = await port.archiveTask(resolved.id)
        return ok({ archived: true, task: presentOpsTask(archived.task, before.column) })
      }
      case "update_task": {
        const query = requireIdOrTitle(args)
        const newTitle = optionalString(args.newTitle)
        const brief = optionalString(args.brief)
        const description = optionalString(args.description)
        const labels = optionalStringArray(args.labels)
        if (newTitle === undefined && brief === undefined && description === undefined && labels === undefined) {
          throw new Error("newTitle, brief, description, or labels is required")
        }
        const resolved = await port.resolveTask(query)
        const updated = await port.updateTask(resolved.id, {
          title: newTitle,
          brief,
          description,
          labels,
        })
        return ok({ task: await presentFromPort(port, updated.task) })
      }
      default:
        throw new Error(`Unknown tool: ${name}`)
    }
  } catch (error) {
    return fail(error)
  }
}
