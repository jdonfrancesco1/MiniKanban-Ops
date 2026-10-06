# MiniKanban Ops

Ops kanban for James ↔ Grok Bot (Orca) work progress.

Source: leftover MiniKanban V0 app (`mini-kanban-app-v-2-0`), now a private single-user board on **Neon + Drizzle** (same stack as Giant Mind: `drizzle-orm` + `pg`). Firebase is gone.

## Intent

Visual board for chat work. Default columns:

- Need you
- I'm on
- Waiting
- Done

Thin HTTP API so Orca can list and move cards from Grok Bot chat widgets. The visual board stays on this Repl — chat shows pickable card widgets, not an iframe. Remote MCP (`/mcp`) is the preferred agent path so `OPS_BOARD_SECRET` stays in the connector / server env and never appears in chat tool arguments.

## Product Vision

Land this Repl under the Product Vision team on Replit (import from this GitHub repo). Set `DATABASE_URL` (or `OPS_BOARD_DATABASE_URL`) and `OPS_BOARD_SECRET` in Replit Secrets, then run `npm install --legacy-peer-deps`, `npm run db:push`, and `npm run dev`.

## Stack

Next.js 15 + Tailwind + @dnd-kit + **Neon Postgres** + **Drizzle ORM** (`drizzle-orm` / `pg` / `drizzle-kit`).

## Env vars

Copy `.env.example` to `.env.local`:

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes, unless `OPS_BOARD_DATABASE_URL` is set | Postgres connection string (Replit Helium or Neon). Fallback for the ops board pool. |
| `OPS_BOARD_DATABASE_URL` | Autoscale when Publish `DATABASE_URL` is Neon | **Preferred** connection string for the ops board pool / `getDb` (all ops API + board queries). Set the Autoscale secret to the workspace Helium `DATABASE_URL` if Publish `DATABASE_URL` is Neon. Replit hides managed `DATABASE_URL`, so it cannot be copied in the Publish Secrets UI. |
| `OPS_BOARD_SECRET` | Recommended in prod | Shared password. Sets an httpOnly session cookie. MCP + `/api/ops/*` use `Authorization: Bearer` with this same secret. If omitted, the board is open. |

Do not add `NEXT_PUBLIC_FIREBASE_*`. There is no Firebase.

## Replit Publish / Autoscale secrets

**Workspace Secrets and Autoscale Publish Secrets are separate.** Changing a secret in the Repl Shell / Tools → Secrets does **not** update the published Autoscale deployment until you copy it into Publish Secrets and republish.

James’s live fleet is Replit Postgres:

| Check | Expected |
| --- | --- |
| Host suffix | `helium` (not `neon.tech`) |
| Database name | `heliumdb` |
| Boards | One board, slug `ops` |
| Do not | Create a second board, wipe, or reseed |

**Replit hides managed `DATABASE_URL`.** You cannot copy the workspace Helium URI from the Publish Secrets UI. If Autoscale Publish `DATABASE_URL` is empty or Neon (`*.neon.tech` / `neondb`), set Autoscale secret `OPS_BOARD_DATABASE_URL` to the workspace Helium `DATABASE_URL` (read it in the Repl Shell — host `helium`, db `heliumdb`). The ops board pool prefers `OPS_BOARD_DATABASE_URL` over `DATABASE_URL`. Do not paste the URI into this README, chat, or tickets.

### Exact check after Publish

1. Replit → this Repl → **Publish** (Autoscale) → **Secrets** / environment variables.
2. If Publish `DATABASE_URL` is empty, missing, or a Neon URL (`*.neon.tech` / `neondb`), set Autoscale secret `OPS_BOARD_DATABASE_URL` to the workspace Helium URI (same host `helium` / db `heliumdb` the Shell uses). Do not try to copy managed `DATABASE_URL` from the Publish Secrets UI.
3. Without that override, Autoscale runs `ensureDefaultBoard` against the Neon placeholder and renders Need you / I'm on / Waiting / Done with **0 cards**. Chat/SSH against the workspace still sees the Helium cards.
4. `OPS_BOARD_SECRET` must also match the workspace secret (same login box).
5. Save Publish Secrets and **Publish again**. Then hard-refresh https://mini-kanban-ops.replit.app/boards/ops and sign in.
6. The Ops header fingerprint is honest about whichever URL the pool used, e.g. `38 cards · db helium / heliumdb` (count is whatever is live). If it shows `0 cards · db neon.tech / …`, Autoscale is still on Neon — set `OPS_BOARD_DATABASE_URL`, do not add a second board.
7. Optional session/API check:

```bash
curl -sS https://mini-kanban-ops.replit.app/api/ops/diagnostics \
  -H "Authorization: Bearer $OPS_BOARD_SECRET"
```

Expect `diagnostics.taskCount` > 0, `dbHostSuffix` = `helium`, `dbName` = `heliumdb`. The same fields are on `GET /api/ops/board`. Nothing in that payload is the connection string, user, or password.

`/boards/ops` loads cards from `GET /api/ops/board` (JSON) **before** the Next server-action Flight payload, so nested `column.tasks` / `activeTasks` dropping cannot empty a Helium-backed board.

## Database

1. Set `DATABASE_URL` to the workspace Replit Postgres URI (Helium / `heliumdb`) or a Neon URI. If Autoscale Publish `DATABASE_URL` is Neon, set Autoscale secret `OPS_BOARD_DATABASE_URL` to the workspace Helium URI — see [Replit Publish / Autoscale secrets](#replit-publish--autoscale-secrets).
2. Apply the schema (pick one):

```bash
# Recommended for v1 — push the Drizzle schema to Neon
npm run db:push

# Or generate + migrate
npm run db:generate
npm run db:migrate

# Or run the SQL by hand in the Neon SQL editor
# drizzle/0000_init.sql
# drizzle/0001_task_brief.sql
# drizzle/0002_task_completed_at.sql
```

The first authenticated load of `/boards` or `/boards/ops` creates the default **Ops** board with the four columns above. No seed script required.

`tasks.created_at` is shown on every card. `tasks.completed_at` is stamped when a card enters **Done** and cleared if it leaves Done. Existing Done cards without `completed_at` are backfilled from `updated_at` as a best-effort completion date (not a true completion timestamp). Runtime `ALTER TABLE … ADD COLUMN IF NOT EXISTS` covers `brief` and `completed_at` the same way.

`drizzle.config.ts` falls back to `postgresql://user:password@localhost:5432/minikanban_ops` only so `drizzle-kit` can start without a live Neon account. That placeholder is not a real database.

## Run

```bash
npm install --legacy-peer-deps
cp .env.example .env.local   # then edit DATABASE_URL / OPS_BOARD_DATABASE_URL / OPS_BOARD_SECRET
npm run db:push
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Home deep-links to the ops board (`/boards/ops`) after the secret gate.

## Auth (v1)

Single-user gate. Enter `OPS_BOARD_SECRET` on `/` or `/auth`. Session cookie: `ops_board_session`. No Clerk, no Firebase, no phone auth. Email magic can come later.

There is one password. Browser UI and Orca both use `OPS_BOARD_SECRET`. Do not invent a second secret.

## Chat / agent API (Orca)

Private first slice for James ↔ Orca dogfood. Same Neon board the Repl UI uses.

**Authenticate with either:**

1. Existing session cookie `ops_board_session` (browser), or
2. Agent headers (no cookie jar):
   - `Authorization: Bearer <OPS_BOARD_SECRET>`
   - or `X-Ops-Board-Secret: <OPS_BOARD_SECRET>`

Missing or wrong credentials return `401` JSON: `{ "error": "Unauthorized" }`. If `OPS_BOARD_SECRET` is unset, the gate is open (local/dev).

### `GET /api/ops/board`

Ensures the default Ops board exists. Returns `{ board: { id, title, slug, columns: [{ id, title, order, tasks: [{ id, title, description, brief, order, columnId, createdAt, completedAt, closeSubStatus }] }] } }`. `closeSubStatus` is `Closed`, `No Longer Needed`, `Duplicate`, or `null` until the card is closed into Done.

```bash
curl -sS http://localhost:3000/api/ops/board \
  -H "Authorization: Bearer $OPS_BOARD_SECRET"
```

### `POST /api/ops/tasks`

Body `{ "title": "…", "columnTitle": "Need you", "brief": "…", "description": "…" }`. `columnTitle` is optional and defaults to **Need you**. `description` is required on create: empty text and the placeholder "No description yet. Edit the card to add the full ask." are rejected. Existing cards with an empty description are left as they are. Creates the card at the end of that column. Returns `{ task, columnId }`. Creating straight into **Done** also requires `closeSubStatus`.

```bash
curl -sS http://localhost:3000/api/ops/tasks \
  -H "Authorization: Bearer $OPS_BOARD_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"title":"Follow up with James","description":"Send James the Paylyte page and ask for PASS or a fail note."}'
```

### `POST /api/ops/tasks/:id/move`

Body `{ "columnTitle": "I'm on" }` or `{ "columnId": "…" }`. Moves the card to the end of that column. Returns `{ task }`. Moving into **Done** requires `closeSubStatus`: `Closed`, `No Longer Needed`, or `Duplicate`. Leaving Done clears it. Existing Done cards stay `null` until someone closes them again with a reason.

```bash
curl -sS http://localhost:3000/api/ops/tasks/TASK_ID/move \
  -H "Authorization: Bearer $OPS_BOARD_SECRET" \
  -H "Content-Type: application/json" \
  -d "{\"columnTitle\":\"Done\",\"closeSubStatus\":\"Closed\"}"
```

Optional: `PATCH /api/ops/tasks/:id` with `{ "title" }`, `{ "brief" }`, `{ "description" }`, and/or `{ "closeSubStatus" }`.
`brief` is the 1–2 line card-face summary. `description` is the full ask James sees when he opens the card. Sending `description` must be a real ask (empty or placeholder text is rejected); omit it to leave the current text, including a legacy empty description. `closeSubStatus` can be changed only while the card is already in Done.

Equivalent agent header: `-H "X-Ops-Board-Secret: $OPS_BOARD_SECRET"`.

`POST /api/ops/tasks` is idempotent: if an active card already has the same title (trimmed, case-insensitive), the existing card is returned with `skipped: true` instead of inserting a duplicate.

`PATCH /api/ops/tasks/:id` also accepts `{ "labels": ["Giant"] }`.
`DELETE /api/ops/tasks/:id` soft-archives the card (`archived_at`).

## Remote MCP (Cursor / Grok Bot)

Streamable HTTP on the live Cloudflare worker. Same board and same `lib/api/ops.ts` helpers as `/api/ops/*`. The secret is **only** an HTTP header / connector env var — tools do not accept it.

| | |
| --- | --- |
| URL | `https://minikanban-ops.productvision.workers.dev/mcp` |
| Alias | `https://minikanban-ops.productvision.workers.dev/api/mcp` |
| Docs | [`/connect`](https://minikanban-ops.productvision.workers.dev/connect) |
| Transport | Streamable HTTP (`POST` JSON-RPC) |
| Auth | `Authorization: Bearer <OPS_BOARD_SECRET>` (or `X-Ops-Board-Secret`) |
| Secret env | `OPS_BOARD_SECRET` — store on the MCP connector / Replit / Cursor server env |

### Tools

| Tool | What it does |
| --- | --- |
| `list_board` | Columns + tasks for slug `ops` (default): title, brief, description, column, project labels, createdAt, completedAt, closeSubStatus |
| `insert_task` | Column title + title + **description** (+ optional brief / labels). Description is the full ask; empty or placeholder text is rejected. Skips if an active task with the same title exists (does not overwrite — use `update_task` to fill an empty description). `closeSubStatus` is required when `columnTitle` is Done |
| `move_task` | By title or id → `Need you` \| `I'm on` \| `Waiting` \| `Done`. Done requires `closeSubStatus` |
| `done_task` | Move to Done. Requires `closeSubStatus`: `Closed` \| `No Longer Needed` \| `Duplicate`. Stamps `completed_at` and stores the close sub-status |
| `archive_task` | Soft archive (does not set a close sub-status) |
| `update_task` | title / brief / description / labels / closeSubStatus. A sent description must be a real ask. `closeSubStatus` only on a card already in Done |

### Cursor

Settings → MCP → Add new MCP server (Streamable HTTP), or `mcp.json`:

```json
{
  "mcpServers": {
    "minikanban-ops": {
      "url": "https://minikanban-ops.productvision.workers.dev/mcp",
      "headers": {
        "Authorization": "Bearer <OPS_BOARD_SECRET>"
      }
    }
  }
}
```

Do not put the secret in a tool argument or in chat. Use the connector header (or an env interpolation your client supports).

### Grok Bot / Orca AddMcpServer

```
AddMcpServer
  name: minikanban-ops
  url: https://minikanban-ops.productvision.workers.dev/mcp
  transport: streamable-http
  headers:
    Authorization: Bearer <OPS_BOARD_SECRET from connector env>
```

Point Orca AddMcpServer at that workers.dev URL and keep `OPS_BOARD_SECRET` in the connector env. No SSH, no `psql`, no secret in tool args.

### Cursor plugin

Installable package: [`plugins/minikanban-ops`](plugins/minikanban-ops/README.md). `mcp.json` points at the workers.dev `/mcp` URL with `Authorization: Bearer ${OPS_BOARD_SECRET}`. The secret is a plugin variable set in **Plugins → Configure**, not a committed value. Manual **Settings → MCP** and Grok Bot `AddMcpServer` steps in that README match [`/connect`](https://minikanban-ops.productvision.workers.dev/connect). Grok Bot uses the board as the task list: the inline Task List summarizes MKB columns ([guide](plugins/minikanban-ops/docs/grok-bot-task-list.md)). The Cursor Marketplace listing is free to install. A commercial board offering, if sold, is a one-time purchase outside that listing, not a subscription. No dollar amount is set in the plugin package. Marketplace submit is a manual step after review (`plugins/minikanban-ops/REVIEW.md`).

Local: `http://localhost:3000/mcp` with the same Bearer header.

Card face: project chip · decoded title · brief · muted `Created Sep 14`. Done cards also show `Completed Sep 15` and the close sub-status (`Closed`, `No Longer Needed`, or `Duplicate`) when one is set. Dates use America/New_York short format (detail/edit: `Sep 15, 2026`). Click opens the full description and close status. Dragging a card into Done, or Mark done on the detail view, asks for that close status before the move is saved. Columns scroll so card bottoms are not clipped. Project colors: Giant blue, Paylyte orange, MiniKanban purple/teal, Hangar 18 green, Off Replit slate, Security red, Marketing magenta, Jimbo gold.

## Out of scope

Marketplace selling. Multi-tenant public product. Wiping boards. Replacing the visual board UI. Cloudflare migration. Phone auth. Stickers product. Firebase anything. Sticker + audio uploads that depended on Firebase Storage are stubbed/disabled.
