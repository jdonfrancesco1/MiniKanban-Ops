import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  findActiveTaskByTitle,
  findActiveTasksByTitle,
  isOpsBoardSlug,
  isOpsColumnTitle,
  presentOpsBoard,
} from "./lookup.ts"
import type { OpsApiBoard } from "../types.ts"

const board: OpsApiBoard = {
  id: "ops-id",
  title: "Ops",
  slug: "ops",
  columns: [
    {
      id: "need",
      title: "Need you",
      order: 0,
      tasks: [
        {
          id: "t1",
          title: "Ship MCP",
          description: "Full ask",
          brief: "Wire /mcp",
          labels: ["MiniKanban"],
          order: 0,
          columnId: "need",
          createdAt: "2026-09-14T16:00:00.000Z",
          completedAt: null,
        },
      ],
    },
    { id: "done", title: "Done", order: 3, tasks: [] },
  ],
}

describe("ops MCP lookup", () => {
  it("defaults and accepts the ops slug", () => {
    assert.equal(isOpsBoardSlug(undefined), true)
    assert.equal(isOpsBoardSlug("OPS"), true)
    assert.equal(isOpsBoardSlug("other"), false)
  })

  it("recognizes the four ops columns", () => {
    assert.equal(isOpsColumnTitle("Need you"), true)
    assert.equal(isOpsColumnTitle("i'm on"), true)
    assert.equal(isOpsColumnTitle("Waiting"), true)
    assert.equal(isOpsColumnTitle("Done"), true)
    assert.equal(isOpsColumnTitle("Backlog"), false)
  })

  it("matches active titles case-insensitively for idempotent insert", () => {
    const tasks = board.columns[0].tasks
    assert.equal(findActiveTaskByTitle(tasks, "ship mcp")?.id, "t1")
    assert.equal(findActiveTasksByTitle(tasks, " missing ").length, 0)
  })

  it("presents title, brief, description, column, labels, and dates", () => {
    const presented = presentOpsBoard(board)
    assert.equal(presented.slug, "ops")
    assert.equal(presented.columns[0].tasks[0].title, "Ship MCP")
    assert.equal(presented.columns[0].tasks[0].brief, "Wire /mcp")
    assert.equal(presented.columns[0].tasks[0].description, "Full ask")
    assert.equal(presented.columns[0].tasks[0].column, "Need you")
    assert.deepEqual(presented.columns[0].tasks[0].labels, ["MiniKanban"])
    assert.equal(presented.columns[0].tasks[0].createdAt, "2026-09-14T16:00:00.000Z")
    assert.equal(presented.columns[0].tasks[0].completedAt, null)
  })
})
