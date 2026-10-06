---
name: minikanban-ops-board
description: >
  Use the MiniKanban Ops board through the minikanban-ops MCP.
  Use when listing cards, adding a task, moving a card, marking work done,
  archiving a card, closing a card with a sub-status, or updating title, brief, description, or labels.
---

# MiniKanban Ops board

The board slug is `ops`. Columns, in order:

1. **Need you** — waiting on the person who owns the ask
2. **I'm on** — actively being done
3. **Waiting** — blocked on someone or something else
4. **Done** — finished

`done_task`, and `move_task` into Done, require `closeSubStatus`: `Closed`, `No Longer Needed`, or `Duplicate`. They stamp `completedAt`. Leaving Done clears `closeSubStatus`. `archive_task` soft-archives. It does not delete the card and does not set a close sub-status.

## Tools

Call these on the `minikanban-ops` MCP server. Do not pass `OPS_BOARD_SECRET`, a bearer token, or any password as a tool argument. The connector sends that header.

| Tool | Use |
| --- | --- |
| `list_board` | Columns and active tasks, including `closeSubStatus` (`Closed`, `No Longer Needed`, `Duplicate`, or null). Optional `slug` defaults to `ops`. Only `ops` is supported. |
| `insert_task` | Required `title` and `description` (the full ask; empty or placeholder text is rejected). Optional `columnTitle` (default **Need you**), `brief`, `labels`. `closeSubStatus` is required when `columnTitle` is Done. If an active card already has the same title, the existing card is returned and `skipped` is true. A skip does not overwrite that card. |
| `move_task` | `id` or exact `title`, plus `column` or `columnTitle`: Need you, I'm on, Waiting, or Done. Done requires `closeSubStatus`. |
| `done_task` | `id` or exact `title`, plus required `closeSubStatus`. Moves the card to Done. |
| `archive_task` | `id` or exact `title`. |
| `update_task` | `id` or current `title`, plus at least one of `newTitle`, `brief`, `description`, `labels`, `closeSubStatus`. A sent description must be a real ask. `closeSubStatus` only when the card is already in Done. |

`id` may be the task UUID or the short id (`MKB-` plus eight hex characters). When the id is unknown, pass the exact active title.

`brief` is the one- or two-line card face. `description` is the full ask shown when the card is opened. `labels` replaces the card's project labels.

Read the board with `list_board` before moving or editing a card whose id you do not already have.
