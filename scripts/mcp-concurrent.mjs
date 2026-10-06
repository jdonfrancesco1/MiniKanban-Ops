/**
 * Fire about 8 concurrent authenticated MCP calls at a local wrangler dev server.
 * Every call must come back as JSON-RPC with a result — no Worker 1101 and no timeout.
 *
 *   OPS_BOARD_SECRET=... node scripts/mcp-concurrent.mjs
 *   MCP_BASE_URL defaults to http://127.0.0.1:8787
 *
 * Refuses non-local hosts. Does not print the secret or the database URL.
 */
import { readFileSync } from "node:fs"

const baseUrl = process.env.MCP_BASE_URL || "http://127.0.0.1:8787"
const host = new URL(baseUrl).hostname
if (host !== "127.0.0.1" && host !== "localhost") {
  console.error("Refusing to run against a non-local host.")
  process.exit(1)
}

function readDevVar(name) {
  try {
    const text = readFileSync(new URL("../.dev.vars", import.meta.url), "utf8")
    for (const line of text.split("\n")) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith("#")) continue
      const eq = trimmed.indexOf("=")
      if (eq === -1) continue
      if (trimmed.slice(0, eq).trim() !== name) continue
      return trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "")
    }
  } catch {
    return undefined
  }
  return undefined
}

const secret = process.env.OPS_BOARD_SECRET || readDevVar("OPS_BOARD_SECRET")
if (!secret) {
  console.error("OPS_BOARD_SECRET is not set.")
  process.exit(1)
}

const prefix = `concurrent-mcp-${Date.now()}`
const timeoutMs = Number(process.env.MCP_TIMEOUT_MS || 20000)

async function mcpCall(id, name, args) {
  const started = Date.now()
  const response = await fetch(`${baseUrl}/mcp`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${secret}`,
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id,
      method: "tools/call",
      params: { name, arguments: args },
    }),
    signal: AbortSignal.timeout(timeoutMs),
  })
  const text = await response.text()
  const ms = Date.now() - started
  let payload
  try {
    payload = JSON.parse(text)
  } catch {
    payload = undefined
  }
  const body = text.slice(0, 180)
  const workerError = text.includes("Error 1101") || text.includes("Worker threw exception")
  const result = payload && payload.result
  const ok =
    response.status === 200 &&
    !workerError &&
    payload &&
    payload.jsonrpc === "2.0" &&
    result &&
    result.isError !== true
  return { id, name, status: response.status, ms, ok, workerError, payload, body }
}

function print(row) {
  const detail = row.ok
    ? "result"
    : row.workerError
      ? "1101"
      : row.payload?.result?.isError
        ? `tool error: ${String(row.payload.result.content?.[0]?.text || "").slice(0, 160)}`
        : row.payload?.error?.message || row.body
  console.log(`${row.ok ? "ok" : "FAIL"} ${row.name} status=${row.status} ${row.ms}ms ${detail}`)
}

const seeded = [
  [`${prefix}-update`, "Need you"],
  [`${prefix}-move`, "Need you"],
  [`${prefix}-done`, "Need you"],
  [`${prefix}-archive`, "Need you"],
]

for (const [title, columnTitle] of seeded) {
  const row = await mcpCall(title, "insert_task", { title, columnTitle, brief: "concurrent seed" })
  print(row)
  if (!row.ok) {
    console.error("Seed insert failed; aborting before the concurrent burst.")
    process.exit(1)
  }
}

const burst = await Promise.all([
  mcpCall(1, "list_board", {}),
  mcpCall(2, "list_board", {}),
  mcpCall(3, "insert_task", { title: `${prefix}-insert-a`, columnTitle: "Need you", brief: "burst" }),
  mcpCall(4, "insert_task", { title: `${prefix}-insert-b`, columnTitle: "I'm on", brief: "burst" }),
  mcpCall(5, "update_task", { title: `${prefix}-update`, brief: "updated concurrently" }),
  mcpCall(6, "move_task", { title: `${prefix}-move`, column: "Waiting" }),
  mcpCall(7, "done_task", { title: `${prefix}-done` }),
  mcpCall(8, "archive_task", { title: `${prefix}-archive` }),
])

console.log("--- concurrent ---")
for (const row of burst) print(row)
const failed = burst.filter((row) => !row.ok)
console.log(`${burst.length - failed.length}/${burst.length} concurrent MCP calls returned a JSON-RPC result`)
if (failed.length) process.exit(1)
