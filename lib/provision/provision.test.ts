import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { describe, it } from "node:test"
import { PGlite } from "@electric-sql/pglite"
import { verifyTenantCredential } from "../auth/credentials.ts"
import { resolvePresentedSecret } from "../auth/credentials.ts"
import { FLEET_TENANT_ID } from "../db/ops-defaults.ts"
import { OPS_COLUMN_TITLES } from "../db/ops-defaults.ts"
import { handleMcpHttp } from "../mcp/http.ts"
import { MCP_AUTOSCALE_HOST } from "../mcp/lookup.ts"
import { dispatchOpsApi, scopedOpsPort, type ScopedWorld } from "../ops/access.ts"
import { customerConnector } from "./connector.ts"
import { ProvisionBuyerConflict } from "./error.ts"
import { handleProvisionHttp, provisionAuthorized } from "./http.ts"
import {
  customerBoardPlan,
  provisionCustomer,
  type ProvisionBoard,
  type ProvisionPersistence,
  type ProvisionRow,
} from "./provision.ts"

const FLEET_SECRET = "fleet-secret-do-not-hand-to-customers"
const PROVISION_SECRET = "provision-admin-secret-for-tests-only"
const BASE = "https://boards.example.test"

function read(path: string) {
  return readFileSync(new URL(path, import.meta.url), "utf8")
}

function executableSql(source: string) {
  const withoutBlock = source.replace(/\/\*[\s\S]*?\*\//g, "")
  return withoutBlock
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n")
}

type Memory = {
  persistence: ProvisionPersistence
  rows: ProvisionRow[]
  boards: Map<string, ProvisionBoard>
  failBoards(times: number): void
}

function memoryPersistence(): Memory {
  const rows: ProvisionRow[] = []
  const boards = new Map<string, ProvisionBoard>()
  let boardFailures = 0
  const persistence: ProvisionPersistence = {
    async findByBuyerId(buyerId) {
      return rows.find((row) => row.externalBuyerId === buyerId) ?? null
    },
    async tenantExists(tenantId) {
      return rows.some((row) => row.tenantId === tenantId)
    },
    async insertCredential(row) {
      if (rows.some((existing) => existing.externalBuyerId === row.externalBuyerId)) {
        throw new ProvisionBuyerConflict()
      }
      if (rows.some((existing) => existing.tenantId === row.tenantId)) {
        throw Object.assign(new Error("duplicate tenant"), { code: "23505", detail: `Key (tenant_id)=(${row.tenantId}) already exists.` })
      }
      rows.push(row)
    },
    async ensureDefaultBoard(tenantId) {
      if (boardFailures > 0) {
        boardFailures -= 1
        throw new Error("board failed")
      }
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
  return {
    persistence,
    rows,
    boards,
    failBoards(times: number) {
      boardFailures = times
    },
  }
}

function worldFrom(store: Memory): ScopedWorld {
  const boards: ScopedWorld["boards"] = [
    { id: "fleet-board", tenantId: FLEET_TENANT_ID, slug: "ops", title: "Ops" },
  ]
  const columns: ScopedWorld["columns"] = [
    { id: "fleet-need", tenantId: FLEET_TENANT_ID, boardId: "fleet-board", title: "Need you", order: 0 },
  ]
  for (const board of store.boards.values()) {
    boards.push({ id: board.id, tenantId: board.tenantId, slug: board.slug, title: board.title })
    for (const column of board.columns) {
      columns.push({
        id: column.id,
        tenantId: board.tenantId,
        boardId: board.id,
        title: column.title,
        order: column.order,
      })
    }
  }
  return {
    boards,
    columns,
    tasks: [
      {
        id: "fleet-task",
        tenantId: FLEET_TENANT_ID,
        boardId: "fleet-board",
        columnId: "fleet-need",
        title: "Fleet only card",
        description: "Fleet only ask",
        brief: "",
        labels: [],
        order: 0,
        archived: false,
        createdAt: "2026-10-06T00:00:00.000Z",
        completedAt: null,
        closeSubStatus: null,
      },
    ],
  }
}

function recordsOf(store: Memory) {
  return store.rows.map((row) => ({ tenantId: row.tenantId, salt: row.salt, verifier: row.verifier }))
}

function provisionRequest(
  body: unknown,
  headers: Record<string, string> = {},
  url = `${BASE}/api/ops/provision`,
) {
  return new Request(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${PROVISION_SECRET}`,
      ...headers,
    },
    body: JSON.stringify(body),
  })
}

describe("provision auth", () => {
  it("accepts only the provision secret and never the fleet secret", () => {
    assert.equal(provisionAuthorized(PROVISION_SECRET, { provisionSecret: PROVISION_SECRET, fleetSecret: FLEET_SECRET }), true)
    assert.equal(provisionAuthorized(FLEET_SECRET, { provisionSecret: PROVISION_SECRET, fleetSecret: FLEET_SECRET }), false)
    assert.equal(provisionAuthorized(PROVISION_SECRET, { provisionSecret: FLEET_SECRET, fleetSecret: FLEET_SECRET }), false)
    assert.equal(provisionAuthorized(null, { provisionSecret: PROVISION_SECRET, fleetSecret: FLEET_SECRET }), false)
    assert.equal(provisionAuthorized(PROVISION_SECRET, { provisionSecret: "", fleetSecret: FLEET_SECRET }), false)
  })

  it("refuses anonymous, fleet, and customer bearers", async () => {
    const store = memoryPersistence()
    const options = {
      provisionSecret: PROVISION_SECRET,
      fleetSecret: FLEET_SECRET,
      persistence: store.persistence,
    }
    const anonymous = await handleProvisionHttp(
      provisionRequest({ externalBuyerId: "buyer_a" }, { authorization: "" }),
      options,
    )
    const fleet = await handleProvisionHttp(
      provisionRequest({ externalBuyerId: "buyer_a" }, { authorization: `Bearer ${FLEET_SECRET}` }),
      options,
    )
    const headerOnly = await handleProvisionHttp(
      provisionRequest(
        { externalBuyerId: "buyer_a" },
        { authorization: "", "x-ops-board-secret": PROVISION_SECRET },
      ),
      options,
    )
    assert.equal(anonymous.status, 401)
    assert.equal(fleet.status, 401)
    assert.equal(headerOnly.status, 401)
    assert.equal(store.rows.length, 0)
    const fleetText = JSON.stringify(await fleet.json())
    assert.equal(fleetText.includes(FLEET_SECRET), false)
    assert.equal(fleetText.includes(PROVISION_SECRET), false)
  })
})

describe("customer provision", () => {
  it("mints one tenant and returns the connector secret once", async () => {
    const store = memoryPersistence()
    const first = await handleProvisionHttp(
      provisionRequest({ externalBuyerId: "buyer_a", tenantId: "fleet", tenant_id: "beta" }),
      {
        provisionSecret: PROVISION_SECRET,
        fleetSecret: FLEET_SECRET,
        persistence: store.persistence,
      },
    )
    assert.equal(first.status, 201)
    assert.equal(first.headers.get("cache-control"), "no-store")
    const created = (await first.json()) as {
      created: boolean
      tenantId: string
      board: { slug: string; columns: string[] }
      connector: { baseUrl: string; mcpUrl: string; secretEnv: string; secret: string; authorization: string }
    }
    assert.equal(created.created, true)
    assert.notEqual(created.tenantId, FLEET_TENANT_ID)
    assert.notEqual(created.tenantId, "beta")
    assert.equal(created.board.slug, "ops")
    assert.deepEqual(created.board.columns, [...OPS_COLUMN_TITLES])
    assert.equal(created.connector.baseUrl, BASE)
    assert.equal(created.connector.mcpUrl, `${BASE}/mcp`)
    assert.equal(created.connector.secretEnv, "MINIKANBAN_TENANT_SECRET")
    assert.equal(created.connector.authorization, `Bearer ${created.connector.secret}`)
    assert.equal(JSON.stringify(store.rows).includes(created.connector.secret), false)
    assert.equal(await verifyTenantCredential(created.connector.secret, store.rows[0]), true)
    const text = JSON.stringify(created)
    assert.equal(text.includes(FLEET_SECRET), false)
    assert.equal(text.includes(PROVISION_SECRET), false)
    assert.equal(text.includes("OPS_BOARD_SECRET"), false)
    assert.equal(text.includes("productvision.workers.dev"), false)

    const again = await handleProvisionHttp(
      provisionRequest({ externalBuyerId: "buyer_a" }),
      {
        provisionSecret: PROVISION_SECRET,
        fleetSecret: FLEET_SECRET,
        persistence: store.persistence,
        mintSecret() {
          throw new Error("replay must not mint")
        },
        mintTenantId() {
          throw new Error("replay must not allocate")
        },
      },
    )
    assert.equal(again.status, 200)
    const replay = (await again.json()) as { created: boolean; tenantId: string; secretReturned: boolean; connector: { secret?: string } }
    assert.equal(replay.created, false)
    assert.equal(replay.tenantId, created.tenantId)
    assert.equal(replay.secretReturned, false)
    assert.equal(replay.connector.secret, undefined)
    assert.equal(JSON.stringify(replay).includes(created.connector.secret), false)
    assert.equal(store.rows.length, 1)
    assert.equal(store.boards.size, 1)

    const other = await handleProvisionHttp(
      provisionRequest({ externalBuyerId: "buyer_b" }),
      { provisionSecret: PROVISION_SECRET, fleetSecret: FLEET_SECRET, persistence: store.persistence },
    )
    assert.equal(other.status, 201)
    const second = (await other.json()) as { tenantId: string; connector: { secret: string } }
    assert.notEqual(second.tenantId, created.tenantId)
    assert.notEqual(second.connector.secret, created.connector.secret)
    assert.equal(store.rows.length, 2)

    const world = worldFrom(store)
    const alphaTask = dispatchOpsApi(world, {
      verifiedTenantId: created.tenantId,
      method: "POST",
      path: "/api/ops/tasks",
      body: { title: "Alpha only card", description: "Alpha only ask" },
    })
    const betaTask = dispatchOpsApi(world, {
      verifiedTenantId: second.tenantId,
      method: "POST",
      path: "/api/ops/tasks",
      body: { title: "Beta only card", description: "Beta only ask" },
    })
    assert.equal(alphaTask.status, 201)
    assert.equal(betaTask.status, 201)

    const alphaBoard = dispatchOpsApi(world, {
      verifiedTenantId: created.tenantId,
      method: "GET",
      path: "/api/ops/board",
    })
    assert.equal(alphaBoard.status, 200)
    const alphaText = JSON.stringify(alphaBoard.body)
    assert.match(alphaText, /Alpha only card/)
    assert.doesNotMatch(alphaText, /Beta only card|Fleet only card/)
    assert.equal((alphaBoard.body as { board: { id: string; columns: unknown[] } }).board.id, `board-${created.tenantId}`)
    assert.equal((alphaBoard.body as { board: { columns: unknown[] } }).board.columns.length, OPS_COLUMN_TITLES.length)

    const cross = dispatchOpsApi(world, {
      verifiedTenantId: created.tenantId,
      method: "GET",
      path: "/api/ops/board",
      query: { boardId: `board-${second.tenantId}` },
    })
    assert.equal(cross.status, 403)
    assert.deepEqual(cross.body, { error: "Forbidden" })

    const records = recordsOf(store)
    const asAlpha = await resolvePresentedSecret({ presented: created.connector.secret, fleetSecret: FLEET_SECRET, records })
    const asFleet = await resolvePresentedSecret({ presented: FLEET_SECRET, fleetSecret: FLEET_SECRET, records })
    assert.deepEqual(asAlpha, { tenantId: created.tenantId, kind: "customer" })
    assert.deepEqual(asFleet, { tenantId: FLEET_TENANT_ID, kind: "fleet" })

    const listed = await handleMcpHttp(
      new Request(`${BASE}/mcp`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${created.connector.secret}` },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "tools/call",
          params: { name: "list_board", arguments: { slug: "ops" } },
        }),
      }),
      {
        expectedSecret: FLEET_SECRET,
        port: scopedOpsPort(world, FLEET_TENANT_ID),
        customerCredentials: records,
        portForTenant: (tenantId) => scopedOpsPort(world, tenantId),
      },
    )
    assert.equal(listed.status, 200)
    const listedText = JSON.stringify(await listed.json())
    assert.match(listedText, /Alpha only card/)
    assert.doesNotMatch(listedText, /Beta only card|Fleet only card|${FLEET_SECRET}/)

    const forbidden = await handleMcpHttp(
      new Request(`${BASE}/mcp`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${created.connector.secret}` },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 2,
          method: "tools/call",
          params: { name: "list_board", arguments: { slug: `board-${second.tenantId}` } },
        }),
      }),
      {
        expectedSecret: FLEET_SECRET,
        port: scopedOpsPort(world, FLEET_TENANT_ID),
        customerCredentials: records,
        portForTenant: (tenantId) => scopedOpsPort(world, tenantId),
      },
    )
    const forbiddenText = JSON.stringify(await forbidden.json())
    assert.match(forbiddenText, /Forbidden/)
    assert.doesNotMatch(forbiddenText, /Beta only card|Fleet only card/)

    const fleetList = dispatchOpsApi(world, {
      verifiedTenantId: FLEET_TENANT_ID,
      method: "GET",
      path: "/api/ops/board",
    })
    const fleetText = JSON.stringify(fleetList.body)
    assert.match(fleetText, /Fleet only card/)
    assert.doesNotMatch(fleetText, /Alpha only card|Beta only card/)
  })

  it("does not mint a second secret when the first board write fails", async () => {
    const store = memoryPersistence()
    store.failBoards(1)
    const known = "customer-secret-handed-off-once-only"
    const failed = await handleProvisionHttp(provisionRequest({ externalBuyerId: "buyer_retry" }), {
      provisionSecret: PROVISION_SECRET,
      fleetSecret: FLEET_SECRET,
      persistence: store.persistence,
      mintSecret: () => known,
    })
    assert.equal(failed.status, 500)
    assert.equal(JSON.stringify(await failed.json()).includes(known), false)
    assert.equal(store.rows.length, 1)
    const repaired = await handleProvisionHttp(provisionRequest({ externalBuyerId: "buyer_retry" }), {
      provisionSecret: PROVISION_SECRET,
      fleetSecret: FLEET_SECRET,
      persistence: store.persistence,
      mintSecret() {
        throw new Error("must not mint again")
      },
    })
    assert.equal(repaired.status, 200)
    const body = await repaired.json()
    assert.equal(JSON.stringify(body).includes(known), false)
    assert.equal(store.rows.length, 1)
    assert.equal(store.boards.has(store.rows[0].tenantId), true)
  })

  it("skips a colliding or fleet tenant id and will not store the fleet secret", async () => {
    const store = memoryPersistence()
    store.rows.push({
      tenantId: "taken01",
      salt: "ab",
      verifier: "cd",
      externalBuyerId: "buyer_existing",
    })
    const ids = ["fleet", "taken01", "c0ffee01"]
    const secrets = [FLEET_SECRET, "customer-secret-not-the-fleet-one"]
    const result = await provisionCustomer({
      externalBuyerId: "buyer_collide",
      persistence: store.persistence,
      baseUrl: BASE,
      fleetSecret: FLEET_SECRET,
      provisionSecret: PROVISION_SECRET,
      mintTenantId: () => ids.shift() ?? "c0ffee01",
      mintSecret: () => secrets.shift() ?? "customer-secret-not-the-fleet-one",
    })
    assert.equal(result.created, true)
    assert.equal(result.tenantId, "c0ffee01")
    assert.equal(result.secret, "customer-secret-not-the-fleet-one")
    assert.equal(JSON.stringify(store.rows).includes(FLEET_SECRET), false)
    assert.deepEqual(customerBoardPlan(result.tenantId).columns.map((column) => column.title), [...OPS_COLUMN_TITLES])
  })

  it("refuses the fleet board host and does not write a tenant", async () => {
    const store = memoryPersistence()
    const refused = await handleProvisionHttp(
      provisionRequest({ externalBuyerId: "buyer_host" }, {}, `${MCP_AUTOSCALE_HOST}/api/ops/provision`),
      { provisionSecret: PROVISION_SECRET, fleetSecret: FLEET_SECRET, persistence: store.persistence },
    )
    assert.equal(refused.status, 400)
    assert.equal(store.rows.length, 0)
    assert.throws(() => customerConnector(MCP_AUTOSCALE_HOST), /fleet board host/)
    const configured = await handleProvisionHttp(
      provisionRequest({ externalBuyerId: "buyer_host" }, {}, `${MCP_AUTOSCALE_HOST}/api/ops/provision`),
      {
        provisionSecret: PROVISION_SECRET,
        fleetSecret: FLEET_SECRET,
        configuredBaseUrl: BASE,
        persistence: store.persistence,
      },
    )
    assert.equal(configured.status, 201)
    const body = (await configured.json()) as { connector: { mcpUrl: string } }
    assert.equal(body.connector.mcpUrl, `${BASE}/mcp`)
    assert.equal(JSON.stringify(body).includes("productvision.workers.dev"), false)
  })

  it("rejects a buyer id that is the fleet secret", async () => {
    const store = memoryPersistence()
    await assert.rejects(
      () =>
        provisionCustomer({
          externalBuyerId: FLEET_SECRET,
          persistence: store.persistence,
          baseUrl: BASE,
          fleetSecret: FLEET_SECRET,
        }),
      /Invalid buyer id/,
    )
    assert.equal(store.rows.length, 0)
  })
})

describe("provision files", () => {
  it("keeps the buyer key on the Slice B table and does not enable RLS", () => {
    const sql = executableSql(read("../../drizzle/0007_tenant_provision.sql"))
    assert.match(sql, /ALTER TABLE tenant_credentials/)
    assert.match(sql, /external_buyer_id text/)
    assert.match(sql, /tenant_credentials_external_buyer_id_idx/)
    assert.match(sql, /external_buyer_id <> 'fleet'/)
    assert.doesNotMatch(sql, /ENABLE ROW LEVEL SECURITY/)
    assert.doesNotMatch(sql, /FORCE ROW LEVEL SECURITY/)
    assert.doesNotMatch(sql, /GRANT /i)
    assert.doesNotMatch(sql, /INSERT /i)
    assert.doesNotMatch(sql, /secret text/i)
    const schema = read("../db/schema.ts")
    assert.match(schema, /externalBuyerId/)
    assert.doesNotMatch(schema, /enableRLS/)
  })

  it("writes the customer board through the verified-tenant override", () => {
    const persist = read("./persist.ts")
    const route = read("../../app/api/ops/provision/route.ts")
    const middleware = read("../../middleware.ts")
    assert.match(persist, /runAsVerifiedTenant\(tenantId/)
    assert.match(persist, /assertCustomerTenantId\(tenantId\)/)
    assert.match(persist, /tenantCredentials/)
    assert.doesNotMatch(persist, /new Client/)
    assert.doesNotMatch(persist, /OPS_BOARD_SECRET/)
    assert.doesNotMatch(persist, /ENABLE ROW LEVEL SECURITY/)
    assert.doesNotMatch(persist, /FORCE ROW LEVEL SECURITY/)
    assert.doesNotMatch(persist, /console\./)
    assert.match(route, /handleProvisionHttp/)
    assert.match(route, /OPS_PROVISION_SECRET/)
    assert.doesNotMatch(route, /OPS_PROVISION_SECRET\s*=\s*["'][^"']+["']/)
    assert.match(middleware, /isProvisionPath/)
    const http = read("./http.ts")
    const core = read("./provision.ts")
    assert.doesNotMatch(`${http}\n${core}`, /console\./)
    assert.doesNotMatch(core, /productvision\.workers\.dev/)
  })

  it("documents the admin trigger, one-time handoff, and sell hold", () => {
    const readme = read("../../README.md")
    assert.match(readme, /POST \/api\/ops\/provision/)
    assert.match(readme, /OPS_PROVISION_SECRET/)
    assert.match(readme, /MINIKANBAN_TENANT_SECRET/)
    assert.match(readme, /same buyer id/)
    assert.match(readme, /Sell HOLD stays/)
    assert.match(readme, /0007_tenant_provision\.sql/)
    assert.doesNotMatch(readme, /Bearer\s+[A-Za-z0-9_-]{20,}/)
    assert.doesNotMatch(readme, /OPS_PROVISION_SECRET\s*=\s*\S/)
    assert.doesNotMatch(readme, /OPS_BOARD_SECRET\s*=\s*\S/)
  })
})

const SCHEMA = `
CREATE TABLE boards (
  id uuid PRIMARY KEY,
  tenant_id text NOT NULL,
  title text NOT NULL,
  slug text
);
CREATE TABLE columns (
  id uuid PRIMARY KEY,
  board_id uuid NOT NULL,
  tenant_id text NOT NULL,
  title text NOT NULL,
  "order" integer NOT NULL
);
CREATE TABLE tasks (
  id uuid PRIMARY KEY,
  tenant_id text NOT NULL
);
`

describe("provision insert obeys forced row security", { concurrency: 1, timeout: 120_000 }, () => {
  it("lets the table owner see the new board only under that tenant's set_config", async () => {
    const db = new PGlite()
    try {
      await db.exec(SCHEMA)
      await db.exec(executableSql(read("../../drizzle/0006_force_rls.sql")))
      await db.exec(`
        CREATE ROLE app_owner NOLOGIN NOSUPERUSER NOBYPASSRLS;
        ALTER TABLE boards OWNER TO app_owner;
        ALTER TABLE columns OWNER TO app_owner;
        ALTER TABLE tasks OWNER TO app_owner;
      `)
      const plan = customerBoardPlan("c0ffee01")
      await db.transaction(async (tx) => {
        await tx.query("SELECT set_config('app.tenant_id', $1, true)", [plan.tenantId])
        await tx.exec("SET LOCAL ROLE app_owner")
        await tx.query(
          "INSERT INTO boards (id, tenant_id, title, slug) VALUES ('00000000-0000-4000-8000-0000000000a1', $1, $2, $3)",
          [plan.tenantId, plan.title, plan.slug],
        )
        for (const column of plan.columns) {
          await tx.query(
            `INSERT INTO columns (id, board_id, tenant_id, title, "order") VALUES ($1, '00000000-0000-4000-8000-0000000000a1', $2, $3, $4)`,
            [`00000000-0000-4000-8000-0000000000a${column.order + 2}`, plan.tenantId, column.title, column.order],
          )
        }
      })

      const asCustomer = await db.transaction(async (tx) => {
        await tx.query("SELECT set_config('app.tenant_id', $1, true)", ["c0ffee01"])
        await tx.exec("SET LOCAL ROLE app_owner")
        return tx.query<{ title: string }>(`SELECT title FROM columns ORDER BY "order"`)
      })
      assert.deepEqual(
        asCustomer.rows.map((row) => row.title),
        [...OPS_COLUMN_TITLES],
      )

      const asFleet = await db.transaction(async (tx) => {
        await tx.query("SELECT set_config('app.tenant_id', $1, true)", [FLEET_TENANT_ID])
        await tx.exec("SET LOCAL ROLE app_owner")
        return tx.query<{ tenant_id: string }>("SELECT tenant_id FROM boards")
      })
      assert.equal(asFleet.rows.length, 0)

      const asOther = await db.transaction(async (tx) => {
        await tx.query("SELECT set_config('app.tenant_id', $1, true)", ["c0ffee02"])
        await tx.exec("SET LOCAL ROLE app_owner")
        return tx.query<{ tenant_id: string }>("SELECT tenant_id FROM boards")
      })
      assert.equal(asOther.rows.length, 0)

      await assert.rejects(
        () =>
          db.transaction(async (tx) => {
            await tx.query("SELECT set_config('app.tenant_id', $1, true)", [FLEET_TENANT_ID])
            await tx.exec("SET LOCAL ROLE app_owner")
            await tx.query(
              "INSERT INTO boards (id, tenant_id, title, slug) VALUES ('00000000-0000-4000-8000-0000000000b1', 'c0ffee01', 'stolen', 'ops')",
            )
          }),
        /row-level security/i,
      )
    } finally {
      await db.close()
    }
  })
})
