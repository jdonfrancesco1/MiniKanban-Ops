export const DEFAULT_BOARD_SLUG = "ops"
export const DEFAULT_BOARD_TITLE = "Ops"
export const DEFAULT_BOARD_DESCRIPTION = "James ↔ Grok Bot (Orca) work progress"

/**
 * Named tenant for the existing single-secret fleet board.
 * Text, not a uuid: the locked fleet key is the name `fleet`.
 * The current ops path stamps this on the server. It is never taken from
 * a query param, JSON body, or client header. Slices B/C replace it with
 * the tenant on the verified credential or session.
 */
export const FLEET_TENANT_ID = "fleet"

/** Default columns for the ops board — not a marketing To Do / In Progress demo. */
export const OPS_COLUMN_TITLES = ["Need you", "I'm on", "Waiting", "Done"] as const
