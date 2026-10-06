import {
  DONE_COLUMN_TITLE,
  OPS_MCP_BOARD_SLUG,
  OPS_MCP_COLUMNS,
  columnTitleForTask,
  isOpsColumnTitle,
  presentOpsBoard,
  presentOpsTask,
  type PresentedOpsTask,
} from "./lookup.ts"
import { CLOSE_SUB_STATUSES, isCloseSubStatus, closeSubStatusError } from "../close-sub-status.ts"
import { requireTaskDescription } from "../task-description.ts"
import { isDoneColumnTitle } from "../task-dates.ts"
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
    closeSubStatus?: string
  }) => Promise<{ task: OpsApiTask; columnId: string; skipped: boolean }>
  resolveTask: (query: { id?: string; title?: string }) => Promise<OpsApiTask>
  moveTask: (
    taskId: string,
    input: { columnTitle?: string; columnId?: string; closeSubStatus?: string | null },
  ) => Promise<{ task: OpsApiTask }>
  updateTask: (
    taskId: string,
    input: { title?: string; brief?: string; description?: string; labels?: string[]; closeSubStatus?: string | null },
  ) => Promise<{ task: OpsApiTask }>
  archiveTask: (taskId: string) => Promise<{ task: OpsApiTask }>
}

const COLUMN_ENUM = [...OPS_MCP_COLUMNS]

const SECRET_PARAM_KEYS = ["secret", "token", "password", "authorization", "ops_board_secret", "opsBoardSecret"]

export const MCP_TOOL_DEFINITIONS = [
  {
    name: "list_board",
    description:
      "List columns and active tasks on the MiniKanban Ops board. Default slug is ops. Includes title, brief, description, column, project labels, createdAt, completedAt, and closeSubStatus. Does not take OPS_BOARD_SECRET — the connector stores that.",
    inputSchema: {
      type: "object",
      properties: {
        slug: {
          type: "string",
          description:
            "Board slug inside the authenticated tenant. Defaults to ops. Another tenant's slug or id is rejected.",
          default: OPS_MCP_BOARD_SLUG,
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: "insert_task",
    description:
      "Insert a task on the ops board. description is required (the full ask; empty or placeholder text is rejected). Skips (idempotent) if an active task with the same title already exists — a skip does not overwrite that card; use update_task to fill an empty description. columnTitle defaults to Need you. closeSubStatus is required when columnTitle is Done. Never pass OPS_BOARD_SECRET as an argument.",
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
        description: {
          type: "string",
          description: "Full ask shown when the card is opened. Required. Empty or placeholder text is rejected.",
        },
        labels: {
          type: "array",
          items: { type: "string" },
          description: "Project labels (Giant, Paylyte, MiniKanban, …).",
        },
        closeSubStatus: {
          type: "string",
          enum: [...CLOSE_SUB_STATUSES],
          description: "Required when columnTitle is Done. Closed, No Longer Needed, or Duplicate.",
        },
      },
      required: ["title", "description"],
      additionalProperties: false,
    },
  },
  {
    name: "move_task",
    description:
      "Move an active task by UUID, short id (MKB-7E3A1234), or title to Need you, I'm on, Waiting, or Done. Moving to Done requires closeSubStatus (Closed, No Longer Needed, or Duplicate) and stamps completedAt. Leaving Done clears closeSubStatus.",
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
        closeSubStatus: {
          type: "string",
          enum: [...CLOSE_SUB_STATUSES],
          description: "Required when column is Done. Closed, No Longer Needed, or Duplicate.",
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: "done_task",
    description:
      "Move an active task by id or title to Done. Requires closeSubStatus: Closed, No Longer Needed, or Duplicate. Stamps completedAt when the card enters Done and stores the close sub-status.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Task UUID or short id (MKB-7E3A1234)." },
        title: { type: "string", description: "Exact active task title if id is unknown." },
        closeSubStatus: {
          type: "string",
          enum: [...CLOSE_SUB_STATUSES],
          description: "Why the task is closing: Closed, No Longer Needed, or Duplicate.",
        },
      },
      required: ["closeSubStatus"],
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
    description:
      "Update title, brief, description, project labels, and/or closeSubStatus on an active task (by id or title). description, when sent, must be the real ask — empty or placeholder text is rejected. Omit description to leave it unchanged. closeSubStatus (Closed, No Longer Needed, Duplicate) can be set only when the card is already in Done.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Task UUID or short id (MKB-7E3A1234)." },
        title: { type: "string", description: "Current title, used to find the task when id is omitted." },
        newTitle: { type: "string", description: "Replacement title." },
        brief: { type: "string", description: "1–2 line card-face summary." },
        description: {
          type: "string",
          description: "Full ask shown when the card is opened. Must be non-empty. Omit to leave unchanged.",
        },
        labels: {
          type: "array",
          items: { type: "string" },
          description: "Replacement project labels.",
        },
        closeSubStatus: {
          type: "string",
          enum: [...CLOSE_SUB_STATUSES],
          description: "Close reason on a Done card: Closed, No Longer Needed, or Duplicate.",
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

function readCloseSubStatus(value: unknown, required: boolean): string | undefined {
  if (value === undefined || value === null || value === "") {
    if (required) throw new Error(closeSubStatusError(true))
    return undefined
  }
  if (typeof value !== "string" || !isCloseSubStatus(value.trim())) {
    throw new Error(closeSubStatusError(required))
  }
  return value.trim()
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
        const slug = optionalString(args.slug)?.trim() || OPS_MCP_BOARD_SLUG
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
        const description = requireTaskDescription(optionalString(args.description))
        const closeSubStatus = readCloseSubStatus(args.closeSubStatus, isDoneColumnTitle(columnTitle))
        const created = await port.insertTask({
          title,
          columnTitle,
          brief: optionalString(args.brief),
          description,
          labels: optionalStringArray(args.labels),
          closeSubStatus,
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
        const closeSubStatus = readCloseSubStatus(args.closeSubStatus, isDoneColumnTitle(columnTitle))
        const resolved = await port.resolveTask(query)
        const moved = await port.moveTask(resolved.id, { columnTitle, closeSubStatus })
        return ok({ task: await presentFromPort(port, moved.task) })
      }
      case "done_task": {
        const query = requireIdOrTitle(args)
        const closeSubStatus = readCloseSubStatus(args.closeSubStatus, true)
        const resolved = await port.resolveTask(query)
        const moved = await port.moveTask(resolved.id, { columnTitle: DONE_COLUMN_TITLE, closeSubStatus })
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
        const description =
          args.description === undefined ? undefined : requireTaskDescription(optionalString(args.description))
        const labels = optionalStringArray(args.labels)
        const closeSubStatus = args.closeSubStatus === undefined ? undefined : readCloseSubStatus(args.closeSubStatus, true)
        if (
          newTitle === undefined &&
          brief === undefined &&
          description === undefined &&
          labels === undefined &&
          closeSubStatus === undefined
        ) {
          throw new Error("newTitle, brief, description, labels, or closeSubStatus is required")
        }
        const resolved = await port.resolveTask(query)
        const updated = await port.updateTask(resolved.id, {
          title: newTitle,
          brief,
          description,
          labels,
          closeSubStatus,
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
