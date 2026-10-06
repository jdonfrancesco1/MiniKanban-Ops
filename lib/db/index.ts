import { getCloudflareContext } from "@opennextjs/cloudflare/cloudflare-context"
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres"
import { after } from "next/server"
import { Client, type ClientConfig } from "pg"
import { getOpsBoardDatabaseUrl } from "./fingerprint"
import { scopeToRequest } from "./request-scope"
import * as schema from "./schema"

export type OpsDb = NodePgDatabase<typeof schema>

const requestDbs = new WeakMap<object, OpsDb>()
let nodeDb: OpsDb | undefined

function requireConnectionString() {
  const connectionString = getOpsBoardDatabaseUrl()
  if (!connectionString) {
    throw new Error(
      "OPS_BOARD_DATABASE_URL or DATABASE_URL is not set. Add a Postgres connection string to .env.local (see .env.example).",
    )
  }
  return connectionString
}

function clientConfig(connectionString: string): ClientConfig {
  const isLocal = /localhost|127\.0\.0\.1/.test(connectionString)
  return {
    connectionString,
    ssl: isLocal ? undefined : { rejectUnauthorized: false },
  }
}

function openClient(connectionString: string) {
  const client = new Client(clientConfig(connectionString))
  client.on("error", () => {
    // Queries reject with the driver error. Swallow the socket event so it
    // cannot crash the isolate, and do not log the connection string.
  })
  const connecting = client.connect()
  connecting.catch(() => {
    // The failed connect rejects in-flight queries. close() still calls end().
  })
  return {
    value: drizzle(client, { schema }),
    close: async () => {
      await connecting.catch(() => undefined)
      await client.end().catch(() => undefined)
    },
  }
}

function isWorkersRuntime() {
  return typeof navigator !== "undefined" && navigator.userAgent === "Cloudflare-Workers"
}

function getWorkerDb(): OpsDb {
  const { ctx } = getCloudflareContext()
  const connectionString = requireConnectionString()
  // A socket opened for one Worker request cannot be used by the next one.
  // Create a pg Client for this request and ctx.waitUntil(client.end()) after
  // the response is finished (Next.js after → release → end).
  return scopeToRequest(ctx, requestDbs, () => openClient(connectionString), (release) => {
    after(() => {
      release()
    })
  })
}

function getNodeDb(): OpsDb {
  if (!nodeDb) {
    nodeDb = openClient(requireConnectionString()).value
  }
  return nodeDb
}

export function getDb(): OpsDb {
  if (isWorkersRuntime()) return getWorkerDb()
  return getNodeDb()
}

/**
 * Lazy so `next build` can import server modules / collect route data
 * without a live OPS_BOARD_DATABASE_URL / DATABASE_URL
 * (secrets exist only at runtime).
 * On Workers, the first property access opens a per-request client.
 */
export const db: OpsDb = new Proxy({} as OpsDb, {
  get(_target, property) {
    const instance = getDb()
    const value = Reflect.get(instance, property, instance)
    return typeof value === "function" ? value.bind(instance) : value
  },
})
