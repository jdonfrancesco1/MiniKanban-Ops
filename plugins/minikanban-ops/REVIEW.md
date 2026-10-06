# Marketplace review checklist

Do not submit this plugin from an agent. James or Orca submits after this list is checked.

Submit the public repo at [cursor.com/marketplace/publish](https://cursor.com/marketplace/publish):

`https://github.com/jdonfrancesco1/MiniKanban-Ops`

The listing is the **minikanban-ops** plugin under `plugins/minikanban-ops`, indexed by `.cursor-plugin/marketplace.json`.

Price, two facts:

1. The Cursor Marketplace listing is free to install. That store requires plugins to be free to end users. Do not enter a price on the publish form.
2. The product and board offering, if sold, is a one-time purchase outside that listing, not a subscription. This package does not set a dollar amount. Do not describe recurring billing.

## Package

- [x] Cursor plugin manifest: `plugins/minikanban-ops/.cursor-plugin/plugin.json`
- [x] `name` is `minikanban-ops` (lowercase kebab-case)
- [x] `description` says what the plugin does
- [x] `mcp.json` URL is `https://minikanban-ops.productvision.workers.dev/mcp`
- [x] Auth header is `Authorization: Bearer ${OPS_BOARD_SECRET}`
- [x] `plugin.json` `variables` requires `OPS_BOARD_SECRET` and does not store a value
- [x] `mcpServers` is pinned to `./mcp.json` (no sibling `.mcp.json`)
- [x] Skill frontmatter: `skills/minikanban-ops-board/SKILL.md`
- [x] Logo committed at `assets/logo.svg` and referenced by a relative path
- [x] Paths in the manifest are relative (no `..`, no absolute paths)
- [x] Plugin `LICENSE` is MIT
- [x] Repo marketplace manifest lists this plugin at `./plugins/minikanban-ops`
- [x] No `OPS_BOARD_SECRET` value, bearer token, or other secret is committed
- [ ] Loaded locally from `~/.cursor/plugins/local/minikanban-ops` with a real secret in **Plugins → Configure**, then `list_board` succeeded

## Live host (checked 2026-10-06)

- [x] `POST /mcp` without a secret returns `401` `{"error":"Unauthorized"}`
- [x] `/connect` advertises only `https://minikanban-ops.productvision.workers.dev`
- [x] Source search found no giantmind host leftover, so the Worker was not redeployed

## Before pressing submit

- [ ] Confirm the GitHub repo is public (marketplace review requires a public repo)
- [ ] Mark this pull request ready and merge it
- [ ] Submit only after the local `list_board` check above
- [ ] Do not paste `OPS_BOARD_SECRET` into the publish form, the PR, or chat
- [ ] Leave Replit Publish alone
