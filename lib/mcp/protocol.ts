import { MCP_TOOL_DEFINITIONS, runMcpTool, type OpsToolPort } from "./tools.ts"

export const MCP_SERVER_NAME = "minikanban-ops"
export const MCP_SERVER_VERSION = "0.1.0"
export const MCP_DEFAULT_PROTOCOL = "2025-03-26"
export const MCP_SUPPORTED_PROTOCOLS = [
  "2024-11-05",
  "2025-03-26",
  "2025-06-18",
  "2026-07-28",
] as const

export type JsonRpcId = string | number | null

export type JsonRpcRequest = {
  jsonrpc?: string
  id?: JsonRpcId
  method?: string
  params?: unknown
}

export type JsonRpcError = {
  code: number
  message: string
  data?: unknown
}

export type JsonRpcResponse = {
  jsonrpc: "2.0"
  id: JsonRpcId
  result?: unknown
  error?: JsonRpcError
}

export const JSON_RPC_PARSE_ERROR = -32700
export const JSON_RPC_INVALID_REQUEST = -32600
export const JSON_RPC_METHOD_NOT_FOUND = -32601
export const JSON_RPC_INVALID_PARAMS = -32602
export const JSON_RPC_INTERNAL_ERROR = -32603

function negotiateProtocol(requested: unknown): string {
  if (typeof requested === "string" && MCP_SUPPORTED_PROTOCOLS.includes(requested as (typeof MCP_SUPPORTED_PROTOCOLS)[number])) {
    return requested
  }
  return MCP_DEFAULT_PROTOCOL
}

function isNotification(message: JsonRpcRequest) {
  return message.id === undefined
}

function resultResponse(id: JsonRpcId, result: unknown): JsonRpcResponse {
  return { jsonrpc: "2.0", id, result }
}

function errorResponse(id: JsonRpcId, code: number, message: string, data?: unknown): JsonRpcResponse {
  return { jsonrpc: "2.0", id, error: data === undefined ? { code, message } : { code, message, data } }
}

async function dispatchRequest(message: JsonRpcRequest, port: OpsToolPort): Promise<JsonRpcResponse | null> {
  const id = message.id ?? null
  if (message.jsonrpc !== "2.0" || typeof message.method !== "string" || !message.method) {
    if (isNotification(message)) return null
    return errorResponse(id, JSON_RPC_INVALID_REQUEST, "Invalid Request")
  }

  const method = message.method
  const params = message.params

  try {
    switch (method) {
      case "initialize": {
        const requested =
          params && typeof params === "object" && !Array.isArray(params)
            ? (params as { protocolVersion?: unknown }).protocolVersion
            : undefined
        return resultResponse(id, {
          protocolVersion: negotiateProtocol(requested),
          capabilities: { tools: { listChanged: false } },
          serverInfo: {
            name: MCP_SERVER_NAME,
            version: MCP_SERVER_VERSION,
            title: "MiniKanban Ops",
          },
          instructions:
            "CRUD the MiniKanban Ops board (slug ops). Authenticate with Authorization: Bearer <OPS_BOARD_SECRET> from the MCP connector or server env. Tools never take the secret as a parameter.",
        })
      }
      case "notifications/initialized":
      case "initialized":
      case "notifications/cancelled":
        return null
      case "ping":
        return resultResponse(id, {})
      case "tools/list":
        return resultResponse(id, { tools: MCP_TOOL_DEFINITIONS })
      case "tools/call": {
        const call =
          params && typeof params === "object" && !Array.isArray(params)
            ? (params as { name?: unknown; arguments?: unknown })
            : {}
        if (typeof call.name !== "string" || !call.name) {
          return errorResponse(id, JSON_RPC_INVALID_PARAMS, "tools/call requires name")
        }
        const toolResult = await runMcpTool(call.name, call.arguments ?? {}, port)
        return resultResponse(id, toolResult)
      }
      case "resources/list":
        return resultResponse(id, { resources: [] })
      case "prompts/list":
        return resultResponse(id, { prompts: [] })
      default:
        if (isNotification(message)) return null
        return errorResponse(id, JSON_RPC_METHOD_NOT_FOUND, `Method not found: ${method}`)
    }
  } catch (error) {
    const messageText = error instanceof Error ? error.message : "Internal error"
    if (isNotification(message)) return null
    return errorResponse(id, JSON_RPC_INTERNAL_ERROR, messageText)
  }
}

export type McpDispatchResult = {
  responses: JsonRpcResponse[]
  notificationOnly: boolean
}

export async function dispatchMcpMessage(body: unknown, port: OpsToolPort): Promise<McpDispatchResult> {
  const messages = Array.isArray(body) ? body : [body]
  const responses: JsonRpcResponse[] = []
  for (const message of messages) {
    if (!message || typeof message !== "object") {
      responses.push(errorResponse(null, JSON_RPC_INVALID_REQUEST, "Invalid Request"))
      continue
    }
    const response = await dispatchRequest(message as JsonRpcRequest, port)
    if (response) responses.push(response)
  }
  return {
    responses,
    notificationOnly: responses.length === 0,
  }
}

export function parseMcpJson(raw: string): { ok: true; value: unknown } | { ok: false; error: JsonRpcResponse } {
  try {
    return { ok: true, value: JSON.parse(raw) as unknown }
  } catch {
    return {
      ok: false,
      error: errorResponse(null, JSON_RPC_PARSE_ERROR, "Parse error"),
    }
  }
}
