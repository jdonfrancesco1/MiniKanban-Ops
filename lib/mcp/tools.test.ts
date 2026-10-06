import assert from "node:assert/strict"
import { describe, it } from "node:test"
import type { OpsApiBoard, OpsApiTask } from "../types.ts"
import { findActiveTaskByTitle } from "./lookup.ts"
import { taskRefMatches } from "../task-short-id.ts"
import {
  MCP_TOOL_DEFINITIONS,
  MCP_TOOL_NAMES,
  mcpToolHasSecretParam,
  runMcpTool,
  type OpsToolPort,
} from "./tools.ts"

function task(overrides: Partial<OpsApiTask> = {}): OpsApiTask {
  return {
    id: "t1",
    title: "Ship MCP",
    description: "Full ask",
    brief: "Wire /mcp",
    labels: ["MiniKanban"],
    order: 0,
    columnId: "need",
    createdAt: "2026-09-14T16:00:00.000Z",
    completedAt: null,
    ...overrides,
  }
}

function mockPort(seed: OpsApiTask[] = [task()]): OpsToolPort & { tasks: OpsApiTask[] } {
  const tasks = seed.map((item) => ({ ...item }))
  const columns = [
    { id: "need", title: "Need you" },
    { id: "on", title: "I'm on" },
    { id: "wait", title: "Waiting" },
    { id: "done", title: "Done" },
  ]

  const board = (): OpsApiBoard => ({
    id: "ops-id",
    title: "Ops",
    slug: "ops",
    columns: columns.map((column, order) => ({
      ...column,
      order,
      tasks: tasks.filter((item) => item.columnId === column.id),
    })),
    activeTasks: tasks,
  })

  return {
    tasks,
    async listBoard() {
      return board()
    },
    async insertTask(input) {
      const existing = findActiveTaskByTitle(tasks, input.title)
      if (existing) return { task: existing, columnId: existing.columnId, skipped: true }
      const column = columns.find((item) => item.title === (input.columnTitle || "Need you")) ?? columns[0]
      const created = task({
        id: `t${tasks.length + 1}`,
        title: input.title,
        brief: input.brief ?? "",
        description: input.description ?? "",
        labels: input.labels ?? [],
        columnId: column.id,
      })
      tasks.push(created)
      return { task: created, columnId: column.id, skipped: false }
    },
    async resolveTask(query) {
      if (query.id) {
        const found = tasks.find((item) => taskRefMatches(item.id, query.id ?? ""))
        if (!found) throw new Error("Task not found")
        return found
      }
      const found = findActiveTaskByTitle(tasks, query.title ?? "")
      if (!found) throw new Error("Task not found")
      return found
    },
    async moveTask(taskId, input) {
      const found = tasks.find((item) => item.id === taskId)
      if (!found) throw new Error("Task not found")
      const column = columns.find((item) => item.title === input.columnTitle)
      if (!column) throw new Error("Column not found")
      found.columnId = column.id
      const done = column.title === "Done"
      found.completedAt = done ? found.completedAt || "2026-09-15T16:00:00.000Z" : null
      found.closeSubStatus = done ? input.closeSubStatus ?? found.closeSubStatus ?? null : null
      return { task: found }
    },
    async updateTask(taskId, input) {
      const found = tasks.find((item) => item.id === taskId)
      if (!found) throw new Error("Task not found")
      if (input.title !== undefined) found.title = input.title
      if (input.brief !== undefined) found.brief = input.brief
      if (input.description !== undefined) found.description = input.description
      if (input.labels !== undefined) found.labels = input.labels
      if (input.closeSubStatus !== undefined) found.closeSubStatus = input.closeSubStatus
      return { task: found }
    },
    async archiveTask(taskId) {
      const index = tasks.findIndex((item) => item.id === taskId)
      if (index < 0) throw new Error("Task not found")
      const [removed] = tasks.splice(index, 1)
      return { task: removed }
    },
  }
}

function parse(result: { content: Array<{ type: string; text: string }>; isError?: boolean }) {
  assert.equal(result.isError, undefined)
  return JSON.parse(result.content[0].text) as Record<string, unknown>
}

describe("MCP tool definitions", () => {
  it("covers list/insert/move/done/archive/update", () => {
    assert.deepEqual(
      MCP_TOOL_DEFINITIONS.map((tool) => tool.name),
      [...MCP_TOOL_NAMES],
    )
  })

  it("never takes OPS_BOARD_SECRET or any secret as a tool parameter", () => {
    for (const tool of MCP_TOOL_DEFINITIONS) {
      assert.equal(mcpToolHasSecretParam(tool), false)
      const keys = Object.keys(tool.inputSchema.properties ?? {})
      assert.ok(!keys.some((key) => /secret|token|password|authorization/i.test(key)))
    }
  })
})

describe("MCP tool handlers", () => {
  it("list_board returns columns and task fields", async () => {
    const payload = parse(await runMcpTool("list_board", { slug: "ops" }, mockPort()))
    const columns = payload.columns as Array<{ title: string; tasks: Array<Record<string, unknown>> }>
    assert.equal(payload.slug, "ops")
    assert.equal(columns[0].title, "Need you")
    assert.equal(columns[0].tasks[0].title, "Ship MCP")
    assert.equal(columns[0].tasks[0].brief, "Wire /mcp")
    assert.equal(columns[0].tasks[0].description, "Full ask")
    assert.equal(columns[0].tasks[0].column, "Need you")
    assert.deepEqual(columns[0].tasks[0].labels, ["MiniKanban"])
    assert.equal(columns[0].tasks[0].createdAt, "2026-09-14T16:00:00.000Z")
    assert.equal(columns[0].tasks[0].completedAt, null)
    assert.equal(columns[0].tasks[0].closeSubStatus, null)
    assert.equal(columns[0].tasks[0].shortId, "MKB-T1000000")
  })

  it("insert_task skips when an active title already exists", async () => {
    const port = mockPort()
    const skipped = parse(
      await runMcpTool(
        "insert_task",
        { title: "ship mcp", columnTitle: "Need you", description: "Already asked" },
        port,
      ),
    )
    assert.equal(skipped.skipped, true)
    assert.equal(port.tasks.length, 1)
    const created = parse(
      await runMcpTool(
        "insert_task",
        {
          title: "New ask",
          columnTitle: "I'm on",
          brief: "Do it",
          description: "Ship the remote board and write down the ask.",
          labels: ["Giant"],
        },
        port,
      ),
    )
    assert.equal(created.skipped, false)
    assert.equal(port.tasks.length, 2)
    assert.equal((created.task as { column: string }).column, "I'm on")
  })

  it("move_task resolves a short card id", async () => {
    const port = mockPort([
      task({ id: "7e3a1234-5678-4abc-8def-0123456789ab", title: "Named card", columnId: "need" }),
    ])
    const moved = parse(
      await runMcpTool("move_task", { id: "MKB-7E3A", column: "Done", closeSubStatus: "Duplicate" }, port),
    )
    assert.equal((moved.task as { column: string; shortId: string }).column, "Done")
    assert.equal((moved.task as { shortId: string }).shortId, "MKB-7E3A1234")
    assert.equal((moved.task as { closeSubStatus: string }).closeSubStatus, "Duplicate")
  })

  it("move_task and done_task resolve by title and stamp Done", async () => {
    const port = mockPort()
    const moved = parse(await runMcpTool("move_task", { title: "Ship MCP", column: "Waiting" }, port))
    assert.equal((moved.task as { column: string }).column, "Waiting")
    const missingStatus = await runMcpTool("done_task", { title: "Ship MCP" }, port)
    assert.equal(missingStatus.isError, true)
    assert.match(missingStatus.content[0].text, /closeSubStatus is required/)
    const done = parse(await runMcpTool("done_task", { title: "Ship MCP", closeSubStatus: "Closed" }, port))
    assert.equal((done.task as { column: string; completedAt: string }).column, "Done")
    assert.equal((done.task as { completedAt: string }).completedAt, "2026-09-15T16:00:00.000Z")
    assert.equal((done.task as { closeSubStatus: string }).closeSubStatus, "Closed")
    const invalid = await runMcpTool("move_task", { title: "Ship MCP", column: "Done", closeSubStatus: "Archived" }, port)
    assert.equal(invalid.isError, true)
    assert.match(invalid.content[0].text, /must be one of: Closed, No Longer Needed, Duplicate/)
  })

  it("archive_task soft-removes the active card", async () => {
    const port = mockPort()
    const archived = parse(await runMcpTool("archive_task", { id: "t1" }, port))
    assert.equal(archived.archived, true)
    assert.equal(port.tasks.length, 0)
  })

  it("update_task patches brief, description, and labels", async () => {
    const port = mockPort()
    const updated = parse(
      await runMcpTool(
        "update_task",
        { title: "Ship MCP", newTitle: "Ship remote MCP", brief: "Docs", description: "Longer", labels: ["Giant"] },
        port,
      ),
    )
    const taskPayload = updated.task as { title: string; brief: string; labels: string[] }
    assert.equal(taskPayload.title, "Ship remote MCP")
    assert.equal(taskPayload.brief, "Docs")
    assert.deepEqual(taskPayload.labels, ["Giant"])
  })

  it("rejects empty and placeholder descriptions on create, and accepts a filled update", async () => {
    const port = mockPort()
    const missing = await runMcpTool("insert_task", { title: "No ask" }, port)
    assert.equal(missing.isError, true)
    assert.match(missing.content[0].text, /Description is required/)
    const placeholder = await runMcpTool(
      "insert_task",
      { title: "Placeholder", description: "No description yet. Edit the card to add the full ask." },
      port,
    )
    assert.equal(placeholder.isError, true)
    assert.equal(port.tasks.length, 1)

    const cleared = await runMcpTool("update_task", { title: "Ship MCP", description: "   " }, port)
    assert.equal(cleared.isError, true)
    assert.equal(port.tasks[0].description, "Full ask")

    const filled = parse(
      await runMcpTool("update_task", { id: "t1", description: "The real ask James should do." }, port),
    )
    assert.equal((filled.task as { description: string }).description, "The real ask James should do.")
  })

  it("returns a tool error for unknown tools and missing fields", async () => {
    const port = mockPort()
    const unknown = await runMcpTool("wipe_board", {}, port)
    assert.equal(unknown.isError, true)
    const missing = await runMcpTool("insert_task", {}, port)
    assert.equal(missing.isError, true)
  })
})
