-- Slice E — buyer id on the Slice B credential table.
-- Design Must-fix #9 (provision path).
--
-- Adds external_buyer_id to tenant_credentials. That column is the
-- idempotency key for one external buyer → one tenant. It is not a secret.
-- The plaintext customer secret is still not a column. There is no second
-- credential store. Tenant `fleet` still cannot have a row.
--
-- Re-provision of the same buyer id must not insert another row. The unique
-- index is what makes that race fail closed. A null buyer id is allowed so
-- this alter does not rewrite existing verifier rows. Provision always sets
-- the column.
--
-- No ENABLE ROW LEVEL SECURITY, no FORCE, no GRANT, no INSERT.
-- Requires drizzle/0005_tenant_credentials.sql first.
-- This file is not applied to production Neon by the slice that adds it.
-- drizzle/0006_force_rls.sql stays unapplied too. Sell HOLD stays.

ALTER TABLE tenant_credentials
  ADD COLUMN IF NOT EXISTS external_buyer_id text;

CREATE UNIQUE INDEX IF NOT EXISTS tenant_credentials_external_buyer_id_idx
  ON tenant_credentials (external_buyer_id);

ALTER TABLE tenant_credentials
  DROP CONSTRAINT IF EXISTS tenant_credentials_external_buyer_id_chk;

ALTER TABLE tenant_credentials
  ADD CONSTRAINT tenant_credentials_external_buyer_id_chk
  CHECK (
    external_buyer_id IS NULL
    OR (
      external_buyer_id = btrim(external_buyer_id)
      AND length(external_buyer_id) > 0
      AND external_buyer_id <> 'fleet'
    )
  );

COMMENT ON COLUMN tenant_credentials.external_buyer_id IS
  'Idempotency key for provision. Not a secret. Same buyer id keeps the same tenant and does not mint a second secret.';
