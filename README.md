# MiniKanban Ops

Ops kanban for James ↔ Grok Bot (Orca) work progress.

Source: leftover MiniKanban V0 app (`mini-kanban-app-v-2-0`), now a private single-user board on **Neon + Drizzle** (same stack as Giant Mind: `drizzle-orm` + `pg`). Firebase is gone.

## Intent

Visual board for chat work. Default columns:

- Need you
- I'm on
- Waiting
- Done

Thin HTTP API so Orca can list and move cards from Grok Bot chat widgets. The visual board stays on this Repl — chat shows pickable card widgets, not an iframe. MCP can come later.

## Product Vision

Land this Repl under the Product Vision team on Replit (import from this GitHub repo). Set `DATABASE_URL` and `OPS_BOARD_SECRET` in Replit Secrets, then run `npm install --legacy-peer-deps`, `npm run db:push`, and `npm run dev`.

## Stack

Next.js 15 + Tailwind + @dnd-kit + **Neon Postgres** + **Drizzle ORM** (`drizzle-orm` / `pg` / `drizzle-kit`).

## Env vars

Copy `.env.example` to `.env.local`:

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | Neon (or local Postgres) connection string |
| `OPS_BOARD_SECRET` | Recommended in prod | Shared password. Sets an httpOnly session cookie. If omitted, the board is open. |

Do not add `NEXT_PUBLIC_FIREBASE_*`. There is no Firebase.

## Database

1. Create a Neon project and copy the connection string into `DATABASE_URL`.
2. Apply the schema (pick one):

```bash
# Recommended for v1 — push the Drizzle schema to Neon
npm run db:push

# Or generate + migrate
npm run db:generate
npm run db:migrate

# Or run the SQL by hand in the Neon SQL editor
# drizzle/0000_init.sql
```

The first authenticated load of `/boards` or `/boards/ops` creates the default **Ops** board with the four columns above. No seed script required.

`drizzle.config.ts` falls back to `postgresql://user:password@localhost:5432/minikanban_ops` only so `drizzle-kit` can start without a live Neon account. That placeholder is not a real database.

## Run

```bash
npm install --legacy-peer-deps
cp .env.example .env.local   # then edit DATABASE_URL / OPS_BOARD_SECRET
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

Ensures the default Ops board exists. Returns `{ board: { id, title, slug, columns: [{ id, title, order, tasks: [{ id, title, description, order, columnId }] }] } }`.

```bash
curl -sS http://localhost:3000/api/ops/board \
  -H "Authorization: Bearer $OPS_BOARD_SECRET"
```

### `POST /api/ops/tasks`

Body `{ "title": "…", "columnTitle": "Need you" }`. `columnTitle` is optional and defaults to **Need you**. Creates the card at the end of that column. Returns `{ task, columnId }`.

```bash
curl -sS http://localhost:3000/api/ops/tasks \
  -H "Authorization: Bearer $OPS_BOARD_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"title":"Follow up with James"}'
```

### `POST /api/ops/tasks/:id/move`

Body `{ "columnTitle": "I'm on" }` or `{ "columnId": "…" }`. Moves the card to the end of that column. Returns `{ task }`.

```bash
curl -sS http://localhost:3000/api/ops/tasks/TASK_ID/move \
  -H "Authorization: Bearer $OPS_BOARD_SECRET" \
  -H "Content-Type: application/json" \
  -d "{\"columnTitle\":\"I'm on\"}"
```

Optional: `PATCH /api/ops/tasks/:id` with `{ "title" }` and/or `{ "description" }`.

Equivalent agent header: `-H "X-Ops-Board-Secret: $OPS_BOARD_SECRET"`.

## Out of scope

MCP connector (later). Multi-tenant SaaS. Phone auth. Stickers product. Firebase anything. Sticker + audio uploads that depended on Firebase Storage are stubbed/disabled.
