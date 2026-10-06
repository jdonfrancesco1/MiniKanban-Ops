-- Slice D — FORCE ROW LEVEL SECURITY (design cool Must-fix #8).
-- Activates the policies drafted in drizzle/0004_tenant_id.sql.
-- Predicate, unchanged (do not invent another):
--   tenant_id = current_setting('app.tenant_id', true)
--
-- ENABLE without FORCE lets the table owner bypass policies. This app
-- connects as that owner. FORCE removes the bypass. Slice C app checks
-- (verified-tenant filters and 403 on a foreign board or task id) stay.
-- They do not replace FORCE.
--
-- current_setting('app.tenant_id', true) is NULL when the setting is unset,
-- and tenant_id = NULL matches no rows. The table owner then sees nothing
-- (fail closed). The app must set the value inside the transaction from the
-- verified session cookie or bearer:
--   SELECT set_config('app.tenant_id', <verified tenant id>, true);
-- Never from ?tenant=, a JSON tenant_id, or an X-Tenant-* header.
-- The third argument is true so the setting ends with the transaction.
-- Fleet (OPS_BOARD_SECRET, or the local dev gate that is the fleet actor)
-- sets the fleet tenant id so the fleet board stays visible.
--
-- Policies are recreated with the 0004 predicate so FORCE applies that
-- expression even if the policy was dropped. Same names. No new predicate.
--
-- Does not touch tenant_credentials. No GRANT. No BYPASSRLS.
-- This file is not applied to production Neon by the slice that adds it.
-- Sell HOLD stays. Do not treat adding this file as a live migrate.

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

ALTER TABLE boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE boards FORCE ROW LEVEL SECURITY;
ALTER TABLE columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE columns FORCE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks FORCE ROW LEVEL SECURITY;
