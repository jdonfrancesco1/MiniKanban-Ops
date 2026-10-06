import { MCP_AUTOSCALE_HOST } from "../mcp/lookup.ts"
import { ProvisionError } from "./error.ts"

/** Customer connector env name. Never OPS_BOARD_SECRET. */
export const CUSTOMER_SECRET_ENV = "MINIKANBAN_TENANT_SECRET"

const FLEET_BOARD_HOSTNAME = new URL(MCP_AUTOSCALE_HOST).hostname

/**
 * Origin customers call. The fleet workers.dev host is refused so a handoff
 * cannot point at the fleet board. Paths and userinfo are not kept.
 */
export function assertCustomerBaseUrl(raw: string) {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    throw new ProvisionError(400, "Invalid base URL")
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new ProvisionError(400, "Invalid base URL")
  }
  if (url.username || url.password) throw new ProvisionError(400, "Invalid base URL")
  if (url.hostname.toLowerCase() === FLEET_BOARD_HOSTNAME) {
    throw new ProvisionError(400, "Refusing the fleet board host as a customer connector")
  }
  return url.origin
}

export type CustomerConnector = {
  baseUrl: string
  mcpUrl: string
  secretEnv: typeof CUSTOMER_SECRET_ENV
  secret?: string
  authorization?: string
}

/** Connector for this tenant. The secret is included only on the creating response. */
export function customerConnector(baseUrl: string, secret?: string): CustomerConnector {
  const origin = assertCustomerBaseUrl(baseUrl)
  const connector: CustomerConnector = {
    baseUrl: origin,
    mcpUrl: `${origin}/mcp`,
    secretEnv: CUSTOMER_SECRET_ENV,
  }
  if (secret) {
    connector.secret = secret
    connector.authorization = `Bearer ${secret}`
  }
  return connector
}
