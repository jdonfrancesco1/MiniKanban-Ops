-- Slice A — tenant identity in the data plane.
-- Design cool Must-fix #1 and #2 (GATE-minikanban-tenant-isolation-design-2026-10-06):
--   1. Real tenant_id on boards, columns, and tasks. FKs stay. board id is not a tenant boundary.
--   2. Shared Worker + one Postgres + row tenant_id + RLS is the hosted model.
--      Self-host (separate Worker + database + secret) is interim fulfillment only, not this schema's source of truth.
--
-- tenant_id is text, not uuid, so the existing fleet board can use the named key 'fleet'.
-- There is no column DEFAULT. New writes must set tenant_id. A default of 'fleet' would
-- silently attach later customer rows to the fleet tenant.
--
-- Existing rows: boards with a null or blank tenant_id become 'fleet'. Columns and tasks
-- copy tenant_id from their parent board, then are realigned if they disagree with that board.
-- A board that already has a non-blank tenant_id is left alone (safe to re-run).
--
-- RLS policies are created and intentional. ENABLE ROW LEVEL SECURITY and
-- FORCE ROW LEVEL SECURITY are deferred to Slice C. Do not enable them in this file.
-- Until Slice C sets app.tenant_id from the verified credential/session, enabling RLS
-- would fail closed (unset current_setting matches no rows). FORCE would apply that
-- to the table owner, which is the current fleet connection, and would hide the fleet board.
-- With RLS disabled, these policies are inert and the single-secret fleet path is unchanged.
-- Slice C predicate (do not invent a second one): tenant_id = current_setting('app.tenant_id', true)
-- Set it only inside the transaction from verified auth, for example:
--   SELECT set_config('app.tenant_id', <verified tenant id>, true);
-- Never from a query param, JSON body, or client header.
--
-- No GRANT is issued. This migration does not grant the tables to PUBLIC.

ALTER TABLE boards ADD COLUMN IF NOT EXISTS tenant_id text;
ALTER TABLE columns ADD COLUMN IF NOT EXISTS tenant_id text;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS tenant_id text;

UPDATE boards
SET tenant_id = 'fleet'
WHERE tenant_id IS NULL OR btrim(tenant_id) = '';

UPDATE columns c
SET tenant_id = b.tenant_id
FROM boards b
WHERE c.board_id = b.id
  AND c.tenant_id IS DISTINCT FROM b.tenant_id;

UPDATE tasks t
SET tenant_id = b.tenant_id
FROM boards b
WHERE t.board_id = b.id
  AND t.tenant_id IS DISTINCT FROM b.tenant_id;

ALTER TABLE boards ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE columns ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE tasks ALTER COLUMN tenant_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'boards_tenant_id_nonempty_chk') THEN
    ALTER TABLE boards
      ADD CONSTRAINT boards_tenant_id_nonempty_chk
      CHECK (tenant_id = btrim(tenant_id) AND length(tenant_id) > 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'columns_tenant_id_nonempty_chk') THEN
    ALTER TABLE columns
      ADD CONSTRAINT columns_tenant_id_nonempty_chk
      CHECK (tenant_id = btrim(tenant_id) AND length(tenant_id) > 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tasks_tenant_id_nonempty_chk') THEN
    ALTER TABLE tasks
      ADD CONSTRAINT tasks_tenant_id_nonempty_chk
      CHECK (tenant_id = btrim(tenant_id) AND length(tenant_id) > 0);
  END IF;
END $$;

-- (id, tenant_id) must be unique so child composite FKs have a target.
-- id is already the primary key; this second unique key does not replace it.
CREATE UNIQUE INDEX IF NOT EXISTS boards_id_tenant_id_idx ON boards (id, tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS columns_id_tenant_id_idx ON columns (id, tenant_id);

CREATE INDEX IF NOT EXISTS boards_tenant_id_idx ON boards (tenant_id);
CREATE INDEX IF NOT EXISTS columns_tenant_id_board_id_idx ON columns (tenant_id, board_id);
CREATE INDEX IF NOT EXISTS tasks_tenant_id_board_id_idx ON tasks (tenant_id, board_id);
CREATE INDEX IF NOT EXISTS tasks_tenant_id_column_id_idx ON tasks (tenant_id, column_id);

-- Slug uniqueness is per tenant. A global slug unique would make slug a cross-tenant key.
-- Postgres unique indexes still allow multiple NULL slugs.
ALTER TABLE boards DROP CONSTRAINT IF EXISTS boards_slug_key;
ALTER TABLE boards DROP CONSTRAINT IF EXISTS boards_slug_unique;
DROP INDEX IF EXISTS boards_slug_key;
DROP INDEX IF EXISTS boards_slug_unique;
CREATE UNIQUE INDEX IF NOT EXISTS boards_tenant_id_slug_idx ON boards (tenant_id, slug);

-- Existing board_id / column_id foreign keys stay (0000_init.sql).
-- These composite keys additionally require the child tenant to match its parent.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'columns_board_tenant_fk') THEN
    ALTER TABLE columns
      ADD CONSTRAINT columns_board_tenant_fk
      FOREIGN KEY (board_id, tenant_id)
      REFERENCES boards (id, tenant_id)
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tasks_board_tenant_fk') THEN
    ALTER TABLE tasks
      ADD CONSTRAINT tasks_board_tenant_fk
      FOREIGN KEY (board_id, tenant_id)
      REFERENCES boards (id, tenant_id)
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tasks_column_tenant_fk') THEN
    ALTER TABLE tasks
      ADD CONSTRAINT tasks_column_tenant_fk
      FOREIGN KEY (column_id, tenant_id)
      REFERENCES columns (id, tenant_id)
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;
END $$;

COMMENT ON COLUMN boards.tenant_id IS 'Tenant key. The existing fleet board is tenant fleet. Set by the server from the verified credential (Slices B/C), never from the client.';
COMMENT ON COLUMN columns.tenant_id IS 'Same tenant as the parent board (columns_board_tenant_fk).';
COMMENT ON COLUMN tasks.tenant_id IS 'Same tenant as the parent board and column (tasks_board_tenant_fk, tasks_column_tenant_fk).';

-- Drafted policies. Inert until Slice C enables and forces RLS.
DROP POLICY IF EXISTS boards_tenant_isolation ON boards;
CREATE POLICY boards_tenant_isolation ON boards
  FOR ALL
  USING (tenant_id = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

DROP POLICY IF EXISTS columns_tenant_isolation ON columns;
CREATE POLICY columns_tenant_isolation ON columns
  FOR ALL
  USING (tenant_id = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

DROP POLICY IF EXISTS tasks_tenant_isolation ON tasks;
CREATE POLICY tasks_tenant_isolation ON tasks
  FOR ALL
  USING (tenant_id = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

-- Slice C follow-up (not run here):
--   ALTER TABLE boards ENABLE ROW LEVEL SECURITY;
--   ALTER TABLE boards FORCE ROW LEVEL SECURITY;
--   ALTER TABLE columns ENABLE ROW LEVEL SECURITY;
--   ALTER TABLE columns FORCE ROW LEVEL SECURITY;
--   ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
--   ALTER TABLE tasks FORCE ROW LEVEL SECURITY;
-- And set app.tenant_id from the verified fleet credential before FORCE, or the fleet board disappears.
-- Slice B follow-up: per-tenant credential verifiers. This migration does not store secrets.
