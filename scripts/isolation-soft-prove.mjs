#!/usr/bin/env node
/**
 * Non-prod A-vs-B soft-prove. Prints docs/a-vs-b-isolation-proof.md by default.
 *
 *   node scripts/isolation-soft-prove.mjs
 *   node scripts/isolation-soft-prove.mjs --self-check
 *   # export STAGING_BASE_URL, OPS_PROVISION_SECRET, and OPS_BOARD_SECRET in the shell
 *   node scripts/isolation-soft-prove.mjs --run
 *
 * Does not apply Neon migrations. Does not call the production Worker.
 * Does not print provision secrets, fleet secrets, or customer secrets.
 */
import { readFileSync } from "node:fs"
import path from "node:path"
import { pathToFileURL } from "node:url"

const FLEET_WORKER_HOST = "minikanban-ops.productvision.workers.dev"
const FLEET_REPL_HOST = "mini-kanban-ops.replit.app"
const DOC_URL = new URL("../docs/a-vs-b-isolation-proof.md", import.meta.url)

export function checklistText() {
  return readFileSync(DOC_URL, "utf8")
}

/**
 * Null when the origin is a non-prod app the soft-prove may call.
 * A string when the run must stop before any HTTP request.
 */
export function stagingOriginError(raw) {
  if (!raw || !String(raw).trim()) return "STAGING_BASE_URL is unset."
  let url
  try {
    url = new URL(String(raw))
  } catch {
    return "STAGING_BASE_URL is not a URL."
  }
  if (url.username || url.password) return "Refusing a URL with userinfo."
  const host = url.hostname.toLowerCase()
  if (host === FLEET_WORKER_HOST || host.endsWith(".productvision.workers.dev")) {
    return `Refusing production host ${host}. This script does not call the live Worker.`
  }
  if (host === FLEET_REPL_HOST) {
    return `Refusing production host ${host}. This script does not call the live fleet Repl.`
  }
  if (host === "neon.tech" || host.endsWith(".neon.tech")) {
    return "Refusing a Neon host. This script does not apply migrations."
  }
  const local = host === "localhost" || host === "127.0.0.1"
  if (url.protocol === "http:" && local) return null
  if (url.protocol === "https:") return null
  return "Refusing a non-local http origin."
}

function redact(text, secrets) {
  let out = String(text)
  for (const secret of secrets) {
    if (secret && secret.length >= 8) out = out.split(secret).join("[redacted]")
  }
  return out
}

function die(message, code = 2) {
  console.error(message)
  process.exit(code)
}

function printChecklist() {
  process.stdout.write(checklistText())
  if (!checklistText().endsWith("\n")) process.stdout.write("\n")
}

function selfCheck() {
  const cases = [
    [`https://${FLEET_WORKER_HOST}/mcp`, true],
    [`https://${FLEET_REPL_HOST}/boards/ops`, true],
    ["https://ep-example.neon.tech/sql", true],
    ["https://user:pw@staging.example.test", true],
    ["http://staging.example.test", true],
    ["https://staging.example.test", false],
    ["http://127.0.0.1:3000", false],
    ["http://localhost:3000", false],
  ]
  let failed = 0
  for (const [raw, shouldRefuse] of cases) {
    const error = stagingOriginError(raw)
    const ok = shouldRefuse ? Boolean(error) : error === null
    console.log(`${ok ? "PASS" : "FAIL"}  origin ${shouldRefuse ? "refused" : "allowed"}`)
    if (!ok) failed += 1
  }
  const text = checklistText()
  const required = [
    "Browser session",
    "MCP bearer",
    "PASS",
    "FAIL",
    "does not apply Neon migrations",
    FLEET_WORKER_HOST,
    "External customer",
    "synthetic",
    "OPS_BOARD_SECRET",
    "MINIKANBAN_TENANT_SECRET",
  ]
  for (const phrase of required) {
    const ok = text.includes(phrase)
    console.log(`${ok ? "PASS" : "FAIL"}  checklist contains expected step text`)
    if (!ok) failed += 1
  }
  if (failed) process.exit(1)
  console.log("PASS  self-check")
}

function cookieValue(response) {
  const lines = typeof response.headers.getSetCookie === "function" ? response.headers.getSetCookie() : []
  const joined = lines.length ? lines : [response.headers.get("set-cookie") || ""]
  for (const line of joined) {
    const match = /(?:^|,\s*)ops_board_session=([^;]+)/.exec(line)
    if (match) return match[1]
  }
  return null
}

async function readBody(response, secrets) {
  const text = await response.text()
  let json = null
  try {
    json = JSON.parse(text)
  } catch {
    json = null
  }
  return { status: response.status, text: redact(text, secrets), json, raw: text }
}

function markerIn(text, marker) {
  return text.includes(marker)
}

function record(results, secrets, name, ok, detail = "") {
  const line = `${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${redact(detail, secrets)}` : ""}`
  console.log(line)
  results.push(ok)
}

async function requestJson(url, options, secrets) {
  const response = await fetch(url, options)
  return readBody(response, secrets)
}

function toolPayload(name, args, id) {
  return JSON.stringify({
    jsonrpc: "2.0",
    id,
    method: "tools/call",
    params: { name, arguments: args },
  })
}

function toolText(body) {
  const text = body?.json?.result?.content?.[0]?.text
  return typeof text === "string" ? text : ""
}

function presentedTasks(body) {
  try {
    const board = JSON.parse(toolText(body))
    const tasks = []
    for (const column of board.columns || []) {
      for (const task of column.tasks || []) tasks.push(task)
    }
    return tasks
  } catch {
    return null
  }
}

function hardFail(body) {
  if (body.status === 401 || body.status === 403) return true
  const text = toolText(body)
  return body?.json?.result?.isError === true && text === "Forbidden"
}

async function runLive(origin) {
  const provisionSecret = process.env.OPS_PROVISION_SECRET?.trim() || ""
  const fleetSecret = process.env.OPS_BOARD_SECRET?.trim() || ""
  const secrets = [provisionSecret, fleetSecret].filter(Boolean)
  if (!provisionSecret) die("OPS_PROVISION_SECRET is unset. Refusing to run.")
  if (fleetSecret && provisionSecret === fleetSecret) {
    die("OPS_PROVISION_SECRET must not equal OPS_BOARD_SECRET. Refusing to run.")
  }

  const stamp = Date.now().toString(36)
  const buyerA = `soft-prove-a-${stamp}`
  const buyerB = `soft-prove-b-${stamp}`
  const markerA = `iso-a-${stamp}`
  const markerB = `iso-b-${stamp}`
  const results = []
  console.log("A-vs-B soft-prove. This does not apply Neon migrations.")

  async function provision(buyerId) {
    return requestJson(
      `${origin}/api/ops/provision`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${provisionSecret}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ externalBuyerId: buyerId }),
      },
      secrets,
    )
  }

  const createdA = await provision(buyerA)
  const secretA = createdA.json?.connector?.secret
  const tenantA = createdA.json?.tenantId
  const boardA = createdA.json?.board?.id
  if (typeof secretA === "string") secrets.push(secretA)
  const mcpA = createdA.json?.connector?.mcpUrl || ""
  record(
    results,
    secrets,
    "1 provision tenant A",
    createdA.status === 201 &&
      createdA.json?.connector?.secretEnv === "MINIKANBAN_TENANT_SECRET" &&
      !createdA.raw.includes("OPS_BOARD_SECRET") &&
      mcpA === `${origin}/mcp` &&
      !mcpA.includes(FLEET_WORKER_HOST) &&
      typeof secretA === "string" &&
      secretA !== fleetSecret &&
      secretA !== provisionSecret,
    `status ${createdA.status}`,
  )

  const createdB = await provision(buyerB)
  const secretB = createdB.json?.connector?.secret
  const boardB = createdB.json?.board?.id
  if (typeof secretB === "string") secrets.push(secretB)
  const mcpB = createdB.json?.connector?.mcpUrl || ""
  record(
    results,
    secrets,
    "2 provision tenant B",
    createdB.status === 201 &&
      createdB.json?.tenantId &&
      createdB.json.tenantId !== tenantA &&
      typeof secretB === "string" &&
      secretB !== secretA &&
      !createdB.raw.includes("OPS_BOARD_SECRET") &&
      mcpB === `${origin}/mcp`,
    `status ${createdB.status}`,
  )

  const replay = await provision(buyerA)
  record(
    results,
    secrets,
    "3 replay buyer A",
    replay.status === 200 &&
      replay.json?.created === false &&
      replay.json?.connector?.secret == null &&
      (typeof secretA !== "string" || !replay.raw.includes(secretA)),
    `status ${replay.status}`,
  )

  const wrong = await requestJson(
    `${origin}/api/ops/board`,
    { headers: { authorization: "Bearer not-a-tenant-secret" } },
    secrets,
  )
  record(
    results,
    secrets,
    "4 wrong bearer is 401",
    wrong.status === 401 && !markerIn(wrong.raw, markerA) && !markerIn(wrong.raw, markerB),
    `status ${wrong.status}`,
  )

  async function login(secret) {
    const response = await fetch(`${origin}/api/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ secret }),
      redirect: "manual",
    })
    const body = await readBody(response, secrets)
    return { body, cookie: cookieValue(response) }
  }

  async function withCookie(path, cookie, options = {}) {
    return requestJson(
      `${origin}${path}`,
      {
        ...options,
        redirect: options.redirect ?? "follow",
        headers: { ...(options.headers || {}), cookie: `ops_board_session=${cookie}` },
      },
      secrets,
    )
  }

  const sessionA = typeof secretA === "string" ? await login(secretA) : { body: null, cookie: null }
  let taskA = ""
  if (sessionA.cookie?.startsWith("v1.")) {
    const inserted = await withCookie("/api/ops/tasks", sessionA.cookie, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: markerA,
        description: "Synthetic isolation card for tenant A. Safe to archive after the soft-prove.",
      }),
    })
    taskA = inserted.json?.task?.id || ""
  }
  const boardListA = sessionA.cookie ? await withCookie("/api/ops/board", sessionA.cookie) : { status: 0, raw: "" }
  record(
    results,
    secrets,
    "5 tenant A browser session lists only A",
    sessionA.body?.status === 200 &&
      sessionA.body?.json?.success === true &&
      Boolean(sessionA.cookie?.startsWith("v1.")) &&
      markerIn(boardListA.raw, markerA) &&
      !markerIn(boardListA.raw, markerB),
    `login ${sessionA.body?.status ?? 0} board ${boardListA.status}`,
  )

  const sessionB = typeof secretB === "string" ? await login(secretB) : { body: null, cookie: null }
  let taskB = ""
  if (sessionB.cookie?.startsWith("v1.")) {
    const inserted = await withCookie("/api/ops/tasks", sessionB.cookie, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: markerB,
        description: "Synthetic isolation card for tenant B. Safe to archive after the soft-prove.",
      }),
    })
    taskB = inserted.json?.task?.id || ""
  }
  const boardListB = sessionB.cookie ? await withCookie("/api/ops/board", sessionB.cookie) : { status: 0, raw: "" }
  record(
    results,
    secrets,
    "6 tenant B browser session lists only B",
    sessionB.body?.status === 200 &&
      Boolean(sessionB.cookie?.startsWith("v1.")) &&
      markerIn(boardListB.raw, markerB) &&
      !markerIn(boardListB.raw, markerA),
    `login ${sessionB.body?.status ?? 0} board ${boardListB.status}`,
  )

  const crossBoard =
    sessionA.cookie && boardB
      ? await withCookie(`/api/ops/board?boardId=${encodeURIComponent(boardB)}`, sessionA.cookie)
      : { status: 0, raw: "" }
  record(
    results,
    secrets,
    "7 browser A cannot open B board id",
    (crossBoard.status === 403 || crossBoard.status === 401) &&
      !markerIn(crossBoard.raw, markerB) &&
      Boolean(taskB) &&
      !markerIn(crossBoard.raw, taskB),
    `status ${crossBoard.status}`,
  )

  const crossMove =
    sessionA.cookie && taskB
      ? await withCookie(`/api/ops/tasks/${encodeURIComponent(taskB)}/move`, sessionA.cookie, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ columnTitle: "I'm on" }),
        })
      : { status: 0, raw: "" }
  const listedAgain = sessionB.cookie ? await withCookie("/api/ops/board", sessionB.cookie) : { raw: "" }
  const stillNeedYou = (() => {
    const columns = listedAgain.json?.board?.columns
    if (!Array.isArray(columns)) return false
    const column = columns.find((item) =>
      Array.isArray(item.tasks) && item.tasks.some((task) => task.title === markerB || task.id === taskB),
    )
    return column?.title === "Need you"
  })()
  record(
    results,
    secrets,
    "8 browser A cannot move B task",
    (crossMove.status === 403 || crossMove.status === 401) &&
      !markerIn(crossMove.raw, markerB) &&
      stillNeedYou,
    `status ${crossMove.status}`,
  )

  let pageStatus = 0
  let pageRaw = ""
  let pageLocation = ""
  if (sessionA.cookie) {
    const page = await fetch(`${origin}/boards/ops`, {
      headers: { cookie: `ops_board_session=${sessionA.cookie}` },
      redirect: "manual",
    })
    pageStatus = page.status
    pageLocation = page.headers.get("location") || ""
    pageRaw = await page.text()
  }
  const redirected = [301, 302, 303, 307, 308].includes(pageStatus) && pageLocation.includes("/auth")
  record(
    results,
    secrets,
    "9 customer browser does not open the fleet page",
    (redirected || pageStatus === 401) && !markerIn(pageRaw, markerA) && !markerIn(pageRaw, markerB),
    `status ${pageStatus}`,
  )

  async function mcp(secret, name, args, id) {
    if (!secret) return { status: 0, raw: "", json: null }
    return requestJson(
      `${origin}/mcp`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${secret}`,
          "content-type": "application/json",
          accept: "application/json",
        },
        body: toolPayload(name, args, id),
      },
      secrets,
    )
  }

  const mcpListA = await mcp(secretA, "list_board", { slug: "ops" }, 1)
  const mcpListText = `${toolText(mcpListA)}\n${mcpListA.raw}`
  record(
    results,
    secrets,
    "10 tenant A MCP bearer lists only A",
    mcpListA.status === 200 &&
      mcpListA.json?.result?.isError !== true &&
      markerIn(mcpListText, markerA) &&
      !markerIn(mcpListText, markerB),
    `status ${mcpListA.status}`,
  )

  const mcpSlugB = await mcp(secretA, "list_board", { slug: boardB || "missing-board" }, 2)
  record(
    results,
    secrets,
    "11 MCP A cannot read B board id or slug",
    Boolean(boardB) && hardFail(mcpSlugB) && !markerIn(mcpSlugB.raw, markerB),
    `status ${mcpSlugB.status}`,
  )

  const mcpMoveB = await mcp(secretA, "move_task", { id: taskB || "missing-task", column: "I'm on" }, 3)
  const mcpListB = await mcp(secretB, "list_board", { slug: "ops" }, 4)
  const bHome = presentedTasks(mcpListB)?.find((task) => task.title === markerB)
  const bStillHome = bHome?.column === "Need you"
  record(
    results,
    secrets,
    "12 MCP A cannot move B task",
    Boolean(taskB) && hardFail(mcpMoveB) && !markerIn(mcpMoveB.raw, markerB) && bStillHome,
    `status ${mcpMoveB.status}`,
  )

  let fleetBoardId = ""
  let fleetTitles = []
  if (!fleetSecret) {
    record(results, secrets, "13 fleet secret stays fleet-only", false, "OPS_BOARD_SECRET is unset")
    record(results, secrets, "14 customer secret never opens the fleet board", false, "OPS_BOARD_SECRET is unset")
  } else {
    const fleetApi = await requestJson(
      `${origin}/api/ops/board`,
      { headers: { authorization: `Bearer ${fleetSecret}` } },
      secrets,
    )
    const fleetMcp = await mcp(fleetSecret, "list_board", { slug: "ops" }, 5)
    fleetBoardId = fleetApi.json?.board?.id || ""
    const fleetTasks = Array.isArray(fleetApi.json?.board?.columns)
      ? fleetApi.json.board.columns.flatMap((column) => column.tasks || [])
      : []
    fleetTitles = fleetTasks.map((task) => task.title).filter((title) => typeof title === "string" && title.length > 0)
    const fleetRaw = `${fleetApi.raw}\n${fleetMcp.raw}`
    record(
      results,
      secrets,
      "13 fleet secret stays fleet-only",
      fleetApi.status === 200 &&
        fleetMcp.status === 200 &&
        fleetMcp.json?.result?.isError !== true &&
        !markerIn(fleetRaw, markerA) &&
        !markerIn(fleetRaw, markerB),
      `api ${fleetApi.status} mcp ${fleetMcp.status}`,
    )

    const customerOnFleet = fleetBoardId
      ? await requestJson(
          `${origin}/api/ops/board?boardId=${encodeURIComponent(fleetBoardId)}`,
          { headers: { authorization: `Bearer ${secretA}` } },
          secrets,
        )
      : { status: 0, raw: "" }
    const customerMcpFleet = await mcp(secretA, "list_board", { slug: fleetBoardId || "fleet-board" }, 6)
    const leakedTitle = fleetTitles.some(
      (title) => customerOnFleet.raw?.includes(title) || customerMcpFleet.raw?.includes(title),
    )
    record(
      results,
      secrets,
      "14 customer secret never opens the fleet board",
      Boolean(fleetBoardId) &&
        hardFail(customerOnFleet) &&
        hardFail(customerMcpFleet) &&
        !leakedTitle &&
        !markerIn(customerOnFleet.raw || "", markerA),
      `api ${customerOnFleet.status} mcp ${customerMcpFleet.status}`,
    )
  }

  record(
    results,
    secrets,
    "15 customer connector origin is not the fleet host",
    mcpA === `${origin}/mcp` && mcpB === `${origin}/mcp` && !`${mcpA} ${mcpB}`.includes("productvision.workers.dev"),
    "",
  )

  const passed = results.filter(Boolean).length
  console.log(`${passed}/${results.length} passed`)
  if (passed !== results.length) process.exit(1)
}

async function main() {
  const args = process.argv.slice(2)
  if (args.includes("--migrate") || args.includes("db:migrate") || args.includes("db:push")) {
    die("Refusing to migrate. This script does not apply Neon migrations.")
  }
  if (process.env.OPS_APPLY_MIGRATIONS) {
    die("Refusing to migrate. Unset OPS_APPLY_MIGRATIONS. This script does not apply Neon migrations.")
  }
  if (args.length === 0 || args.includes("--print")) {
    printChecklist()
    return
  }
  if (args.includes("--self-check")) {
    selfCheck()
    return
  }
  if (args.includes("--run")) {
    const error = stagingOriginError(process.env.STAGING_BASE_URL)
    if (error) die(error)
    const origin = new URL(process.env.STAGING_BASE_URL).origin
    await runLive(origin)
    return
  }
  die("Usage: node scripts/isolation-soft-prove.mjs [--print | --self-check | --run]")
}

const entry = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : ""
if (entry === import.meta.url) {
  main().catch((error) => {
    const message = error instanceof Error ? error.message : "Soft-prove failed"
    console.error(redact(message, [process.env.OPS_PROVISION_SECRET || "", process.env.OPS_BOARD_SECRET || ""]))
    process.exit(1)
  })
}
