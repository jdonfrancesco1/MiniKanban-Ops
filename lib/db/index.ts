import { drizzle } from "drizzle-orm/node-postgres"
import { Pool } from "pg"
import * as schema from "./schema"

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

const globalForDb = globalThis as unknown as { opsPool?: Pool }

export function getPool() {
  if (!globalForDb.opsPool) {
    globalForDb.opsPool = createPool()
  }
  return globalForDb.opsPool
}

export const db = drizzle(getPool(), { schema })
