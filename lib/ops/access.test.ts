import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { describe, it } from "node:test"
import { createTenantCredential } from "../auth/credentials.ts"
import { opsGateDecision } from "../auth/gate.ts"
import { handleMcpHttp } from "../mcp/http.ts"
import {
  dispatchOpsApi,
  OpsAccessError,
  sameTenant,
  scopedOpsPort,
  verifiedTenantOnly,
  type ScopedWorld,
} from "./access.ts"

function read(path: string) {
  return readFileSync(new URL(path, import.meta.url), "utf8")
}

function world(): ScopedWorld {
  return {
    boards: [
      { id: "fleet-board", tenantId: "fleet", slug: "ops", title: "Ops" },
      { id: "alpha-board", tenantId: "alpha", slug: "ops", title: "Alpha Ops" },
      { id: "beta-board", tenantId: "beta", slug: "ops", title: "Beta Ops" },
    ],
    columns: [
      { id: "fleet-need", tenantId: "fleet", boardId: "fleet-board", title: "Need you", order: 0 },
      { id: "fleet-on", tenantId: "fleet", boardId: "fleet-board", title: "I'm on", order: 1 },
      { id: "alpha-need", tenantId: "alpha", boardId: "alpha-board", title: "Need you", order: 0 },
      { id: "alpha-on", tenantId: "alpha", boardId: "alpha-board", title: "I'm on", order: 1 },
      { id: "beta-need", tenantId: "beta", boardId: "beta-board", title: "Need you", order: 0 },
      { id: "beta-on", tenantId: "beta", boardId: "beta-board", title: "I'm on", order: 1 },
    ],
    tasks: [
      {
        id: "fleet-task",
        tenantId: "fleet",
        boardId: "fleet-board",
        columnId: "fleet-need",
        title: "Fleet only card",
        description: "Fleet only ask",
        brief: "Fleet brief",
        labels: ["Fleet"],
        order: 0,
        archived: false,
        createdAt: "2026-10-06T00:00:00.000Z",
        completedAt: null,
        closeSubStatus: null,
      },
      {
        id: "alpha-task",
        tenantId: "alpha",
        boardId: "alpha-board",
        columnId: "alpha-need",
        title: "Alpha only card",
        description: "Alpha only ask",
        brief: "Alpha brief",
        labels: ["Alpha"],
        order: 0,
        archived: false,
        createdAt: "2026-10-06T00:00:00.000Z",
        completedAt: null,
        closeSubStatus: null,
      },
      {
        id: "beta-task",
        tenantId: "beta",
        boardId: "beta-board",
        columnId: "beta-need",
        title: "Beta only card",
        description: "Beta only ask",
        brief: "Beta brief",
        labels: ["Beta"],
        order: 0,
        archived: false,
        createdAt: "2026-10-06T00:00:00.000Z",
        completedAt: null,
        closeSubStatus: null,
      },
    ],
  }
}

function snapshot(data: ScopedWorld) {
  return JSON.stringify(data)
}

describe("verified tenant only", () => {
  it("ignores query, body, and header tenant hints", () => {
    assert.equal(
      verifiedTenantOnly({
        verifiedTenantId: "alpha",
        queryTenant: "beta",
        bodyTenantId: "fleet",
        headerTenant: "beta",
      }),
      "alpha",
    )
    assert.equal(sameTenant("alpha", "alpha"), true)
    assert.equal(sameTenant("alpha", "beta"), false)
    assert.equal(sameTenant("", "fleet"), false)
    assert.throws(() => verifiedTenantOnly({ verifiedTenantId: null, queryTenant: "fleet" }), OpsAccessError)
  })
})

describe("ops API tenant hard-fail", () => {
  it("returns only the authed tenant board and ignores a client tenant hint", () => {
    const data = world()
    const own = dispatchOpsApi(data, {
      verifiedTenantId: "alpha",
      method: "GET",
      path: "/api/ops/board",
      query: { tenant: "beta" },
      body: { tenant_id: "fleet" },
      headerTenant: "beta",
    })
    assert.equal(own.status, 200)
    const text = JSON.stringify(own.body)
    assert.match(text, /Alpha only card/)
    assert.doesNotMatch(text, /Beta only card|Fleet only card|Beta only ask|Fleet only ask/)
    assert.equal((own.body as { board: { id: string } }).board.id, "alpha-board")
  })

  it("hard-fails when tenant A requests tenant B boardId or taskId", () => {
    const data = world()
    const before = snapshot(data)
    const board = dispatchOpsApi(data, {
      verifiedTenantId: "alpha",
      method: "GET",
      path: "/api/ops/board",
      query: { boardId: "beta-board", tenant: "beta" },
    })
    const task = dispatchOpsApi(data, {
      verifiedTenantId: "alpha",
      method: "PATCH",
      path: "/api/ops/tasks/beta-task",
      body: { title: "stolen", tenant_id: "beta" },
    })
    const moved = dispatchOpsApi(data, {
      verifiedTenantId: "alpha",
      method: "POST",
      path: "/api/ops/tasks/beta-task/move",
      body: { columnId: "beta-on", tenantId: "beta" },
    })
    const archived = dispatchOpsApi(data, {
      verifiedTenantId: "alpha",
      method: "DELETE",
      path: "/api/ops/tasks/beta-task",
    })
    const created = dispatchOpsApi(data, {
      verifiedTenantId: "alpha",
      method: "POST",
      path: "/api/ops/tasks",
      body: { title: "planted", boardId: "beta-board", tenant_id: "beta", description: "nope" },
    })
    for (const result of [board, task, moved, archived, created]) {
      assert.equal(result.status, 403)
      assert.deepEqual(result.body, { error: "Forbidden" })
      const text = JSON.stringify(result.body)
      assert.doesNotMatch(text, /Beta only card|Beta only ask|Fleet only/)
    }
    assert.equal(snapshot(data), before)
  })

  it("lets tenant A mutate only its own task and still hides B", () => {
    const data = world()
    const moved = dispatchOpsApi(data, {
      verifiedTenantId: "alpha",
      method: "POST",
      path: "/api/ops/tasks/alpha-task/move",
      body: { columnId: "alpha-on" },
    })
    assert.equal(moved.status, 200)
    assert.equal(data.tasks.find((task) => task.id === "alpha-task")?.columnId, "alpha-on")
    assert.equal(data.tasks.find((task) => task.id === "beta-task")?.columnId, "beta-need")
    const created = dispatchOpsApi(data, {
      verifiedTenantId: "alpha",
      method: "POST",
      path: "/api/ops/tasks",
      body: { title: "Alpha new", description: "Alpha ask" },
    })
    assert.equal(created.status, 201)
    assert.equal(
      data.tasks.filter((task) => task.tenantId === "beta").length,
      1,
    )
    assert.equal(data.tasks.some((task) => task.title === "Alpha new" && task.tenantId === "alpha"), true)
  })

  it("keeps the fleet actor on fleet rows", () => {
    const data = world()
    const board = dispatchOpsApi(data, {
      verifiedTenantId: "fleet",
      method: "GET",
      path: "/api/ops/board",
    })
    assert.equal(board.status, 200)
    const text = JSON.stringify(board.body)
    assert.match(text, /Fleet only card/)
    assert.doesNotMatch(text, /Alpha only card|Beta only card/)
    const foreign = dispatchOpsApi(data, {
      verifiedTenantId: "fleet",
      method: "PATCH",
      path: "/api/ops/tasks/alpha-task",
      body: { title: "nope" },
    })
    assert.equal(foreign.status, 403)
    assert.equal(data.tasks.find((task) => task.id === "alpha-task")?.title, "Alpha only card")
  })

  it("fails closed without a verified tenant", () => {
    const result = dispatchOpsApi(world(), {
      verifiedTenantId: null,
      method: "GET",
      path: "/api/ops/board",
      query: { tenant: "fleet" },
      headerTenant: "fleet",
    })
    assert.equal(result.status, 401)
    assert.deepEqual(result.body, { error: "Unauthorized" })
  })
})

describe("MCP tenant hard-fail", () => {
  it("scopes a customer bearer to that tenant and rejects the other tenant's ids", async () => {
    const data = world()
    const alpha = await createTenantCredential("alpha", "alpha-secret-value")
    const beta = await createTenantCredential("beta", "beta-secret-value")
    let fleetCalls = 0
    const fleetPort = scopedOpsPort(data, "fleet")
    const counting = {
      async listBoard(slug?: string) {
        fleetCalls += 1
        return fleetPort.listBoard(slug)
      },
      insertTask: fleetPort.insertTask,
      resolveTask: fleetPort.resolveTask,
      moveTask: fleetPort.moveTask,
      updateTask: fleetPort.updateTask,
      archiveTask: fleetPort.archiveTask,
    }

    const list = await handleMcpHttp(
      new Request("https://minikanban-ops.productvision.workers.dev/mcp", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${alpha.secret}`,
          "x-tenant-id": "fleet",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "tools/call",
          params: { name: "list_board", arguments: { slug: "ops" } },
        }),
      }),
      {
        expectedSecret: "fleet-secret",
        port: counting,
        customerCredentials: [alpha.record, beta.record],
        portForTenant: (tenantId) => scopedOpsPort(data, tenantId),
      },
    )
    assert.equal(list.status, 200)
    assert.equal(fleetCalls, 0)
    const listed = JSON.stringify(await list.json())
    assert.match(listed, /Alpha only card/)
    assert.doesNotMatch(listed, /Fleet only card|Beta only card|Fleet only ask|Beta only ask/)

    const before = snapshot(data)
    const cross = await handleMcpHttp(
      new Request("https://minikanban-ops.productvision.workers.dev/mcp", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${alpha.secret}`,
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 2,
          method: "tools/call",
          params: {
            name: "move_task",
            arguments: { id: "beta-task", column: "I'm on" },
          },
        }),
      }),
      {
        expectedSecret: "fleet-secret",
        port: counting,
        customerCredentials: [alpha.record, beta.record],
        portForTenant: (tenantId) => scopedOpsPort(data, tenantId),
      },
    )
    assert.equal(cross.status, 200)
    const crossBody = JSON.stringify(await cross.json())
    assert.match(crossBody, /Forbidden/)
    assert.doesNotMatch(crossBody, /Beta only card|Beta only ask|Fleet only card/)
    assert.equal(snapshot(data), before)
    assert.equal(fleetCalls, 0)

    const byBoard = await handleMcpHttp(
      new Request("https://minikanban-ops.productvision.workers.dev/mcp", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${alpha.secret}`,
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 3,
          method: "tools/call",
          params: { name: "list_board", arguments: { slug: "beta-board" } },
        }),
      }),
      {
        expectedSecret: "fleet-secret",
        port: counting,
        customerCredentials: [alpha.record, beta.record],
        portForTenant: (tenantId) => scopedOpsPort(data, tenantId),
      },
    )
    const byBoardText = JSON.stringify(await byBoard.json())
    assert.match(byBoardText, /Forbidden/)
    assert.doesNotMatch(byBoardText, /Beta only card|Fleet only card/)
  })

  it("still serves the fleet board for OPS_BOARD_SECRET", async () => {
    const data = world()
    const response = await handleMcpHttp(
      new Request("https://minikanban-ops.productvision.workers.dev/mcp", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: "Bearer fleet-secret",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 4,
          method: "tools/call",
          params: { name: "list_board", arguments: { slug: "ops" } },
        }),
      }),
      {
        expectedSecret: "fleet-secret",
        port: scopedOpsPort(data, "fleet"),
        customerCredentials: [],
      },
    )
    assert.equal(response.status, 200)
    const text = JSON.stringify(await response.json())
    assert.match(text, /Fleet only card/)
    assert.doesNotMatch(text, /Alpha only card|Beta only card/)
  })
})

describe("ops gate", () => {
  it("lets a customer credential reach ops API and MCP only", () => {
    assert.equal(
      opsGateDecision({
        pathname: "/api/ops/tasks/beta-task",
        fleetAuthorized: false,
        hasPresentedSecret: true,
        hasSessionCookie: false,
      }),
      "next",
    )
    assert.equal(
      opsGateDecision({
        pathname: "/mcp",
        fleetAuthorized: false,
        hasPresentedSecret: false,
        hasSessionCookie: true,
      }),
      "next",
    )
    assert.equal(
      opsGateDecision({
        pathname: "/boards/ops",
        fleetAuthorized: false,
        hasPresentedSecret: false,
        hasSessionCookie: true,
      }),
      "redirect-login",
    )
    assert.equal(
      opsGateDecision({
        pathname: "/api/ops/board",
        fleetAuthorized: true,
        hasPresentedSecret: true,
        hasSessionCookie: false,
      }),
      "next",
    )
    assert.equal(
      opsGateDecision({
        pathname: "/api/ops/board",
        fleetAuthorized: false,
        hasPresentedSecret: false,
        hasSessionCookie: false,
      }),
      "unauthorized",
    )
  })
})

describe("app-level scope does not enable RLS", () => {
  it("keeps FORCE RLS out of executable SQL and the app scope module", () => {
    const access = read("./access.ts")
    const boards = read("../actions/boards.ts")
    const http = read("../mcp/http.ts")
    assert.match(boards, /sameTenant/)
    assert.match(boards, /eq\(tasks\.tenantId, tenantId\)/)
    assert.match(boards, /eq\(boards\.tenantId, tenantId\)/)
    assert.match(http, /portForTenant/)
    assert.doesNotMatch(access, /ENABLE ROW LEVEL SECURITY/)
    assert.doesNotMatch(access, /FORCE ROW LEVEL SECURITY/)
    assert.doesNotMatch(access, /set_config/)
    assert.doesNotMatch(boards, /ENABLE ROW LEVEL SECURITY/)
    assert.doesNotMatch(boards, /FORCE ROW LEVEL SECURITY/)
    assert.doesNotMatch(boards, /searchParams/)
    assert.doesNotMatch(boards, /x-tenant|X-Tenant/)
    assert.doesNotMatch(boards, /body\.tenantId|body\.tenant_id/)
  })
})
