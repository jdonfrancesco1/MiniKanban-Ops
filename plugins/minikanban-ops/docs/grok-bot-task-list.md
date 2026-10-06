# Grok Bot: MiniKanban is the task list

Ops instructions for harnesses that connect to the MiniKanban Ops board. The inline **Task List** in Grok Bot chat summarizes the user's MKB (MiniKanban) tasks from that board.

## 1. Connect

| | |
| --- | --- |
| MCP | `https://minikanban-ops.productvision.workers.dev/mcp` |
| Alias | `https://minikanban-ops.productvision.workers.dev/api/mcp` |
| Board | `https://minikanban-ops.productvision.workers.dev/boards/ops` |
| Transport | Streamable HTTP |
| Auth | `Authorization: Bearer <OPS_BOARD_SECRET>` on the connector |

`OPS_BOARD_SECRET` is the board login. Do not put it in chat, tool arguments, or git.

Grok Bot:

```
AddMcpServer
  name: minikanban-ops
  url: https://minikanban-ops.productvision.workers.dev/mcp
  transport: streamable-http
  headers:
    Authorization: Bearer <OPS_BOARD_SECRET from connector env>
```

Cursor plugin install uses the same URL with `Authorization: Bearer ${OPS_BOARD_SECRET}` set in **Plugins → Configure**. Manual Cursor **Settings → MCP** uses the same URL and stores the secret on the connector.

## 2. Source of truth

Grok Bot uses the MiniKanban Ops board (slug `ops`) as the source of truth for ops cards. Do not keep a second task list in chat memory, a scratch file, or another tracker. Read and write cards only through the `minikanban-ops` MCP (`list_board`, `insert_task`, `move_task`, `done_task`, `archive_task`, `update_task`).

## 3. Inline Task List

When showing current ops work, render an inline **Task List** in the chat. That Task List summarizes the user's MKB tasks from `list_board`, grouped by board column:

- **Need you**
- **I'm on**
- **Done**

Also include **Waiting** when that column has cards, so blocked work is not dropped.

Each row is a card on the board: short id (`MKB-` plus eight hex characters), title, and column. Done rows include `closeSubStatus` when one is set. Do not invent cards that `list_board` did not return.

## 4. Writes

- `insert_task` requires `title` and a real `description`. Empty text and the placeholder "No description yet. Edit the card to add the full ask." are rejected.
- `done_task`, and `move_task` into **Done**, require `closeSubStatus`: `Closed`, `No Longer Needed`, or `Duplicate`. That stamps `completedAt`. Leaving Done clears `closeSubStatus`.
- `archive_task` soft-archives. It does not set a close sub-status.
- An `insert_task` whose title already exists on an active card is skipped and does not overwrite that card.

## 5. Price

Two facts. Do not mix them.

1. **Cursor Marketplace listing.** The official Cursor Marketplace requires plugins to be free to end users on that store. This listing has no price. Installing it from that store does not bill the user and does not start a subscription.
2. **Product intent.** The MiniKanban product and board offering, if sold, is a **one-time purchase**, not a subscription. Commercial checkout sits outside that free listing (for example our own checkout). When copy names a price, call it a one-time purchase. Do not describe monthly, yearly, or other recurring billing.

This package does not set a dollar amount.
