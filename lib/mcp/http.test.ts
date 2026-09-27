import assert from "node:assert/strict"
import { describe, it } from "node:test"
import type { OpsApiBoard, OpsApiTask } from "../types.ts"
import { handleMcpHttp } from "./http.ts"
import type { OpsToolPort } from "./tools.ts"

const sample: OpsApiTask = {
  id: "t1",
  title: "Ship MCP",
  description: "",
  brief: "",
  labels: ["MiniKanban"],
  order: 0,
  columnId: "need",
  createdAt: "2026-09-14T16:00:00.000Z",
  completedAt: null,
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
    return { task: sample, columnId: "need", skipped: true }
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

const SECRET = "ops-secret"

function post(body: unknown, headers: Record<string, string> = {}) {
  return handleMcpHttp(
    new Request("https://minikanban-ops.giantmind.workers.dev/mcp", {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(body),
    }),
    { expectedSecret: SECRET, port },
  )
}

describe("MCP HTTP auth", () => {
  it("rejects POST without a secret when OPS_BOARD_SECRET is required", async () => {
    const response = await post({ jsonrpc: "2.0", id: 1, method: "initialize", params: {} })
    assert.equal(response.status, 401)
    const payload = (await response.json()) as { error: string }
    assert.equal(payload.error, "Unauthorized")
  })

  it("rejects GET without a secret", async () => {
    const response = await handleMcpHttp(new Request("https://minikanban-ops.giantmind.workers.dev/mcp"), {
      expectedSecret: SECRET,
      port,
    })
    assert.equal(response.status, 401)
  })

  it("serves initialize when the bearer matches", async () => {
    const response = await post(
      { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-03-26" } },
      { authorization: `Bearer ${SECRET}` },
    )
    assert.equal(response.status, 200)
    const payload = (await response.json()) as { result: { serverInfo: { name: string } } }
    assert.equal(payload.result.serverInfo.name, "minikanban-ops")
    assert.ok(response.headers.get("mcp-session-id"))
  })

  it("does not accept the secret as a JSON-RPC / tool argument", async () => {
    const response = await post(
      {
        jsonrpc: "2.0",
        id: 9,
        method: "tools/call",
        params: { name: "list_board", arguments: { secret: SECRET, slug: "ops" } },
      },
    )
    assert.equal(response.status, 401)
  })
})
