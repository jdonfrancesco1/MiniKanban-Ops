# MiniKanban Ops

Free Cursor plugin that connects an agent harness to the live MiniKanban Ops board.

The board stays at [minikanban-ops.productvision.workers.dev](https://minikanban-ops.productvision.workers.dev). This package only wires the remote [Streamable HTTP MCP](https://minikanban-ops.productvision.workers.dev/mcp). It does not contain `OPS_BOARD_SECRET`.

| | |
| --- | --- |
| MCP URL | `https://minikanban-ops.productvision.workers.dev/mcp` |
| Alias | `https://minikanban-ops.productvision.workers.dev/api/mcp` |
| Connect page | [/connect](https://minikanban-ops.productvision.workers.dev/connect) |
| Transport | Streamable HTTP |
| Auth header | `Authorization: Bearer ${OPS_BOARD_SECRET}` |
| Tools | `list_board`, `insert_task`, `move_task`, `done_task`, `archive_task`, `update_task` |

`OPS_BOARD_SECRET` is the same secret as the board login. Tools never take it as a parameter. Do not paste it into chat, tool arguments, or git.

## Install the plugin

Cursor discovers this folder from the repo marketplace manifest (`.cursor-plugin/marketplace.json` → `plugins/minikanban-ops`).

1. Install **MiniKanban Ops** from the marketplace (after it is listed) or from a team marketplace that imports this repo.
2. Open **Plugins → Configure** and set **Ops board secret** (`OPS_BOARD_SECRET`).
3. Reload the window. The `minikanban-ops` server should appear under MCP. Its config is read-only; the secret stays in plugin configuration.

`mcp.json` is pinned from `.cursor-plugin/plugin.json` (`"mcpServers": "./mcp.json"`):

```json
{
  "mcpServers": {
    "minikanban-ops": {
      "type": "http",
      "url": "https://minikanban-ops.productvision.workers.dev/mcp",
      "headers": {
        "Authorization": "Bearer ${OPS_BOARD_SECRET}"
      }
    }
  }
}
```

`${OPS_BOARD_SECRET}` is a plugin variable. It is not a shell variable and it is not a committed secret.

### Try it before marketplace review

Copy this directory to `~/.cursor/plugins/local/minikanban-ops` (the copy must include `.cursor-plugin/plugin.json`). Restart Cursor or run **Developer: Reload Window**. Set `OPS_BOARD_SECRET` in **Plugins → Configure**, then confirm `list_board` returns columns. A marketplace install with the same name takes precedence over the local copy.

## Cursor Settings → MCP

Same steps as [/connect](https://minikanban-ops.productvision.workers.dev/connect), for a harness that is not using the plugin variable:

1. **Settings → MCP → Add new MCP server**.
2. Transport: Streamable HTTP.
3. URL: `https://minikanban-ops.productvision.workers.dev/mcp`.
4. Header: `Authorization: Bearer <OPS_BOARD_SECRET>` stored on the connector.

Or merge this into the user or project `mcp.json`. Prefer the client’s env interpolation over a hardcoded secret. In a Cursor project `mcp.json`, that is `${env:OPS_BOARD_SECRET}` from the shell environment — a different placeholder from the plugin variable above.

```json
{
  "mcpServers": {
    "minikanban-ops": {
      "url": "https://minikanban-ops.productvision.workers.dev/mcp",
      "headers": {
        "Authorization": "Bearer ${env:OPS_BOARD_SECRET}"
      }
    }
  }
}
```

## Grok Bot task list

Grok Bot uses this board as the source of truth for ops cards. The inline **Task List** in chat summarizes the user's MKB (MiniKanban) tasks from `list_board`, grouped by **Need you**, **I'm on**, and **Done** (include **Waiting** when that column has cards).

Guide: [docs/grok-bot-task-list.md](docs/grok-bot-task-list.md).

1. Connect the MCP at `https://minikanban-ops.productvision.workers.dev/mcp`. Board: `https://minikanban-ops.productvision.workers.dev/boards/ops`.
2. Read and write cards only through this MCP. Do not keep a second task list.
3. The inline Task List is a summary of those MKB board columns, not a separate tracker.
4. `insert_task` requires a real `description`. Done requires `closeSubStatus`: `Closed`, `No Longer Needed`, or `Duplicate`.

## Grok Bot AddMcpServer

Point AddMcpServer at the workers.dev URL. Keep `OPS_BOARD_SECRET` on the connector. Same steps as the [task list guide](docs/grok-bot-task-list.md).

```
AddMcpServer
  name: minikanban-ops
  url: https://minikanban-ops.productvision.workers.dev/mcp
  transport: streamable-http
  headers:
    Authorization: Bearer <OPS_BOARD_SECRET from connector env>
```

## Board

Columns: **Need you**, **I'm on**, **Waiting**, **Done**.

`insert_task` requires a real description and is idempotent: an active card with the same title is reused and not overwritten. `done_task`, and a move into Done, require `closeSubStatus` (`Closed`, `No Longer Needed`, or `Duplicate`) and stamp `completedAt`. `archive_task` soft-archives. The skill in `skills/minikanban-ops-board/SKILL.md` describes when to call each tool.

Visual board: [https://minikanban-ops.productvision.workers.dev/boards/ops](https://minikanban-ops.productvision.workers.dev/boards/ops).

## License

MIT. See [LICENSE](LICENSE).
