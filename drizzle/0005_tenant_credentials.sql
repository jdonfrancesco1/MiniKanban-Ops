-- Slice B — per-tenant credential verifiers.
-- Design cool GATE-minikanban-tenant-isolation-design-2026-10-06
-- Must-fix #2 (per-tenant credentials) and #3 (bound sessions / Bearer),
-- design locks #3–#6.
--
-- Stores salt + HMAC verifier only. The plaintext tenant secret is not a column.
-- Tenant `fleet` cannot have a row. OPS_BOARD_SECRET stays the fleet secret
-- and is not a verifier that opens customer tenants.
--
-- No ENABLE ROW LEVEL SECURITY, no FORCE, no GRANT.
-- App-level tenant checks are Slice C. FORCE RLS is a later follow-on.
-- Safe to re-run. This file does not insert secrets.

CREATE TABLE IF NOT EXISTS tenant_credentials (
  tenant_id text PRIMARY KEY,
  salt text NOT NULL,
  verifier text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tenant_credentials_tenant_id_nonempty_chk
    CHECK (tenant_id = btrim(tenant_id) AND length(tenant_id) > 0),
  CONSTRAINT tenant_credentials_not_fleet_chk
    CHECK (tenant_id <> 'fleet'),
  CONSTRAINT tenant_credentials_salt_nonempty_chk
    CHECK (length(salt) > 0),
  CONSTRAINT tenant_credentials_verifier_nonempty_chk
    CHECK (length(verifier) > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS tenant_credentials_verifier_idx ON tenant_credentials (verifier);

COMMENT ON TABLE tenant_credentials IS 'HMAC verifiers for customer tenants. Fleet uses OPS_BOARD_SECRET and has no row. Plaintext secrets are not stored.';
COMMENT ON COLUMN tenant_credentials.verifier IS 'Hex HMAC-SHA256(salt, secret). Not the secret.';
COMMENT ON COLUMN tenant_credentials.salt IS 'Per-tenant HMAC salt, hex. Not the secret.';
