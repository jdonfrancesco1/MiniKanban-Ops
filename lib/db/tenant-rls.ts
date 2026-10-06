/**
 * Transaction-local tenant for FORCE row security.
 *
 * lib/db/index.ts is the only pg Client (ops actions, fleet self-heal, MCP
 * live port). attachTenantRls wraps that client. There is no second pool.
 *
 * At the start of every transaction this runs
 *   SELECT set_config('app.tenant_id', $1, true)
 * The value comes from the resolver registered in lib/auth/session.ts, which
 * calls resolveAuthIdentity(). That is the verified session cookie or bearer.
 * It is not `?tenant=`, a JSON tenant_id, or an X-Tenant-* header.
 *
 * The third argument is true so the setting dies at COMMIT or ROLLBACK.
 * The Node server keeps one Client; a session-level setting would leak
 * across requests. A blank or missing identity leaves the setting unset.
 * After drizzle/0006_force_rls.sql, an unset setting matches no rows
 * (fail closed), including for the table owner.
 *
 * When the verified actor is fleet (OPS_BOARD_SECRET, or the local dev gate),
 * the id is the fleet tenant id, so the fleet board stays visible.
 *
 * Slice C filters in lib/ops/access.ts and lib/actions/boards.ts stay.
 * They do not replace the forced policies.
 *
 * Credential reads (tenant_credentials) use this same client. That table is
 * not under row security. Resolving identity may query it while the setting
 * is still unset; those queries must not recurse into the resolver.
 */

import { AsyncLocalStorage } from "node:async_hooks"

const TENANT_ID_RE = /^[a-z][a-z0-9_-]{0,63}$/

/** Exact statement installed on each transaction. is_local = true. */
export const TENANT_SETTING_SQL = "SELECT set_config('app.tenant_id', $1, true)"

type TenantResolver = () => Promise<string | null> | string | null

let resolver: TenantResolver = () => null

/**
 * Register the verified-tenant source. Production sets this from
 * resolveAuthIdentity(). Tests replace it. A missing resolver fails closed.
 */
export function setVerifiedTenantResolver(next: TenantResolver) {
  resolver = next
}

type Slot = {
  depth: number
  release: (() => void) | null
  arming: boolean
}

const slots = new AsyncLocalStorage<Slot>()

/**
 * Run `fn` as its own request scope. Production requests already have separate
 * async contexts. Tests use this so two callers cannot share one transaction.
 */
export function runInRequestScope<T>(fn: () => Promise<T>): Promise<T> {
  return slots.run({ depth: 0, release: null, arming: false }, fn)
}

type QueryClient = {
  query: (config: unknown, values?: unknown) => Promise<unknown>
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

/**
 * Wrap a pg Client so every transaction sets app.tenant_id from the verified
 * tenant before the caller's statement. Drizzle transactions (BEGIN … COMMIT)
 * are armed once. Autocommit statements are wrapped so is_local = true is
 * visible. A mutex keeps the shared Node client from interleaving tenants.
 */
export function attachTenantRls(client: QueryClient) {
  const original = client.query.bind(client)
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

  async function arm(active: Slot) {
    active.arming = true
    try {
      const value = await resolver()
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
    // Bind the slot synchronously, before the first await, so later queries
    // from this request see the open transaction. enterWith after an await
    // does not propagate back to the caller.
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

    if (isBegin(command)) {
      try {
        const result = await original(config, values)
        active.depth = 1
        active.release = release
        await arm(active)
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
      await arm(active)
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
}
