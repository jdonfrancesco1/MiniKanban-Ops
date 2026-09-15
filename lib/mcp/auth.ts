import { verifyOpsSecret } from "../auth/token.ts"

export type McpHeaderSource = {
  get: (name: string) => string | null
}

export type McpAuthResult =
  | { ok: true }
  | { ok: false; status: 401; error: "Unauthorized" }

/** Same presentation as `/api/ops/*`: Bearer, then X-Ops-Board-Secret. */
export function presentedMcpSecret(headers: McpHeaderSource): string | null {
  const authorization = headers.get("authorization")
  if (authorization) {
    const match = /^Bearer\s+(.+)$/i.exec(authorization.trim())
    const token = match?.[1]?.trim()
    if (token) return token
  }
  return headers.get("x-ops-board-secret")?.trim() || null
}

export function authorizeMcpRequest(
  headers: McpHeaderSource,
  expectedSecret = process.env.OPS_BOARD_SECRET,
): McpAuthResult {
  if (!expectedSecret) return { ok: true }
  const presented = presentedMcpSecret(headers)
  if (presented && verifyOpsSecret(presented, expectedSecret)) {
    return { ok: true }
  }
  return { ok: false, status: 401, error: "Unauthorized" }
}
