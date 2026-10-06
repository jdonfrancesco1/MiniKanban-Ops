export const DEFAULT_BOARD_SLUG = "ops"
export const DEFAULT_BOARD_TITLE = "Ops"
export const DEFAULT_BOARD_DESCRIPTION = "James ↔ Grok Bot (Orca) work progress"

/**
 * Named tenant for the existing single-secret fleet board.
 * Text, not a uuid: the locked fleet key is the name `fleet`.
 * The fleet ops path stamps this on the server. The verified session or bearer
 * is the only tenant authority. lib/db/tenant-rls.ts copies that id into
 * app.tenant_id inside each transaction. Queries for boards, columns, and
 * tasks are also limited in application code to that tenant. Never take tenant
 * from a query param, JSON body, or client header. drizzle/0006_force_rls.sql
 * is what makes the table owner obey the row policy. These app filters stay.
 */
export const FLEET_TENANT_ID = "fleet"

/** Default columns for the ops board — not a marketing To Do / In Progress demo. */
export const OPS_COLUMN_TITLES = ["Need you", "I'm on", "Waiting", "Done"] as const
