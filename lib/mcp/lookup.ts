import { OPS_COLUMN_TITLES } from "../db/ops-defaults.ts"
import type { OpsApiBoard, OpsApiTask } from "../types.ts"

export const OPS_MCP_BOARD_SLUG = "ops"
export const OPS_MCP_COLUMNS = OPS_COLUMN_TITLES
export const DONE_COLUMN_TITLE = "Done"
export const MCP_PUBLIC_PATH = "/mcp"
export const MCP_ALIAS_PATH = "/api/mcp"
export const MCP_AUTOSCALE_HOST = "https://mini-kanban-ops.replit.app"
export const MCP_AUTOSCALE_URL = `${MCP_AUTOSCALE_HOST}${MCP_PUBLIC_PATH}`

export type OpsColumnTitle = (typeof OPS_COLUMN_TITLES)[number]

export function normalizeOpsTitle(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase()
}

export function isOpsBoardSlug(slug: string | null | undefined) {
  const value = normalizeOpsTitle(slug || OPS_MCP_BOARD_SLUG)
  return value === OPS_MCP_BOARD_SLUG
}

export function isOpsColumnTitle(value: string | null | undefined): value is OpsColumnTitle {
  const needle = normalizeOpsTitle(value)
  return OPS_MCP_COLUMNS.some((title) => normalizeOpsTitle(title) === needle)
}

export function findActiveTasksByTitle<T extends { title: string }>(tasks: T[], title: string): T[] {
  const needle = normalizeOpsTitle(title)
  if (!needle) return []
  return tasks.filter((task) => normalizeOpsTitle(task.title) === needle)
}

export function findActiveTaskByTitle<T extends { title: string }>(tasks: T[], title: string): T | undefined {
  return findActiveTasksByTitle(tasks, title)[0]
}

export type PresentedOpsTask = {
  id: string
  title: string
  brief: string
  description: string
  column: string
  columnId: string
  labels: string[]
  createdAt: string | null
  completedAt: string | null
}

export type PresentedOpsBoard = {
  slug: string
  title: string
  columns: Array<{
    id: string
    title: string
    order: number
    tasks: PresentedOpsTask[]
  }>
}

export function presentOpsTask(task: OpsApiTask, columnTitle: string): PresentedOpsTask {
  return {
    id: task.id,
    title: task.title,
    brief: task.brief ?? "",
    description: task.description ?? "",
    column: columnTitle,
    columnId: task.columnId,
    labels: Array.isArray(task.labels) ? task.labels : [],
    createdAt: task.createdAt ?? null,
    completedAt: task.completedAt ?? null,
  }
}

export function presentOpsBoard(board: OpsApiBoard): PresentedOpsBoard {
  const columns = board.columns.map((column) => ({
    id: column.id,
    title: column.title,
    order: column.order,
    tasks: column.tasks.map((task) => presentOpsTask(task, column.title)),
  }))
  return {
    slug: board.slug ?? OPS_MCP_BOARD_SLUG,
    title: board.title,
    columns,
  }
}

export function columnTitleForTask(board: OpsApiBoard, task: OpsApiTask): string {
  return board.columns.find((column) => column.id === task.columnId)?.title ?? ""
}
