# A-vs-B isolation soft-prove (non-prod)

Two synthetic tenants on a non-prod origin. Browser session and MCP bearer both covered. Mark each step **PASS** or **FAIL**. A FAIL on any step means the proof failed.

This checklist does not apply Neon migrations. It does not deploy the Worker. It does not rotate live `OPS_*` secrets. It does not submit the marketplace listing. Do not paste secrets into git, a PR, logs, or chat.

Dogfood on the fleet board is not an External customer. The fleet board is not the customer connector.

Hermetic coverage (no network) is `lib/ops/isolation-proof.test.ts`. Print this page with:

```bash
node scripts/isolation-soft-prove.mjs
```

Run the steps against a non-prod origin only after that database already has `0005`, `0006` (FORCE RLS), and `0007` (provision). Applying those files is a separate change. This script will not apply them.

```bash
# Export STAGING_BASE_URL, OPS_PROVISION_SECRET, and OPS_BOARD_SECRET in the shell.
# Do not write the values into a file, and do not commit them.
node scripts/isolation-soft-prove.mjs --run
```

The server for that origin must have `OPS_TENANT_SESSION_SECRET` set to a value that is not `OPS_BOARD_SECRET`, or customer browser login fails closed. `OPS_PUBLIC_BASE_URL` on that server must be the same non-prod origin.

## Refused targets

| Target | Result |
| --- | --- |
| `https://minikanban-ops.productvision.workers.dev` | FAIL closed. Live production Worker. |
| `https://mini-kanban-ops.replit.app` | FAIL closed. Live fleet Repl. |
| Any `*.neon.tech` host | FAIL closed. Not an app origin, and this proof does not migrate. |
| A URL with a username or password | FAIL closed. |

`node scripts/isolation-soft-prove.mjs --run` exits before any HTTP call when the origin is refused or `OPS_PROVISION_SECRET` is unset.

## Steps

Synthetic buyer ids look like `soft-prove-a-<stamp>` and `soft-prove-b-<stamp>`. Card titles look like `iso-a-<stamp>` and `iso-b-<stamp>`. Those titles are markers, not secrets. The provision secret, the fleet secret, and both customer secrets stay in the shell.

1. **Provision tenant A.** `POST /api/ops/provision` with `Authorization: Bearer $OPS_PROVISION_SECRET` and `{"externalBuyerId":"soft-prove-a-<stamp>"}`.
   - PASS when status is 201, `connector.secretEnv` is `MINIKANBAN_TENANT_SECRET`, the body does not contain `OPS_BOARD_SECRET`, and `connector.mcpUrl` is `{STAGING_BASE_URL}/mcp` (not `minikanban-ops.productvision.workers.dev`).
   - FAIL when the status is anything else, the fleet env name appears, or the connector origin is the fleet host.

2. **Provision tenant B.** Same call with `soft-prove-b-<stamp>`.
   - PASS when status is 201, `tenantId` differs from A, and the returned secret differs from A.
   - FAIL when B reuses A's tenant or A's secret.

3. **Replay buyer A.** Same buyer id as step 1.
   - PASS when status is 200, `created` is false, and the body does not contain A's secret.
   - FAIL when a second secret is minted.

4. **Wrong bearer is 401.** `GET /api/ops/board` with `Authorization: Bearer not-a-tenant-secret`.
   - PASS when status is 401 and the body contains neither marker title.
   - FAIL when any card title is returned.

5. **Tenant A browser session lists only A.** `POST /api/auth/login` with A's secret. Send the `ops_board_session` cookie (no bearer) to `GET /api/ops/board`, then `POST /api/ops/tasks` with title `iso-a-<stamp>` and a real description.
   - PASS when login succeeds, the cookie starts with `v1.`, the board JSON contains `iso-a-<stamp>`, and it does not contain `iso-b-<stamp>`.
   - FAIL when login fails, the cookie is missing, or B's marker appears.

6. **Tenant B browser session lists only B.** Same login and insert for B with title `iso-b-<stamp>`.
   - PASS when B's board contains `iso-b-<stamp>` and does not contain `iso-a-<stamp>`.
   - FAIL when A's marker appears on B's board.

7. **Browser A cannot open B's board id.** `GET /api/ops/board?boardId=<B board id>` with A's session cookie.
   - PASS when status is 403 or 401, or the board is empty, and the body contains neither `iso-b-<stamp>` nor B's board id as a returned card.
   - FAIL when B's marker or B's task id is in the body.

8. **Browser A cannot open B's task id.** `POST /api/ops/tasks/<B task id>/move` with A's cookie and `{"columnTitle":"I'm on"}`. Then list B again with B's cookie.
   - PASS when A's call is 403 or 401 and B's card is still in **Need you**.
   - FAIL when B's card moves or A's response includes B's marker.

9. **Customer browser does not open the fleet page.** `GET /boards/ops` with A's cookie, redirects left unfollowed.
   - PASS when the response redirects to `/auth` (301–307) or is 401, and the body contains neither marker.
   - FAIL when the fleet board HTML is returned.

10. **Tenant A MCP bearer lists only A.** `POST /mcp` JSON-RPC `tools/call` `list_board` with `Authorization: Bearer <A secret>` and slug `ops`.
    - PASS when the tool result contains `iso-a-<stamp>` and does not contain `iso-b-<stamp>`.
    - FAIL when B's marker is present or the call is unauthorized for A.

11. **MCP A cannot read B's board id or slug.** `list_board` with slug set to B's board id, using A's bearer.
    - PASS when the tool result is an error whose text is `Forbidden` (JSON-RPC HTTP status may stay 200) or the HTTP status is 401 or 403, and `iso-b-<stamp>` is absent.
    - FAIL when B's rows are returned.

12. **MCP A cannot move B's task.** `move_task` with B's task id and column `I'm on`, using A's bearer. List B again with B's bearer.
    - PASS when the tool result is `Forbidden` or the HTTP status is 401 or 403, and B's card is still in **Need you**.
    - FAIL when the card moves or the error body includes B's marker.

13. **Fleet secret stays fleet-only.** `GET /api/ops/board` and MCP `list_board` with `Authorization: Bearer $OPS_BOARD_SECRET`.
    - PASS when neither response contains `iso-a-<stamp>` or `iso-b-<stamp>`.
    - FAIL when a customer marker appears, or when `OPS_BOARD_SECRET` is unset (the fleet half is then unproved).

14. **Customer secret never opens the fleet board.** `GET /api/ops/board?boardId=<fleet board id>` with A's bearer, and MCP `list_board` with slug set to that fleet board id.
    - PASS when each call is 403, 401, or a `Forbidden` tool error, and neither body contains a task title from the fleet list in step 13.
    - FAIL when a fleet card title from step 13 is returned to A.

15. **Customer connector origin is not the fleet host.** Already required in step 1. Repeat the check on B's `connector.mcpUrl`.
    - PASS when both MCP URLs use the staging origin.
    - FAIL when either URL contains `productvision.workers.dev`.

## After the run

The script prints one `PASS` or `FAIL` line per step and a count. Exit 0 means every step passed. Exit 1 means a step failed. Exit 2 means the run was refused (production host, Neon host, userinfo, or missing provision secret) and no tenant was created by this script.

Leave the synthetic tenants in place on non-prod or archive their cards later. Do not copy their secrets into the fleet connector. Do not point a customer at `OPS_BOARD_SECRET` or at `https://minikanban-ops.productvision.workers.dev/mcp`.

Sell HOLD stays until this page is all PASS on non-prod and the live database has FORCE RLS plus the provision column. A green `npm test` does not replace this page.
