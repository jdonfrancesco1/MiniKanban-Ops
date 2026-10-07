/**
 * Transaction-local / session tenant for FORCE row security.
 *
 * lib/db/index.ts is the only pg Client (ops actions, fleet self-heal, MCP
 * live port). attachTenantRls wraps that client. There is no second pool.
 *
 * Node (including when OPS_TENANT_RLS_SESSION=1): every statement runs inside
 * BEGIN + set_config(..., is_local=true) + COMMIT. The Node Client is a
 * long-lived singleton, so a session GUC would survive the request.
 *
 * Workers / OpenNext, unless OPS_TENANT_RLS_SESSION=0: node-pg on
 * cloudflare:sockets breaks if client.query is an async function (the
 * driver must enqueue synchronously). Session mode keeps query() a
 * synchronous passthrough and arms set_config(..., false) via
 * armVerifiedTenantRls() once the verified tenant is known
 * (requireActorTenant / runAsVerifiedTenant). The Worker Client is
 * per-request, so the setting dies with that socket.
 *
 * The arm callback is stored on the request's db (WeakMap) and selected
 * with AsyncLocalStorage. There is no process-wide current arm: two
 * requests in one isolate cannot arm each other's client. An unarmed
 * query leaves app.tenant_id unset, and FORCE matches no rows.
 *
 * Value comes from the resolver registered in lib/auth/session.ts
 * (session cookie / bearer only). Never from ?tenant=, JSON tenant_id, or
 * X-Tenant-* headers.
 */

import { AsyncLocalStorage } from "node:async_hooks"
import { FLEET_TENANT_ID } from "./ops-defaults.ts"

const TENANT_ID_RE = /^[a-z][a-z0-9_-]{0,63}$/

const scopedTenant = new AsyncLocalStorage<string>()

export async function runAsVerifiedTenant<T>(tenantId: string, fn: () => Promise<T>): Promise<T> {
  if (tenantId === FLEET_TENANT_ID || typeof tenantId !== "string" || !TENANT_ID_RE.test(tenantId)) {
    throw new Error("Refusing to set app.tenant_id from an unverified tenant key")
  }
  return scopedTenant.run(tenantId, () => runInRequestScope(async () => {
    // Open this request's client before arming. On Workers the session GUC
    // has to land on that client; arming a module-global pointer can hit a
    // peer request's client instead.
    ensureRequestDb?.()
    await armVerifiedTenantRls(tenantId)
    return await fn()
  }))
}

/** Exact statement installed on each transaction (Node hermetic path). is_local = true. */
export const TENANT_SETTING_SQL = "SELECT set_config('app.tenant_id', $1, true)"

/** Session-level setting for Workers (Client is per-request). */
export const TENANT_SETTING_SQL_SESSION = "SELECT set_config('app.tenant_id', $1, false)"

type TenantResolver = () => Promise<string | null> | string | null

let resolver: TenantResolver = () => null

export function setVerifiedTenantResolver(next: TenantResolver) {
  resolver = next
}

type Slot = {
  depth: number
  release: (() => void) | null
  arming: boolean
}

const slots = new AsyncLocalStorage<Slot>()

export function runInRequestScope<T>(fn: () => Promise<T>): Promise<T> {
  return slots.run({ depth: 0, release: null, arming: false }, fn)
}

type QueryClient = {
  query: (config: unknown, values?: unknown) => Promise<unknown>
}

type ArmFn = (tenantId: string | null) => Promise<void>

const armsByClient = new WeakMap<QueryClient, ArmFn>()
const armsByDb = new WeakMap<object, ArmFn>()

/**
 * Which db this async context may arm. getDb() enters it for the rest of
 * the request. runWithRequestDb isolates tests and nested work. Never a
 * module-global arm: that let one request set_config on another request's
 * client.
 */
const requestDb = new AsyncLocalStorage<object>()

let ensureRequestDb: (() => void) | null = null

/** index.ts registers getDb() so runAsVerifiedTenant can open the request client before arming. */
export function setRequestDbEnsurer(next: () => void) {
  ensureRequestDb = next
}

/** Bind drizzle db handle → arm fn so requireActorTenant can set_config once. */
export function bindTenantRlsArm(db: object, arm: ArmFn) {
  armsByDb.set(db, arm)
}

/** Bind the current async context to this request's db. Same db on re-entry. */
export function bindRequestDb(db: object) {
  requestDb.enterWith(db)
}

/** Run fn with db as the only client this context is allowed to arm. */
export function runWithRequestDb<T>(db: object, fn: () => Promise<T>): Promise<T> {
  return requestDb.run(db, fn)
}

export async function armVerifiedTenantRls(tenantId: string | null) {
  const db = requestDb.getStore()
  if (!db) return
  const arm = armsByDb.get(db)
  if (!arm) return
  await arm(tenantId)
}

function textOf(config: unknown) {
  if (typeof config === "string") return config
  if (config && typeof config === "object" && "text" in config && typeof config.text === "string") {
    return config.text
  }
  return ""
}

function commandOf(sql: string) {
  let rest = sql.trim()
  for (;;) {
    if (rest.startsWith("--")) {
      const nl = rest.indexOf("\n")
      rest = (nl === -1 ? "" : rest.slice(nl + 1)).trim()
      continue
    }
    if (rest.startsWith("/*")) {
      const end = rest.indexOf("*/")
      rest = (end === -1 ? "" : rest.slice(end + 2)).trim()
      continue
    }
    break
  }
  return rest.toLowerCase()
}

function isBegin(command: string) {
  return command.startsWith("begin") || command.startsWith("start transaction")
}

function isCommit(command: string) {
  return /^commit\b/.test(command)
}

function isRollbackTx(command: string) {
  return command.startsWith("rollback") && !command.startsWith("rollback to")
}

function isSchemaDdl(command: string) {
  return /^(alter|create|drop|do|comment|grant|revoke|truncate|vacuum|analyze|reindex|cluster)\b/.test(command)
}

export function isWorkersRuntime() {
  return typeof navigator !== "undefined" && navigator.userAgent === "Cloudflare-Workers"
}

/**
 * Session set_config(..., false) only on the Workers per-request client.
 * Node keeps BEGIN + set_config(..., true) even when OPS_TENANT_RLS_SESSION=1,
 * because getNodeDb() reuses one Client across requests. OPS_TENANT_RLS_SESSION=0
 * forces that transaction path on Workers too (hermetic tests; blanks SELECTs
 * on live node-pg + cloudflare:sockets, so production Workers leave it unset or 1).
 */
export function workersSessionTenantRls() {
  if (!isWorkersRuntime()) return false
  return process.env.OPS_TENANT_RLS_SESSION !== "0"
}

export function attachTenantRls(client: QueryClient, options?: { session?: boolean }) {
  const original = client.query.bind(client)
  const sessionMode = options?.session ?? workersSessionTenantRls()
  let sessionArmed: string | null | undefined
  let arming = false

  const arm: ArmFn = async (tenantId) => {
    if (!sessionMode) return
    const key = tenantId ?? ""
    if (sessionArmed === key) return
    if (tenantId != null && !TENANT_ID_RE.test(tenantId)) {
      throw new Error("Refusing to set app.tenant_id from an unverified tenant key")
    }
    arming = true
    try {
      await original(TENANT_SETTING_SQL_SESSION, [key])
      sessionArmed = key
    } finally {
      arming = false
    }
  }
  armsByClient.set(client, arm)

  if (sessionMode) {
    // MUST stay synchronous: async client.query breaks Workers → Neon.
    client.query = ((config: unknown, values?: unknown) => {
      if (arming) return original(config, values)
      return original(config, values)
    }) as typeof client.query
    return arm
  }

  let tail: Promise<void> = Promise.resolve()

  function acquire() {
    let release!: () => void
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    const wait = tail
    tail = gate
    return wait.then(() => release)
  }

  async function armLocal(active: Slot) {
    active.arming = true
    try {
      const value = scopedTenant.getStore() ?? (await resolver())
      if (value == null || value === "") return
      if (typeof value !== "string" || !TENANT_ID_RE.test(value)) {
        throw new Error("Refusing to set app.tenant_id from an unverified tenant key")
      }
      await original(TENANT_SETTING_SQL, [value])
    } finally {
      active.arming = false
    }
  }

  function releaseSlot(active: Slot) {
    active.depth = 0
    if (!active.release) return
    const done = active.release
    active.release = null
    done()
  }

  client.query = async (config: unknown, values?: unknown) => {
    let active = slots.getStore()
    if (!active) {
      active = { depth: 0, release: null, arming: false }
      slots.enterWith(active)
    }
    if (active.arming) return original(config, values)

    const command = commandOf(textOf(config))

    if (active.depth > 0) {
      const ending = isCommit(command) || isRollbackTx(command)
      try {
        return await original(config, values)
      } finally {
        if (ending) releaseSlot(active)
      }
    }

    const release = await acquire()

    if (isSchemaDdl(command)) {
      try {
        return await original(config, values)
      } finally {
        release()
      }
    }

    if (isBegin(command)) {
      try {
        const result = await original(config, values)
        active.depth = 1
        active.release = release
        await armLocal(active)
        return result
      } catch (error) {
        active.depth = 0
        active.release = null
        await original("rollback").catch(() => undefined)
        release()
        throw error
      }
    }

    active.depth = 1
    try {
      await original("begin")
      await armLocal(active)
      const result = await original(config, values)
      await original("commit")
      return result
    } catch (error) {
      await original("rollback").catch(() => undefined)
      throw error
    } finally {
      active.depth = 0
      release()
    }
  }

  return arm
}
