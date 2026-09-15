import assert from "node:assert/strict"
import { describe, it } from "node:test"
import type { OpsApiBoard, OpsApiTask } from "../types.ts"
import { dispatchMcpMessage, parseMcpJson } from "./protocol.ts"
import type { OpsToolPort } from "./tools.ts"

const sample: OpsApiTask = {
  id: "t1",
  title: "Ship MCP",
  description: "",
  brief: "",
  labels: [],
  order: 0,
  columnId: "need",
}

const port: OpsToolPort = {
  async listBoard() {
    const board: OpsApiBoard = {
      id: "ops-id",
      title: "Ops",
      slug: "ops",
      columns: [{ id: "need", title: "Need you", order: 0, tasks: [sample] }],
    }
    return board
  },
  async insertTask() {
    return { task: sample, columnId: "need", skipped: false }
  },
  async resolveTask() {
    return sample
  },
  async moveTask() {
    return { task: sample }
  },
  async updateTask() {
    return { task: sample }
  },
  async archiveTask() {
    return { task: sample }
  },
}

describe("MCP JSON-RPC protocol", () => {
  it("initializes Streamable HTTP with tools capability and no secret in instructions-as-args", async () => {
    const { responses } = await dispatchMcpMessage(
      {
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: { protocolVersion: "2025-03-26", capabilities: {}, clientInfo: { name: "test", version: "1" } },
      },
      port,
    )
    const result = responses[0].result as {
      protocolVersion: string
      capabilities: { tools: object }
      serverInfo: { name: string }
      instructions: string
    }
    assert.equal(responses[0].error, undefined)
    assert.equal(result.protocolVersion, "2025-03-26")
    assert.ok(result.capabilities.tools)
    assert.equal(result.serverInfo.name, "minikanban-ops")
    assert.match(result.instructions, /Authorization: Bearer/)
    assert.match(result.instructions, /never take the secret/i)
  })

  it("lists the six ops tools", async () => {
    const { responses } = await dispatchMcpMessage({ jsonrpc: "2.0", id: 2, method: "tools/list" }, port)
    const tools = (responses[0].result as { tools: Array<{ name: string }> }).tools.map((tool) => tool.name)
    assert.deepEqual(tools, ["list_board", "insert_task", "move_task", "done_task", "archive_task", "update_task"])
  })

  it("calls list_board", async () => {
    const { responses } = await dispatchMcpMessage(
      { jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "list_board", arguments: {} } },
      port,
    )
    const text = (responses[0].result as { content: Array<{ text: string }> }).content[0].text
    assert.match(text, /Ship MCP/)
  })

  it("treats notifications as no-response", async () => {
    const { notificationOnly, responses } = await dispatchMcpMessage(
      { jsonrpc: "2.0", method: "notifications/initialized" },
      port,
    )
    assert.equal(notificationOnly, true)
    assert.equal(responses.length, 0)
  })

  it("returns parse errors for invalid JSON", () => {
    const parsed = parseMcpJson("{nope")
    assert.equal(parsed.ok, false)
  })
})
