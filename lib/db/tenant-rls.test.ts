import assert from "node:assert/strict"
import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { after, before, beforeEach, describe, it } from "node:test"
import { PGlite } from "@electric-sql/pglite"
import { createTenantCredential } from "../auth/credentials.ts"
import { decideRequestAuth } from "../auth/decide.ts"
import { FLEET_TENANT_ID } from "./ops-defaults.ts"
import {
  armVerifiedTenantRls,
  attachTenantRls,
  bindTenantRlsArm,
  runAsVerifiedTenant,
  runInRequestScope,
  runWithRequestDb,
  setVerifiedTenantResolver,
  TENANT_SETTING_SQL,
  TENANT_SETTING_SQL_SESSION,
  workersSessionTenantRls,
} from "./tenant-rls.ts"

function read(path: string) {
  return readFileSync(new URL(path, import.meta.url), "utf8")
}

/** Drop line comments and block comments so commented SQL is not treated as shipped. */
function executableSql(source: string) {
  const withoutBlock = source.replace(/\/\*[\s\S]*?\*\//g, "")
  return withoutBlock
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n")
}

function codeOnly(source: string) {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1")
}

function walk(dir: string): string[] {
  const files: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".next") continue
      files.push(...walk(path))
      continue
    }
    if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) files.push(path)
  }
  return files
}

type Logged = { text: string; values?: unknown }

function queryText(config: unknown) {
  if (typeof config === "string") return config
  if (config && typeof config === "object" && "text" in config && typeof config.text === "string") return config.text
  return ""
}

function recordedValues(config: unknown, values: unknown) {
  if (typeof config === "string") return values
  if (config && typeof config === "object" && "values" in config && config.values !== undefined) return config.values
  return values
}

function openClient(delay?: (text: string) => Promise<void>) {
  const log: Logged[] = []
  const client = {
    async query(config: unknown, values?: unknown) {
      const text = queryText(config)
      if (delay) await delay(text)
      log.push({ text, values: recordedValues(config, values) })
      return { rows: [], rowCount: 0 }
    },
  }
  attachTenantRls(client)
  return { client, log }
}

/** Same predicate as drizzle/0006: unset or blank app.tenant_id matches nothing. */
const BOARD_ROWS = [{ tenant_id: "alpha" }, { tenant_id: "beta" }, { tenant_id: "fleet" }]

type ConnState = {
  sessionGuc: string | null
  localGuc: string | null
  inTx: boolean
}

function gucValue(values: unknown) {
  const raw = Array.isArray(values) ? values[0] : undefined
  return raw == null ? "" : String(raw)
}

function visibleTenant(conn: ConnState) {
  const raw = conn.inTx && conn.localGuc != null ? conn.localGuc : conn.sessionGuc
  if (raw == null || raw === "") return null
  return raw
}

function applyGuc(conn: ConnState, text: string, values: unknown) {
  const command = text.trim().toLowerCase()
  if (command === "begin" || command.startsWith("start transaction")) {
    conn.inTx = true
    return
  }
  if (/^commit\b/.test(command) || (command.startsWith("rollback") && !command.startsWith("rollback to"))) {
    conn.inTx = false
    conn.localGuc = null
    return
  }
  if (text === TENANT_SETTING_SQL) conn.localGuc = gucValue(values)
  if (text === TENANT_SETTING_SQL_SESSION) conn.sessionGuc = gucValue(values)
}

function openTrackedClient(options?: { session?: boolean }) {
  const conn: ConnState = { sessionGuc: null, localGuc: null, inTx: false }
  const log: Logged[] = []
  const client = {
    async query(config: unknown, values?: unknown) {
      const text = queryText(config)
      const valuesRecorded = recordedValues(config, values)
      log.push({ text, values: valuesRecorded })
      applyGuc(conn, text, valuesRecorded)
      if (
        text === TENANT_SETTING_SQL ||
        text === TENANT_SETTING_SQL_SESSION ||
        text === "begin" ||
        text === "commit" ||
        text === "rollback"
      ) {
        return { rows: [], rowCount: 0 }
      }
      if (text.includes("current_setting")) {
        return { rows: [{ tenant: visibleTenant(conn) }], rowCount: 1 }
      }
      if (text.trim().toLowerCase().startsWith("select")) {
        const tenant = visibleTenant(conn)
        const rows = tenant ? BOARD_ROWS.filter((row) => row.tenant_id === tenant) : []
        return { rows, rowCount: rows.length }
      }
      return { rows: [], rowCount: 0 }
    },
  }
  const arm = attachTenantRls(client, options)
  return { client, log, arm, conn }
}

async function withUserAgent<T>(userAgent: string, fn: () => Promise<T> | T): Promise<T> {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "navigator")
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    enumerable: true,
    value: { userAgent },
  })
  try {
    return await fn()
  } finally {
    if (descriptor) Object.defineProperty(globalThis, "navigator", descriptor)
    else Reflect.deleteProperty(globalThis, "navigator")
  }
}

function settings(log: Logged[]) {
  return log.filter((entry) => entry.text === TENANT_SETTING_SQL).map((entry) => entry.values)
}

const repoRoot = new URL("../../", import.meta.url)

describe("force rls migration", () => {
  const source = read("../../drizzle/0006_force_rls.sql")
  const sql = executableSql(source)
  const drafted = executableSql(read("../../drizzle/0004_tenant_id.sql"))

  it("enables and forces row security on boards, columns, and tasks", () => {
    for (const table of ["boards", "columns", "tasks"]) {
      assert.match(sql, new RegExp(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`))
      assert.match(sql, new RegExp(`ALTER TABLE ${table} FORCE ROW LEVEL SECURITY;`))
      assert.match(sql, new RegExp(`CREATE POLICY ${table}_tenant_isolation ON ${table}`))
    }
    assert.equal(sql.match(/ENABLE ROW LEVEL SECURITY/g)?.length, 3)
    assert.equal(sql.match(/FORCE ROW LEVEL SECURITY/g)?.length, 3)
  })

  it("reuses the drafted predicate and does not invent another", () => {
    const predicate = "tenant_id = current_setting('app.tenant_id', true)"
    assert.equal(sql.match(/tenant_id = current_setting\('app\.tenant_id', true\)/g)?.length, 6)
    assert.match(drafted, /tenant_id = current_setting\('app\.tenant_id', true\)/)
    assert.match(source, new RegExp(predicate.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))
    assert.doesNotMatch(sql, /current_user/)
    assert.doesNotMatch(sql, /tenant_id = 'fleet'/)
    assert.doesNotMatch(sql, /USING \(true\)/)
    assert.doesNotMatch(sql, /BYPASSRLS/)
    assert.doesNotMatch(sql, /GRANT /i)
    assert.doesNotMatch(sql, /tenant_credentials/)
    assert.match(source, /do not replace/i)
  })

  it("leaves 0004 and the credential table without enable or force", () => {
    assert.doesNotMatch(drafted, /ENABLE ROW LEVEL SECURITY/)
    assert.doesNotMatch(drafted, /FORCE ROW LEVEL SECURITY/)
    const credentials = executableSql(read("../../drizzle/0005_tenant_credentials.sql"))
    assert.doesNotMatch(credentials, /ENABLE ROW LEVEL SECURITY/)
    assert.doesNotMatch(credentials, /FORCE ROW LEVEL SECURITY/)
  })
})

describe("verified tenant is installed inside each transaction", { concurrency: 1 }, () => {
  beforeEach(() => {
    process.env.OPS_TENANT_RLS_SESSION = "0"
    setVerifiedTenantResolver(() => null)
  })

  it("sets the verified tenant and ignores tenant text carried on the query", async () => {
    setVerifiedTenantResolver(() => "alpha")
    const { client, log } = openClient()
    await client.query("select 1 -- ?tenant=beta", ["beta"])
    assert.deepEqual(settings(log), [["alpha"]])
    assert.deepEqual(
      log.map((entry) => entry.text),
      ["begin", TENANT_SETTING_SQL, "select 1 -- ?tenant=beta", "commit"],
    )
    assert.match(TENANT_SETTING_SQL, /set_config\('app\.tenant_id', \$1, true\)/)
    assert.doesNotMatch(TENANT_SETTING_SQL, /false/)
  })

  it("leaves the setting unset when the verified tenant is missing", async () => {
    const { client, log } = openClient()
    await client.query({ text: "select 1" }, [])
    assert.deepEqual(settings(log), [])
    assert.deepEqual(
      log.map((entry) => entry.text),
      ["begin", "select 1", "commit"],
    )
  })

  it("rejects a tenant key that did not come from the verified identity", async () => {
    setVerifiedTenantResolver(() => "alpha'; drop table boards; --")
    const { client, log } = openClient()
    await assert.rejects(() => client.query("select 1"), /Refusing to set app\.tenant_id/)
    assert.deepEqual(settings(log), [])
    assert.equal(log.some((entry) => entry.text === "rollback"), true)
  })

  it("arms a caller-opened transaction once and keeps savepoints inside it", async () => {
    setVerifiedTenantResolver(() => "alpha")
    const { client, log } = openClient()
    await client.query({ text: "begin" }, [])
    await client.query({ text: "select $1", values: ["beta"] }, ["beta"])
    await client.query({ text: "savepoint sp1" })
    await client.query({ text: "rollback to savepoint sp1" })
    await client.query({ text: "commit" })
    assert.deepEqual(settings(log), [["alpha"]])
    assert.equal(log.filter((entry) => entry.text === "begin").length, 1)
    assert.equal(
      log.findIndex((entry) => entry.text === TENANT_SETTING_SQL) < log.findIndex((entry) => entry.text.startsWith("select")),
      true,
    )
    assert.equal(log.at(-1)?.text, "commit")
  })

  it("does not interleave two tenants on the shared client", async () => {
    let releaseSlow!: () => void
    let waiting = false
    const slow = new Promise<void>((resolve) => {
      releaseSlow = resolve
    })
    const { client, log } = openClient(async (text) => {
      if (text === "SELECT slow") {
        waiting = true
        await slow
      }
    })

    setVerifiedTenantResolver(() => "alpha")
    const first = runInRequestScope(() => client.query("SELECT slow"))
    for (let i = 0; i < 50 && !waiting; i++) {
      await new Promise((resolve) => setTimeout(resolve, 5))
    }
    assert.equal(waiting, true)
    setVerifiedTenantResolver(() => "beta")
    const second = runInRequestScope(() => client.query("SELECT fast"))
    await new Promise((resolve) => setTimeout(resolve, 30))
    assert.deepEqual(settings(log), [["alpha"]])
    releaseSlow()
    await first
    await second
    assert.deepEqual(settings(log), [["alpha"], ["beta"]])
    const alphaCommit = log.findIndex((entry) => entry.text === "commit")
    const betaSetting = log.findIndex((entry, index) => index > alphaCommit && entry.text === TENANT_SETTING_SQL)
    assert.equal(betaSetting > alphaCommit, true)
  })

  it("maps the fleet secret to the fleet tenant id and a customer secret to that tenant only", async () => {
    const fleetSecret = "ops-board-test-secret"
    const minted = await createTenantCredential("alpha")

    setVerifiedTenantResolver(async () => {
      const identity = await decideRequestAuth({
        presented: fleetSecret,
        fleetSecret,
        records: [minted.record],
        devGateOpen: false,
      })
      return identity?.tenantId ?? null
    })
    const fleet = openClient()
    await fleet.client.query("select 1")
    assert.deepEqual(settings(fleet.log), [[FLEET_TENANT_ID]])

    setVerifiedTenantResolver(async () => {
      const identity = await decideRequestAuth({
        presented: minted.secret,
        fleetSecret,
        records: [minted.record],
        devGateOpen: false,
      })
      return identity?.tenantId ?? null
    })
    const customer = openClient()
    await customer.client.query("select 1 -- ?tenant=fleet", ["fleet"])
    assert.deepEqual(settings(customer.log), [["alpha"]])

    setVerifiedTenantResolver(async () => {
      const identity = await decideRequestAuth({
        presented: "not-the-secret",
        fleetSecret,
        records: [minted.record],
        devGateOpen: false,
      })
      return identity?.tenantId ?? null
    })
    const missing = openClient()
    await missing.client.query("select 1")
    assert.deepEqual(settings(missing.log), [])

    setVerifiedTenantResolver(async () => {
      const identity = await decideRequestAuth({
        records: [],
        devGateOpen: true,
      })
      return identity?.tenantId ?? null
    })
    const devGate = openClient()
    await devGate.client.query("select 1")
    assert.deepEqual(settings(devGate.log), [[FLEET_TENANT_ID]])
  })

  it("uses a synchronous session arm only on the Workers runtime", async () => {
    assert.equal(workersSessionTenantRls(), false)
    process.env.OPS_TENANT_RLS_SESSION = "1"
    assert.equal(workersSessionTenantRls(), false)
    const nodeExplicit = openTrackedClient()
    assert.equal(nodeExplicit.client.query.constructor.name, "AsyncFunction")

    await withUserAgent("Cloudflare-Workers", async () => {
      delete process.env.OPS_TENANT_RLS_SESSION
      assert.equal(workersSessionTenantRls(), true)
      const unset = openTrackedClient()
      const unsetDb = {}
      bindTenantRlsArm(unsetDb, unset.arm)
      assert.equal(unset.client.query.constructor.name, "Function")
      await runWithRequestDb(unsetDb, async () => {
        await armVerifiedTenantRls("alpha")
        await unset.client.query("select 1")
      })
      assert.deepEqual(
        unset.log.map((entry) => entry.text),
        [TENANT_SETTING_SQL_SESSION, "select 1"],
      )
      assert.deepEqual(unset.log[0]?.values, ["alpha"])
      assert.match(TENANT_SETTING_SQL_SESSION, /set_config\('app\.tenant_id', \$1, false\)/)
      assert.equal(unset.log.some((entry) => entry.text === "begin"), false)

      process.env.OPS_TENANT_RLS_SESSION = "1"
      assert.equal(workersSessionTenantRls(), true)
      const forced = openTrackedClient()
      const forcedDb = {}
      bindTenantRlsArm(forcedDb, forced.arm)
      assert.equal(forced.client.query.constructor.name, "Function")
      await runWithRequestDb(forcedDb, async () => {
        await armVerifiedTenantRls("fleet")
        await forced.client.query("select 1")
      })
      assert.deepEqual(
        forced.log.map((entry) => entry.text),
        [TENANT_SETTING_SQL_SESSION, "select 1"],
      )
      assert.deepEqual(forced.log[0]?.values, ["fleet"])

      process.env.OPS_TENANT_RLS_SESSION = "0"
      assert.equal(workersSessionTenantRls(), false)
      const forcedOff = openTrackedClient()
      assert.equal(forcedOff.client.query.constructor.name, "AsyncFunction")
    })

    process.env.OPS_TENANT_RLS_SESSION = "0"
  })

  it("returns no rows when the request client is not armed", async () => {
    const tracked = openTrackedClient({ session: true })
    const db = {}
    bindTenantRlsArm(db, tracked.arm)
    const unarmed = await runWithRequestDb(db, () => tracked.client.query("SELECT tenant_id FROM boards"))
    assert.equal(unarmed.rows.length, 0)
    assert.notEqual(unarmed.rows.length, BOARD_ROWS.length)
    assert.equal(tracked.conn.sessionGuc, null)
    assert.equal(tracked.log.some((entry) => entry.text === TENANT_SETTING_SQL_SESSION), false)

    const other = openTrackedClient({ session: true })
    bindTenantRlsArm({}, other.arm)
    await armVerifiedTenantRls("alpha")
    const missed = await other.client.query("SELECT tenant_id FROM boards")
    assert.equal(missed.rows.length, 0)
    assert.equal(other.conn.sessionGuc, null)
  })

  it("shows each concurrent isolate request only its own tenant rows", async () => {
    const alpha = openTrackedClient({ session: true })
    const beta = openTrackedClient({ session: true })
    const dbAlpha = { id: "alpha" }
    const dbBeta = { id: "beta" }
    bindTenantRlsArm(dbAlpha, alpha.arm)
    bindTenantRlsArm(dbBeta, beta.arm)

    let alphaArmed = false
    let releaseAlpha!: () => void
    const gate = new Promise<void>((resolve) => {
      releaseAlpha = resolve
    })

    const first = runWithRequestDb(dbAlpha, async () => {
      await armVerifiedTenantRls("alpha")
      alphaArmed = true
      await gate
      return alpha.client.query("SELECT tenant_id FROM boards")
    })

    for (let i = 0; i < 50 && !alphaArmed; i++) {
      await new Promise((resolve) => setTimeout(resolve, 5))
    }
    assert.equal(alphaArmed, true)

    const second = runWithRequestDb(dbBeta, async () => {
      await armVerifiedTenantRls("beta")
      releaseAlpha()
      return beta.client.query("SELECT tenant_id FROM boards")
    })

    const [alphaRows, betaRows] = await Promise.all([first, second])
    assert.deepEqual(
      alphaRows.rows.map((row) => row.tenant_id),
      ["alpha"],
    )
    assert.deepEqual(
      betaRows.rows.map((row) => row.tenant_id),
      ["beta"],
    )
    assert.deepEqual(
      alpha.log.filter((entry) => entry.text === TENANT_SETTING_SQL_SESSION).map((entry) => entry.values),
      [["alpha"]],
    )
    assert.deepEqual(
      beta.log.filter((entry) => entry.text === TENANT_SETTING_SQL_SESSION).map((entry) => entry.values),
      [["beta"]],
    )
    assert.equal(alpha.conn.sessionGuc, "alpha")
    assert.equal(beta.conn.sessionGuc, "beta")
    assert.equal(alpha.log.some((entry) => entry.text === "begin"), false)
    assert.equal(beta.log.some((entry) => entry.text === "begin"), false)
  })

  it("does not leave a session GUC set on the shared Node client after a request", async () => {
    process.env.OPS_TENANT_RLS_SESSION = "1"
    assert.equal(workersSessionTenantRls(), false)
    const { client, log, conn } = openTrackedClient()
    assert.equal(client.query.constructor.name, "AsyncFunction")

    setVerifiedTenantResolver(() => "alpha")
    const seenAlpha = await runInRequestScope(() => client.query("SELECT tenant_id FROM boards"))
    assert.deepEqual(
      seenAlpha.rows.map((row) => row.tenant_id),
      ["alpha"],
    )
    assert.equal(conn.sessionGuc, null)
    assert.equal(conn.localGuc, null)
    assert.equal(conn.inTx, false)

    setVerifiedTenantResolver(() => "beta")
    const seenBeta = await runInRequestScope(() => client.query("SELECT tenant_id FROM boards"))
    assert.deepEqual(
      seenBeta.rows.map((row) => row.tenant_id),
      ["beta"],
    )
    assert.equal(conn.sessionGuc, null)
    assert.equal(conn.inTx, false)

    setVerifiedTenantResolver(() => null)
    const unarmed = await runInRequestScope(() => client.query("SELECT tenant_id FROM boards"))
    assert.equal(unarmed.rows.length, 0)
    const setting = await runInRequestScope(() =>
      client.query("SELECT current_setting('app.tenant_id', true) AS tenant"),
    )
    assert.equal(setting.rows[0]?.tenant ?? null, null)
    assert.equal(conn.sessionGuc, null)
    assert.equal(conn.localGuc, null)
    assert.equal(conn.inTx, false)
    assert.equal(log.some((entry) => entry.text === TENANT_SETTING_SQL_SESSION), false)
    assert.deepEqual(
      log.filter((entry) => entry.text === TENANT_SETTING_SQL).map((entry) => entry.values),
      [["alpha"], ["beta"]],
    )
    assert.match(TENANT_SETTING_SQL, /set_config\('app\.tenant_id', \$1, true\)/)

    process.env.OPS_TENANT_RLS_SESSION = "0"
  })

  it("sets a server-minted customer tenant without replacing the fleet resolver", async () => {
    setVerifiedTenantResolver(() => FLEET_TENANT_ID)
    const { client, log } = openClient()
    await runAsVerifiedTenant("c0123456789abcde", () => client.query("insert into boards (tenant_id) values ('c0123456789abcde')"))
    assert.deepEqual(settings(log), [["c0123456789abcde"]])
    await client.query("select 1 -- ?tenant=fleet", ["fleet"])
    assert.deepEqual(settings(log), [["c0123456789abcde"], [FLEET_TENANT_ID]])
    await assert.rejects(() => runAsVerifiedTenant(FLEET_TENANT_ID, async () => undefined), /Refusing to set app\.tenant_id/)
    await assert.rejects(() => runAsVerifiedTenant("alpha'; drop table boards; --", async () => undefined), /Refusing to set app\.tenant_id/)
  })
})

describe("database client coverage", () => {
  const libRoot = join(repoRoot.pathname, "lib")
  const appRoot = join(repoRoot.pathname, "app")
  const production = [...walk(libRoot), ...walk(appRoot)].filter((file) => !file.endsWith(".test.ts"))

  function source(file: string) {
    return readFileSync(file, "utf8")
  }

  it("installs the setting only from the verified identity on the single client", () => {
    const session = read("../auth/session.ts")
    const index = read("./index.ts")
    const rls = codeOnly(read("./tenant-rls.ts"))
    const resolverCall = session.match(/setVerifiedTenantResolver\(async \(\) => \{[\s\S]*?\n\}\)/)?.[0] ?? ""
    assert.match(resolverCall, /resolveAuthIdentity\(\)/)
    assert.doesNotMatch(resolverCall, /searchParams|x-tenant|X-Tenant-|body\.tenant|body\.tenant_id|\?tenant/)
    assert.doesNotMatch(rls, /searchParams|x-tenant|X-Tenant-|body\.tenant|body\.tenant_id/)
    assert.match(rls, /SELECT set_config\('app\.tenant_id', \$1, true\)/)
    assert.match(session, /throw new OpsAccessError\(401\)/)

    const open = index.slice(index.indexOf("function openClient"))
    assert.equal(open.indexOf("attachTenantRls") < open.indexOf("drizzle("), true)
    assert.match(open, /attachTenantRls\(client, \{ session: workersSessionTenantRls\(\) \}\)/)
    assert.match(open, /bindTenantRlsArm\(database, arm\)/)
    assert.match(index, /bindRequestDb\(/)
    assert.equal(index.includes("new Client"), true)
    assert.doesNotMatch(codeOnly(index), /setCurrentTenantRlsArm/)
    assert.doesNotMatch(codeOnly(rls), /setCurrentTenantRlsArm|currentArm/)
    assert.match(rls, /if \(!isWorkersRuntime\(\)\) return false/)
    const actor = session.slice(session.indexOf("export async function requireActorTenant"))
    assert.equal(actor.indexOf("getDb()") < actor.indexOf("armVerifiedTenantRls(identity.tenantId)"), true)

    const clientFiles = production.filter((file) => source(file).includes("new Client"))
    assert.deepEqual(
      clientFiles.map((file) => file.slice(repoRoot.pathname.length)),
      ["lib/db/index.ts"],
    )
    const pgImports = production.filter((file) => /from ["']pg["']/.test(source(file)))
    assert.deepEqual(
      pgImports.map((file) => file.slice(repoRoot.pathname.length)),
      ["lib/db/index.ts"],
    )
    const resolverFiles = production.filter((file) => source(file).includes("setVerifiedTenantResolver"))
    assert.deepEqual(
      resolverFiles.map((file) => file.slice(repoRoot.pathname.length)).sort(),
      ["lib/auth/session.ts", "lib/db/tenant-rls.ts"],
    )
  })

  it("keeps Slice C checks and covers every boards client path", () => {
    const boards = read("../actions/boards.ts")
    const access = read("../ops/access.ts")
    const live = read("../mcp/live-port.ts")
    const credentials = read("../auth/credential-store.ts")
    assert.match(boards, /sameTenant/)
    assert.match(boards, /eq\(tasks\.tenantId, tenantId\)/)
    assert.match(boards, /eq\(boards\.tenantId, tenantId\)/)
    assert.match(boards, /requireActorTenant/)
    assert.doesNotMatch(access, /set_config/)
    assert.doesNotMatch(access, /ENABLE ROW LEVEL SECURITY/)
    assert.doesNotMatch(access, /FORCE ROW LEVEL SECURITY/)
    assert.match(live, /requireActorTenant/)
    assert.doesNotMatch(credentials, /from\(boards\)|from\(columns\)|from\(tasks\)/)
    assert.match(read("../mcp/http.ts"), /portForTenant/)

    const dbImporters = production.filter((file) => /from ["']@\/lib\/db["']/.test(source(file)))
    assert.deepEqual(
      dbImporters.map((file) => file.slice(repoRoot.pathname.length)).sort(),
      ["lib/actions/boards.ts", "lib/auth/credential-store.ts", "lib/db/fleet-tenant.ts", "lib/provision/persist.ts"],
    )
    const overrideFiles = production.filter((file) => source(file).includes("runAsVerifiedTenant"))
    assert.deepEqual(
      overrideFiles.map((file) => file.slice(repoRoot.pathname.length)).sort(),
      ["lib/db/tenant-rls.ts", "lib/provision/persist.ts"],
    )
    const fleetImporters = production.filter((file) => source(file).includes("ensureFleetTenantColumns"))
    assert.deepEqual(
      fleetImporters.map((file) => file.slice(repoRoot.pathname.length)).sort(),
      ["lib/actions/boards.ts", "lib/db/fleet-tenant.ts"],
    )
    for (const route of ["app/api/mcp/route.ts", "app/mcp/route.ts"]) {
      assert.match(readFileSync(join(repoRoot.pathname, route), "utf8"), /liveOpsPort/)
    }
  })
})

const SCHEMA = `
CREATE TABLE boards (
  id uuid PRIMARY KEY,
  tenant_id text NOT NULL,
  title text NOT NULL
);
CREATE TABLE columns (
  id uuid PRIMARY KEY,
  board_id uuid NOT NULL REFERENCES boards(id),
  tenant_id text NOT NULL,
  title text NOT NULL
);
CREATE TABLE tasks (
  id uuid PRIMARY KEY,
  board_id uuid NOT NULL REFERENCES boards(id),
  column_id uuid NOT NULL REFERENCES columns(id),
  tenant_id text NOT NULL,
  title text NOT NULL
);
`

const SEED = `
INSERT INTO boards (id, tenant_id, title) VALUES
  ('00000000-0000-4000-8000-0000000000a1', 'alpha', 'Alpha'),
  ('00000000-0000-4000-8000-0000000000b1', 'beta', 'Beta'),
  ('00000000-0000-4000-8000-0000000000f1', 'fleet', 'Fleet');
INSERT INTO columns (id, board_id, tenant_id, title) VALUES
  ('00000000-0000-4000-8000-0000000000a2', '00000000-0000-4000-8000-0000000000a1', 'alpha', 'Need you'),
  ('00000000-0000-4000-8000-0000000000b2', '00000000-0000-4000-8000-0000000000b1', 'beta', 'Need you'),
  ('00000000-0000-4000-8000-0000000000f2', '00000000-0000-4000-8000-0000000000f1', 'fleet', 'Need you');
INSERT INTO tasks (id, board_id, column_id, tenant_id, title) VALUES
  ('00000000-0000-4000-8000-0000000000a3', '00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-0000000000a2', 'alpha', 'A'),
  ('00000000-0000-4000-8000-0000000000b3', '00000000-0000-4000-8000-0000000000b1', '00000000-0000-4000-8000-0000000000b2', 'beta', 'B'),
  ('00000000-0000-4000-8000-0000000000f3', '00000000-0000-4000-8000-0000000000f1', '00000000-0000-4000-8000-0000000000f2', 'fleet', 'F');
`

describe("forced row security applies to the table owner", { concurrency: 1, timeout: 120_000 }, () => {
  let db: PGlite

  before(async () => {
    db = new PGlite()
    await db.exec(SCHEMA)
    const sql = executableSql(read("../../drizzle/0006_force_rls.sql"))
    await db.exec(sql)
    await db.exec(sql)
    await db.exec(`
      CREATE ROLE app_owner NOLOGIN NOSUPERUSER NOBYPASSRLS;
      ALTER TABLE boards OWNER TO app_owner;
      ALTER TABLE columns OWNER TO app_owner;
      ALTER TABLE tasks OWNER TO app_owner;
    `)
    await db.exec(SEED)
  })

  after(async () => {
    await db.close()
  })

  async function asOwner<T>(tenantId: string | null, run: (tx: PGlite) => Promise<T>) {
    return db.transaction(async (tx) => {
      if (tenantId) {
        await tx.query("SELECT set_config('app.tenant_id', $1, true)", [tenantId])
      }
      await tx.exec("SET LOCAL ROLE app_owner")
      return run(tx as unknown as PGlite)
    })
  }

  async function visible(tenantId: string | null) {
    return asOwner(tenantId, async (tx) => {
      const who = await tx.query<{
        current_user: string
        rolsuper: boolean
        rolbypassrls: boolean
        owner: string
      }>(`
        SELECT current_user,
          (SELECT rolsuper FROM pg_roles WHERE rolname = current_user) AS rolsuper,
          (SELECT rolbypassrls FROM pg_roles WHERE rolname = current_user) AS rolbypassrls,
          (SELECT tableowner FROM pg_tables WHERE tablename = 'boards') AS owner
      `)
      const boards = await tx.query<{ tenant_id: string }>("SELECT tenant_id FROM boards ORDER BY tenant_id")
      const columns = await tx.query<{ tenant_id: string }>("SELECT tenant_id FROM columns ORDER BY tenant_id")
      const tasks = await tx.query<{ tenant_id: string }>("SELECT tenant_id FROM tasks ORDER BY tenant_id")
      return {
        who: who.rows[0],
        boards: boards.rows.map((row) => row.tenant_id),
        columns: columns.rows.map((row) => row.tenant_id),
        tasks: tasks.rows.map((row) => row.tenant_id),
      }
    })
  }

  it("records enable and force on the three tables", async () => {
    const flags = await db.query<{ relname: string; relrowsecurity: boolean; relforcerowsecurity: boolean }>(`
      SELECT c.relname, c.relrowsecurity, c.relforcerowsecurity
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = current_schema()
        AND c.relname IN ('boards', 'columns', 'tasks')
      ORDER BY c.relname
    `)
    assert.deepEqual(
      flags.rows,
      [
        { relname: "boards", relrowsecurity: true, relforcerowsecurity: true },
        { relname: "columns", relrowsecurity: true, relforcerowsecurity: true },
        { relname: "tasks", relrowsecurity: true, relforcerowsecurity: true },
      ],
    )
  })

  it("cannot read tenant B rows when the setting is tenant A, even as the table owner", async () => {
    const seen = await visible("alpha")
    assert.equal(seen.who.current_user, "app_owner")
    assert.equal(seen.who.rolsuper, false)
    assert.equal(seen.who.rolbypassrls, false)
    assert.equal(seen.who.owner, "app_owner")
    assert.deepEqual(seen.boards, ["alpha"])
    assert.deepEqual(seen.columns, ["alpha"])
    assert.deepEqual(seen.tasks, ["alpha"])

    const asSuper = await db.query<{ tenant_id: string }>("SELECT tenant_id FROM boards ORDER BY tenant_id")
    assert.deepEqual(
      asSuper.rows.map((row) => row.tenant_id),
      ["alpha", "beta", "fleet"],
    )

    await assert.rejects(
      () =>
        asOwner("alpha", (tx) =>
          tx.query("INSERT INTO boards (id, tenant_id, title) VALUES ('00000000-0000-4000-8000-0000000000b9', 'beta', 'stolen')"),
        ),
      /row-level security/i,
    )
  })

  it("returns no rows when app.tenant_id is unset", async () => {
    const seen = await visible(null)
    assert.equal(seen.who.current_user, "app_owner")
    assert.deepEqual(seen.boards, [])
    assert.deepEqual(seen.columns, [])
    assert.deepEqual(seen.tasks, [])
    const setting = await asOwner(null, (tx) =>
      tx.query<{ tenant: string | null }>("SELECT current_setting('app.tenant_id', true) AS tenant"),
    )
    assert.equal(setting.rows[0].tenant || null, null)
  })

  it("shows the fleet tenant only when the setting is the fleet id", async () => {
    const seen = await visible(FLEET_TENANT_ID)
    assert.deepEqual(seen.boards, ["fleet"])
    assert.deepEqual(seen.columns, ["fleet"])
    assert.deepEqual(seen.tasks, ["fleet"])
    assert.equal(seen.boards.includes("alpha"), false)
    assert.equal(seen.boards.includes("beta"), false)
  })

  it("stops the table-owner bypass only after FORCE", async () => {
    await db.exec(`
      CREATE TABLE owner_bypass_probe (tenant_id text);
      INSERT INTO owner_bypass_probe (tenant_id) VALUES ('alpha'), ('beta');
      CREATE POLICY owner_bypass_probe_isolation ON owner_bypass_probe
        FOR ALL
        USING (tenant_id = current_setting('app.tenant_id', true))
        WITH CHECK (tenant_id = current_setting('app.tenant_id', true));
      ALTER TABLE owner_bypass_probe ENABLE ROW LEVEL SECURITY;
      ALTER TABLE owner_bypass_probe OWNER TO app_owner;
    `)

    const beforeForce = await asOwner("alpha", (tx) =>
      tx.query<{ tenant_id: string }>("SELECT tenant_id FROM owner_bypass_probe ORDER BY tenant_id"),
    )
    assert.deepEqual(
      beforeForce.rows.map((row) => row.tenant_id),
      ["alpha", "beta"],
    )

    await db.exec("ALTER TABLE owner_bypass_probe FORCE ROW LEVEL SECURITY")
    const afterForce = await asOwner("alpha", (tx) =>
      tx.query<{ tenant_id: string }>("SELECT tenant_id FROM owner_bypass_probe ORDER BY tenant_id"),
    )
    assert.deepEqual(
      afterForce.rows.map((row) => row.tenant_id),
      ["alpha"],
    )
    const unset = await asOwner(null, (tx) =>
      tx.query<{ tenant_id: string }>("SELECT tenant_id FROM owner_bypass_probe"),
    )
    assert.equal(unset.rows.length, 0)
  })
})
