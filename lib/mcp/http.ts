import type { TenantCredentialRecord } from "../auth/credentials.ts"
import { verifyOpsSecret } from "../auth/token.ts"
import { presentedMcpSecret, resolveMcpAccess } from "./auth.ts"
import {
  MCP_DEFAULT_PROTOCOL,
  MCP_SERVER_NAME,
  MCP_SERVER_VERSION,
  dispatchMcpMessage,
  parseMcpJson,
  type JsonRpcResponse,
} from "./protocol.ts"
import { MCP_AUTOSCALE_URL } from "./lookup.ts"
import { MCP_TOOL_NAMES, type OpsToolPort } from "./tools.ts"

export type McpHttpOptions = {
  expectedSecret?: string | undefined
  port: OpsToolPort
  customerCredentials?: readonly TenantCredentialRecord[]
  loadCustomerCredentials?: () => Promise<readonly TenantCredentialRecord[]>
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Authorization, Content-Type, Accept, Mcp-Session-Id, MCP-Protocol-Version, Last-Event-ID, X-Ops-Board-Secret",
  "Access-Control-Expose-Headers": "Mcp-Session-Id, MCP-Protocol-Version",
}

function jsonResponse(status: number, body: unknown, extra?: HeadersInit) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "MCP-Protocol-Version": MCP_DEFAULT_PROTOCOL,
      ...CORS_HEADERS,
      ...extra,
    },
  })
}

function sseResponse(status: number, payload: JsonRpcResponse | JsonRpcResponse[], extra?: HeadersInit) {
  const chunks = Array.isArray(payload) ? payload : [payload]
  const body = chunks.map((item) => `event: message\ndata: ${JSON.stringify(item)}\n\n`).join("")
  return new Response(body, {
    status,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "MCP-Protocol-Version": MCP_DEFAULT_PROTOCOL,
      ...CORS_HEADERS,
      ...extra,
    },
  })
}

function sessionHeaders(request: Request, initialized: boolean) {
  const existing = request.headers.get("mcp-session-id")?.trim()
  const sessionId = existing || (initialized ? `ops-${crypto.randomUUID()}` : "")
  return sessionId ? { "Mcp-Session-Id": sessionId } : undefined
}

function wantsSseOnly(request: Request) {
  const accept = request.headers.get("accept") || ""
  return accept.includes("text/event-stream") && !accept.includes("application/json")
}

export function mcpCorsPreflight() {
  return new Response(null, { status: 204, headers: CORS_HEADERS })
}

export function mcpUnauthorizedResponse() {
  return jsonResponse(
    401,
    { error: "Unauthorized" },
    { "WWW-Authenticate": 'Bearer realm="minikanban-ops"' },
  )
}

export function mcpServerInfo() {
  return {
    name: MCP_SERVER_NAME,
    version: MCP_SERVER_VERSION,
    title: "MiniKanban Ops",
    transport: "streamable-http",
    protocol: MCP_DEFAULT_PROTOCOL,
    url: MCP_AUTOSCALE_URL,
    tools: [...MCP_TOOL_NAMES],
    auth: {
      type: "bearer",
      header: "Authorization",
      env: "OPS_BOARD_SECRET",
      note: "Store the secret on the MCP connector / server env. Tools never take it as a parameter.",
    },
  }
}

async function customerRecords(options: McpHttpOptions) {
  if (options.customerCredentials) return options.customerCredentials
  if (!options.loadCustomerCredentials) return []
  try {
    return await options.loadCustomerCredentials()
  } catch {
    return []
  }
}

export async function handleMcpHttp(request: Request, options: McpHttpOptions): Promise<Response> {
  const fleetSecret = options.expectedSecret ?? process.env.OPS_BOARD_SECRET
  const presented = presentedMcpSecret(request.headers)
  const production = process.env.NODE_ENV === "production"
  const fleetHit = Boolean(presented && fleetSecret && verifyOpsSecret(presented, fleetSecret))
  const records = presented && !fleetHit ? await customerRecords(options) : []
  const access = await resolveMcpAccess({ presented, fleetSecret, records, production })
  if (!access.allowFleetTools) {
    if (access.status === 403) return jsonResponse(403, { error: "Forbidden" })
    return mcpUnauthorizedResponse()
  }

  if (request.method === "OPTIONS") return mcpCorsPreflight()

  if (request.method === "GET") {
    if (wantsSseOnly(request) || request.headers.get("mcp-session-id")) {
      return jsonResponse(405, {
        error: "Stateless Streamable HTTP — POST JSON-RPC to this URL. SSE sessions are not used.",
      })
    }
    return jsonResponse(200, mcpServerInfo())
  }

  if (request.method === "DELETE") {
    return jsonResponse(405, { error: "Stateless Streamable HTTP — no session to delete." })
  }

  if (request.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" })
  }

  const raw = await request.text()
  if (!raw.trim()) {
    return jsonResponse(400, { jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } })
  }

  const parsed = parseMcpJson(raw)
  if (!parsed.ok) {
    return jsonResponse(400, parsed.error)
  }

  const dispatched = await dispatchMcpMessage(parsed.value, options.port)
  const extra = sessionHeaders(request, true)

  if (dispatched.notificationOnly) {
    return new Response(null, { status: 202, headers: { ...CORS_HEADERS, ...extra } })
  }

  const payload = Array.isArray(parsed.value) ? dispatched.responses : dispatched.responses[0]
  if (wantsSseOnly(request)) {
    return sseResponse(200, payload, extra)
  }
  return jsonResponse(200, payload, extra)
}
