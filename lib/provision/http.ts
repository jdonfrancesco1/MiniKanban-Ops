import { safeEqual } from "../auth/token.ts"
import { assertCustomerBaseUrl, customerConnector } from "./connector.ts"
import { ProvisionError } from "./error.ts"
import { provisionCustomer, type ProvisionPersistence, type ProvisionResult } from "./provision.ts"

export type ProvisionHttpOptions = {
  provisionSecret?: string
  fleetSecret?: string
  configuredBaseUrl?: string
  persistence: ProvisionPersistence
  mintSecret?: () => string
  mintTenantId?: () => string
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
    },
  })
}

/**
 * Fail closed when a response would contain the fleet secret or the fleet
 * env name. Short secrets are not scanned, so a tiny local value cannot
 * collide with the board slug.
 */
export function responseLeaksFleetSecret(body: unknown, fleetSecret: string) {
  const text = JSON.stringify(body)
  if (text.includes("OPS_BOARD_SECRET")) return true
  if (fleetSecret.length >= 16 && text.includes(fleetSecret)) return true
  return false
}

export function provisionAuthorized(presented: string | null | undefined, env: {
  provisionSecret?: string
  fleetSecret?: string
}) {
  const provisionSecret = env.provisionSecret ?? ""
  const fleetSecret = env.fleetSecret ?? ""
  const token = presented?.trim() ?? ""
  if (!provisionSecret || !token) return false
  if (fleetSecret && safeEqual(provisionSecret, fleetSecret)) return false
  if (fleetSecret && safeEqual(token, fleetSecret)) return false
  return safeEqual(token, provisionSecret)
}

function presentedBearer(request: Request) {
  const authorization = request.headers.get("authorization")
  if (!authorization) return null
  const match = /^Bearer\s+(\S+)\s*$/i.exec(authorization.trim())
  return match?.[1] ?? null
}

function resolveBaseUrl(request: Request, configured?: string) {
  const raw = configured?.trim() || new URL(request.url).origin
  return assertCustomerBaseUrl(raw)
}

function handoffBody(result: ProvisionResult) {
  const board = {
    id: result.board.id,
    slug: result.board.slug,
    title: result.board.title,
    columns: result.board.columns.map((column) => column.title),
  }
  if (result.created) {
    if (!result.secret) throw new ProvisionError(500, "Could not allocate a tenant id")
    return {
      status: 201,
      body: {
        created: true,
        tenantId: result.tenantId,
        board,
        connector: customerConnector(result.baseUrl, result.secret),
      },
    }
  }
  return {
    status: 200,
    body: {
      created: false,
      tenantId: result.tenantId,
      board,
      connector: customerConnector(result.baseUrl),
      secretReturned: false,
    },
  }
}

function buyerIdFromBody(body: unknown) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new ProvisionError(400, "Invalid buyer id")
  }
  const value = (body as { externalBuyerId?: unknown }).externalBuyerId
  if (typeof value !== "string") throw new ProvisionError(400, "Invalid buyer id")
  return value
}

export async function handleProvisionHttp(request: Request, options: ProvisionHttpOptions) {
  if (request.method !== "POST") return json(405, { error: "Method not allowed" })

  const fleetSecret = options.fleetSecret ?? ""
  const bearer = presentedBearer(request)
  if (!provisionAuthorized(bearer, options)) return json(401, { error: "Unauthorized" })

  let baseUrl: string
  try {
    baseUrl = resolveBaseUrl(request, options.configuredBaseUrl)
  } catch (error) {
    if (error instanceof ProvisionError) return json(error.status, { error: error.message })
    return json(400, { error: "Invalid base URL" })
  }

  let buyerId: string
  try {
    buyerId = buyerIdFromBody(await request.json())
  } catch (error) {
    if (error instanceof ProvisionError) return json(error.status, { error: error.message })
    return json(400, { error: "Invalid buyer id" })
  }

  try {
    const result = await provisionCustomer({
      externalBuyerId: buyerId,
      persistence: options.persistence,
      baseUrl,
      fleetSecret,
      provisionSecret: options.provisionSecret,
      mintSecret: options.mintSecret,
      mintTenantId: options.mintTenantId,
    })
    const handoff = handoffBody(result)
    if (responseLeaksFleetSecret(handoff.body, fleetSecret)) {
      return json(500, { error: "Provision store is unavailable" })
    }
    if (options.provisionSecret && options.provisionSecret.length >= 16 && JSON.stringify(handoff.body).includes(options.provisionSecret)) {
      return json(500, { error: "Provision store is unavailable" })
    }
    return json(handoff.status, handoff.body)
  } catch (error) {
    if (error instanceof ProvisionError) return json(error.status, { error: error.message })
    return json(500, { error: "Provision store is unavailable" })
  }
}
