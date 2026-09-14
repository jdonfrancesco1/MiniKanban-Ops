import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres"
import { Pool } from "pg"
import * as schema from "./schema"

export type OpsDb = NodePgDatabase<typeof schema>

function createPool() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Add a Neon connection string to .env.local (see .env.example).",
    )
  }

  const isLocal = /localhost|127\.0\.0\.1/.test(connectionString)

  return new Pool({
    connectionString,
    ssl: isLocal ? undefined : { rejectUnauthorized: false },
    max: 8,
  })
}

const globalForDb = globalThis as unknown as { opsPool?: Pool; opsDb?: OpsDb }

export function getPool() {
  if (!globalForDb.opsPool) {
    globalForDb.opsPool = createPool()
  }
  return globalForDb.opsPool
}

export function getDb(): OpsDb {
  if (!globalForDb.opsDb) {
    globalForDb.opsDb = drizzle(getPool(), { schema })
  }
  return globalForDb.opsDb
}

/**
 * Lazy so `next build` can import server modules / collect route data
 * without a live DATABASE_URL (Replit Publish build has secrets only at runtime).
 */
export const db: OpsDb = new Proxy({} as OpsDb, {
  get(_target, property) {
    const instance = getDb()
    const value = Reflect.get(instance, property, instance)
    return typeof value === "function" ? value.bind(instance) : value
  },
})
