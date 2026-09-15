/**
 * Connection string for the ops board pool / getDb.
 * Prefer OPS_BOARD_DATABASE_URL so Autoscale can target workspace Helium
 * when Replit hides managed DATABASE_URL or Publish DATABASE_URL is Neon.
 */
export function getOpsBoardDatabaseUrl(): string | undefined {
  const override = process.env.OPS_BOARD_DATABASE_URL?.trim()
  if (override) return override
  const fallback = process.env.DATABASE_URL?.trim()
  return fallback || undefined
}
