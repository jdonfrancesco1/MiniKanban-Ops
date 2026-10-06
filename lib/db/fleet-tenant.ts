import { sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { FLEET_TENANT_ID } from "@/lib/db/ops-defaults"

/**
 * Add tenant_id and backfill the fleet tenant when the column is not there yet.
 * Matches the column/backfill/NOT NULL portion of drizzle/0004_tenant_id.sql so the
 * single-secret ops path keeps loading if that migration has not been applied.
 * Does not enable or force row security. That is drizzle/0006_force_rls.sql.
 * This statement runs on the shared client, so the verified tenant is applied
 * before it executes. Backfill of null tenant ids belongs to 0004, which runs
 * before FORCE. After FORCE, a null tenant_id is not visible to the table owner.
 * Full foreign keys, slug uniqueness, and drafted policies live in 0004.
 */
export async function ensureFleetTenantColumns() {
  if (!/^[a-z][a-z0-9_-]{0,63}$/.test(FLEET_TENANT_ID)) {
    throw new Error("FLEET_TENANT_ID is not a safe tenant key")
  }

  await db.execute(sql.raw(`
DO $fleet_tenant$
BEGIN
  ALTER TABLE boards ADD COLUMN IF NOT EXISTS tenant_id text;
  ALTER TABLE columns ADD COLUMN IF NOT EXISTS tenant_id text;
  ALTER TABLE tasks ADD COLUMN IF NOT EXISTS tenant_id text;

  UPDATE boards
  SET tenant_id = '${FLEET_TENANT_ID}'
  WHERE tenant_id IS NULL OR btrim(tenant_id) = '';

  UPDATE columns c
  SET tenant_id = b.tenant_id
  FROM boards b
  WHERE c.board_id = b.id
    AND (c.tenant_id IS NULL OR btrim(c.tenant_id) = '');

  UPDATE tasks t
  SET tenant_id = b.tenant_id
  FROM boards b
  WHERE t.board_id = b.id
    AND (t.tenant_id IS NULL OR btrim(t.tenant_id) = '');

  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class c ON c.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'boards'
      AND n.nspname = current_schema()
      AND a.attname = 'tenant_id'
      AND a.attnotnull = false
      AND a.attisdropped = false
  ) THEN
    ALTER TABLE boards ALTER COLUMN tenant_id SET NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class c ON c.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'columns'
      AND n.nspname = current_schema()
      AND a.attname = 'tenant_id'
      AND a.attnotnull = false
      AND a.attisdropped = false
  ) THEN
    ALTER TABLE columns ALTER COLUMN tenant_id SET NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class c ON c.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'tasks'
      AND n.nspname = current_schema()
      AND a.attname = 'tenant_id'
      AND a.attnotnull = false
      AND a.attisdropped = false
  ) THEN
    ALTER TABLE tasks ALTER COLUMN tenant_id SET NOT NULL;
  END IF;
END
$fleet_tenant$;
`))
}
