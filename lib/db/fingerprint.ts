export type DatabaseFingerprint = {
  dbHostSuffix: string
  dbName: string
}

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

const SAFE_NAME = /^[a-zA-Z0-9._-]+$/

function sanitizeToken(value: string, fallback: string) {
  const trimmed = value.trim()
  if (!trimmed || trimmed.length > 64 || !SAFE_NAME.test(trimmed)) return fallback
  if (trimmed.includes("@") || trimmed.includes(":") || trimmed.includes("/")) return fallback
  return trimmed
}

function hostSuffix(hostname: string) {
  const labels = hostname
    .toLowerCase()
    .split(".")
    .map((label) => label.trim())
    .filter(Boolean)
  if (labels.length === 0) return "unknown"
  if (labels.length === 1) return sanitizeToken(labels[0], "unknown")
  const last = labels[labels.length - 1]
  const second = labels[labels.length - 2]
  return sanitizeToken(`${second}.${last}`, "unknown")
}

/**
 * Non-secret view of the ops board URL: last host labels + database name.
 * Uses the same OPS_BOARD_DATABASE_URL → DATABASE_URL preference as getDb.
 * Never returns user, password, port, query string, or the full hostname.
 */
export function fingerprintDatabaseUrl(connectionString: string | undefined | null): DatabaseFingerprint {
  if (!connectionString?.trim()) {
    return { dbHostSuffix: "unset", dbName: "unset" }
  }

  try {
    const parsed = new URL(connectionString)
    const dbName = decodeURIComponent((parsed.pathname || "").replace(/^\//, "").split("/")[0] || "")
    return {
      dbHostSuffix: hostSuffix(parsed.hostname || ""),
      dbName: sanitizeToken(dbName, "unknown"),
    }
  } catch {
    return { dbHostSuffix: "unparsed", dbName: "unparsed" }
  }
}

export function fingerprintProcessDatabase(): DatabaseFingerprint {
  return fingerprintDatabaseUrl(getOpsBoardDatabaseUrl())
}
