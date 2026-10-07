import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import { readFileSync } from "node:fs"
import { describe, it } from "node:test"
import { fileURLToPath } from "node:url"
import { createTenantCredential } from "../auth/credentials.ts"
import { decideRequestAuth } from "../auth/decide.ts"
import { opsGateDecision } from "../auth/gate.ts"
import { createTenantSessionToken } from "../auth/tenant-session.ts"
import { FLEET_TENANT_ID } from "../db/ops-defaults.ts"
import { handleMcpHttp } from "../mcp/http.ts"
import { MCP_AUTOSCALE_HOST } from "../mcp/lookup.ts"
import { customerConnector } from "../provision/connector.ts"
import { ProvisionBuyerConflict } from "../provision/error.ts"
import { handleProvisionHttp } from "../provision/http.ts"
import {
  customerBoardPlan,
  type ProvisionBoard,
  type ProvisionPersistence,
  type ProvisionRow,
} from "../provision/provision.ts"
import { dispatchOpsApi, scopedOpsPort, type ScopedWorld } from "./access.ts"

const FLEET_SECRET = "fleet-secret-do-not-hand-to-customers"
const PROVISION_SECRET = "provision-admin-secret-for-tests-only"
const SIGNING_KEY = "customer-session-signing-key-for-isolation"
const BASE = "https://boards.example.test"
const NOW = Date.parse("2026-10-06T23:40:00.000Z")
const FOREIGN = /Alpha only card|Beta only card|Beta private card|Fleet only card|Alpha only ask|Beta only ask|Fleet only ask/

function read(path: string) {
  return readFileSync(new URL(path, import.meta.url), "utf8")
}

function world(): ScopedWorld {
  return {
    boards: [
      { id: "fleet-board", tenantId: "fleet", slug: "ops", title: "Ops" },
      { id: "alpha-board", tenantId: "alpha", slug: "ops", title: "Alpha Ops" },
      { id: "beta-board", tenantId: "beta", slug: "ops", title: "Beta Ops" },
      { id: "beta-private-board", tenantId: "beta", slug: "beta-private", title: "Beta Private" },
    ],
    columns: [
      { id: "fleet-need", tenantId: "fleet", boardId: "fleet-board", title: "Need you", order: 0 },
      { id: "alpha-need", tenantId: "alpha", boardId: "alpha-board", title: "Need you", order: 0 },
      { id: "alpha-on", tenantId: "alpha", boardId: "alpha-board", title: "I'm on", order: 1 },
      { id: "beta-need", tenantId: "beta", boardId: "beta-board", title: "Need you", order: 0 },
      { id: "beta-on", tenantId: "beta", boardId: "beta-board", title: "I'm on", order: 1 },
      { id: "beta-private-need", tenantId: "beta", boardId: "beta-private-board", title: "Need you", order: 0 },
    ],
    tasks: [
      task("fleet-task", "fleet", "fleet-board", "fleet-need", "Fleet only card", "Fleet only ask"),
      task("alpha-task", "alpha", "alpha-board", "alpha-need", "Alpha only card", "Alpha only ask"),
      task("beta-task", "beta", "beta-board", "beta-need", "Beta only card", "Beta only ask"),
      task("beta-private-task", "beta", "beta-private-board", "beta-private-need", "Beta private card", "Beta only ask"),
    ],
  }
}

function task(
  id: string,
  tenantId: string,
  boardId: string,
  columnId: string,
  title: string,
  description: string,
): ScopedWorld["tasks"][number] {
  return {
    id,
    tenantId,
    boardId,
    columnId,
    title,
    description,
    brief: "",
    labels: [],
    order: 0,
    archived: false,
    createdAt: "2026-10-06T00:00:00.000Z",
    completedAt: null,
    closeSubStatus: null,
  }
}

function snapshot(data: ScopedWorld) {
  return JSON.stringify(data)
}

function assertNoForeign(body: unknown, pattern: RegExp = FOREIGN) {
  assert.doesNotMatch(JSON.stringify(body), pattern)
}

async function actor(input: { cookie?: string; presented?: string; records: Awaited<ReturnType<typeof createTenantCredential>>["record"][] }) {
  return decideRequestAuth({
    cookie: input.cookie,
    presented: input.presented,
    fleetSecret: FLEET_SECRET,
    signingKey: SIGNING_KEY,
    records: input.records,
    devGateOpen: false,
    now: NOW,
  })
}

async function mcp(
  data: ScopedWorld,
  records: Awaited<ReturnType<typeof createTenantCredential>>["record"][],
  secret: string,
  name: string,
  args: Record<string, unknown>,
  options?: { bindTenant?: boolean },
) {
  let fleetCalls = 0
  const fleetPort = scopedOpsPort(data, "fleet")
  const response = await handleMcpHttp(
    new Request("https://boards.example.test/mcp", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
        authorization: `Bearer ${secret}`,
        "x-tenant-id": "fleet",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: { name, arguments: args },
      }),
    }),
    {
      expectedSecret: FLEET_SECRET,
      port: {
        async listBoard(slug?: string) {
          fleetCalls += 1
          return fleetPort.listBoard(slug)
        },
        insertTask: fleetPort.insertTask,
        resolveTask: fleetPort.resolveTask,
        moveTask: fleetPort.moveTask,
        updateTask: fleetPort.updateTask,
        archiveTask: fleetPort.archiveTask,
      },
      customerCredentials: records,
      portForTenant: options?.bindTenant === false ? undefined : (tenantId) => scopedOpsPort(data, tenantId),
    },
  )
  const body = await response.json()
  return { status: response.status, body, text: JSON.stringify(body), fleetCalls }
}

function memoryStore() {
  const rows: ProvisionRow[] = []
  const boards = new Map<string, ProvisionBoard>()
  const persistence: ProvisionPersistence = {
    async findByBuyerId(buyerId) {
      return rows.find((row) => row.externalBuyerId === buyerId) ?? null
    },
    async tenantExists(tenantId) {
      return rows.some((row) => row.tenantId === tenantId)
    },
    async insertCredential(row) {
      if (rows.some((existing) => existing.externalBuyerId === row.externalBuyerId)) throw new ProvisionBuyerConflict()
      rows.push(row)
    },
    async ensureDefaultBoard(tenantId) {
      const existing = boards.get(tenantId)
      if (existing) return existing
      const plan = customerBoardPlan(tenantId)
      const board: ProvisionBoard = {
        id: `board-${tenantId}`,
        tenantId,
        slug: plan.slug,
        title: plan.title,
        columns: plan.columns.map((column) => ({
          id: `col-${tenantId}-${column.order}`,
          title: column.title,
          order: column.order,
        })),
      }
      boards.set(tenantId, board)
      return board
    },
  }
  return { persistence, rows, boards }
}

describe("A-vs-B isolation proof", () => {
  it("lets tenant A read only A through the browser session and the MCP bearer", async () => {
    const data = world()
    const alpha = await createTenantCredential("alpha")
    const beta = await createTenantCredential("beta")
    const records = [alpha.record, beta.record]
    const cookie = await createTenantSessionToken({ tenantId: "alpha", signingKey: SIGNING_KEY, now: NOW })
    const browser = await actor({ cookie, records })
    assert.equal(browser?.tenantId, "alpha")
    assert.notEqual(browser?.tenantId, "beta")
    assert.notEqual(browser?.tenantId, FLEET_TENANT_ID)

    const listed = dispatchOpsApi(data, {
      verifiedTenantId: browser?.tenantId,
      method: "GET",
      path: "/api/ops/board",
      query: { tenant: "beta", slug: "beta-private" },
      body: { tenant_id: "fleet" },
      headerTenant: "fleet",
    })
    assert.equal(listed.status, 200)
    assert.equal((listed.body as { board: { id: string } }).board.id, "alpha-board")
    assert.match(JSON.stringify(listed.body), /Alpha only card/)
    assertNoForeign(listed.body, /Beta only card|Beta private card|Fleet only card|Beta only ask|Fleet only ask/)

    const bearer = await actor({ presented: alpha.secret, records })
    assert.equal(bearer?.tenantId, "alpha")
    const bearerList = dispatchOpsApi(data, {
      verifiedTenantId: bearer?.tenantId,
      method: "GET",
      path: "/api/ops/board",
    })
    assert.equal(bearerList.status, 200)
    assert.match(JSON.stringify(bearerList.body), /Alpha only card/)
    assertNoForeign(bearerList.body, /Beta only card|Beta private card|Fleet only card/)

    const mcpList = await mcp(data, records, alpha.secret, "list_board", { slug: "ops" })
    assert.equal(mcpList.status, 200)
    assert.equal(mcpList.fleetCalls, 0)
    assert.match(mcpList.text, /Alpha only card/)
    assert.doesNotMatch(mcpList.text, /Beta only card|Beta private card|Fleet only card|Fleet only ask|Beta only ask/)
    assert.equal(mcpList.text.includes(alpha.secret), false)
    assert.equal(mcpList.text.includes(FLEET_SECRET), false)
  })

  it("hard-fails tenant A on B boardId, taskId, and slug without returning B rows", async () => {
    const data = world()
    const before = snapshot(data)
    const alpha = await createTenantCredential("alpha")
    const beta = await createTenantCredential("beta")
    const records = [alpha.record, beta.record]
    const cookie = await createTenantSessionToken({ tenantId: "alpha", signingKey: SIGNING_KEY, now: NOW })
    const browser = await actor({ cookie, records })
    assert.equal(browser?.tenantId, "alpha")

    const byBoard = dispatchOpsApi(data, {
      verifiedTenantId: browser?.tenantId,
      method: "GET",
      path: "/api/ops/board",
      query: { boardId: "beta-board" },
    })
    const byPrivate = dispatchOpsApi(data, {
      verifiedTenantId: browser?.tenantId,
      method: "GET",
      path: "/api/ops/board",
      query: { boardId: "beta-private" },
    })
    const byTask = dispatchOpsApi(data, {
      verifiedTenantId: browser?.tenantId,
      method: "PATCH",
      path: "/api/ops/tasks/beta-task",
      body: { title: "stolen", tenant_id: "beta" },
    })
    const byMove = dispatchOpsApi(data, {
      verifiedTenantId: browser?.tenantId,
      method: "POST",
      path: "/api/ops/tasks/beta-private-task/move",
      body: { columnId: "beta-on" },
    })
    for (const result of [byBoard, byPrivate, byTask, byMove]) {
      assert.equal(result.status, 403)
      assert.deepEqual(result.body, { error: "Forbidden" })
      assertNoForeign(result.body)
    }
    assert.equal(snapshot(data), before)

    const bySlug = await mcp(data, records, alpha.secret, "list_board", { slug: "beta-private" })
    assert.equal(bySlug.status, 200)
    assert.equal(bySlug.body.result.isError, true)
    assert.equal(bySlug.body.result.content[0].text, "Forbidden")
    assert.doesNotMatch(bySlug.text, /Beta private card|Beta only card|Fleet only card/)
    assert.equal(bySlug.fleetCalls, 0)

    const byMcpTask = await mcp(data, records, alpha.secret, "move_task", { id: "beta-task", column: "I'm on" })
    assert.equal(byMcpTask.body.result.isError, true)
    assert.equal(byMcpTask.body.result.content[0].text, "Forbidden")
    assert.doesNotMatch(byMcpTask.text, /Beta only card|Beta only ask/)
    assert.equal(snapshot(data), before)

    const missing = await actor({ presented: "not-a-tenant-secret", records })
    assert.equal(missing, null)
    const denied = dispatchOpsApi(data, {
      verifiedTenantId: null,
      method: "GET",
      path: "/api/ops/board",
      query: { boardId: "beta-board", tenant: "beta" },
    })
    assert.equal(denied.status, 401)
    assert.deepEqual(denied.body, { error: "Unauthorized" })
    assertNoForeign(denied.body)

    const wrongMcp = await mcp(data, records, "not-a-tenant-secret", "list_board", { slug: "ops" })
    assert.equal(wrongMcp.status, 401)
    assert.equal(wrongMcp.body.error, "Unauthorized")
    assert.doesNotMatch(wrongMcp.text, FOREIGN)
    assert.equal(wrongMcp.fleetCalls, 0)
  })

  it("returns an empty board for a tenant with no rows instead of another tenant", async () => {
    const data = world()
    const gamma = await createTenantCredential("gamma")
    const alpha = await createTenantCredential("alpha")
    const cookie = await createTenantSessionToken({ tenantId: "gamma", signingKey: SIGNING_KEY, now: NOW })
    const browser = await actor({ cookie, records: [gamma.record, alpha.record] })
    assert.equal(browser?.tenantId, "gamma")
    const listed = dispatchOpsApi(data, {
      verifiedTenantId: browser?.tenantId,
      method: "GET",
      path: "/api/ops/board",
      query: { tenant: "alpha" },
    })
    assert.equal(listed.status, 200)
    assert.deepEqual((listed.body as { board: { columns: unknown[]; activeTasks: unknown[] } }).board.columns, [])
    assert.deepEqual((listed.body as { board: { activeTasks: unknown[] } }).board.activeTasks, [])
    assertNoForeign(listed.body)
  })

  it("keeps OPS_BOARD_SECRET on the fleet board and refuses a customer secret there", async () => {
    const data = world()
    const before = snapshot(data)
    const alpha = await createTenantCredential("alpha")
    const records = [alpha.record]
    const fleet = await actor({ presented: FLEET_SECRET, records })
    assert.equal(fleet?.tenantId, FLEET_TENANT_ID)
    const fleetBoard = dispatchOpsApi(data, {
      verifiedTenantId: fleet?.tenantId,
      method: "GET",
      path: "/api/ops/board",
    })
    assert.equal(fleetBoard.status, 200)
    assert.match(JSON.stringify(fleetBoard.body), /Fleet only card/)
    assert.doesNotMatch(JSON.stringify(fleetBoard.body), /Alpha only card|Beta only card|Beta private card/)

    const fleetCross = dispatchOpsApi(data, {
      verifiedTenantId: fleet?.tenantId,
      method: "GET",
      path: "/api/ops/board",
      query: { boardId: "alpha-board" },
    })
    assert.equal(fleetCross.status, 403)
    assert.deepEqual(fleetCross.body, { error: "Forbidden" })
    assertNoForeign(fleetCross.body)

    const customer = await actor({ presented: alpha.secret, records })
    assert.equal(customer?.tenantId, "alpha")
    const customerOnFleet = dispatchOpsApi(data, {
      verifiedTenantId: customer?.tenantId,
      method: "GET",
      path: "/api/ops/board",
      query: { boardId: "fleet-board" },
    })
    assert.equal(customerOnFleet.status, 403)
    assert.deepEqual(customerOnFleet.body, { error: "Forbidden" })
    assertNoForeign(customerOnFleet.body)

    const fleetMcp = await mcp(data, records, FLEET_SECRET, "list_board", { slug: "ops" })
    assert.equal(fleetMcp.status, 200)
    assert.match(fleetMcp.text, /Fleet only card/)
    assert.doesNotMatch(fleetMcp.text, /Alpha only card|Beta only card/)

    const customerMcp = await mcp(data, records, alpha.secret, "list_board", { slug: "fleet-board" })
    assert.equal(customerMcp.body.result.isError, true)
    assert.equal(customerMcp.body.result.content[0].text, "Forbidden")
    assert.doesNotMatch(customerMcp.text, /Fleet only card|Fleet only ask/)
    assert.equal(customerMcp.fleetCalls, 0)

    const unbound = await mcp(data, records, alpha.secret, "list_board", { slug: "ops" }, { bindTenant: false })
    assert.equal(unbound.status, 403)
    assert.equal(unbound.body.error, "Forbidden")
    assert.equal(unbound.fleetCalls, 0)
    assert.doesNotMatch(unbound.text, /Fleet only card|Alpha only card/)
    assert.equal(snapshot(data), before)

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
        fleetAuthorized: false,
        hasPresentedSecret: false,
        hasSessionCookie: true,
      }),
      "next",
    )
  })

  it("omits OPS_BOARD_SECRET from provision and refuses the fleet workers.dev origin", async () => {
    const store = memoryStore()
    const created = await handleProvisionHttp(
      new Request(`${BASE}/api/ops/provision`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${PROVISION_SECRET}`,
        },
        body: JSON.stringify({ externalBuyerId: "buyer_isolation", tenantId: "fleet" }),
      }),
      { provisionSecret: PROVISION_SECRET, fleetSecret: FLEET_SECRET, persistence: store.persistence },
    )
    assert.equal(created.status, 201)
    const body = await created.json()
    const text = JSON.stringify(body)
    assert.equal(text.includes("OPS_BOARD_SECRET"), false)
    assert.equal(text.includes(FLEET_SECRET), false)
    assert.equal(text.includes(PROVISION_SECRET), false)
    assert.equal(text.includes("productvision.workers.dev"), false)
    assert.equal(body.connector.secretEnv, "MINIKANBAN_TENANT_SECRET")
    assert.equal(body.connector.mcpUrl, `${BASE}/mcp`)
    assert.notEqual(body.tenantId, FLEET_TENANT_ID)

    const refused = await handleProvisionHttp(
      new Request(`${MCP_AUTOSCALE_HOST}/api/ops/provision`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${PROVISION_SECRET}`,
        },
        body: JSON.stringify({ externalBuyerId: "buyer_fleet_host" }),
      }),
      { provisionSecret: PROVISION_SECRET, fleetSecret: FLEET_SECRET, persistence: store.persistence },
    )
    assert.equal(refused.status, 400)
    assert.equal(store.rows.some((row) => row.externalBuyerId === "buyer_fleet_host"), false)
    assert.throws(() => customerConnector(MCP_AUTOSCALE_HOST), /fleet board host/)
  })
})

describe("A-vs-B proof files", () => {
  it("states the multi-customer model and the sell hold in the README", () => {
    const readme = read("../../README.md")
    assert.match(readme, /multi-customer/)
    assert.match(readme, /per-tenant secret/)
    assert.match(readme, /not a single-user gate forever/)
    assert.match(readme, /fleet board is not the customer connector/)
    assert.match(readme, /Dogfood on the fleet board is not an External customer/)
    assert.match(readme, /Sell HOLD stays/)
    assert.match(readme, /0006_force_rls\.sql/)
    assert.match(readme, /0007_tenant_provision\.sql/)
    assert.match(readme, /A-vs-B/)
    assert.match(readme, /docs\/a-vs-b-isolation-proof\.md/)
    assert.match(readme, /scripts\/isolation-soft-prove\.mjs/)
    assert.match(readme, /MINIKANBAN_TENANT_SECRET/)
    assert.doesNotMatch(readme, /private single-user board/)
    assert.doesNotMatch(readme, /Bearer\s+[A-Za-z0-9_-]{20,}/)
    assert.doesNotMatch(readme, /OPS_BOARD_SECRET\s*=\s*\S/)
    assert.doesNotMatch(readme, /OPS_PROVISION_SECRET\s*=\s*\S/)
    const connect = read("../../app/connect/page.tsx")
    assert.match(connect, /not a marketplace product/)
  })

  it("ships a staging checklist that refuses the production worker", () => {
    const scriptPath = fileURLToPath(new URL("../../scripts/isolation-soft-prove.mjs", import.meta.url))
    const source = readFileSync(scriptPath, "utf8")
    const doc = read("../../docs/a-vs-b-isolation-proof.md")
    assert.match(doc, /Browser session/)
    assert.match(doc, /MCP bearer/)
    assert.match(doc, /does not apply Neon migrations/)
    assert.match(doc, /minikanban-ops\.productvision\.workers\.dev/)
    assert.match(doc, /External customer/)
    assert.match(doc, /synthetic/)
    assert.match(source, /does not apply Neon migrations/)
    assert.match(source, /Refusing production host/)
    assert.doesNotMatch(source, /drizzle-kit/)
    assert.doesNotMatch(source, /ENABLE ROW LEVEL SECURITY/)
    assert.doesNotMatch(source, /execSync|execFile|spawn\(/)
    assert.doesNotMatch(source, /OPS_BOARD_SECRET\s*=\s*["'][^"']+["']/)
    assert.doesNotMatch(doc, /OPS_BOARD_SECRET\s*=\s*\S/)

    const env = {
      ...process.env,
      OPS_PROVISION_SECRET: "",
      OPS_BOARD_SECRET: "",
      OPS_APPLY_MIGRATIONS: "",
      STAGING_BASE_URL: "",
    }
    const printed = spawnSync(process.execPath, [scriptPath], { encoding: "utf8", env })
    assert.equal(printed.status, 0)
    assert.equal(printed.stdout, doc.endsWith("\n") ? doc : `${doc}\n`)

    const checked = spawnSync(process.execPath, [scriptPath, "--self-check"], { encoding: "utf8", env })
    assert.equal(checked.status, 0, checked.stderr)
    assert.match(checked.stdout, /PASS  self-check/)

    const production = spawnSync(process.execPath, [scriptPath, "--run"], {
      encoding: "utf8",
      env: { ...env, STAGING_BASE_URL: "https://minikanban-ops.productvision.workers.dev/mcp", OPS_PROVISION_SECRET: PROVISION_SECRET },
    })
    assert.equal(production.status, 2)
    assert.match(production.stderr, /Refusing production host/)
    assert.doesNotMatch(production.stdout, /PASS/)
    assert.equal(production.stdout.includes(PROVISION_SECRET), false)

    const repl = spawnSync(process.execPath, [scriptPath, "--run"], {
      encoding: "utf8",
      env: { ...env, STAGING_BASE_URL: "https://mini-kanban-ops.replit.app", OPS_PROVISION_SECRET: PROVISION_SECRET },
    })
    assert.equal(repl.status, 2)
    assert.match(repl.stderr, /Refusing production host/)

    const neon = spawnSync(process.execPath, [scriptPath, "--run"], {
      encoding: "utf8",
      env: { ...env, STAGING_BASE_URL: "https://ep-example.neon.tech/sql", OPS_PROVISION_SECRET: PROVISION_SECRET },
    })
    assert.equal(neon.status, 2)
    assert.match(neon.stderr, /does not apply migrations/)

    const missing = spawnSync(process.execPath, [scriptPath, "--run"], {
      encoding: "utf8",
      env: { ...env, STAGING_BASE_URL: "https://staging.example.test" },
    })
    assert.equal(missing.status, 2)
    assert.match(missing.stderr, /OPS_PROVISION_SECRET is unset/)
    assert.doesNotMatch(missing.stdout, /PASS/)
  })
})
