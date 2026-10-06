import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { describe, it } from "node:test"
import { FLEET_TENANT_ID } from "./ops-defaults.ts"

function read(path: string) {
  return readFileSync(new URL(path, import.meta.url), "utf8")
}

/** Drop line comments and block comments so deferred Slice C SQL is not treated as shipped. */
function executableSql(source: string) {
  const withoutBlock = source.replace(/\/\*[\s\S]*?\*\//g, "")
  return withoutBlock
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n")
}

describe("fleet tenant id", () => {
  it("uses the named fleet key", () => {
    assert.equal(FLEET_TENANT_ID, "fleet")
    assert.match(FLEET_TENANT_ID, /^[a-z][a-z0-9_-]{0,63}$/)
  })
})

describe("tenant_id migration", () => {
  const source = read("../../drizzle/0004_tenant_id.sql")
  const sql = executableSql(source)

  it("adds tenant_id on boards, columns, and tasks and backfills fleet", () => {
    assert.match(sql, /ALTER TABLE boards ADD COLUMN IF NOT EXISTS tenant_id text/)
    assert.match(sql, /ALTER TABLE columns ADD COLUMN IF NOT EXISTS tenant_id text/)
    assert.match(sql, /ALTER TABLE tasks ADD COLUMN IF NOT EXISTS tenant_id text/)
    assert.match(sql, /SET tenant_id = 'fleet'/)
    assert.match(sql, /ALTER TABLE boards ALTER COLUMN tenant_id SET NOT NULL/)
    assert.match(sql, /ALTER TABLE columns ALTER COLUMN tenant_id SET NOT NULL/)
    assert.match(sql, /ALTER TABLE tasks ALTER COLUMN tenant_id SET NOT NULL/)
    assert.doesNotMatch(sql, /tenant_id text default/i)
    assert.doesNotMatch(sql, /SET DEFAULT/i)
  })

  it("keeps parent foreign keys and adds same-tenant composite keys", () => {
    assert.match(sql, /columns_board_tenant_fk/)
    assert.match(sql, /tasks_board_tenant_fk/)
    assert.match(sql, /tasks_column_tenant_fk/)
    assert.match(sql, /FOREIGN KEY \(board_id, tenant_id\)/)
    assert.match(sql, /FOREIGN KEY \(column_id, tenant_id\)/)
    assert.match(sql, /boards_tenant_id_slug_idx/)
    assert.match(source, /Existing board_id \/ column_id foreign keys stay/)
  })

  it("drafts RLS policies and does not enable or force them", () => {
    assert.match(sql, /CREATE POLICY boards_tenant_isolation ON boards/)
    assert.match(sql, /CREATE POLICY columns_tenant_isolation ON columns/)
    assert.match(sql, /CREATE POLICY tasks_tenant_isolation ON tasks/)
    assert.match(sql, /tenant_id = current_setting\('app\.tenant_id', true\)/)
    assert.match(source, /Slice C/)
    assert.doesNotMatch(sql, /ENABLE ROW LEVEL SECURITY/)
    assert.doesNotMatch(sql, /FORCE ROW LEVEL SECURITY/)
    assert.doesNotMatch(sql, /GRANT /i)
  })
})

describe("tenant_id is not client-supplied", () => {
  const schema = read("./schema.ts")
  const boards = read("../actions/boards.ts")
  const opsApi = read("../api/ops.ts")

  it("declares tenant_id on every tenant table without turning RLS on in Drizzle", () => {
    assert.match(schema, /tenantId: text\("tenant_id"\)\.notNull\(\)/)
    assert.equal(schema.match(/tenantId: text\("tenant_id"\)\.notNull\(\)/g)?.length, 3)
    assert.match(schema, /columns_board_tenant_fk/)
    assert.match(schema, /tasks_board_tenant_fk/)
    assert.match(schema, /tasks_column_tenant_fk/)
    assert.doesNotMatch(schema, /enableRLS/)
    assert.doesNotMatch(schema, /\.default\(\s*["']fleet["']\s*\)/)
  })

  it("stamps the fleet tenant on the server and does not read a client tenant", () => {
    assert.match(boards, /tenantId:\s*FLEET_TENANT_ID/)
    assert.doesNotMatch(boards, /searchParams/)
    assert.doesNotMatch(boards, /x-tenant|X-Tenant/)
    assert.doesNotMatch(boards, /body\.tenantId|body\.tenant_id/)
    assert.doesNotMatch(opsApi, /searchParams\.get\(\s*["']tenant/)
    assert.doesNotMatch(opsApi, /body\.tenantId|body\.tenant_id/)
    assert.doesNotMatch(opsApi, /x-tenant|X-Tenant/)
  })
})
